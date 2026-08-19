// Shared between the search bar (client-side "no past dates" UI) and the
// search validators (server-side backup check). On the client, `new Date()`
// reads the visitor's own clock/timezone, matching what a native
// `<input type="date">` considers "today". On the server it reads the
// server's clock (UTC on Vercel) — good enough here, but a visitor far from
// UTC could see a same-day booking rejected a few hours early right around
// their own midnight. A production system would pick one explicit source
// of truth instead of leaving that mismatch implicit.
export function todayISODate(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Adds `days` to a "YYYY-MM-DD" string, used for "day after check-in" in the
// hotel search bar. Parses the pieces manually instead of
// `new Date("YYYY-MM-DD")`, which parses as UTC midnight and can shift the
// date back a day once formatted in a timezone behind UTC.
export function addDaysISO(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return todayISODate(date);
}
