/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle specific module resolutions
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      module: false,
      path: false,
      emitter: false,
      'batch': false,
      'inline-css': false,
      'extract-css': false,
      'html-pdf-node': false
    };

    return config;
  },
  // Disable server-side rendering for problematic components
  reactStrictMode: true,
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
