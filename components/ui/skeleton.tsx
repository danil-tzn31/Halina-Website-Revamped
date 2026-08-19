import { cn } from "@/lib/utils";

// A single pulsing placeholder block. Compose several of these into the
// shape of the real card they stand in for, rather than adding layout
// logic here. Square corners by default to match the site's sharp-cornered
// style; pass className to override (e.g. a circular avatar placeholder).
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-ink/8", className)} />;
}
