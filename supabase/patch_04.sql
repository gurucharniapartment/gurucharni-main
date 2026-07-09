-- ============================================================
-- Patch 04 — payment kinds. Run once in Supabase SQL Editor.
-- Distinguishes "maintenance" (for specific months) from "due_clear"
-- (paying down old arrears). Purely a record distinction — the balance
-- math already just subtracts every non-void payment.
-- ============================================================
alter table payments add column if not exists kind text not null default 'maintenance';
alter table payments add column if not exists covered_months text; -- comma list of 'YYYY-MM'

-- Due-clear payments cover no specific months, so relax these.
alter table payments alter column covers_from drop not null;
alter table payments alter column covers_to drop not null;
alter table payments alter column months_covered drop not null;
