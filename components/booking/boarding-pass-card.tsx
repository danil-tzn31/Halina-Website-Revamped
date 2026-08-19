"use client";

import { useEffect, useRef, useState } from "react";
import { Plane, Download, Share2 } from "lucide-react";
import { toPng } from "html-to-image";

import { BookingPrice } from "@/components/account/booking-price";
import { formatDateLabel } from "@/lib/flights/format";
import { AIRPORTS } from "@/lib/flights/airports";

// Stylized, downloadable "boarding pass" for a PAID flight booking, shown
// on /booking/success. Flight-only — the route/gate-layout metaphor
// doesn't map onto a hotel stay, so hotels keep the plain confirmation box.
//
// Deliberately photo-free (icons are inline SVG, everything else text/CSS)
// — html-to-image can fail or blank out cross-origin images without the
// right CORS headers, which Unsplash's CDN doesn't guarantee.
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
    // doesn't exist during server rendering, so checking it on first
    // render would crash or mismatch between server and client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShareFiles(
      typeof navigator !== "undefined" && !!navigator.share && !!navigator.canShare
    );
  }, []);

  const isRoundTrip = booking.details.tripType === "round_trip";
  // Last 8 chars of the booking's own id, uppercased — reads like a real
  // PNR without inventing a separate fake value.
  const confirmationCode = booking.id.slice(-8).toUpperCase();

  async function generateImage(): Promise<string | null> {
    if (!cardRef.current) return null;
    // pixelRatio: 2 for a sharp image on high-DPI screens.
    //
    // style: { margin: "0" } fixes a real bug: html-to-image clones this
    // node into an SVG sized to its own bounds, but carries over the
    // computed `mx-auto` margin from the live page's wider layout, which
    // shifts and crops the export. Zeroing it out avoids that.
    return toPng(cardRef.current, {
      pixelRatio: 2,
      backgroundColor: "#fbf3e7", // --paper — solid corners instead of transparent
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
      // Closing the native share sheet without picking anything rejects
      // with AbortError — that's a cancel, not a failure.
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

        {/* Perforated "tear here" line — two paper-colored circles cut
            into the border read as a punched notch, like a real ticket
            stub. */}
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

// Purely decorative — fixed, evenly-spaced bars, not an actual encoded
// value. A real barcode would encode a PNR for a gate scanner to read.
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
