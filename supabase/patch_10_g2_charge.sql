-- ============================================================
-- Patch 10 — G2 monthly charge stays at ₹850 (the original seeded value).
-- An earlier revision briefly set G2 to ₹1,250; that was a mistake and has
-- been reverted. This statement restores/keeps G2 at ₹850. Only G2 is touched
-- (its single charge row) — no other flat, payment, balance or data is affected.
-- Idempotent: safe whether or not the ₹1,250 update was ever run.
-- Run once in Supabase SQL Editor.
-- ============================================================
update flat_charges set amount = 850 where flat_id = 'G2';
