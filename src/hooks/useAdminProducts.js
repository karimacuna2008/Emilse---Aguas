import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name')
    setProducts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function saveProduct(product) {
    if (product.id) {
      await supabase.from('products').update(product).eq('id', product.id)
    } else {
      await supabase.from('products').insert(product)
    }
    await fetch()
  }

  async function toggleActive(id, active) {
    await supabase.from('products').update({ active }).eq('id', id)
    await fetch()
  }

  async function addStock(id, units) {
    await supabase.rpc('add_stock', { p_product_id: id, p_units: units })
    await fetch()
  }

  return { products, loading, saveProduct, toggleActive, addStock, refetch: fetch }
}
