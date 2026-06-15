// src/lib/orderErrors.js
const MESSAGES = {
  order_not_found:   'Pedido no encontrado.',
  order_not_pending: 'El pedido ya no está pendiente.',
  item_not_found:    'Ese artículo ya no está en el pedido.',
  out_of_stock:      'Sin stock suficiente.',
  invalid_total:     'El total debe ser mayor o igual a 0.',
  invalid_quantity:  'Cantidad inválida.',
  product_not_found: 'Producto no disponible.',
  empty_items:       'No hay artículos.',
}

export function mapOrderError(code, data) {
  if (code === 'out_of_stock' && data?.product_name) return `Sin stock suficiente de ${data.product_name}.`
  return MESSAGES[code] ?? 'Ocurrió un error. Intenta de nuevo.'
}
