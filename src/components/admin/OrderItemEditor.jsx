export default function OrderItemEditor({ items, onChangeQty, onRemove, onRemoveLast }) {
  const last = items.length === 1
  return (
    <div className="bg-white border border-surface-border rounded-xl p-3">
      <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">Artículos</div>
      {items.map(it => (
        <div key={it.product_id} className="py-2 border-b border-dashed border-surface-border last:border-0">
          <div className="flex justify-between items-center">
            <span className="text-brand-900">{it.products?.name} <span className="text-gray-400 text-sm">${Number(it.unit_price).toFixed(0)} c/u</span></span>
            <span className="font-bold text-brand-900">${(it.unit_price * it.quantity).toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 flex items-center justify-between border border-surface-border rounded-lg">
              <button aria-label="−" onClick={() => onChangeQty(it.product_id, it.quantity - 1)}
                className="w-11 h-10 text-brand-700 text-xl font-bold bg-brand-50 rounded-l-lg">−</button>
              <span className="font-extrabold text-base">{it.quantity}</span>
              <button aria-label="+" onClick={() => onChangeQty(it.product_id, it.quantity + 1)}
                className="w-11 h-10 text-brand-700 text-xl font-bold bg-brand-50 rounded-r-lg">+</button>
            </div>
            <button aria-label="quitar" onClick={() => (last ? onRemoveLast() : onRemove(it.product_id))}
              className="w-12 h-10 border border-red-200 rounded-lg text-red-600 bg-red-50">🗑</button>
          </div>
        </div>
      ))}
    </div>
  )
}
