import { NextResponse } from "next/server";

import { extractTripPreferences } from "@/lib/ai/trip-search";
import { aiSearchSchema } from "@/lib/validators/ai-search";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// The real feature build on top of Halina-Revamp-Plan.md section 38's
// confirmed-working Gemini trial — turns a free-text sentence into the
// same three answers a visitor could otherwise pick by hand in
// components/destinations/trip-finder-modal.tsx's quick-select buttons,
// having Gemini extract them from a sentence instead. Also extracts a
// best-effort date and traveler count (section 42).
//
// As of section 43, this route hands back the RAW extracted answers
// (vibe/budget/group/date/travelers), not pre-computed destination
// matches — matchDestinations() moved to being called client-side, inside
// trip-finder-modal.tsx, once a visitor has seen and possibly corrected
// the AI's guess. Computing matches here against an answer the visitor
// might immediately overwrite would just be wasted work the client throws
// away — see section 43 in the plan doc for the full reasoning (this used
// to also do the matching, before the AI's answer became editable).
export async function POST(request: Request) {
  // A public, unauthenticated route calling a metered (though free) third-
  // party API is worth protecting from being hammered — reuses the exact
  // same in-memory limiter already built for login/signup (section 31)
  // rather than inventing a second one. 10 per minute per IP is generous
  // for a real visitor trying a few phrasings, but blocks a script from
  // burning through Gemini's daily free-tier quota. See lib/rate-limit.ts
  // for this limiter's real-world caveats (in-memory, single-instance).
  const ipLimit = checkRateLimit(`ai-search:ip:${getClientIp(request)}`, {
    max: 10,
    windowMs: 60 * 1000,
  });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = aiSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const preferences = await extractTripPreferences(parsed.data.query);

  // null means Gemini failed, timed out, or returned something that
  // didn't parse into a trustworthy answer — the honest response here is
  // "couldn't understand that," not a guess dressed up as a real answer.
  // Returned as a normal 200 (not an error status) since this is an
  // expected, handled outcome, not something broken — the same "isFallback"
  // shape already used by the exchange-rates route (section 19). The UI
  // treats this exactly like a visitor who never typed anything at all:
  // the quick-select buttons just stay unselected, ready to be clicked by
  // hand — there's no dead-end error screen for this route to justify.
  if (!preferences) {
    return NextResponse.json({
      understood: false,
      vibe: null,
      budget: null,
      group: null,
      date: null,
      travelers: null,
    });
  }

  // Already validated inside extractTripPreferences (vibe/budget/group are
  // real enum values or the whole thing would already be null; date/
  // travelers are range-checked against today's real date) — this route
  // trusts them as-is and just relays them, rather than re-checking.
  return NextResponse.json({
    understood: true,
    vibe: preferences.vibe,
    budget: preferences.budget,
    group: preferences.group,
    date: preferences.date,
    travelers: preferences.travelers,
  });
}
