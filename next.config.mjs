/** @type {import('next').NextConfig} */
const nextConfig = {
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