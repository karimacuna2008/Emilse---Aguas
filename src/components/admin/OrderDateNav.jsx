import { formatWeekday, formatLongDate } from '../../lib/deliveryDates'

export default function OrderDateNav({ dates, active, today, onChange }) {
  const i = dates.indexOf(active)
  const go = (delta) => { const n = i + delta; if (n >= 0 && n < dates.length) onChange(dates[n]) }
  const label = active === today ? 'Hoy' : formatWeekday(active)
  return (
    <div className="flex justify-between items-center bg-white border border-surface-border rounded-xl px-2 py-2">
      <button aria-label="anterior" disabled={i <= 0} onClick={() => go(-1)}
        className="w-9 h-9 rounded-lg border border-surface-border text-brand-700 font-bold disabled:opacity-30">‹</button>
      <div className="text-center leading-tight">
        <div className="font-bold text-brand-900 capitalize">{label}</div>
        <div className="text-xs text-gray-400 capitalize">{formatWeekday(active)} {formatLongDate(active)}</div>
      </div>
      <button aria-label="siguiente" disabled={i >= dates.length - 1} onClick={() => go(1)}
        className="w-9 h-9 rounded-lg border border-surface-border text-brand-700 font-bold disabled:opacity-30">›</button>
    </div>
  )
}
