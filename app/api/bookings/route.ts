import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { createBookingSchema } from "@/lib/validators/booking";

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
  const booking = await prisma.booking.create({
    data: {
      userId: session.user.id,
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
