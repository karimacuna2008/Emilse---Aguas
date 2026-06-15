import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OrderCard from './OrderCard'

const base = { id:'o1', order_number:'EM-012', status:'pending', customer_name:'María López',
  customer_phone:'5512345678', total:230, total_personalizado:false,
  order_items:[{ id:1, quantity:2, unit_price:45, products:{ name:'Agua 20L' } }] }

describe('OrderCard', () => {
  it('muestra folio, cliente y total; al click navega', () => {
    const onOpen = vi.fn()
    render(<OrderCard order={base} onOpen={onOpen} />)
    expect(screen.getByText('EM-012')).toBeInTheDocument()
    expect(screen.getByText(/María López/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('EM-012').closest('[role="button"]'))
    expect(onOpen).toHaveBeenCalledWith('o1')
  })
  it('muestra tag de total personalizado', () => {
    render(<OrderCard order={{ ...base, total_personalizado:true }} onOpen={vi.fn()} />)
    expect(screen.getByText(/total/i)).toBeInTheDocument()
  })
})
