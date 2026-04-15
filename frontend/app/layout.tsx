import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Football Manager Pro',
  description: 'De meest innovatieve fantasy football manager — real-time, sociaal, mobile-first. Bouw je team, duelleer met vrienden, volg live wedstrijden.',
  keywords: ['football manager', 'fantasy football', 'eredivisie', 'premier league', 'vrienden competitie', 'real-time'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FMPro',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00FF87',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FMPro" />
      </head>
      <body className={`${inter.className} bg-[#0A0E1A] text-white antialiased overscroll-none`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
