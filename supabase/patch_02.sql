-- ============================================================
-- Patch 02 — rupee-ledger dues model. Run once in Supabase SQL Editor.
-- ============================================================

-- Opening balance per flat (signed ₹ as of 1 July 2026, before July's charge).
alter table flats add column if not exists opening_due int not null default 0;

-- Per-flat monthly charge, effective-dated (handles half-rate flats, tenants, future raises).
create table if not exists flat_charges (
  id            bigint generated always as identity primary key,
  flat_id       text not null references flats(id),
  amount        int  not null,            -- ₹/month
  effective_from date not null,           -- 1st of month
  created_at    timestamptz not null default now()
);
create index if not exists idx_flat_charges on flat_charges(flat_id, effective_from);

alter table flat_charges enable row level security;
drop policy if exists public_read_flat_charges on flat_charges;
create policy public_read_flat_charges on flat_charges for select using (true);
drop policy if exists admin_insert_flat_charges on flat_charges;
create policy admin_insert_flat_charges on flat_charges for insert to authenticated with check (true);
drop policy if exists admin_update_flat_charges on flat_charges;
create policy admin_update_flat_charges on flat_charges for update to authenticated using (true) with check (true);

-- Global settings.
insert into app_settings (key, value) values ('tracking_start_month','2026-07-01') on conflict (key) do nothing;
insert into app_settings (key, value) values ('opening_fund_balance','0') on conflict (key) do nothing;
