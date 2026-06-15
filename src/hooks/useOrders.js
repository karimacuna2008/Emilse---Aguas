import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { mapOrderError } from '../lib/orderErrors'

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

  // Ejecuta una RPC que devuelve JSONB {success|error}. Refresca en éxito.
  async function callRpc(fn, args) {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) { setError(error.message); return { error: error.message } }
    if (data?.error) { setError(mapOrderError(data.error, data)); return { error: data.error } }
    setError(null)
    await fetch()
    return { error: null, data }
  }

  const addItems      = (orderId, items)          => callRpc('agregar_a_pedido',        { p_order_id: orderId, p_items: items })
  const removeItem    = (orderId, productId, qty) => callRpc('quitar_de_pedido',        { p_order_id: orderId, p_product_id: productId, p_quantity: qty })
  const markDelivered = (orderId)                 => callRpc('marcar_entregado',        { p_order_id: orderId })
  const setTotal      = (orderId, total)          => callRpc('set_total_pedido',        { p_order_id: orderId, p_total: total })
  const recalcTotal   = (orderId)                 => callRpc('recalcular_total_pedido', { p_order_id: orderId })
  const cancel        = (orderId)                 => callRpc('cancelar_pedido',         { p_order_id: orderId })

  return { orders, loading, error, fetch, addItems, removeItem, markDelivered, setTotal, recalcTotal, cancel }
}
