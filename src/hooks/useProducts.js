import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .gt('stock', 0)
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error)
        else setProducts(data)
        setLoading(false)
      })
  }, [])

  return { products, loading, error }
}
