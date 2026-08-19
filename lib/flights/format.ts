// The live API's departure/arrival time fields come back as a
// non-zero-padded string like "2026-8-15 22:05". `new Date(...)` parses
// that fine in Node (V8), but Safari's JavaScriptCore treats it as Invalid
// Date — so the server renders a correct time, the browser hydrates with a
// different (invalid) one, React discards the server render, and the page
// flips to "Time TBD" client-side.
//
// Fix: never hand the raw string to `Date`. This app only displays
// time-of-day, so pull "HH:MM" (optionally with AM/PM) out with a regex
// and format it manually — no engine differences to worry about. Also
// handles an already-human "6:35 AM" and a full ISO timestamp like
// "2026-08-14T06:35:00" (the regex just grabs the HH:MM it finds).
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
  // No AM/PM marker means the source is already 24-hour — used as-is.
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

// The live API can leave a time field genuinely empty for a result — a
// data gap, not a format mismatch. formatTime() falls back to a bare "—"
// in that case, which reads like a rendering glitch. Components use this
// to decide whether to show the formatted time or a "Time TBD" placeholder.
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
