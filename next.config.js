/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore ESLint during production builds.
  // eslint-config-next 16.x exports ESLint 9 flat-config objects that contain
  // circular references. When Next.js tries to serialise the legacy
  // .eslintrc.json it throws "Converting circular structure to JSON", which
  // breaks the Vercel build. Skipping ESLint at build time lets the deploy
  // succeed while linting can still run independently via `npm run lint`.
  eslint: {
    ignoreDuringBuilds: true,
  },
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
}

module.exports = nextConfig
