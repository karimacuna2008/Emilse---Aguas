import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CheckoutForm from './CheckoutForm'

describe('CheckoutForm', () => {
  it('calls onSubmit with name and phone', async () => {
    const onSubmit = vi.fn()
    render(<CheckoutForm onSubmit={onSubmit} loading={false} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: '5551234' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Ana', phone: '5551234', notes: '' }))
  })

  it('shows error when name is empty', async () => {
    render(<CheckoutForm onSubmit={vi.fn()} loading={false} />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(await screen.findByText(/nombre es requerido/i)).toBeInTheDocument()
  })
})
