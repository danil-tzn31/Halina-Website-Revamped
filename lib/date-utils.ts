// Small date helpers shared between the search bar (client-side, for the
// "you can't pick a past date" UI) and the search validators (server-side,
// as a backup check — see lib/validators/flight-search.ts and
// lib/validators/hotel-search.ts). Kept here instead of duplicated in both
// places, the same reasoning as the shared sort utilities in lib/flights/sort.ts.
//
// Both sides call the exact same function, but it deliberately means
// something slightly different depending on where it runs: on the client
// (inside a browser), `new Date()` reads the visitor's own system clock and
// timezone — exactly what a native `<input type="date">` itself considers
// "today", which is why the client-side check and the browser's own date
// picker never disagree. On the server, `new Date()` reads the server's
// clock (UTC, on Vercel) — a reasonable stand-in for "today" and good
// enough for this project's purposes, but worth being upfront about the
// edge case it doesn't handle: a visitor a long way from UTC could, right
// around their own midnight, have a same-day booking rejected by the
// server as "already passed" a few hours early (or the reverse). A real
// production system usually resolves this by picking one explicit rule
// (e.g. "always trust the server's clock") rather than leaving it as an
// implicit mismatch — flagged here rather than silently assumed away.
export function todayISODate(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Adds `days` to a "YYYY-MM-DD" string and returns the result in the same
// format — used to compute "the day after check-in" for the hotel search
// bar's check-out field. Parses the pieces manually (rather than
// `new Date("YYYY-MM-DD")`) to avoid that string being interpreted as UTC
// midnight, which can silently shift a date backward by a day once
// formatted back out in a timezone behind UTC.
export function addDaysISO(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return todayISODate(date);
}
