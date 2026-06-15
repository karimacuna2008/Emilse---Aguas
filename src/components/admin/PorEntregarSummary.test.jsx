import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PorEntregarSummary from './PorEntregarSummary'

const day = { date:'2026-06-14', orderCount:2, products:[{ name:'Agua 20L', qty:8 }, { name:'Garrafón', qty:3 }] }

describe('PorEntregarSummary', () => {
  it('muestra cantidades por producto', () => {
    render(<PorEntregarSummary day={day} />)
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('Agua 20L')).toBeInTheDocument()
  })
  it('abate al tocar el header', () => {
    render(<PorEntregarSummary day={day} />)
    fireEvent.click(screen.getByRole('button', { name: /por entregar/i }))
    expect(screen.queryByText('Agua 20L')).not.toBeInTheDocument()
  })
})
