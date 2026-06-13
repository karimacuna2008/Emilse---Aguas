export default function ProductCard({ product, onAdd }) {
  return (
    <div className="bg-white border border-brand-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-brand-100 h-32 flex items-center justify-center text-5xl">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          : '💧'}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-brand-900">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-500 mt-1">{product.description}</p>
        )}
        <p className="text-brand-700 font-bold text-lg mt-1">
          ${product.price.toFixed(2)}
        </p>
        <p className="text-xs text-gray-400">{product.stock} disponibles</p>
        <button
          onClick={() => onAdd(product)}
          className="mt-3 w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-2 rounded-lg transition-colors"
        >
          Agregar
        </button>
      </div>
    </div>
  )
}
