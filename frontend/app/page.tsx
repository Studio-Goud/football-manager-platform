'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Trophy, Zap, TrendingUp, Shield, Users, Star,
  ArrowRight, ChevronRight, Play
} from 'lucide-react'

const features = [
  {
    icon: Trophy,
    title: 'Echte Prijzenpotten',
    description: 'Winst direct op je rekening. Transparante uitkering. Top 20% wint altijd.',
    color: '#FFD700',
  },
  {
    icon: Zap,
    title: 'Live Impact',
    description: 'Elk goal, elke assist raakt jouw saldo direct. Geen vertraging, pure adrenaline.',
    color: '#00FF87',
  },
  {
    icon: TrendingUp,
    title: 'Transfermarkt',
    description: 'Koop en verkoop spelers zoals FIFA UT. Prijzen bewegen mee op form en vraag.',
    color: '#3B82F6',
  },
  {
    icon: Shield,
    title: 'Skill-based',
    description: 'Jouw kennis van voetbal bepaalt je succes. Geen willekeur — pure strategie.',
    color: '#9B59B6',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Speel tegen duizenden andere managers. Private leagues met vrienden.',
    color: '#EF4444',
  },
  {
    icon: Star,
    title: 'Power-ups',
    description: 'Dubbele punten, aanvoerder lock, streak bonussen. Strategisch inzetten.',
    color: '#F97316',
  },
]

const steps = [
  {
    number: '01',
    title: 'Stort & Join',
    description: 'Stort €5 tot €100, ontvang credits en meld je aan voor het seizoen.',
  },
  {
    number: '02',
    title: 'Bouw je Team',
    description: 'Kies 15 spelers binnen je budget van 100 credits. Stel formatie en aanvoerder in.',
  },
  {
    number: '03',
    title: 'Verdien Punten',
    description: 'Live wedstrijden van Eredivisie & Premier League bepalen direct jouw saldo.',
  },
]

const mockLeaderboard = [
  { rank: 1, name: 'VoetbalKoning_NL', points: 1847, prize: '€847', trend: '+2' },
  { rank: 2, name: 'GoalMachine99', points: 1791, prize: '€564', trend: '+1' },
  { rank: 3, name: 'TacticoMaster', points: 1765, prize: '€338', trend: '-2' },
  { rank: 4, name: 'OranjeManager', points: 1741, prize: '€169', trend: '+5' },
  { rank: 5, name: 'EredivisieExpert', points: 1698, prize: '€169', trend: '-1' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0E1A]/80 backdrop-blur-md border-b border-[#1E2A45]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#00FF87] rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#0A0E1A]" />
            </div>
            <span className="font-bold text-lg">FootballManager Pro</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Inloggen
            </Link>
            <Link
              href="/register"
              className="bg-[#00FF87] text-[#0A0E1A] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#00CC6A] transition-colors"
            >
              Gratis starten
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00FF87]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-0 w-[300px] h-[300px] bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 bg-[#00FF87]/10 border border-[#00FF87]/20 text-[#00FF87] px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-[#00FF87] rounded-full animate-pulse" />
              Nu live — Eredivisie Seizoen 2024/25
            </span>

            <h1 className="text-5xl sm:text-7xl font-black mb-6 leading-tight">
              De Eerste
              <br />
              <span className="text-[#00FF87]">Real-Money</span>
              <br />
              Skill Football Manager
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              Bouw jouw team, volg live wedstrijden en win echte prijzenpotten.
              Jouw voetbalkennis bepaalt jouw winst.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 bg-[#00FF87] text-[#0A0E1A] px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#00CC6A] transition-all hover:scale-105 shadow-lg shadow-[#00FF87]/20"
              >
                Start nu voor €5
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#how-it-works"
                className="flex items-center justify-center gap-2 border border-[#1E2A45] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:border-[#00FF87]/50 transition-all"
              >
                <Play className="w-5 h-5" />
                Hoe werkt het?
              </Link>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {[
              { label: 'Actieve Managers', value: '12.847' },
              { label: 'Totale Prijzenpot', value: '€284.000' },
              { label: 'Gemiddelde Winst', value: '+34%' },
              { label: 'Live Wedstrijden', value: '380/seizoen' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-4 text-center"
              >
                <div className="text-2xl font-black text-[#00FF87]">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Hoe werkt het?</h2>
            <p className="text-gray-400">In drie stappen naar jouw eerste winst</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-6">
                  <span className="text-5xl font-black text-[#00FF87]/20">{step.number}</span>
                  <h3 className="text-xl font-bold mt-2 mb-3">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden sm:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 text-[#1E2A45] z-10" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-[#0F1629]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Alles wat je nodig hebt</h2>
            <p className="text-gray-400">Een volledig platform voor de serieuze football manager</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-[#0A0E1A] border border-[#1E2A45] rounded-2xl p-6 hover:border-[#00FF87]/30 transition-all group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Leaderboard preview */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Top Managers – Live</h2>
            <p className="text-gray-400">Speelronde 28 • Eredivisie 2024/25 • Prijzenpot: €12.400</p>
          </div>

          <div className="bg-[#0F1629] border border-[#1E2A45] rounded-2xl overflow-hidden">
            <div className="divide-y divide-[#1E2A45]">
              {mockLeaderboard.map((entry, i) => (
                <motion.div
                  key={entry.rank}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-4 p-4 hover:bg-[#0A0E1A] transition-colors"
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      entry.rank === 1
                        ? 'bg-[#FFD700]/20 text-[#FFD700]'
                        : entry.rank === 2
                        ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]'
                        : entry.rank === 3
                        ? 'bg-[#CD7F32]/20 text-[#CD7F32]'
                        : 'bg-[#1E2A45] text-gray-400'
                    }`}
                  >
                    {entry.rank}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{entry.name}</p>
                    <p className="text-xs text-gray-500">{entry.points} punten</p>
                  </div>
                  <span className="text-[#00FF87] font-bold">{entry.prize}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      entry.trend.startsWith('+')
                        ? 'bg-[#00FF87]/10 text-[#00FF87]'
                        : 'bg-[#EF4444]/10 text-[#EF4444]'
                    }`}
                  >
                    {entry.trend}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[#00FF87] text-[#0A0E1A] px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#00CC6A] transition-all hover:scale-105"
            >
              Doe mee en win
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Legal footer */}
      <footer className="border-t border-[#1E2A45] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#00FF87] rounded flex items-center justify-center">
                <Trophy className="w-4 h-4 text-[#0A0E1A]" />
              </div>
              <span className="font-bold">FootballManager Pro</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Voorwaarden</Link>
              <Link href="#" className="hover:text-white transition-colors">Responsible Gaming</Link>
              <Link href="#" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-6 text-center max-w-2xl mx-auto">
            FootballManager Pro is een skill-based gamingplatform. Deelname is uitsluitend voor personen van 18 jaar en ouder.
            Verantwoord spelen staat voorop. Speel nooit met geld dat je je niet kunt veroorloven te verliezen.
            MGA/B2C/123/2024 — Malta Gaming Authority.
          </p>
        </div>
      </footer>
    </div>
  )
}
