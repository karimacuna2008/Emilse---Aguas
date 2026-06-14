// src/components/store/ProductQuantityModal.jsx
import { useState, useEffect } from 'react'

export default function ProductQuantityModal({ product, initialQuantity = 0, onConfirm, onRemove, onClose }) {
  const [qty, setQty] = useState(initialQuantity > 0 ? initialQuantity : 1)
  useEffect(() => { setQty(initialQuantity > 0 ? initialQuantity : 1) }, [product, initialQuantity])
  if (!product) return null

  const editing = initialQuantity > 0
  const subtotal = product.price * qty

  return (
    <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl p-5 max-w-lg mx-auto">
        <div className="mx-auto w-10 h-1.5 bg-gray-300 rounded-full mb-4" />
        <button aria-label="Cerrar" onClick={onClose} className="absolute top-4 right-4 text-gray-400 text-2xl">✕</button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-16 h-16 rounded-xl bg-brand-100 flex items-center justify-center text-3xl overflow-hidden shrink-0">
            {product.image_url
              ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              : '💧'}
          </div>
          <div>
            <p className="font-semibold text-brand-900">{product.name}</p>
            <p className="text-brand-700 font-bold">${product.price.toFixed(2)} c/u</p>
            <p className="text-xs text-gray-400">{product.stock} disponibles</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 my-5">
          <button aria-label="Menos" onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-12 h-12 rounded-full bg-brand-100 text-brand-900 text-2xl font-bold">−</button>
          <span className="text-2xl font-bold w-10 text-center">{qty}</span>
          <button aria-label="Más" onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                  className="w-12 h-12 rounded-full bg-brand-100 text-brand-900 text-2xl font-bold">+</button>
        </div>

        <button onClick={() => onConfirm(product, qty)}
                className="w-full bg-brand-700 hover:bg-brand-900 text-white font-semibold py-3 rounded-xl">
          {editing ? 'Actualizar' : 'Agregar al carrito'} ${subtotal.toFixed(2)}
        </button>
        {editing && (
          <button onClick={() => onRemove(product.id)} className="w-full text-red-500 py-2 mt-2 text-sm">
            Quitar del carrito
          </button>
        )}
      </div>
    </div>
  )
}
