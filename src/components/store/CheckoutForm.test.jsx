// src/components/store/CheckoutForm.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CheckoutForm from './CheckoutForm'

vi.mock('../../hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    config: { cutoffTime: '20:00', cancelTime: '06:00', weekdays: [1,2,3,4,5,6,7] },
    loading: false,
  }),
}))

beforeEach(() => localStorage.clear())

describe('CheckoutForm', () => {
  it('rejects phone that is not 10 digits', async () => {
    render(<CheckoutForm onSubmit={vi.fn()} loading={false} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: '5551234' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(await screen.findByText(/10 dígitos/i)).toBeInTheDocument()
  })

  it('calls onSubmit with name, 10-digit phone, notes and a delivery_date', async () => {
    const onSubmit = vi.fn()
    render(<CheckoutForm onSubmit={onSubmit} loading={false} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: '55-1234-5678' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Ana', phone: '5512345678', notes: '',
      delivery_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })))
  })

  it('shows error when name is empty', async () => {
    render(<CheckoutForm onSubmit={vi.fn()} loading={false} />)
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: '5512345678' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(await screen.findByText(/nombre es requerido/i)).toBeInTheDocument()
  })
})
