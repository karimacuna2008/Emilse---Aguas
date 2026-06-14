// src/components/store/ProductQuantityModal.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductQuantityModal from './ProductQuantityModal'

const product = { id: '1', name: 'Agua 5L', price: 20, stock: 10, image_url: null }

describe('ProductQuantityModal', () => {
  it('renders nothing when product is null', () => {
    const { container } = render(<ProductQuantityModal product={null} onConfirm={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('starts at qty 1 for a new product and updates subtotal', () => {
    render(<ProductQuantityModal product={product} initialQuantity={0} onConfirm={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Más'))
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar al carrito \$40\.00/i })).toBeInTheDocument()
  })
  it('clamps + at stock and − at 1', () => {
    render(<ProductQuantityModal product={{ ...product, stock: 2 }} initialQuantity={0} onConfirm={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Más'))
    fireEvent.click(screen.getByLabelText('Más')) // would be 3, clamps to 2
    expect(screen.getByText('2')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Menos'))
    fireEvent.click(screen.getByLabelText('Menos'))
    fireEvent.click(screen.getByLabelText('Menos')) // clamps at 1
    expect(screen.getByText('1')).toBeInTheDocument()
  })
  it('confirm calls onConfirm(product, qty)', () => {
    const onConfirm = vi.fn()
    render(<ProductQuantityModal product={product} initialQuantity={0} onConfirm={onConfirm} onRemove={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /agregar al carrito/i }))
    expect(onConfirm).toHaveBeenCalledWith(product, 1)
  })
  it('editing mode (initialQuantity>0) shows Actualizar + Quitar', () => {
    const onRemove = vi.fn()
    render(<ProductQuantityModal product={product} initialQuantity={3} onConfirm={vi.fn()} onRemove={onRemove} onClose={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /actualizar/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /quitar del carrito/i }))
    expect(onRemove).toHaveBeenCalledWith('1')
  })
})
