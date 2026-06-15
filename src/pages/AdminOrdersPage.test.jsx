import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AdminOrdersPage from './AdminOrdersPage'

const orders = [
  { id:'o1', order_number:'EM-013', status:'pending', customer_name:'Juan', customer_phone:'5599887766',
    total:310, total_personalizado:false, delivery_date:'2026-06-14',
    order_items:[{ id:1, product_id:'p1', quantity:6, unit_price:45, products:{ name:'Agua 20L' } }] },
  { id:'o2', order_number:'EM-009', status:'delivered', customer_name:'Ana', customer_phone:'5500112233',
    total:90, total_personalizado:false, delivery_date:'2026-06-10', order_items:[] },
]
vi.mock('../lib/supabase', () => ({ supabase: {
  rpc: () => Promise.resolve({ data:{ success:true }, error:null }),
  from: () => ({ select: () => ({ order: () => Promise.resolve({ data: orders, error:null }) }) }),
}}))

describe('AdminOrdersPage', () => {
  it('muestra resumen por entregar y el pedido pendiente del día', async () => {
    render(<MemoryRouter><AdminOrdersPage /></MemoryRouter>)
    expect(await screen.findByText(/por entregar/i)).toBeInTheDocument()
    expect(screen.getByText('EM-013')).toBeInTheDocument()
    expect(screen.queryByText('EM-009')).not.toBeInTheDocument() // entregado, no aparece en pendientes
  })
  it('el enlace de historial muestra entregados', async () => {
    render(<MemoryRouter><AdminOrdersPage /></MemoryRouter>)
    fireEvent.click(await screen.findByText(/entregados \/ cancelados/i))
    await waitFor(() => expect(screen.getByText('EM-009')).toBeInTheDocument())
  })
})
