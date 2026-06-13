import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProducts } from './useProducts'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq:    vi.fn(() => ({
          gt:    vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
                { id: '1', name: 'Agua 5L', price: 20, stock: 5, active: true },
              ],
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}))

describe('useProducts', () => {
  it('returns active products with stock', async () => {
    const { result } = renderHook(() => useProducts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.products).toHaveLength(1)
    expect(result.current.products[0].name).toBe('Agua 5L')
    expect(result.current.error).toBeNull()
  })
})
