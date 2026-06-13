import { useState } from 'react'
import { useAdminProducts } from '../hooks/useAdminProducts'
import ProductList from '../components/admin/ProductList'
import ProductForm from '../components/admin/ProductForm'

export default function AdminProductsPage() {
  const { products, loading, saveProduct, toggleActive, addStock } = useAdminProducts()
  const [editing, setEditing] = useState(null)   // null | {} | product

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-900">Productos</h1>
        {!editing && (
          <button onClick={() => setEditing({})}
            className="bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-900">
            + Nuevo
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="bg-surface-soft border border-surface-border rounded-2xl p-4">
          <h2 className="font-semibold text-brand-900 mb-3">
            {editing.id ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <ProductForm
            product={editing.id ? editing : null}
            onSave={async p => { await saveProduct(p); setEditing(null) }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <ProductList
        products={products}
        onEdit={p => setEditing(p)}
        onToggle={toggleActive}
        onAddStock={addStock}
      />
    </div>
  )
}
