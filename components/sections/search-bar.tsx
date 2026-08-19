"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIRPORTS, findAirportCode } from "@/lib/flights/airports";
import { useResultsTransition } from "@/components/sections/results-transition";
import { todayISODate, addDaysISO } from "@/lib/date-utils";
import type { TripType } from "@/lib/flights/types";

type Tab = "flights" | "hotels";

export function SearchBar({
  // "home" navigates to `/#search-results` for the homepage carousel.
  // "results" is used when embedded on /flights or /hotels — routes
  // straight to the matching results page and uses dark-on-light label
  // colors instead of the light-on-photo homepage styling.
  mode = "home",
  initialTab,
  initialFrom,
  initialTo,
  initialDepart,
  initialReturn,
  initialTripType,
  initialAdults,
  initialDestination,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
}: {
  mode?: "home" | "results";
  initialTab?: Tab;
  initialFrom?: string;
  initialTo?: string;
  initialDepart?: string;
  initialReturn?: string;
  initialTripType?: TripType;
  initialAdults?: number;
  initialDestination?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
} = {}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "flights");
  const [tripType, setTripType] = useState<TripType>(initialTripType ?? "one_way");
  const [fromValue, setFromValue] = useState(initialFrom ?? "");
  const [toValue, setToValue] = useState(initialTo ?? "");
  const [adults, setAdults] = useState(initialAdults ?? 1);
  const [guests, setGuests] = useState(initialGuests ?? 2);
  const router = useRouter();
  const isResultsMode = mode === "results";
  // `null` in "home" mode — there's no ResultsPageShell around the
  // homepage's search bar.
  const resultsTransition = useResultsTransition();

  // Controlled state (not defaultValue) so warning captions and dynamic
  // `min` can read the current value while typing.
  const [departValue, setDepartValue] = useState(initialDepart ?? "");
  const [returnValue, setReturnValue] = useState(initialReturn ?? "");
  const [checkInValue, setCheckInValue] = useState(initialCheckIn ?? "");
  const [checkOutValue, setCheckOutValue] = useState(initialCheckOut ?? "");

  // Today is excluded as a selectable date — same-day searches mostly hit
  // fallback/mock results, which reads as broken. Recomputed every render
  // since the page can stay open across midnight.
  const today = todayISODate();
  const minSelectableDate = addDaysISO(today, 1);
  const returnMin = departValue || minSelectableDate;
  const checkOutMin = checkInValue ? addDaysISO(checkInValue, 1) : minSelectableDate;

  const INVALID_DATE_MESSAGE = "Invalid input, try a later date.";

  const departError =
    departValue && departValue < minSelectableDate ? INVALID_DATE_MESSAGE : undefined;
  const returnError = !returnValue
    ? undefined
    : returnValue < returnMin
      ? departValue
        ? "Return must be on or after departure."
        : INVALID_DATE_MESSAGE
      : undefined;
  const checkInError =
    checkInValue && checkInValue < minSelectableDate ? INVALID_DATE_MESSAGE : undefined;
  const checkOutError = !checkOutValue
    ? undefined
    : checkOutValue < checkOutMin
      ? checkInValue
        ? "Check-out must be after check-in."
        : INVALID_DATE_MESSAGE
      : undefined;

  // Only checks the currently-visible tab's fields, so a stale invalid
  // hotel date can't block a flights search and vice versa.
  const hasBlockingDateError =
    tab === "hotels"
      ? Boolean(checkInError || checkOutError)
      : Boolean(departError || (tripType === "round_trip" && returnError));

  function handleSwap() {
    setFromValue(toValue);
    setToValue(fromValue);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Button disabled state doesn't stop Enter-key submission — this is
    // the actual guard.
    if (hasBlockingDateError) return;
    const formData = new FormData(e.currentTarget);
    const entries = Object.fromEntries(formData.entries()) as Record<string, string>;

    // Routes to whichever tab is currently selected, not necessarily the
    // page this search bar started on (e.g. switching to Hotels while on
    // /flights should land on /hotels).
    if (isResultsMode) {
      let url: string;
      if (tab === "flights") {
        const params = new URLSearchParams({
          from: findAirportCode(entries.from ?? ""),
          to: findAirportCode(entries.to ?? ""),
          date: entries.depart ?? "",
          adults: String(adults),
          tripType,
        });
        if (tripType === "round_trip") {
          params.set("returnDate", entries.return ?? "");
        }
        url = `/flights?${params.toString()}`;
      } else {
        const params = new URLSearchParams({
          destination: entries.destination ?? "",
          checkIn: entries.checkIn ?? "",
          checkOut: entries.checkOut ?? "",
          guests: String(guests),
        });
        url = `/hotels?${params.toString()}`;
      }
      // Routed through startNavigation so the results area shows a skeleton
      // instead of leaving stale results on screen; falls back to a plain
      // push if there's no ResultsPageShell around this bar.
      if (resultsTransition) {
        resultsTransition.startNavigation(() => router.push(url));
      } else {
        router.push(url);
      }
      return;
    }

    const params = new URLSearchParams({ type: tab });
    if (tab === "flights") {
      params.set("from", findAirportCode(entries.from ?? ""));
      params.set("to", findAirportCode(entries.to ?? ""));
      params.set("date", entries.depart ?? "");
      params.set("adults", String(adults));
      params.set("tripType", tripType);
      if (tripType === "round_trip") {
        params.set("returnDate", entries.return ?? "");
      }
    } else {
      params.set("destination", entries.destination ?? "");
      params.set("checkIn", entries.checkIn ?? "");
      params.set("checkOut", entries.checkOut ?? "");
      params.set("guests", String(guests));
    }
    router.push(`/?${params.toString()}#search-results`);
  }

  return (
    <div className={isResultsMode ? "" : "mt-8"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex gap-6 text-[13px] tracking-wide">
          {(["flights", "hotels"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={cn("border-b-2 pb-2 capitalize transition-colors",
                tab === t
                  ? isResultsMode ? "border-ink text-ink" : "border-paper text-paper"
                  : isResultsMode ? "border-transparent text-ink-soft hover:text-ink" : "border-transparent text-paper/55 hover:text-paper/80")}>
              {t}
            </button>
          ))}
        </div>
        {tab === "flights" && (
          <div className="flex gap-4 text-[12px] tracking-wide">
            {([{ value: "one_way", label: "One way" }, { value: "round_trip", label: "Round trip" }] as const).map((option) => (
              <button key={option.value} type="button" onClick={() => setTripType(option.value)}
                className={cn("border-b pb-1 transition-colors",
                  tripType === option.value
                    ? isResultsMode ? "border-ink text-ink" : "border-paper text-paper"
                    : isResultsMode ? "border-transparent text-ink-soft hover:text-ink" : "border-transparent text-paper/55 hover:text-paper/80")}>
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Each field is a flex item with a `grow` weight (inline style,
        since Tailwind's JIT can't pick up a dynamic `flex-[1.3]` class) so
        the bar's overall shape stays constant across tabs/trip types —
        only the internal dividers shift. Fixed-width fields (swap button,
        counters) opt out via `fixedWidth`. */}
      <form onSubmit={handleSubmit}
        className={cn("mt-3 flex flex-col border border-line bg-paper-raised sm:flex-row sm:items-stretch",
          // Homepage's heavier shadow lifts the bar off the photo
          // background; results pages use the lighter ink-tinted shadow
          // used elsewhere for plain-background elevation.
          isResultsMode ? "shadow-[0_20px_40px_-24px_rgba(22,35,43,0.35)]" : "shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]")}>
        {tab === "hotels" ? (
          <>
            <Field name="destination" label="Destination" placeholder="Where to — e.g. Siargao" defaultValue={initialDestination} grow={1.4} minWidth="10rem" />
            <Field name="checkIn" label="Check in" type="date" grow={1} value={checkInValue} onChange={setCheckInValue} min={minSelectableDate} error={checkInError} />
            <Field name="checkOut" label="Check out" type="date" grow={1} value={checkOutValue} onChange={setCheckOutValue} min={checkOutMin} error={checkOutError} />
            <NumberField name="guests" label="Guests" value={guests} onChange={setGuests} min={1} max={9} fixedWidth="7.5rem" />
          </>
        ) : (
          <>
            <AirportField name="from" label="From" placeholder="Manila (MNL)" value={fromValue} onChange={setFromValue} grow={1.15} />
            <div className="flex shrink-0 items-center justify-center border-b border-line px-2 py-2 sm:w-14 sm:border-b-0 sm:border-r sm:py-0">
              <button type="button" onClick={handleSwap} aria-label="Swap origin and destination" title="Swap origin and destination"
                className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink">
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            </div>
            <AirportField name="to" label="To" placeholder="Cebu (CEB)" value={toValue} onChange={setToValue} grow={1.15} />
            <Field name="depart" label="Depart" type="date" grow={0.85} value={departValue} onChange={setDepartValue} min={minSelectableDate} error={departError} />
            {tripType === "round_trip" && <Field name="return" label="Return" type="date" grow={0.85} value={returnValue} onChange={setReturnValue} min={returnMin} error={returnError} />}
            <NumberField name="adults" label="Adults" value={adults} onChange={setAdults} min={1} max={9} fixedWidth="7.5rem" />
          </>
        )}
        <button
          type="submit"
          disabled={hasBlockingDateError}
          title={hasBlockingDateError ? "Fix the date above before searching." : undefined}
          className={cn(
            "shrink-0 bg-ink px-8 py-4 text-[12.5px] uppercase tracking-[0.08em] text-paper transition-colors sm:py-0",
            hasBlockingDateError ? "cursor-not-allowed opacity-40" : "hover:bg-teal"
          )}
        >
          Search
        </button>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  defaultValue,
  value,
  onChange,
  min,
  max,
  error,
  grow = 1,
  fixedWidth,
  minWidth,
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  /** For a date field, a "YYYY-MM-DD" string — the same format the native
   * date input already uses internally, so it can be passed straight
   * through as the HTML `min`/`max` attribute without any conversion. */
  min?: string;
  max?: string;
  /** A short warning shown under the field, e.g. "This date has already
   * passed." — used by the date fields below; nothing else passes this. */
  error?: string;
  /** Relative share of the row's leftover width this field grows to fill,
   * relative to the other growing fields (ignored when fixedWidth is set). */
  grow?: number;
  /** Opts this field out of growing — it stays exactly this wide instead,
   * e.g. the adults/guests counter, which doesn't need to stretch. */
  fixedWidth?: string;
  /** Override the default minWidth floor — see the comment above the
   * <form> for why some fields need more than the default. */
  minWidth?: string;
}) {
  // Date inputs need a wider floor than text fields — the browser clips
  // "mm/dd/yyyy" + calendar icon instead of wrapping it if squeezed too
  // narrow in a crowded round-trip row.
  const resolvedMinWidth = minWidth ?? (type === "date" ? "8.5rem" : "8rem");

  return (
    <label
      // `relative` is for the error caption, positioned `absolute` so a
      // validation message doesn't change this field's height and push
      // the row out of alignment with its neighbors.
      className="relative flex flex-col justify-center border-b border-line px-5 py-3.5 sm:border-b-0 sm:border-r sm:py-0"
      style={fixedWidth ? { flex: `0 0 ${fixedWidth}` } : { flexGrow: grow, flexBasis: 0, minWidth: resolvedMinWidth }}
    >
      <span className="block text-[11.5px] font-medium uppercase tracking-wider text-ink-soft">{label}</span>
      <input name={name} type={type} placeholder={placeholder}
        {...(onChange ? { value: value ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) } : { defaultValue })}
        min={min} max={max}
        aria-invalid={Boolean(error)}
        className="w-full min-w-0 border-0 bg-transparent p-0 pt-1 text-[14.5px] text-ink placeholder:text-ink-soft/50 focus:outline-none" />
      {error && (
        <span className="absolute inset-x-0 top-full z-20 mt-1 bg-paper-raised px-0.5 text-[10.5px] leading-tight text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

// Dedicated field for "From"/"To" instead of `<input list>` + `<datalist>`
// — the native dropdown is browser-drawn, doesn't match the site's design,
// and Safari's datalist support is inconsistent. A self-built dropdown
// behaves the same everywhere.
function AirportField({
  name,
  label,
  placeholder,
  value,
  onChange,
  grow,
}: {
  name: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  grow: number;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = value.trim().toLowerCase();
  const matches = (
    query
      ? AIRPORTS.filter(
          (a) => a.city.toLowerCase().includes(query) || a.code.toLowerCase().includes(query)
        )
      : AIRPORTS
  ).slice(0, 6);

  function pick(airport: { code: string; city: string }) {
    onChange(`${airport.city} (${airport.code})`);
    setOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col justify-center border-b border-line px-5 py-3.5 sm:border-b-0 sm:border-r sm:py-0"
      style={{ flexGrow: grow, flexBasis: 0, minWidth: "9.5rem" }}
    >
      <span className="block text-[11.5px] font-medium uppercase tracking-wider text-ink-soft">{label}</span>
      <input
        name={name}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full min-w-0 border-0 bg-transparent p-0 pt-1 text-[14.5px] text-ink placeholder:text-ink-soft/50 focus:outline-none"
      />
      {open && matches.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto border border-line bg-paper-raised shadow-[0_20px_40px_-20px_rgba(22,35,43,0.45)]">
          {matches.map((airport) => (
            <li key={airport.code}>
              <button
                type="button"
                // Fires before the input's blur would otherwise close the
                // dropdown and swallow the click — a standard combobox
                // pattern, not specific to this component.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(airport)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[13.5px] text-ink transition-colors hover:bg-ink/5"
              >
                <span className="truncate">{airport.city}</span>
                <span className="shrink-0 text-[12px] tracking-wide text-ink-soft">{airport.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Guests/adults counter with custom +/- steppers instead of the browser's
// native number-input spinner, which looks inconsistent across OSes and
// collided with the field border in a crowded row. Still a real
// `<input type="number">` underneath (validates, submits via FormData,
// shows a numeric keypad on mobile) — only the native spin buttons are
// hidden.
function NumberField({
  name,
  label,
  value,
  onChange,
  min,
  max,
  fixedWidth,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  fixedWidth: string;
}) {
  function step(delta: number) {
    onChange(Math.min(max, Math.max(min, value + delta)));
  }

  return (
    <div
      className="flex items-center gap-1 border-b border-line px-5 py-3.5 sm:border-b-0 sm:border-r sm:py-0"
      style={{ flex: `0 0 ${fixedWidth}` }}
    >
      <label className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="block text-[11.5px] font-medium uppercase tracking-wider text-ink-soft">{label}</span>
        <input
          name={name}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (!Number.isNaN(next)) onChange(next);
          }}
          className="w-full min-w-0 border-0 bg-transparent p-0 pt-1 text-[14.5px] text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </label>
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => step(1)}
          disabled={value >= max}
          className="text-ink-soft transition-colors hover:text-ink disabled:opacity-30"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={() => step(-1)}
          disabled={value <= min}
          className="text-ink-soft transition-colors hover:text-ink disabled:opacity-30"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
