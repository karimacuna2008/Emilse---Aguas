// src/lib/catalog.js
export function uniqueCategories(products) {
  return [...new Set((products ?? []).map(p => p.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
}

export function filterProducts(products, { query = '', category = null } = {}) {
  let out = products ?? []
  if (category) out = out.filter(p => p.category === category)
  const q = query.trim().toLowerCase()
  if (q) out = out.filter(p => p.name.toLowerCase().includes(q))
  return [...out].sort((a, b) => a.name.localeCompare(b.name))
}
