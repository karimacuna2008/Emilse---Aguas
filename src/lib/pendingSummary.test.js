import { describe, it, expect } from 'vitest'
import { buildPendingSummary, defaultPendingDate } from './pendingSummary'

const orders = [
  { id:'a', status:'pending',  delivery_date:'2026-06-14', order_items:[
    { quantity:6, products:{ name:'Agua 20L' } }, { quantity:1, products:{ name:'Pack x6' } } ] },
  { id:'b', status:'pending',  delivery_date:'2026-06-14', order_items:[
    { quantity:2, products:{ name:'Agua 20L' } } ] },
  { id:'c', status:'pending',  delivery_date:'2026-06-16', order_items:[
    { quantity:3, products:{ name:'Garrafón' } } ] },
  { id:'d', status:'delivered',delivery_date:'2026-06-14', order_items:[
    { quantity:9, products:{ name:'Agua 20L' } } ] },
]

describe('buildPendingSummary', () => {
  it('agrupa por fecha y suma por producto solo pendientes', () => {
    const s = buildPendingSummary(orders)
    expect(s.dates).toEqual(['2026-06-14','2026-06-16'])
    expect(s.byDate['2026-06-14'].orderCount).toBe(2)
    expect(s.byDate['2026-06-14'].products).toEqual([
      { name:'Agua 20L', qty:8 }, { name:'Pack x6', qty:1 },
    ])
  })
})

describe('defaultPendingDate', () => {
  const s = buildPendingSummary(orders)
  it('usa hoy si tiene pendientes', () => { expect(defaultPendingDate(s, '2026-06-14')).toBe('2026-06-14') })
  it('si hoy no tiene, usa la siguiente fecha con pendientes', () => { expect(defaultPendingDate(s, '2026-06-15')).toBe('2026-06-16') })
  it('si solo hay fechas pasadas, usa la más reciente', () => { expect(defaultPendingDate(s, '2026-06-20')).toBe('2026-06-16') })
  it('null si no hay pendientes', () => { expect(defaultPendingDate(buildPendingSummary([]), '2026-06-14')).toBeNull() })
})
