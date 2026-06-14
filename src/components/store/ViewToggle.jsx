// src/components/store/ViewToggle.jsx
export default function ViewToggle({ view, onChange }) {
  const btn = (v, label, glyph) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={view === v}
      onClick={() => onChange(v)}
      className={`px-3 py-2 text-lg ${view === v ? 'bg-brand-700 text-white' : 'bg-white text-brand-700'}`}
    >{glyph}</button>
  )
  return (
    <div className="flex border border-brand-200 rounded-lg overflow-hidden shrink-0">
      {btn('lista', 'Vista lista', '≣')}
      {btn('tarjetas', 'Vista tarjetas', '▦')}
    </div>
  )
}
