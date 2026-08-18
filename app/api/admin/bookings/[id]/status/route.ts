import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { updateBookingStatusSchema } from "@/lib/validators/admin";

// The one mutating action anywhere on the admin dashboard — everything
// else there (app/account/admin/page.tsx) is a read-only Prisma fetch.
// Gated the same way every other route in this app is: the admin nav
// link and the page's own redirect (see AdminPage) are just UX, not
// security, so this route re-checks session.user.isAdmin itself before
// touching the database — never trust that only an admin could have
// reached this URL just because the UI hid the button from everyone else.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateBookingStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid status.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const booking = await prisma.booking.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ booking });
}
