import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductCard from './ProductCard'

const product = { id: '1', name: 'Agua 5L', price: 20, stock: 10, image_url: null }

describe('ProductCard', () => {
  it('displays product name and price', () => {
    render(<ProductCard product={product} onAdd={vi.fn()} />)
    expect(screen.getByText('Agua 5L')).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })

  it('calls onAdd when button is clicked', () => {
    const onAdd = vi.fn()
    render(<ProductCard product={product} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }))
    expect(onAdd).toHaveBeenCalledWith(product)
  })
})
