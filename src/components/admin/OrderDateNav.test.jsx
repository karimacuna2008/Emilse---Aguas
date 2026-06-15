import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OrderDateNav from './OrderDateNav'

const dates = ['2026-06-14','2026-06-16']

describe('OrderDateNav', () => {
  it('muestra "Hoy" cuando la fecha activa es hoy', () => {
    render(<OrderDateNav dates={dates} active="2026-06-14" today="2026-06-14" onChange={vi.fn()} />)
    expect(screen.getByText(/hoy/i)).toBeInTheDocument()
  })
  it('avanza a la siguiente fecha disponible', () => {
    const onChange = vi.fn()
    render(<OrderDateNav dates={dates} active="2026-06-14" today="2026-06-14" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    expect(onChange).toHaveBeenCalledWith('2026-06-16')
  })
  it('deshabilita anterior en la primera fecha', () => {
    render(<OrderDateNav dates={dates} active="2026-06-14" today="2026-06-14" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled()
  })
})
