-- ============================================================
-- Patch 08 — correct G12's opening arrears (before July) to ₹12,033.
-- July's ₹1,250 (tenant rate) accrues automatically on top → total ₹13,283.
-- Run once in Supabase SQL Editor.
-- ============================================================
update flats set opening_due = 12033 where id = 'G12';
