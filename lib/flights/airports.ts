// Not an autocomplete API — just enough of a shortlist (major Philippine
// airports + common international ones) to back a <datalist>, so typing
// "Manila" or "MNL" both work without building a full airport-search
// feature for a capstone project. A real product would call an airport
// lookup API here instead.
//
// `domestic: true` marks Philippine airports specifically (not just "not
// international") — google-flights-provider.ts uses this to decide when a
// sanity check on flight duration makes sense (see isDomesticRoute below
// and the "Day 3, revisited" section of HOW-IT-WORKS.md for why).
export const AIRPORTS: Array<{ code: string; city: string; domestic: boolean }> = [
  { code: "MNL", city: "Manila", domestic: true },
  { code: "CEB", city: "Cebu", domestic: true },
  { code: "DVO", city: "Davao", domestic: true },
  { code: "ILO", city: "Iloilo", domestic: true },
  { code: "PPS", city: "Puerto Princesa (Palawan)", domestic: true },
  { code: "KLO", city: "Kalibo (Boracay)", domestic: true },
  { code: "TAG", city: "Tagbilaran (Bohol)", domestic: true },
  { code: "IAO", city: "Siargao", domestic: true },
  { code: "USU", city: "Busuanga (Coron)", domestic: true },
  { code: "LAO", city: "Laoag (Vigan)", domestic: true },
  // 12 more added in Halina-Revamp-Plan.md section 49, alongside the 27 new
  // destinations in lib/destinations/data.ts — every nearestAirport code a
  // destination uses needs an entry here too, not just for the search bar's
  // autocomplete but because isDomesticRoute() below only flags a route for
  // the flight-duration sanity check (section 14) when both airports are in
  // this list. An unlisted PH code would silently skip that check.
  { code: "ENI", city: "El Nido (Palawan)", domestic: true },
  { code: "WNP", city: "Naga (Camarines Sur)", domestic: true },
  { code: "CRK", city: "Clark (Pampanga)", domestic: true },
  { code: "BSO", city: "Basco (Batanes)", domestic: true },
  { code: "DRP", city: "Bicol (Legazpi/Daraga)", domestic: true },
  { code: "ZAM", city: "Zamboanga", domestic: true },
  { code: "GES", city: "General Santos", domestic: true },
  { code: "BXU", city: "Butuan", domestic: true },
  { code: "CGY", city: "Cagayan de Oro (Laguindingan)", domestic: true },
  { code: "BCD", city: "Bacolod", domestic: true },
  { code: "DGT", city: "Dumaguete (Sibulan)", domestic: true },
  { code: "TAC", city: "Tacloban", domestic: true },
  { code: "SIN", city: "Singapore", domestic: false },
  { code: "HKG", city: "Hong Kong", domestic: false },
  { code: "NRT", city: "Tokyo Narita", domestic: false },
  { code: "ICN", city: "Seoul Incheon", domestic: false },
  { code: "SFO", city: "San Francisco", domestic: false },
];

const DOMESTIC_AIRPORT_CODES = new Set(
  AIRPORTS.filter((a) => a.domestic).map((a) => a.code)
);

// True only when both ends of the route are Philippine airports — used to
// scope the "this duration is obviously bad data" sanity check to routes
// where an unrealistic duration is actually detectable (a long-haul
// international flight legitimately takes 12+ hours; a domestic
// Manila-Cebu flight does not, no matter how many stops it has).
export function isDomesticRoute(from: string, to: string): boolean {
  return DOMESTIC_AIRPORT_CODES.has(from) && DOMESTIC_AIRPORT_CODES.has(to);
}

export function findAirportCode(input: string): string {
  const trimmed = input.trim();
  const directMatch = AIRPORTS.find(
    (a) => a.code.toLowerCase() === trimmed.toLowerCase()
  );
  if (directMatch) return directMatch.code;

  const cityMatch = AIRPORTS.find((a) =>
    trimmed.toLowerCase().includes(a.city.toLowerCase().split(" ")[0].toLowerCase())
  );
  return cityMatch ? cityMatch.code : trimmed.toUpperCase();
}

// The reverse of findAirportCode: given a code that's already been
// validated (e.g. one that just came back out of a URL's ?from=MNL), show
// it the same way the search bar's own AirportField does — "City (CODE)" —
// instead of a bare three-letter code. Used to pre-fill the search bar with
// the current search when it's embedded on the /flights results page (see
// search-bar.tsx's `mode="results"`), so the field shows "Manila (MNL)"
// rather than just "MNL". Falls back to the raw code for anything not in
// this shortlist, same fallback AirportField's typing already tolerates.
export function findAirportLabel(code: string): string {
  const match = AIRPORTS.find((a) => a.code.toLowerCase() === code.trim().toLowerCase());
  return match ? `${match.city} (${match.code})` : code;
}
