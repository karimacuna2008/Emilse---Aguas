import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StorePage         from './pages/StorePage'
import CheckoutPage      from './pages/CheckoutPage'
import OrderStatusPage   from './pages/OrderStatusPage'
import AdminLoginPage    from './pages/AdminLoginPage'
import AdminOrdersPage   from './pages/AdminOrdersPage'
import AdminProductsPage from './pages/AdminProductsPage'
import ProtectedRoute    from './components/admin/ProtectedRoute'
import Layout            from './components/shared/Layout'
import { CartProvider } from './context/CartContext'

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                element={<StorePage />} />
          <Route path="/checkout"        element={<CheckoutPage />} />
          <Route path="/pedido/:code"    element={<OrderStatusPage />} />
          <Route path="/admin/login"     element={<AdminLoginPage />} />
          <Route path="/admin/pedidos"   element={
            <ProtectedRoute>
              <Layout showAdmin>
                <AdminOrdersPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/productos" element={
            <ProtectedRoute>
              <Layout showAdmin>
                <AdminProductsPage />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}
