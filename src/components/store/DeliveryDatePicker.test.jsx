// src/components/store/DeliveryDatePicker.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DeliveryDatePicker from './DeliveryDatePicker'

const options = [
  { date: new Date(2026, 5, 15), iso: '2026-06-15', available: false },
  { date: new Date(2026, 5, 16), iso: '2026-06-16', available: true },
  { date: new Date(2026, 5, 17), iso: '2026-06-17', available: true },
]

describe('DeliveryDatePicker', () => {
  it('disables unavailable cells', () => {
    render(<DeliveryDatePicker options={options} value="2026-06-16" onChange={vi.fn()} cutoffTime="20:00" />)
    // unavailable day 15
    const cells = screen.getAllByRole('button')
    expect(cells[0]).toBeDisabled()
    expect(cells[1]).not.toBeDisabled()
  })
  it('calls onChange with iso when an available cell is clicked', () => {
    const onChange = vi.fn()
    render(<DeliveryDatePicker options={options} value="2026-06-16" onChange={onChange} cutoffTime="20:00" />)
    fireEvent.click(screen.getByText('17'))
    expect(onChange).toHaveBeenCalledWith('2026-06-17')
  })
  it('does not call onChange for a disabled cell', () => {
    const onChange = vi.fn()
    render(<DeliveryDatePicker options={options} value="2026-06-16" onChange={onChange} cutoffTime="20:00" />)
    fireEvent.click(screen.getByText('15'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
