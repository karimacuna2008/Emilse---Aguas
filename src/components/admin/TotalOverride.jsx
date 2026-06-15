import { useState } from 'react'

export default function TotalOverride({ total, personalizado, calculado, onSet, onReset }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(total))

  if (editing) {
    return (
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 flex flex-col gap-2">
        <label className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Total a cobrar</label>
        <input aria-label="total" type="number" inputMode="decimal" value={value}
          onChange={e => setValue(e.target.value)}
          className="border border-surface-border rounded-lg px-3 py-2 text-brand-900 font-bold" />
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg border border-surface-border text-brand-900">Cancelar</button>
          <button onClick={() => { onSet(Number(value)); setEditing(false) }} className="px-3 py-1.5 rounded-lg bg-brand-700 text-white font-semibold">Guardar total</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-brand-50 border border-brand-100 rounded-xl p-3">
      <div className="flex justify-between items-center">
        <span className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Total a cobrar</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-brand-900">${Number(total).toFixed(0)}</span>
          {personalizado && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-900 border border-brand-200 font-semibold">✎ personalizado</span>}
        </div>
      </div>
      <div className="flex justify-between items-center mt-1.5 text-sm">
        <span className="text-gray-400">Calculado: ${Number(calculado).toFixed(0)}</span>
        {personalizado
          ? <button onClick={onReset} className="text-brand-700 underline font-semibold">Volver al calculado</button>
          : <button onClick={() => { setValue(String(total)); setEditing(true) }} className="text-brand-700 underline font-semibold">Editar total ✎</button>}
      </div>
    </div>
  )
}
