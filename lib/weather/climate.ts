// Which months are usually drier, worked out from five years of real
// rainfall records (Open-Meteo's historical archive) instead of written by
// hand for each of the 38 destinations. The Philippines has two
// rainy-season patterns, the west coast vs. the Pacific side, so places get
// genuinely different answers.
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

// Five full years, fixed, so the result is stable and the cache can live
// for a long time.
const START = "2021-01-01";
const END = "2025-12-31";

// A month averaging under this much rain counts as one of the drier ones.
const DRY_MONTH_MM = 150;

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type Climate = {
  rainfall: number[]; // average mm per month, Jan..Dec
  best: boolean[]; // Jan..Dec
  summary: string; // e.g. "Dec – May"
  // True when no month is properly dry, so `best` is just the three
  // driest and the page says so instead of promising a dry season.
  wetAllYear: boolean;
};

type RawResponse = {
  daily?: { time?: string[]; precipitation_sum?: (number | null)[] };
};

export async function getClimate(lat: number, lng: number): Promise<Climate | null> {
  const query = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    start_date: START,
    end_date: END,
    daily: "precipitation_sum",
    timezone: "Asia/Manila",
  });

  try {
    const res = await fetch(`${ARCHIVE_URL}?${query}`, {
      // Past weather doesn't change, so this only needs fetching about once
      // a month per destination.
      next: { revalidate: 60 * 60 * 24 * 30 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json: RawResponse = await res.json();
    const times = json.daily?.time ?? [];
    const rain = json.daily?.precipitation_sum ?? [];
    if (times.length === 0) return null;

    // Total per month for each year, then averaged across the years.
    const totals = Array.from({ length: 12 }, () => 0);
    const yearsSeen = Array.from({ length: 12 }, () => new Set<string>());
    times.forEach((date, i) => {
      const value = rain[i];
      if (typeof value !== "number") return;
      const month = Number(date.slice(5, 7)) - 1;
      totals[month] += value;
      yearsSeen[month].add(date.slice(0, 4));
    });
    const rainfall = totals.map((total, m) =>
      yearsSeen[m].size ? Math.round(total / yearsSeen[m].size) : 0
    );

    // Months under the dry threshold. Some places, like the Pacific side
    // of Mindanao, are wet all year, so fall back to the three driest.
    let best = rainfall.map((mm) => mm < DRY_MONTH_MM);
    const wetAllYear = best.filter(Boolean).length < 3;
    if (wetAllYear) {
      const driest = [...rainfall.keys()].sort((a, b) => rainfall[a] - rainfall[b]).slice(0, 3);
      best = rainfall.map((_, m) => driest.includes(m));
    }

    return { rainfall, best, summary: summarizeMonths(best), wetAllYear };
  } catch (error) {
    console.error("[climate] rainfall history unavailable:", error);
    return null;
  }
}

// [Jan..Dec] flags → "Dec – May" or "Jan – Apr, Nov". Runs wrap around the
// new year, since dry seasons here usually do.
function summarizeMonths(flags: boolean[]): string {
  if (flags.every(Boolean)) return "All year";
  // Start scanning just after a non-best month so a Dec–Jan run isn't split.
  const start = (flags.findIndex((f) => !f) + 1) % 12;
  const runs: [number, number][] = [];
  for (let k = 0; k < 12; k++) {
    const m = (start + k) % 12;
    if (!flags[m]) continue;
    const last = runs[runs.length - 1];
    if (last && (last[1] + 1) % 12 === m) last[1] = m;
    else runs.push([m, m]);
  }
  return runs
    .sort((a, b) => a[0] - b[0])
    .map(([a, b]) => (a === b ? MONTH_LABELS[a] : `${MONTH_LABELS[a]} – ${MONTH_LABELS[b]}`))
    .join(", ");
}
