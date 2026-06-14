// src/components/store/ProductGrid.jsx
import ProductCard from './ProductCard'

export default function ProductGrid({ products, getQuantity, onCardClick }) {
  if (!products.length) {
    return <p className="text-center text-gray-400 py-12">No hay productos disponibles en este momento.</p>
  }
  return (
    <>
      <p className="text-sm text-gray-400 mb-3 text-center">Toca un producto para elegir cantidad</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {products.map(p => (
          <ProductCard key={p.id} product={p} quantity={getQuantity(p.id)} onClick={onCardClick} />
        ))}
      </div>
    </>
  )
}
