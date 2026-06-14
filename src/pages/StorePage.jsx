// src/pages/StorePage.jsx
import { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useCart } from '../context/CartContext'
import { uniqueCategories, filterProducts } from '../lib/catalog'
import CatalogToolbar from '../components/store/CatalogToolbar'
import ProductGrid from '../components/store/ProductGrid'
import ProductListItem from '../components/store/ProductListItem'
import ProductQuantityModal from '../components/store/ProductQuantityModal'
import Layout from '../components/shared/Layout'

const VIEW_KEY = 'emi_view'

export default function StorePage() {
  const { products, loading, error } = useProducts()
  const { items, addItem, updateQuantity, setItemQuantity, removeItem } = useCart()
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'lista')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(null)
  const [modalProduct, setModalProduct] = useState(null)

  function changeView(v) { setView(v); localStorage.setItem(VIEW_KEY, v) }
  function getQuantity(id) { return items.find(i => i.product_id === id)?.quantity ?? 0 }
  function decrement(id) {
    const it = items.find(i => i.product_id === id)
    if (it) updateQuantity(id, it.quantity - 1)
  }

  const categories = uniqueCategories(products)
  const visible = filterProducts(products, { query, category })

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-brand-900">Nuestros productos</h1>
          <p className="text-gray-500 text-sm mt-1">Agua fresca a domicilio</p>
        </div>

        {loading && <p className="text-center py-12 text-gray-400">Cargando productos...</p>}
        {error   && <p className="text-center py-12 text-red-500">Error al cargar productos.</p>}

        {!loading && !error && (
          <>
            <CatalogToolbar
              query={query} onQueryChange={setQuery}
              categories={categories} activeCategory={category} onCategoryChange={setCategory}
              view={view} onViewChange={changeView}
            />
            <div className="mt-4">
              {visible.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No se encontraron productos.</p>
              ) : view === 'lista' ? (
                <div className="flex flex-col gap-2">
                  {visible.map(p => (
                    <ProductListItem key={p.id} product={p} quantity={getQuantity(p.id)} onAdd={addItem} onRemove={decrement} />
                  ))}
                </div>
              ) : (
                <ProductGrid products={visible} getQuantity={getQuantity} onCardClick={setModalProduct} />
              )}
            </div>
          </>
        )}
      </div>

      <ProductQuantityModal
        product={modalProduct}
        initialQuantity={modalProduct ? getQuantity(modalProduct.id) : 0}
        onConfirm={(p, q) => { setItemQuantity(p, q); setModalProduct(null) }}
        onRemove={(id) => { removeItem(id); setModalProduct(null) }}
        onClose={() => setModalProduct(null)}
      />
    </Layout>
  )
}
