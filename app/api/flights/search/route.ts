import { NextRequest, NextResponse } from "next/server";

import { flightSearchSchema } from "@/lib/validators/flight-search";
import { searchFlights } from "@/lib/flights/google-flights-provider";

// The server-side proxy that replaces the old site's direct-from-the-
// browser call to RapidAPI. The RAPIDAPI_GOOGLE_FLIGHTS_KEY env var is only
// ever read here, on the server — it's never sent to, or readable by, the
// browser, which fixes the exact vulnerability flagged in the revamp plan's
// audit (the old flights3.js had this key sitting in plain sight in
// client-side JS).
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
