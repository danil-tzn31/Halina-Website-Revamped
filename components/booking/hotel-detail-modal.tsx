"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/lib/auth-modal-context";
import { useCurrency } from "@/lib/currency/currency-context";
import { formatDateLabel } from "@/lib/flights/format";
import type { HotelOffer } from "@/lib/hotels/types";
import { rememberPendingCheckout } from "@/components/booking/checkout-abandon-watcher";

// Same pattern as FlightDetailModal: full details + "Confirm & pay" that
// creates a PENDING booking then redirects to Stripe Checkout; PAID only
// gets set later by the webhook. Kept as a near-mirror rather than a
// shared component — the two have different enough fields (nights vs.
// duration) that merging them would add more conditionals than it saves.
function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

export function HotelDetailModal({
  offer,
  guests,
  checkIn,
  checkOut,
  onClose,
}: {
  offer: HotelOffer | null;
  guests: number;
  checkIn: string;
  checkOut: string;
  onClose: () => void;
}) {
  const { status } = useSession();
  const { openModal } = useAuthModal();
  const { formatPrice } = useCurrency();
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!offer) return null;
  const nights = nightsBetween(checkIn, checkOut);
  const total = offer.pricePerNight * nights;

  async function handleConfirm() {
    setState("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "HOTEL",
          name: offer!.name,
          price: total,
          currency: offer!.currency,
          dateFrom: checkIn,
          dateTo: checkOut,
          guests,
          details: {
            city: offer!.city,
            nights,
            pricePerNight: offer!.pricePerNight,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong. Try again.");
      }

      const { booking } = await res.json();

      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      if (!checkoutRes.ok) {
        const data = await checkoutRes.json().catch(() => null);
        throw new Error(
          data?.error ?? "Booking reserved, but checkout couldn't start. Try again from My Bookings."
        );
      }

      const { url } = await checkoutRes.json();
      // Lets checkout-abandon-watcher.tsx clean this booking up if the
      // visitor uses their browser's back button instead of Stripe's link.
      rememberPendingCheckout(booking.id);
      // A full-page navigation, not router.push() — Stripe's Checkout page
      // is a completely separate site, not a route inside this Next app.
      window.location.href = url;
    } catch (error) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open={Boolean(offer)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl gap-0 p-0">
        <div className="relative h-48 w-full bg-ink/10">
          {offer.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offer.photo}
              alt={offer.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[13px] text-ink-soft">
              No photo available
            </div>
          )}
        </div>

        <div className="px-8 py-7">
          <DialogHeader>
            <DialogTitle>{offer.name}</DialogTitle>
            <DialogDescription>
              {offer.address ?? offer.city}
              {offer.rating !== null && ` · ${offer.rating.toFixed(1)} ★`}
            </DialogDescription>
          </DialogHeader>

          {offer.amenities.length > 0 && (
            <p className="mt-3 text-[13px] text-ink-soft">
              {offer.amenities.join(" · ")}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between border-y border-line py-4 text-[13.5px] text-ink-soft">
            <span>{formatDateLabel(checkIn)} → {formatDateLabel(checkOut)}</span>
            <span>
              {nights} night{nights > 1 ? "s" : ""} · {guests} guest{guests > 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between text-[14px] text-ink-soft">
            <span>
              {formatPrice(offer.pricePerNight, offer.currency)} × {nights} night
              {nights > 1 ? "s" : ""}
            </span>
            <span className="text-[19px] text-ink">{formatPrice(total, offer.currency)}</span>
          </div>

          <div className="mt-6">
            {status === "authenticated" ? (
              <>
                <Button
                  className="w-full bg-ink text-paper hover:bg-teal"
                  disabled={state === "submitting"}
                  onClick={handleConfirm}
                >
                  {state === "submitting" ? "Redirecting to checkout…" : "Confirm & pay"}
                </Button>
                {state === "error" && (
                  <p className="mt-2 text-[12.5px] text-red-700">{errorMessage}</p>
                )}
              </>
            ) : (
              <Button
                className="w-full bg-ink text-paper hover:bg-teal"
                onClick={() => openModal("login")}
              >
                Log in to book
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
