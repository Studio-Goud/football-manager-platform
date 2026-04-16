'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, RefreshCw, ArrowRight, TrendingUp, AlertCircle, CheckCircle, Minus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TransferTip {
  sell_player: string
  sell_club: string
  sell_position: string
  sell_price: number
  buy_player: string
  buy_club: string
  buy_position: string
  buy_price: number
  reason: string
  expected_gain: string
  confidence: 'HOOG' | 'MIDDEL' | 'LAAG'
}

interface ScoutReport {
  tactic_style: string
  tactic_label: string
  tactic_icon: string
  manager_summary: string
  tips: TransferTip[]
  tactic_advice: string
  generated_at: string
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: 'HOOG' | 'MIDDEL' | 'LAAG' }) {
  if (level === 'HOOG')  return <span className="flex items-center gap-1 text-[9px] font-black text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full"><CheckCircle className="w-2.5 h-2.5" />HOOG</span>
  if (level === 'MIDDEL') return <span className="flex items-center gap-1 text-[9px] font-black text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full"><Minus className="w-2.5 h-2.5" />MIDDEL</span>
  return <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 bg-white/5 px-1.5 py-0.5 rounded-full"><AlertCircle className="w-2.5 h-2.5" />LAAG</span>
}

const POS_COLOR: Record<string, string> = {
  GK: 'bg-yellow-400/20 text-yellow-400',
  DEF: 'bg-blue-400/20 text-blue-400',
  MID: 'bg-green-400/20 text-green-400',
  FWD: 'bg-red-400/20 text-red-400',
}

function TipCard({ tip, index }: { tip: TransferTip; index: number }) {
  const priceDiff = tip.buy_price - tip.sell_price
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-[#0A0E1A] rounded-xl p-4"
    >
      {/* Players row */}
      <div className="flex items-center gap-2 mb-3">
        {/* Sell */}
        <div className="flex-1 bg-red-400/5 border border-red-400/20 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-red-400 font-bold uppercase mb-1">Verkoop</p>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${POS_COLOR[tip.sell_position]}`}>{tip.sell_position}</span>
          <p className="text-sm font-black text-white mt-1 leading-tight">{tip.sell_player}</p>
          <p className="text-[10px] text-gray-500">{tip.sell_club}</p>
          <p className="text-xs font-bold text-red-400 mt-1">{tip.sell_price} cr</p>
        </div>

        <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />

        {/* Buy */}
        <div className="flex-1 bg-green-400/5 border border-green-400/20 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-green-400 font-bold uppercase mb-1">Koop</p>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${POS_COLOR[tip.buy_position]}`}>{tip.buy_position}</span>
          <p className="text-sm font-black text-white mt-1 leading-tight">{tip.buy_player}</p>
          <p className="text-[10px] text-gray-500">{tip.buy_club}</p>
          <p className="text-xs font-bold text-green-400 mt-1">{tip.buy_price} cr</p>
        </div>
      </div>

      {/* Price diff + gain + confidence */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-500">
          Kostenverschil: <span className={priceDiff > 0 ? 'text-red-400' : 'text-green-400'}>{priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)} cr</span>
        </span>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-[#00FF87]" />
          <span className="text-xs font-bold text-[#00FF87]">{tip.expected_gain}</span>
          <ConfidenceBadge level={tip.confidence} />
        </div>
      </div>

      {/* Reason */}
      <p className="text-xs text-gray-400 leading-relaxed border-t border-[#1E2A45] pt-2">{tip.reason}</p>
    </motion.div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function ScoutPanel() {
  const [report, setReport] = useState<ScoutReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await api.get('/teams/my/scout')
      setReport(res.data.data as ScoutReport)
    } catch {
      // Fallback: show a generic message
    }
    setHasGenerated(true)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#00FF87]" />
          <span className="text-sm font-bold">AI Scout Analyse</span>
          <span className="text-[9px] font-black text-[#00FF87] bg-[#00FF87]/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Beta</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {hasGenerated ? 'Vernieuwen' : 'Analyseren'}
        </button>
      </div>

      {/* Initial state */}
      {!hasGenerated && !loading && (
        <div className="bg-[#0A0E1A] rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <p className="font-bold text-white mb-1">AI Transfer Scout</p>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Onze AI analyseert jouw team, tactiek en aankomende fixtures.<br />
            Krijg 3 concrete transfertips op maat.
          </p>
          <Button onClick={generate} loading={loading} className="mx-auto">
            Analyse starten
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-[#0A0E1A] rounded-xl p-6 text-center">
          <div className="text-3xl mb-3 animate-bounce">🔍</div>
          <p className="text-sm font-bold text-white mb-1">Scout aan het werk...</p>
          <div className="space-y-1.5 text-xs text-gray-500 mt-3">
            {['Team analyseren', 'Fixtures checken', 'Spelersvorm vergelijken', 'Tactiek optimaliseren'].map((step, i) => (
              <motion.p
                key={step}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.4 }}
                className="flex items-center justify-center gap-1.5"
              >
                <span className="w-1 h-1 bg-[#00FF87] rounded-full" />
                {step}
              </motion.p>
            ))}
          </div>
        </div>
      )}

      {/* Report */}
      <AnimatePresence>
        {report && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {/* Manager summary */}
            <div className="bg-[#00FF87]/5 border border-[#00FF87]/20 rounded-xl p-3">
              <p className="text-[10px] font-black text-[#00FF87] uppercase tracking-wider mb-1.5">Scout bevinding</p>
              <p className="text-xs text-gray-300 leading-relaxed">{report.manager_summary}</p>
            </div>

            {/* Tips */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">3 Aanbevolen transfers</p>
            {report.tips.map((tip, i) => (
              <TipCard key={i} tip={tip} index={i} />
            ))}

            {/* Tactic advice */}
            <div className="bg-[#0A0E1A] border border-[#1E2A45] rounded-xl p-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                {report.tactic_icon} Tactiek advies
              </p>
              <p className="text-xs text-gray-300 leading-relaxed">{report.tactic_advice}</p>
            </div>

            <p className="text-[10px] text-gray-600 text-center">
              Gegenereerd om {new Date(report.generated_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
