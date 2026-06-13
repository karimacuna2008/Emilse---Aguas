import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useCart } from './useCart'

const p1 = { id: 'p1', name: 'Agua 5L', price: 20, stock: 10 }
const p2 = { id: 'p2', name: 'Garrafón', price: 45, stock: 5 }

beforeEach(() => localStorage.clear())

describe('useCart', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCart())
    expect(result.current.items).toHaveLength(0)
    expect(result.current.total).toBe(0)
  })

  it('addItem increments quantity if product already in cart', () => {
    const { result } = renderHook(() => useCart())
    act(() => result.current.addItem(p1))
    act(() => result.current.addItem(p1))
    expect(result.current.items[0].quantity).toBe(2)
  })

  it('total reflects quantities and prices', () => {
    const { result } = renderHook(() => useCart())
    act(() => result.current.addItem(p1))
    act(() => result.current.addItem(p2))
    expect(result.current.total).toBe(65)
  })

  it('removeItem deletes product from cart', () => {
    const { result } = renderHook(() => useCart())
    act(() => result.current.addItem(p1))
    act(() => result.current.removeItem('p1'))
    expect(result.current.items).toHaveLength(0)
  })

  it('clearCart empties cart', () => {
    const { result } = renderHook(() => useCart())
    act(() => result.current.addItem(p1))
    act(() => result.current.clearCart())
    expect(result.current.items).toHaveLength(0)
  })
})
