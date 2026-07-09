-- ============================================================
-- Patch 03 — seed REAL flat data (as of 9 July 2026). Run once, after patch_02.
-- ============================================================

-- Monthly charges (guarded so re-running won't duplicate).
do $$ begin
  if not exists (select 1 from flat_charges) then
    insert into flat_charges (flat_id, amount, effective_from) values
      ('G1', 400, '2026-07-01'), ('G2', 850, '2026-07-01'),
      ('G3', 800, '2026-07-01'), ('G4', 800, '2026-07-01'), ('G5', 800, '2026-07-01'),
      ('G6', 800, '2026-07-01'), ('G7', 1250, '2026-07-01'), ('G8', 800, '2026-07-01'),
      ('G9', 800, '2026-07-01'), ('G10', 800, '2026-07-01'), ('G11', 800, '2026-07-01'),
      ('G12', 1250, '2026-07-01'), ('G13', 800, '2026-07-01'), ('G14', 800, '2026-07-01');
  end if;
end $$;

-- Opening balances before July's charge (positive = owes, negative = advance). Idempotent.
update flats set opening_due = 0     where id in ('G1','G2','G4','G5','G6','G7','G8','G9','G13','G14');
update flats set opening_due = 4800  where id in ('G3','G11');
update flats set opening_due = 12033 where id = 'G12';
update flats set opening_due = -4800 where id = 'G10';

-- Tag G7 and G12 as tenant-occupied (label only; charge already set above).
insert into flat_type_history (flat_id, type, effective_from)
select v.flat_id, 'tenant_occupied', date '2026-07-01'
from (values ('G7'), ('G12')) as v(flat_id)
where not exists (
  select 1 from flat_type_history h where h.flat_id = v.flat_id and h.type = 'tenant_occupied'
);
