# Sistema Ventas e Inventario — Aguas de Emi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app where customers browse and order water products anonymously, and Emi manages inventory, products, and orders through an admin panel.

**Architecture:** React + Vite SPA on Vercel (free tier). Supabase handles PostgreSQL database, Auth (Emi only), Row Level Security, and Storage for product images. All order/inventory business logic runs inside PostgreSQL functions called via Supabase RPC — no custom backend server.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, @supabase/supabase-js 2, react-router-dom 6, Vitest + @testing-library/react (tests)

---

## File Map

```
src/
  lib/
    supabase.js              Supabase client singleton
  hooks/
    useProducts.js           Fetch active products with stock
    useCart.js               Cart state in localStorage
    useAuth.js               Emi session state
    useOrders.js             Fetch/filter orders (admin)
  components/
    store/
      ProductCard.jsx        Single product card
      ProductGrid.jsx        Grid of ProductCards
      Cart.jsx               Cart drawer with totals
      CheckoutForm.jsx       Name / phone / notes form
      OrderConfirmation.jsx  Success screen with order code
      OrderTracker.jsx       Look up order status by code
    admin/
      LoginForm.jsx          Email + password form
      ProtectedRoute.jsx     Auth guard wrapper
      ProductList.jsx        Admin product table
      ProductForm.jsx        Create / edit product + image
      StockAdjust.jsx        Add units to a product
      OrderList.jsx          Filterable order list
      OrderCard.jsx          Order row with Deliver / Cancel actions
    shared/
      Layout.jsx             Page wrapper + nav
      WhatsAppLink.jsx       Floating WhatsApp button
  pages/
    StorePage.jsx            /  — public catalog
    CheckoutPage.jsx         /checkout
    OrderStatusPage.jsx      /pedido/:code
    AdminLoginPage.jsx       /admin/login
    AdminOrdersPage.jsx      /admin/pedidos
    AdminProductsPage.jsx    /admin/productos
  App.jsx                    Router setup
  main.jsx                   Entry point
  index.css                  Tailwind directives + base

supabase/
  migrations/
    001_schema.sql           Tables + enum + sequence
    002_rls.sql              Row Level Security policies
    003_functions.sql        crear_pedido + cancelar_pedido
  seed.sql                   Sample products for dev

.env.example
```

---

## Task 1: Initialize Project

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`, `.env.example`, `.gitignore`

- [ ] **Step 1: Scaffold Vite project**

```bash
npm create vite@latest . -- --template react
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js react-router-dom
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Initialize Tailwind**

```bash
npx tailwindcss init -p
```

- [ ] **Step 4: Configure Tailwind content paths**

Replace `tailwind.config.js` with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 5: Add Tailwind directives to `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Configure Vitest in `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
```

- [ ] **Step 7: Create `src/test-setup.js`**

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Create `.env.example`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_WHATSAPP_NUMBER=521234567890
```

- [ ] **Step 9: Create `.gitignore` entry for env**

Add to `.gitignore`:
```
.env
.env.local
```

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite server running at `http://localhost:5173`

- [ ] **Step 11: Commit**

```bash
git init
git add .
git commit -m "feat: initialize React + Vite + Tailwind project"
```

---

## Task 2: Tailwind Theme — Style C (Warm & Friendly)

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: Extend Tailwind with brand colors**

Replace `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#d8f3dc',
          200: '#b7e4c7',
          500: '#52b788',
          700: '#2d6a4f',
          900: '#1b4332',
        },
        surface: {
          DEFAULT: '#fffdf7',
          soft:    '#fef9f0',
          border:  '#e7dfc6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Add Inter font and base styles to `src/index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-surface text-brand-900 font-sans;
  }
}
```

- [ ] **Step 3: Smoke-test colors in `src/App.jsx`**

```jsx
export default function App() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="bg-brand-100 text-brand-900 p-6 rounded-xl border border-surface-border">
        <h1 className="text-2xl font-bold text-brand-700">💧 Aguas de Emi</h1>
        <p className="text-brand-500 mt-1">Estilo C activo</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify colors render correctly**

```bash
npm run dev
```
Expected: Card with cream background, green heading visible in browser.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: configure Tailwind theme with Style C brand colors"
```

---

## Task 3: Database Schema

**Files:**
- Create: `supabase/migrations/001_schema.sql`

- [ ] **Step 1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write `supabase/migrations/001_schema.sql`**

```sql
-- Status enum
CREATE TYPE order_status AS ENUM ('pending', 'delivered', 'cancelled');

-- Sequence for EM-001, EM-002...
CREATE SEQUENCE order_number_seq START 1;

-- Products
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL CHECK (price > 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url   TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number   TEXT NOT NULL UNIQUE,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  notes          TEXT,
  status         order_status NOT NULL DEFAULT 'pending',
  total          DECIMAL(10,2) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order items
CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  DECIMAL(10,2) NOT NULL
);

CREATE INDEX ON order_items(order_id);
CREATE INDEX ON orders(status);
CREATE INDEX ON orders(order_number);
```

- [ ] **Step 3: Create Supabase project**

Go to https://supabase.com → New project. Save the project URL and anon key in `.env.local`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_WHATSAPP_NUMBER=521234567890
```

- [ ] **Step 4: Run migration in Supabase SQL editor**

Paste `001_schema.sql` into the Supabase SQL editor and click Run.
Expected: No errors. Tables `products`, `orders`, `order_items` appear in Table Editor.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/001_schema.sql
git commit -m "feat: add initial database schema"
```

---

## Task 4: Row Level Security

**Files:**
- Create: `supabase/migrations/002_rls.sql`

- [ ] **Step 1: Write `supabase/migrations/002_rls.sql`**

```sql
-- Enable RLS on all tables
ALTER TABLE products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Products: anyone can read active products
CREATE POLICY "public read active products"
  ON products FOR SELECT
  USING (active = TRUE);

-- Products: only authenticated users (Emi) can insert/update/delete
CREATE POLICY "admin full access products"
  ON products FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Orders: anyone can insert (anonymous checkout)
CREATE POLICY "public create orders"
  ON orders FOR INSERT
  WITH CHECK (TRUE);

-- Orders: anyone can read their own order by order_number (no auth required)
CREATE POLICY "public read orders"
  ON orders FOR SELECT
  USING (TRUE);

-- Orders: only Emi can update status
CREATE POLICY "admin update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Order items: anyone can insert (part of checkout)
CREATE POLICY "public create order_items"
  ON order_items FOR INSERT
  WITH CHECK (TRUE);

-- Order items: anyone can read (for order status page)
CREATE POLICY "public read order_items"
  ON order_items FOR SELECT
  USING (TRUE);
```

- [ ] **Step 2: Run in Supabase SQL editor**

Paste and run. Expected: No errors.

- [ ] **Step 3: Verify in Supabase dashboard**

Go to Authentication → Policies. Confirm policies appear on all 3 tables.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_rls.sql
git commit -m "feat: add Row Level Security policies"
```

---

## Task 5: PostgreSQL Functions

**Files:**
- Create: `supabase/migrations/003_functions.sql`

- [ ] **Step 1: Write `supabase/migrations/003_functions.sql`**

```sql
-- crear_pedido: atomic order creation with stock validation
CREATE OR REPLACE FUNCTION crear_pedido(
  p_customer_name  TEXT,
  p_customer_phone TEXT,
  p_notes          TEXT,
  p_items          JSONB  -- [{"product_id":"uuid","quantity":2}, ...]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id     UUID;
  v_order_number TEXT;
  v_total        DECIMAL := 0;
  v_item         JSONB;
  v_product      RECORD;
BEGIN
  -- Validate and lock each product row
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, name, price, stock
    INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::UUID
      AND active = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'product_not_found');
    END IF;

    IF v_product.stock < (v_item->>'quantity')::INT THEN
      RETURN jsonb_build_object(
        'error', 'out_of_stock',
        'product_name', v_product.name
      );
    END IF;

    v_total := v_total + v_product.price * (v_item->>'quantity')::INT;
  END LOOP;

  -- Generate human-readable order number
  v_order_number := 'EM-' || LPAD(nextval('order_number_seq')::TEXT, 3, '0');

  -- Insert order
  INSERT INTO orders (order_number, customer_name, customer_phone, notes, status, total)
  VALUES (v_order_number, p_customer_name, p_customer_phone, p_notes, 'pending', v_total)
  RETURNING id INTO v_order_id;

  -- Insert items + decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    SELECT v_order_id,
           p.id,
           (v_item->>'quantity')::INT,
           p.price
    FROM products p
    WHERE p.id = (v_item->>'product_id')::UUID;

    UPDATE products
    SET stock = stock - (v_item->>'quantity')::INT
    WHERE id = (v_item->>'product_id')::UUID;
  END LOOP;

  RETURN jsonb_build_object(
    'success',      TRUE,
    'order_number', v_order_number,
    'order_id',     v_order_id
  );
END;
$$;

-- cancelar_pedido: cancel order and restore stock
CREATE OR REPLACE FUNCTION cancelar_pedido(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, status INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'order_not_found');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'order_not_pending');
  END IF;

  -- Restore stock
  UPDATE products p
  SET stock = p.stock + oi.quantity
  FROM order_items oi
  WHERE oi.order_id = p_order_id
    AND p.id = oi.product_id;

  -- Cancel order
  UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- Grant execute permissions to the correct roles
GRANT EXECUTE ON FUNCTION crear_pedido   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancelar_pedido TO authenticated;
GRANT EXECUTE ON FUNCTION add_stock       TO authenticated;
```

- [ ] **Step 2: Run in Supabase SQL editor**

Paste and run. Expected: No errors.

- [ ] **Step 3: Test `crear_pedido` manually**

In Supabase SQL editor, insert a sample product, then call:
```sql
-- Insert test product
INSERT INTO products (name, price, stock) VALUES ('Agua Test', 10.00, 5)
RETURNING id;
-- Copy the UUID, replace below
SELECT crear_pedido(
  'Juan Test',
  '5551234567',
  'Casa azul',
  '[{"product_id":"<uuid-here>","quantity":2}]'::JSONB
);
```
Expected: `{"success": true, "order_number": "EM-001", "order_id": "..."}` and `products.stock` becomes 3.

- [ ] **Step 4: Test out-of-stock race condition**

```sql
SELECT crear_pedido(
  'María Test',
  '5559876543',
  '',
  '[{"product_id":"<uuid-here>","quantity":10}]'::JSONB
);
```
Expected: `{"error": "out_of_stock", "product_name": "Agua Test"}`

- [ ] **Step 5: Test `cancelar_pedido`**

```sql
-- Use order_id from Step 3 result
SELECT cancelar_pedido('<order-id-here>');
-- Then verify stock restored
SELECT stock FROM products WHERE name = 'Agua Test';
```
Expected: stock back to 5.

- [ ] **Step 6: Clean up test data**

```sql
DELETE FROM products WHERE name = 'Agua Test';
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/003_functions.sql
git commit -m "feat: add crear_pedido and cancelar_pedido atomic functions"
```

---

## Task 6: Supabase Client + Seed Data

**Files:**
- Create: `src/lib/supabase.js`
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create `src/lib/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] **Step 2: Create `supabase/seed.sql`**

```sql
INSERT INTO products (name, description, price, stock, active) VALUES
  ('Agua 500ml',   'Botella individual',          8.00,  50, TRUE),
  ('Agua 1L',      'Botella de 1 litro',          12.00, 40, TRUE),
  ('Agua 5L',      'Botella familiar',            20.00, 25, TRUE),
  ('Garrafón 20L', 'Garrafón recargable 20 litros', 45.00, 15, TRUE),
  ('Pack x6 500ml','Six pack de botellas 500ml',  42.00, 20, TRUE);
```

- [ ] **Step 3: Run seed in Supabase SQL editor**

Paste and run `seed.sql`. Expected: 5 products visible in Table Editor.

- [ ] **Step 4: Verify client connects from React**

Temporarily modify `src/App.jsx`:
```jsx
import { useEffect } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  useEffect(() => {
    supabase.from('products').select('name, price')
      .then(({ data, error }) => console.log(data, error))
  }, [])
  return <div>Check console</div>
}
```

Run `npm run dev`. Open browser console.
Expected: Array of 5 products logged, no error.

- [ ] **Step 5: Revert App.jsx to placeholder**

```jsx
export default function App() {
  return <div>Aguas de Emi</div>
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase.js supabase/seed.sql
git commit -m "feat: add Supabase client and dev seed data"
```

---

## Task 7: useProducts Hook

**Files:**
- Create: `src/hooks/useProducts.js`
- Create: `src/hooks/useProducts.test.js`

- [ ] **Step 1: Write failing test**

Create `src/hooks/useProducts.test.js`:
```js
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProducts } from './useProducts'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq:    vi.fn(() => ({
          gt:    vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
                { id: '1', name: 'Agua 5L', price: 20, stock: 5, active: true },
              ],
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}))

describe('useProducts', () => {
  it('returns active products with stock', async () => {
    const { result } = renderHook(() => useProducts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.products).toHaveLength(1)
    expect(result.current.products[0].name).toBe('Agua 5L')
    expect(result.current.error).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/hooks/useProducts.test.js
```
Expected: FAIL — `useProducts` not found.

- [ ] **Step 3: Implement `src/hooks/useProducts.js`**

```js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .gt('stock', 0)
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error)
        else setProducts(data)
        setLoading(false)
      })
  }, [])

  return { products, loading, error }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run src/hooks/useProducts.test.js
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useProducts.js src/hooks/useProducts.test.js
git commit -m "feat: add useProducts hook with test"
```

---

## Task 8: ProductCard + ProductGrid

**Files:**
- Create: `src/components/store/ProductCard.jsx`
- Create: `src/components/store/ProductCard.test.jsx`
- Create: `src/components/store/ProductGrid.jsx`

- [ ] **Step 1: Write failing test for ProductCard**

Create `src/components/store/ProductCard.test.jsx`:
```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductCard from './ProductCard'

const product = { id: '1', name: 'Agua 5L', price: 20, stock: 10, image_url: null }

describe('ProductCard', () => {
  it('displays product name and price', () => {
    render(<ProductCard product={product} onAdd={vi.fn()} />)
    expect(screen.getByText('Agua 5L')).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })

  it('calls onAdd when button is clicked', () => {
    const onAdd = vi.fn()
    render(<ProductCard product={product} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }))
    expect(onAdd).toHaveBeenCalledWith(product)
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run src/components/store/ProductCard.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Implement `src/components/store/ProductCard.jsx`**

```jsx
export default function ProductCard({ product, onAdd }) {
  return (
    <div className="bg-white border border-brand-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-brand-100 h-32 flex items-center justify-center text-5xl">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          : '💧'}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-brand-900">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-500 mt-1">{product.description}</p>
        )}
        <p className="text-brand-700 font-bold text-lg mt-1">
          ${product.price.toFixed(2)}
        </p>
        <p className="text-xs text-gray-400">{product.stock} disponibles</p>
        <button
          onClick={() => onAdd(product)}
          className="mt-3 w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-2 rounded-lg transition-colors"
        >
          Agregar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
npx vitest run src/components/store/ProductCard.test.jsx
```
Expected: PASS

- [ ] **Step 5: Implement `src/components/store/ProductGrid.jsx`**

```jsx
import ProductCard from './ProductCard'

export default function ProductGrid({ products, onAdd }) {
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
        <ProductCard key={p.id} product={p} onAdd={onAdd} />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/store/
git commit -m "feat: add ProductCard and ProductGrid components"
```

---

## Task 9: useCart Hook

**Files:**
- Create: `src/hooks/useCart.js`
- Create: `src/hooks/useCart.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useCart.test.js`:
```js
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useCart } from './useCart'

const p1 = { id: 'p1', name: 'Agua 5L', price: 20, stock: 10 }
const p2 = { id: 'p2', name: 'Garrafón', price: 45, stock: 5 }

beforeEach(() => localStorage.clear())

describe('useCart', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCart())
    expect(result.current.items).toHaveLength(0)
    expect(result.current.total).toBe(0)
  })

  it('addItem increments quantity if product already in cart', () => {
    const { result } = renderHook(() => useCart())
    act(() => result.current.addItem(p1))
    act(() => result.current.addItem(p1))
    expect(result.current.items[0].quantity).toBe(2)
  })

  it('total reflects quantities and prices', () => {
    const { result } = renderHook(() => useCart())
    act(() => result.current.addItem(p1))
    act(() => result.current.addItem(p2))
    expect(result.current.total).toBe(65)
  })

  it('removeItem deletes product from cart', () => {
    const { result } = renderHook(() => useCart())
    act(() => result.current.addItem(p1))
    act(() => result.current.removeItem('p1'))
    expect(result.current.items).toHaveLength(0)
  })

  it('clearCart empties cart', () => {
    const { result } = renderHook(() => useCart())
    act(() => result.current.addItem(p1))
    act(() => result.current.clearCart())
    expect(result.current.items).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run src/hooks/useCart.test.js
```
Expected: FAIL

- [ ] **Step 3: Implement `src/hooks/useCart.js`**

```js
import { useState, useEffect } from 'react'

const KEY = 'emi_cart'

export function useCart() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) ?? [] }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  function addItem(product) {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
            : i
        )
      }
      return [...prev, {
        product_id: product.id,
        name:       product.name,
        price:      product.price,
        quantity:   1,
        maxStock:   product.stock,
      }]
    })
  }

  function removeItem(productId) {
    setItems(prev => prev.filter(i => i.product_id !== productId))
  }

  function updateQuantity(productId, quantity) {
    if (quantity <= 0) { removeItem(productId); return }
    setItems(prev => prev.map(i =>
      i.product_id === productId ? { ...i, quantity } : i
    ))
  }

  function clearCart() { setItems([]) }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return { items, total, addItem, removeItem, updateQuantity, clearCart }
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
npx vitest run src/hooks/useCart.test.js
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCart.js src/hooks/useCart.test.js
git commit -m "feat: add useCart hook with localStorage persistence"
```

---

## Task 10: Cart Component

**Files:**
- Create: `src/components/store/Cart.jsx`
- Create: `src/components/store/Cart.test.jsx`

- [ ] **Step 1: Write failing test**

Create `src/components/store/Cart.test.jsx`:
```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Cart from './Cart'

const items = [
  { product_id: '1', name: 'Agua 5L', price: 20, quantity: 2, maxStock: 10 },
]

describe('Cart', () => {
  it('renders cart items', () => {
    render(<Cart items={items} total={40} onRemove={vi.fn()} onUpdateQty={vi.fn()} onCheckout={vi.fn()} />)
    expect(screen.getByText('Agua 5L')).toBeInTheDocument()
    expect(screen.getByText('$40.00')).toBeInTheDocument()
  })

  it('calls onCheckout when button clicked', () => {
    const onCheckout = vi.fn()
    render(<Cart items={items} total={40} onRemove={vi.fn()} onUpdateQty={vi.fn()} onCheckout={onCheckout} />)
    fireEvent.click(screen.getByRole('button', { name: /hacer pedido/i }))
    expect(onCheckout).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run src/components/store/Cart.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Implement `src/components/store/Cart.jsx`**

```jsx
export default function Cart({ items, total, onRemove, onUpdateQty, onCheckout }) {
  if (!items.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-4xl mb-2">🛒</p>
        <p>Tu carrito está vacío</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map(item => (
        <div key={item.product_id} className="flex items-center gap-3 bg-white border border-brand-100 rounded-xl p-3">
          <div className="flex-1">
            <p className="font-medium text-brand-900">{item.name}</p>
            <p className="text-sm text-brand-700">${item.price.toFixed(2)} c/u</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQty(item.product_id, item.quantity - 1)}
              className="w-7 h-7 rounded-full bg-brand-100 text-brand-900 font-bold hover:bg-brand-200"
            >−</button>
            <span className="w-6 text-center font-semibold">{item.quantity}</span>
            <button
              onClick={() => onUpdateQty(item.product_id, Math.min(item.quantity + 1, item.maxStock))}
              className="w-7 h-7 rounded-full bg-brand-100 text-brand-900 font-bold hover:bg-brand-200"
            >+</button>
          </div>
          <button onClick={() => onRemove(item.product_id)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
        </div>
      ))}
      <div className="flex justify-between items-center pt-2 border-t border-surface-border">
        <span className="font-semibold text-brand-900">Total</span>
        <span className="text-xl font-bold text-brand-700">${total.toFixed(2)}</span>
      </div>
      <button
        onClick={onCheckout}
        className="w-full bg-brand-700 hover:bg-brand-900 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Hacer pedido →
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
npx vitest run src/components/store/Cart.test.jsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/store/Cart.jsx src/components/store/Cart.test.jsx
git commit -m "feat: add Cart component"
```

---

## Task 11: Checkout + Race Condition Handling

**Files:**
- Create: `src/components/store/CheckoutForm.jsx`
- Create: `src/components/store/OrderConfirmation.jsx`
- Create: `src/pages/CheckoutPage.jsx`

- [ ] **Step 1: Write failing test for CheckoutForm**

Create `src/components/store/CheckoutForm.test.jsx`:
```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CheckoutForm from './CheckoutForm'

describe('CheckoutForm', () => {
  it('calls onSubmit with name and phone', async () => {
    const onSubmit = vi.fn()
    render(<CheckoutForm onSubmit={onSubmit} loading={false} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: '5551234' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Ana', phone: '5551234', notes: '' }))
  })

  it('shows error when name is empty', async () => {
    render(<CheckoutForm onSubmit={vi.fn()} loading={false} />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(await screen.findByText(/nombre es requerido/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run src/components/store/CheckoutForm.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Implement `src/components/store/CheckoutForm.jsx`**

```jsx
import { useState } from 'react'

export default function CheckoutForm({ onSubmit, loading, raceError }) {
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!name.trim())  e.name  = 'El nombre es requerido'
    if (!phone.trim()) e.phone = 'El teléfono es requerido'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    onSubmit({ name: name.trim(), phone: phone.trim(), notes: notes.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {raceError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {raceError}
        </div>
      )}
      <div>
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Tu nombre"
          className="w-full border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <input
          value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="Tu teléfono"
          type="tel"
          className="w-full border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700"
        />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
      </div>
      <textarea
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Dirección o indicaciones (opcional)"
        rows={3}
        className="w-full border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700 resize-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {loading ? 'Procesando...' : 'Confirmar pedido'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
npx vitest run src/components/store/CheckoutForm.test.jsx
```
Expected: PASS

- [ ] **Step 5: Implement `src/components/store/OrderConfirmation.jsx`**

```jsx
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
```

- [ ] **Step 6: Implement `src/pages/CheckoutPage.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../hooks/useCart'
import CheckoutForm from '../components/store/CheckoutForm'
import OrderConfirmation from '../components/store/OrderConfirmation'
import Cart from '../components/store/Cart'

export default function CheckoutPage() {
  const { items, total, removeItem, updateQuantity, clearCart } = useCart()
  const [step, setStep]           = useState('cart')   // 'cart' | 'form' | 'done'
  const [loading, setLoading]     = useState(false)
  const [raceError, setRaceError] = useState(null)
  const [orderNumber, setOrderNumber] = useState('')
  const navigate = useNavigate()

  async function handleSubmit({ name, phone, notes }) {
    setLoading(true)
    setRaceError(null)
    const { data, error } = await supabase.rpc('crear_pedido', {
      p_customer_name:  name,
      p_customer_phone: phone,
      p_notes:          notes,
      p_items:          items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
    })

    setLoading(false)

    if (error) { setRaceError('Ocurrió un error. Inténtalo de nuevo.'); return }

    if (data.error === 'out_of_stock') {
      setRaceError(
        `Alguien más tomó el último ${data.product_name}. Por favor, elige otra opción para continuar.`
      )
      return
    }

    clearCart()
    setOrderNumber(data.order_number)
    setStep('done')
  }

  if (step === 'done') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <OrderConfirmation
          orderNumber={orderNumber}
          onTrack={() => navigate(`/pedido/${orderNumber}`)}
        />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-900">
        {step === 'cart' ? '🛒 Tu carrito' : '📋 Tus datos'}
      </h1>

      {step === 'cart' && (
        <>
          <Cart
            items={items} total={total}
            onRemove={removeItem} onUpdateQty={updateQuantity}
            onCheckout={() => setStep('form')}
          />
          <button onClick={() => navigate('/')} className="text-brand-700 underline text-sm text-center">
            ← Seguir comprando
          </button>
        </>
      )}

      {step === 'form' && (
        <>
          <CheckoutForm onSubmit={handleSubmit} loading={loading} raceError={raceError} />
          <button onClick={() => setStep('cart')} className="text-brand-700 underline text-sm text-center">
            ← Volver al carrito
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/store/CheckoutForm.jsx src/components/store/CheckoutForm.test.jsx
git add src/components/store/OrderConfirmation.jsx src/pages/CheckoutPage.jsx
git commit -m "feat: add checkout flow with race condition error handling"
```

---

## Task 12: Order Status Page

**Files:**
- Create: `src/components/store/OrderTracker.jsx`
- Create: `src/pages/OrderStatusPage.jsx`

- [ ] **Step 1: Implement `src/components/store/OrderTracker.jsx`**

```jsx
const STATUS_LABEL = {
  pending:   { label: 'Pendiente',  emoji: '⏳', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  delivered: { label: 'Entregado',  emoji: '✅', color: 'text-green-700 bg-green-50 border-green-200' },
  cancelled: { label: 'Cancelado',  emoji: '✕',  color: 'text-red-600 bg-red-50 border-red-200' },
}

export default function OrderTracker({ order }) {
  const s = STATUS_LABEL[order.status]
  return (
    <div className="flex flex-col gap-4">
      <div className={`border rounded-2xl p-4 text-center ${s.color}`}>
        <p className="text-3xl mb-1">{s.emoji}</p>
        <p className="font-bold text-lg">{s.label}</p>
      </div>
      <div className="bg-white border border-brand-100 rounded-2xl p-4 text-sm flex flex-col gap-2">
        <p><span className="text-gray-400">Pedido:</span> <span className="font-bold text-brand-700">{order.order_number}</span></p>
        <p><span className="text-gray-400">Nombre:</span> {order.customer_name}</p>
        <p><span className="text-gray-400">Total:</span> ${Number(order.total).toFixed(2)}</p>
        {order.notes && <p><span className="text-gray-400">Notas:</span> {order.notes}</p>}
      </div>
      {order.order_items && (
        <div className="bg-white border border-brand-100 rounded-2xl p-4">
          <p className="font-semibold text-brand-900 mb-2">Productos</p>
          {order.order_items.map(item => (
            <div key={item.id} className="flex justify-between text-sm py-1 border-b border-surface-border last:border-0">
              <span>{item.products?.name} × {item.quantity}</span>
              <span className="text-brand-700">${(item.unit_price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Implement `src/pages/OrderStatusPage.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import OrderTracker from '../components/store/OrderTracker'

export default function OrderStatusPage() {
  const { code } = useParams()
  const [order, setOrder]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!code) return
    supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .eq('order_number', code.toUpperCase())
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else setOrder(data)
        setLoading(false)
      })
  }, [code])

  if (loading) return <div className="text-center py-16 text-gray-400">Buscando pedido...</div>

  if (notFound) return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      <p className="text-4xl mb-3">🔍</p>
      <p className="font-semibold text-brand-900">Pedido no encontrado</p>
      <p className="text-gray-400 text-sm mt-1">Verifica el código e intenta de nuevo.</p>
      <Link to="/" className="mt-4 inline-block text-brand-700 underline text-sm">← Volver al inicio</Link>
    </div>
  )

  return (
    <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-brand-900">Estado del pedido</h1>
      <OrderTracker order={order} />
      <Link to="/" className="text-brand-700 underline text-sm text-center">← Volver a la tienda</Link>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/store/OrderTracker.jsx src/pages/OrderStatusPage.jsx
git commit -m "feat: add order status page"
```

---

## Task 13: Admin Auth

**Files:**
- Create: `src/hooks/useAuth.js`
- Create: `src/components/admin/ProtectedRoute.jsx`
- Create: `src/components/admin/LoginForm.jsx`
- Create: `src/pages/AdminLoginPage.jsx`

- [ ] **Step 1: Implement `src/hooks/useAuth.js`**

```js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, loading: session === undefined, signIn, signOut }
}
```

- [ ] **Step 2: Implement `src/components/admin/ProtectedRoute.jsx`**

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="text-center py-16 text-gray-400">Cargando...</div>
  if (!session) return <Navigate to="/admin/login" replace />
  return children
}
```

- [ ] **Step 3: Implement `src/components/admin/LoginForm.jsx`**

```jsx
import { useState } from 'react'

export default function LoginForm({ onSubmit, loading, error }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit(email, password) }}
      className="flex flex-col gap-4"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
      )}
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="Correo electrónico" required
        className="border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700"
      />
      <input
        type="password" value={password} onChange={e => setPassword(e.target.value)}
        placeholder="Contraseña" required
        className="border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700"
      />
      <button
        type="submit" disabled={loading}
        className="bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Implement `src/pages/AdminLoginPage.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LoginForm from '../components/admin/LoginForm'

export default function AdminLoginPage() {
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const navigate = useNavigate()

  async function handleLogin(email, password) {
    setLoading(true)
    setError(null)
    const err = await signIn(email, password)
    setLoading(false)
    if (err) setError('Correo o contraseña incorrectos')
    else navigate('/admin/pedidos')
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-brand-900 text-center mb-6">👩‍💼 Panel de Emi</h1>
        <LoginForm onSubmit={handleLogin} loading={loading} error={error} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create Emi's Supabase account**

In Supabase dashboard → Authentication → Users → Add user. Enter Emi's email and password.

- [ ] **Step 6: Test login manually**

Run `npm run dev`, navigate to `/admin/login`, log in with Emi's credentials.
Expected: No errors in console (navigation to `/admin/pedidos` will 404 for now — that's expected).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useAuth.js src/components/admin/ProtectedRoute.jsx
git add src/components/admin/LoginForm.jsx src/pages/AdminLoginPage.jsx
git commit -m "feat: add admin auth with Supabase Auth"
```

---

## Task 14: Admin Products

**Files:**
- Create: `src/hooks/useAdminProducts.js`
- Create: `src/components/admin/ProductList.jsx`
- Create: `src/components/admin/ProductForm.jsx`
- Create: `src/components/admin/StockAdjust.jsx`
- Create: `src/pages/AdminProductsPage.jsx`

- [ ] **Step 1: Implement `src/hooks/useAdminProducts.js`**

```js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name')
    setProducts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function saveProduct(product) {
    if (product.id) {
      await supabase.from('products').update(product).eq('id', product.id)
    } else {
      await supabase.from('products').insert(product)
    }
    await fetch()
  }

  async function toggleActive(id, active) {
    await supabase.from('products').update({ active }).eq('id', id)
    await fetch()
  }

  async function addStock(id, units) {
    await supabase.rpc('add_stock', { p_product_id: id, p_units: units })
    await fetch()
  }

  return { products, loading, saveProduct, toggleActive, addStock, refetch: fetch }
}
```

- [ ] **Step 2: Add `add_stock` helper function to Supabase**

Run in Supabase SQL editor:
```sql
CREATE OR REPLACE FUNCTION add_stock(p_product_id UUID, p_units INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products SET stock = stock + p_units WHERE id = p_product_id;
END;
$$;
```

- [ ] **Step 3: Implement `src/components/admin/StockAdjust.jsx`**

```jsx
import { useState } from 'react'

export default function StockAdjust({ product, onAdjust }) {
  const [units, setUnits] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const n = parseInt(units, 10)
    if (!n || n <= 0) return
    await onAdjust(product.id, n)
    setUnits('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="number" min="1" value={units} onChange={e => setUnits(e.target.value)}
        placeholder="Unidades"
        className="w-24 border border-surface-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-700"
      />
      <button type="submit" className="bg-brand-700 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-brand-900">
        + Sumar
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Implement `src/components/admin/ProductForm.jsx`**

```jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ProductForm({ product, onSave, onCancel }) {
  const [name, setName]         = useState(product?.name ?? '')
  const [desc, setDesc]         = useState(product?.description ?? '')
  const [price, setPrice]       = useState(product?.price ?? '')
  const [stock, setStock]       = useState(product?.stock ?? 0)
  const [file, setFile]         = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    let image_url = product?.image_url ?? null

    if (file) {
      const ext  = file.name.split('.').pop()
      const path = `products/${Date.now()}.${ext}`
      await supabase.storage.from('product-images').upload(path, file)
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
    setLoading(false)
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
```

- [ ] **Step 5: Create Supabase Storage bucket**

In Supabase dashboard → Storage → New bucket: `product-images`, Public: **true**.

- [ ] **Step 6: Implement `src/components/admin/ProductList.jsx`**

```jsx
import StockAdjust from './StockAdjust'

export default function ProductList({ products, onEdit, onToggle, onAddStock }) {
  return (
    <div className="flex flex-col gap-3">
      {products.map(p => (
        <div key={p.id} className="bg-white border border-brand-100 rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-brand-900">{p.name}</h3>
              <p className="text-brand-700 font-bold">${Number(p.price).toFixed(2)}</p>
              <p className={`text-sm ${p.stock === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                Stock: {p.stock} {p.stock === 0 && '⚠️'}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(p)}
                className="text-sm bg-brand-100 text-brand-900 px-3 py-1 rounded-lg hover:bg-brand-200">
                Editar
              </button>
              <button onClick={() => onToggle(p.id, !p.active)}
                className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-200">
                {p.active ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-surface-border">
            <StockAdjust product={p} onAdjust={onAddStock} />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Implement `src/pages/AdminProductsPage.jsx`**

```jsx
import { useState } from 'react'
import { useAdminProducts } from '../hooks/useAdminProducts'
import ProductList from '../components/admin/ProductList'
import ProductForm from '../components/admin/ProductForm'

export default function AdminProductsPage() {
  const { products, loading, saveProduct, toggleActive, addStock } = useAdminProducts()
  const [editing, setEditing] = useState(null)   // null | {} | product

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-900">Productos</h1>
        {!editing && (
          <button onClick={() => setEditing({})}
            className="bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-900">
            + Nuevo
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="bg-surface-soft border border-surface-border rounded-2xl p-4">
          <h2 className="font-semibold text-brand-900 mb-3">
            {editing.id ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <ProductForm
            product={editing.id ? editing : null}
            onSave={async p => { await saveProduct(p); setEditing(null) }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <ProductList
        products={products}
        onEdit={p => setEditing(p)}
        onToggle={toggleActive}
        onAddStock={addStock}
      />
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useAdminProducts.js
git add src/components/admin/ProductList.jsx src/components/admin/ProductForm.jsx
git add src/components/admin/StockAdjust.jsx src/pages/AdminProductsPage.jsx
git commit -m "feat: add admin products management with image upload and stock control"
```

---

## Task 15: Admin Orders

**Files:**
- Create: `src/hooks/useOrders.js`
- Create: `src/components/admin/OrderCard.jsx`
- Create: `src/components/admin/OrderList.jsx`
- Create: `src/pages/AdminOrdersPage.jsx`

- [ ] **Step 1: Implement `src/hooks/useOrders.js`**

```js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useOrders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function deliver(orderId) {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId)
    await fetch()
  }

  async function cancel(orderId) {
    await supabase.rpc('cancelar_pedido', { p_order_id: orderId })
    await fetch()
  }

  return { orders, loading, deliver, cancel }
}
```

- [ ] **Step 2: Implement `src/components/admin/OrderCard.jsx`**

```jsx
const STATUS = {
  pending:   { label: 'Pendiente',  bg: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  delivered: { label: 'Entregado',  bg: 'bg-green-50  border-green-200  text-green-700'  },
  cancelled: { label: 'Cancelado',  bg: 'bg-red-50    border-red-200    text-red-600'    },
}

export default function OrderCard({ order, onDeliver, onCancel }) {
  const s = STATUS[order.status]
  return (
    <div className="bg-white border border-brand-100 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="font-bold text-brand-700 text-lg">{order.order_number}</span>
        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${s.bg}`}>{s.label}</span>
      </div>
      <div className="text-sm text-gray-600">
        <p className="font-medium text-brand-900">{order.customer_name}</p>
        <p>{order.customer_phone}</p>
        {order.notes && <p className="text-gray-400 italic">{order.notes}</p>}
      </div>
      {order.order_items?.length > 0 && (
        <div className="border-t border-surface-border pt-2 text-sm">
          {order.order_items.map(item => (
            <p key={item.id} className="flex justify-between">
              <span>{item.products?.name} × {item.quantity}</span>
              <span className="text-brand-700">${(item.unit_price * item.quantity).toFixed(2)}</span>
            </p>
          ))}
        </div>
      )}
      <div className="flex justify-between items-center border-t border-surface-border pt-2">
        <span className="font-bold text-brand-900">${Number(order.total).toFixed(2)}</span>
        {order.status === 'pending' && (
          <div className="flex gap-2">
            <button onClick={() => onDeliver(order.id)}
              className="bg-brand-700 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-brand-900">
              ✅ Entregar
            </button>
            <button onClick={() => onCancel(order.id)}
              className="bg-red-100 text-red-700 text-sm px-3 py-1.5 rounded-lg hover:bg-red-200">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implement `src/components/admin/OrderList.jsx`**

```jsx
import OrderCard from './OrderCard'

export default function OrderList({ orders, filter, onDeliver, onCancel }) {
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  if (!filtered.length) return <p className="text-center text-gray-400 py-8">Sin pedidos.</p>
  return (
    <div className="flex flex-col gap-3">
      {filtered.map(o => (
        <OrderCard key={o.id} order={o} onDeliver={onDeliver} onCancel={onCancel} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/pages/AdminOrdersPage.jsx`**

```jsx
import { useState } from 'react'
import { useOrders } from '../hooks/useOrders'
import OrderList from '../components/admin/OrderList'

const FILTERS = [
  { value: 'pending',   label: 'Pendientes' },
  { value: 'delivered', label: 'Entregados' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'all',       label: 'Todos'      },
]

export default function AdminOrdersPage() {
  const { orders, loading, deliver, cancel } = useOrders()
  const [filter, setFilter] = useState('pending')

  const pendingCount = orders.filter(o => o.status === 'pending').length

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-brand-900">
        Pedidos {pendingCount > 0 && <span className="text-base bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full ml-1">{pendingCount}</span>}
      </h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${filter === f.value ? 'bg-brand-700 text-white' : 'bg-white border border-surface-border text-brand-900'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <OrderList orders={orders} filter={filter} onDeliver={deliver} onCancel={cancel} />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useOrders.js
git add src/components/admin/OrderCard.jsx src/components/admin/OrderList.jsx
git add src/pages/AdminOrdersPage.jsx
git commit -m "feat: add admin orders page with deliver and cancel actions"
```

---

## Task 16: App Router + Layout + WhatsApp Link + Store Page

**Files:**
- Create: `src/components/shared/Layout.jsx`
- Create: `src/components/shared/WhatsAppLink.jsx`
- Create: `src/pages/StorePage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Implement `src/components/shared/WhatsAppLink.jsx`**

```jsx
export default function WhatsAppLink() {
  const number  = import.meta.env.VITE_WHATSAPP_NUMBER
  const message = encodeURIComponent('Hola Emi, tengo una pregunta sobre mi pedido.')
  return (
    <a
      href={`https://wa.me/${number}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-2xl transition-colors z-50"
      aria-label="Contactar a Emi por WhatsApp"
    >
      💬
    </a>
  )
}
```

- [ ] **Step 2: Implement `src/components/shared/Layout.jsx`**

```jsx
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { useAuth } from '../../hooks/useAuth'

export default function Layout({ children, showAdmin = false }) {
  const { items } = useCart()
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const count = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-brand-700 text-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg text-brand-100">💧 Aguas de Emi</Link>
          <div className="flex items-center gap-3">
            {!showAdmin && (
              <Link to="/checkout" className="relative">
                <span className="text-xl">🛒</span>
                {count > 0 && (
                  <span className="absolute -top-1 -right-2 bg-white text-brand-700 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>
            )}
            {showAdmin && session && (
              <>
                <Link to="/admin/pedidos"   className="text-sm text-brand-100 hover:text-white">Pedidos</Link>
                <Link to="/admin/productos" className="text-sm text-brand-100 hover:text-white">Productos</Link>
                <button onClick={async () => { await signOut(); navigate('/') }}
                  className="text-sm text-brand-100 hover:text-white">
                  Salir
                </button>
              </>
            )}
            {!showAdmin && (
              <Link to="/admin/login" className="text-xs text-brand-200 hover:text-white">Admin</Link>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Implement `src/pages/StorePage.jsx`**

```jsx
import { useNavigate } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { useCart } from '../hooks/useCart'
import ProductGrid from '../components/store/ProductGrid'
import WhatsAppLink from '../components/shared/WhatsAppLink'
import Layout from '../components/shared/Layout'

export default function StorePage() {
  const { products, loading, error } = useProducts()
  const { addItem } = useCart()
  const navigate = useNavigate()

  function handleAdd(product) {
    addItem(product)
    // stay on catalog — cart icon in header shows updated count
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-900">Nuestros productos</h1>
          <p className="text-gray-500 text-sm mt-1">Agua fresca a domicilio</p>
        </div>
        {loading && <p className="text-center py-12 text-gray-400">Cargando productos...</p>}
        {error  && <p className="text-center py-12 text-red-500">Error al cargar productos.</p>}
        {!loading && !error && <ProductGrid products={products} onAdd={handleAdd} />}
      </div>
      <WhatsAppLink />
    </Layout>
  )
}
```

- [ ] **Step 4: Wire up `src/App.jsx`**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StorePage          from './pages/StorePage'
import CheckoutPage       from './pages/CheckoutPage'
import OrderStatusPage    from './pages/OrderStatusPage'
import AdminLoginPage     from './pages/AdminLoginPage'
import AdminOrdersPage    from './pages/AdminOrdersPage'
import AdminProductsPage  from './pages/AdminProductsPage'
import ProtectedRoute     from './components/admin/ProtectedRoute'
import Layout             from './components/shared/Layout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                element={<StorePage />} />
        <Route path="/checkout"        element={<CheckoutPage />} />
        <Route path="/pedido/:code"    element={<OrderStatusPage />} />
        <Route path="/admin/login"     element={<AdminLoginPage />} />
        <Route path="/admin/pedidos"   element={
          <ProtectedRoute>
            <Layout showAdmin>
              <AdminOrdersPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/productos" element={
          <ProtectedRoute>
            <Layout showAdmin>
              <AdminProductsPage />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Run full app smoke test**

```bash
npm run dev
```
Check manually:
- `/` — product catalog loads with seed data
- `/checkout` — cart and checkout form render
- `/admin/login` — login form renders
- `/admin/pedidos` — redirects to `/admin/login` (not logged in)

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/ src/pages/StorePage.jsx src/App.jsx
git commit -m "feat: wire up router, layout, store page, and WhatsApp link"
```

---

## Task 17: Vercel Deployment

**Files:**
- No code changes — configuration only

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/<tu-usuario>/aguas-de-emi.git
git push -u origin main
```

- [ ] **Step 2: Import project in Vercel**

Go to https://vercel.com → Add New → Project → Import from GitHub → select `aguas-de-emi`.

- [ ] **Step 3: Add environment variables in Vercel**

In project settings → Environment Variables, add:
```
VITE_SUPABASE_URL       = https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY  = eyJ...
VITE_WHATSAPP_NUMBER    = 521234567890
```

- [ ] **Step 4: Deploy**

Click Deploy. Wait for build to complete.
Expected: Green deployment, live URL available.

- [ ] **Step 5: Smoke test on live URL**

Open the Vercel URL on a real mobile device:
- Load the catalog
- Add a product and go through checkout
- Log in as Emi at `/admin/login`
- Verify admin pages load correctly

- [ ] **Step 6: Tag release**

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Run All Tests

```bash
npx vitest run
```
Expected: All tests pass (useProducts, useCart, ProductCard, CheckoutForm).
