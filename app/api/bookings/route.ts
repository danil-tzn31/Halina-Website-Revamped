import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createBookingSchema } from "@/lib/validators/booking";

// Creates a booking row in PENDING status — the direct replacement for the
// old site's payment_process.php, minus the "insert straight from $_POST
// with no validation" part. This intentionally does NOT touch Stripe yet:
// that's Day 5. Today, "booking" means "reserve it and it shows up in My
// Bookings as pending" — a real, working step, just not a paid one yet.
// Prisma is imported dynamically for the same reason as lib/auth.ts: this
// route only needs the database when it's actually called, not on every
// page load.
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
      details: parsed.data.details ?? {},
    },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
