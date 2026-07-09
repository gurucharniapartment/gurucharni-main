-- ============================================================
-- Patch 09 — resident/family names per flat (display only).
-- The flat id (G1..G14) stays the primary key everywhere; these are just
-- shown in the UI. label_mr is a best-effort Devanagari transliteration —
-- adjust any spelling as you like. Run once in Supabase SQL Editor.
-- ============================================================
update flats set label_en = 'Samant',      label_mr = 'सामंत'      where id = 'G1';
update flats set label_en = 'Bhake',        label_mr = 'भाके'       where id = 'G2';
update flats set label_en = 'Date',         label_mr = 'दाते'       where id = 'G3';
update flats set label_en = 'Yeola',        label_mr = 'येवला'      where id = 'G4';
update flats set label_en = 'Hanmante',     label_mr = 'हनमंते'     where id = 'G5';
update flats set label_en = 'Karad',        label_mr = 'कराड'       where id = 'G6';
update flats set label_en = 'Bhamare',      label_mr = 'भामरे'      where id = 'G7';
update flats set label_en = 'Shaikh',       label_mr = 'शेख'        where id = 'G8';
update flats set label_en = 'Nikam',        label_mr = 'निकम'       where id = 'G9';
update flats set label_en = 'Shinde',       label_mr = 'शिंदे'      where id = 'G10';
update flats set label_en = 'Joshi',        label_mr = 'जोशी'       where id = 'G11';
update flats set label_en = 'Chandratre',   label_mr = 'चंद्रात्रे'  where id = 'G12';
update flats set label_en = 'Wagh',         label_mr = 'वाघ'        where id = 'G13';
update flats set label_en = 'Ghule',        label_mr = 'घुले'       where id = 'G14';
