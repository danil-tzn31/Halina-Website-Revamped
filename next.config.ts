import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Hero photo is hotlinked from Unsplash (free license, no attribution
    // required) rather than self-hosted. `search` is omitted so any of
    // Unsplash's query-string sizing/format params are allowed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
