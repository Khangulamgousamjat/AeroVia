import type { NextConfig } from "next";
// @ts-expect-error - next-pwa does not have native declaration types
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["@remixicon/react"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

const pwaWrapper = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: "/~offline",
  },
  runtimeCaching: [
    // 1. Exclude Supabase URLs and WebSockets from service worker scope (always bypass SW)
    {
      urlPattern: /supabase\.co/i,
      handler: "NetworkOnly",
      options: {},
    },
    // 2. Flight search results using StaleWhileRevalidate
    {
      urlPattern: /^\/search/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "flight-search-cache",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    // 3. Static assets using CacheFirst
    {
      urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|ico)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets-cache",
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
});

export default pwaWrapper(nextConfig);
