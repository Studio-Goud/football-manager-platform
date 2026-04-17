'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Zap, Users, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const STEPS = [
  {
    icon: Trophy,
    color: '#FFD700',
    title: 'Welkom bij Football Manager Pro!',
    body: 'Bouw je eigen team, verzamel punten met echte spelers en versla je vrienden in privé competities.',
  },
  {
    icon: Zap,
    color: '#00FF87',
    title: 'Live punten, real-time',
    body: 'Elke goal, assist en clean sheet van jouw spelers levert direct punten op. Je ziet het live tijdens de wedstrijd.',
  },
  {
    icon: Users,
    color: '#3B82F6',
    title: 'Privé competities',
    body: 'Maak een privé competitie aan of join er een met een 6-cijferige code. Strijd met vrienden om de eerste plek.',
  },
]

interface Props {
  onComplete: () => void
}

export function OnboardingModal({ onComplete }: Props) {
  const { user } = useAuthStore()
  const [step, setStep] = useState(0)
  const [teamName, setTeamName] = useState('')
  const [saving, setSaving] = useState(false)
  const isLast = step === STEPS.length

  const handleNext = () => {
    if (step < STEPS.length) setStep(s => s + 1)
  }

  const handleFinish = async () => {
    if (teamName.trim()) {
      setSaving(true)
      try {
        await api.patch('/teams/my/name', { name: teamName.trim() })
      } catch {
        // silently ignore — team name update is optional
      }
      setSaving(false)
    }
    localStorage.setItem('onboarding_done', '1')
    onComplete()
    toast.success('Succes! Bouw nu je team op 🚀')
  }

  const currentStep = STEPS[step]
  const Icon = currentStep?.icon

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-[#111827] border border-[#1E2A45] rounded-2xl w-full max-w-md p-6 relative"
      >
        {/* Step dots */}
        <div className="flex gap-1.5 justify-center mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 24 : 8,
                background: i <= step ? '#00FF87' : '#1E2A45',
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {!isLast ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center space-y-4"
            >
              {Icon && (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: `${currentStep.color}20` }}
                >
                  <Icon className="w-8 h-8" style={{ color: currentStep.color }} />
                </div>
              )}
              <h2 className="text-xl font-black">{currentStep.title}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{currentStep.body}</p>
            </motion.div>
          ) : (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#00FF87]/20 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-[#00FF87]" />
                </div>
                <h2 className="text-xl font-black">Geef je team een naam</h2>
                <p className="text-gray-400 text-sm mt-1">Hoe wil je dat jouw rivalen je kennen?</p>
              </div>
              <input
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder={`${user?.username ?? 'Mijn'} FC`}
                maxLength={30}
                className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] text-center text-lg font-bold"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 flex gap-3">
          {!isLast ? (
            <Button onClick={handleNext} className="flex-1">
              Volgende <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} loading={saving} className="flex-1">
              Start spelen! 🚀
            </Button>
          )}
        </div>

        <button
          onClick={() => { localStorage.setItem('onboarding_done', '1'); onComplete() }}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  )
}

export function useOnboarding() {
  const [show, setShow] = useState(false)
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return
    const done = localStorage.getItem('onboarding_done')
    if (!done) setShow(true)
  }, [isAuthenticated])

  return { show, complete: () => setShow(false) }
}
