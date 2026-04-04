'use client'

import { useState } from 'react'
import { Transaction, TransactionType } from '@/types'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface TransactionTableProps {
  transactions: Transaction[]
}

const typeConfig: Record<TransactionType, { label: string; color: string; prefix: string }> = {
  deposit: { label: 'Storting', color: '#00FF87', prefix: '+' },
  withdrawal: { label: 'Opname', color: '#EF4444', prefix: '-' },
  entry_fee: { label: 'Inschrijfgeld', color: '#EF4444', prefix: '-' },
  prize_payout: { label: 'Prijs', color: '#FFD700', prefix: '+' },
  marketplace_sale: { label: 'Verkoop', color: '#00FF87', prefix: '+' },
  marketplace_purchase: { label: 'Aankoop', color: '#EF4444', prefix: '-' },
  powerup_purchase: { label: 'Power-up', color: '#9B59B6', prefix: '-' },
  pack_purchase: { label: 'Pack', color: '#F97316', prefix: '-' },
  refund: { label: 'Terugbetaling', color: '#00FF87', prefix: '+' },
}

const typeFilters: { value: TransactionType | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'deposit', label: 'Stortingen' },
  { value: 'withdrawal', label: 'Opnames' },
  { value: 'prize_payout', label: 'Prijzen' },
  { value: 'marketplace_sale', label: 'Verkopen' },
  { value: 'marketplace_purchase', label: 'Aankopen' },
]

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [filter, setFilter] = useState<TransactionType | 'all'>('all')

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter)

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {typeFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${
              filter === f.value ? 'bg-[#00FF87] text-[#0A0E1A]' : 'bg-[#1E2A45] text-gray-400 hover:bg-[#2D3A55]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">Geen transacties gevonden</div>
      ) : (
        <div className="divide-y divide-[#1E2A45]">
          {filtered.map(tx => {
            const config = typeConfig[tx.type] ?? { label: tx.type, color: '#9CA3AF', prefix: '' }
            const isPositive = config.prefix === '+'
            return (
              <div key={tx.id} className="py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${config.color}20` }}>
                  <span className="text-sm font-bold" style={{ color: config.color }}>{config.prefix}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{config.label}</p>
                  <p className="text-xs text-gray-500 truncate">{tx.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-sm ${isPositive ? 'text-[#00FF87]' : 'text-red-400'}`}>
                    {config.prefix}{Math.abs(tx.amount).toFixed(2)} cr
                  </p>
                  <p className="text-xs text-gray-600">{format(new Date(tx.created_at), 'd MMM HH:mm', { locale: nl })}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  tx.status === 'completed' ? 'bg-[#00FF87]/10 text-[#00FF87]' :
                  tx.status === 'pending' ? 'bg-[#F97316]/10 text-[#F97316]' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {tx.status === 'completed' ? '✓' : tx.status === 'pending' ? '⏳' : '✗'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
