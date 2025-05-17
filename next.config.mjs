import MiniCssExtractPlugin from 'mini-css-extract-plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Make sure modules used for WebSockets are correctly bundled
  serverExternalPackages: ['socket.io', 'socket.io-client'],
  // Enable the custom server for WebSocket support
  // NOTE: This disables automatic static optimization
  // You may want to keep this disabled in production and handle WebSockets separately
  useFileSystemPublicRoutes: true,
  // Add async rewrites to proxy aitopia.ai requests
  async rewrites() {
    return [
      {
        source: '/api/aitopia/:path*',
        destination: 'https://extensions.aitopia.ai/:path*',
      },
    ];
  },
  // Configure font optimization
  optimizeFonts: true,
  webpack: (config, { isServer }) => {
    // Handle client-side polyfills for socket.io
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Ensure client-side socket.io has these polyfills
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
}

export default nextConfig