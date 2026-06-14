// src/pages/CheckoutPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import CheckoutForm from '../components/store/CheckoutForm'
import OrderConfirmation from '../components/store/OrderConfirmation'
import OpenOrderChoice from '../components/store/OpenOrderChoice'
import Cart from '../components/store/Cart'
import Layout from '../components/shared/Layout'

export default function CheckoutPage() {
  const { items, total, removeItem, updateQuantity, clearCart } = useCart()
  const [step, setStep] = useState('cart')          // cart | form | choice | done
  const [loading, setLoading] = useState(false)
  const [raceError, setRaceError] = useState(null)
  const [orderNumber, setOrderNumber] = useState('')
  const [openOrder, setOpenOrder] = useState(null)
  const navigate = useNavigate()

  const payload = () => items.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
  const finish = (num) => { clearCart(); setOrderNumber(num); setStep('done') }

  async function createOrder(data) {
    setLoading(true); setRaceError(null)
    const { data: res, error } = await supabase.rpc('crear_pedido', {
      p_customer_name: data.name, p_customer_phone: data.phone, p_notes: data.notes,
      p_delivery_date: data.delivery_date, p_items: payload(),
    })
    setLoading(false)
    if (error) { setRaceError('Ocurrió un error. Inténtalo de nuevo.'); return }
    if (res?.error === 'out_of_stock') {
      setRaceError(`Alguien más tomó el último ${res.product_name}. Por favor, elige otra opción para continuar.`); return
    }
    if (res?.error) { setRaceError('No se pudo crear el pedido. Revisa tus datos e inténtalo de nuevo.'); return }
    finish(res.order_number)
  }

  async function handleFormSubmit(data) {
    setLoading(true); setRaceError(null)
    const { data: open, error } = await supabase.rpc('buscar_pedido_abierto', {
      p_phone: data.phone, p_delivery_date: data.delivery_date,
    })
    setLoading(false)
    if (!error && open?.found && open.order_id) {
      setOpenOrder({ ...open, _form: data })
      setStep('choice')
      return
    }
    createOrder(data)
  }

  async function addToOpen() {
    setLoading(true); setRaceError(null)
    const { data: res, error } = await supabase.rpc('agregar_a_pedido', {
      p_order_id: openOrder.order_id, p_items: payload(),
    })
    setLoading(false)
    if (error || res?.error) { setRaceError('No se pudo sumar al pedido. Inténtalo de nuevo.'); return }
    finish(openOrder.order_number)
  }

  if (step === 'done') {
    return (
      <Layout>
        <div className="max-w-md mx-auto px-4 py-8">
          <OrderConfirmation orderNumber={orderNumber} onTrack={() => navigate(`/pedido/${orderNumber}`)} />
        </div>
      </Layout>
    )
  }

  const title = step === 'cart' ? '🛒 Tu carrito' : step === 'form' ? '📋 Tus datos' : '📦 Pedido abierto'

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-brand-900">{title}</h1>

        {step === 'cart' && (
          <>
            <Cart items={items} total={total} onRemove={removeItem} onUpdateQty={updateQuantity} onCheckout={() => setStep('form')} />
            <button onClick={() => navigate('/')} className="text-brand-700 underline text-sm text-center">← Seguir comprando</button>
          </>
        )}

        {step === 'form' && (
          <>
            <CheckoutForm onSubmit={handleFormSubmit} loading={loading} raceError={raceError} />
            <button onClick={() => setStep('cart')} className="text-brand-700 underline text-sm text-center">← Volver al carrito</button>
          </>
        )}

        {step === 'choice' && openOrder && (
          <>
            {raceError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{raceError}</div>}
            <OpenOrderChoice
              openOrder={openOrder} loading={loading}
              onAddToOpen={addToOpen}
              onCreateNew={() => createOrder(openOrder._form)}
            />
            <button onClick={() => setStep('form')} className="text-brand-700 underline text-sm text-center">← Volver a datos</button>
          </>
        )}
      </div>
    </Layout>
  )
}
