import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TotalOverride from './TotalOverride'

describe('TotalOverride', () => {
  it('estado normal: muestra total y botón editar', () => {
    render(<TotalOverride total={240} personalizado={false} calculado={240} onSet={vi.fn()} onReset={vi.fn()} />)
    expect(screen.getByText('$240')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /editar total/i })).toBeInTheDocument()
  })
  it('editar → guardar llama onSet con el número', () => {
    const onSet = vi.fn()
    render(<TotalOverride total={240} personalizado={false} calculado={240} onSet={onSet} onReset={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /editar total/i }))
    fireEvent.change(screen.getByLabelText(/total/i), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))
    expect(onSet).toHaveBeenCalledWith(200)
  })
  it('personalizado: muestra tag y permite volver al calculado', () => {
    const onReset = vi.fn()
    render(<TotalOverride total={200} personalizado calculado={240} onSet={vi.fn()} onReset={onReset} />)
    expect(screen.getByText(/personalizado/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /volver al calculado/i }))
    expect(onReset).toHaveBeenCalled()
  })
})
