import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AdminBookingsTable, type AdminBookingRow } from "@/components/admin/admin-bookings-table";
import { AdminUsersTable, type AdminUserRow } from "@/components/admin/admin-users-table";

// Minimal shapes, typed explicitly rather than relying on inference from
// the Prisma calls below — same pattern as BookingRow in
// app/account/bookings/page.tsx.
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

// proxy.ts's /account/* matcher only guarantees "signed in", not admin —
// this page adds the actual admin gate on top (same defense-in-depth
// pattern used elsewhere in this app: a disabled button plus a real
// submit-time guard, client-side validation plus the same rule enforced
// server-side). A non-admin who lands here — a stale bookmark, or a
// session predating an admin promotion (see lib/auth.ts) — gets sent back
// to their own bookings. The mutating route
// (app/api/admin/bookings/[id]/status/route.ts) re-checks isAdmin itself
// too.
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

  // Prisma returns real Date objects — sliced to plain "YYYY-MM-DD",
  // same as app/account/bookings/page.tsx, since formatDateLabel() and
  // this page's date-range check both expect that shape.
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

        {/* mt-16 between sections — matches the search-bar-to-results gap
            used on /flights and /hotels. */}
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
