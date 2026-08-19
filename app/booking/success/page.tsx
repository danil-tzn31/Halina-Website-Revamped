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

// The one real page in an otherwise modal-first booking flow — Stripe's
// hosted Checkout is an off-site redirect, so a real page here (not
// another modal) is the only option.
//
// Reads `?session_id=`, the value Stripe substitutes into success_url's
// `{CHECKOUT_SESSION_ID}` placeholder (see app/api/checkout/route.ts)
// once payment succeeds. Arriving here at all means the charge went
// through — this page just looks up and displays that booking.
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

  // Only touch the database if there's actually a session id to look up —
  // a bad link, bookmark, or hand-typed path shouldn't pay for a database
  // round-trip just to show the fallback message below.
  let booking: BookingRow | null = null;
  let boardingPass: BoardingPassData | null = null;
  if (sessionId) {
    const { prisma } = await import("@/lib/prisma");
    booking = await prisma.booking.findFirst({ where: { stripeSessionId: sessionId } });

    // Session lookup (for the passenger name) only runs when actually
    // needed — a paid flight booking. toBoardingPass() lives in
    // lib/flights/boarding-pass.ts, shared with the "View boarding pass"
    // button on My Bookings.
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
          as every other non-photo-hero page — the extra mt-10 below is this
          page's own spacing choice. */}
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center px-6 pb-16 pt-[104px] text-center sm:px-10">
        {/* The one photo in this booking flow — everything up to Stripe's
            checkout page is otherwise plain text and receipt-style boxes
            (see lib/photos.ts). */}
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
                // The webhook that marks a booking PAID
                // (app/api/stripe/webhook/route.ts) is a separate async
                // delivery from Stripe — usually lands within a second or
                // two, but isn't guaranteed to beat this redirect. This is
                // the honest in-between state: charge succeeded,
                // confirmation still pending.
                <>
                  Your payment went through — we&apos;re just finishing up
                  confirming the booking on our end. This usually takes only
                  a moment.
                </>
              )}
            </p>
            {boardingPass ? (
              // Flight, paid, route parsed cleanly — the boarding pass
              // card replaces the plain box entirely, since it already
              // shows name/type/price plus more.
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
