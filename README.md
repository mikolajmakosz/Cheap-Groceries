# CestaPro

**CestaPro helps international students in Madrid see which supermarket their weekly shopping list
is cheapest at, so they stop overpaying for the same basket.**

Write your shopping list in plain words — "pollo", "leche entera", "arroz" — and CestaPro prices the
same basket at Mercadona and Dia, then tells you which one is cheaper.

Built for the EdTech Challenge: a real web app for a weekly problem of university life.

## How it works

1. Sign up with an email and a password.
2. Type what you plan to buy. Any text is accepted; a product the catalogue does not know is still
   saved, just without a price.
3. See the basket priced at each supermarket, with the cheaper one highlighted.

Totals are summed **only over products every supermarket can price**. Comparing eight priced items
at one shop against five at another would make the shorter list look cheaper for the wrong reason,
so unpriced products are listed separately instead of quietly skewing the result.

## Stack

| Piece | What it does |
| --- | --- |
| Next.js 16 (App Router) + React 19 | Pages and UI |
| Tailwind CSS 4 | Styling |
| Supabase | Email/password auth and Postgres with Row Level Security |
| Vercel | Hosting |

## Data and privacy

- Baskets are **private**. Row Level Security policies on `basket_items` check `auth.uid()` on
  select, insert, update and delete, so a user can only ever reach their own rows.
- The price catalogue (`products`) is shared reference data, readable only by logged-in users. It
  has no insert, update or delete policy, so nothing can write to it through the API.
- Only the Supabase URL and the publishable (anon) key reach the browser. The secret key is never
  in this repository, in the frontend, or in the build.

## Prices

Prices come from Mercadona's own public store API for the Madrid warehouse, collected by
[`scripts/scrape-mercadona.mjs`](scripts/scrape-mercadona.mjs):

```bash
npm run prices
```

It runs by hand, never from the app at request time — a shop changing its website must not be able
to take CestaPro down. Every row stores the date it was checked and a `verified` flag, and the app
says on screen when a total still rests on prices nobody has confirmed.

The full catalogue it collects (817 products) is kept in `data/mercadona.json` as provenance. Only
the reference products reach the database.

### Why reference products

Ask the catalogue for the cheapest row whose name contains "pollo" and you get *Carcasa y espinazo
de pollo* — chicken carcasses, at €1.07. Ask for "leche" and you get an oat drink. Neither is what
a shopper means.

So [`lib/reference-products.ts`](lib/reference-products.ts) names, by hand, the ordinary thing
behind each everyday word: one reference product per term per store, with Spanish and English
aliases, because the users are international students. "chicken" and "pollo" land on the same
chicken breast.

A product the catalogue cannot place is still saved to the basket and still shown. It simply
carries no price.

## The map

Shops come from OpenStreetMap, collected once by
[`scripts/fetch-stores.mjs`](scripts/fetch-stores.mjs):

```bash
npm run stores
```

41 supermarkets within 2 km of IE Tower, Paseo de la Castellana 259. Again, run by hand: the
Overpass API is slow and rate limited, and it answered HTTP 502 on the first attempt while this was
being built — not something a live page should depend on. The script falls back across mirrors.

Markers are green for the chains we can price and grey for the rest, so the map never implies a
total it does not have. Walking times are straight-line distance with a 1.35 city detour factor at
4.8 km/h, and the app says they are estimates rather than routed directions.

The map needs no API key and no billing account: OpenStreetMap tiles rendered with Leaflet.

## Tests

```bash
npm test
```

Covers the matching rules and the parts of the grading contract that are easy to break by accident:
any text must be accepted, unknown text must carry no price, and a single shop must not be
announced as the cheapest one.

## Running it locally

```bash
npm install
```

Create `.env.local` with your own Supabase project values:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
```

In the Supabase dashboard, open **SQL Editor → New query** and run, in order:

1. [`supabase/01_schema.sql`](supabase/01_schema.sql) — tables and Row Level Security
2. [`supabase/02_seed_prices.sql`](supabase/02_seed_prices.sql) — the starting price catalogue

Then:

```bash
npm run dev
```

The app runs at http://localhost:3000.

Under **Authentication → Sign In / Providers**, keep Email enabled and turn **Confirm email** off —
the free Supabase mailer only delivers to members of your own Supabase organisation, so with
confirmation on, real users never get in.
