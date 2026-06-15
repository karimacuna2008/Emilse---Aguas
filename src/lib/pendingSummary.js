// src/lib/pendingSummary.js
export function buildPendingSummary(orders) {
  const acc = {}
  for (const o of orders ?? []) {
    if (o.status !== 'pending') continue
    const d = o.delivery_date
    if (!acc[d]) acc[d] = { orderCount: 0, products: {} }
    acc[d].orderCount += 1
    for (const it of o.order_items ?? []) {
      const name = it.products?.name ?? '—'
      acc[d].products[name] = (acc[d].products[name] ?? 0) + it.quantity
    }
  }
  const dates = Object.keys(acc).sort()
  const byDate = Object.fromEntries(dates.map(d => [d, {
    date: d,
    orderCount: acc[d].orderCount,
    products: Object.entries(acc[d].products)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
  }]))
  return { dates, byDate }
}

// hoy si tiene pendientes; si no, la siguiente fecha futura; si no, la más reciente pasada; si no, null
export function defaultPendingDate(summary, todayISO) {
  const { dates } = summary
  if (!dates.length) return null
  if (dates.includes(todayISO)) return todayISO
  const future = dates.filter(d => d > todayISO)
  if (future.length) return future[0]
  return dates[dates.length - 1]
}
