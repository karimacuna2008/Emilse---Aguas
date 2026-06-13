export default function ProductCard({ product, quantity = 0, onAdd, onRemove }) {
  const hasItems = quantity > 0

  return (
    <div className={`border-2 rounded-2xl overflow-hidden transition-colors ${
      hasItems ? 'bg-brand-100 border-brand-700' : 'bg-white border-brand-100'
    }`}>
      <div className={`h-32 flex items-center justify-center text-5xl ${
        hasItems ? 'bg-brand-200' : 'bg-brand-100'
      }`}>
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          : '💧'
        }
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-brand-900">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-500 mt-1">{product.description}</p>
        )}
        <p className="text-brand-700 font-bold text-lg mt-1">${product.price.toFixed(2)}</p>
        <p className="text-xs text-gray-400">{product.stock} disponibles</p>

        {hasItems ? (
          <div className="mt-3 flex items-center bg-brand-700 rounded-lg overflow-hidden">
            <button
              onClick={() => onRemove(product.id)}
              className="bg-black/15 hover:bg-black/25 text-white font-bold text-xl px-4 py-2 transition-colors"
            >
              −
            </button>
            <span className="text-white font-bold text-base flex-1 text-center">{quantity}</span>
            <button
              onClick={() => onAdd(product)}
              className="bg-black/15 hover:bg-black/25 text-white font-bold text-xl px-4 py-2 transition-colors"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAdd(product)}
            className="mt-3 w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-2 rounded-lg transition-colors"
          >
            Agregar
          </button>
        )}
      </div>
    </div>
  )
}
