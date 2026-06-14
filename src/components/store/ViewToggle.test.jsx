// src/components/store/ViewToggle.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ViewToggle from './ViewToggle'

describe('ViewToggle', () => {
  it('marks the active view with aria-pressed', () => {
    render(<ViewToggle view="lista" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Vista lista')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Vista tarjetas')).toHaveAttribute('aria-pressed', 'false')
  })
  it('calls onChange with the other view', () => {
    const onChange = vi.fn()
    render(<ViewToggle view="lista" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Vista tarjetas'))
    expect(onChange).toHaveBeenCalledWith('tarjetas')
  })
})
