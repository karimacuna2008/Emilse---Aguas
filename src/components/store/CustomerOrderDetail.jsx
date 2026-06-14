// src/components/store/CustomerOrderDetail.jsx
import { buildWhatsAppLink, orderHelpMessage } from '../../lib/whatsapp'

const STATUS = {
  pending:   { label: 'Pendiente', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  delivered: { label: 'Entregado', color: 'text-green-700 bg-green-50 border-green-200' },
  cancelled: { label: 'Cancelado', color: 'text-red-600 bg-red-50 border-red-200' },
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function CustomerOrderDetail({ order, canCancel, onCancel, onBack }) {
  const s = STATUS[order.status] ?? STATUS.pending
  const helpHref = buildWhatsAppLink(orderHelpMessage(order.order_number), import.meta.env.VITE_WHATSAPP_NUMBER)

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="text-brand-700 underline text-sm self-start">← Mis pedidos</button>

      <div className="text-center">
        <p className="text-3xl font-bold text-brand-700">{order.order_number}</p>
        <span className={`inline-block mt-2 text-sm px-3 py-1 rounded-full border ${s.color}`}>{s.label}</span>
      </div>

      <div className="bg-white border border-brand-100 rounded-2xl p-4 text-sm">
        <p><span className="text-gray-400">Entrega:</span> {formatDate(order.delivery_date)}</p>
      </div>

      <div className="bg-white border border-brand-100 rounded-2xl p-4">
        <p className="font-semibold text-brand-900 mb-2">Productos</p>
        {order.items.map((it, idx) => (
          <div key={idx} className="flex justify-between text-sm py-1 border-b border-surface-border last:border-0">
            <span>{it.name} × {it.quantity}</span>
            <span className="text-brand-700">${(it.unit_price * it.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2 mt-1 font-semibold text-brand-900">
          <span>Total</span><span className="text-brand-700">${Number(order.total).toFixed(2)}</span>
        </div>
      </div>

      <a href={helpHref} target="_blank" rel="noopener noreferrer"
         className="w-full text-center bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl">
        💬 Pedir ayuda con este pedido
      </a>

      <button
        onClick={onCancel} disabled={!canCancel}
        className="w-full border border-red-300 text-red-600 font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Cancelar pedido
      </button>
      {!canCancel && <p className="text-xs text-gray-400 text-center -mt-2">Ya no se puede cancelar (pasó el horario de corte).</p>}
    </div>
  )
}
