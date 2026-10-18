-- Cheap Groceries — how long a product lasts, as the person says it.
-- Where to run this: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Only adds a column and is safe to run more than once. Nothing here drops or deletes.

-- Empty means "no answer": the product is spread over the whole basket's days.
alter table public.saved_basket_items
  add column if not exists lasts_days integer
  check (lasts_days is null or lasts_days between 1 and 3650);
