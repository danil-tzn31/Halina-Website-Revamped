import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Destination } from "@/lib/destinations/data";

// Image-only card, replacing the old "photo + separate text block below it"
// layout. Name/region/blurb now live in an overlay on top of the photo
// itself rather than in their own space beneath it — shown on hover for
// devices that actually have a hover state (a mouse), and shown by default
// on touch devices, since a touch screen has no hover to reveal it with in
// the first place. Without that fallback, every card on a phone would show
// nothing but an unlabeled photo — a real usability regression the design
// request didn't ask for, so it's handled here via a `(hover: hover)`
// media-feature check rather than skipped.
//
// Shared by the homepage's featured-destinations grid and the /destinations
// "see all" page (see destination-grid.tsx for the bento span pattern both
// of those use) — one card, one place its look is defined.
export function DestinationCard({
  destination,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
}: {
  destination: Destination;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/destinations/${destination.slug}`}
      className={cn(
        "group relative block aspect-[4/3] overflow-hidden bg-ink sm:aspect-auto",
        className,
      )}
    >
      <Image
        src={destination.photo}
        alt={destination.name}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        style={{ objectPosition: destination.photoPosition ?? "center" }}
      />
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/90 via-ink/25 to-transparent p-5",
          // Default (no real hover — touch devices): overlay always shown,
          // so a destination's name is never hidden with no way to reveal
          // it. Hover-capable devices (an actual mouse) get the literal
          // "just the image, text appears on hover" behavior that was
          // asked for: opacity-0 at rest, opacity-100 on :hover.
          "opacity-100 transition-opacity duration-300",
          "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100",
        )}
      >
        <p className="text-[11px] uppercase tracking-[0.14em] text-sand-light">
          {destination.region}
        </p>
        <p className="text-xl font-light text-paper">{destination.name}</p>
        <p className="mt-1 text-[13px] text-paper/85 line-clamp-2">{destination.blurb}</p>
      </div>
    </Link>
  );
}
