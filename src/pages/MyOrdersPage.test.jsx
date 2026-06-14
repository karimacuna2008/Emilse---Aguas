// src/pages/MyOrdersPage.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CartProvider } from '../context/CartContext'
import MyOrdersPage from './MyOrdersPage'

const rpc = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...a) => rpc(...a),
    from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
    // Layout -> useAuth necesita auth; stub mínimo (no afecta el flujo bajo prueba)
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))

function renderPage() {
  return render(<MemoryRouter><CartProvider><MyOrdersPage /></CartProvider></MemoryRouter>)
}

beforeEach(() => { localStorage.clear(); rpc.mockReset() })

describe('MyOrdersPage', () => {
  it('looks up active orders by phone', async () => {
    rpc.mockResolvedValue({ data: { orders: [
      { order_number: 'EM-007', delivery_date: '2026-06-16', status: 'pending', total: 60, items: [] },
    ] }, error: null })
    renderPage()
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: '5512345678' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(await screen.findByText('EM-007')).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('listar_pedidos_activos', { p_phone: '5512345678' })
  })

  it('shows empty state when no active orders', async () => {
    rpc.mockResolvedValue({ data: { orders: [] }, error: null })
    renderPage()
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: '5512345678' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(await screen.findByText(/no tienes pedidos activos/i)).toBeInTheDocument()
  })
})
