import { z } from "zod";

import { todayISODate } from "@/lib/date-utils";

// Shared between the client (validating the search form before it ever
// calls the API) and the API route (which never trusts a client-supplied
// query string, same rule as the auth schemas).
//
// Deliberately one-way-only: this validates a single leg (see
// lib/flights/types.ts for why a "round trip" is two calls against this
// same one-way shape, not one combined request with its own schema).
export const flightSearchSchema = z.object({
  from: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter airport code, e.g. MNL."),
  to: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter airport code, e.g. CEB."),
  // The past-date check here is a backup, not the primary defense — the
  // search bar itself (search-bar.tsx) already stops you from picking a
  // bad date via its `min` attribute and a live warning caption. This
  // catches everything that UI can't: a bookmarked or shared link built
  // from an old search, or a direct call to /api/flights/search. Today
  // itself is rejected too, not just genuinely past dates — see
  // search-bar.tsx's comment on why this is stricter than a typical real
  // booking site for this project specifically.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
    .refine((date) => date > todayISODate(), "Invalid input, try a later date."),
  adults: z.coerce.number().int().min(1).max(9).default(1),
});

export type FlightSearchInput = z.infer<typeof flightSearchSchema>;

// Separate, client-side-only schema for the search *form* (as opposed to
// the schema above, which validates one /api/flights/search request). The
// form also collects tripType/returnDate so the results UI knows whether
// to run one search or two — see components/sections/flight-search-results.tsx.
export const tripDetailsSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date."),
    returnDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
      .optional(),
    tripType: z.enum(["one_way", "round_trip"]).default("one_way"),
  })
  .refine((data) => data.tripType === "one_way" || Boolean(data.returnDate), {
    message: "Return date is required for round trips.",
    path: ["returnDate"],
  })
  .refine(
    (data) =>
      data.tripType === "one_way" ||
      !data.returnDate ||
      data.returnDate >= data.date,
    {
      message: "Return date must be on or after the departure date.",
      path: ["returnDate"],
    }
  );
