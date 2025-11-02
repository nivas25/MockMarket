import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    qualities: [100, 75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        // Cache Next.js build assets aggressively
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache public assets (images, fonts, etc.) for a long time
        // Use a path-to-regexp compatible pattern (no non-capturing groups)
        // Matches any file with these extensions under public/
        source: "/:path*\\.(png|jpg|jpeg|gif|svg|webp|ico|woff2|woff|ttf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
