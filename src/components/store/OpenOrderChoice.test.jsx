// src/components/store/OpenOrderChoice.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OpenOrderChoice from './OpenOrderChoice'

const openOrder = {
  order_id: 'uuid-1', order_number: 'EM-007', total: 60,
  items: [{ name: 'Agua 5L', quantity: 3, unit_price: 20 }],
}

describe('OpenOrderChoice', () => {
  it('shows the existing order number', () => {
    render(<OpenOrderChoice openOrder={openOrder} loading={false} onAddToOpen={vi.fn()} onCreateNew={vi.fn()} />)
    expect(screen.getByText(/EM-007/)).toBeInTheDocument()
  })
  it('calls onAddToOpen and onCreateNew', () => {
    const onAddToOpen = vi.fn(); const onCreateNew = vi.fn()
    render(<OpenOrderChoice openOrder={openOrder} loading={false} onAddToOpen={onAddToOpen} onCreateNew={onCreateNew} />)
    fireEvent.click(screen.getByRole('button', { name: /sumar/i }))
    expect(onAddToOpen).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /nuevo/i }))
    expect(onCreateNew).toHaveBeenCalled()
  })
})
