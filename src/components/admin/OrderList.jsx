import OrderCard from './OrderCard'

export default function OrderList({ orders, onOpen }) {
  if (!orders.length) return <p className="text-center text-gray-400 py-8">Sin pedidos.</p>
  return (
    <div className="flex flex-col gap-2">
      {orders.map(o => <OrderCard key={o.id} order={o} onOpen={onOpen} />)}
    </div>
  )
}
