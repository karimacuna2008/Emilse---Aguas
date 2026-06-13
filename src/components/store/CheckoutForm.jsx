import { useState } from 'react'

export default function CheckoutForm({ onSubmit, loading, raceError }) {
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!name.trim())  e.name  = 'El nombre es requerido'
    if (!phone.trim()) e.phone = 'El teléfono es requerido'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    onSubmit({ name: name.trim(), phone: phone.trim(), notes: notes.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {raceError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {raceError}
        </div>
      )}
      <div>
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Tu nombre"
          className="w-full border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <input
          value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="Tu teléfono"
          type="tel"
          className="w-full border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700"
        />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
      </div>
      <textarea
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Dirección o indicaciones (opcional)"
        rows={3}
        className="w-full border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700 resize-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {loading ? 'Procesando...' : 'Confirmar pedido'}
      </button>
    </form>
  )
}
