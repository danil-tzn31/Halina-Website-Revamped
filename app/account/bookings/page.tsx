import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BookingCard, type BookingCardData } from "@/components/account/booking-card";
import { toBoardingPass } from "@/lib/flights/boarding-pass";

// Minimal shape, typed explicitly rather than relying on inference from
// `prisma.booking.findMany`.
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

// proxy.ts already redirects signed-out visitors away from /account, but
// checking `auth()` here too is cheap defense in depth.
export default async function BookingsPage() {
  const session = await auth();

  // CANCELLED is excluded — those are abandoned checkouts
  // (app/api/checkout/cancel/route.ts), nothing was ever paid for. A
  // still-PENDING row stays visible (labeled "pending") since it may be
  // mid-checkout or genuinely stuck.
  const bookings: BookingRow[] = session?.user?.id
    ? await prisma.booking.findMany({
        where: { userId: session.user.id, status: { not: "CANCELLED" } },
        orderBy: { dateFrom: "desc" },
      })
    : [];

  // Prisma returns Date objects, not the "YYYY-MM-DD" strings
  // formatDateLabel()/BookingCard expect — toISOString().slice(0, 10)
  // recovers that plain date safely, since these were written from a
  // plain date string (`new Date("2026-08-21")`), which the JS spec also
  // parses as UTC midnight (see app/api/bookings/route.ts).
  //
  // The signed-in user's name is fetched once here and reused for every
  // card's boardingPass, rather than inside BookingCard. toBoardingPass()
  // (lib/flights/boarding-pass.ts) returns null for anything that isn't a
  // PAID flight booking with a cleanly-parsed route.
  const passengerName = session?.user?.name ?? "Guest";
  const cards: BookingCardData[] = bookings.map((booking) => {
    const base = {
      id: booking.id,
      name: booking.name,
      type: booking.type,
      status: booking.status,
      currency: booking.currency,
      price: Number(booking.price.toString()),
      dateFrom: booking.dateFrom.toISOString().slice(0, 10),
      dateTo: booking.dateTo.toISOString().slice(0, 10),
      guests: booking.guests,
      details: booking.details,
    };
    return { ...base, boardingPass: toBoardingPass(base, passengerName) };
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="solid" />

      {/* See app/flights/page.tsx's identical comment — pt-[104px] reserves
          the space the now-floating, fixed-position Navbar needs. */}
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-16 pt-[104px] sm:px-10">
        <h1 className="text-3xl font-light tracking-tight text-ink">
          My Bookings
        </h1>

        {cards.length === 0 ? (
          <div className="mt-6 max-w-md">
            <p className="text-[15px] text-ink-soft">
              No bookings yet — search a flight or hotel and confirm one to
              see it here.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block border border-ink px-6 py-3 text-[13px] uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              Start searching
            </Link>
          </div>
        ) : (
          // Single column on mobile, same breakpoints as the flight/hotel
          // results grids (sm:2, lg:3).
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((booking) => (
              <li key={booking.id}>
                <BookingCard booking={booking} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <Footer />
    </div>
  );
}
