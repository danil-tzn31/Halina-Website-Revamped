"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// Catches anything that throws while rendering a page: the database being
// unreachable on My Bookings or Admin, for example. Without it, visitors
// would get Next's bare default error screen. "Try again" re-renders the
// page without a full reload.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[page error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="solid" />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-center px-6 pb-16 pt-[140px] sm:px-10">
        <p className="text-[12px] uppercase tracking-[0.16em] text-ink-soft">Something went wrong</p>
        <h1 className="mt-3 text-4xl font-light tracking-tight text-ink sm:text-5xl">
          We hit some turbulence.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-soft">
          This page couldn&apos;t load just now. It&apos;s usually brief, so try again in a moment.
          Any booking you&apos;ve already paid for is safe.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="border border-ink bg-ink px-6 py-3 text-[12.5px] uppercase tracking-[0.08em] text-paper transition-colors hover:bg-transparent hover:text-ink"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border border-ink px-6 py-3 text-[12.5px] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
