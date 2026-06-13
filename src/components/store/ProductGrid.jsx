import ProductCard from './ProductCard'

export default function ProductGrid({ products, onAdd }) {
  if (!products.length) {
    return (
      <p className="text-center text-gray-400 py-12">
        No hay productos disponibles en este momento.
      </p>
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {products.map(p => (
        <ProductCard key={p.id} product={p} onAdd={onAdd} />
      ))}
    </div>
  )
}
