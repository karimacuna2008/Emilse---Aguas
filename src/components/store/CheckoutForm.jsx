// src/components/store/CheckoutForm.jsx
import { useState, useMemo, useEffect } from 'react'
import { useAppSettings } from '../../hooks/useAppSettings'
import { getDeliveryDateOptions } from '../../lib/deliveryDates'
import DeliveryDatePicker from './DeliveryDatePicker'

const PHONE_KEY = 'emi_phone'

export default function CheckoutForm({ onSubmit, loading, raceError }) {
  const { config } = useAppSettings()
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_KEY) || '')
  const [notes, setNotes] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(null)
  const [errors, setErrors] = useState({})

  const options = useMemo(() => getDeliveryDateOptions(new Date(), config), [config])
  useEffect(() => {
    if (!deliveryDate) {
      const first = options.find(o => o.available)
      if (first) setDeliveryDate(first.iso)
    }
  }, [options, deliveryDate])

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'El nombre es requerido'
    const digits = phone.replace(/[\s-]/g, '')
    if (!digits) e.phone = 'El teléfono es requerido'
    else if (!/^\d{10}$/.test(digits)) e.phone = 'El teléfono debe tener 10 dígitos'
    if (!deliveryDate) e.date = 'Selecciona una fecha de entrega'
    return e
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    const digits = phone.replace(/[\s-]/g, '')
    localStorage.setItem(PHONE_KEY, digits)
    onSubmit({ name: name.trim(), phone: digits, notes: notes.trim(), delivery_date: deliveryDate })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {raceError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{raceError}</div>
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
          placeholder="Tu teléfono (10 dígitos)" type="tel" inputMode="numeric"
          className="w-full border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700"
        />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
      </div>

      <div>
        <DeliveryDatePicker options={options} value={deliveryDate} onChange={setDeliveryDate} cutoffTime={config.cutoffTime} />
        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
      </div>

      <textarea
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Dirección o indicaciones (opcional)" rows={3}
        className="w-full border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700 resize-none"
      />
      <button
        type="submit" disabled={loading}
        className="bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {loading ? 'Procesando...' : 'Confirmar pedido'}
      </button>
    </form>
  )
}
