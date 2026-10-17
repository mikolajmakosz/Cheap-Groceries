-- Mercadona prices, collected 2026-10-17 from Mercadona's own store API
-- (warehouse mad1, Madrid) by scripts/scrape-mercadona.mjs.
-- Generated file: re-run the script instead of editing it by hand.
--
-- verified = true here means the price came from the shop's own listing on the
-- date above, not that someone invented it.

delete from public.products where store = 'Mercadona';

insert into public.products
  (name, brand, store, price_eur, size_g, protein_g_per_100g, fat_g_per_100g, kcal_per_100g, price_checked_on, verified, term, is_reference)
values
  ('Aceite de oliva virgen extra Hacendado Gran Selección', 'Hacendado', 'Mercadona', 5.25, 750, null, null, null, '2026-10-17', true, 'aceite', true),
  ('Agua mineral grande Aguadoy', null, 'Mercadona', 0.95, 8000, null, null, null, '2026-10-17', true, 'agua', true),
  ('Alubia cocida blanca Hacendado', 'Hacendado', 'Mercadona', 0.75, 570, null, null, null, '2026-10-17', true, 'alubias', true),
  ('Arroz redondo Hacendado', 'Hacendado', 'Mercadona', 1.15, 1000, null, null, null, '2026-10-17', true, 'arroz', true),
  ('Atún claro al natural Hacendado', 'Hacendado', 'Mercadona', 4.2, 480, null, null, null, '2026-10-17', true, 'atun', true),
  ('Barra de pan', null, 'Mercadona', 0.5, 250, null, null, null, '2026-10-17', true, 'pan', true),
  ('Cebollas rojas', null, 'Mercadona', 1.4, 500, null, null, null, '2026-10-17', true, 'cebolla', true),
  ('Cereales copos de maíz Corn Flakes Hacendado 0% azúcares añadidos', 'Hacendado', 'Mercadona', 1.5, 500, null, null, null, '2026-10-17', true, 'cereales', true),
  ('Filetes lomo de cerdo corte fino', null, 'Mercadona', 3.91, 550, null, null, null, '2026-10-17', true, 'cerdo', true),
  ('Filetes pechuga de pollo', null, 'Mercadona', 4, 520, null, null, null, '2026-10-17', true, 'pollo', true),
  ('Garbanzo cocido Hacendado', 'Hacendado', 'Mercadona', 0.8, 570, null, null, null, '2026-10-17', true, 'garbanzos', true),
  ('Huevos medianos M', null, 'Mercadona', 2.85, null, null, null, null, '2026-10-17', true, 'huevos', true),
  ('Jamón cocido Hacendado lonchas', 'Hacendado', 'Mercadona', 2.25, 200, null, null, null, '2026-10-17', true, 'jamon cocido', true),
  ('Leche entera Hacendado', 'Hacendado', 'Mercadona', 5.76, 6000, null, null, null, '2026-10-17', true, 'leche', true),
  ('Lechuga Iceberg', null, 'Mercadona', 1.05, null, null, null, null, '2026-10-17', true, 'lechuga', true),
  ('Lenteja cocida Hacendado', 'Hacendado', 'Mercadona', 0.9, 570, null, null, null, '2026-10-17', true, 'lentejas', true),
  ('Mantequilla con sal Hacendado', 'Hacendado', 'Mercadona', 2.05, 250, null, null, null, '2026-10-17', true, 'mantequilla', true),
  ('Manzana Golden', null, 'Mercadona', 0.4, 200, null, null, null, '2026-10-17', true, 'manzana', true),
  ('Pan de molde blanco Hacendado', 'Hacendado', 'Mercadona', 0.8, 460, null, null, null, '2026-10-17', true, 'pan de molde', true),
  ('Pasta penne rigate Hacendado', 'Hacendado', 'Mercadona', 0.8, 500, null, null, null, '2026-10-17', true, 'pasta', true),
  ('Patata', null, 'Mercadona', 0.44, 230, null, null, null, '2026-10-17', true, 'patata', true),
  ('Plátano de Canarias IGP', null, 'Mercadona', 0.45, 160, null, null, null, '2026-10-17', true, 'platano', true),
  ('Preparado de carne picada vacuno y cerdo', null, 'Mercadona', 4.1, 500, null, null, null, '2026-10-17', true, 'carne picada', true),
  ('Queso fresco batido desnatado 0% MG Hacendado', 'Hacendado', 'Mercadona', 1.1, 500, null, null, null, '2026-10-17', true, 'queso fresco', true),
  ('Queso lonchas fundido sándwich mezcla Hacendado', 'Hacendado', 'Mercadona', 1.1, 200, null, null, null, '2026-10-17', true, 'queso', true),
  ('Rodaja de salmón', null, 'Mercadona', 7, 350, null, null, null, '2026-10-17', true, 'salmon', true),
  ('Rodajas de merluza del Cabo descongelada', null, 'Mercadona', 4.67, 260, null, null, null, '2026-10-17', true, 'merluza', true),
  ('Tomate frito Hacendado', 'Hacendado', 'Mercadona', 1.35, 1200, null, null, null, '2026-10-17', true, 'tomate frito', true),
  ('Tomate pera', null, 'Mercadona', 0.26, 120, null, null, null, '2026-10-17', true, 'tomate', true),
  ('Yogur natural Hacendado', 'Hacendado', 'Mercadona', 1, 750, null, null, null, '2026-10-17', true, 'yogur', true)
on conflict (name, store) do update set
  brand            = excluded.brand,
  price_eur        = excluded.price_eur,
  size_g           = excluded.size_g,
  price_checked_on = excluded.price_checked_on,
  verified         = excluded.verified,
  term             = excluded.term,
  is_reference     = excluded.is_reference;
