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

### Four supermarkets, every product at all of them

Mercadona, Dia, Carrefour and Alcampo only: smaller shops charge more, so they are left out. **A product is
in the catalogue only if all four sell it**, so any basket can be compared across the four and nothing is
priced at a shop that lacks it. The build ([`scripts/build-catalogue.mjs`](scripts/build-catalogue.mjs))
holds back any term missing from a shop and lists it, so a gap shows up when the catalogue is built, not as a
wrong total. Today that is 42 products; the held-back ones (butter, cereal, potatoes, lettuce, salmon,
apples, pork, minced meat, cheese slices at Alcampo and others) return as soon as a matching product is found
at the missing shop.

Where the four shops' products come from:

- **Mercadona** from its own public API and **Dia** by hand ([`data/mercadona.json`](data/mercadona.json),
  [`data/dia.json`](data/dia.json)).
- **Carrefour and Alcampo** from Soy Super's per-shop search ([`data/shops4.json`](data/shops4.json)): the shop's
  own-brand product that matches the term, kept only when its price per kg or litre is within 0.6x to 1.7x of
  the others' and its name carries the product's keyword. Their links open the product on Soy Super. The
  pages sit behind a proof-of-work check, so they were read from a normal browser session, a few seconds apart,
  and the collection stops at any challenge.
- **Coca-Cola**, the one branded product all four sell, from a Soy Super product page
  ([`data/soysuper.json`](data/soysuper.json)); other brands are sold by only some of the four.

Soy Super's photos carry its watermark and are not used; products show the Mercadona or Dia photo.

### Findit

[Findit](https://finditapp.es) lists every supermarket product with its photo, pack price, unit price and
label. Its robots.txt allows a person's assistant to read product pages, so it was used the same way as
the others: one product page at a time, a few seconds apart, no crawling. It gave:

- **26 more terms** in [`data/findit.json`](data/findit.json): the ordinary own-brand product (Hacendado,
  Dia, Carrefour, Auchan/Alcampo) of each shop that has one, with its photo and, where Findit has it, its
  label. Terms Findit and Soy Super together cover at all four shops are kept; the rest are held back.
- **Labels** for everyday terms that lacked one (`fill`), such as Mercadona's milk, eggs and chicken.
- **Photos** for the ten Soy Super branded terms (`photos`): Findit's picture of the same brand and type.

Where it does not help: Findit merges some branded products from different shops under one id and then
gets the pack size wrong (a Coca-Cola pack of two bottles priced at Mercadona next to a pack of six at
Alcampo), so branded prices stay with Soy Super. Carrefour and Alcampo products carry few labels there, so
those shops use typical values.

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

390 supermarkets of the four priced chains in the **whole city of Madrid** (224 Dia, 85 Mercadona, 42
Carrefour, 39 Alcampo), not only around IE Tower, because students live all over the city. Small
neighbourhood formats (Carrefour Express and City, Mi Alcampo, Dia & Go) are left out: they charge more than
the supermarkets the catalogue prices. A shop's chain comes from the name on the door, then its brand tag, as a
whole word, so a shop whose name merely contains "dia" is not taken for a Dia. Zoomed out, the shops are dots;
from zoom 14 they show their logos. Run by hand: the Overpass API is slow and rate limited, which is not
something a live page should depend on. The script falls back across mirrors.

The map fills the screen on both the landing page and `/app`, with a card floating over it. It uses
OpenStreetMap tiles rendered with Leaflet: no API key and no billing account. Google Maps was
considered and rejected, because it needs a billing account and its key would sit in a public
repository.

Clicking a shop draws the walking route from campus in ink, with the time. Routes come from the public
FOSSGIS pedestrian router; if it is slow or down the line falls back to a straight one with an estimate,
and the panel says so.

### Your trip: anchor, home and how you get about

IE Tower is not the centre of everything: it is one place you go anyway and come home from. Above the shop
list (and on Saved baskets) you choose:

- **On my way home** from an **anchor**: IE Tower by default, or your gym, a class, a job (type its address).
  A shop then costs only the **detour**: anchor to shop and on to home, less going straight home.
- **From home**: the whole trip, home to the shop and back.
- **Getting about**: walk, bus, Metro, Metro + bus or train (Cercanías). Every leg takes the quickest of
  walking and the chosen transport, so a shop round the corner is still walked.

Public-transport times are **estimates** ([`lib/trip.ts`](lib/trip.ts)), not a timetable: the walk to the nearest
Metro or Cercanías station ([`lib/stations-data.ts`](lib/stations-data.ts), 203 Metro and 44 Cercanías stations
from OpenStreetMap, `npm run stations`), an average wait, a typical speed for the distance, a change penalty for
long Metro rides, and the walk from the station; buses are timed from the road distance and an average speed. The
free timetable router that covers Spain (Transitous) has no Metro de Madrid or EMT buses, and Google's needs a
billing key, so this is the honest middle. Walked legs on the map come from the pedestrian router; legs by transport
are drawn dashed and straight.

On Saved baskets, each shop shows how much time shopping on the way home from the anchor **saves over going out
from home** to the nearest shop of the same chain and back, over the chosen period. Each saved basket opens as a
one-line summary (cheapest shop, basket price, price and time per period); **Show details** opens the rest.

Addresses are found with Photon and Nominatim (OpenStreetMap) and held in memory only: they are personal data and
nothing needs them kept, so they are not stored anywhere and are gone on reload.

### Cost against time

For each chain the shop that costs you the least time for your trip is picked, and
options that are both dearer and slower than another are dropped. What remains is a ladder from the
cheapest shop to the quickest, and each rung says what the extra money buys: "Choosing Dia over Mercadona
costs EUR 0.24 more and saves 2 min, so you pay EUR 0.12 for each minute saved."

## Nutrition

Every basket shows its energy, protein, fat, carbohydrate, sugars and salt, and each shop shows its own:
click Mercadona or Dia and the figures change to that shop's products. Where a product's label could be
collected, the app uses it ([`data/nutrition-dia.json`](data/nutrition-dia.json) from dia.es,
[`data/nutrition-mercadona.json`](data/nutrition-mercadona.json) from Open Food Facts, looked up by the EAN
Mercadona's API gives). Where a shop's product has no label (fresh produce, fresh meat and fish, most Carrefour and Alcampo
products) the **typical values** for the food are used ([`lib/nutrition.ts`](lib/nutrition.ts)). Not dietary advice.

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

**Edit** on a basket opens it for changes: rename it, add or remove products and change quantities, each
saved at once, so a saved basket never has to be rebuilt.

Every shop's nutrition is shown side by side, with the cost of 100 kcal and of a gram of protein, and the
day-by-day figures. Click a product's name to see that same product in each shop, per 100 g, label against
label; three shops show at once and the rest open under "All shops".

The two tables, `saved_baskets` and `saved_basket_items`, are private to each user through Row Level
Security, and an item can only be added to a basket that belongs to the same person. A saved basket is a
copy: changing the live basket later never rewrites it.

## Looking around

The **Browse products** button on `/app` opens a menu laid out like Mercadona's: nine aisles on the left
that open into sections (Fruit & veg: Fruit, Vegetables), and the products of what is picked on the right with
a photo and a price each ([`lib/categories.ts`](lib/categories.ts)). Tap a product to put it in the basket;
tap one that is already there to add a serving. The look follows dontlookup.app: warm paper, near-black ink, thick outlines, hard offset
shadows, Luckiest Guy for headlines and Nunito for text (both open fonts). The map is the same
OpenStreetMap data drawn in greyscale; a truly hand-drawn map would need its own tile set.

## First-visit tutorial

The first time a signed-in person arrives, a walkthrough lights up one thing at a time, dims the rest of the
screen and explains it in a speech bubble: open your basket, type a product, set the amount, compare the shops,
add the next product, add your address, choose where you come from, choose a shop, save, open your baskets, read
the settlement, compare the macros ([`components/Tour.tsx`](components/Tour.tsx)). The **? Tutorial** button bottom
left starts it again. The dimming lets every click through, so the app works the same with the tour on screen. Only
whether the tour was finished is kept in the browser (no user data).

## How it works video

The landing page's **How it works** button opens an 88-second motion-graphics explainer
([`public/video/explainer.mp4`](public/video/explainer.mp4)) with English captions on by default
([`explainer.en.vtt`](public/video/explainer.en.vtt)). It is made in code with Remotion in a separate folder
(`../video`): the voice is the macOS "Samantha" voice and the music an original loop made with ffmpeg, so there is
nothing to license; the numbers in it are an example basket.

## Delivery

Next to **I go**, the shop list and each saved basket have **Delivery**: the basket plus the shop's delivery
charge ([`lib/delivery.ts`](lib/delivery.ts): Mercadona €8.20, Dia €3.99 free from €100, Carrefour €7 free
from €120, Alcampo €7, for the IE Tower postcode 28029 as Soy Super's cart showed them on 18 October 2026,
before a delivery slot is chosen), and **what each hour of your own time saved really costs**: the delivery
charge divided by the hours the trip would have taken. You go home from campus anyway, so only the **detour** counts
(campus to the shop and on to home, less going straight home) plus the time inside the shop; without an address the
cost per hour is not shown. In a saved basket it is per billing period: charges per delivery times deliveries in the
period, against the minutes of trips given back.

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
