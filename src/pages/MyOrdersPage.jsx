// src/pages/MyOrdersPage.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAppSettings } from '../hooks/useAppSettings'
import { isCancelAllowed } from '../lib/deliveryDates'
import Layout from '../components/shared/Layout'
import ActiveOrdersList from '../components/store/ActiveOrdersList'
import CustomerOrderDetail from '../components/store/CustomerOrderDetail'

const PHONE_KEY = 'emi_phone'

export default function MyOrdersPage() {
  const { config } = useAppSettings()
  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_KEY) || '')
  const [orders, setOrders] = useState(null)   // null = aún no se buscó
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function lookup() {
    const digits = phone.replace(/[\s-]/g, '')
    if (!/^\d{10}$/.test(digits)) { setError('Ingresa un teléfono de 10 dígitos'); return }
    localStorage.setItem(PHONE_KEY, digits)
    setLoading(true); setError(null); setSelected(null)
    const { data, error } = await supabase.rpc('listar_pedidos_activos', { p_phone: digits })
    setLoading(false)
    if (error || data?.error) { setError('No se pudo consultar. Inténtalo de nuevo.'); setOrders([]); return }
    setOrders(data.orders ?? [])
  }

  async function cancelSelected() {
    const digits = phone.replace(/[\s-]/g, '')
    setLoading(true); setError(null)
    const { data, error } = await supabase.rpc('cancelar_pedido_cliente', {
      p_order_number: selected.order_number, p_phone: digits,
    })
    setLoading(false)
    if (error || data?.error) { setError('No se pudo cancelar el pedido.'); return }
    setSelected(null)
    lookup()
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
        {!selected && (
          <>
            <h1 className="text-2xl font-bold text-brand-900">Mi pedido</h1>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="Tu teléfono (10 dígitos)" type="tel" inputMode="numeric"
                  className="flex-1 border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700"
                />
                <button onClick={lookup} disabled={loading}
                        className="bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold px-5 rounded-xl">
                  Buscar
                </button>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>

            {loading && <p className="text-center py-8 text-gray-400">Buscando...</p>}
            {!loading && orders !== null && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Tus pedidos activos</p>
                <ActiveOrdersList orders={orders} onSelect={setSelected} />
              </div>
            )}
          </>
        )}

        {selected && (
          <CustomerOrderDetail
            order={selected}
            canCancel={selected.status === 'pending' && isCancelAllowed(selected.delivery_date, new Date(), config)}
            onCancel={cancelSelected}
            onBack={() => setSelected(null)}
          />
        )}
      </div>
    </Layout>
  )
}
