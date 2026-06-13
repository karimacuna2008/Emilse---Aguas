const STATUS_LABEL = {
  pending:   { label: 'Pendiente',  emoji: '⏳', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  delivered: { label: 'Entregado',  emoji: '✅', color: 'text-green-700 bg-green-50 border-green-200' },
  cancelled: { label: 'Cancelado',  emoji: '✕',  color: 'text-red-600 bg-red-50 border-red-200' },
}

export default function OrderTracker({ order }) {
  const s = STATUS_LABEL[order.status]
  return (
    <div className="flex flex-col gap-4">
      <div className={`border rounded-2xl p-4 text-center ${s.color}`}>
        <p className="text-3xl mb-1">{s.emoji}</p>
        <p className="font-bold text-lg">{s.label}</p>
      </div>
      <div className="bg-white border border-brand-100 rounded-2xl p-4 text-sm flex flex-col gap-2">
        <p><span className="text-gray-400">Pedido:</span> <span className="font-bold text-brand-700">{order.order_number}</span></p>
        <p><span className="text-gray-400">Nombre:</span> {order.customer_name}</p>
        <p><span className="text-gray-400">Total:</span> ${Number(order.total).toFixed(2)}</p>
        {order.notes && <p><span className="text-gray-400">Notas:</span> {order.notes}</p>}
      </div>
      {order.order_items && (
        <div className="bg-white border border-brand-100 rounded-2xl p-4">
          <p className="font-semibold text-brand-900 mb-2">Productos</p>
          {order.order_items.map(item => (
            <div key={item.id} className="flex justify-between text-sm py-1 border-b border-surface-border last:border-0">
              <span>{item.products?.name} × {item.quantity}</span>
              <span className="text-brand-700">${(item.unit_price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
