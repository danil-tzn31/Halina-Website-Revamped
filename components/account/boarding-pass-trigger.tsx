"use client";

import { Ticket } from "lucide-react";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BoardingPassCard, type BoardingPassData } from "@/components/booking/boarding-pass-card";

// Lets you reopen a past booking's boarding pass from My Bookings, reusing
// the same self-contained BoardingPassCard shown on /booking/success.
//
// Kept as its own Client Component (rather than converting BookingCard)
// since only the Dialog needs to opt out of being a Server Component.
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
        {/* Radix requires a Dialog title for screen readers; visually
            hidden since the pass itself makes the content obvious. */}
        <DialogTitle className="sr-only">Boarding pass</DialogTitle>
        <BoardingPassCard booking={boardingPass} />
      </DialogContent>
    </Dialog>
  );
}
