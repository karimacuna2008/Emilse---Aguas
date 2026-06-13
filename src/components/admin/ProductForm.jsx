import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ProductForm({ product, onSave, onCancel }) {
  const [name, setName]       = useState(product?.name ?? '')
  const [desc, setDesc]       = useState(product?.description ?? '')
  const [price, setPrice]     = useState(product?.price ?? '')
  const [stock, setStock]     = useState(product?.stock ?? 0)
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      let image_url = product?.image_url ?? null

      if (file) {
        const ext  = file.name.split('.').pop()
        const path = `products/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('product-images').upload(path, file)
        if (upErr) {
          setError('No se pudo subir la imagen: ' + upErr.message)
          return
        }
        const { data } = supabase.storage.from('product-images').getPublicUrl(path)
        image_url = data.publicUrl
      }

      await onSave({
        ...(product?.id ? { id: product.id } : {}),
        name, description: desc,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        image_url,
        active: product?.active ?? true,
      })
    } catch (err) {
      setError('No se pudo guardar: ' + (err?.message ?? 'error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del producto" required
        className="border border-surface-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-700" />
      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción (opcional)" rows={2}
        className="border border-surface-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-700 resize-none" />
      <div className="flex gap-3">
        <input type="number" step="0.01" min="0.01" value={price} onChange={e => setPrice(e.target.value)}
          placeholder="Precio" required
          className="flex-1 border border-surface-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-700" />
        <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)}
          placeholder="Stock inicial"
          className="flex-1 border border-surface-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-700" />
      </div>
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])}
        className="text-sm text-gray-500" />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="flex-1 bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold">
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 border border-surface-border text-brand-900 py-2.5 rounded-xl">
          Cancelar
        </button>
      </div>
    </form>
  )
}
