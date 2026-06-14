// src/components/store/ActiveOrdersList.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ActiveOrdersList from './ActiveOrdersList'

const orders = [
  { order_number: 'EM-007', delivery_date: '2026-06-16', status: 'pending', total: 60, items: [] },
  { order_number: 'EM-009', delivery_date: '2026-06-18', status: 'pending', total: 90, items: [] },
]

describe('ActiveOrdersList', () => {
  it('renders a card per order', () => {
    render(<ActiveOrdersList orders={orders} onSelect={vi.fn()} />)
    expect(screen.getByText('EM-007')).toBeInTheDocument()
    expect(screen.getByText('EM-009')).toBeInTheDocument()
  })
  it('calls onSelect with the order when a card is clicked', () => {
    const onSelect = vi.fn()
    render(<ActiveOrdersList orders={orders} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('EM-007'))
    expect(onSelect).toHaveBeenCalledWith(orders[0])
  })
  it('shows empty state when there are no orders', () => {
    render(<ActiveOrdersList orders={[]} onSelect={vi.fn()} />)
    expect(screen.getByText(/no tienes pedidos activos/i)).toBeInTheDocument()
  })
})
