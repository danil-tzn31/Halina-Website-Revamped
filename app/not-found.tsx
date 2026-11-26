import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// Shown for any URL that doesn't exist, and for destination slugs that
// aren't in the list (notFound() in app/destinations/[slug]/page.tsx).
// Replaces Next's plain default 404 with one that looks like the site.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="solid" />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-center px-6 pb-16 pt-[140px] sm:px-10">
        <p className="text-[12px] uppercase tracking-[0.16em] text-ink-soft">Page not found</p>
        <h1 className="mt-3 text-4xl font-light tracking-tight text-ink sm:text-5xl">
          This page took a different route.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-soft">
          The link may be old or mistyped. You can start a new search, or browse the places we
          cover.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="border border-ink bg-ink px-6 py-3 text-[12.5px] uppercase tracking-[0.08em] text-paper transition-colors hover:bg-transparent hover:text-ink"
          >
            Back to home
          </Link>
          <Link
            href="/destinations"
            className="border border-ink px-6 py-3 text-[12.5px] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            See all destinations
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
