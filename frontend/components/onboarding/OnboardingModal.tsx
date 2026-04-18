'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Zap, Users, ArrowRight, Bell, Star, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { requestPushPermission } from '@/hooks/usePushNotifications'
import { useQuery } from '@tanstack/react-query'

interface Sponsor {
  id: number
  name: string
  logo_url: string | null
  weekly_income: number
  tier: string
  description: string
}

const INFO_STEPS = [
  {
    icon: Trophy,
    color: '#FFD700',
    title: 'Welkom bij Football Manager!',
    body: 'Bouw je droomteam, verdien punten met echte voetballers en strijd om de top van de ranglijst.',
  },
  {
    icon: Zap,
    color: '#00FF87',
    title: 'Live punten, elk moment',
    body: 'Elke goal, assist en clean sheet van jouw spelers geeft direct punten — bekijk het live tijdens de wedstrijd.',
  },
  {
    icon: Users,
    color: '#3B82F6',
    title: 'Speel met vrienden',
    body: 'Maak een privé competitie aan of join er een met een 6-cijferige code. De beste manager wint.',
  },
]

interface Props {
  onComplete: () => void
}

type Step = 'info' | 'team_name' | 'sponsor' | 'push' | 'done'

export function OnboardingModal({ onComplete }: Props) {
  const { user } = useAuthStore()
  const [infoStep, setInfoStep] = useState(0)
  const [currentStep, setCurrentStep] = useState<Step>('info')
  const [teamName, setTeamName] = useState('')
  const [selectedSponsor, setSelectedSponsor] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [pushDone, setPushDone] = useState(false)

  const { data: sponsors = [] } = useQuery<Sponsor[]>({
    queryKey: ['sponsors-onboarding'],
    queryFn: async () => {
      const res = await api.get('/sponsors')
      return res.data.data ?? []
    },
    enabled: currentStep === 'sponsor',
  })

  const handleInfoNext = () => {
    if (infoStep < INFO_STEPS.length - 1) {
      setInfoStep(s => s + 1)
    } else {
      setCurrentStep('team_name')
    }
  }

  const handleTeamNameNext = async () => {
    if (teamName.trim()) {
      try {
        await api.patch('/teams/my/name', { name: teamName.trim() })
      } catch {
        // optional
      }
    }
    setCurrentStep('sponsor')
  }

  const handleSponsorNext = async () => {
    if (selectedSponsor) {
      try {
        await api.post(`/sponsors/${selectedSponsor}/select`)
      } catch {
        // optional
      }
    }
    setCurrentStep('push')
  }

  const handlePushNext = async () => {
    try {
      await requestPushPermission()
    } catch {
      // optional
    }
    setPushDone(true)
    setCurrentStep('done')
  }

  const handleFinish = () => {
    localStorage.setItem('onboarding_done', '1')
    onComplete()
    toast.success('Succes! Bouw nu je team op 🚀', { duration: 4000 })
  }

  const dismiss = () => {
    localStorage.setItem('onboarding_done', '1')
    onComplete()
  }

  const totalSteps = 5
  const stepIndex = currentStep === 'info' ? infoStep
    : currentStep === 'team_name' ? 3
    : currentStep === 'sponsor' ? 4
    : currentStep === 'push' ? 5
    : 5

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-[#111827] border border-[#1E2A45] rounded-2xl w-full max-w-md relative overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-1 bg-[#1E2A45]">
          <motion.div
            className="h-full bg-[#00FF87]"
            animate={{ width: `${(stepIndex / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* INFO STEPS */}
            {currentStep === 'info' && (
              <motion.div
                key={`info-${infoStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-4"
              >
                {(() => {
                  const step = INFO_STEPS[infoStep]
                  const Icon = step.icon
                  return (
                    <>
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                        style={{ background: `${step.color}20` }}
                      >
                        <Icon className="w-8 h-8" style={{ color: step.color }} />
                      </div>
                      <h2 className="text-xl font-black">{step.title}</h2>
                      <p className="text-gray-400 text-sm leading-relaxed">{step.body}</p>
                    </>
                  )
                })()}
              </motion.div>
            )}

            {/* TEAM NAME */}
            {currentStep === 'team_name' && (
              <motion.div
                key="team_name"
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
                  <p className="text-gray-400 text-sm mt-1">Hoe wil je dat je rivalen je kennen?</p>
                </div>
                <input
                  type="text"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder={`${user?.username ?? 'Mijn'} FC`}
                  maxLength={30}
                  autoFocus
                  className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] text-center text-lg font-bold"
                />
              </motion.div>
            )}

            {/* SPONSOR */}
            {currentStep === 'sponsor' && (
              <motion.div
                key="sponsor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-yellow-400" />
                  </div>
                  <h2 className="text-xl font-black">Kies je sponsor</h2>
                  <p className="text-gray-400 text-sm mt-1">Je sponsor betaalt je wekelijks — kies verstandig!</p>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {sponsors.slice(0, 6).map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSponsor(s.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selectedSponsor === s.id
                          ? 'border-[#00FF87] bg-[#00FF87]/10'
                          : 'border-[#1E2A45] bg-[#0A0E1A] hover:border-gray-600'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#1E2A45] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{s.name}</p>
                        <p className="text-xs text-gray-500 truncate">{s.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[#00FF87] text-sm font-bold">+{s.weekly_income} cr</p>
                        <p className="text-xs text-gray-600">/week</p>
                      </div>
                      {selectedSponsor === s.id && (
                        <CheckCircle className="w-4 h-4 text-[#00FF87] flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PUSH */}
            {currentStep === 'push' && (
              <motion.div
                key="push"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto">
                  <Bell className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-xl font-black">Live updates</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Ontvang een pushmelding bij elke goal en assist van jouw spelers — ook als de app dicht is.
                </p>
                <div className="bg-[#0A0E1A] rounded-xl p-3 text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚽</span>
                    <div>
                      <p className="text-sm font-bold">Virgil van Dijk</p>
                      <p className="text-xs text-gray-400">Doelpunt in minuut 67! +6 punten (C ×2)</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* DONE */}
            {currentStep === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4 py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-[#00FF87]/20 flex items-center justify-center mx-auto"
                >
                  <CheckCircle className="w-10 h-10 text-[#00FF87]" />
                </motion.div>
                <h2 className="text-xl font-black">Je bent klaar!</h2>
                <p className="text-gray-400 text-sm">Je team staat klaar. Stel nu je opstelling in en ga strijden!</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {currentStep === 'info' && (
              <Button onClick={handleInfoNext} className="flex-1">
                {infoStep < INFO_STEPS.length - 1 ? (
                  <>Volgende <ArrowRight className="w-4 h-4 ml-2" /></>
                ) : (
                  <>Mijn team bouwen <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            )}
            {currentStep === 'team_name' && (
              <Button onClick={handleTeamNameNext} className="flex-1">
                Volgende <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {currentStep === 'sponsor' && (
              <Button onClick={handleSponsorNext} className="flex-1" disabled={!selectedSponsor}>
                {selectedSponsor ? 'Sponsor activeren' : 'Kies een sponsor'}
                {selectedSponsor && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            )}
            {currentStep === 'push' && (
              <div className="flex-1 flex flex-col gap-2">
                <Button onClick={handlePushNext} className="w-full">
                  <Bell className="w-4 h-4 mr-2" /> Meldingen inschakelen
                </Button>
                <button
                  onClick={() => setCurrentStep('done')}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Overslaan
                </button>
              </div>
            )}
            {currentStep === 'done' && (
              <Button onClick={handleFinish} className="flex-1">
                Start spelen! 🚀
              </Button>
            )}
          </div>
        </div>

        {/* Skip button */}
        {currentStep !== 'done' && (
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-gray-700 hover:text-gray-500 transition-colors text-xs"
          >
            Overslaan
          </button>
        )}
      </motion.div>
    </div>
  )
}

export function useOnboarding() {
  const [show, setShow] = useState(false)
  const { isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || !user) return
    const done = localStorage.getItem('onboarding_done')
    if (done) return

    // Show for users registered within 30 days
    const registeredAt = new Date(user.created_at).getTime()
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    if (registeredAt >= thirtyDaysAgo) {
      setShow(true)
    }
  }, [isAuthenticated, user])

  return { show, complete: () => setShow(false) }
}
