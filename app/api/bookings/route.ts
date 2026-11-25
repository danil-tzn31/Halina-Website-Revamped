import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { createBookingSchema } from "@/lib/validators/booking";
import { arrivalCodeFromRoute } from "@/lib/trips";

// Creates a booking row in PENDING status — replaces the old site's
// payment_process.php, which inserted straight from $_POST with no
// validation. Payment happens later via Stripe Checkout; this route just
// reserves the booking so it shows up in My Bookings.
//
// Prisma is imported dynamically so the database client only loads when
// this route is actually called.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You need to be logged in to book." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid booking details", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const userId = session.user.id;
  const { type, name, dateFrom, dateTo } = parsed.data;

  // Every flight starts its own trip, so a hotel can be added to it later.
  // A hotel only joins a trip if that trip is really this user's — a
  // tampered or stale id just books the hotel on its own instead of
  // failing the whole booking.
  let tripId: string | null = null;
  if (type === "FLIGHT") {
    const destination = arrivalCodeFromRoute(name);
    if (destination) {
      const trip = await prisma.trip.create({
        data: {
          userId,
          destination,
          startDate: new Date(dateFrom),
          endDate: new Date(dateTo),
        },
      });
      tripId = trip.id;
    }
  } else if (parsed.data.tripId) {
    const trip = await prisma.trip.findFirst({
      where: { id: parsed.data.tripId, userId },
      select: { id: true },
    });
    tripId = trip?.id ?? null;
  }

  const booking = await prisma.booking.create({
    data: {
      userId,
      tripId,
      type: parsed.data.type,
      name: parsed.data.name,
      price: parsed.data.price,
      currency: parsed.data.currency,
      dateFrom: new Date(parsed.data.dateFrom),
      dateTo: new Date(parsed.data.dateTo),
      guests: parsed.data.guests,
      // `details` is validated JSON (z.record(z.string(), z.unknown()) in
      // lib/validators/booking.ts) but typed `unknown`, so it needs an
      // explicit cast to satisfy Prisma's InputJsonValue.
      details: (parsed.data.details ?? {}) as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
