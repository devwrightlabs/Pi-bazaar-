/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint 9 + eslint-config-next produces a "Converting circular structure
  // to JSON" error when Next.js serialises the resolved config during builds.
  // Skipping the built-in lint step prevents this from failing the deploy.
  // Linting is handled separately in CI via `npx eslint`.
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
