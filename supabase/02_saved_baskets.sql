-- Cheap Groceries — saved baskets
-- Where to run this: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Only creates things and is safe to run more than once. Nothing here drops or deletes.

-- ---------------------------------------------------------------------------
-- saved_baskets: a basket someone chose to keep, and how many days it should last.
-- PRIVATE: each user only ever sees their own.
-- ---------------------------------------------------------------------------
create table if not exists public.saved_baskets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  days integer not null default 7 check (days between 1 and 90),
  created_at timestamptz not null default now()
);

create index if not exists saved_baskets_user_idx
  on public.saved_baskets (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- saved_basket_items: what is in it. A copy, so changing the live basket later
-- never rewrites a saved one.
-- ---------------------------------------------------------------------------
create table if not exists public.saved_basket_items (
  id uuid primary key default gen_random_uuid(),
  basket_id uuid not null
    references public.saved_baskets (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists saved_basket_items_basket_idx
  on public.saved_basket_items (basket_id);

alter table public.saved_baskets enable row level security;
alter table public.saved_basket_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'saved_baskets'
      and policyname = 'saved_baskets_own'
  ) then
    create policy saved_baskets_own on public.saved_baskets
      for all to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  -- An item may only be added to a basket that belongs to the same user, so
  -- knowing someone else's basket id is not enough to write into it.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'saved_basket_items'
      and policyname = 'saved_basket_items_own'
  ) then
    create policy saved_basket_items_own on public.saved_basket_items
      for all to authenticated
      using (user_id = auth.uid())
      with check (
        user_id = auth.uid()
        and exists (
          select 1 from public.saved_baskets b
          where b.id = basket_id and b.user_id = auth.uid()
        )
      );
  end if;
end
$$;
