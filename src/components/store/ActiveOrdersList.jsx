// src/components/store/ActiveOrdersList.jsx
function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function ActiveOrdersList({ orders, onSelect }) {
  if (!orders.length) {
    return <p className="text-center text-gray-400 py-12">No tienes pedidos activos.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {orders.map(o => (
        <button
          key={o.order_number}
          onClick={() => onSelect(o)}
          className="text-left bg-white border border-brand-100 rounded-2xl p-4 flex items-center justify-between hover:border-brand-700 transition-colors"
        >
          <div>
            <p className="font-bold text-brand-700">{o.order_number}</p>
            <p className="text-sm text-gray-500">Entrega: {formatDate(o.delivery_date)}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">Pendiente</span>
          </div>
          <div className="text-right">
            <p className="font-bold text-brand-900">${Number(o.total).toFixed(2)}</p>
            <span className="text-brand-700">›</span>
          </div>
        </button>
      ))}
    </div>
  )
}
