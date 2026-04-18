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
            // Remove X-Frame-Options to allow iframe embedding
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            // Configure CSP to allow framing by Pi Network domains
            key: 'Content-Security-Policy',
            value: [
              "frame-ancestors 'self' https://app-cdn.minepi.com https://sandbox.minepi.com https://*.minepi.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
