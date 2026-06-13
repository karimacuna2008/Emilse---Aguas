import StockAdjust from './StockAdjust'

export default function ProductList({ products, onEdit, onToggle, onAddStock }) {
  return (
    <div className="flex flex-col gap-3">
      {products.map(p => (
        <div key={p.id} className="bg-white border border-brand-100 rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-brand-900">{p.name}</h3>
              <p className="text-brand-700 font-bold">${Number(p.price).toFixed(2)}</p>
              <p className={`text-sm ${p.stock === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                Stock: {p.stock} {p.stock === 0 && '⚠️'}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(p)}
                className="text-sm bg-brand-100 text-brand-900 px-3 py-1 rounded-lg hover:bg-brand-200">
                Editar
              </button>
              <button onClick={() => onToggle(p.id, !p.active)}
                className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-200">
                {p.active ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-surface-border">
            <StockAdjust product={p} onAdjust={onAddStock} />
          </div>
        </div>
      ))}
    </div>
  )
}
