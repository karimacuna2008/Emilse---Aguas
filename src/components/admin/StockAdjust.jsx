import { useState } from 'react'

export default function StockAdjust({ product, onAdjust }) {
  const [units, setUnits] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const n = parseInt(units, 10)
    if (!n || n <= 0) return
    await onAdjust(product.id, n)
    setUnits('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="number" min="1" value={units} onChange={e => setUnits(e.target.value)}
        placeholder="Unidades"
        className="w-24 border border-surface-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-700"
      />
      <button type="submit" className="bg-brand-700 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-brand-900">
        + Sumar
      </button>
    </form>
  )
}
