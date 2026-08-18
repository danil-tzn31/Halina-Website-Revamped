// The live "Google Flights2" API's departure_airport.time / arrival_airport
// .time fields turned out to hold a non-zero-padded date+time string like
// "2026-8-15 22:05" — and that specific shape is where things got genuinely
// tricky: `new Date("2026-8-15 22:05")` parses to a valid date in Node
// (V8), which made this look fixed when tested here, but Safari's engine
// (JavaScriptCore) parses that same non-standard string as Invalid Date.
// In a Next.js app that's a real bug, not just a cosmetic inconsistency:
// the server renders the correct time using Node's answer, the browser
// hydrates using its own (different) answer, React sees the mismatch and
// throws the server's correct render away, and the page re-renders with
// the browser's "Time TBD" instead — so the bug only ever showed up for
// people actually using the site, never when checked from this sandbox.
//
// The fix is to stop asking `Date` to parse the surrounding date at all.
// This app only ever displays the time-of-day, not the date, so it's
// enough to pull the "HH:MM" (optionally with "AM"/"PM") straight out of
// the string with a regex and format it ourselves — plain arithmetic has
// no engine-to-engine differences to worry about. This also still handles
// an already-human-readable bare time like "6:35 AM" (in case some other
// response shape sends one), and a full ISO timestamp like
// "2026-08-14T06:35:00" (the regex just ignores everything but the
// HH:MM it finds).
const TIME_PATTERN = /(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/;

function extractTime(
  raw: string
): { hour24: number; minute: number } | null {
  const match = raw.match(TIME_PATTERN);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour > 23 || minute > 59) {
    return null;
  }
  const meridiem = match[3]?.toUpperCase();
  // No AM/PM marker means the source is already 24-hour (the confirmed
  // shape from the live API) — used as-is.
  let hour24 = hour;
  if (meridiem === "PM" && hour < 12) hour24 = hour + 12;
  if (meridiem === "AM" && hour === 12) hour24 = 0;
  return { hour24, minute };
}

// Small formatting helpers shared by the result card, the detail modal, and
// the full results page — kept in one place so a currency or time-format
// change doesn't need to be repeated in three components.
export function formatTime(iso: string): string {
  if (!iso) return "—";
  const extracted = extractTime(iso.trim());
  if (!extracted) return "—";
  const period = extracted.hour24 >= 12 ? "PM" : "AM";
  const hour12 = extracted.hour24 % 12 === 0 ? 12 : extracted.hour24 % 12;
  return `${hour12}:${String(extracted.minute).padStart(2, "0")} ${period}`;
}

// The live "Google Flights2" API can still leave a time field genuinely
// empty for a given result — a real data-completeness gap, not a format
// mismatch. formatTime() falls back to a bare "—" in that case, which reads
// as a rendering glitch rather than "this info just isn't available."
// Components use this helper to decide whether to show the real formatted
// time or a clearly-labelled "Time TBD" placeholder instead of a lone dash.
export function hasTime(iso?: string): boolean {
  if (!iso) return false;
  const trimmed = iso.trim();
  if (!trimmed) return false;
  return extractTime(trimmed) !== null;
}

export function formatDateLabel(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}
