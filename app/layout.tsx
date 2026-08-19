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
// these files automatically. Hierarchy mostly comes from size/spacing/
// italics, not bold weight — Semibold (600) is the one exception, reserved
// for the "Halina" wordmark (navbar, Preloader). No SemiboldItalic since
// nothing italicizes the wordmark; Extrabold is unused.
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

// openGraph/twitter images control link previews (Slack, iMessage, etc.).
// Reuses the hero photo (lib/photos.ts) at the standard 1200x630 crop
// rather than sourcing a separate image.
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
      {/* Quiets false-positive hydration warnings from browser extensions
          (Grammarly, password managers) that inject attributes into <body>
          before React hydrates. Doesn't mask real hydration bugs elsewhere. */}
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        <Providers>
          <Preloader />
          {/* Mounted globally so it's active on every page, not just the
              booking modals. */}
          <CheckoutAbandonWatcher />
          {/* Trip finder's floating bubble button — mounted globally, same
              reasoning as CheckoutAbandonWatcher above. */}
          <TripFinderModal />
          <PageTransition>{children}</PageTransition>
        </Providers>
      </body>
    </html>
  );
}
