import { renderHook, act, render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useCart, CartProvider } from './CartContext'

const p1 = { id: 'p1', name: 'Agua 5L', price: 20, stock: 10 }
const p2 = { id: 'p2', name: 'Garrafón', price: 45, stock: 5 }

beforeEach(() => localStorage.clear())

describe('useCart', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })
    expect(result.current.items).toHaveLength(0)
    expect(result.current.total).toBe(0)
  })

  it('addItem increments quantity if product already in cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })
    act(() => result.current.addItem(p1))
    act(() => result.current.addItem(p1))
    expect(result.current.items[0].quantity).toBe(2)
  })

  it('total reflects quantities and prices', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })
    act(() => result.current.addItem(p1))
    act(() => result.current.addItem(p2))
    expect(result.current.total).toBe(65)
  })

  it('removeItem deletes product from cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })
    act(() => result.current.addItem(p1))
    act(() => result.current.removeItem('p1'))
    expect(result.current.items).toHaveLength(0)
  })

  it('clearCart empties cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })
    act(() => result.current.addItem(p1))
    act(() => result.current.clearCart())
    expect(result.current.items).toHaveLength(0)
  })

  // Bug #3: dos consumidores separados (como StorePage que agrega y Layout que
  // muestra el badge) deben compartir el MISMO estado a través del Provider.
  // Con el hook viejo (useState local) cada uno tenía su instancia y el badge
  // no se actualizaba. Este test falla con la implementación vieja y pasa con Context.
  it('shares state across separate consumers (bug #3)', () => {
    function Producer() {
      const { addItem } = useCart()
      return <button onClick={() => addItem(p1)}>add</button>
    }
    function Badge() {
      const { items } = useCart()
      const count = items.reduce((s, i) => s + i.quantity, 0)
      return <span data-testid="badge">{count}</span>
    }
    render(
      <CartProvider>
        <Producer />
        <Badge />
      </CartProvider>
    )
    expect(screen.getByTestId('badge')).toHaveTextContent('0')
    fireEvent.click(screen.getByText('add'))
    expect(screen.getByTestId('badge')).toHaveTextContent('1')
  })

  it('setItemQuantity adds product with absolute quantity if not present', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })
    act(() => result.current.setItemQuantity(p1, 3))
    expect(result.current.items[0]).toMatchObject({ product_id: 'p1', quantity: 3 })
  })

  it('setItemQuantity overwrites quantity (not increments) if present', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })
    act(() => result.current.addItem(p1))
    act(() => result.current.setItemQuantity(p1, 5))
    expect(result.current.items[0].quantity).toBe(5)
  })

  it('setItemQuantity clamps to stock and removes on <= 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })
    act(() => result.current.setItemQuantity(p1, 999))
    expect(result.current.items[0].quantity).toBe(10) // p1.stock = 10
    act(() => result.current.setItemQuantity(p1, 0))
    expect(result.current.items).toHaveLength(0)
  })
})
