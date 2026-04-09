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
}

module.exports = nextConfig
