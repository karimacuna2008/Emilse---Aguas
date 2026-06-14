// src/components/store/ProductListItem.jsx
export default function ProductListItem({ product, quantity = 0, onAdd, onRemove }) {
  const hasItems = quantity > 0
  return (
    <div className={`flex items-center gap-3 border rounded-xl p-2 transition-colors ${
      hasItems ? 'bg-brand-100 border-brand-700' : 'bg-white border-brand-100'
    }`}>
      <div className="w-14 h-14 rounded-lg bg-brand-100 flex items-center justify-center text-2xl overflow-hidden shrink-0">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          : '💧'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-brand-900 leading-tight">{product.name}</p>
        <p className="text-brand-700 font-bold">${product.price.toFixed(2)}</p>
      </div>
      {hasItems ? (
        <div className="flex items-center bg-white border border-brand-700 rounded-lg overflow-hidden">
          <button aria-label="Quitar uno" onClick={() => onRemove(product.id)}
                  className="text-brand-700 font-bold text-xl px-3 py-1">−</button>
          <span className="font-bold w-8 text-center text-brand-900">{quantity}</span>
          <button aria-label="Agregar uno" onClick={() => onAdd(product)}
                  className="text-brand-700 font-bold text-xl px-3 py-1">+</button>
        </div>
      ) : (
        <button onClick={() => onAdd(product)}
                className="bg-brand-700 hover:bg-brand-900 text-white font-medium px-4 py-2 rounded-lg text-sm shrink-0">
          Agregar
        </button>
      )}
    </div>
  )
}
