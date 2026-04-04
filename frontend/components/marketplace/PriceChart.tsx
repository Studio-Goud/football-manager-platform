'use client'

import { PricePoint } from '@/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface PriceChartProps {
  data: PricePoint[]
  playerName?: string
}

export function PriceChart({ data, playerName }: PriceChartProps) {
  const formatted = data.map(d => ({
    date: format(new Date(d.date), 'd MMM', { locale: nl }),
    price: d.price,
  }))

  const min = Math.min(...data.map(d => d.price))
  const max = Math.max(...data.map(d => d.price))
  const trend = data.length > 1 ? data[data.length - 1].price - data[0].price : 0

  return (
    <div className="bg-[#0A0E1A] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold">{playerName ? `${playerName} — Prijsgeschiedenis` : 'Prijsgeschiedenis'}</p>
          <p className="text-xs text-gray-500">Afgelopen 14 dagen</p>
        </div>
        <span className={`text-sm font-bold ${trend >= 0 ? 'text-[#00FF87]' : 'text-red-400'}`}>
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)} cr
        </span>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2A45" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis domain={[min * 0.95, max * 1.05]} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: '#0F1629', border: '1px solid #1E2A45', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [`${value.toFixed(1)} cr`, 'Prijs']}
              labelStyle={{ color: '#9CA3AF' }}
              itemStyle={{ color: '#00FF87' }}
            />
            <Line type="monotone" dataKey="price" stroke="#00FF87" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#00FF87' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
