-- ============================================================
-- Patch 05 — extra expense categories. Run once in Supabase SQL Editor.
-- Amounts are always entered per-expense, so "variable" categories need
-- nothing special here.
-- ============================================================
insert into expense_categories (name_en, name_mr)
select v.en, v.mr
from (values
  ('Tank cleaning',      'टाकी साफसफाई'),
  ('Tree cutting',       'झाडांची छाटणी'),
  ('Tube light fitting', 'ट्यूबलाईट फिटिंग'),
  ('Water tax',          'पाणी कर')
) as v(en, mr)
where not exists (select 1 from expense_categories c where c.name_en = v.en);
