import { createContext, useContext, useState, useEffect } from 'react'

const KEY = 'emi_cart'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) ?? [] }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  function addItem(product) {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
            : i
        )
      }
      return [...prev, {
        product_id: product.id,
        name:       product.name,
        price:      product.price,
        quantity:   1,
        maxStock:   product.stock,
      }]
    })
  }

  function removeItem(productId) {
    setItems(prev => prev.filter(i => i.product_id !== productId))
  }

  function updateQuantity(productId, quantity) {
    if (quantity <= 0) { removeItem(productId); return }
    setItems(prev => prev.map(i =>
      i.product_id === productId ? { ...i, quantity } : i
    ))
  }

  function clearCart() { setItems([]) }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const value = { items, total, addItem, removeItem, updateQuantity, clearCart }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
