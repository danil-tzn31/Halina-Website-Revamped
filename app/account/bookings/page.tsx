import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BookingCard, type BookingCardData } from "@/components/account/booking-card";
import { toBoardingPass } from "@/lib/flights/boarding-pass";
import { formatDateLabel } from "@/lib/flights/format";
import { addHotelHref, stayPlaceForAirport } from "@/lib/trips";

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
  trip: { id: string; destination: string; startDate: Date; endDate: Date } | null;
};

type TripGroup = {
  id: string;
  place: string;
  dates: string;
  cards: BookingCardData[];
  // Only offered when the flight is paid and nothing's booked to stay yet.
  addHotelHref: string | null;
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
        include: { trip: true },
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

  // Bookings that share a trip are shown together under one heading.
  // Anything without a trip (older bookings, or a hotel booked on its
  // own) stays in the plain grid below. `bookings` is already newest
  // first, so groups come out in the same order.
  const groups: TripGroup[] = [];
  const looseCards: BookingCardData[] = [];
  bookings.forEach((booking, i) => {
    const card = cards[i];
    if (!booking.trip) {
      looseCards.push(card);
      return;
    }
    let group = groups.find((g) => g.id === booking.trip!.id);
    if (!group) {
      const start = booking.trip.startDate.toISOString().slice(0, 10);
      const end = booking.trip.endDate.toISOString().slice(0, 10);
      group = {
        id: booking.trip.id,
        place: stayPlaceForAirport(booking.trip.destination),
        dates:
          end > start
            ? `${formatDateLabel(start)} – ${formatDateLabel(end)}`
            : formatDateLabel(start),
        cards: [],
        addHotelHref: null,
      };
      groups.push(group);
    }
    group.cards.push(card);
  });

  groups.forEach((group) => {
    const flight = group.cards.find((c) => c.type === "FLIGHT");
    const hasHotel = group.cards.some((c) => c.type === "HOTEL");
    const trip = bookings.find((b) => b.trip?.id === group.id)?.trip;
    if (flight && flight.status === "PAID" && !hasHotel && trip) {
      group.addHotelHref = addHotelHref({
        id: trip.id,
        destination: trip.destination,
        startDate: trip.startDate.toISOString().slice(0, 10),
        endDate: trip.endDate.toISOString().slice(0, 10),
        guests: flight.guests,
      });
    }
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
          <div className="mt-8 flex flex-col gap-12">
            {groups.map((group) => (
              <section key={group.id}>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2 className="text-xl font-light tracking-tight text-ink">
                    Trip to {group.place}
                  </h2>
                  <p className="text-[13.5px] text-ink-soft">{group.dates}</p>
                </div>
                <BookingGrid cards={group.cards} />
                {group.addHotelHref && (
                  <p className="mt-3 text-[13.5px] text-ink-soft">
                    No hotel yet.{" "}
                    <Link href={group.addHotelHref} className="text-ink underline underline-offset-4">
                      Find a place to stay
                    </Link>
                  </p>
                )}
              </section>
            ))}

            {looseCards.length > 0 && (
              <section>
                {groups.length > 0 && (
                  <h2 className="text-xl font-light tracking-tight text-ink">
                    Other bookings
                  </h2>
                )}
                <BookingGrid cards={looseCards} />
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// Single column on mobile, same breakpoints as the flight/hotel results
// grids (sm:2, lg:3).
function BookingGrid({ cards }: { cards: BookingCardData[] }) {
  return (
    <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((booking) => (
        <li key={booking.id}>
          <BookingCard booking={booking} />
        </li>
      ))}
    </ul>
  );
}
