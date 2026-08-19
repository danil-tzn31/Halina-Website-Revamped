"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Plane, PlaneLanding, PlaneTakeoff } from "lucide-react";

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
import { formatDateLabel, formatTime, hasTime } from "@/lib/flights/format";
import type { FlightOffer } from "@/lib/flights/types";
import { rememberPendingCheckout } from "@/components/booking/checkout-abandon-watcher";

// "Click a result → modal with full details + booking form" rather than a
// /booking/[id] page. Confirming creates a PENDING booking via
// POST /api/bookings, then starts a Stripe Checkout session via
// POST /api/checkout and redirects with window.location.href (a full-page
// nav, since Stripe's page isn't part of this app). The booking is only
// marked PAID later, by Stripe's webhook — never by this modal.
//
// `returnOffer` is only passed once a round trip's return leg is picked
// (see RoundTripFlightPicker); a one-way booking falls back to the
// single-leg layout when it's absent.
export function FlightDetailModal({
  offer,
  returnOffer,
  guests,
  date,
  returnDate,
  onClose,
}: {
  offer: FlightOffer | null;
  returnOffer?: FlightOffer | null;
  guests: number;
  date: string;
  /** Only set for a round trip's return leg — used for the booking's dateTo
   * instead of re-using the departure date. */
  returnDate?: string;
  onClose: () => void;
}) {
  const { status } = useSession();
  const { openModal } = useAuthModal();
  const { formatPrice } = useCurrency();
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!offer) return null;
  const firstLeg = offer.segments[0];
  const lastLeg = offer.segments[offer.segments.length - 1];
  const returnFirstLeg = returnOffer?.segments[0];
  const returnLastLeg = returnOffer?.segments[returnOffer.segments.length - 1];
  const perPersonTotal = offer.price + (returnOffer?.price ?? 0);
  const total = perPersonTotal * guests;

  async function handleConfirm() {
    setState("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FLIGHT",
          name: returnOffer
            ? `${firstLeg?.departureAirportCode} ⇄ ${lastLeg?.arrivalAirportCode}`
            : `${firstLeg?.departureAirportCode} → ${lastLeg?.arrivalAirportCode}`,
          price: total,
          currency: offer!.currency,
          dateFrom: date,
          dateTo: returnOffer && returnDate ? returnDate : date,
          guests,
          details: {
            tripType: returnOffer ? "round_trip" : "one_way",
            outbound: {
              airline: firstLeg?.airline,
              flightNumber: firstLeg?.flightNumber,
              durationText: offer!.durationText,
              stops: offer!.stops,
            },
            ...(returnOffer
              ? {
                  return: {
                    airline: returnFirstLeg?.airline,
                    flightNumber: returnFirstLeg?.flightNumber,
                    durationText: returnOffer.durationText,
                    stops: returnOffer.stops,
                  },
                }
              : {}),
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
        {/* Stand-in for a per-destination photo (not built yet) — an
            ink-gradient in the brand palette instead of a generic stock
            photo that wouldn't match the route. */}
        <div className="flex h-36 flex-col justify-end bg-gradient-to-br from-ink to-teal px-8 py-5 text-paper">
          <p className="text-[12px] uppercase tracking-[0.14em] text-paper/70">
            {returnOffer && returnDate
              ? `${formatDateLabel(date)} – ${formatDateLabel(returnDate)}`
              : formatDateLabel(date)}
          </p>
          <p className="text-2xl font-light">
            {firstLeg?.departureAirportCode}
            <span className="mx-2 text-paper/60">{returnOffer ? "⇄" : "→"}</span>
            {lastLeg?.arrivalAirportCode}
          </p>
        </div>

        <div className="px-8 py-7">
          <DialogHeader>
            <DialogTitle>
              {returnOffer ? "Round trip" : firstLeg?.airline}
            </DialogTitle>
            {!returnOffer && (
              <DialogDescription>
                {firstLeg?.flightNumber} · {firstLeg?.aircraft ?? "Aircraft unspecified"}
              </DialogDescription>
            )}
          </DialogHeader>

          {returnOffer && (
            <p className="mt-1 text-[12px] uppercase tracking-wide text-ink-soft">
              Departure
            </p>
          )}
          <FlightLegSummary
            departureAirportCode={firstLeg?.departureAirportCode}
            departureTime={firstLeg?.departureTime}
            arrivalAirportCode={lastLeg?.arrivalAirportCode}
            arrivalTime={lastLeg?.arrivalTime}
            durationText={offer.durationText}
            stops={offer.stops}
          />
          {returnOffer && (
            <p className="mt-1 text-[13px] text-ink-soft">
              {firstLeg?.airline} · {firstLeg?.flightNumber}
            </p>
          )}

          {returnOffer && (
            <>
              <p className="mt-5 text-[12px] uppercase tracking-wide text-ink-soft">
                Return
              </p>
              <FlightLegSummary
                departureAirportCode={returnFirstLeg?.departureAirportCode}
                departureTime={returnFirstLeg?.departureTime}
                arrivalAirportCode={returnLastLeg?.arrivalAirportCode}
                arrivalTime={returnLastLeg?.arrivalTime}
                durationText={returnOffer.durationText}
                stops={returnOffer.stops}
              />
              <p className="mt-1 text-[13px] text-ink-soft">
                {returnFirstLeg?.airline} · {returnFirstLeg?.flightNumber}
              </p>
            </>
          )}

          <div className="mt-5 flex items-center justify-between text-[14px] text-ink-soft">
            <span>
              {guests} {guests === 1 ? "adult" : "adults"} ·{" "}
              {formatPrice(perPersonTotal, offer.currency)} each
              {returnOffer ? " (both legs)" : ""}
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

// The departure-time/duration-stops/arrival-time row, factored out so the
// round-trip layout can render it twice (once per leg) without duplicating
// the JSX — the one-way layout still only ever renders it once.
function FlightLegSummary({
  departureAirportCode,
  departureTime,
  arrivalAirportCode,
  arrivalTime,
  durationText,
  stops,
}: {
  departureAirportCode?: string;
  departureTime?: string;
  arrivalAirportCode?: string;
  arrivalTime?: string;
  durationText: string;
  stops: number;
}) {
  const departureKnown = hasTime(departureTime);
  const arrivalKnown = hasTime(arrivalTime);

  return (
    // Same structure as flight-result-card.tsx: departure/arrival size to
    // their own content, divider absorbs the rest via flex-1.
    //
    // `w-full` works around Safari not reliably stretching a nested flex
    // child to its parent's full width.
    <div className="mt-2 flex w-full items-center gap-4 border-y border-line py-4">
      <div className="flex shrink-0 flex-col items-start gap-1.5">
        <p className="text-2xl text-ink">{departureAirportCode}</p>
        <p
          className={
            departureKnown
              ? "flex items-center gap-1 text-[13px] text-ink-soft"
              : "flex items-center gap-1 text-[13px] italic text-ink-soft/70"
          }
        >
          <PlaneTakeoff className="h-3 w-3 shrink-0" strokeWidth={1.75} />
          {departureKnown ? formatTime(departureTime ?? "") : "Time TBD"}
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center gap-1.5">
        <span className="whitespace-nowrap text-[12px] text-ink-soft">{durationText}</span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-paper">
          <Plane className="h-3 w-3 rotate-90 text-ink-soft" strokeWidth={1.75} />
        </span>
        <span className="whitespace-nowrap text-[11.5px] uppercase tracking-wide text-ink-soft">
          {stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
        <p className="text-2xl text-ink">{arrivalAirportCode}</p>
        <p
          className={
            arrivalKnown
              ? "flex flex-row-reverse items-center gap-1 text-[13px] text-ink-soft"
              : "flex flex-row-reverse items-center gap-1 text-[13px] italic text-ink-soft/70"
          }
        >
          <PlaneLanding className="h-3 w-3 shrink-0" strokeWidth={1.75} />
          {arrivalKnown ? formatTime(arrivalTime ?? "") : "Time TBD"}
        </p>
      </div>
    </div>
  );
}
