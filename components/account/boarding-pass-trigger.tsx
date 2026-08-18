"use client";

import { Ticket } from "lucide-react";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BoardingPassCard, type BoardingPassData } from "@/components/booking/boarding-pass-card";

// Lets you come back to a past booking's boarding pass any time from My
// Bookings — until now it only ever showed once, right after checkout, on
// /booking/success (Halina-Revamp-Plan.md section 36). This reuses that
// exact same BoardingPassCard component with no changes to it at all: the
// card was already self-contained (it doesn't know or care what page or
// modal it's rendered inside), so opening it here needed nothing more than
// a Dialog wrapper around it.
//
// A tiny, separate Client Component rather than converting BookingCard
// itself — same reasoning as BookingPrice's own comment in
// booking-card.tsx: only the one part of the card that actually needs
// client-side interactivity (here, a Radix Dialog) should opt out of being
// a Server Component.
export function BoardingPassTrigger({ boardingPass }: { boardingPass: BoardingPassData }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 border-t border-line px-4 py-2.5 text-[12px] uppercase tracking-wide text-ink-soft transition-colors hover:bg-ink hover:text-paper"
        >
          <Ticket className="h-3.5 w-3.5" strokeWidth={1.75} />
          View boarding pass
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[560px] max-h-[90vh] overflow-y-auto gap-0 p-6">
        {/* Radix requires every Dialog to have a title for screen readers,
            but the pass itself already makes "what this is" obvious
            visually — an on-screen heading above it would just be
            redundant, so this one is visually hidden rather than dropped
            entirely. */}
        <DialogTitle className="sr-only">Boarding pass</DialogTitle>
        <BoardingPassCard booking={boardingPass} />
      </DialogContent>
    </Dialog>
  );
}
