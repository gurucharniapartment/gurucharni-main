-- ============================================================
-- Patch 06 — reconcile opening balance + record real July transactions.
-- Run ONCE, AFTER patch_04 (payment kinds) and patch_05 (categories).
-- Idempotent (guards prevent duplicates on re-run).
-- Result: Available in Bank = 5,826 + 4,800 (G10) − 4,500 (July expenses) = 6,126.
-- ============================================================

-- Opening bank balance as of 30 June 2026 = 1,651 + 4,175.
update app_settings set value = '5826' where key = 'opening_fund_balance';

-- UPI details (from the PhonePe QR).
update app_settings set value = '8329723512@ybl'      where key = 'upi_vpa';
update app_settings set value = 'Gurucharni Apartment' where key = 'upi_payee_name';

-- G10 advance now comes from a recorded payment (not opening_due), so it counts in the bank.
update flats set opening_due = 0 where id = 'G10';

-- G10 paid ₹4,800 = 6 months (Jul–Dec 2026) maintenance.
insert into payments (flat_id, payment_date, kind, amount, months_covered, covered_months, covers_from, covers_to)
select 'G10', '2026-07-01', 'maintenance', 4800, 6,
       '2026-07, 2026-08, 2026-09, 2026-10, 2026-11, 2026-12', '2026-07-01', '2026-12-01'
where not exists (
  select 1 from payments where flat_id = 'G10' and amount = 4800 and payment_date = '2026-07-01'
);

-- July expenses: two water tankers (₹1,000 each) + watchman (₹2,500).
insert into expenses (category_id, expense_date, amount, remark, is_auto)
select (select id from expense_categories where name_en = 'Water tanker' limit 1),
       '2026-07-01', 1000, 'Water tanker', false
where not exists (
  select 1 from expenses where expense_date = '2026-07-01' and amount = 1000
    and category_id = (select id from expense_categories where name_en = 'Water tanker' limit 1)
);

insert into expenses (category_id, expense_date, amount, remark, is_auto)
select (select id from expense_categories where name_en = 'Watchman salary' limit 1),
       '2026-07-06', 2500, 'Watchman salary — July', false
where not exists (
  select 1 from expenses where expense_date = '2026-07-06' and amount = 2500
    and category_id = (select id from expense_categories where name_en = 'Watchman salary' limit 1)
);

insert into expenses (category_id, expense_date, amount, remark, is_auto)
select (select id from expense_categories where name_en = 'Water tanker' limit 1),
       '2026-07-07', 1000, 'Water tanker', false
where not exists (
  select 1 from expenses where expense_date = '2026-07-07' and amount = 1000
    and category_id = (select id from expense_categories where name_en = 'Water tanker' limit 1)
);
