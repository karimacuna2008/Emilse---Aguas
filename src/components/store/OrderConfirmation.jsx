export default function OrderConfirmation({ orderNumber, onTrack }) {
  return (
    <div className="text-center py-8 flex flex-col items-center gap-4">
      <div className="text-6xl">✅</div>
      <h2 className="text-2xl font-bold text-brand-900">¡Pedido recibido!</h2>
      <p className="text-gray-500">Emi se pondrá en contacto cuando esté listo.</p>
      <div className="bg-brand-100 border border-brand-200 rounded-2xl px-8 py-4 w-full max-w-xs">
        <p className="text-sm text-gray-500 mb-1">Tu número de pedido</p>
        <p className="text-4xl font-bold text-brand-700">{orderNumber}</p>
        <p className="text-xs text-gray-400 mt-1">Guárdalo para rastrear tu pedido</p>
      </div>
      <button
        onClick={onTrack}
        className="text-brand-700 underline text-sm"
      >
        Ver estado del pedido
      </button>
    </div>
  )
}
