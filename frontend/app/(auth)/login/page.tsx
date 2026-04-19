'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, isAuthenticated } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard')
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Welkom terug!')
      router.push('/dashboard')
    } catch {
      toast.error('Ongeldige inloggegevens')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-8">
        <h1 className="text-2xl font-black mb-2">Inloggen</h1>
        <p className="text-gray-400 text-sm mb-8">
          Nog geen account?{' '}
          <Link href="/register" className="text-[#00FF87] hover:underline">
            Registreer gratis
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jouw@email.nl"
              className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Wachtwoord</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <Link href="#" className="text-xs text-gray-500 hover:text-[#00FF87] transition-colors">
                Wachtwoord vergeten?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00FF87] text-[#0A0E1A] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#00CC6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-[#0A0E1A] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Inloggen
              </>
            )}
          </button>
        </form>

        {/* Admin quick login */}
        <div className="mt-6 pt-6 border-t border-[#1E2A45]">
          <button
            onClick={async () => {
              const adminToast = toast.loading('Inloggen als admin...')
              try {
                await login('ricardo@test.nl', 'ricardo@test.nl')
                toast.dismiss(adminToast)
                router.push('/dashboard')
              } catch (err: unknown) {
                const status = (err as { response?: { status?: number } })?.response?.status
                if (status === 401 || !status) {
                  // Account bestaat niet of wachtwoord klopt niet — herstel first
                  toast.loading('Account herstellen...', { id: adminToast })
                  try {
                    await api.post('/auth/repair-admin')
                    await login('ricardo@test.nl', 'ricardo@test.nl')
                    toast.dismiss(adminToast)
                    router.push('/dashboard')
                  } catch {
                    toast.error('Backend niet bereikbaar. Wacht 30s en probeer opnieuw.', { id: adminToast, duration: 6000 })
                  }
                } else {
                  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                  toast.error(msg ?? 'Admin login mislukt', { id: adminToast })
                }
              }
            }}
            disabled={isLoading}
            className="w-full border border-[#FFD700]/30 text-[#FFD700] py-2.5 rounded-xl text-sm font-semibold hover:bg-[#FFD700]/10 transition-all disabled:opacity-50"
          >
            ⚡ ADMIN — Direct inloggen
          </button>
        </div>
      </div>
    </motion.div>
  )
}
