// Not an autocomplete API — just enough of a shortlist (major Philippine
// airports + common international ones) to back a <datalist>, so typing
// "Manila" or "MNL" both work. A real product would call an airport
// lookup API instead.
//
// `domestic: true` marks Philippine airports specifically (not just "not
// international") — google-flights-provider.ts uses this to scope a
// sanity check on flight duration to domestic routes (see isDomesticRoute
// below).
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
  // Every nearestAirport code used in lib/destinations/data.ts needs an
  // entry here too — isDomesticRoute() below only flags a route for the
  // duration sanity check when both airports are in this list, so an
  // unlisted PH code would silently skip that check.
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

// True only when both ends of the route are Philippine airports — scopes
// the "this duration is obviously bad data" check to routes where an
// unrealistic duration is actually detectable (a long-haul international
// flight can legitimately take 12+ hours; a domestic one can't).
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

// Reverse of findAirportCode: formats a known code as "City (CODE)" for
// display, e.g. to pre-fill the search bar on the /flights results page.
// Falls back to the raw code if it's not in this shortlist.
export function findAirportLabel(code: string): string {
  const match = AIRPORTS.find((a) => a.code.toLowerCase() === code.trim().toLowerCase());
  return match ? `${match.city} (${match.code})` : code;
}
