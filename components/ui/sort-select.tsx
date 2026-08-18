"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// Rebuilt as a fully custom button + listbox, not a restyled native
// <select> — a real <select>'s closed-state text rendering (padding,
// alignment, and the space it internally reserves for its own dropdown
// arrow) isn't handled identically across browsers, and a custom chevron
// layered on top of it via `appearance-none` + absolute positioning can't
// be reliably kept clear of the text once that happens: this exact setup
// showed "Recommended" overlapping the chevron in Safari while looking
// correct in Chrome. Rather than chase the precise cause of one browser's
// internal <select> box model, this mirrors the fix already proven out
// twice elsewhere in this codebase for the identical category of bug — the
// search bar's airport fields (AirportField, in search-bar.tsx) replaced a
// native <datalist> the same way, for the same reason: once a native
// control's own rendering is the inconsistency, the durable fix is to stop
// relying on it visually and draw the control ourselves. Kept generic (typed
// on a string union via the caller) so both the flight and hotel results
// grids can each pass their own set of sort options through the same
// component instead of duplicating this markup twice.
export function SortSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Same outside-click-closes pattern as AirportField, for the same reason:
  // a dropdown that only closes on selection would still be open if someone
  // clicks elsewhere on the page instead.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = options.find((option) => option.value === value) ?? options[0];

  function pick(next: T) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-2 text-[12px] text-ink-soft">
      <span className="uppercase tracking-wide">Sort</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex cursor-pointer items-center gap-2 border border-line bg-paper-raised py-1.5 pl-3 pr-2.5 text-[13px] text-ink focus:outline-none"
      >
        <span className="whitespace-nowrap">{current?.label}</span>
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-30 mt-1 min-w-full border border-line bg-paper-raised shadow-[0_20px_40px_-20px_rgba(22,35,43,0.45)]"
        >
          {options.map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                onClick={() => pick(option.value)}
                className={cn(
                  "block w-full whitespace-nowrap px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-ink/5",
                  option.value === value ? "text-ink" : "text-ink-soft"
                )}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
