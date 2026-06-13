import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useOrders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function deliver(orderId) {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId)
    await fetch()
  }

  async function cancel(orderId) {
    await supabase.rpc('cancelar_pedido', { p_order_id: orderId })
    await fetch()
  }

  return { orders, loading, deliver, cancel }
}
