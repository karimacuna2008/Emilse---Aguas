# UI Improvements — ProductCard Counter + Bottom Navigation

**Date:** 2026-06-13  
**Status:** Approved

---

## Overview

Two visual improvements to the customer-facing UI:

1. **ProductCard** — replace "Agregar" button with an inline quantity counter that transforms after first click; full green background when items are in the cart.
2. **Layout/Navigation** — replace the single sticky top header with a compact green top header (brand only) + a fixed green bottom navigation bar.

---

## Change 1: ProductCard with Inline Counter

### Behavior

| State | Card look | Control shown |
|-------|-----------|---------------|
| `quantity === 0` | White background, light green border | "Agregar" button (green) |
| `quantity > 0` | **Full green background** (`bg-brand-100 #d8f3dc`) + strong green border (`border-brand-700`) | `[− quantity +]` inline counter |

### Props

```jsx
<ProductCard
  product={product}     // product object from DB
  quantity={number}     // current quantity in cart (0 if not added)
  onAdd={fn}            // called with (product) to increment by 1
  onRemove={fn}         // called with (product.id) to decrement by 1
/>
```

### Counter logic (inside ProductCard)

- `+` button → `onAdd(product)`
- `−` button → `onRemove(product.id)`  
  — useCart's `removeItem` already handles: if quantity becomes 0, item is removed from cart
- The parent provides `quantity` so ProductCard is purely presentational (no local state)

### Visual detail

- Image area: `bg-brand-200` when quantity > 0 (slightly darker green), `bg-brand-100` when 0
- Counter row: `[−] [N] [+]` centered, full-width, inside the card body below price
- Counter buttons: rounded, green bg, white text; the number is bold and center-aligned
- "Agregar" button: full-width, green bg — same as current

---

## Change 2: Layout — Green Top Header + Green Bottom Nav

### Structure

```
┌──────────────────────────────┐  ← green top header (h-12, sticky)
│  💧 Aguas de Emi             │    brand name only, no nav links
├──────────────────────────────┤
│                              │
│   [main content area]        │  ← cream bg, pb-20 to clear bottom nav
│                              │
├──────────────────────────────┤
│  🏠 Tienda  🛒(badge)  👩‍💼  │  ← green bottom nav (h-16, fixed bottom)
└──────────────────────────────┘
```

### Top header

- `bg-brand-700 text-white`, height `h-12`, sticky top-0, z-50
- Contains only: `"💧 Aguas de Emi"` left-aligned (font-bold)
- No cart, no admin link — those move to bottom nav

### Bottom navigation bar

- `bg-brand-700`, fixed bottom-0, full width, z-40
- Height `h-16`, safe area aware (`pb-safe` or `pb-2` for iOS notch)
- Three icon+label tabs, equally spaced

**Customer view (`showAdmin = false`):**

| Tab | Icon | Label | Route |
|-----|------|-------|-------|
| Tienda | 🏠 | Tienda | `/` |
| Carrito | 🛒 | Carrito | `/checkout` |
| Admin | 👩‍💼 | Admin | `/admin/login` |

Cart badge: small green-on-white circle over 🛒, shows total item count, hidden when 0.

**Admin view (`showAdmin = true`):**

| Tab | Icon | Label | Action |
|-----|------|-------|--------|
| Pedidos | 📋 | Pedidos | link to `/admin/pedidos` |
| Productos | 📦 | Productos | link to `/admin/productos` |
| Salir | 🚪 | Salir | `signOut()` then navigate to `/` |

### Active tab highlight

Use `useLocation()` to detect current path. Active tab: `text-white` (fully opaque). Inactive tabs: `text-brand-200` (semitransparent white).

### Main content area

`<main className="pb-20">` — 80px bottom padding so content isn't hidden behind the bottom nav.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/store/ProductCard.jsx` | Full rewrite with counter logic |
| `src/components/store/ProductGrid.jsx` | Pass `quantity`, `onAdd`, `onRemove` to each ProductCard |
| `src/pages/StorePage.jsx` | Import `removeItem` from useCart, derive quantity per product, pass to ProductGrid |
| `src/components/shared/Layout.jsx` | Replace header with top bar + bottom nav |

---

## Out of Scope

- No search bar (rejected during brainstorm)
- No toast notifications (decided: card counter is sufficient feedback)
- No changes to checkout, admin, or order flows
- No changes to useCart hook internals

---

## Tests

- `ProductCard.test.jsx`: test initial state (Agregar button), after adding (counter shows), counter increment/decrement, green bg class applied when quantity > 0
- `Layout.jsx`: no new tests — visual only, covered by manual browser verification
