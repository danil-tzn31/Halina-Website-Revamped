// A tiny, standalone trial run for the planned AI natural-language trip
// search (Halina-Revamp-Plan.md, "Next step" / section 35's deferred idea).
// Before touching any real UI or API route, this just answers one question:
// does a real call to Gemini actually work, and does it come back as clean,
// usable JSON — not free-form text you'd have to parse by hand?
//
// This is a throwaway check, not part of the app itself — safe to delete
// once it's done its job (same pattern as the temporary preview routes used
// to verify My Bookings and the boarding pass, sections 28/36/37).
//
// Run it with:
//   node --env-file=.env.local scripts/test-gemini.mjs
//
// Needs GEMINI_API_KEY in .env.local first — get a free one (no credit
// card needed) at https://aistudio.google.com/apikey, then add a line like:
//   GEMINI_API_KEY=your-key-here
//
// A real gotcha, found by actually running this rather than trusting the
// first draft: Google retired the older "generateContent" call for new API
// keys sometime after this project's tools were last updated, in favor of a
// newer "Interactions API" (client.interactions.create(), not
// client.models.generateContent()) — a real, current API change, not a
// mistake in how this was written the first time. Confirmed against the
// actual @google/genai package's own type definitions (not just docs, since
// docs and this fast-moving API didn't always agree) before rewriting this.

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error(
    "Missing GEMINI_API_KEY. Add it to .env.local, then run again with:\n" +
      "  node --env-file=.env.local scripts/test-gemini.mjs"
  );
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Standing in for what a real visitor might eventually type into the
// planned search box. The real feature's whole job is turning a sentence
// like this into search filters the app can actually use.
const sampleQuery = "a relaxing beach trip for two on a budget, sometime next month";

// Deliberately reuses the exact same tag vocabulary lib/destinations/data.ts
// already uses (vibe/budget/groupFit — section 35) rather than inventing a
// new one, so a working result here is directly useful groundwork for the
// real feature, not just a generic "does this work at all" smoke test.
const schema = {
  type: "object",
  properties: {
    vibe: { type: "string", enum: ["beach", "adventure", "culture"] },
    budget: { type: "string", enum: ["budget", "mid", "splurge"] },
    groupFit: { type: "string", enum: ["solo", "partner", "group"] },
  },
  required: ["vibe", "budget", "groupFit"],
};

console.log(`Sending to Gemini: "${sampleQuery}"\n`);

const interaction = await ai.interactions.create({
  // gemini-3.6-flash is the current fast/cheap model as of this writing —
  // if this 404s again down the line the way gemini-2.5-flash just did,
  // that's this same kind of routine model-lineup change, not a sign
  // anything here is broken.
  model: "gemini-3.6-flash",
  input: `Extract trip preferences from this request: "${sampleQuery}"`,
  response_format: {
    type: "text",
    mime_type: "application/json",
    schema,
  },
});

console.log("Raw text Gemini sent back:");
console.log(interaction.output_text);

console.log("\nParsed as a real JS object:");
console.log(JSON.parse(interaction.output_text));
