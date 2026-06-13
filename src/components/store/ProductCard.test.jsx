import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductCard from './ProductCard'

const product = { id: '1', name: 'Agua 5L', price: 20, stock: 10, image_url: null, description: null }

describe('ProductCard', () => {
  it('displays product name and price', () => {
    render(<ProductCard product={product} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('Agua 5L')).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })

  it('shows Agregar button when quantity is 0 (default)', () => {
    render(<ProductCard product={product} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument()
    expect(screen.queryByText('−')).not.toBeInTheDocument()
  })

  it('calls onAdd with product when Agregar is clicked', () => {
    const onAdd = vi.fn()
    render(<ProductCard product={product} onAdd={onAdd} onRemove={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }))
    expect(onAdd).toHaveBeenCalledWith(product)
  })

  it('shows [− N +] counter instead of Agregar when quantity > 0', () => {
    render(<ProductCard product={product} quantity={2} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('−')).toBeInTheDocument()
    expect(screen.getByText('+')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /agregar/i })).not.toBeInTheDocument()
  })

  it('applies green background class when quantity > 0', () => {
    const { container } = render(<ProductCard product={product} quantity={1} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(container.firstChild).toHaveClass('bg-brand-100')
    expect(container.firstChild).toHaveClass('border-brand-700')
  })

  it('does NOT apply green background when quantity is 0', () => {
    const { container } = render(<ProductCard product={product} quantity={0} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(container.firstChild).not.toHaveClass('bg-brand-100')
    expect(container.firstChild).not.toHaveClass('border-brand-700')
  })

  it('calls onAdd with product when + is clicked', () => {
    const onAdd = vi.fn()
    render(<ProductCard product={product} quantity={1} onAdd={onAdd} onRemove={vi.fn()} />)
    fireEvent.click(screen.getByText('+'))
    expect(onAdd).toHaveBeenCalledWith(product)
  })

  it('calls onRemove with product id when − is clicked', () => {
    const onRemove = vi.fn()
    render(<ProductCard product={product} quantity={1} onAdd={vi.fn()} onRemove={onRemove} />)
    fireEvent.click(screen.getByText('−'))
    expect(onRemove).toHaveBeenCalledWith('1')
  })
})
