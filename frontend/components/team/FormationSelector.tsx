'use client'

import { Formation } from '@/types'

const formations: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '4-5-1', '5-3-2', '3-4-3']

interface FormationSelectorProps {
  value: Formation
  onChange: (f: Formation) => void
}

export function FormationSelector({ value, onChange }: FormationSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {formations.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-3 py-1.5 rounded-lg text-sm font-mono font-semibold transition-all ${
            value === f
              ? 'bg-[#00FF87] text-[#0A0E1A]'
              : 'bg-[#1E2A45] text-gray-300 hover:bg-[#2D3A55]'
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  )
}
