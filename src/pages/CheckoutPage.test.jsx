// src/pages/CheckoutPage.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CartProvider } from '../context/CartContext'
import CheckoutPage from './CheckoutPage'

const rpc = vi.fn()
vi.mock('../lib/supabase', () => ({ supabase: {
  rpc: (...a) => rpc(...a),
  from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
  // Layout -> useAuth necesita auth; stub mínimo (no afecta el flujo bajo prueba)
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
} }))

// Mock CheckoutForm to submit a fixed payload synchronously (isolate page flow)
vi.mock('../components/store/CheckoutForm', () => ({
  default: ({ onSubmit }) => (
    <button onClick={() => onSubmit({ name: 'Ana', phone: '5512345678', notes: '', delivery_date: '2026-06-16' })}>
      submit-form
    </button>
  ),
}))

function seedCart() {
  // CartProvider reads localStorage 'emi_cart'
  localStorage.setItem('emi_cart', JSON.stringify([
    { product_id: 'p1', name: 'Agua 5L', price: 20, quantity: 2, maxStock: 10 },
  ]))
}

function renderPage() {
  return render(
    <MemoryRouter><CartProvider><CheckoutPage /></CartProvider></MemoryRouter>
  )
}

beforeEach(() => { localStorage.clear(); rpc.mockReset(); seedCart() })

describe('CheckoutPage flow', () => {
  it('creates order directly when no open order for that date', async () => {
    rpc.mockImplementation((fn) => {
      if (fn === 'buscar_pedido_abierto') return Promise.resolve({ data: { found: false }, error: null })
      if (fn === 'crear_pedido') return Promise.resolve({ data: { success: true, order_number: 'EM-010' }, error: null })
      return Promise.resolve({ data: {}, error: null })
    })
    renderPage()
    fireEvent.click(screen.getByText(/continuar/i))   // cart -> form
    fireEvent.click(screen.getByText('submit-form'))  // form submit
    expect(await screen.findByText('EM-010')).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('crear_pedido', expect.objectContaining({ p_delivery_date: '2026-06-16' }))
  })

  it('shows sumar/nuevo choice when an open order exists for that date', async () => {
    rpc.mockImplementation((fn) => {
      if (fn === 'buscar_pedido_abierto') return Promise.resolve({ data: { found: true, order_id: 'u1', order_number: 'EM-007', total: 60, items: [] }, error: null })
      return Promise.resolve({ data: {}, error: null })
    })
    renderPage()
    fireEvent.click(screen.getByText(/continuar/i))
    fireEvent.click(screen.getByText('submit-form'))
    expect(await screen.findByRole('button', { name: /sumar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nuevo/i })).toBeInTheDocument()
  })

  it('adds to open order when choosing Sumar', async () => {
    rpc.mockImplementation((fn) => {
      if (fn === 'buscar_pedido_abierto') return Promise.resolve({ data: { found: true, order_id: 'u1', order_number: 'EM-007', total: 60, items: [] }, error: null })
      if (fn === 'agregar_a_pedido') return Promise.resolve({ data: { success: true, total: 100 }, error: null })
      return Promise.resolve({ data: {}, error: null })
    })
    renderPage()
    fireEvent.click(screen.getByText(/continuar/i))
    fireEvent.click(screen.getByText('submit-form'))
    fireEvent.click(await screen.findByRole('button', { name: /sumar/i }))
    // Espera el marcador único del paso 'done' (la confirmación) antes de afirmar el
    // número: el EM-007 del paso 'choice' se desmonta en la transición y dejaría el
    // elemento capturado fuera del documento (race del findByText directo).
    expect(await screen.findByText(/pedido recibido/i)).toBeInTheDocument()
    expect(screen.getByText('EM-007')).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('agregar_a_pedido', expect.objectContaining({ p_order_id: 'u1' }))
  })
})
