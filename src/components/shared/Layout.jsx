import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../hooks/useAuth'

export default function Layout({ children, showAdmin = false }) {
  const { items } = useCart()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const count = items.reduce((s, i) => s + i.quantity, 0)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  function navClass(path) {
    const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
    return `flex flex-col items-center gap-0.5 transition-colors ${isActive ? 'text-white' : 'text-brand-200'}`
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Top header — brand only */}
      <header className="bg-brand-700 text-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center">
          <Link to="/" className="font-bold text-lg text-brand-100">💧 Aguas de Emi</Link>
        </div>
      </header>

      {/* Main content — bottom padding clears the fixed nav bar */}
      <main className="pb-20">{children}</main>

      {/* Bottom navigation */}
      <nav className="bg-brand-700 fixed bottom-0 inset-x-0 z-50 h-16 flex items-center">
        <div className="max-w-lg mx-auto w-full flex justify-around px-4">
          {!showAdmin ? (
            <>
              <Link to="/" className={navClass('/')}>
                <span className="text-2xl">🏠</span>
                <span className="text-xs font-semibold">Tienda</span>
              </Link>

              <Link to="/checkout" className={`${navClass('/checkout')} relative`}>
                <span className="text-2xl relative">
                  🛒
                  {count > 0 && (
                    <span className="absolute -top-1 -right-2 bg-white text-brand-700 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </span>
                <span className="text-xs font-semibold">Carrito</span>
              </Link>

              <Link to="/admin/login" className={navClass('/admin/login')}>
                <span className="text-2xl">👩‍💼</span>
                <span className="text-xs font-semibold">Admin</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/admin/pedidos" className={navClass('/admin/pedidos')}>
                <span className="text-2xl">📋</span>
                <span className="text-xs font-semibold">Pedidos</span>
              </Link>

              <Link to="/admin/productos" className={navClass('/admin/productos')}>
                <span className="text-2xl">📦</span>
                <span className="text-xs font-semibold">Productos</span>
              </Link>

              <button onClick={handleSignOut} className="flex flex-col items-center gap-0.5 text-brand-200 hover:text-white transition-colors">
                <span className="text-2xl">🚪</span>
                <span className="text-xs font-semibold">Salir</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  )
}
