import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useOrders } from '../hooks/useOrders'
import { useProducts } from '../hooks/useProducts'
import { formatWeekday, formatLongDate } from '../lib/deliveryDates'
import OrderItemEditor from '../components/admin/OrderItemEditor'
import AddProductPicker from '../components/admin/AddProductPicker'
import TotalOverride from '../components/admin/TotalOverride'

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { orders, loading, error, addItems, removeItem, markDelivered, setTotal, recalcTotal, cancel } = useOrders()
  const { products } = useProducts()
  const [picking, setPicking] = useState(false)

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>
  const order = orders.find(o => o.id === id)
  if (!order) return (
    <div className="max-w-lg mx-auto px-4 py-6 text-gray-400">
      Pedido no encontrado. <button className="text-brand-700 underline" onClick={() => navigate('/admin/pedidos')}>Volver</button>
    </div>
  )

  const items = order.order_items ?? []
  const calculado = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const isPending = order.status === 'pending'

  async function changeQty(productId, newQty) {
    const it = items.find(i => i.product_id === productId)
    if (newQty <= 0) return removeOne(productId)
    if (newQty > it.quantity) await addItems(order.id, [{ product_id: productId, quantity: newQty - it.quantity }])
    else await removeItem(order.id, productId, it.quantity - newQty)
  }
  async function removeOne(productId) {
    if (items.length === 1) return offerCancel()
    const it = items.find(i => i.product_id === productId)
    await removeItem(order.id, productId, it.quantity)
  }
  async function offerCancel() {
    if (window.confirm('Es el último artículo; el pedido quedaría vacío. ¿Cancelar el pedido?')) {
      await cancel(order.id); navigate('/admin/pedidos')
    }
  }
  async function deliver() { await markDelivered(order.id); navigate('/admin/pedidos') }
  async function cancelOrder() {
    if (window.confirm('¿Cancelar este pedido? Se restaura el stock.')) { await cancel(order.id); navigate('/admin/pedidos') }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-3">
      <button onClick={() => navigate('/admin/pedidos')} className="text-brand-700 font-semibold self-start">← Pedidos</button>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="flex items-center gap-2">
        <span className="text-xl font-extrabold text-brand-700">{order.order_number}</span>
        <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-50 border-yellow-200 text-yellow-700 font-semibold capitalize">{order.status}</span>
      </div>

      <div className="bg-white border border-surface-border rounded-xl p-3">
        <div className="font-semibold text-brand-900">{order.customer_name}</div>
        <div className="text-gray-400">{order.customer_phone}</div>
        {order.notes && <div className="italic text-gray-400">"{order.notes}"</div>}
        <div className="flex justify-between mt-1.5 text-sm">
          <span className="text-gray-400">Entrega</span>
          <span className="capitalize">{formatWeekday(order.delivery_date)} {formatLongDate(order.delivery_date)}</span>
        </div>
      </div>

      <OrderItemEditor items={items} onChangeQty={changeQty} onRemove={removeOne} onRemoveLast={offerCancel} />

      {isPending && (
        <button onClick={() => setPicking(true)} className="border border-dashed border-brand-700 text-brand-700 bg-brand-50 rounded-lg py-2 font-semibold">
          + Agregar producto
        </button>
      )}

      <TotalOverride total={order.total} personalizado={order.total_personalizado} calculado={calculado}
        onSet={(t) => setTotal(order.id, t)} onReset={() => recalcTotal(order.id)} />

      {isPending && (
        <>
          <button onClick={deliver} className="bg-brand-700 text-white rounded-xl py-3 font-bold">✅ Marcar entregado</button>
          <button onClick={cancelOrder} className="border border-red-200 text-red-600 bg-red-50 rounded-xl py-2.5 font-semibold">Cancelar pedido</button>
        </>
      )}

      {picking && <AddProductPicker products={products} onClose={() => setPicking(false)}
        onAdd={async (pid, qty) => { await addItems(order.id, [{ product_id: pid, quantity: qty }]); setPicking(false) }} />}
    </div>
  )
}
