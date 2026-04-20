/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './src/lib/supabase-image-loader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  eslint: {
    // Ignore ESLint errors during builds to prevent circular structure errors
    // ESLint can still be run separately via npm run lint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep TypeScript checking enabled during builds
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://app-cdn.minepi.com',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.minepi.com https://app-cdn.minepi.com;",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
