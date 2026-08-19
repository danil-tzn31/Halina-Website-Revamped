import type { FlightOffer, FlightSearchParams } from "./types";

// Seeded fallback dataset, used when the real RapidAPI call fails or isn't
// configured. The Google Flights endpoint is an unofficial,
// reverse-engineered listing that can rate-limit or change shape without
// notice, so search falls back to this rather than showing a blank page.
// The UI marks these results clearly as sample data.
const AIRLINES: Array<{ name: string; code: string }> = [
  { name: "Philippine Airlines", code: "PR" },
  { name: "Cebu Pacific", code: "5J" },
  { name: "AirAsia Philippines", code: "Z2" },
];

function buildOffer(
  params: FlightSearchParams,
  index: number
): FlightOffer {
  const airline = AIRLINES[index % AIRLINES.length];
  const departHour = 6 + index * 3;
  const durationMinutes = 75 + index * 20;
  const arriveMinutesTotal = departHour * 60 + durationMinutes;
  const arriveHour = Math.floor(arriveMinutesTotal / 60) % 24;
  const arriveMinute = arriveMinutesTotal % 60;

  return {
    id: `mock-${index}`,
    price: 2450 + index * 380,
    currency: "PHP",
    durationText: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
    durationMinutes,
    stops: index % 3 === 0 ? 0 : 1,
    segments: [
      {
        airline: airline.name,
        airlineLogo: null,
        flightNumber: `${airline.code} ${100 + index}`,
        aircraft: "Airbus A320",
        departureAirportCode: params.from,
        departureTime: `${params.date}T${String(departHour).padStart(2, "0")}:00:00`,
        arrivalAirportCode: params.to,
        arrivalTime: `${params.date}T${String(arriveHour).padStart(2, "0")}:${String(
          arriveMinute
        ).padStart(2, "0")}:00`,
      },
    ],
  };
}

export function getMockFlightOffers(params: FlightSearchParams): FlightOffer[] {
  return Array.from({ length: 8 }, (_, i) => buildOffer(params, i));
}
