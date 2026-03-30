import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        'secondary-bg': 'var(--color-secondary-bg)',
        'card-bg': 'var(--color-card-bg)',
        gold: 'var(--color-gold)',
        'text-primary': 'var(--color-text)',
        'text-sub': 'var(--color-subtext)',
        success: 'var(--color-success)',
        error: 'var(--color-error)',
      },
      fontFamily: {
        heading: ['Sora', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
