import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  getDestinationBySlug,
  DESTINATIONS,
  type Budget,
  type GroupFit,
  type Vibe,
} from "@/lib/destinations/data";
import { AIRPORTS } from "@/lib/flights/airports";
import {
  DestinationWeather,
  DestinationWeatherSkeleton,
} from "@/components/destinations/destination-weather";
import {
  DestinationClimate,
  DestinationClimateSkeleton,
} from "@/components/destinations/destination-climate";
import { DestinationMap } from "@/components/destinations/destination-map";

// Plain-English versions of the tags each destination already carries.
// The trip finder uses them for matching; this page is the first place
// visitors actually get to see them.
const VIBE_LABELS: Record<Vibe, string> = {
  beach: "Beach",
  adventure: "Adventure",
  culture: "Culture",
};
const BUDGET_LABELS: Record<Budget, string> = {
  budget: "Budget-friendly",
  mid: "Mid-range",
  splurge: "Splurge",
};
const GROUP_LABELS: Record<GroupFit, string> = {
  solo: "Solo trips",
  partner: "Couples",
  group: "Groups",
};

// Every slug is known ahead of time — could be pre-rendered with
// generateStaticParams, unlike the search results pages which depend on
// request-time query params. Left as a plain dynamic Server Component
// since the destinations list is small.
export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = getDestinationBySlug(slug);
  if (!destination) notFound();

  // "Kalibo (Boracay)" → "Kalibo". Most visitors won't know what KLO
  // means, so the city name does the explaining.
  const airportCity =
    AIRPORTS.find((a) => a.code === destination.nearestAirport)?.city.split("(")[0].trim() ??
    destination.nearestAirport;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="overlay" />

      <div className="relative h-[52vh] w-full">
        <Image
          src={destination.photo}
          alt={destination.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(22,35,43,0.25) 0%, rgba(22,35,43,0.15) 40%, rgba(22,35,43,0.85) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-[1180px] px-6 pb-10 sm:px-10">
            {/* text-sand-light, not text-sand — text-sand is tuned for
                light backgrounds and reads low-contrast against the dark
                hero photo (same pattern as the homepage hero's eyebrow). */}
            <p className="text-[12px] uppercase tracking-[0.16em] text-sand-light">
              {destination.region}
            </p>
            <h1 className="text-4xl font-light text-paper sm:text-5xl">
              {destination.name}
            </h1>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-12 sm:px-10">
        {/* Everything to read flows down the left; the map sits on the right
            and stays in view while scrolling. A single flow means no column
            ends early next to a taller one. Stacks on smaller screens. */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
          <div className="min-w-0">
            <p className="max-w-[60ch] text-[15.5px] leading-relaxed text-ink-soft">
              {destination.blurb}
            </p>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-soft">
              {destination.highlights.map((h) => (
                <li key={h}>· {h}</li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/?prefillTab=flights&prefillTo=${destination.nearestAirport}#search-results`}
                className="border border-ink px-6 py-3 text-[12.5px] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                Search flights to {airportCity}
              </Link>
              <Link
                href={`/?prefillTab=hotels&prefillDestination=${encodeURIComponent(destination.name)}#search-results`}
                className="border border-ink px-6 py-3 text-[12.5px] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                Search hotels in {destination.name}
              </Link>
            </div>

            {/* Quick facts as a slim strip under the buttons. */}
            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5 border-y border-line py-5 sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:gap-x-12">
              <GlanceRow label="Nearest airport">
                {airportCity} <span className="text-ink-soft">· {destination.nearestAirport}</span>
              </GlanceRow>
              <GlanceRow label="Budget">{BUDGET_LABELS[destination.budget]}</GlanceRow>
              <GlanceRow label="Good for" className="col-span-2 sm:col-span-1">
                <TagList
                  tags={[
                    ...destination.vibes.map((v) => VIBE_LABELS[v]),
                    ...destination.groupFit.map((g) => GROUP_LABELS[g]),
                  ]}
                />
              </GlanceRow>
            </dl>

            <section className="mt-10 border border-line bg-paper-raised px-6 py-5">
              <p className="text-[13px] italic text-ink-soft">Weather</p>
              <dl className="mt-4 grid gap-8 sm:grid-cols-2 sm:gap-10">
                <GlanceRow label="Right now">
                  <Suspense fallback={<DestinationWeatherSkeleton />}>
                    <DestinationWeather lat={destination.coords.lat} lng={destination.coords.lng} />
                  </Suspense>
                </GlanceRow>
                <GlanceRow label="Usually drier">
                  <Suspense fallback={<DestinationClimateSkeleton />}>
                    <DestinationClimate lat={destination.coords.lat} lng={destination.coords.lng} />
                  </Suspense>
                </GlanceRow>
              </dl>
            </section>

            <div className="mt-12 border-t border-line pt-8">
              <p className="text-[13px] italic text-ink-soft">More destinations</p>
              {/* One scrolling row on phones, wrapping on desktop. Links size
                  to their own text (no min-width), so the gap is the only
                  thing controlling spacing. */}
              <div className="mt-4 flex gap-6 overflow-x-auto pb-2 lg:flex-wrap lg:gap-y-2 lg:overflow-visible">
                {DESTINATIONS.filter((d) => d.slug !== destination.slug).map((d) => (
                  <Link
                    key={d.slug}
                    href={`/destinations/${d.slug}`}
                    className="shrink-0 whitespace-nowrap text-[13.5px] text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                  >
                    {d.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* top-[120px] clears the fixed navbar while the map stays put. */}
          <aside className="lg:sticky lg:top-[120px] lg:h-fit">
            <p className="text-[13px] italic text-ink-soft">Where it is</p>
            <div className="mt-4">
              <DestinationMap current={destination} />
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function GlanceRow({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <dt className="text-[11.5px] uppercase tracking-[0.12em] text-ink-soft">{label}</dt>
      <dd className="mt-1.5 text-[14.5px] text-ink">{children}</dd>
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li key={tag} className="border border-line px-2.5 py-1 text-[12.5px] text-ink">
          {tag}
        </li>
      ))}
    </ul>
  );
}
