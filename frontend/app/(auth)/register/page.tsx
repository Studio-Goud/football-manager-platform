'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, UserPlus, Check } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading } = useAuthStore()
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    accept_terms: false,
    age_confirmed: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.email) newErrors.email = 'E-mailadres is verplicht'
    if (!form.username || form.username.length < 3) newErrors.username = 'Gebruikersnaam minimaal 3 tekens'
    if (!form.password || form.password.length < 8) newErrors.password = 'Wachtwoord minimaal 8 tekens'
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Wachtwoorden komen niet overeen'
    if (!form.accept_terms) newErrors.accept_terms = 'Je moet de voorwaarden accepteren'
    if (!form.age_confirmed) newErrors.age_confirmed = 'Je moet bevestigen dat je 18+ bent'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      await register({
        email: form.email,
        password: form.password,
        username: form.username,
        accept_terms: form.accept_terms,
        age_confirmed: form.age_confirmed,
      })
      toast.success('Account aangemaakt! Welkom bij Football Manager.')
      router.push('/team')
    } catch {
      toast.error('Registratie mislukt. Probeer het opnieuw.')
    }
  }

  const field = (key: string) => ({
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })),
  })

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-8">
        <h1 className="text-2xl font-black mb-2">Account aanmaken</h1>
        <p className="text-gray-400 text-sm mb-8">
          Al een account?{' '}
          <Link href="/login" className="text-[#00FF87] hover:underline">Inloggen</Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">E-mailadres</label>
            <input
              type="email"
              value={form.email}
              {...field('email')}
              placeholder="jouw@email.nl"
              className={`w-full bg-[#0A0E1A] border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] transition-colors ${errors.email ? 'border-red-500' : 'border-[#1E2A45]'}`}
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Gebruikersnaam</label>
            <input
              type="text"
              value={form.username}
              {...field('username')}
              placeholder="JouwManagerNaam"
              className={`w-full bg-[#0A0E1A] border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] transition-colors ${errors.username ? 'border-red-500' : 'border-[#1E2A45]'}`}
            />
            {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Wachtwoord</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                {...field('password')}
                placeholder="Minimaal 8 tekens"
                className={`w-full bg-[#0A0E1A] border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] transition-colors pr-12 ${errors.password ? 'border-red-500' : 'border-[#1E2A45]'}`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Wachtwoord bevestigen</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              {...field('confirmPassword')}
              placeholder="Herhaal wachtwoord"
              className={`w-full bg-[#0A0E1A] border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] transition-colors ${errors.confirmPassword ? 'border-red-500' : 'border-[#1E2A45]'}`}
            />
            {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 pt-2">
            {[
              { key: 'age_confirmed', label: 'Ik ben 18 jaar of ouder en woon in een land waar deelname is toegestaan' },
              { key: 'accept_terms', label: 'Ik accepteer de Algemene Voorwaarden en het Privacybeleid' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    form[key as keyof typeof form]
                      ? 'bg-[#00FF87] border-[#00FF87]'
                      : errors[key]
                      ? 'border-red-500'
                      : 'border-[#1E2A45]'
                  }`}
                  onClick={() => setForm((f) => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                >
                  {form[key as keyof typeof form] && <Check className="w-3 h-3 text-[#0A0E1A]" />}
                </div>
                <span className="text-sm text-gray-400">{label}</span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00FF87] text-[#0A0E1A] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#00CC6A] transition-colors disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-[#0A0E1A] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Account aanmaken
              </>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  )
}
