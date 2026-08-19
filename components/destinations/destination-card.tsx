import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Destination } from "@/lib/destinations/data";

// Name/region/blurb sit in an overlay on top of the photo. Shown by default
// on touch devices (no hover to reveal it otherwise), hidden until hover on
// devices that have one, via a `(hover: hover)` media check.
//
// Shared by the homepage's featured grid and the /destinations page.
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
          // Touch devices: overlay always visible. Hover-capable devices:
          // hidden until hover.
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
