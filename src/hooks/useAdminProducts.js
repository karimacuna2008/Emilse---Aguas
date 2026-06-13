import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name')
    setError(error ? error.message : null)
    setProducts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function saveProduct(product) {
    const { error } = product.id
      ? await supabase.from('products').update(product).eq('id', product.id)
      : await supabase.from('products').insert(product)
    if (error) { setError(error.message); return { error } }
    await fetch()
    return { error: null }
  }

  async function toggleActive(id, active) {
    const { error } = await supabase.from('products').update({ active }).eq('id', id)
    if (error) { setError(error.message); return { error } }
    await fetch()
    return { error: null }
  }

  async function addStock(id, units) {
    const { error } = await supabase.rpc('add_stock', { p_product_id: id, p_units: units })
    if (error) { setError(error.message); return { error } }
    await fetch()
    return { error: null }
  }

  return { products, loading, error, saveProduct, toggleActive, addStock, refetch: fetch }
}
