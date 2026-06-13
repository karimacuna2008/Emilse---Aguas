import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../hooks/useCart'
import CheckoutForm from '../components/store/CheckoutForm'
import OrderConfirmation from '../components/store/OrderConfirmation'
import Cart from '../components/store/Cart'
import Layout from '../components/shared/Layout'

export default function CheckoutPage() {
  const { items, total, removeItem, updateQuantity, clearCart } = useCart()
  const [step, setStep]           = useState('cart')   // 'cart' | 'form' | 'done'
  const [loading, setLoading]     = useState(false)
  const [raceError, setRaceError] = useState(null)
  const [orderNumber, setOrderNumber] = useState('')
  const navigate = useNavigate()

  async function handleSubmit({ name, phone, notes }) {
    setLoading(true)
    setRaceError(null)
    const { data, error } = await supabase.rpc('crear_pedido', {
      p_customer_name:  name,
      p_customer_phone: phone,
      p_notes:          notes,
      p_items:          items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
    })

    setLoading(false)

    if (error) { setRaceError('Ocurrió un error. Inténtalo de nuevo.'); return }

    if (data.error === 'out_of_stock') {
      setRaceError(
        `Alguien más tomó el último ${data.product_name}. Por favor, elige otra opción para continuar.`
      )
      return
    }

    clearCart()
    setOrderNumber(data.order_number)
    setStep('done')
  }

  if (step === 'done') {
    return (
      <Layout>
        <div className="max-w-md mx-auto px-4 py-8">
          <OrderConfirmation
            orderNumber={orderNumber}
            onTrack={() => navigate(`/pedido/${orderNumber}`)}
          />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-brand-900">
          {step === 'cart' ? '🛒 Tu carrito' : '📋 Tus datos'}
        </h1>

        {step === 'cart' && (
          <>
            <Cart
              items={items} total={total}
              onRemove={removeItem} onUpdateQty={updateQuantity}
              onCheckout={() => setStep('form')}
            />
            <button onClick={() => navigate('/')} className="text-brand-700 underline text-sm text-center">
              ← Seguir comprando
            </button>
          </>
        )}

        {step === 'form' && (
          <>
            <CheckoutForm onSubmit={handleSubmit} loading={loading} raceError={raceError} />
            <button onClick={() => setStep('cart')} className="text-brand-700 underline text-sm text-center">
              ← Volver al carrito
            </button>
          </>
        )}
      </div>
    </Layout>
  )
}
