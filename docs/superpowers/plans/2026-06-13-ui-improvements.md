# UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Agregar" button with an inline counter that turns the card green when items are in the cart, and redesign the app navigation with a compact green top header and a fixed green bottom nav bar.

**Architecture:** ProductCard becomes fully presentational — it receives `quantity`, `onAdd`, and `onRemove` as props and renders conditionally. StorePage derives per-product quantity from the cart items array and passes a `handleRemove` that calls `useCart`'s `updateQuantity(id, qty-1)` (which already auto-removes at 0). Layout replaces its single sticky header with a slim green top bar plus a fixed green bottom nav that adapts between customer and admin views.

**Tech Stack:** React 19, Tailwind CSS v3 (brand-* color tokens), react-router-dom v7 (`useLocation`), Vitest + @testing-library/react

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/store/ProductCard.jsx` | Modify | Presentational card — renders Agregar or [−/+] based on `quantity` prop |
| `src/components/store/ProductCard.test.jsx` | Modify | TDD tests for all card states |
| `src/components/store/ProductGrid.jsx` | Modify | Passes `quantity`, `onAdd`, `onRemove`, `getQuantity` to each card |
| `src/pages/StorePage.jsx` | Modify | Derives per-product quantity, provides `handleRemove` using `updateQuantity` |
| `src/components/shared/Layout.jsx` | Modify | Green top header + green fixed bottom nav (customer & admin variants) |

---

## Task 1: ProductCard — Counter + Green State (TDD)

**Spec:** `docs/superpowers/specs/2026-06-13-ui-improvements-design.md` — Change 1

**Files:**
- Modify: `src/components/store/ProductCard.jsx`
- Modify: `src/components/store/ProductCard.test.jsx`

**Context:** Current card has `onAdd` prop only. New card adds `quantity` (default 0) and `onRemove`. When `quantity === 0`: white background + "Agregar" button. When `quantity > 0`: green background + inline `[− N +]` counter. Current tests must still pass (they don't pass `quantity`, so default=0 covers them).

- [ ] **Step 1: Add new failing tests to `src/components/store/ProductCard.test.jsx`**

Replace the entire file with:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductCard from './ProductCard'

const product = { id: '1', name: 'Agua 5L', price: 20, stock: 10, image_url: null, description: null }

describe('ProductCard', () => {
  it('displays product name and price', () => {
    render(<ProductCard product={product} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('Agua 5L')).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })

  it('shows Agregar button when quantity is 0 (default)', () => {
    render(<ProductCard product={product} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument()
    expect(screen.queryByText('−')).not.toBeInTheDocument()
  })

  it('calls onAdd with product when Agregar is clicked', () => {
    const onAdd = vi.fn()
    render(<ProductCard product={product} onAdd={onAdd} onRemove={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }))
    expect(onAdd).toHaveBeenCalledWith(product)
  })

  it('shows [− N +] counter instead of Agregar when quantity > 0', () => {
    render(<ProductCard product={product} quantity={2} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('−')).toBeInTheDocument()
    expect(screen.getByText('+')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /agregar/i })).not.toBeInTheDocument()
  })

  it('applies green background class when quantity > 0', () => {
    const { container } = render(<ProductCard product={product} quantity={1} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(container.firstChild).toHaveClass('bg-brand-100')
    expect(container.firstChild).toHaveClass('border-brand-700')
  })

  it('does NOT apply green background when quantity is 0', () => {
    const { container } = render(<ProductCard product={product} quantity={0} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(container.firstChild).not.toHaveClass('bg-brand-100')
    expect(container.firstChild).not.toHaveClass('border-brand-700')
  })

  it('calls onAdd with product when + is clicked', () => {
    const onAdd = vi.fn()
    render(<ProductCard product={product} quantity={1} onAdd={onAdd} onRemove={vi.fn()} />)
    fireEvent.click(screen.getByText('+'))
    expect(onAdd).toHaveBeenCalledWith(product)
  })

  it('calls onRemove with product id when − is clicked', () => {
    const onRemove = vi.fn()
    render(<ProductCard product={product} quantity={1} onAdd={vi.fn()} onRemove={onRemove} />)
    fireEvent.click(screen.getByText('−'))
    expect(onRemove).toHaveBeenCalledWith('1')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/components/store/ProductCard.test.jsx
```

Expected: several tests FAIL (shows Agregar, counter, green classes don't exist yet).

- [ ] **Step 3: Rewrite `src/components/store/ProductCard.jsx`**

Replace the entire file with:

```jsx
export default function ProductCard({ product, quantity = 0, onAdd, onRemove }) {
  const hasItems = quantity > 0

  return (
    <div className={`border-2 rounded-2xl overflow-hidden transition-colors ${
      hasItems ? 'bg-brand-100 border-brand-700' : 'bg-white border-brand-100'
    }`}>
      <div className={`h-32 flex items-center justify-center text-5xl ${
        hasItems ? 'bg-brand-200' : 'bg-brand-100'
      }`}>
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          : '💧'
        }
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-brand-900">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-500 mt-1">{product.description}</p>
        )}
        <p className="text-brand-700 font-bold text-lg mt-1">${product.price.toFixed(2)}</p>
        <p className="text-xs text-gray-400">{product.stock} disponibles</p>

        {hasItems ? (
          <div className="mt-3 flex items-center bg-brand-700 rounded-lg overflow-hidden">
            <button
              onClick={() => onRemove(product.id)}
              className="bg-black/15 hover:bg-black/25 text-white font-bold text-xl px-4 py-2 transition-colors"
            >
              −
            </button>
            <span className="text-white font-bold text-base flex-1 text-center">{quantity}</span>
            <button
              onClick={() => onAdd(product)}
              className="bg-black/15 hover:bg-black/25 text-white font-bold text-xl px-4 py-2 transition-colors"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAdd(product)}
            className="mt-3 w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-2 rounded-lg transition-colors"
          >
            Agregar
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they all pass**

```bash
npx vitest run src/components/store/ProductCard.test.jsx
```

Expected: 8/8 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/store/ProductCard.jsx src/components/store/ProductCard.test.jsx
git commit -m "feat: ProductCard inline counter — Agregar transforms to [−/+], green bg when in cart"
```

---

## Task 2: ProductGrid + StorePage — Wire Counter Props

**Spec:** `docs/superpowers/specs/2026-06-13-ui-improvements-design.md` — Change 1

**Files:**
- Modify: `src/components/store/ProductGrid.jsx`
- Modify: `src/pages/StorePage.jsx`

**Context:** ProductCard now needs `quantity`, `onAdd`, `onRemove`. ProductGrid must pass them through. StorePage owns the cart state and must provide `getQuantity(productId)` and `handleRemove(productId)`.

`useCart` exports: `{ items, total, addItem, removeItem, updateQuantity, clearCart }`.  
`updateQuantity(productId, qty)` auto-removes the item when `qty <= 0` — use this for decrement.  
`items` shape: `[{ product_id, name, price, quantity, maxStock }]`.

No new tests for these files — ProductCard tests cover the visual logic. Verify in browser.

- [ ] **Step 1: Rewrite `src/components/store/ProductGrid.jsx`**

Replace the entire file with:

```jsx
import ProductCard from './ProductCard'

export default function ProductGrid({ products, onAdd, onRemove, getQuantity }) {
  if (!products.length) {
    return (
      <p className="text-center text-gray-400 py-12">
        No hay productos disponibles en este momento.
      </p>
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {products.map(p => (
        <ProductCard
          key={p.id}
          product={p}
          quantity={getQuantity(p.id)}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `src/pages/StorePage.jsx`**

Replace the entire file with:

```jsx
import { useProducts } from '../hooks/useProducts'
import { useCart } from '../hooks/useCart'
import ProductGrid from '../components/store/ProductGrid'
import WhatsAppLink from '../components/shared/WhatsAppLink'
import Layout from '../components/shared/Layout'

export default function StorePage() {
  const { products, loading, error } = useProducts()
  const { items, addItem, updateQuantity } = useCart()

  function getQuantity(productId) {
    return items.find(i => i.product_id === productId)?.quantity ?? 0
  }

  function handleRemove(productId) {
    const item = items.find(i => i.product_id === productId)
    if (item) updateQuantity(productId, item.quantity - 1)
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-900">Nuestros productos</h1>
          <p className="text-gray-500 text-sm mt-1">Agua fresca a domicilio</p>
        </div>
        {loading && <p className="text-center py-12 text-gray-400">Cargando productos...</p>}
        {error   && <p className="text-center py-12 text-red-500">Error al cargar productos.</p>}
        {!loading && !error && (
          <ProductGrid
            products={products}
            onAdd={addItem}
            onRemove={handleRemove}
            getQuantity={getQuantity}
          />
        )}
      </div>
      <WhatsAppLink />
    </Layout>
  )
}
```

- [ ] **Step 3: Run full test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/store/ProductGrid.jsx src/pages/StorePage.jsx
git commit -m "feat: wire quantity counter props through ProductGrid and StorePage"
```

---

## Task 3: Layout — Green Top Header + Green Bottom Nav

**Spec:** `docs/superpowers/specs/2026-06-13-ui-improvements-design.md` — Change 2

**Files:**
- Modify: `src/components/shared/Layout.jsx`

**Context:** Current Layout has one sticky top header with both brand and nav links. Replace with:
- Slim green top header (brand name only, `h-12`, sticky top-0)
- Fixed green bottom nav bar (`h-16`, bottom-0), two variants:
  - `showAdmin = false` (customer): Tienda → `/`, Carrito → `/checkout` (badge), Admin → `/admin/login`
  - `showAdmin = true` (admin): Pedidos → `/admin/pedidos`, Productos → `/admin/productos`, Salir → `signOut()`
- Active tab: `text-white`. Inactive tabs: `text-brand-200`.
- Main content wrapped in `pb-20` to clear the bottom nav.

`useLocation()` from react-router-dom provides current path for active tab detection. Special case: `/` must match exactly (not prefix-match) because every path starts with `/`.

No unit tests — this is layout/routing, verified in browser.

- [ ] **Step 1: Rewrite `src/components/shared/Layout.jsx`**

Replace the entire file with:

```jsx
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { useAuth } from '../../hooks/useAuth'

export default function Layout({ children, showAdmin = false }) {
  const { items } = useCart()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const count = items.reduce((s, i) => s + i.quantity, 0)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  function navClass(path) {
    const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
    return `flex flex-col items-center gap-0.5 transition-colors ${isActive ? 'text-white' : 'text-brand-200'}`
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Top header — brand only */}
      <header className="bg-brand-700 text-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center">
          <Link to="/" className="font-bold text-lg text-brand-100">💧 Aguas de Emi</Link>
        </div>
      </header>

      {/* Main content — bottom padding clears the fixed nav bar */}
      <main className="pb-20">{children}</main>

      {/* Bottom navigation */}
      <nav className="bg-brand-700 fixed bottom-0 inset-x-0 z-50 h-16 flex items-center">
        <div className="max-w-lg mx-auto w-full flex justify-around px-4">
          {!showAdmin ? (
            <>
              <Link to="/" className={navClass('/')}>
                <span className="text-2xl">🏠</span>
                <span className="text-xs font-semibold">Tienda</span>
              </Link>

              <Link to="/checkout" className={`${navClass('/checkout')} relative`}>
                <span className="text-2xl relative">
                  🛒
                  {count > 0 && (
                    <span className="absolute -top-1 -right-2 bg-white text-brand-700 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </span>
                <span className="text-xs font-semibold">Carrito</span>
              </Link>

              <Link to="/admin/login" className={navClass('/admin')}>
                <span className="text-2xl">👩‍💼</span>
                <span className="text-xs font-semibold">Admin</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/admin/pedidos" className={navClass('/admin/pedidos')}>
                <span className="text-2xl">📋</span>
                <span className="text-xs font-semibold">Pedidos</span>
              </Link>

              <Link to="/admin/productos" className={navClass('/admin/productos')}>
                <span className="text-2xl">📦</span>
                <span className="text-xs font-semibold">Productos</span>
              </Link>

              <button onClick={handleSignOut} className="flex flex-col items-center gap-0.5 text-brand-200 hover:text-white transition-colors">
                <span className="text-2xl">🚪</span>
                <span className="text-xs font-semibold">Salir</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: all existing tests pass (Layout has no unit tests; verified in browser).

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/Layout.jsx
git commit -m "feat: replace top header nav with slim top bar + green bottom navigation"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Change 1 (card counter + green bg) → Tasks 1 & 2. Change 2 (top bar + bottom nav) → Task 3. All spec requirements covered.
- [x] **Placeholders:** None. All steps contain complete code.
- [x] **Type consistency:** `onRemove(product.id)` in ProductCard → `handleRemove(productId)` in StorePage → `updateQuantity(productId, qty-1)` in useCart. `getQuantity(p.id)` in ProductGrid → `getQuantity(productId)` in StorePage. All consistent.
- [x] **Edge case:** `updateQuantity(id, 0)` inside useCart auto-calls `removeItem` — so decrementing from 1 correctly removes the item. No extra handling needed.
- [x] **navClass `/` edge case:** Uses exact match `pathname === '/'` to prevent every path from matching the Tienda tab.
