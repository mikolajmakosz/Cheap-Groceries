## Grading contract — EdTech Challenge (never remove or break this)
An automated bot grades this app on its public Vercel URL, acting like a stranger.

### Pages
- `/` public landing page (no login needed): what the app does, who it is for, and one button to sign up.
- `/signup` sign-up with email + password. `/login` login with email + password.
- `/app` the main feature, only for logged-in users.
- After sign-up and after login, send the user to `/app`.
- No email confirmation, no CAPTCHA, no "Google only" login, no mandatory onboarding before `/app`.

### data-testid attributes (exact names, do not translate)
- Sign-up form: `signup-email`, `signup-password`, `signup-submit`
- Login form: `login-email`, `login-password`, `login-submit`
- `logout`: the logout button, visible on every page of a logged-in user
- On `/app`:
  - `core-input`: a TEXT field of the main feature (type="text" or a textarea, e.g. the title or description, never a number or date picker). The bot types a short text like "QA-7F3K2A grading bot test"
  - `core-submit`: the button that saves it
  - `core-item`: EVERY saved item in the list, showing the text typed in `core-input`
- Typing only in `core-input` and clicking `core-submit` must save a new item. Any other field needs a valid default value.

### Data and security
- Use Supabase Auth (email + password) and save all data in Supabase tables, never only in the browser (no localStorage for user data).
- Row Level Security ON for every table, with policies based on `auth.uid()`. Nobody can read anything without logging in.
- Only the Supabase URL and the publishable (anon) key may reach the browser. Never put the secret/service_role key or any AI API key in the frontend or in GitHub.
- Keep keys in `.env.local` (listed in `.gitignore`) and in Vercel environment variables.

---

# CestaPro — project brief

**Deadline: 22 October 2026.** Submitted through Deliver in Socratista (Async #1), never through the
session-page form, which files the work as a group submission.

## One-liner

CestaPro helps international students in Madrid see which supermarket their weekly shopping list is
cheapest at, so they stop overpaying for the same basket.

## Who it is for

International students living in shared flats in Madrid, on a fixed monthly food budget, who shop
weekly and have no idea whether Mercadona or Dia is cheaper for the things they actually buy.

## Main feature (this is `core-input` / `core-submit` / `core-item`)

The user types a product name as free text — "pollo", "leche entera", "queso fresco" — and saves it
to their basket. Every saved product appears in the list.

**Critical rule, do not break it:** the text field accepts ANY text. A product that does not match
anything in the price catalogue is still saved and still shown in the list, just without a price.
Never reject input, never require picking from a dropdown or autocomplete, never block submit on
validation. The grading bot types `QA-7F3K2A grading bot test` and that exact text must appear as a
`core-item`.

Quantity defaults to 1. No other field is required.

## On top of the basket

For each supermarket in the catalogue, show what the current basket would cost there, and which
store is cheapest overall. Products with no price match are listed separately as "not priced" so the
comparison stays honest. Show the date the prices were collected.

## Data model

- `basket_items` — one row per product a user added. Columns: `id`, `user_id` (defaults to
  `auth.uid()`), `name` (text, the free text typed), `quantity` (int, default 1), `created_at`.
  **Private**: RLS policies on select/insert/update/delete all check `user_id = auth.uid()`.
  A second user must never see the first user's rows.
- `products` — the price catalogue, shared reference data, not user data. Columns: `id`, `name`,
  `brand`, `store`, `price_eur`, `size_g`, `protein_g_per_100g`, `fat_g_per_100g`,
  `kcal_per_100g`, `price_checked_on`. RLS ON, with a select policy for authenticated users only,
  so nothing is readable without logging in.

Matching basket text to catalogue products is a simple case-insensitive match on the product name.
It is allowed to miss — a miss means "no price", never an error.

## How it is graded

| Criterion | Weight | Checked by |
| --- | --- | --- |
| Real daily problem & value proposition | 20% | AI + professor |
| Understandable in 5 seconds | 20% | AI visitor who has never seen the project |
| Real sign-up | 30% | Grading bot |
| Does something real | 30% | Grading bot |

The landing page carries 20% on its own: a first-time visitor must say correctly what it does, who
it is for and what to do next, from one headline, one short subheadline and one clear button, on a
phone.

## Out of scope for now

Nutrition filters (high protein, low fat) come after the contract above is fully satisfied and
tested. Do not add them at the cost of the core flow.

## Prices

Prices are collected by hand, stored in `products`, and labelled with `price_checked_on`. No live
scraping of supermarket websites: it is fragile, and the app has to keep working untouched for
weeks after the deadline while the bot grades it.
