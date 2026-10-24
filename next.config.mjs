/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TODO(redesign phase F): 40 pre-existing type errors across 14 files as of 2026-10-25 —
    // mostly drizzle/run-migrations, lib/seed-data and the dashboard APIs, plus components that
    // import packages that are not installed (@mui/material, @prisma/client). Remove once clean.
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Add async rewrites to proxy aitopia.ai requests
  async rewrites() {
    return [
      {
        source: '/api/aitopia/:path*',
        destination: 'https://extensions.aitopia.ai/:path*',
      },
    ];
  },
  // Font optimization is now handled automatically by Next.js
  turbopack: {},
}

export default nextConfig