# Cheap Groceries

**Cheap Groceries helps international students in Madrid see which supermarket their weekly shopping list
is cheapest at, so they stop overpaying for the same basket.**

Write your shopping list in plain words — "pollo", "leche entera", "arroz" — and Cheap Groceries prices the
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

Two shops, 30 everyday products each, collected on 2026-10-17:

- **Mercadona** — its own public store API for the Madrid warehouse, read by
  [`scripts/scrape-mercadona.mjs`](scripts/scrape-mercadona.mjs) (`npm run prices`). The full 817-product
  collection is kept in `data/mercadona.json` as provenance.
- **Dia** — answers HTTP 403 to command-line clients, so the 30 products were collected by hand in a
  normal browser, one search per everyday word. They live in [`data/dia.json`](data/dia.json) with a
  note saying so. Refreshing them means collecting them again.

`npm run catalogue` folds both into [`lib/catalogue-data.ts`](lib/catalogue-data.ts), the one file the app
reads prices from. It fails loudly when a chosen product has disappeared from a shop's data, so a
renamed product shows up there and not as a silent missing price.

Nothing is fetched at request time. A shop changing its website must not be able to take Cheap Groceries down,
and the catalogue ships inside the app, so even the landing page can show prices to someone who has not
signed in.

### Why reference products

Ask a catalogue for the cheapest row whose name contains "pollo" and you get *Carcasa y espinazo de
pollo* — chicken carcasses, at €1.07. Ask for "leche" and you get an oat drink. Neither is what a
shopper means.

So [`lib/reference-products.ts`](lib/reference-products.ts) names, by hand, the ordinary thing behind each
everyday word: one reference product per term per shop, an English label, and Spanish and English
aliases, because the users are international students. "chicken", "pollo" and "chicken breast" all land
on the same product.

### One measure for every shop

Shops do not sell identical packs: a 2 kg bag of potatoes against a 230 g loose one says nothing about
which shop is cheaper. So every price is converted to the same measure before anything is compared:
per kg, per litre, per dozen, per loaf or per piece, whichever suits the product. Mercadona publishes
that figure itself; for Dia it is the pack price divided by the pack size.

A basket is then priced in servings, a typical purchase of each product (200 g of cheese, 500 g of
chicken, a litre of milk, a dozen eggs), so the total describes something a student really buys. The
`+` and `-` buttons add or remove a serving.

`npm test` refuses a catalogue in which two shops price the same product more than 2x apart. A gap that
wide almost always means two different products were paired, and the app would announce a false winner.

### Soy Super

Looked at as a source of every shop's prices and labels. For a **branded** product (Pascual milk) a Soy
Super page lists its price at Alcampo, El Corte Ingles, Dia and Carrefour, which would add shops. But own
brands (Hacendado, Dia, Carrefour) exist in one shop only, so they cannot be compared across shops there;
search results are scoped to one selected shop; its photos carry its watermark; and of the own-brand
products checked, none carried a nutrition table (the one branded table found was dated 2014). So prices
and labels here come from the shops' own sources instead, and Soy Super stays a candidate for adding
branded products and more shops.

#### Which shops are compared

`compareBasket` (lib/pricing.ts) totals only the products **every compared shop prices**. Which shops
are compared follows the basket: `shopsFor` picks the group of at least two shops that all price the
most of its products (a tie goes to the larger group). With everyday own-brand items that is Mercadona
and Dia, as before; once branded products from Soy Super are in the catalogue, a basket of Pascual milk
and Coca-Cola compares the shops that sell them (Alcampo, Carrefour, Dia, El Corte Inglés) and says
which shop was left out. A product a compared shop does not carry is listed as unpriced, never counted
as free. A caller can also pass the shops explicitly.

### Product links and logos

The shop's logo next to each product opens that product on the shop's own site. The logos in
`public/logos` are the ones Dia and Mercadona publish on their websites, used only to tell the shops
apart; they are those companies' trademarks, not part of this project's licence.

### Photos

Product photos are linked from the shops' own servers rather than copied. If one disappears, the app
shows a quiet placeholder instead of a broken-image icon.

### Search

Typing suggests products with their photos and prices, but suggestions are a shortcut and never a
requirement: the Add button always saves exactly what was typed. A word the catalogue does not know is
kept in the basket and simply carries no price.

## The map

Shops come from OpenStreetMap, collected once by
[`scripts/fetch-stores.mjs`](scripts/fetch-stores.mjs):

```bash
npm run stores
```

41 supermarkets within 2 km of IE Tower, Paseo de la Castellana 259. Run by hand: the Overpass API is
slow and rate limited, and it answered HTTP 502 on the first attempt while this was being built, which
is not something a live page should depend on. The script falls back across mirrors.

The map fills the screen on both the landing page and `/app`, with a card floating over it. It uses
OpenStreetMap tiles rendered with Leaflet: no API key and no billing account. Google Maps was
considered and rejected, because it needs a billing account and its key would sit in a public
repository.

Clicking a shop draws the walking route from campus in ink, with the time. Routes come from the public
FOSSGIS pedestrian router; if it is slow or down the line falls back to a straight one with an estimate,
and the panel says so.

### Home, and what it costs in minutes

Under a chosen shop the app can ask for a home address in Madrid, suggesting streets as you type, and draw
the way on from the shop in blue, then say what the detour adds compared with going straight home.
Suggestions come from Photon, a geocoder built for search-as-you-type; Nominatim's own policy discourages
autocomplete, so it is kept for one exact lookup of the house number afterwards. The address is sent to OpenStreetMap's
geocoder to be located and is held in memory only: it is personal data and nothing needs it kept, so it is
not stored anywhere and is gone on reload.

### Cost against time

With an address the times cover campus, shop and home. For each chain the quickest shop is picked, and
options that are both dearer and slower than another are dropped. What remains is a ladder from the
cheapest shop to the quickest, and each rung says what the extra money buys: "Choosing Dia over Mercadona
costs EUR 0.24 more and saves 2 min, so you pay EUR 0.12 for each minute saved."

## Nutrition

Every basket shows its energy, protein, fat, carbohydrate, sugars and salt, and each shop shows its own:
click Mercadona or Dia and the figures change to that shop's products. Where a product's label could be
collected, the app uses it ([`data/nutrition-dia.json`](data/nutrition-dia.json) from dia.es,
[`data/nutrition-mercadona.json`](data/nutrition-mercadona.json) from Open Food Facts, looked up by the EAN
Mercadona's API gives). Fresh produce, fresh meat and fish, eggs, milk and bread carry no table there, so
they use **typical values** ([`lib/nutrition.ts`](lib/nutrition.ts)). A product's label counts only when
both shops have one, so the baskets are weighed on the same footing. Not dietary advice.

What is counted is what is eaten: peel, core and shell are left out, and counted things (eggs, a lettuce)
are converted to grams. `npm test` checks that energy agrees with the macros it is made of.

Next to price the app shows what a kcal and a gram of protein cost in each shop (euros per 100 kcal,
euros per gram of protein).

## Saved baskets

Save a basket under a name and open it from **Saved baskets**, the button in the header. Two sliders and a
selector do the settling:

- **Basket lasts**: how many days this basket has to last you.
- **Period**: day, week, month or any number of days. For each shop you see the **basket price** (what you
  pay at the till) and the **price per period**, plus the time: trips in the period (period / days),
  minutes per trip (campus to the shop, inside the shop, and on to home if an address is given) and
  minutes in total.
- **Lasts me**, on each product: how many days that product lasts *you*. The app guesses nothing about how
  fast anyone eats (one person eats 3,000 kcal a day, another 7,000), so this is only what you type. Left
  empty, a product is spread over the basket's days; with a longer number (a litre of oil that lasts 60
  days) it is charged, and counted for calories, over those days. Stored in `saved_basket_items.lasts_days`
  ([`supabase/03_lasts_days.sql`](supabase/03_lasts_days.sql)).

Every shop's nutrition is shown side by side, with the cost of 100 kcal and of a gram of protein, and the
day-by-day figures. Click a product's name to see that same product in each shop, per 100 g, label against
label; three shops show at once and the rest open under "All shops".

The two tables, `saved_baskets` and `saved_basket_items`, are private to each user through Row Level
Security, and an item can only be added to a basket that belongs to the same person. A saved basket is a
copy: changing the live basket later never rewrites it.

## Looking around

The **Browse products** button on `/app` opens the aisles (meat, fish, dairy and eggs, bread, rice and pasta,
oil and sauces, fruit and veg, drinks; [`lib/categories.ts`](lib/categories.ts)) with a photo and a price for
every product. The look follows dontlookup.app: warm paper, near-black ink, thick outlines, hard offset
shadows, Luckiest Guy for headlines and Nunito for text (both open fonts). The map is the same
OpenStreetMap data drawn in greyscale; a truly hand-drawn map would need its own tile set.

## Time in the shop

The walk is only part of it. The time inside the shop is estimated from the size of the basket: a fixed few
minutes for a basket, the queue and paying, a minute and a half to find each product, and a little more for
each further serving. It is the same in every shop, so it does not change which shop wins, and the app
shows it separately.

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

1. [`supabase/01_schema.sql`](supabase/01_schema.sql) — the basket table and Row Level Security
2. [`supabase/02_saved_baskets.sql`](supabase/02_saved_baskets.sql) — saved baskets

Then:

```bash
npm run dev
```

The app runs at http://localhost:3000.

Under **Authentication → Sign In / Providers**, keep Email enabled and turn **Confirm email** off —
the free Supabase mailer only delivers to members of your own Supabase organisation, so with
confirmation on, real users never get in.
