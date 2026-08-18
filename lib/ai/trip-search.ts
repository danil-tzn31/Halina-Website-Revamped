import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import type { QuizAnswers } from "@/lib/destinations/quiz";
import { todayISODate, addDaysISO } from "@/lib/date-utils";

// The real feature build on top of Halina-Revamp-Plan.md section 38's
// confirmed-working trial (scripts/test-gemini.mjs) — same call shape,
// same model, now wired into a real caller instead of a throwaway script.
//
// A lazy singleton, the exact same reasoning as lib/stripe.ts's
// getStripe(): `new GoogleGenAI({ apiKey })` needs GEMINI_API_KEY to
// already exist, so constructing it at module-load time (the moment
// anything imports this file) would throw before the env var is ever
// read — even for a request that has nothing to do with the AI search.
// Only the one route that actually needs this
// (app/api/ai-search/route.ts) pays that cost, and only once this
// function is actually called.
let client: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (client) return client;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set — add it to .env.local (see .env.example)."
    );
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

// Mirrors the exact same three categories lib/destinations/data.ts already
// defines (Vibe/Budget/GroupFit) — re-declared here as a Zod schema rather
// than trusted just because Gemini's response parsed as valid JSON. A
// response passing JSON.parse doesn't mean its *content* is trustworthy;
// this is the same "don't believe a live third-party response blindly"
// discipline already used for the flight/hotel/currency providers
// (sections 9, 13, 19) — just checking a classification instead of a price.
//
// `date` and `travelers` are new as of Halina-Revamp-Plan.md section 42 —
// the original version of this feature only extracted the three quiz-style
// tags above. `date` is a plain string here (not `z.string().nullable()`)
// because Gemini's structured-output schema (RESPONSE_SCHEMA below) doesn't
// need to model "no date" as a distinct JSON type: an empty string is the
// "the sentence didn't give me a real date" sentinel, checked for and
// turned into an actual `null` after parsing (see `toValidatedDate` below).
// Same idea for `travelers`: `0` means "not mentioned," not "zero people."
const extractionSchema = z.object({
  vibe: z.enum(["beach", "adventure", "culture"]),
  budget: z.enum(["budget", "mid", "splurge"]),
  group: z.enum(["solo", "partner", "group"]),
  date: z.string(),
  travelers: z.number().int().min(0).max(9),
});

// The JSON shape asked of Gemini itself — deliberately mirrors
// extractionSchema above, so a response that actually follows this schema
// should also pass that check. Keeping both (rather than trusting the
// requested schema alone) is what catches the rare case where a model
// doesn't perfectly honor a requested schema.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    // This description is a direct fix for a real, reported bug: a
    // sentence about mountain views got classified as "beach". The three
    // buckets below are the ONLY options that exist — there's no separate
    // mountain/nature category — and without an explicit description,
    // Gemini had no way to know that mountain/countryside scenery belongs
    // under "culture" (matching how lib/destinations/data.ts actually
    // tags Batad Rice Terraces, the one mountain destination this site
    // has), not under "beach". Spelling out what each bucket really means,
    // and explicitly forbidding "beach" as a default, is the fix.
    vibe: {
      type: "string",
      enum: ["beach", "adventure", "culture"],
      description:
        "\"beach\" = swimming, sand, island or coastal relaxation ONLY — " +
        "never use this as a default for something that isn't actually " +
        "about a beach or coast. \"adventure\" = surfing, diving, or " +
        "physically active outdoor trips, including strenuous " +
        "hiking/trekking. \"culture\" = historical towns, heritage sites, " +
        "and scenic sightseeing that isn't primarily physical activity — " +
        "this includes mountain views, rice terraces, and countryside " +
        "scenery, since there is no separate mountain/nature category. " +
        "Pick whichever of these three is the closest real fit; never " +
        "guess \"beach\" just because it's common.",
    },
    budget: {
      type: "string",
      enum: ["budget", "mid", "splurge"],
      description:
        "\"budget\" = affordable/backpacker. \"mid\" = a normal, " +
        "comfortable trip, and the right default when the sentence gives " +
        "no real signal either way. \"splurge\" = luxury/treat-yourself.",
    },
    group: {
      type: "string",
      enum: ["solo", "partner", "group"],
      description:
        "Who the trip is for: \"solo\" = traveling alone, \"partner\" = " +
        "two people (a couple or just two friends), \"group\" = three or " +
        "more (family or a group of friends).",
    },
    date: {
      type: "string",
      description:
        "The trip's start date as YYYY-MM-DD, computed from today's real " +
        "date (given below) and whatever the sentence says (\"next month\", " +
        "\"in two weeks\", \"August 20\"). Use an empty string if the " +
        "sentence gives no real date signal at all.",
    },
    travelers: {
      type: "integer",
      description:
        "How many people are traveling, as a plain number (e.g. \"for two\" " +
        "-> 2, \"a solo trip\" -> 1). Use 0 if the sentence gives no count.",
    },
  },
  required: ["vibe", "budget", "group", "date", "travelers"],
};

// What this module actually promises the rest of the app: the same three
// quiz tags as before, plus a best-effort date/travelers count that's
// already been range-checked against today's real date — never Gemini's
// raw, unvalidated numbers. `null` means "not confidently extracted," the
// same meaning `null` already has everywhere else in this codebase that
// distinguishes "no data" from "a real zero" (e.g. the hotel rating sort,
// section 21).
export type TripExtraction = QuizAnswers & {
  date: string | null;
  travelers: number | null;
};

// Turns Gemini's raw `date` string into either a real, sane date or `null`
// — never trusted as-is, the same "don't believe a live third-party
// response blindly" discipline as the rest of this file. Three ways a raw
// date gets rejected: it's the "not mentioned" empty-string sentinel, it
// doesn't even look like YYYY-MM-DD, or it isn't actually in the future.
// That last check reuses the exact rule the search bar itself enforces
// (Halina-Revamp-Plan.md section 31 — today counts as too late, not just
// yesterday): `lib/validators/flight-search.ts` and
// `lib/validators/hotel-search.ts` would reject a prefilled date that
// failed this same check, so there's no point ever handing one through.
// A generous but real upper bound (one year out) guards against a
// misfired classification landing on a wildly distant, clearly-wrong date.
function toValidatedDate(rawDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return null;
  const today = todayISODate();
  const oneYearOut = addDaysISO(today, 365);
  if (rawDate <= today || rawDate > oneYearOut) return null;
  return rawDate;
}

// Turns a free-text sentence like "a relaxing beach trip for two on a
// budget, sometime next month" into the same three answers a visitor would
// otherwise pick by clicking through the destination quiz
// (lib/destinations/quiz.ts), plus — as of section 42 — a best-effort date
// and traveler count, so the feature can do something the quiz genuinely
// can't: hand a visitor a real, mostly-filled-in flight/hotel search
// instead of just a destination suggestion. See Halina-Revamp-Plan.md
// section 42 for why this scope was added after the two features turned
// out to produce identical destination results otherwise.
//
// Returns null on ANY failure — a network problem, Gemini being down, a
// response that isn't valid JSON, or JSON that doesn't match the expected
// shape — rather than letting a bad response crash the request or silently
// coerce into a wrong-but-plausible answer. Every caller treats null as
// "couldn't understand that." Unlike the flight/hotel/currency providers,
// there's no seeded mock data to fall back to here — there's no honest
// "fake" classification for a sentence Gemini couldn't parse, so admitting
// it plainly is the only honest option. A failed/invalid `date` or
// `travelers` extraction specifically does NOT fail the whole request the
// same way, though — see the `toValidatedDate` call below, which quietly
// downgrades a bad date to `null` rather than treating "couldn't extract a
// date" as "couldn't understand the sentence at all."
export async function extractTripPreferences(
  sentence: string
): Promise<TripExtraction | null> {
  try {
    const ai = getGeminiClient();

    // Gemini has no built-in notion of "today" — it only knows what's in
    // the prompt — so today's real date is spelled out explicitly here.
    // Without this, a phrase like "next month" has nothing to be relative
    // to, and Gemini would have to guess at what "today" even is.
    const interaction = await ai.interactions.create({
      // If this ever 404s again the way the older gemini-2.5-flash call
      // did (Halina-Revamp-Plan.md section 38), that's the same kind of
      // routine model-lineup change on Google's side, not a sign this code
      // broke on its own — check the installed @google/genai package's own
      // type definitions for the current model list before assuming
      // otherwise.
      model: "gemini-3.6-flash",
      input:
        `Today's date is ${todayISODate()}. A traveler described their ` +
        `ideal trip like this: "${sentence}"\n\n` +
        "Classify it into exactly one option per category below — read " +
        "each field's own description carefully first, since the three " +
        "options per category are the ONLY ones that exist and some of " +
        "them cover more ground than their name alone suggests. Pick the " +
        "closest real fit even if the sentence doesn't mention a category " +
        "directly; do not default to the most common-sounding option. " +
        "Also extract a start date and traveler count if the sentence " +
        "gives enough signal to compute them — again, see each field's " +
        "own description for what counts as \"enough signal.\"",
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: RESPONSE_SCHEMA,
      },
    });

    if (!interaction.output_text) return null;

    const parsed = extractionSchema.safeParse(
      JSON.parse(interaction.output_text)
    );
    if (!parsed.success) return null;

    return {
      vibe: parsed.data.vibe,
      budget: parsed.data.budget,
      group: parsed.data.group,
      date: toValidatedDate(parsed.data.date),
      travelers:
        parsed.data.travelers >= 1 && parsed.data.travelers <= 9
          ? parsed.data.travelers
          : null,
    };
  } catch {
    // Deliberately swallows the real error rather than re-throwing —
    // matches every other external-provider adapter in this project
    // (lib/flights/google-flights-provider.ts,
    // lib/hotels/tripadvisor-provider.ts): a third-party outage here
    // should degrade this one feature gracefully, not take down the
    // request it's part of.
    return null;
  }
}
