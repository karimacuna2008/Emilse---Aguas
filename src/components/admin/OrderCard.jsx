const STATUS = {
  pending:   { label:'Pendiente', cls:'bg-yellow-50 border-yellow-200 text-yellow-700' },
  delivered: { label:'Entregado', cls:'bg-green-50 border-green-200 text-green-700' },
  cancelled: { label:'Cancelado', cls:'bg-red-50 border-red-200 text-red-600' },
}

export default function OrderCard({ order, onOpen }) {
  const s = STATUS[order.status]
  const items = order.order_items ?? []
  const resumen = items.map(i => `${i.quantity}× ${i.products?.name}`).join(' · ')
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(order.id)}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(order.id) }}
      className="bg-white border border-surface-border rounded-xl px-3 py-2.5 flex items-center gap-3 cursor-pointer hover:border-brand-200">
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-brand-700">{order.order_number}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${s.cls}`}>{s.label}</span>
          {order.total_personalizado && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-900 border border-brand-200 font-semibold">✎ total</span>
          )}
        </div>
        <span className="text-sm text-brand-900 font-medium truncate">
          {order.customer_name} <span className="text-gray-400 font-normal">· {order.customer_phone}</span>
        </span>
        {resumen && <span className="text-xs text-gray-400 truncate">{resumen}</span>}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-lg font-extrabold text-brand-900">${Number(order.total).toFixed(0)}</span>
        <span className="text-gray-300 text-lg leading-none">›</span>
      </div>
    </div>
  )
}
