// src/components/store/OpenOrderChoice.jsx
export default function OpenOrderChoice({ openOrder, loading, onAddToOpen, onCreateNew }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-brand-100 border border-brand-200 rounded-2xl p-4">
        <p className="text-brand-900 font-semibold">Ya tienes un pedido abierto para esta fecha</p>
        <p className="text-brand-700 font-bold text-lg mt-1">{openOrder.order_number}</p>
        <div className="mt-2 text-sm text-gray-600">
          {openOrder.items.map((it, idx) => (
            <p key={idx}>{it.name} × {it.quantity}</p>
          ))}
          <p className="font-semibold text-brand-900 mt-1">Total actual: ${Number(openOrder.total).toFixed(2)}</p>
        </div>
      </div>
      <button
        onClick={onAddToOpen} disabled={loading}
        className="w-full bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
      >
        ➕ Sumar a este pedido
      </button>
      <button
        onClick={onCreateNew} disabled={loading}
        className="w-full border border-brand-700 text-brand-700 font-semibold py-3 rounded-xl disabled:opacity-50"
      >
        🆕 Crear un pedido nuevo aparte
      </button>
    </div>
  )
}
