import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import type { QuizAnswers } from "@/lib/destinations/quiz";
import { todayISODate, addDaysISO } from "@/lib/date-utils";

// Lazy singleton, same reasoning as lib/stripe.ts's getStripe():
// constructing GoogleGenAI at module-load time would throw before
// GEMINI_API_KEY is read, even for requests unrelated to AI search. Only
// app/api/ai-search/route.ts pays that cost, and only when called.
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

// Mirrors the Vibe/Budget/GroupFit categories from lib/destinations/data.ts,
// re-declared as a Zod schema rather than trusted just because Gemini's
// response parsed as valid JSON — passing JSON.parse doesn't mean the
// content is trustworthy.
//
// `date` is a plain string, not `z.string().nullable()`: an empty string is
// the "no date given" sentinel, converted to `null` after parsing (see
// `toValidatedDate` below). Same idea for `travelers`: `0` means "not
// mentioned," not "zero people."
const extractionSchema = z.object({
  vibe: z.enum(["beach", "adventure", "culture"]),
  budget: z.enum(["budget", "mid", "splurge"]),
  group: z.enum(["solo", "partner", "group"]),
  date: z.string(),
  travelers: z.number().int().min(0).max(9),
});

// The JSON shape requested from Gemini — mirrors extractionSchema above so
// a compliant response also passes that check, catching the rare case
// where the model doesn't fully honor the requested schema.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    // Spells out what each bucket means and explicitly forbids "beach" as
    // a default — without this, sentences about mountain views were
    // getting misclassified as "beach" since there's no separate
    // mountain/nature category.
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

// The same three quiz tags plus a best-effort date/travelers count that's
// already been range-checked, never Gemini's raw unvalidated numbers.
// `null` means "not confidently extracted."
export type TripExtraction = QuizAnswers & {
  date: string | null;
  travelers: number | null;
};

// Turns Gemini's raw `date` string into a real date or `null`. Rejected if
// it's the empty-string "not mentioned" sentinel, doesn't match
// YYYY-MM-DD, or isn't strictly in the future — same rule the search bar
// validators enforce, so there's no point handing through a date they'd
// reject anyway. The one-year upper bound guards against a misfired
// classification landing on a wildly distant date.
function toValidatedDate(rawDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return null;
  const today = todayISODate();
  const oneYearOut = addDaysISO(today, 365);
  if (rawDate <= today || rawDate > oneYearOut) return null;
  return rawDate;
}

// Turns a free-text sentence like "a relaxing beach trip for two on a
// budget, sometime next month" into the same three answers the destination
// quiz produces, plus a best-effort date and traveler count — letting this
// feature hand back a real, mostly-filled-in flight/hotel search instead of
// just a destination suggestion.
//
// Returns null on any failure (network, Gemini down, invalid JSON/shape)
// rather than crashing the request or coercing a wrong-but-plausible
// answer; every caller treats null as "couldn't understand that." There's
// no mock fallback here, unlike the flight/hotel/currency providers —
// there's no honest "fake" classification for an unparseable sentence. A
// bad `date`/`travelers` extraction alone doesn't fail the whole request,
// though — `toValidatedDate` downgrades a bad date to `null` instead.
export async function extractTripPreferences(
  sentence: string
): Promise<TripExtraction | null> {
  try {
    const ai = getGeminiClient();

    // Gemini has no built-in notion of "today", so it's spelled out
    // explicitly here — otherwise a phrase like "next month" has nothing
    // to be relative to.
    const interaction = await ai.interactions.create({
      // If this model name ever 404s, check the installed @google/genai
      // package's type definitions for the current model list — likely a
      // routine lineup change on Google's side, not a bug here.
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
    // Swallow the error rather than re-throw, same as the other
    // external-provider adapters — a third-party outage should degrade
    // this feature gracefully, not take down the request it's part of.
    return null;
  }
}
