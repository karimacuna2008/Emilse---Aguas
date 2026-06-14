// src/components/shared/Layout.test.jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CartProvider } from '../../context/CartContext'
import Layout from './Layout'

function renderLayout() {
  return render(
    <MemoryRouter><CartProvider><Layout><div>contenido</div></Layout></CartProvider></MemoryRouter>
  )
}

describe('Layout (cliente)', () => {
  it('renders the 4 client tabs', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /tienda/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /carrito/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /mi pedido/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ayuda/i })).toBeInTheDocument()
  })
  it('Mi pedido links to /mis-pedidos', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /mi pedido/i })).toHaveAttribute('href', '/mis-pedidos')
  })
  it('Ayuda links to wa.me', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /ayuda/i }).getAttribute('href')).toMatch(/wa\.me/)
  })
  it('exposes a discreet admin access in the header', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /admin/i })).toHaveAttribute('href', '/admin/login')
  })
})
