import { cn } from "@/lib/utils";

// A single pulsing placeholder block. Kept intentionally tiny — most
// skeleton screens in this app (flight/hotel result cards) are built by
// composing several of these into the exact shape of the real card they
// stand in for, rather than by this component trying to know about any
// specific layout. Square corners by default, matching the site's
// sharp-cornered convention (see HOW-IT-WORKS.md) — pass className to
// override for the rare rounded case (e.g. a circular avatar placeholder).
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-ink/8", className)} />;
}
