import { NextRequest, NextResponse } from "next/server";

import { hotelSearchSchema } from "@/lib/validators/hotel-search";
import { searchHotels } from "@/lib/hotels/tripadvisor-provider";

// Server-side proxy for hotel search, mirroring
// app/api/flights/search/route.ts exactly — the RapidAPI key for the
// hotel provider (HOTEL_API_KEY) is only ever read here, never sent to
// the browser.
export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = hotelSearchSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search parameters", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await searchHotels(parsed.data);
  return NextResponse.json(result);
}
