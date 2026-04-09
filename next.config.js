/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint 9.x flat-config format conflicts with the legacy .eslintrc.json
    // used by eslint-config-next, producing a "Converting circular structure
    // to JSON" error that fails the Vercel build.  Ignore ESLint during
    // production builds and run linting separately in CI instead.
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
