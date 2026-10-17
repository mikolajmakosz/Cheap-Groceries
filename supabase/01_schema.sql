-- CestaPro — tables and Row Level Security
-- Where to run this: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- basket_items: PRIVATE user data. Each user only ever sees their own rows.
-- ---------------------------------------------------------------------------
create table if not exists public.basket_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists basket_items_user_created_idx
  on public.basket_items (user_id, created_at desc);

alter table public.basket_items enable row level security;

drop policy if exists basket_items_select_own on public.basket_items;
create policy basket_items_select_own on public.basket_items
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists basket_items_insert_own on public.basket_items;
create policy basket_items_insert_own on public.basket_items
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists basket_items_update_own on public.basket_items;
create policy basket_items_update_own on public.basket_items
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists basket_items_delete_own on public.basket_items;
create policy basket_items_delete_own on public.basket_items
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- products: the price catalogue. Shared reference data, not user data.
-- Readable only by logged-in users; no insert/update/delete policy exists, so
-- nobody can write to it through the API. Seeding happens in the SQL editor.
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  store text not null,
  price_eur numeric(8, 2) not null check (price_eur >= 0),
  size_g numeric(10, 2),
  protein_g_per_100g numeric(6, 2),
  fat_g_per_100g numeric(6, 2),
  kcal_per_100g numeric(7, 2),
  price_checked_on date not null,
  -- false until a human has actually seen this price on a shelf or a website.
  -- The app says so on screen, so the comparison never claims more than it knows.
  verified boolean not null default false,
  unique (name, store)
);

create index if not exists products_store_idx on public.products (store);

alter table public.products enable row level security;

drop policy if exists products_select_authenticated on public.products;
create policy products_select_authenticated on public.products
  for select to authenticated
  using (true);
