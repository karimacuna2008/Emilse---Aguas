import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useOrders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .order('created_at', { ascending: false })
    setError(error ? error.message : null)
    setOrders(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function deliver(orderId) {
    const { error } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId)
    if (error) { setError(error.message); return { error } }
    await fetch()
    return { error: null }
  }

  async function cancel(orderId) {
    const { error } = await supabase.rpc('cancelar_pedido', { p_order_id: orderId })
    if (error) { setError(error.message); return { error } }
    await fetch()
    return { error: null }
  }

  return { orders, loading, error, deliver, cancel }
}
