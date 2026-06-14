import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Cart from './Cart'

const items = [
  { product_id: '1', name: 'Agua 5L', price: 20, quantity: 2, maxStock: 10 },
]

describe('Cart', () => {
  it('renders cart items', () => {
    render(<Cart items={items} total={40} onRemove={vi.fn()} onUpdateQty={vi.fn()} onCheckout={vi.fn()} />)
    expect(screen.getByText('Agua 5L')).toBeInTheDocument()
    expect(screen.getByText('$40.00')).toBeInTheDocument()
  })

  it('calls onCheckout when button clicked', () => {
    const onCheckout = vi.fn()
    render(<Cart items={items} total={40} onRemove={vi.fn()} onUpdateQty={vi.fn()} onCheckout={onCheckout} />)
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(onCheckout).toHaveBeenCalled()
  })
})
