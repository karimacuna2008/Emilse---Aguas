import { useState } from 'react'
import { formatLongDate } from '../../lib/deliveryDates'

export default function PorEntregarSummary({ day }) {
  const [open, setOpen] = useState(true)
  if (!day || !day.products.length) return null
  return (
    <div className="border border-brand-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full bg-brand-700 text-white px-3 py-2 flex justify-between items-center font-semibold">
        <span>Por entregar</span>
        <span className="flex items-center gap-2 text-brand-100 text-sm">
          {formatLongDate(day.date)} <span>{open ? '▾' : '▸'}</span>
        </span>
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-2 p-2 bg-brand-50">
          {day.products.map(p => (
            <div key={p.name} className="bg-white border border-brand-100 rounded-lg p-2 text-center">
              <div className="text-2xl font-extrabold text-brand-700 leading-none">{p.qty}</div>
              <div className="text-xs text-brand-900 mt-1">{p.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
