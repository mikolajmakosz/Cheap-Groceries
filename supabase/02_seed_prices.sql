-- CestaPro — starting price catalogue
-- Run after 01_schema.sql, in Supabase -> SQL Editor -> New query -> Run.
--
-- ⚠️  READ THIS FIRST
-- Every price below is a PLACEHOLDER. Nobody has checked these in a shop.
-- They are here so the app has something to compare while you build it.
-- Every row is inserted with verified = false, and the app tells the user on
-- screen that the totals are an estimate until that changes.
--
-- Before you show CestaPro to classmates, walk through Mercadona and Dia (or
-- their websites), write down what these things actually cost, update the rows
-- and set verified = true. The query to do that is at the bottom of this file.

insert into public.products
  (name, brand, store, price_eur, size_g, protein_g_per_100g, fat_g_per_100g, kcal_per_100g, price_checked_on, verified)
values
  -- Mercadona ------------------------------------------------------------
  ('pechuga de pollo',   'Hacendado', 'Mercadona', 6.50, 1000,  23.0,  1.5,  110, '2026-10-17', false),
  ('huevos',             'Hacendado', 'Mercadona', 2.35,  720,  12.6,  9.9,  145, '2026-10-17', false),
  ('leche entera',       'Hacendado', 'Mercadona', 0.95, 1000,   3.1,  3.6,   64, '2026-10-17', false),
  ('arroz',              'Hacendado', 'Mercadona', 1.15, 1000,   7.0,  0.6,  350, '2026-10-17', false),
  ('pasta',              'Hacendado', 'Mercadona', 0.95, 1000,  12.0,  1.5,  355, '2026-10-17', false),
  ('lentejas',           'Hacendado', 'Mercadona', 1.60, 1000,  24.0,  1.1,  336, '2026-10-17', false),
  ('garbanzos',          'Hacendado', 'Mercadona', 1.05,  570,   7.2,  2.6,  120, '2026-10-17', false),
  ('atun en lata',       'Hacendado', 'Mercadona', 3.20,  312,  25.0,  2.0,  128, '2026-10-17', false),
  ('queso fresco batido','Hacendado', 'Mercadona', 1.45, 1000,   8.0,  0.2,   48, '2026-10-17', false),
  ('yogur natural',      'Hacendado', 'Mercadona', 1.10,  500,   3.8,  3.0,   61, '2026-10-17', false),
  ('pan de molde',       'Hacendado', 'Mercadona', 1.30,  460,   8.5,  3.5,  255, '2026-10-17', false),
  ('platanos',            null,       'Mercadona', 1.75, 1000,   1.1,  0.3,   89, '2026-10-17', false),
  ('tomates',             null,       'Mercadona', 1.95, 1000,   0.9,  0.2,   18, '2026-10-17', false),
  ('cebolla',             null,       'Mercadona', 1.10, 1000,   1.1,  0.1,   40, '2026-10-17', false),
  ('patatas',             null,       'Mercadona', 1.45, 2000,   2.0,  0.1,   77, '2026-10-17', false),
  ('aceite de oliva',    'Hacendado', 'Mercadona', 7.90, 1000,   0.0, 91.0,  824, '2026-10-17', false),
  ('avena',              'Hacendado', 'Mercadona', 1.55, 1000,  13.5,  7.0,  375, '2026-10-17', false),
  ('salmon',              null,       'Mercadona', 9.90, 1000,  20.0, 13.0,  200, '2026-10-17', false),

  -- Dia ------------------------------------------------------------------
  ('pechuga de pollo',   'Dia',       'Dia',       6.15, 1000,  23.0,  1.5,  110, '2026-10-17', false),
  ('huevos',             'Dia',       'Dia',       2.19,  720,  12.6,  9.9,  145, '2026-10-17', false),
  ('leche entera',       'Dia',       'Dia',       0.89, 1000,   3.1,  3.6,   64, '2026-10-17', false),
  ('arroz',              'Dia',       'Dia',       1.25, 1000,   7.0,  0.6,  350, '2026-10-17', false),
  ('pasta',              'Dia',       'Dia',       0.89, 1000,  12.0,  1.5,  355, '2026-10-17', false),
  ('lentejas',           'Dia',       'Dia',       1.49, 1000,  24.0,  1.1,  336, '2026-10-17', false),
  ('garbanzos',          'Dia',       'Dia',       1.15,  570,   7.2,  2.6,  120, '2026-10-17', false),
  ('atun en lata',       'Dia',       'Dia',       3.45,  312,  25.0,  2.0,  128, '2026-10-17', false),
  ('queso fresco batido','Dia',       'Dia',       1.59, 1000,   8.0,  0.2,   48, '2026-10-17', false),
  ('yogur natural',      'Dia',       'Dia',       0.99,  500,   3.8,  3.0,   61, '2026-10-17', false),
  ('pan de molde',       'Dia',       'Dia',       1.19,  460,   8.5,  3.5,  255, '2026-10-17', false),
  ('platanos',            null,       'Dia',       1.89, 1000,   1.1,  0.3,   89, '2026-10-17', false),
  ('tomates',             null,       'Dia',       2.05, 1000,   0.9,  0.2,   18, '2026-10-17', false),
  ('cebolla',             null,       'Dia',       0.99, 1000,   1.1,  0.1,   40, '2026-10-17', false),
  ('patatas',             null,       'Dia',       1.59, 2000,   2.0,  0.1,   77, '2026-10-17', false),
  ('aceite de oliva',    'Dia',       'Dia',       8.25, 1000,   0.0, 91.0,  824, '2026-10-17', false),
  ('avena',              'Dia',       'Dia',       1.69, 1000,  13.5,  7.0,  375, '2026-10-17', false),
  ('salmon',              null,       'Dia',      10.45, 1000,  20.0, 13.0,  200, '2026-10-17', false)
on conflict (name, store) do update set
  brand              = excluded.brand,
  price_eur          = excluded.price_eur,
  size_g             = excluded.size_g,
  protein_g_per_100g = excluded.protein_g_per_100g,
  fat_g_per_100g     = excluded.fat_g_per_100g,
  kcal_per_100g      = excluded.kcal_per_100g,
  price_checked_on   = excluded.price_checked_on,
  verified           = excluded.verified;

-- ---------------------------------------------------------------------------
-- After you check a real price, run one of these (edit the values):
--
--   update public.products
--      set price_eur = 6.95, price_checked_on = current_date, verified = true
--    where name = 'pechuga de pollo' and store = 'Mercadona';
--
-- To see what still needs checking:
--
--   select store, name, price_eur from public.products
--    where verified = false order by store, name;
-- ---------------------------------------------------------------------------
