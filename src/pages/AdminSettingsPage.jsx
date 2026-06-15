import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSettings } from '../hooks/useAppSettings'

const DAYS = [['L',1],['M',2],['M',3],['J',4],['V',5],['S',6],['D',7]]

export default function AdminSettingsPage() {
  const navigate = useNavigate()
  const { config, loading, saveSettings } = useAppSettings()
  const [weekdays, setWeekdays] = useState(config.weekdays)
  const [cutoffTime, setCutoff] = useState(config.cutoffTime)
  const [cancelTime, setCancel] = useState(config.cancelTime)
  const [saved, setSaved] = useState(false)

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>
  const toggle = (n) => { setSaved(false); setWeekdays(w => w.includes(n) ? w.filter(x => x !== n) : [...w, n]) }

  async function save() {
    const { error } = await saveSettings({ weekdays, cutoffTime, cancelTime })
    if (!error) setSaved(true)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-5">
      <button onClick={() => navigate('/admin/pedidos')} className="text-brand-700 font-semibold self-start">← Pedidos</button>
      <h1 className="text-2xl font-bold text-brand-900">Configuración</h1>

      <div>
        <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Días de entrega</div>
        <div className="flex gap-1.5">
          {DAYS.map(([lbl, n], idx) => (
            <button key={idx} aria-label={lbl} onClick={() => toggle(n)}
              className={`w-9 h-9 rounded-lg font-bold border ${weekdays.includes(n) ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-gray-400 border-surface-border'}`}>{lbl}</button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Días que el cliente puede elegir para recibir su pedido.</p>
      </div>

      <div className="bg-white border border-surface-border rounded-xl p-3">
        <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Horarios de corte</div>
        <label className="flex justify-between items-center py-2 border-b border-dashed border-surface-border">
          <span>Corte para pedir <span className="block text-xs text-gray-400">Hasta esta hora del día anterior</span></span>
          <input type="time" value={cutoffTime} onChange={e => { setSaved(false); setCutoff(e.target.value) }} className="border border-surface-border rounded-lg px-2 py-1.5 font-bold" />
        </label>
        <label className="flex justify-between items-center py-2">
          <span>Corte para cancelar <span className="block text-xs text-gray-400">Hasta esta hora del día de entrega</span></span>
          <input type="time" value={cancelTime} onChange={e => { setSaved(false); setCancel(e.target.value) }} className="border border-surface-border rounded-lg px-2 py-1.5 font-bold" />
        </label>
      </div>

      <button onClick={save} className="bg-brand-700 text-white rounded-xl py-3 font-bold">Guardar configuración</button>
      {saved && <p className="text-center text-brand-700 text-sm">✓ Guardado</p>}
    </div>
  )
}
