// Static, curated content — not API-driven. Unlike flights/hotels, "which
// destinations to feature" is an editorial choice a real travel site makes
// once and updates occasionally, not something that needs a live data
// source. Photos are hotlinked from Unsplash (same free-license approach as
// the hero photo), each one verified to actually depict the named place
// before being used here.
//
// vibe/budget/groupFit exist for exactly one consumer: the trip finder
// (components/destinations/trip-finder-modal.tsx, see Halina-Revamp-Plan.md
// section 35). They're a hand-judged editorial call, same spirit as
// everything else in this file — not derived from any real pricing or
// survey data, so they're deliberately coarse (three buckets, not a
// precise score) rather than dressed up as more rigorous than they are.
//
// `vibes` is a list, not a single value, as of section 51 — a real, honest
// fix for a real limitation: a lot of these destinations genuinely aren't
// just one thing (Coron is both a dive/adventure spot and, just as
// obviously, a beach one; Panglao is a beach with real whale-shark/dolphin
// adventure tourism attached; Siquijor is adventure with a real folklore/
// culture undercurrent). Every destination's `vibes` list was hand-judged
// against its own already-researched blurb/highlights above, not
// re-researched from scratch — about 40% of the 38 destinations here
// genuinely are just one vibe (Boracay is purely a beach, Vigan purely
// culture, Mt. Pulag purely adventure), and stayed single-tagged rather
// than padded out for the sake of it. A destination's *first* listed vibe
// is its strongest/most-defining one; order past that isn't meaningful.
export type Vibe = "beach" | "adventure" | "culture";
export type Budget = "budget" | "mid" | "splurge";
export type GroupFit = "solo" | "partner" | "group";

export type Destination = {
  slug: string;
  name: string;
  region: string;
  nearestAirport: string;
  blurb: string;
  highlights: string[];
  photo: string;
  // Optional CSS `object-position` value (e.g. "center 70%"). Only needed
  // when the default dead-center crop cuts a photo's actual subject off
  // awkwardly inside a small/near-square bento cell — most photos don't
  // need this and simply omit it, falling back to plain "center" in
  // DestinationCard. See Halina-Revamp-Plan.md section 56 for why this
  // exists and how to re-tune a value once you can see the real photo.
  photoPosition?: string;
  vibes: Vibe[];
  budget: Budget;
  groupFit: GroupFit[];
};

export const DESTINATIONS: Destination[] = [
  {
    slug: "boracay",
    name: "Boracay",
    region: "Aklan",
    nearestAirport: "KLO",
    blurb:
      "Powder-white sand and calm turquoise water — the Philippines' most famous beach, and still one of its best.",
    highlights: ["White Beach", "Island hopping", "Sunset sailing"],
    photo:
      "https://images.unsplash.com/photo-1594697797606-e79a612f0dec?w=1600&q=80&auto=format&fit=crop",
    vibes: ["beach"],
    budget: "mid",
    groupFit: ["partner", "group"],
  },
  {
    slug: "siargao",
    name: "Siargao",
    region: "Surigao del Norte",
    nearestAirport: "IAO",
    blurb:
      "The country's surfing capital — Cloud 9's barrels, palm-lined roads, and a laid-back island pace.",
    highlights: ["Cloud 9 surf break", "Island hopping", "Lagoon swimming"],
    photo:
      "https://images.unsplash.com/photo-1722704629854-ed679b4b81b4?w=1600&q=80&auto=format&fit=crop",
    // This is the wide Cloud 9 boardwalk/watchtower shot — a lot of open
    // sky and water around a narrower wooden structure. Dead-center
    // cropping it into the homepage's small square bento cell was cutting
    // it in a way that read as "incomplete." Biased down toward the
    // boardwalk/water instead of the sky above it. This is a best-effort
    // starting value, not a measured one — this sandbox can't load the
    // real photo to check pixel-for-pixel, so nudge it on your own machine
    // if it's still not quite right (higher % = crop shifts down, lower %
    // = crop shifts up).
    photoPosition: "center 68%",
    vibes: ["adventure", "beach"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "bohol",
    name: "Bohol",
    region: "Central Visayas",
    nearestAirport: "TAG",
    blurb:
      "Home to the otherworldly Chocolate Hills and some of the friendliest reefs for first-time divers.",
    highlights: ["Chocolate Hills", "Tarsier sanctuary", "Loboc River cruise"],
    photo:
      "https://images.unsplash.com/photo-1546068996-8da61faeceaa?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure", "culture"],
    budget: "mid",
    groupFit: ["group", "partner"],
  },
  {
    slug: "batad",
    name: "Batad Rice Terraces",
    region: "Ifugao",
    nearestAirport: "MNL",
    blurb:
      "Amphitheater-shaped rice terraces carved into the mountains over 2,000 years ago — reached by a scenic drive north from Manila.",
    highlights: ["Rice terrace trekking", "Tappiya Falls", "Ifugao villages"],
    photo:
      "https://images.unsplash.com/photo-1714746093192-05f2f075568d?w=1600&q=80&auto=format&fit=crop",
    vibes: ["culture", "adventure"],
    budget: "budget",
    groupFit: ["solo", "group"],
  },
  {
    slug: "coron",
    name: "Coron",
    region: "Palawan",
    nearestAirport: "USU",
    blurb:
      "Limestone cliffs, hidden lagoons, and some of the best wreck diving in the world.",
    highlights: ["Kayangan Lake", "Wreck diving", "Twin Lagoon"],
    photo:
      "https://images.unsplash.com/photo-1758782551890-0f47a570859c?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure", "beach"],
    budget: "splurge",
    groupFit: ["partner", "group"],
  },
  {
    slug: "vigan",
    name: "Vigan",
    region: "Ilocos Sur",
    nearestAirport: "LAO",
    blurb:
      "Cobblestone streets and Spanish-colonial houses along Calle Crisologo — one of the best-preserved old towns in Asia.",
    highlights: ["Calle Crisologo", "Kalesa rides", "Empanada tasting"],
    photo:
      "https://images.unsplash.com/photo-1656341158450-84fbc3659bab?w=1600&q=80&auto=format&fit=crop",
    vibes: ["culture"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  // Five more added in Halina-Revamp-Plan.md section 44, specifically so the
  // AI trip search and the quiz aren't limited to the original six spots —
  // a visitor describing mountain views or a volcano vista now has real
  // matches to land on beyond Batad. Same editorial bar as the original six:
  // every photo below is a real Unsplash photo, checked against its own
  // location tag (not just its filename or search-result context) before
  // being used here.
  {
    slug: "baguio",
    name: "Baguio",
    region: "Benguet",
    nearestAirport: "MNL",
    blurb:
      "The 'City of Pines' — cool mountain air, pine-covered ridgelines, and a laid-back highland pace a few hours north of Manila.",
    highlights: ["Session Road", "Burnham Park", "Mines View Park"],
    photo:
      "https://images.unsplash.com/photo-1704633112930-4d0e91db77e9?w=1600&q=80&auto=format&fit=crop",
    vibes: ["culture"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "tagaytay",
    name: "Tagaytay",
    region: "Cavite",
    nearestAirport: "MNL",
    blurb:
      "Ridge-top views of Taal Volcano rising out of its own lake, plus the cooler air and farm-to-table dining that make it a favorite Manila day trip.",
    highlights: ["Taal Volcano viewpoint", "Sky Ranch", "Farm-to-table dining"],
    photo:
      "https://images.unsplash.com/photo-1633670057397-b12fc5289e96?w=1600&q=80&auto=format&fit=crop",
    vibes: ["culture"],
    budget: "mid",
    groupFit: ["partner", "group"],
  },
  {
    slug: "sagada",
    name: "Sagada",
    region: "Mountain Province",
    nearestAirport: "MNL",
    blurb:
      "Centuries-old hanging coffins, cool pine forests, and cave systems deep enough to spend a whole day exploring underground.",
    highlights: ["Sumaguing Cave", "Hanging Coffins", "Kiltepan sunrise viewpoint"],
    photo:
      "https://images.unsplash.com/photo-1716863451342-f279ecac3d2b?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure", "culture"],
    budget: "budget",
    groupFit: ["solo", "group"],
  },
  {
    slug: "puerto-princesa",
    name: "Puerto Princesa",
    region: "Palawan",
    nearestAirport: "PPS",
    blurb:
      "Gateway to a UNESCO-listed underground river winding through limestone caves — plus quieter island-hopping than Palawan's more famous spots.",
    highlights: ["Underground River tour", "Honda Bay island hopping", "Iwahig firefly watching"],
    photo:
      "https://images.unsplash.com/photo-1660849259228-603fad947b89?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure", "beach"],
    budget: "mid",
    groupFit: ["partner", "group"],
  },
  {
    slug: "davao",
    name: "Davao",
    region: "Davao del Sur",
    nearestAirport: "DVO",
    blurb:
      "Home base for trekking the Philippines' tallest peak, Mt. Apo, and meeting rescued Philippine Eagles up close at the city's own eagle center.",
    highlights: ["Philippine Eagle Center", "Mt. Apo trekking", "Eden Nature Park"],
    photo:
      "https://images.unsplash.com/photo-1624685863152-4fa71a70d0c1?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure"],
    budget: "mid",
    groupFit: ["solo", "group"],
  },
  // 27 more added in Halina-Revamp-Plan.md section 49 — the first real batch
  // of the "tens, manually curated" scale-up you chose over the live-feed
  // approach (section 48's trial). Same editorial bar as every destination
  // above: every photo below was individually verified (via its own
  // Unsplash page's location tag/caption, not a keyword-search guess)
  // against the specific place it's meant to depict, and every
  // nearestAirport code was checked against real, currently-operating
  // scheduled service rather than assumed from geography alone — a few
  // destinations (Puerto Galera, Hundred Islands, Marinduque, Banaue) have
  // no truly nearby airport and use the honest, currently-real gateway
  // instead (the same pattern already used for Batad/Baguio/Sagada/Tagaytay
  // above, all of which point to MNL despite being reached by road). Four
  // real, well-documented destinations from the approved candidate list —
  // Buscalan, Corregidor Island, Donsol, and Cagayan de Oro — are
  // deliberately NOT included in this batch: real research turned up no
  // Unsplash photo that could be confidently verified as actually depicting
  // that specific place, and this project has never shipped an unverified
  // photo (section 11 already caught several mislabeled non-Philippines
  // photos the first time this was done). They're a real, open gap, not an
  // oversight — see the plan doc for how to close it.
  {
    slug: "el-nido",
    name: "El Nido",
    region: "Palawan",
    nearestAirport: "ENI",
    blurb:
      "Limestone karst towers rising from turquoise lagoons — the Bacuit archipelago's island-hopping circuit is the most dramatic seascape in the Philippines.",
    highlights: ["Bacuit archipelago", "Island hopping", "Hidden lagoons"],
    photo:
      "https://images.unsplash.com/photo-1695051702427-1c24ce3682e7?w=1600&q=80&auto=format&fit=crop",
    vibes: ["beach", "adventure"],
    budget: "mid",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "pagudpud",
    name: "Pagudpud",
    region: "Ilocos Norte",
    nearestAirport: "LAO",
    blurb:
      "Wide golden-sand beaches and wind-turbine-lined bluffs at the northern tip of Luzon, quieter and less developed than the Visayas beach towns.",
    highlights: ["Saud Beach", "Bangui windmills", "Blue Lagoon"],
    photo:
      "https://images.unsplash.com/photo-1684891591767-a6dd1640c49f?w=1600&q=80&auto=format&fit=crop",
    vibes: ["beach"],
    budget: "budget",
    groupFit: ["partner", "group"],
  },
  {
    slug: "puerto-galera",
    name: "Puerto Galera",
    region: "Oriental Mindoro",
    nearestAirport: "MNL",
    blurb:
      "A short ferry from Manila to some of Southeast Asia's richest reefs, where the diving is as much the draw as the beach.",
    highlights: ["Scuba diving", "White Beach", "Coral reefs"],
    photo:
      "https://images.unsplash.com/photo-1583309043239-a1b23d734ec2?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure", "beach"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "caramoan",
    name: "Caramoan",
    region: "Camarines Sur",
    nearestAirport: "WNP",
    blurb:
      "Coves and karst islets so cinematic that global reality-TV crews keep coming back, reached only by boat from a sleepy Bicol fishing town.",
    highlights: ["Matukad Island", "Hidden coves", "Island hopping"],
    photo:
      "https://images.unsplash.com/photo-1538531865110-acd4a3e0fec7?w=1600&q=80&auto=format&fit=crop",
    vibes: ["beach"],
    budget: "mid",
    groupFit: ["partner", "group"],
  },
  {
    slug: "hundred-islands",
    name: "Hundred Islands",
    region: "Pangasinan",
    nearestAirport: "CRK",
    blurb:
      "Scattered limestone islets in Lingayen Gulf, small enough to hop between by outrigger boat in a single low-key day trip.",
    highlights: ["124 limestone islands", "Island hopping", "Snorkeling coves"],
    photo:
      "https://images.unsplash.com/photo-1630550204366-e3a6ec3e80b0?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure", "beach"],
    budget: "budget",
    groupFit: ["partner", "group"],
  },
  {
    slug: "batanes",
    name: "Batanes",
    region: "Batanes",
    nearestAirport: "BSO",
    blurb:
      "Wind-swept rolling hills, stone Ivatan houses, and cliffside roads at the Philippines' northernmost, most weather-beaten edge.",
    highlights: ["Rolling hills", "Stone Ivatan houses", "Basco lighthouse"],
    photo:
      "https://images.unsplash.com/photo-1582625053958-fb011f611c54?w=1600&q=80&auto=format&fit=crop",
    vibes: ["culture"],
    budget: "splurge",
    groupFit: ["solo", "partner"],
  },
  {
    slug: "banaue",
    name: "Banaue",
    region: "Ifugao",
    nearestAirport: "MNL",
    blurb:
      "Stone-and-mud rice terraces climbing the Cordillera slopes above an Ifugao market town, carved by hand over more than a thousand years and still worked the same way today.",
    highlights: ["Banaue Viewpoint", "Rice terrace trekking", "Ifugao wood carving"],
    photo:
      "https://images.unsplash.com/photo-1714746093312-d4d4c1f79f07?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure", "culture"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "intramuros",
    name: "Intramuros",
    region: "Manila",
    nearestAirport: "MNL",
    blurb:
      "Thick 16th-century Spanish ramparts enclosing Fort Santiago, San Agustin Church, and cobblestone plazas at the walled heart of old Manila.",
    highlights: ["Fort Santiago", "San Agustin Church", "Kalesa rides"],
    photo:
      "https://images.unsplash.com/photo-1736122094944-da4deea774ab?w=1600&q=80&auto=format&fit=crop",
    vibes: ["culture"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "marinduque",
    name: "Marinduque",
    region: "Marinduque",
    nearestAirport: "MNL",
    blurb:
      "A heart-shaped island known for the Lenten Moriones Festival's mask-and-armor Roman-centurion street pageant, framed by the pale sands of Poctoy White Beach.",
    highlights: ["Moriones Festival", "Poctoy White Beach", "Balanacan viewpoint"],
    photo:
      "https://images.unsplash.com/photo-1650273305168-afba5072bf76?w=1600&q=80&auto=format&fit=crop",
    vibes: ["culture", "beach"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "mayon-volcano",
    name: "Mayon Volcano",
    region: "Albay",
    nearestAirport: "DRP",
    blurb:
      "The world's most perfectly conical volcano rises straight out of rice paddies, ringed by the ash-buried ruins of a 19th-century church tower.",
    highlights: ["Mayon's perfect cone", "Cagsawa Ruins", "ATV lava trail rides"],
    photo:
      "https://images.unsplash.com/photo-1555590858-be28a58c2688?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure", "culture"],
    budget: "mid",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "mt-pulag",
    name: "Mt. Pulag",
    region: "Benguet",
    nearestAirport: "MNL",
    blurb:
      "Luzon's third-highest peak rewards a pre-dawn scramble with a sea of clouds spilling across the summit's grassland ridges.",
    highlights: ["Sea of clouds summit", "Dwarf bonsai forest", "Ambangeg trail trek"],
    photo:
      "https://images.unsplash.com/photo-1633670425294-cbf6ce988408?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "cebu-city",
    name: "Cebu City",
    region: "Cebu",
    nearestAirport: "CEB",
    blurb:
      "Where the Spanish colonial era first touched the Philippines, layering centuries-old churches and a modern skyline against the Mactan Strait.",
    highlights: ["Magellan's Cross", "Basilica del Santo Nino", "Sirao Flower Garden"],
    photo:
      "https://images.unsplash.com/photo-1505261476952-32e25cbfc755?w=1600&q=80&auto=format&fit=crop",
    vibes: ["culture"],
    budget: "mid",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "moalboal",
    name: "Moalboal",
    region: "Cebu",
    nearestAirport: "CEB",
    blurb:
      "A short walk from the shore drops divers straight into a churning sardine run, with the turtle-friendly reefs of Pescador Island a banca ride away.",
    highlights: ["Sardine run diving", "Pescador Island reef", "Panagsama Beach turtles"],
    photo:
      "https://images.unsplash.com/photo-1697484373501-ed80ff8cca5d?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure", "beach"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "oslob",
    name: "Oslob",
    region: "Cebu",
    nearestAirport: "CEB",
    blurb:
      "Whale sharks glide within arm's reach of outrigger boats each morning, just off a coastline better known a generation ago for tuna fishing.",
    highlights: ["Whale shark encounters", "Tumalog Falls", "Sumilon Island sandbar"],
    photo:
      "https://images.unsplash.com/photo-1544475367-110b8b227bfe?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure", "beach"],
    budget: "mid",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "bantayan-island",
    name: "Bantayan Island",
    region: "Cebu",
    nearestAirport: "CEB",
    blurb:
      "Powder-white sand and a laid-back fishing-town pace make this ferry-only island north of Cebu a favorite escape from the mainland's crowds.",
    highlights: ["Sugar Beach", "Ogtong Cave pool", "Virgin Island sandbar"],
    photo:
      "https://images.unsplash.com/photo-1742965635343-d8949a669935?w=1600&q=80&auto=format&fit=crop",
    vibes: ["beach"],
    budget: "mid",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "dumaguete-apo-island",
    name: "Dumaguete & Apo Island",
    region: "Negros Oriental",
    nearestAirport: "DGT",
    blurb:
      "A laid-back university town on Rizal Boulevard that's also the jump-off point for Apo Island, where green sea turtles graze the reef just meters from shore.",
    highlights: ["Rizal Boulevard", "Apo Island snorkeling", "Sea turtle sightings"],
    photo:
      "https://images.unsplash.com/photo-1519101739220-83f6a14852ca?w=1600&q=80&auto=format&fit=crop",
    vibes: ["beach", "adventure"],
    budget: "mid",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "iloilo-city",
    name: "Iloilo City",
    region: "Iloilo",
    nearestAirport: "ILO",
    blurb:
      "Calle Real's restored art-deco facades and Molo's silver Gothic church anchor a heritage downtown built on sugar money and now known for batchoy.",
    highlights: ["Calle Real heritage strip", "Molo Church", "Batchoy tasting"],
    photo:
      "https://images.unsplash.com/photo-1687303969295-a14be0fd0757?w=1600&q=80&auto=format&fit=crop",
    vibes: ["culture"],
    budget: "mid",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "guimaras",
    name: "Guimaras",
    region: "Guimaras",
    nearestAirport: "ILO",
    blurb:
      "Ortiz Wharf's short pumpboat ride lands you among the world's sweetest mangoes, quiet coves, and the hilltop Trappist Monastery.",
    highlights: ["Mango orchard tours", "Trappist Monastery", "Alubihod Beach"],
    photo:
      "https://images.unsplash.com/photo-1650823498531-9c2ac6a7f56c?w=1600&q=80&auto=format&fit=crop",
    vibes: ["beach", "culture"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "bacolod",
    name: "Bacolod",
    region: "Negros Occidental",
    nearestAirport: "BCD",
    blurb:
      "The ivy-covered shell of a fire-gutted 1920s sugar mansion, known simply as The Ruins, headlines a city that turns its plaza into a smiling mask parade every October.",
    highlights: ["The Ruins mansion", "MassKara Festival", "Chicken inasal"],
    photo:
      "https://images.unsplash.com/photo-1509850629763-f55dbe6a607e?w=1600&q=80&auto=format&fit=crop",
    vibes: ["culture"],
    budget: "mid",
    groupFit: ["partner", "group"],
  },
  {
    slug: "siquijor",
    name: "Siquijor",
    region: "Siquijor",
    nearestAirport: "DGT",
    blurb:
      "Century-old balete trees, waterfalls, and a lingering reputation for folk healers and witchcraft give this small island a mystique the ferry-hop from Dumaguete only deepens.",
    highlights: ["Cambugahay Falls", "Salagdoong Beach cliff jump", "Old balete tree"],
    photo:
      "https://images.unsplash.com/photo-1766863676031-efcb3f3a1087?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure", "culture"],
    budget: "budget",
    groupFit: ["solo", "partner"],
  },
  {
    slug: "limasawa",
    name: "Limasawa",
    region: "Southern Leyte",
    nearestAirport: "TAC",
    blurb:
      "A modest cross on a quiet hilltop marks the spot where, by the Pigafetta account, the first Catholic Mass on Philippine soil was said in 1521.",
    highlights: ["First Mass shrine", "Historical marker", "Padre Burgos boat ride"],
    photo:
      "https://images.unsplash.com/photo-1633578909342-bde6cb412130?w=1600&q=80&auto=format&fit=crop",
    vibes: ["culture"],
    budget: "budget",
    groupFit: ["solo", "partner"],
  },
  {
    slug: "panglao",
    name: "Panglao",
    region: "Bohol",
    nearestAirport: "TAG",
    blurb:
      "Alona Beach's white sand and the nearby Chocolate Hills day trip make this the easiest full-package island stop in the Visayas.",
    highlights: ["Alona Beach", "Whale shark and dolphin watching", "Chocolate Hills day trip"],
    photo:
      "https://images.unsplash.com/photo-1558260963-fd8436b4be0a?w=1600&q=80&auto=format&fit=crop",
    vibes: ["beach", "adventure"],
    budget: "mid",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "camiguin",
    name: "Camiguin",
    region: "Camiguin",
    nearestAirport: "CGY",
    blurb:
      "A small island built by seven volcanoes, where you can snorkel over a sunken cemetery from an 1871 eruption and wade out to a sandbar that disappears with the tide.",
    highlights: ["White Island sandbar", "Sunken Cemetery", "Katibawasan Falls"],
    photo:
      "https://images.unsplash.com/photo-1551521021-d929e606badc?w=1600&q=80&auto=format&fit=crop",
    vibes: ["beach", "adventure"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "samal-island",
    name: "Samal Island",
    region: "Davao del Norte",
    nearestAirport: "DVO",
    blurb:
      "A short banca ride from Davao City, Samal pairs white-sand coves with Monfort Bat Cave, home to the world's largest single colony of Geoffroy's rousette fruit bats.",
    highlights: ["Monfort Bat Cave", "Hagimit Falls", "Island-hopping beaches"],
    photo:
      "https://images.unsplash.com/photo-1615402340283-f11440fbbbd3?w=1600&q=80&auto=format&fit=crop",
    vibes: ["beach", "adventure"],
    budget: "mid",
    groupFit: ["partner", "group"],
  },
  {
    slug: "zamboanga-city",
    name: "Zamboanga City",
    region: "Zamboanga del Sur",
    nearestAirport: "ZAM",
    blurb:
      'The "City of Flowers" blends Spanish-colonial Fort Pilar and a distinct Chavacano-speaking Moro culture with a boat ride out to the pink sand of Great Santa Cruz Island.',
    highlights: ["Fort Pilar", "Great Santa Cruz Island", "Vinta boat rides"],
    photo:
      "https://images.unsplash.com/photo-1579427091504-50dfd15c44b0?w=1600&q=80&auto=format&fit=crop",
    vibes: ["culture", "beach"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "lake-sebu",
    name: "Lake Sebu",
    region: "South Cotabato",
    nearestAirport: "GES",
    blurb:
      "Zipline out over the water to reach a cluster of seven waterfalls, then meet the T'boli women who still hand-weave t'nalak cloth from patterns they say come to them in dreams.",
    highlights: ["Seven Falls zipline", "T'nalak weaving", "Lake Sebu boating"],
    photo:
      "https://images.unsplash.com/photo-1673443047506-d764c2648064?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure", "culture"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
  {
    slug: "enchanted-river",
    name: "Enchanted River",
    region: "Surigao del Sur",
    nearestAirport: "BXU",
    blurb:
      "A spring-fed river so improbably sapphire-blue it earned its name, with underwater caves explored to 82 meters and still no confirmed bottom.",
    highlights: ["Turquoise spring waters", "Cliff diving spot", "Cave entrance snorkeling"],
    photo:
      "https://images.unsplash.com/photo-1768544258882-613aba8a6884?w=1600&q=80&auto=format&fit=crop",
    vibes: ["adventure"],
    budget: "budget",
    groupFit: ["solo", "partner", "group"],
  },
];

// The homepage's "Where to go next" grid deliberately doesn't show all
// eleven destinations (Halina-Revamp-Plan.md section 45) — once the list
// grew past six, showing every entry made that section feel long and
// undifferentiated. This is a smaller, hand-picked set chosen to be varied
// against each other (a different vibe, budget, and activity each) rather
// than the six oldest entries by coincidence of file order. The quiz and AI
// trip search are unaffected by this list — they still match against every
// destination in DESTINATIONS above, including the five not featured here.
// Order here is also the display order on the homepage.
export const HOMEPAGE_FEATURED_SLUGS = [
  "boracay",
  "siargao",
  "coron",
  "batad",
  "vigan",
  "tagaytay",
] as const;

export function getDestinationBySlug(slug: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.slug === slug);
}

export function getHomepageFeaturedDestinations(): Destination[] {
  return HOMEPAGE_FEATURED_SLUGS.map(getDestinationBySlug).filter(
    (d): d is Destination => d !== undefined,
  );
}
