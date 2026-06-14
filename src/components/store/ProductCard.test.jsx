// src/components/store/ProductCard.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductCard from './ProductCard'

const product = { id: '1', name: 'Agua 5L', price: 20, stock: 10, image_url: null }

describe('ProductCard', () => {
  it('displays product name and price', () => {
    render(<ProductCard product={product} onClick={vi.fn()} />)
    expect(screen.getByText('Agua 5L')).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })
  it('calls onClick with product when the card is clicked', () => {
    const onClick = vi.fn()
    render(<ProductCard product={product} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith(product)
  })
  it('shows quantity badge and green class when quantity > 0', () => {
    const { container } = render(<ProductCard product={product} quantity={3} onClick={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('bg-brand-100')
    expect(container.firstChild).toHaveClass('border-brand-700')
  })
  it('does NOT show badge / green when quantity is 0', () => {
    const { container } = render(<ProductCard product={product} quantity={0} onClick={vi.fn()} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(container.firstChild).not.toHaveClass('bg-brand-100')
  })
})
