import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getDestinationBySlug, DESTINATIONS } from "@/lib/destinations/data";

// Static content — every slug is known ahead of time, so this could be
// pre-rendered at build time (generateStaticParams), unlike the search
// results pages which depend on request-time query params. Kept simple as
// a plain dynamic Server Component for now since the destinations list is
// small and this isn't the part of the site under time pressure.
export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = getDestinationBySlug(slug);
  if (!destination) notFound();

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
            {/* text-sand-light, not text-sand — same fix already applied to
                the homepage hero's eyebrow (components/sections/hero.tsx):
                text-sand is tuned for *light* backgrounds and reads as
                low-contrast, muddy amber against a dark hero photo. This
                page had the same "label directly on a photo" pattern but
                had been missed when that fix went in. */}
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
            Search flights to {destination.nearestAirport}
          </Link>
          <Link
            href={`/?prefillTab=hotels&prefillDestination=${encodeURIComponent(destination.name)}#search-results`}
            className="border border-ink px-6 py-3 text-[12.5px] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Search hotels in {destination.name}
          </Link>
        </div>

        <div className="mt-16 border-t border-line pt-8">
          <p className="text-[13px] italic text-ink-soft">More destinations</p>
          {/* No min-w here — a fixed min-width on a left-aligned text link
              left uneven-looking visual gaps between items: a short name
              like "Coron" left a lot of empty box space before the next
              gap-4 kicked in, while a long name like "Batad Rice Terraces"
              exceeded the min-width and sat flush against its neighbor.
              Sizing each link to its own content makes gap-4 the only
              thing controlling spacing, so every gap reads the same. */}
          <div className="mt-4 flex gap-6 overflow-x-auto pb-2">
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
      </main>

      <Footer />
    </div>
  );
}
