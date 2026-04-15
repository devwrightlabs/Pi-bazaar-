import type { Metadata } from 'next'
import Script from 'next/script'
import '@/styles/globals.css'
import BottomNav from '@/components/BottomNav'
import GlobalModal from '@/components/GlobalModal'
import Navbar from '@/components/Navbar'
import RootErrorBoundary from '@/components/RootErrorBoundary'
import StoreHydration from '@/components/providers/StoreHydration'
import ThemeProvider from '@/components/providers/ThemeProvider'
import PiAuthProvider from '@/components/providers/PiAuthProvider'

export const metadata: Metadata = {
  title: 'PiBazaar',
  description: 'Decentralized P2P marketplace for Pi Network',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-background pb-20">
        <StoreHydration />
        <ThemeProvider>
          <PiAuthProvider>
            <Navbar />
            <RootErrorBoundary>
              {children}
            </RootErrorBoundary>
            <GlobalModal />
            <BottomNav />
          </PiAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}