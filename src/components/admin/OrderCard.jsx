const STATUS = {
  pending:   { label: 'Pendiente',  bg: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  delivered: { label: 'Entregado',  bg: 'bg-green-50  border-green-200  text-green-700'  },
  cancelled: { label: 'Cancelado',  bg: 'bg-red-50    border-red-200    text-red-600'    },
}

export default function OrderCard({ order, onDeliver, onCancel }) {
  const s = STATUS[order.status]
  return (
    <div className="bg-white border border-brand-100 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="font-bold text-brand-700 text-lg">{order.order_number}</span>
        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${s.bg}`}>{s.label}</span>
      </div>
      <div className="text-sm text-gray-600">
        <p className="font-medium text-brand-900">{order.customer_name}</p>
        <p>{order.customer_phone}</p>
        {order.notes && <p className="text-gray-400 italic">{order.notes}</p>}
      </div>
      {order.order_items?.length > 0 && (
        <div className="border-t border-surface-border pt-2 text-sm">
          {order.order_items.map(item => (
            <p key={item.id} className="flex justify-between">
              <span>{item.products?.name} × {item.quantity}</span>
              <span className="text-brand-700">${(item.unit_price * item.quantity).toFixed(2)}</span>
            </p>
          ))}
        </div>
      )}
      <div className="flex justify-between items-center border-t border-surface-border pt-2">
        <span className="font-bold text-brand-900">${Number(order.total).toFixed(2)}</span>
        {order.status === 'pending' && (
          <div className="flex gap-2">
            <button onClick={() => onDeliver(order.id)}
              className="bg-brand-700 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-brand-900">
              ✅ Entregar
            </button>
            <button onClick={() => onCancel(order.id)}
              className="bg-red-100 text-red-700 text-sm px-3 py-1.5 rounded-lg hover:bg-red-200">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
