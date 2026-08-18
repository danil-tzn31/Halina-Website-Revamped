import { z } from "zod";

import { todayISODate } from "@/lib/date-utils";

// Same backup-not-primary reasoning as lib/validators/flight-search.ts's
// date check — the search bar's own `min` attributes and live warning
// captions are the first line of defense; this catches a stale bookmarked
// link or a direct call to /api/hotels/search. Today itself is rejected
// too, not just a genuinely past check-in date — see search-bar.tsx's
// comment for why. Also added here for the first time: check-out actually
// has to be after check-in, which nothing checked before this pass — a
// same-day or backwards date range used to pass validation and just look
// wrong once real results came back.
export const hotelSearchSchema = z
  .object({
    destination: z.string().trim().min(2, "Enter a destination."),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date."),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date."),
    guests: z.coerce.number().int().min(1).max(9).default(2),
  })
  .refine((data) => data.checkIn > todayISODate(), {
    message: "Invalid input, try a later date.",
    path: ["checkIn"],
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Check-out must be after check-in.",
    path: ["checkOut"],
  });

export type HotelSearchInput = z.infer<typeof hotelSearchSchema>;
