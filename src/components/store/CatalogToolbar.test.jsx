// src/components/store/CatalogToolbar.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CatalogToolbar from './CatalogToolbar'

const base = {
  query: '', onQueryChange: vi.fn(),
  categories: ['Botellas', 'Garrafones'], activeCategory: null, onCategoryChange: vi.fn(),
  view: 'lista', onViewChange: vi.fn(),
}

describe('CatalogToolbar', () => {
  it('calls onQueryChange on typing', () => {
    const onQueryChange = vi.fn()
    render(<CatalogToolbar {...base} onQueryChange={onQueryChange} />)
    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'agua' } })
    expect(onQueryChange).toHaveBeenCalledWith('agua')
  })
  it('renders a chip per category plus "Todos"', () => {
    render(<CatalogToolbar {...base} />)
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Botellas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Garrafones' })).toBeInTheDocument()
  })
  it('calls onCategoryChange with the chip value, and null for Todos', () => {
    const onCategoryChange = vi.fn()
    render(<CatalogToolbar {...base} onCategoryChange={onCategoryChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Botellas' }))
    expect(onCategoryChange).toHaveBeenCalledWith('Botellas')
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
    expect(onCategoryChange).toHaveBeenCalledWith(null)
  })
})
