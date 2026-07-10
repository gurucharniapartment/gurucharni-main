-- ============================================================
-- Patch 10 — correct G2's monthly charge.
-- It was seeded as ₹850 by mistake; G2's actual maintenance is ₹1,250/month,
-- effective from July 2026 (the launch month) — i.e. the original charge row
-- was simply wrong, not a rate change. Only G2 is touched. Other flats,
-- payments, the ledger and all balances are unaffected.
-- Idempotent: once corrected, re-running is a no-op.
-- Run once in Supabase SQL Editor.
-- ============================================================
update flat_charges set amount = 1250 where flat_id = 'G2' and amount = 850;
