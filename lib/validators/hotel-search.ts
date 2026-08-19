import { z } from "zod";

import { todayISODate } from "@/lib/date-utils";

// Same backup-not-primary reasoning as flight-search.ts's date check — the
// search bar's own `min` attributes are the first line of defense; this
// catches a stale bookmarked link or a direct API call. Today itself is
// rejected too, not just past check-in dates. Check-out must also be
// after check-in.
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
