"use client";

import { useEffect, useRef, useState } from "react";
import { Plane, Download, Share2 } from "lucide-react";
import { toPng } from "html-to-image";

import { BookingPrice } from "@/components/account/booking-price";
import { formatDateLabel } from "@/lib/flights/format";
import { AIRPORTS } from "@/lib/flights/airports";

// The second half of the standout-feature request (Halina-Revamp-Plan.md
// section 35/36) — a stylized, downloadable "boarding pass" version of a
// confirmed flight booking, shown on /booking/success once a booking is
// actually PAID. Flight-only: the boarding-pass metaphor (route codes,
// gate-style layout, tear-off stub) genuinely doesn't map onto a hotel
// stay, so hotel bookings keep the plain confirmation box that was already
// there — see app/booking/success/page.tsx for the type/status gate.
//
// Deliberately renders with no images inside it (icons are inline SVG via
// lucide-react, everything else is text/CSS) — html-to-image (the library
// that turns this DOM node into a downloadable PNG below) can fail or
// silently blank out cross-origin images unless the server sends the right
// CORS headers, which Unsplash's photo CDN doesn't guarantee. Keeping the
// captured card itself photo-free sidesteps that failure mode entirely
// instead of fighting it.
type FlightLegDetails = {
  airline?: string;
  flightNumber?: string;
};

export type BoardingPassData = {
  id: string;
  name: string; // "MNL → CEB" (one-way) or "MNL ⇄ CEB" (round trip)
  price: number;
  currency: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  guests: number;
  passengerName: string;
  fromCode: string;
  toCode: string;
  details: {
    tripType?: "one_way" | "round_trip";
    outbound?: FlightLegDetails;
    return?: FlightLegDetails;
  };
};

function cityFor(code: string): string | null {
  const match = AIRPORTS.find((a) => a.code === code);
  return match ? match.city : null;
}

export function BoardingPassCard({ booking }: { booking: BoardingPassData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "generating" | "error">("idle");
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    // Feature-detected in an effect, not at render time — `navigator`
    // doesn't exist during server rendering at all, so checking it while
    // this component first renders (before hydration) would either crash
    // or silently disagree between server and client. This is the same
    // "safe kind" of setState-in-effect the lint rule's own guidance
    // calls out — reading an external system (the browser's own
    // capabilities) once after mount, not something derivable from props
    // or state during render — already used the same way for
    // localStorage in lib/currency/currency-context.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShareFiles(
      typeof navigator !== "undefined" && !!navigator.share && !!navigator.canShare
    );
  }, []);

  const isRoundTrip = booking.details.tripType === "round_trip";
  // A real confirmation code, not an invented one — the last 8 characters
  // of the booking's own database id, uppercased. Short enough to read
  // like a real airline PNR, but it's not a separate fake value generated
  // just for this card; it traces back to the actual row.
  const confirmationCode = booking.id.slice(-8).toUpperCase();

  async function generateImage(): Promise<string | null> {
    if (!cardRef.current) return null;
    // pixelRatio: 2 renders at double resolution ("retina") so the
    // downloaded/shared file looks sharp on a phone screen, not just
    // matching whatever size the card happens to be on screen right now.
    //
    // `style: { margin: "0" }` looks redundant with the card's own
    // `mx-auto` class, but it isn't — it's the fix for a real bug found
    // while testing this. This card centers itself with `mx-auto`, which
    // Tailwind resolves to `margin-left/right: auto`. html-to-image clones
    // this node into an SVG sized to exactly the card's own width/height,
    // but the clone carries over the *computed* margin from the live page
    // (auto resolved to a fixed pixel value based on the live page's wider
    // surrounding layout, e.g. ~260px to center a 480px card in a 1000px
    // container) rather than re-resolving "auto" against the new, narrower
    // SVG frame. The result: every exported image came out shifted right
    // by that margin and cropped, even though the on-screen card looked
    // completely correct — confirmed by testing several other export
    // options first (no pixelRatio, explicit canvas dimensions) and
    // seeing the identical shift every time, which pointed at something
    // about the captured node itself rather than the export resolution.
    // Explicitly overriding the clone's margin to 0 stops it from
    // inheriting that stale centering offset.
    return toPng(cardRef.current, {
      pixelRatio: 2,
      backgroundColor: "#fbf3e7", // --paper — keeps the exported PNG's
      // corners solid instead of transparent, since a shared image with a
      // see-through background can look broken depending on where it lands.
      style: { margin: "0" },
    });
  }

  async function handleDownload() {
    setState("generating");
    try {
      const dataUrl = await generateImage();
      if (!dataUrl) throw new Error("card not ready");
      const link = document.createElement("a");
      link.download = `halina-boarding-pass-${confirmationCode}.png`;
      link.href = dataUrl;
      link.click();
      setState("idle");
    } catch {
      setState("error");
    }
  }

  async function handleShare() {
    setState("generating");
    try {
      const dataUrl = await generateImage();
      if (!dataUrl) throw new Error("card not ready");
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `halina-boarding-pass-${confirmationCode}.png`, {
        type: "image/png",
      });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Halina boarding pass" });
      }
      setState("idle");
    } catch (err) {
      // The person closing the native share sheet without picking
      // anything also rejects this promise (AbortError) — that's a
      // cancel, not a failure, so it shouldn't show an error message.
      if (err instanceof Error && err.name === "AbortError") {
        setState("idle");
      } else {
        setState("error");
      }
    }
  }

  return (
    <div className="mt-8 w-full">
      <div
        ref={cardRef}
        className="relative mx-auto w-full max-w-[480px] overflow-hidden border border-ink bg-paper-raised"
      >
        <div className="flex items-center justify-between border-b border-dashed border-line px-6 py-4">
          <span className="text-[13px] tracking-[0.02em] text-ink">HALINA</span>
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-soft">
            Boarding Pass
          </span>
        </div>

        <div className="px-6 pt-5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">Passenger</p>
          <p className="mt-1 text-[16px] text-ink">{booking.passengerName}</p>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-6">
          <RouteCode code={booking.fromCode} align="left" />
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-paper">
            <Plane className="h-3.5 w-3.5 rotate-90 text-ink-soft" strokeWidth={1.5} />
          </span>
          <RouteCode code={booking.toCode} align="right" />
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-dashed border-line px-6 py-5">
          <Field label="Date" value={formatDateLabel(booking.dateFrom)} />
          <Field label="Flight" value={flightLabel(booking.details.outbound)} />
          <Field label="Guests" value={String(booking.guests)} />
        </div>

        {isRoundTrip && booking.details.return && (
          <div className="border-t border-dashed border-line px-6 py-4 text-[12.5px] text-ink-soft">
            <span className="uppercase tracking-[0.1em] text-ink-soft/80">Return</span>{" "}
            {formatDateLabel(booking.dateTo)} · {flightLabel(booking.details.return)} ·{" "}
            {booking.toCode} → {booking.fromCode}
          </div>
        )}

        {/* The perforated "tear here" line between the main pass and its
            stub — two paper-colored circles cut into the border read as a
            punched-out notch, the same visual shorthand real ticket stubs
            use, without needing an actual image or SVG mask to fake it.
            Positioned with `translate-x` (a transform) rather than a
            negative `left`/`right` value — purely a preference for these
            two, not the fix for the export bug documented on
            `generateImage()` below (that turned out to be this card's own
            `mx-auto` centering, not these notches — an early, wrong guess
            about the cause is worth naming so it isn't mistaken for the
            real explanation later). */}
        <div className="relative border-t border-dashed border-ink/40">
          <span className="absolute left-0 top-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper" />
          <span className="absolute right-0 top-0 h-6 w-6 translate-x-1/2 -translate-y-1/2 rounded-full bg-paper" />
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">Confirmation</p>
            <p className="mt-1 text-[14px] tracking-[0.08em] text-ink">{confirmationCode}</p>
          </div>
          <Barcode />
          <p className="text-[15px] text-ink">
            <BookingPrice amount={booking.price} currency={booking.currency} />
          </p>
        </div>
      </div>

      {/* Deliberately outside the element `cardRef` points at, so these
          buttons themselves never end up baked into the exported image. */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={state === "generating"}
          className="inline-flex items-center gap-2 border border-ink px-5 py-2.5 text-[12.5px] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
          {state === "generating" ? "Preparing…" : "Download"}
        </button>
        {canShareFiles && (
          <button
            type="button"
            onClick={handleShare}
            disabled={state === "generating"}
            className="inline-flex items-center gap-2 border border-line px-5 py-2.5 text-[12.5px] uppercase tracking-[0.08em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            Share
          </button>
        )}
      </div>
      {state === "error" && (
        <p className="mt-2 text-center text-[12.5px] text-ink-soft">
          Couldn&apos;t generate the image — try again in a moment.
        </p>
      )}
    </div>
  );
}

function flightLabel(leg?: FlightLegDetails): string {
  if (!leg?.airline && !leg?.flightNumber) return "—";
  return [leg?.airline, leg?.flightNumber].filter(Boolean).join(" ");
}

function RouteCode({ code, align }: { code: string; align: "left" | "right" }) {
  const city = cityFor(code);
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="text-[34px] leading-none text-ink">{code}</p>
      {city && <p className="mt-1.5 text-[11.5px] text-ink-soft">{city}</p>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">{label}</p>
      <p className="mt-1 text-[13px] text-ink">{value}</p>
    </div>
  );
}

// A purely decorative barcode — fixed, evenly-spaced bars, not an actual
// encoded/scannable value. A real boarding pass's barcode encodes a PNR
// for a gate scanner to read; faking that here would present something as
// functional that isn't, so this is deliberately just a visual motif that
// reads as "ticket stub" at a glance — the same honesty standard already
// applied elsewhere in this project (no fabricated ratings, no invented
// API fields that were never actually confirmed in a real response).
function Barcode() {
  const widths = [2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1];
  return (
    <div className="flex h-8 items-stretch gap-[2px]" aria-hidden="true">
      {widths.map((w, i) => (
        <span key={i} className="bg-ink/70" style={{ width: `${w}px` }} />
      ))}
    </div>
  );
}
