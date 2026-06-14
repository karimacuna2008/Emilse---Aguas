// src/components/store/ProductCard.jsx
export default function ProductCard({ product, quantity = 0, onClick }) {
  const hasItems = quantity > 0
  return (
    <button
      onClick={() => onClick(product)}
      className={`relative text-left border-2 rounded-2xl overflow-hidden transition-colors w-full ${
        hasItems ? 'bg-brand-100 border-brand-700' : 'bg-white border-brand-100'
      }`}
    >
      {hasItems && (
        <span className="absolute top-2 right-2 z-10 bg-brand-700 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">
          {quantity}
        </span>
      )}
      <div className={`h-32 flex items-center justify-center text-5xl ${hasItems ? 'bg-brand-200' : 'bg-brand-100'}`}>
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          : '💧'}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-brand-900 leading-tight">{product.name}</h3>
        <p className="text-brand-700 font-bold mt-1">${product.price.toFixed(2)}</p>
      </div>
    </button>
  )
}
