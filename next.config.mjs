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
    // Configure css extraction and modules
    config.plugins.push(new MiniCssExtractPlugin({
      filename: 'static/css/[name].[contenthash].css',
      chunkFilename: 'static/css/[id].[contenthash].css',
    }));
    
    config.module.rules.push({
      test: /\.css$/,
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