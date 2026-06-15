import { useState } from 'react'

export default function AddProductPicker({ products, onAdd, onClose }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const [qty, setQty] = useState(1)
  const list = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end" onClick={onClose}>
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-4 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
        <input autoFocus placeholder="Buscar producto…" value={q} onChange={e => setQ(e.target.value)}
          className="border border-surface-border rounded-lg px-3 py-2" />
        <div className="max-h-56 overflow-y-auto flex flex-col gap-1">
          {list.map(p => (
            <button key={p.id} onClick={() => setSel(p)}
              className={`text-left px-3 py-2 rounded-lg border ${sel?.id === p.id ? 'border-brand-700 bg-brand-50' : 'border-surface-border'}`}>
              <span className="text-brand-900">{p.name}</span>
              <span className="text-gray-400 text-sm"> · ${Number(p.price).toFixed(0)} · {p.stock} en stock</span>
            </button>
          ))}
          {!list.length && <p className="text-center text-gray-400 py-4">Sin resultados.</p>}
        </div>
        {sel && (
          <div className="flex items-center justify-between border-t border-surface-border pt-3">
            <div className="flex items-center border border-surface-border rounded-lg">
              <button aria-label="−" onClick={() => setQty(n => Math.max(1, n - 1))} className="w-10 h-10 text-brand-700 text-xl font-bold">−</button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <button aria-label="+" onClick={() => setQty(n => Math.min(sel.stock, n + 1))} className="w-10 h-10 text-brand-700 text-xl font-bold">+</button>
            </div>
            <button onClick={() => onAdd(sel.id, qty)} className="bg-brand-700 text-white px-4 py-2 rounded-lg font-semibold">Agregar</button>
          </div>
        )}
      </div>
    </div>
  )
}
