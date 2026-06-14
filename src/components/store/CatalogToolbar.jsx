// src/components/store/CatalogToolbar.jsx
import ViewToggle from './ViewToggle'

export default function CatalogToolbar({
  query, onQueryChange,
  categories, activeCategory, onCategoryChange,
  view, onViewChange,
}) {
  const chip = (active) =>
    `whitespace-nowrap px-3 py-1 rounded-full text-sm border ${
      active ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-brand-700 border-brand-200'
    }`
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Buscar producto..."
          className="flex-1 border border-surface-border rounded-xl px-4 py-2 focus:outline-none focus:border-brand-700"
        />
        <ViewToggle view={view} onChange={onViewChange} />
      </div>
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => onCategoryChange(null)} className={chip(activeCategory === null)}>
            Todos
          </button>
          {categories.map(cat => (
            <button type="button" key={cat} onClick={() => onCategoryChange(cat)} className={chip(activeCategory === cat)}>
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
