import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AdminBookingsTable, type AdminBookingRow } from "@/components/admin/admin-bookings-table";
import { AdminUsersTable, type AdminUserRow } from "@/components/admin/admin-users-table";

// Minimal shapes used by this page, annotated explicitly rather than
// relying on inference from the Prisma calls below — same reasoning as
// app/account/bookings/page.tsx's BookingRow: this sandbox can't generate
// the real Prisma Client (see HOW-IT-WORKS.md), so an un-generated
// @prisma/client types everything as `any` here. Once `npx prisma
// generate` has actually run (which the admin-flag migration already did
// for you), these still typecheck fine against the real generated types —
// they're just a subset of them.
type BookingWithUser = {
  id: string;
  name: string;
  type: string;
  status: string;
  currency: string;
  price: { toString(): string };
  dateFrom: Date;
  dateTo: Date;
  user: { firstName: string; lastName: string; email: string };
};

type UserWithBookingCount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
  _count: { bookings: number };
};

// proxy.ts's existing /account/* matcher only guarantees "signed in at
// all" — it has no idea what an admin is. This page adds the actual admin
// gate on top of that, the same defense-in-depth pattern used everywhere
// else in this app (a disabled Search button plus a real submit-time
// guard; client-side Zod validation plus the identical rule enforced again
// server-side). A non-admin who somehow lands on this URL — an old
// bookmark, or a session created before their account was ever made an
// admin (see lib/auth.ts's comment on why that specific case can happen)
// — gets sent back to their own bookings rather than seeing anyone else's
// data. The mutating action this page exposes (app/api/admin/bookings/
// [id]/status/route.ts) re-checks this same isAdmin flag itself too,
// rather than trusting that only an admin could have reached this far.
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/account/bookings");
  }

  const [bookings, users] = (await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { bookings: true } } },
    }),
  ])) as [BookingWithUser[], UserWithBookingCount[]];

  // Dates come back from Prisma as real Date objects — sliced down to a
  // plain "YYYY-MM-DD" the same way app/account/bookings/page.tsx already
  // does, for the same reason: formatDateLabel() and this page's own
  // string-equality date-range check both expect that shape, not a full
  // Date/timestamp.
  const bookingRows: AdminBookingRow[] = bookings.map((booking) => ({
    id: booking.id,
    name: booking.name,
    type: booking.type,
    status: booking.status,
    currency: booking.currency,
    price: Number(booking.price.toString()),
    dateFrom: booking.dateFrom.toISOString().slice(0, 10),
    dateTo: booking.dateTo.toISOString().slice(0, 10),
    customerName: `${booking.user.firstName} ${booking.user.lastName}`.trim(),
    customerEmail: booking.user.email,
  }));

  const userRows: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    createdAt: user.createdAt.toISOString().slice(0, 10),
    bookingCount: user._count.bookings,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="solid" />

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-16 pt-[104px] sm:px-10">
        <h1 className="text-3xl font-light tracking-tight text-ink">Admin</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Every booking and registered user, across all accounts — visible
          only to admins.
        </p>

        <section className="mt-10">
          <h2 className="text-[13px] font-medium uppercase tracking-wide text-ink-soft">
            Bookings ({bookings.length})
          </h2>
          <div className="mt-6">
            <AdminBookingsTable bookings={bookingRows} />
          </div>
        </section>

        {/* mt-16 between sections, not mt-14 — matches the gap already
            established between the embedded search bar and the results
            heading on /flights and /hotels (see section 24 of the plan
            doc), rather than a one-off number picked for this page alone.
            The "Users" heading sat noticeably closer to the Bookings table
            above it than the Bookings heading sits below the page title,
            since a heading-to-table gap and a table-to-heading gap read
            differently even at the same pixel value — bumped both this
            section's top margin and its own heading-to-table gap (mt-4 ->
            mt-6, same change as the Bookings section above) to fix that. */}
        <section className="mt-16">
          <h2 className="text-[13px] font-medium uppercase tracking-wide text-ink-soft">
            Users ({users.length})
          </h2>
          <div className="mt-6">
            <AdminUsersTable users={userRows} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
