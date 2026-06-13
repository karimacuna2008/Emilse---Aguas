import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import OrderTracker from '../components/store/OrderTracker'
import Layout from '../components/shared/Layout'

export default function OrderStatusPage() {
  const { code } = useParams()
  const [order, setOrder]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!code) return
    supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .eq('order_number', code.toUpperCase())
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else setOrder(data)
        setLoading(false)
      })
  }, [code])

  if (loading) return <Layout><div className="text-center py-16 text-gray-400">Buscando pedido...</div></Layout>

  if (notFound) return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-semibold text-brand-900">Pedido no encontrado</p>
        <p className="text-gray-400 text-sm mt-1">Verifica el código e intenta de nuevo.</p>
        <Link to="/" className="mt-4 inline-block text-brand-700 underline text-sm">← Volver al inicio</Link>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-brand-900">Estado del pedido</h1>
        <OrderTracker order={order} />
        <Link to="/" className="text-brand-700 underline text-sm text-center">← Volver a la tienda</Link>
      </div>
    </Layout>
  )
}
