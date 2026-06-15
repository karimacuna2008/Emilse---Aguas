import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AddProductPicker from './AddProductPicker'

const products = [{ id:'p1', name:'Agua 20L', price:45, stock:10 }, { id:'p2', name:'Garrafón', price:50, stock:4 }]

describe('AddProductPicker', () => {
  it('filtra por búsqueda y agrega con cantidad', () => {
    const onAdd = vi.fn()
    render(<AddProductPicker products={products} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'garra' } })
    expect(screen.queryByText('Agua 20L')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Garrafón'))
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }))
    expect(onAdd).toHaveBeenCalledWith('p2', 1)
  })
})
