import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FootballManager Pro – Real Money Skill Football Manager',
  description:
    'De eerste echte real-money skill-based football manager. Bouw jouw team, volg live wedstrijden en win grote prijzenpotten.',
  keywords: ['football manager', 'fantasy football', 'real money', 'skill game', 'eredivisie'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="dark">
      <body className={`${inter.className} bg-[#0A0E1A] text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
