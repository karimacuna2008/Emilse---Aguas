import OrderCard from './OrderCard'

export default function OrderList({ orders, filter, onDeliver, onCancel }) {
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  if (!filtered.length) return <p className="text-center text-gray-400 py-8">Sin pedidos.</p>
  return (
    <div className="flex flex-col gap-3">
      {filtered.map(o => (
        <OrderCard key={o.id} order={o} onDeliver={onDeliver} onCancel={onCancel} />
      ))}
    </div>
  )
}
