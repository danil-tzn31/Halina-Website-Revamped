import { z } from "zod";

// What the booking modal sends to POST /api/bookings. Kept generic
// (FLIGHT/HOTEL) so one route and schema serve both instead of
// duplicating this per booking type.
export const createBookingSchema = z.object({
  type: z.enum(["FLIGHT", "HOTEL"]),
  name: z.string().min(1),
  price: z.number().positive(),
  currency: z.string().min(1).max(6),
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
  guests: z.coerce.number().int().min(1).max(9).default(1),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
