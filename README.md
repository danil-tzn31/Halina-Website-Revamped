# Halina Travel — v2

A rebuild of my original PHP / SQL Server capstone project — Halina, a
travel booking site for flights, hotels, and destination browsing — using
Next.js, TypeScript, and Prisma/PostgreSQL.

**Live site:** [halina-website-revamped.vercel.app](https://halina-website-revamped.vercel.app)
(payments run in Stripe test mode, so no real money moves — use the test
card below).

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **Prisma** + **PostgreSQL** (Neon / Supabase)
- **Auth.js** (NextAuth) for authentication
- **Stripe** for payments (test mode)
- **Tailwind CSS** + **Motion** (Framer Motion) for animation
- **Zod** for schema validation

## Features

- **Flight search** with real prices from Google Flights data, through two
  providers: a RapidAPI listing first, and SerpApi as a backup for routes
  and dates the first one misses. If neither has anything, the results are
  clearly labelled as sample flights.
- **Hotel search** through a swappable provider adapter, with the same
  labelled sample fallback.
- **Trips:** every flight booking starts a trip. The confirmation page
  offers a hotel search already filled in with the destination, dates and
  guests, and My Bookings groups the flight and hotel under one heading.
- **Stripe Checkout** (test mode), with bookings marked paid only by the
  webhook, never by the redirect back to the site.
- **38 destination pages**, each with live weather and a 7-day forecast,
  the months that are usually drier (from five years of rainfall records),
  the nearest airport, and a small map of the Philippines you can click
  around.
- **Browse and filter destinations** by type of trip and budget.
- **A trip finder** that turns a sentence like "a quiet beach trip for two
  on a budget" into suggestions (Gemini), with a manual quiz if no key is
  set.
- **A downloadable boarding pass** for paid flights, viewable again from
  My Bookings.
- **An admin dashboard** for bookings and users, gated by a database flag.
- Email/password sign-in with hashed passwords, rate-limited login, and a
  currency switcher (PHP, USD, EUR, KRW, JPY) with live exchange rates.

## How it's built

A few decisions worth knowing about:

- **Every third-party call goes through the server.** API keys never reach
  the browser, and each provider sits behind a small adapter, so swapping
  one out (which has already happened twice for hotels) touches one file.
- **Things fail softly.** Each live data source has a fallback: sample
  flights and hotels, fixed exchange rates, a manual trip quiz, and
  "unavailable right now" for weather. A demo never shows a broken page.
- **Trips are their own table**, not a field tucked inside a booking, so a
  flight and a hotel can point at the same journey and the server can check
  a trip really belongs to the person adding to it.
- **Weather is cached on the server** (30 minutes for forecasts, 30 days for
  rainfall history), and comes from Open-Meteo, which needs no API key.
- **The map is a pre-drawn outline**, not a map library. No extra
  JavaScript and no tile requests, and it matches the site's look.

## Getting started

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

   The placeholder `DATABASE_URL` already in `.env.example` is enough to
   get past the next step — `npm install` runs `prisma generate`
   automatically (via the `postinstall` script in `package.json`), which
   only needs the variable to *exist*, not to be a working connection yet.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Fill in a real `DATABASE_URL` in `.env.local` — a free project on
   [Neon](https://neon.tech) or [Supabase](https://supabase.com) works —
   then run the first migration:

   ```bash
   npx prisma migrate dev
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

Optional: fill in the remaining keys in `.env.local` (RapidAPI, SerpApi,
a hotel provider, Stripe, Gemini) to enable live data instead of the
sample-data fallbacks — see the comments in `.env.example` for where to get
each one. Weather needs no key.

## Testing payments locally

Checkout uses Stripe, in test mode. Since Stripe can't reach `localhost`
directly, confirming a booking as paid needs the [Stripe
CLI](https://docs.stripe.com/stripe-cli) forwarding events to your dev
server, in a second terminal tab alongside `npm run dev`:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The first time you run it, it prints a `whsec_...` value — paste that into
`STRIPE_WEBHOOK_SECRET` in `.env.local` and restart `npm run dev`. It stays
valid across future restarts of `stripe listen` on the same machine, so
this is a one-time step. Without this running, checkout still redirects
and completes in Stripe, but a booking never actually flips from `PENDING`
to `PAID`, since that only happens inside the webhook handler.

Use Stripe's standard test card to walk through checkout:
`4242 4242 4242 4242`, any future expiry date, any CVC.

## Troubleshooting

**`Validation Error Count: 1 [Context: getConfig]` during `npm install` or
`npx prisma generate`.** Prisma couldn't find a `DATABASE_URL` at all (not
that it's wrong — just missing). Run `cp .env.example .env.local` and try
again.

## Project structure

```
app/            Pages and API routes (Next.js App Router)
components/     UI, grouped by area (booking, destinations, account, ui)
lib/            Shared code: providers (flights, hotels, weather), trips,
                database client, auth config, validation
prisma/         Database schema (schema.prisma) and migrations
scripts/        Standalone dev-time scripts (pre-deploy checks, API trials)
```
