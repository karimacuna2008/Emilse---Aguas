import { useState } from 'react'
import { useOrders } from '../hooks/useOrders'
import OrderList from '../components/admin/OrderList'

const FILTERS = [
  { value: 'pending',   label: 'Pendientes' },
  { value: 'delivered', label: 'Entregados' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'all',       label: 'Todos'      },
]

export default function AdminOrdersPage() {
  const { orders, loading, deliver, cancel } = useOrders()
  const [filter, setFilter] = useState('pending')

  const pendingCount = orders.filter(o => o.status === 'pending').length

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-brand-900">
        Pedidos {pendingCount > 0 && <span className="text-base bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full ml-1">{pendingCount}</span>}
      </h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${filter === f.value ? 'bg-brand-700 text-white' : 'bg-white border border-surface-border text-brand-900'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <OrderList orders={orders} filter={filter} onDeliver={deliver} onCancel={cancel} />
    </div>
  )
}
