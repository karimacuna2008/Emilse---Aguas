import { useProducts } from '../hooks/useProducts'
import { useCart } from '../hooks/useCart'
import ProductGrid from '../components/store/ProductGrid'
import WhatsAppLink from '../components/shared/WhatsAppLink'
import Layout from '../components/shared/Layout'

export default function StorePage() {
  const { products, loading, error } = useProducts()
  const { items, addItem, updateQuantity } = useCart()

  function getQuantity(productId) {
    return items.find(i => i.product_id === productId)?.quantity ?? 0
  }

  function handleRemove(productId) {
    const item = items.find(i => i.product_id === productId)
    if (item) updateQuantity(productId, item.quantity - 1)
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-900">Nuestros productos</h1>
          <p className="text-gray-500 text-sm mt-1">Agua fresca a domicilio</p>
        </div>
        {loading && <p className="text-center py-12 text-gray-400">Cargando productos...</p>}
        {error   && <p className="text-center py-12 text-red-500">Error al cargar productos.</p>}
        {!loading && !error && (
          <ProductGrid
            products={products}
            onAdd={addItem}
            onRemove={handleRemove}
            getQuantity={getQuantity}
          />
        )}
      </div>
      <WhatsAppLink />
    </Layout>
  )
}
