# Halina Travel — v2

A rebuild of my original PHP / SQL Server capstone project — Halina, a
travel booking site for flights, hotels, and destination browsing — using
Next.js, TypeScript, and Prisma/PostgreSQL.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **Prisma** + **PostgreSQL** (Neon / Supabase)
- **Auth.js** (NextAuth) for authentication
- **Stripe** for payments (test mode)
- **Tailwind CSS** + **Motion** (Framer Motion) for animation
- **Zod** for schema validation

## Features

- Flight and hotel search backed by a real external-API adapter, with a
  clearly-labeled sample-data fallback when no API key is configured
- Email/password authentication with a protected account area
- Stripe Checkout, with booking status kept in sync via a webhook
- An AI-assisted trip finder (Gemini), with a fully-functional manual
  fallback if no key is set
- An admin dashboard for managing bookings and users
- A downloadable, shareable "boarding pass"-style booking confirmation

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

Optional: fill in the remaining keys in `.env.local` (RapidAPI, a hotel
provider, Stripe, Gemini) to enable live data instead of the sample-data
fallbacks — see the comments in `.env.example` for where to get each one.

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
components/ui/  Small reusable UI pieces (shadcn/ui-style)
lib/            Shared code: database client, auth config, validation
prisma/         Database schema (schema.prisma) and migrations
scripts/        Standalone dev-time scripts (pre-deploy checks, API trials)
```
