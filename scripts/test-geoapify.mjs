// Round 3 of the live-destination-feed trial (Halina-Revamp-Plan.md,
// section 47's "Next step" discussion — see scripts/test-gemini.mjs,
// section 38, for the same de-risking pattern this follows).
//
// Round 1: confirmed the connection + Philippines-only scoping works, but
// broad categories pulled in a lot of noise (unnamed places, generic
// churches, plain town plazas).
// Round 2: narrower categories fixed the "unnamed"/"generic church" noise
// (Miag-ao Church, a real UNESCO site, showed up), but adventure results
// were ALL mountain peaks — diving/water-sports categories were in the
// query but never appeared in the results, maybe crowded out by mountains
// filling the result limit first rather than actually being empty. Round 2
// also found that some places carry a real `wiki_and_media.wikidata` link
// (a genuine "this is a documented, real place" signal) and sometimes even
// a real crowd-tagged photo — but only by calling the separate, slower
// Place Details endpoint one place at a time.
//
// This round checks three specific open questions:
//   1. Does `wiki_and_media` already show up in the plain places-search
//      response (Step 2 below), or only via the separate, slower Place
//      Details endpoint? This matters a lot for cost — checking hundreds
//      of places one at a time is a very different, much more expensive
//      design than getting it for free in the same request that lists them.
//   2. Querying diving/water-sports on their own (not mixed in with
//      mountain categories competing for the same result limit) — do real
//      results actually exist, or is this category genuinely thin in
//      Geoapify's Philippines data?
//   3. Across a real batch (not just one sample), what fraction of results
//      in each vibe bucket actually carry a `wikidata` link? That's the
//      number that determines whether "require wikidata" is a workable
//      quality filter or one that throws away almost everything.
//
// Run it with:
//   node --env-file=.env.local scripts/test-geoapify.mjs
//
// Needs GEOAPIFY_API_KEY in .env.local (same key as rounds 1-2).

const apiKey = process.env.GEOAPIFY_API_KEY;
if (!apiKey) {
  console.error(
    "Missing GEOAPIFY_API_KEY. Add it to .env.local, then run again with:\n" +
      "  node --env-file=.env.local scripts/test-geoapify.mjs"
  );
  process.exit(1);
}

async function getPhilippinesPlaceId() {
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", "Philippines");
  url.searchParams.set("type", "country");
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", apiKey);

  console.log("Step 1: resolving \"Philippines\" to a real place_id (Geocoding API)...");
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(`Geocoding lookup failed: ${res.status} ${res.statusText}\n${body}`);
  }

  const data = await res.json();
  const first = data.results?.[0];
  if (!first?.place_id) {
    throw new Error(`No place_id found in response: ${JSON.stringify(data).slice(0, 500)}`);
  }

  console.log(`  Resolved: ${first.formatted ?? "Philippines"} -> place_id ${first.place_id}\n`);
  return first.place_id;
}

// Diving/water-sports split out into its own group this time, so it isn't
// competing with mountain categories for the same result limit.
const CATEGORY_GROUPS = [
  { label: "beach", categories: "beach" },
  { label: "adventure: mountains", categories: "natural.mountain,natural.mountain.peak" },
  {
    label: "adventure: diving/water sports",
    categories: "commercial.outdoor_and_sport.diving,commercial.outdoor_and_sport.water_sports",
  },
  {
    label: "culture",
    categories:
      "heritage,heritage.unesco,tourism.sights.memorial,tourism.sights.castle,tourism.sights.archaeological_site,tourism.sights.place_of_worship.church,tourism.sights.place_of_worship.cathedral",
  },
];

async function fetchCategory({ label, categories }, placeId) {
  const url = new URL("https://api.geoapify.com/v2/places");
  url.searchParams.set("categories", categories);
  url.searchParams.set("filter", `place:${placeId}`);
  url.searchParams.set("limit", "30");
  url.searchParams.set("apiKey", apiKey);

  console.log(`=== ${label} (categories=${categories}) ===`);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    console.log(`  Request failed: ${res.status} ${res.statusText}`);
    console.log(`  Body: ${body.slice(0, 500)}\n`);
    return;
  }

  const data = await res.json();
  const features = data.features ?? [];
  const named = features.filter((f) => f.properties?.name);
  // The actual test for open question 1: is wiki_and_media already present
  // on properties returned by the plain places search, without a separate
  // Place Details call per place?
  const withWikidata = named.filter((f) => f.properties?.wiki_and_media?.wikidata);
  const withImage = named.filter(
    (f) => f.properties?.wiki_and_media?.image || f.properties?.wiki_and_media?.wikimedia_commons
  );

  console.log(
    `  ${features.length} total, ${named.length} named, ${withWikidata.length} have a wikidata link, ${withImage.length} have some kind of real image reference`
  );
  console.log(
    `  (checked directly on the places-search response itself — no separate Place Details call made)`
  );

  for (const f of named.slice(0, 8)) {
    const p = f.properties;
    const wd = p.wiki_and_media?.wikidata ? " [wikidata]" : "";
    const img = p.wiki_and_media?.image || p.wiki_and_media?.wikimedia_commons ? " [image]" : "";
    console.log(`  - ${p.name}${wd}${img} | ${p.city ?? p.state ?? ""}`);
  }
  console.log("");
}

const placeId = await getPhilippinesPlaceId();

console.log("Step 2: querying each category group, checking for wikidata/image directly on the search response...\n");
for (const group of CATEGORY_GROUPS) {
  await fetchCategory(group, placeId);
}

console.log(
  "Done. Look at: (1) did 'adventure: diving/water sports' return real results now that it's not " +
    "competing with mountains for the limit, (2) what fraction of each group has [wikidata] — that's " +
    "the real number for whether 'require wikidata' is a workable quality filter, (3) confirm whether " +
    "wikidata/image showed up WITHOUT a separate Place Details call (it should have, per the log line above)."
);
