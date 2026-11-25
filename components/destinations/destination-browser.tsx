"use client";

import { useMemo, useState } from "react";

import {
  DestinationGrid,
  SEE_ALL_BENTO_SPAN_PATTERN,
} from "@/components/destinations/destination-grid";
import type { Budget, Destination, Vibe } from "@/lib/destinations/data";

const VIBE_OPTIONS: { value: Vibe; label: string }[] = [
  { value: "beach", label: "Beach" },
  { value: "adventure", label: "Adventure" },
  { value: "culture", label: "Culture" },
];
const BUDGET_OPTIONS: { value: Budget; label: string }[] = [
  { value: "budget", label: "Budget-friendly" },
  { value: "mid", label: "Mid-range" },
  { value: "splurge", label: "Splurge" },
];

// The /destinations grid with two rows of filter chips above it. Uses the
// vibe and budget tags every destination already has. Picking a chip again
// turns it off.
export function DestinationBrowser({ destinations }: { destinations: Destination[] }) {
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);

  const shown = useMemo(
    () =>
      destinations.filter(
        (d) => (!vibe || d.vibes.includes(vibe)) && (!budget || d.budget === budget)
      ),
    [destinations, vibe, budget]
  );
  const isFiltered = vibe !== null || budget !== null;

  // How many places each chip would show, given the other row's choice,
  // so a chip that leads to nothing is easy to spot.
  const countFor = (v: Vibe | null, b: Budget | null) =>
    destinations.filter((d) => (!v || d.vibes.includes(v)) && (!b || d.budget === b)).length;

  return (
    <div>
      <div className="mt-8 flex flex-col gap-3">
        <ChipRow label="Type of trip">
          {VIBE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              count={countFor(option.value, budget)}
              active={vibe === option.value}
              onClick={() => setVibe(vibe === option.value ? null : option.value)}
            />
          ))}
        </ChipRow>
        <ChipRow label="Budget">
          {BUDGET_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              count={countFor(vibe, option.value)}
              active={budget === option.value}
              onClick={() => setBudget(budget === option.value ? null : option.value)}
            />
          ))}
        </ChipRow>
      </div>

      <p className="mt-6 text-[13.5px] text-ink-soft" aria-live="polite">
        {isFiltered ? (
          <>
            Showing {shown.length} of {destinations.length}.{" "}
            <button
              type="button"
              onClick={() => {
                setVibe(null);
                setBudget(null);
              }}
              className="text-ink underline underline-offset-4"
            >
              Clear filters
            </button>
          </>
        ) : (
          <>{destinations.length} places across the Philippines, worth building a trip around.</>
        )}
      </p>

      {shown.length === 0 ? (
        <p className="mt-8 text-[14px] text-ink-soft">
          Nothing matches both of those yet. Try a different budget or type of trip.
        </p>
      ) : (
        <DestinationGrid
          destinations={shown}
          className="mt-6"
          pattern={SEE_ALL_BENTO_SPAN_PATTERN}
        />
      )}
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-full shrink-0 text-[11.5px] uppercase tracking-[0.12em] text-ink-soft sm:mr-2 sm:w-[96px]">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={count === 0 && !active}
      className={
        "border px-3 py-1.5 text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
        (active
          ? "border-ink bg-ink text-paper"
          : "border-line text-ink hover:border-ink")
      }
    >
      {label} <span className={active ? "text-paper/70" : "text-ink-soft"}>{count}</span>
    </button>
  );
}
