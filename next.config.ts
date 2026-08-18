import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Hero photo is hotlinked from Unsplash (free license, no attribution
    // required) rather than self-hosted — see HOW-IT-WORKS.md for why.
    // `search` is intentionally omitted so any of Unsplash's query-string
    // sizing/format params are allowed, not just one exact combination.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
