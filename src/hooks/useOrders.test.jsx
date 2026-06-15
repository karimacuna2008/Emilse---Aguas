import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOrders } from './useOrders'

const rpc = vi.fn()
const selectChain = { select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }
vi.mock('../lib/supabase', () => ({ supabase: { rpc: (...a) => rpc(...a), from: () => selectChain } }))

beforeEach(() => rpc.mockReset())

describe('useOrders acciones admin', () => {
  it('markDelivered llama marcar_entregado', async () => {
    rpc.mockResolvedValue({ data: { success: true }, error: null })
    const { result } = renderHook(() => useOrders())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.markDelivered('o1') })
    expect(rpc).toHaveBeenCalledWith('marcar_entregado', { p_order_id: 'o1' })
  })
  it('removeItem llama quitar_de_pedido y expone error de negocio', async () => {
    rpc.mockResolvedValue({ data: { error: 'order_not_pending' }, error: null })
    const { result } = renderHook(() => useOrders())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.removeItem('o1', 'p1', 1) })
    expect(rpc).toHaveBeenCalledWith('quitar_de_pedido', { p_order_id:'o1', p_product_id:'p1', p_quantity:1 })
    expect(result.current.error).toMatch(/pendiente/i)
  })
  it('setTotal llama set_total_pedido', async () => {
    rpc.mockResolvedValue({ data: { success: true, total: 200 }, error: null })
    const { result } = renderHook(() => useOrders())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.setTotal('o1', 200) })
    expect(rpc).toHaveBeenCalledWith('set_total_pedido', { p_order_id:'o1', p_total:200 })
  })
})
