import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "globaltexusa.com",
      },
      {
        protocol: "https",
        hostname: "www.globaltexusa.com",
      },
      {
        protocol: "https",
        hostname: "pataktextile.com",
      },
      {
        protocol: "https",
        hostname: "www.pataktextile.com",
      },
    ],
  },
};

export default nextConfig;