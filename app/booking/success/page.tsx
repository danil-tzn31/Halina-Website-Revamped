import Image from "next/image";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BookingPrice } from "@/components/account/booking-price";
import { ClearPendingCheckout } from "@/components/booking/clear-pending-checkout";
import { BoardingPassCard, type BoardingPassData } from "@/components/booking/boarding-pass-card";
import { toBoardingPass } from "@/lib/flights/boarding-pass";
import { BOOKING_CONFIRMED_PHOTO_URL } from "@/lib/photos";

// The one real page in a modal-first booking flow (see
// Halina-Revamp-Plan.md section 8) — Stripe's hosted Checkout is an
// unavoidable off-site redirect, and Stripe redirects back with a fresh
// browser navigation either way, so a real page here (rather than another
// modal) is the only option, not a stylistic choice.
//
// Reads `?session_id=` — the literal string Stripe substitutes into
// success_url's `{CHECKOUT_SESSION_ID}` placeholder (see
// app/api/checkout/route.ts) once payment actually succeeds. Stripe only
// ever sends someone to success_url after a completed payment, so arriving
// here at all already means the charge went through — this page's job is
// just to look up which booking that was and show it, not to re-verify
// payment status itself.
type BookingRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  currency: string;
  price: { toString(): string };
  dateFrom: Date;
  dateTo: Date;
  guests: number;
  details: unknown;
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  // Only touch the database at all if there's actually a session id to look
  // up — same "don't import prisma unless this request genuinely needs it"
  // discipline as lib/auth.ts's dynamic import (Halina-Revamp-Plan.md
  // section 9): someone landing on this URL with no session_id (a bad
  // link, a bookmark, manually typing the path) shouldn't pay for a
  // database round-trip, or be at the mercy of a database problem, just to
  // see the plain fallback message below.
  let booking: BookingRow | null = null;
  let boardingPass: BoardingPassData | null = null;
  if (sessionId) {
    const { prisma } = await import("@/lib/prisma");
    booking = await prisma.booking.findFirst({ where: { stripeSessionId: sessionId } });

    // The session lookup (passenger name for the card) only runs for the
    // one case that actually needs it — a paid flight booking — same
    // "don't pay for work this request doesn't need" discipline as the
    // sessionId/prisma gate just above. toBoardingPass() itself now lives
    // in lib/flights/boarding-pass.ts, shared with the "View boarding
    // pass" button on My Bookings — see that file's comment.
    if (booking && booking.type === "FLIGHT" && booking.status === "PAID") {
      const session = await auth();
      boardingPass = toBoardingPass(
        {
          id: booking.id,
          name: booking.name,
          type: booking.type,
          status: booking.status,
          currency: booking.currency,
          price: Number(booking.price),
          dateFrom: booking.dateFrom.toISOString().slice(0, 10),
          dateTo: booking.dateTo.toISOString().slice(0, 10),
          guests: booking.guests,
          details: booking.details,
        },
        session?.user?.name ?? "Guest"
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ClearPendingCheckout />
      <Navbar variant="solid" />

      {/* pt-[104px] reserves the space the fixed-position Navbar needs, same
          as every other non-photo-hero page (see app/flights/page.tsx's
          identical comment) — the extra mt-10 below it is this page's own
          design choice to center the confirmation with some air above it,
          not part of that reserved-space convention. */}
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center px-6 pb-16 pt-[104px] text-center sm:px-10">
        {/* The one photo added anywhere in this booking flow — everything
            up to Stripe's own checkout page is otherwise plain text and
            receipt-style boxes (see lib/photos.ts for why this specific
            photo). This is the actual emotional payoff of the whole
            search-to-booking flow, so it's the one spot in this
            transactional stretch of the app where a photo earns its
            place rather than just decorating it. */}
        <div className="relative mt-10 h-48 w-full overflow-hidden border border-line sm:h-56">
          <Image
            src={BOOKING_CONFIRMED_PHOTO_URL}
            alt="A passport and boarding pass laid on a travel bag"
            fill
            sizes="(min-width: 640px) 640px, 100vw"
            className="object-cover"
          />
        </div>

        <h1 className="mt-8 text-3xl font-light tracking-tight text-ink">
          Payment received
        </h1>

        {booking ? (
          <>
            <p className="mt-3 text-[15px] text-ink-soft">
              {booking.status === "PAID" ? (
                <>Your booking is confirmed.</>
              ) : (
                // The webhook that marks a booking PAID (see
                // app/api/stripe/webhook/route.ts) is a separate, async
                // delivery from Stripe — it usually lands within a second
                // or two of this redirect, but there's no guarantee it
                // beats the browser here. Rather than pretend this race
                // doesn't exist (or make the visitor wait on a spinner for
                // an event that already succeeded from their perspective),
                // this is the honest in-between state: the charge went
                // through, the booking just hasn't finished being marked
                // confirmed on our end yet.
                <>
                  Your payment went through — we&apos;re just finishing up
                  confirming the booking on our end. This usually takes only
                  a moment.
                </>
              )}
            </p>
            {boardingPass ? (
              // Flight, paid, and its route parsed cleanly — the
              // standout-feature boarding pass card (section 35/36)
              // replaces the plain box entirely rather than sitting next
              // to it, since the card already shows everything the box
              // did (name/type/price) plus more.
              <BoardingPassCard booking={boardingPass} />
            ) : (
              <div className="mt-8 w-full border border-line bg-paper-raised px-6 py-5 text-left">
                <p className="text-[15px] text-ink">{booking.name}</p>
                <p className="mt-1 text-[13px] text-ink-soft">
                  {booking.type === "FLIGHT" ? "Flight" : "Hotel"} booking
                </p>
                <p className="mt-3 text-[18px] text-ink">
                  <BookingPrice
                    amount={Number(booking.price)}
                    currency={booking.currency}
                  />
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-[15px] text-ink-soft">
            Your payment went through — check{" "}
            <Link href="/account/bookings" className="underline underline-offset-4">
              My Bookings
            </Link>{" "}
            for the confirmed booking.
          </p>
        )}

        <Link
          href="/account/bookings"
          className="mt-8 inline-block border border-ink px-6 py-3 text-[13px] uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          View My Bookings
        </Link>
      </main>

      <Footer />
    </div>
  );
}
