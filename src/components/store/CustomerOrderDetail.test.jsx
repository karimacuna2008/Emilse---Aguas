// src/components/store/CustomerOrderDetail.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CustomerOrderDetail from './CustomerOrderDetail'

const order = {
  order_number: 'EM-007', delivery_date: '2026-06-16', status: 'pending', total: 60,
  items: [{ name: 'Agua 5L', quantity: 3, unit_price: 20 }],
}

describe('CustomerOrderDetail', () => {
  it('shows order number and status', () => {
    render(<CustomerOrderDetail order={order} canCancel={true} onCancel={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('EM-007')).toBeInTheDocument()
    expect(screen.getByText(/pendiente/i)).toBeInTheDocument()
  })
  it('help link points to wa.me and contains the order id', () => {
    render(<CustomerOrderDetail order={order} canCancel={true} onCancel={vi.fn()} onBack={vi.fn()} />)
    const help = screen.getByRole('link', { name: /pedir ayuda/i })
    expect(help.getAttribute('href')).toMatch(/wa\.me/)
    expect(decodeURIComponent(help.getAttribute('href'))).toContain('EM-007')
  })
  it('cancel button enabled calls onCancel', () => {
    const onCancel = vi.fn()
    render(<CustomerOrderDetail order={order} canCancel={true} onCancel={onCancel} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /cancelar pedido/i }))
    expect(onCancel).toHaveBeenCalled()
  })
  it('cancel button disabled when canCancel is false', () => {
    render(<CustomerOrderDetail order={order} canCancel={false} onCancel={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: /cancelar pedido/i })).toBeDisabled()
  })
})
