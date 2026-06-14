export default function Cart({ items, total, onRemove, onUpdateQty, onCheckout }) {
  if (!items.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-4xl mb-2">🛒</p>
        <p>Tu carrito está vacío</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map(item => (
        <div key={item.product_id} className="flex items-center gap-3 bg-white border border-brand-100 rounded-xl p-3">
          <div className="flex-1">
            <p className="font-medium text-brand-900">{item.name}</p>
            <p className="text-sm text-brand-700">${item.price.toFixed(2)} c/u</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQty(item.product_id, item.quantity - 1)}
              className="w-7 h-7 rounded-full bg-brand-100 text-brand-900 font-bold hover:bg-brand-200"
            >−</button>
            <span className="w-6 text-center font-semibold">{item.quantity}</span>
            <button
              onClick={() => onUpdateQty(item.product_id, Math.min(item.quantity + 1, item.maxStock))}
              className="w-7 h-7 rounded-full bg-brand-100 text-brand-900 font-bold hover:bg-brand-200"
            >+</button>
          </div>
          <button onClick={() => onRemove(item.product_id)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
        </div>
      ))}
      <div className="flex justify-between items-center pt-2 border-t border-surface-border">
        <span className="font-semibold text-brand-900">Total</span>
        <span className="text-xl font-bold text-brand-700">${total.toFixed(2)}</span>
      </div>
      <button
        onClick={onCheckout}
        className="w-full bg-brand-700 hover:bg-brand-900 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Continuar →
      </button>
    </div>
  )
}
