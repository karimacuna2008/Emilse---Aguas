// src/components/store/ProductListItem.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductListItem from './ProductListItem'

const product = { id: '1', name: 'Agua 5L', price: 20, stock: 10, image_url: null }

describe('ProductListItem', () => {
  it('shows Agregar when quantity is 0', () => {
    render(<ProductListItem product={product} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })
  it('calls onAdd when Agregar clicked', () => {
    const onAdd = vi.fn()
    render(<ProductListItem product={product} onAdd={onAdd} onRemove={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }))
    expect(onAdd).toHaveBeenCalledWith(product)
  })
  it('shows stepper when quantity > 0 and green class', () => {
    const { container } = render(<ProductListItem product={product} quantity={2} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByLabelText('Quitar uno')).toBeInTheDocument()
    expect(screen.getByLabelText('Agregar uno')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('bg-brand-100')
  })
  it('stepper buttons call onRemove(id) and onAdd(product)', () => {
    const onAdd = vi.fn(); const onRemove = vi.fn()
    render(<ProductListItem product={product} quantity={2} onAdd={onAdd} onRemove={onRemove} />)
    fireEvent.click(screen.getByLabelText('Quitar uno'))
    expect(onRemove).toHaveBeenCalledWith('1')
    fireEvent.click(screen.getByLabelText('Agregar uno'))
    expect(onAdd).toHaveBeenCalledWith(product)
  })
})
