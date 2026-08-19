import { NextRequest, NextResponse } from "next/server";

import { flightSearchSchema } from "@/lib/validators/flight-search";
import { searchFlights } from "@/lib/flights/google-flights-provider";

// Server-side proxy replacing the old site's direct-from-browser RapidAPI
// call. RAPIDAPI_GOOGLE_FLIGHTS_KEY is only ever read here — the old
// flights3.js had this key exposed in client-side JS.
export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = flightSearchSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search parameters", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await searchFlights(parsed.data);
  return NextResponse.json(result);
}
