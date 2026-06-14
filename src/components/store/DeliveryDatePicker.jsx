// src/components/store/DeliveryDatePicker.jsx
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function DeliveryDatePicker({ options, value, onChange, cutoffTime = '20:00' }) {
  return (
    <div>
      <p className="text-sm font-medium text-brand-900 mb-2">Fecha de entrega</p>
      <div className="grid grid-cols-5 gap-2">
        {options.map(o => {
          const selected = o.iso === value
          return (
            <button
              type="button"
              key={o.iso}
              disabled={!o.available}
              onClick={() => o.available && onChange(o.iso)}
              className={`flex flex-col items-center rounded-xl py-2 border text-sm ${
                !o.available
                  ? 'opacity-40 cursor-not-allowed border-surface-border bg-gray-50'
                  : selected
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-brand-900 border-brand-200'
              }`}
            >
              <span className="text-xs">{DOW[o.date.getDay()]}</span>
              <span className="font-bold text-base">{o.date.getDate()}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-2">Pide antes de las {cutoffTime} del día anterior.</p>
    </div>
  )
}
