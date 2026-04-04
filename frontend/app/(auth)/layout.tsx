import Link from 'next/link'
import { Trophy } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00FF87] rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 text-[#0A0E1A]" />
          </div>
          <span className="font-bold text-white text-lg">FootballManager Pro</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-xs text-gray-600">
          18+ | Verantwoord spelen | MGA Licensed
        </p>
      </footer>
    </div>
  )
}
