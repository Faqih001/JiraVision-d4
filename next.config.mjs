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
  webpack: (config, { isServer }) => {
    // Add CSS extraction plugin but configure it to avoid conflict with Next.js font handling
    config.plugins.push(new MiniCssExtractPlugin({
      filename: 'static/css/[name].[contenthash].css',
      chunkFilename: 'static/css/[id].[contenthash].css',
    }));
    
    // Modify CSS rule to exclude font files
    config.module.rules.push({
      test: /\.css$/,
      exclude: /next\/font/,  // Exclude Next.js font CSS files
      use: [
        MiniCssExtractPlugin.loader,
        {
          loader: 'css-loader',
          options: {
            importLoaders: 1,
            modules: {
              auto: true,
              localIdentName: '[local]_[hash:base64:5]',
            },
          },
        },
        'postcss-loader',
      ],
    });

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