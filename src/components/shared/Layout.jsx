import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { useAuth } from '../../hooks/useAuth'

export default function Layout({ children, showAdmin = false }) {
  const { items } = useCart()
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const count = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-brand-700 text-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg text-brand-100">💧 Aguas de Emi</Link>
          <div className="flex items-center gap-3">
            {!showAdmin && (
              <Link to="/checkout" className="relative">
                <span className="text-xl">🛒</span>
                {count > 0 && (
                  <span className="absolute -top-1 -right-2 bg-white text-brand-700 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>
            )}
            {showAdmin && session && (
              <>
                <Link to="/admin/pedidos"   className="text-sm text-brand-100 hover:text-white">Pedidos</Link>
                <Link to="/admin/productos" className="text-sm text-brand-100 hover:text-white">Productos</Link>
                <button onClick={async () => { await signOut(); navigate('/') }}
                  className="text-sm text-brand-100 hover:text-white">
                  Salir
                </button>
              </>
            )}
            {!showAdmin && (
              <Link to="/admin/login" className="text-xs text-brand-200 hover:text-white">Admin</Link>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
