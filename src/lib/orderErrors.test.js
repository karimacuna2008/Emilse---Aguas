import { describe, it, expect } from 'vitest'
import { mapOrderError } from './orderErrors'

describe('mapOrderError', () => {
  it('mapea códigos conocidos a español', () => {
    expect(mapOrderError('order_not_pending')).toMatch(/pendiente/i)
    expect(mapOrderError('item_not_found')).toMatch(/artículo/i)
  })
  it('incluye el producto en out_of_stock', () => {
    expect(mapOrderError('out_of_stock', { product_name: 'Agua 20L' })).toMatch(/Agua 20L/)
  })
  it('mensaje genérico para código desconocido', () => {
    expect(mapOrderError('algo_raro')).toMatch(/error/i)
  })
})
