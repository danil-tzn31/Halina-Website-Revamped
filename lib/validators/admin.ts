import { z } from "zod";

// The one mutating action on the admin dashboard (app/account/admin/page.tsx
// and app/api/admin/bookings/[id]/status/route.ts) — everything else there
// is read-only, so this is the only admin-specific schema needed so far.
export const updateBookingStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "CANCELLED"]),
});

export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
