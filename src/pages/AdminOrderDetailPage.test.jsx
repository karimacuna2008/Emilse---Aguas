import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AdminOrderDetailPage from './AdminOrderDetailPage'

const order = { id:'o1', order_number:'EM-012', status:'pending', customer_name:'María', customer_phone:'5512345678',
  notes:'reja azul', total:240, total_personalizado:false, delivery_date:'2026-06-14',
  order_items:[{ id:1, product_id:'p1', quantity:2, unit_price:45, products:{ name:'Agua 20L' } }] }

vi.mock('../lib/supabase', () => ({ supabase: {
  rpc: () => Promise.resolve({ data: { success:true }, error:null }),
  from: (t) => ({ select: () => (t === 'products'
    ? { eq: () => ({ gt: () => ({ order: () => Promise.resolve({ data:[], error:null }) }) }) }
    : { order: () => Promise.resolve({ data:[order], error:null }) }) }),
}}))

describe('AdminOrderDetailPage', () => {
  it('muestra el pedido y sus artículos', async () => {
    render(<MemoryRouter initialEntries={['/admin/pedidos/o1']}>
      <Routes><Route path="/admin/pedidos/:id" element={<AdminOrderDetailPage />} /></Routes>
    </MemoryRouter>)
    expect(await screen.findByText('EM-012')).toBeInTheDocument()
    expect(screen.getByText('Agua 20L')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/marcar entregado/i)).toBeInTheDocument())
  })
})
