import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OrderItemEditor from './OrderItemEditor'

const items = [
  { product_id:'p1', quantity:2, unit_price:45, products:{ name:'Agua 20L' } },
  { product_id:'p2', quantity:3, unit_price:50, products:{ name:'Garrafón' } },
]

describe('OrderItemEditor', () => {
  it('+ y − ajustan cantidad', () => {
    const onChangeQty = vi.fn()
    render(<OrderItemEditor items={items} onChangeQty={onChangeQty} onRemove={vi.fn()} onRemoveLast={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: '+' })[0])
    expect(onChangeQty).toHaveBeenCalledWith('p1', 3)
  })
  it('quitar un artículo (quedan otros) llama onRemove', () => {
    const onRemove = vi.fn()
    render(<OrderItemEditor items={items} onChangeQty={vi.fn()} onRemove={onRemove} onRemoveLast={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: /quitar/i })[0])
    expect(onRemove).toHaveBeenCalledWith('p1')
  })
  it('quitar el último artículo restante llama onRemoveLast', () => {
    const onRemoveLast = vi.fn()
    render(<OrderItemEditor items={[items[0]]} onChangeQty={vi.fn()} onRemove={vi.fn()} onRemoveLast={onRemoveLast} />)
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }))
    expect(onRemoveLast).toHaveBeenCalled()
  })
})
