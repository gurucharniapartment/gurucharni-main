-- ============================================================
-- Gurucharni Apartment — Maintenance Platform
-- Supabase schema + Row Level Security
-- Run this whole file in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT where possible).
-- All money in WHOLE RUPEES (integer). All months stored as the FIRST day
-- of the month (e.g. 2026-07-01 = "July 2026"). Timezone logic = IST in app.
-- ============================================================

-- ---------- 1. FLATS ----------
create table if not exists flats (
  id            text primary key,               -- 'G1' .. 'G14'
  label_en      text not null,                  -- 'Gurucharni 1'
  label_mr      text not null,                  -- 'गुरुचरणी १'
  paid_through_month date,                       -- last FULLY paid month (1st-of-month). NULL = needs admin setup
  sort_order    int  not null default 0,
  is_active     boolean not null default true,  -- soft-delete flag (never hard delete)
  created_at    timestamptz not null default now()
);

-- ---------- 2. FLAT TYPE HISTORY (effective-dated) ----------
-- A flat's type for month M = row with the greatest effective_from <= M.
create table if not exists flat_type_history (
  id            bigint generated always as identity primary key,
  flat_id       text not null references flats(id),
  type          text not null check (type in ('residential','tenant_occupied')),
  effective_from date not null,                  -- 1st-of-month
  created_at    timestamptz not null default now()
);
create index if not exists idx_fth_flat on flat_type_history(flat_id, effective_from);

-- ---------- 3. RATES (effective-dated, per type) ----------
-- Rate for (type, month M) = row with greatest effective_from <= M.
create table if not exists rates (
  id            bigint generated always as identity primary key,
  type          text not null check (type in ('residential','tenant_occupied')),
  amount        int  not null,                   -- whole rupees/month
  effective_from date not null,                  -- 1st-of-month
  created_at    timestamptz not null default now()
);
create index if not exists idx_rates_type on rates(type, effective_from);

-- ---------- 4. PAYMENTS (ledger) ----------
create table if not exists payments (
  id            bigint generated always as identity primary key,
  flat_id       text not null references flats(id),
  payment_date  date not null,
  months_covered int not null check (months_covered > 0),
  amount        int  not null,                   -- computed from rate history
  covers_from   date not null,                   -- first month this payment covers
  covers_to     date not null,                   -- last month this payment covers
  note          text,
  is_void       boolean not null default false,  -- soft delete
  created_by    text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_payments_flat on payments(flat_id) where is_void = false;

-- ---------- 5. EXPENSE CATEGORIES (editable) ----------
create table if not exists expense_categories (
  id            bigint generated always as identity primary key,
  name_en       text not null,
  name_mr       text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------- 6. EXPENSES (ledger) — remark is MANDATORY ----------
create table if not exists expenses (
  id            bigint generated always as identity primary key,
  category_id   bigint not null references expense_categories(id),
  expense_date  date not null,
  amount        int  not null,                   -- deducts from collective balance
  remark        text not null,                   -- REQUIRED
  is_auto       boolean not null default false,  -- true for auto-generated watchman entries
  is_void       boolean not null default false,  -- soft delete
  created_by    text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_expenses_date on expenses(expense_date) where is_void = false;

-- ---------- 7. RECURRING EXPENSES (watchman salary, effective-dated) ----------
create table if not exists recurring_expenses (
  id            bigint generated always as identity primary key,
  name_en       text not null,                   -- 'Watchman salary'
  name_mr       text not null,
  category_id   bigint references expense_categories(id),
  amount        int not null,                    -- effective monthly amount
  effective_from date not null,                  -- raises handled by new row; past months unchanged
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------- 8. AUDIT LOG ----------
create table if not exists audit_log (
  id            bigint generated always as identity primary key,
  actor         text,                            -- admin email
  action        text not null,                   -- 'insert' | 'update' | 'void' ...
  entity        text not null,                   -- table name
  entity_id     text,
  details       jsonb,
  created_at    timestamptz not null default now()
);

-- ---------- 9. APP SETTINGS (UPI id, etc.) ----------
create table if not exists app_settings (
  key           text primary key,
  value         text
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Public (anon) = READ ONLY.  Authenticated (the single admin) = write.
-- No DELETE policy anywhere => hard deletes are impossible for everyone.
-- ============================================================
alter table flats               enable row level security;
alter table flat_type_history   enable row level security;
alter table rates               enable row level security;
alter table payments            enable row level security;
alter table expense_categories  enable row level security;
alter table expenses            enable row level security;
alter table recurring_expenses  enable row level security;
alter table app_settings        enable row level security;
alter table audit_log           enable row level security;

-- Public read on everything the public view needs
do $$
declare t text;
begin
  foreach t in array array[
    'flats','flat_type_history','rates','payments',
    'expense_categories','expenses','recurring_expenses','app_settings'
  ] loop
    execute format('drop policy if exists %I on %I;', 'public_read_'||t, t);
    execute format('create policy %I on %I for select using (true);', 'public_read_'||t, t);
    -- admin (authenticated) can insert
    execute format('drop policy if exists %I on %I;', 'admin_insert_'||t, t);
    execute format('create policy %I on %I for insert to authenticated with check (true);', 'admin_insert_'||t, t);
    -- admin (authenticated) can update (used for soft-delete / edits)
    execute format('drop policy if exists %I on %I;', 'admin_update_'||t, t);
    execute format('create policy %I on %I for update to authenticated using (true) with check (true);', 'admin_update_'||t, t);
  end loop;
end $$;

-- Audit log: only admin can read & insert (not public)
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select to authenticated using (true);
drop policy if exists audit_insert on audit_log;
create policy audit_insert on audit_log for insert to authenticated with check (true);

-- ============================================================
-- SEED DATA
-- ============================================================
-- 14 flats, all residential to start. Admin re-types the 2-3 tenant flats later.
insert into flats (id, label_en, label_mr, sort_order) values
  ('G1','Gurucharni 1','गुरुचरणी १',1),
  ('G2','Gurucharni 2','गुरुचरणी २',2),
  ('G3','Gurucharni 3','गुरुचरणी ३',3),
  ('G4','Gurucharni 4','गुरुचरणी ४',4),
  ('G5','Gurucharni 5','गुरुचरणी ५',5),
  ('G6','Gurucharni 6','गुरुचरणी ६',6),
  ('G7','Gurucharni 7','गुरुचरणी ७',7),
  ('G8','Gurucharni 8','गुरुचरणी ८',8),
  ('G9','Gurucharni 9','गुरुचरणी ९',9),
  ('G10','Gurucharni 10','गुरुचरणी १०',10),
  ('G11','Gurucharni 11','गुरुचरणी ११',11),
  ('G12','Gurucharni 12','गुरुचरणी १२',12),
  ('G13','Gurucharni 13','गुरुचरणी १३',13),
  ('G14','Gurucharni 14','गुरुचरणी १४',14)
on conflict (id) do nothing;

-- Every flat starts residential, effective far in the past so it always applies.
insert into flat_type_history (flat_id, type, effective_from)
select id, 'residential', date '2000-01-01' from flats
on conflict do nothing;

-- Residential rate ₹800 (effective far past). Tenant rate: set later by admin.
insert into rates (type, amount, effective_from) values
  ('residential', 800, date '2000-01-01')
on conflict do nothing;
-- TODO (admin): once tenant rate is known, run:
--   insert into rates (type, amount, effective_from) values ('tenant_occupied', <RATE>, '2026-07-01');

-- Starter expense categories (edit freely later).
insert into expense_categories (name_en, name_mr) values
  ('Water tanker','पाण्याचा टँकर'),
  ('Electricity bill','वीज बिल'),
  ('Watchman salary','वॉचमन पगार'),
  ('Plumbing','नळ दुरुस्ती'),
  ('Electrical repair','वीज दुरुस्ती'),
  ('Other','इतर')
on conflict do nothing;

-- UPI placeholder (admin fills VPA later).
insert into app_settings (key, value) values ('upi_vpa','') on conflict (key) do nothing;
insert into app_settings (key, value) values ('upi_payee_name','Gurucharni Apartment') on conflict (key) do nothing;
