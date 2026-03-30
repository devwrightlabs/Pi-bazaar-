import type { Metadata } from 'next'
import '@/styles/globals.css'
import BottomNav from '@/components/BottomNav'
import GlobalModal from '@/components/GlobalModal'

export const metadata: Metadata = {
  title: 'PiBazaar',
  description: 'Decentralized P2P marketplace for Pi Network',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ paddingBottom: '80px', backgroundColor: 'var(--color-background)' }}>
        {children}
        <GlobalModal />
        <BottomNav />
      </body>
    </html>
  )
}
