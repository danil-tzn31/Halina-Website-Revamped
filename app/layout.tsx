import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { Providers } from "@/components/providers";
import { Preloader } from "@/components/layout/preloader";
import { PageTransition } from "@/components/layout/page-transition";
import { CheckoutAbandonWatcher } from "@/components/booking/checkout-abandon-watcher";
import { TripFinderModal } from "@/components/destinations/trip-finder-modal";
import { HERO_PHOTO_OG_URL } from "@/lib/photos";

// PP Neue Montreal, loaded locally via next/font/local — no network call at
// build time (unlike next/font/google), and Next.js self-hosts + preloads
// these files automatically. The design direction still leans on size,
// spacing, and italics for hierarchy rather than bold weights generally —
// Semibold (600) is the one deliberate exception, loaded here specifically
// for the "Halina" wordmark (navbar and Preloader — see their own comments)
// since a short, never-italicized wordmark is about as safe a place as any
// to use it, with no synthetic-bold or synthetic-italic risk. There's no
// SemiboldItalic file, on purpose — nothing in this codebase italicizes it.
// Extrabold stays excluded; nothing has earned that weight yet.
const neueMontreal = localFont({
  variable: "--font-neue-montreal",
  display: "swap",
  src: [
    {
      path: "./fonts/PPNeueMontreal-Hairline.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "./fonts/PPNeueMontreal-HairlineItalic.woff2",
      weight: "200",
      style: "italic",
    },
    {
      path: "./fonts/PPNeueMontreal-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/PPNeueMontreal-LightItalic.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/PPNeueMontreal-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/PPNeueMontreal-RegularItalic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/PPNeueMontreal-TextBook.woff2",
      weight: "450",
      style: "normal",
    },
    {
      path: "./fonts/PPNeueMontreal-TextBookItalic.woff2",
      weight: "450",
      style: "italic",
    },
    {
      path: "./fonts/PPNeueMontreal-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
});

const SITE_DESCRIPTION =
  "Flights, hotels, and destinations across the Philippines.";

// openGraph/twitter images are what a link preview (Slack, LinkedIn,
// iMessage, a resume link) actually shows — without these, sharing the
// live URL previously showed nothing but bare text. Reuses the hero photo
// (see lib/photos.ts) at the standard 1200x630 social-card crop rather
// than sourcing a separate image, so the preview matches what a visitor
// actually sees the moment the page itself loads.
export const metadata: Metadata = {
  title: "Halina Travel",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "Halina Travel",
    description: SITE_DESCRIPTION,
    type: "website",
    images: [
      {
        url: HERO_PHOTO_OG_URL,
        width: 1200,
        height: 630,
        alt: "Limestone cliffs and turquoise lagoon in El Nido, Palawan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Halina Travel",
    description: SITE_DESCRIPTION,
    images: [HERO_PHOTO_OG_URL],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${neueMontreal.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning here is specifically to quiet false-positive
          warnings from browser extensions (Grammarly, password managers, etc.)
          that inject attributes into <body> before React hydrates. It does
          NOT hide real hydration bugs elsewhere in the app — those still show
          up as errors on the specific component that caused them. */}
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        <Providers>
          <Preloader />
          {/* Mounted once, globally — see that component's comment for why
              this needs to be present on every page rather than just the
              booking modals themselves. */}
          <CheckoutAbandonWatcher />
          {/* The trip finder's floating bubble button (section 43 — merges
              what used to be two separate features, the destination quiz
              and the AI trip search) — mounted once, globally, same
              reasoning as CheckoutAbandonWatcher above, so it's reachable
              from every page. See its own comment for the full history. */}
          <TripFinderModal />
          <PageTransition>{children}</PageTransition>
        </Providers>
      </body>
    </html>
  );
}
