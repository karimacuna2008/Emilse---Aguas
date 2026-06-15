import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrders } from '../hooks/useOrders'
import { buildPendingSummary, defaultPendingDate } from '../lib/pendingSummary'
import { toISODate } from '../lib/deliveryDates'
import OrderList from '../components/admin/OrderList'
import PorEntregarSummary from '../components/admin/PorEntregarSummary'
import OrderDateNav from '../components/admin/OrderDateNav'

const HIST = [
  { value:'delivered', label:'Entregados' },
  { value:'cancelled', label:'Cancelados' },
  { value:'all',       label:'Todos' },
]

export default function AdminOrdersPage() {
  const { orders, loading, error } = useOrders()
  const navigate = useNavigate()
  const today = toISODate(new Date())
  const summary = useMemo(() => buildPendingSummary(orders), [orders])
  const [active, setActive] = useState(null)
  const [history, setHistory] = useState(false)
  const [histFilter, setHistFilter] = useState('delivered')

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  const activeDate = active ?? defaultPendingDate(summary, today)
  const open = (id) => navigate(`/admin/pedidos/${id}`)
  const pendingOfDay = orders.filter(o => o.status === 'pending' && o.delivery_date === activeDate)
  const histList = histFilter === 'all'
    ? orders.filter(o => o.status !== 'pending')
    : orders.filter(o => o.status === histFilter)

  return (
    <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-900">Pedidos</h1>
        <button aria-label="Configuración" onClick={() => navigate('/admin/configuracion')} className="text-2xl">⚙️</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {!history ? (
        <>
          {summary.dates.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay pedidos pendientes.</p>
          ) : (
            <>
              <OrderDateNav dates={summary.dates} active={activeDate} today={today} onChange={setActive} />
              <PorEntregarSummary day={summary.byDate[activeDate]} />
              <OrderList orders={pendingOfDay} onOpen={open} />
            </>
          )}
          <button onClick={() => setHistory(true)} className="text-brand-700 underline text-center mt-1">Ver entregados / cancelados</button>
        </>
      ) : (
        <>
          <button onClick={() => setHistory(false)} className="text-brand-700 font-semibold self-start">← Pendientes</button>
          <div className="flex gap-2">
            {HIST.map(f => (
              <button key={f.value} onClick={() => setHistFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${histFilter === f.value ? 'bg-brand-700 text-white' : 'bg-white border border-surface-border text-brand-900'}`}>{f.label}</button>
            ))}
          </div>
          <OrderList orders={histList} onOpen={open} />
        </>
      )}
    </div>
  )
}
