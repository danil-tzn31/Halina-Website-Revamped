"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { StatusBadge } from "@/components/account/booking-card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/lib/use-pagination";
import { formatDateLabel } from "@/lib/flights/format";

export type AdminBookingRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  currency: string;
  price: number;
  dateFrom: string;
  dateTo: string;
  customerName: string;
  customerEmail: string;
};

const STATUS_OPTIONS = ["PENDING", "PAID", "CANCELLED"] as const;

// Client Component for the status dropdown and pagination state; the rest
// of the admin dashboard stays server-rendered.
export function AdminBookingsTable({ bookings }: { bookings: AdminBookingRow[] }) {
  const router = useRouter();
  const { pageItems, page, totalPages, goToPrev, goToNext } = usePagination(bookings, 20);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function handleStatusChange(id: string, status: string) {
    setPendingId(id);
    setErrorId(null);

    const response = await fetch(`/api/admin/bookings/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setPendingId(null);

    if (!response.ok) {
      setErrorId(id);
      return;
    }

    // Re-fetches from the server rather than trusting the dropdown value
    // directly, so the table reflects what was actually saved.
    router.refresh();
  }

  if (bookings.length === 0) {
    return <p className="text-[14px] text-ink-soft">No bookings yet.</p>;
  }

  return (
    <div>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        className="mb-4 justify-start"
      />
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line bg-paper-raised text-[11.5px] uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Booking</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((booking) => (
              <tr key={booking.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">
                  <div className="text-ink">{booking.customerName}</div>
                  <div className="text-[12px] text-ink-soft">{booking.customerEmail}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-ink">{booking.name}</div>
                  <div className="text-[12px] uppercase tracking-wide text-ink-soft">
                    {booking.type}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                  {booking.dateFrom === booking.dateTo
                    ? formatDateLabel(booking.dateFrom)
                    : `${formatDateLabel(booking.dateFrom)} – ${formatDateLabel(booking.dateTo)}`}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink">
                  {booking.currency} {booking.price.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={booking.status} />
                    <select
                      value={booking.status}
                      disabled={pendingId === booking.id}
                      onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                      aria-label={`Change status for ${booking.name}`}
                      className="border border-line bg-paper px-1.5 py-1 text-[12px] capitalize text-ink-soft focus:outline-none disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option.toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errorId === booking.id && (
                    <p className="mt-1 text-[11px] text-destructive">
                      Couldn&apos;t update — try again.
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
