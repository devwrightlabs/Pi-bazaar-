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
        'royal-purple': 'var(--color-royal-purple)',
        'text-primary': 'var(--color-text)',
        'text-sub': 'var(--color-subtext)',
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        border: 'var(--color-border)',
        'control-bg': 'var(--color-control-bg)',
        'control-active': 'var(--color-control-active)',
        backdrop: 'var(--color-backdrop)',
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
