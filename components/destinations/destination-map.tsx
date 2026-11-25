import Link from "next/link";

import { DESTINATIONS, type Destination } from "@/lib/destinations/data";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  PHILIPPINES_PATH,
  projectToMap,
} from "@/lib/destinations/ph-map";

// Where this destination sits in the country, with every other destination
// as a small dot you can click through to. A plain drawn outline instead of
// a tile map: no extra library, no third-party map requests, and it suits
// the site's look. The dots are regular links laid over the drawing, so
// they get normal keyboard focus and client-side navigation.
export function DestinationMap({ current }: { current: Destination }) {
  const toPercent = (d: Destination) => {
    const { x, y } = projectToMap(d.coords.lat, d.coords.lng);
    return { left: `${(x / MAP_WIDTH) * 100}%`, top: `${(y / MAP_HEIGHT) * 100}%` };
  };
  const here = toPercent(current);
  // Names for places on the east side go to the left of the dot, so a long
  // one like "Enchanted River" doesn't run off a phone screen.
  const labelOnLeft = projectToMap(current.coords.lat, current.coords.lng).x > MAP_WIDTH * 0.6;

  return (
    <div className="relative w-full max-w-[280px]" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={`Map of the Philippines showing ${current.name}`}
      >
        <path d={PHILIPPINES_PATH} className="fill-ink/[0.09] stroke-ink/30" strokeWidth={0.6} />
      </svg>

      {DESTINATIONS.filter((d) => d.slug !== current.slug).map((d) => (
        <Link
          key={d.slug}
          href={`/destinations/${d.slug}`}
          title={d.name}
          aria-label={d.name}
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/30 transition-transform hover:scale-150 hover:bg-ink/70 focus-visible:scale-150 focus-visible:bg-ink/70"
          style={toPercent(d)}
        />
      ))}

      {/* The current destination: a larger dot with a soft ring and its
          name beside it. */}
      <span
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-4 ring-ink/15"
        style={here}
        aria-hidden
      />
      <span
        className={`absolute -translate-y-1/2 whitespace-nowrap bg-paper/80 px-1 text-[12px] text-ink ${
          labelOnLeft ? "-ml-3 -translate-x-full" : "ml-3"
        }`}
        style={here}
        aria-hidden
      >
        {current.name}
      </span>
    </div>
  );
}
