-- ============================================================
-- Patch 07 — allow the admin to permanently DELETE mistaken entries.
-- Run once in Supabase SQL Editor. Only authenticated (admin) can delete;
-- the public still cannot. Voiding remains available for reversible entries.
-- ============================================================
drop policy if exists admin_delete_payments on payments;
create policy admin_delete_payments on payments for delete to authenticated using (true);

drop policy if exists admin_delete_expenses on expenses;
create policy admin_delete_expenses on expenses for delete to authenticated using (true);
