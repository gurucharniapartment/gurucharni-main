-- ============================================================
-- Patch 11 — set G2's display name.
-- Display only; the flat id 'G2' stays the primary key everywhere. Only G2 is
-- touched — no other flat, payment, balance, or calculation is affected.
-- The name is long: flat cards ellipsize it, but the statement, receipts and
-- everywhere else show it in full.
-- Run once in Supabase SQL Editor.
-- ============================================================
update flats
set label_en = 'Physiocares Aquatic Therapy & Rehabilitation Clinic',
    label_mr = 'Physiocares Aquatic Therapy & Rehabilitation Clinic'
where id = 'G2';
