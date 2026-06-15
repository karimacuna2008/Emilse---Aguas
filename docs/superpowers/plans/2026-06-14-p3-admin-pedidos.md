# P3 — Admin · Gestión de pedidos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar a Emi una pantalla de admin para gestionar pedidos por fecha de entrega (resumen "por entregar", panel de edición con agregar/quitar/entregar/cancelar y total personalizado) más un editor de configuración.

**Architecture:** Toda escritura de pedidos vía RPC `SECURITY DEFINER` (migración `010`). El agregado "por entregar" se calcula en cliente desde los pedidos ya descargados (RLS `admin read`). UI móvil-first con la paleta del tema. TDD con Vitest + Testing Library; las RPC se verifican por smoke en el cutover (no hay Postgres local).

**Tech Stack:** React 19, react-router-dom 7, Supabase JS, Tailwind v3, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-14-p3-admin-pedidos-design.md`

---

## Estructura de archivos

**Crear:**
- `supabase/migrations/010_p3_admin.sql` — RPCs `quitar_de_pedido`, `marcar_entregado`, `set_total_pedido`, `recalcular_total_pedido` + drop `admin update orders`.
- `src/lib/orderErrors.js` — mapa de códigos de error → español.
- `src/lib/pendingSummary.js` — agregación por fecha/producto + fecha por defecto.
- `src/components/admin/PorEntregarSummary.jsx`, `OrderDateNav.jsx`, `OrderItemEditor.jsx`, `AddProductPicker.jsx`, `TotalOverride.jsx`.
- `src/pages/AdminOrderDetailPage.jsx`, `AdminSettingsPage.jsx`.
- Tests `*.test.js(x)` junto a cada archivo.

**Modificar:**
- `src/lib/deliveryDates.js` — helpers `parseISO`, `formatWeekday`, `formatLongDate`.
- `src/hooks/useOrders.js` — acciones nuevas + `deliver`→RPC.
- `src/hooks/useAppSettings.js` — `saveSettings`.
- `src/components/admin/OrderCard.jsx` — estilo compacto + tag + navegación.
- `src/components/admin/OrderList.jsx` — filtra por fecha/estado.
- `src/pages/AdminOrdersPage.jsx` — vista por fecha + resumen + ⚙️ + historial.
- `src/App.jsx` — rutas `/admin/pedidos/:id`, `/admin/configuracion`.

---

## Fase 0 — Migración SQL

### Task 0: Escribir migración `010_p3_admin.sql`

**Files:** Create `supabase/migrations/010_p3_admin.sql`

> Nota: no hay Postgres local; la verificación es por **smoke en el cutover** (sección 10 del spec). Esta tarea solo escribe el archivo correctamente.

- [ ] **Step 1: Crear el archivo con las 4 RPC + RLS + GRANTs**

```sql
-- 010_p3_admin.sql
-- P3 (admin): RPCs de edición de pedidos + endurecimiento RLS.
-- Todas SECURITY DEFINER, search_path='' , nombres calificados. Aplicar vía Management API.

-- ── quitar_de_pedido: resta/elimina línea, devuelve stock, recalcula total, limpia override ──
CREATE OR REPLACE FUNCTION quitar_de_pedido(p_order_id UUID, p_product_id UUID, p_quantity INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order RECORD; v_line RECORD; v_remove INT; v_new_total DECIMAL; v_items_left INT;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN jsonb_build_object('error','invalid_quantity'); END IF;
  SELECT id, status INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','order_not_found'); END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('error','order_not_pending'); END IF;
  SELECT id, quantity INTO v_line FROM public.order_items WHERE order_id = p_order_id AND product_id = p_product_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','item_not_found'); END IF;
  PERFORM id FROM public.products WHERE id = p_product_id FOR UPDATE;
  v_remove := LEAST(p_quantity, v_line.quantity);
  IF v_remove >= v_line.quantity THEN
    DELETE FROM public.order_items WHERE id = v_line.id;
  ELSE
    UPDATE public.order_items SET quantity = quantity - v_remove WHERE id = v_line.id;
  END IF;
  UPDATE public.products SET stock = stock + v_remove WHERE id = p_product_id;
  SELECT COALESCE(SUM(quantity*unit_price),0), COUNT(*) INTO v_new_total, v_items_left
    FROM public.order_items WHERE order_id = p_order_id;
  UPDATE public.orders SET total = v_new_total, total_personalizado = FALSE WHERE id = p_order_id;
  RETURN jsonb_build_object('success',TRUE,'total',v_new_total,'items_left',v_items_left);
END; $$;

-- ── marcar_entregado: status=delivered + delivered_at ──
CREATE OR REPLACE FUNCTION marcar_entregado(p_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order RECORD;
BEGIN
  SELECT id, status INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','order_not_found'); END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('error','order_not_pending'); END IF;
  UPDATE public.orders SET status='delivered', delivered_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success',TRUE);
END; $$;

-- ── set_total_pedido: override del total ──
CREATE OR REPLACE FUNCTION set_total_pedido(p_order_id UUID, p_total NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order RECORD;
BEGIN
  IF p_total IS NULL OR p_total < 0 THEN RETURN jsonb_build_object('error','invalid_total'); END IF;
  SELECT id, status INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','order_not_found'); END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('error','order_not_pending'); END IF;
  UPDATE public.orders SET total = p_total, total_personalizado = TRUE WHERE id = p_order_id;
  RETURN jsonb_build_object('success',TRUE,'total',p_total);
END; $$;

-- ── recalcular_total_pedido: volver al calculado (limpia override) ──
CREATE OR REPLACE FUNCTION recalcular_total_pedido(p_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order RECORD; v_total DECIMAL;
BEGIN
  SELECT id, status INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','order_not_found'); END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('error','order_not_pending'); END IF;
  SELECT COALESCE(SUM(quantity*unit_price),0) INTO v_total FROM public.order_items WHERE order_id = p_order_id;
  UPDATE public.orders SET total = v_total, total_personalizado = FALSE WHERE id = p_order_id;
  RETURN jsonb_build_object('success',TRUE,'total',v_total);
END; $$;

-- ── RLS: quitar UPDATE directo del admin (toda escritura va por RPC) ──
DROP POLICY IF EXISTS "admin update orders" ON orders;

-- ── GRANTs (admin) ──
GRANT EXECUTE ON FUNCTION quitar_de_pedido(UUID, UUID, INT)  TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_entregado(UUID)             TO authenticated;
GRANT EXECUTE ON FUNCTION set_total_pedido(UUID, NUMERIC)    TO authenticated;
GRANT EXECUTE ON FUNCTION recalcular_total_pedido(UUID)      TO authenticated;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/010_p3_admin.sql
git commit -m "feat(p3): migracion 010 — RPCs de edicion de pedidos + RLS"
```

---

## Fase 1 — Lógica pura (TDD)

### Task 1: `lib/orderErrors.js`

**Files:** Create `src/lib/orderErrors.js`, Test `src/lib/orderErrors.test.js`

- [ ] **Step 1: Test (falla)**

```js
import { describe, it, expect } from 'vitest'
import { mapOrderError } from './orderErrors'

describe('mapOrderError', () => {
  it('mapea códigos conocidos a español', () => {
    expect(mapOrderError('order_not_pending')).toMatch(/pendiente/i)
    expect(mapOrderError('item_not_found')).toMatch(/artículo/i)
  })
  it('incluye el producto en out_of_stock', () => {
    expect(mapOrderError('out_of_stock', { product_name: 'Agua 20L' })).toMatch(/Agua 20L/)
  })
  it('mensaje genérico para código desconocido', () => {
    expect(mapOrderError('algo_raro')).toMatch(/error/i)
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/lib/orderErrors.test.js` → FAIL (módulo no existe)

- [ ] **Step 3: Implementar**

```js
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
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): mapeo de errores de pedido"`

### Task 2: helpers de fecha en `lib/deliveryDates.js`

**Files:** Modify `src/lib/deliveryDates.js`, Test `src/lib/deliveryDates.test.js` (añadir casos)

- [ ] **Step 1: Añadir tests** (al final del describe existente)

```js
import { parseISO, formatWeekday, formatLongDate } from './deliveryDates'

describe('helpers admin de fecha', () => {
  it('parseISO crea fecha local sin corrimiento UTC', () => {
    const d = parseISO('2026-06-14')
    expect(d.getFullYear()).toBe(2026); expect(d.getMonth()).toBe(5); expect(d.getDate()).toBe(14)
  })
  it('formatWeekday devuelve el día en español', () => {
    expect(formatWeekday('2026-06-14')).toBe('domingo') // 14 jun 2026 = domingo
  })
  it('formatLongDate devuelve "14 jun"', () => {
    expect(formatLongDate('2026-06-14')).toBe('14 jun')
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/lib/deliveryDates.test.js` → FAIL
- [ ] **Step 3: Implementar** (añadir al final de `deliveryDates.js`)

```js
const DIAS_ES  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
const MESES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function formatWeekday(iso) { return DIAS_ES[parseISO(iso).getDay()] }
export function formatLongDate(iso) { const dt = parseISO(iso); return `${dt.getDate()} ${MESES_ES[dt.getMonth()]}` }
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): helpers de fecha en español para admin"`

### Task 3: `lib/pendingSummary.js`

**Files:** Create `src/lib/pendingSummary.js`, Test `src/lib/pendingSummary.test.js`

- [ ] **Step 1: Test**

```js
import { describe, it, expect } from 'vitest'
import { buildPendingSummary, defaultPendingDate } from './pendingSummary'

const orders = [
  { id:'a', status:'pending',  delivery_date:'2026-06-14', order_items:[
    { quantity:6, products:{ name:'Agua 20L' } }, { quantity:1, products:{ name:'Pack x6' } } ] },
  { id:'b', status:'pending',  delivery_date:'2026-06-14', order_items:[
    { quantity:2, products:{ name:'Agua 20L' } } ] },
  { id:'c', status:'pending',  delivery_date:'2026-06-16', order_items:[
    { quantity:3, products:{ name:'Garrafón' } } ] },
  { id:'d', status:'delivered',delivery_date:'2026-06-14', order_items:[
    { quantity:9, products:{ name:'Agua 20L' } } ] },
]

describe('buildPendingSummary', () => {
  it('agrupa por fecha y suma por producto solo pendientes', () => {
    const s = buildPendingSummary(orders)
    expect(s.dates).toEqual(['2026-06-14','2026-06-16'])
    expect(s.byDate['2026-06-14'].orderCount).toBe(2)
    expect(s.byDate['2026-06-14'].products).toEqual([
      { name:'Agua 20L', qty:8 }, { name:'Pack x6', qty:1 },
    ])
  })
})

describe('defaultPendingDate', () => {
  const s = buildPendingSummary(orders)
  it('usa hoy si tiene pendientes', () => { expect(defaultPendingDate(s, '2026-06-14')).toBe('2026-06-14') })
  it('si hoy no tiene, usa la siguiente fecha con pendientes', () => { expect(defaultPendingDate(s, '2026-06-15')).toBe('2026-06-16') })
  it('si solo hay fechas pasadas, usa la más reciente', () => { expect(defaultPendingDate(s, '2026-06-20')).toBe('2026-06-16') })
  it('null si no hay pendientes', () => { expect(defaultPendingDate(buildPendingSummary([]), '2026-06-14')).toBeNull() })
})
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementar**

```js
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
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): agregacion por-entregar por fecha"`

---

## Fase 2 — Hooks (TDD, supabase mockeado)

### Task 4: extender `hooks/useOrders.js`

**Files:** Modify `src/hooks/useOrders.js`, Test `src/hooks/useOrders.test.jsx`

- [ ] **Step 1: Test** (mock de supabase con `rpc` espía; renderHook)

```jsx
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOrders } from './useOrders'

const rpc = vi.fn()
const selectChain = { select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }
vi.mock('../lib/supabase', () => ({ supabase: { rpc: (...a) => rpc(...a), from: () => selectChain } }))

beforeEach(() => rpc.mockReset())

describe('useOrders acciones admin', () => {
  it('markDelivered llama marcar_entregado', async () => {
    rpc.mockResolvedValue({ data: { success: true }, error: null })
    const { result } = renderHook(() => useOrders())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.markDelivered('o1') })
    expect(rpc).toHaveBeenCalledWith('marcar_entregado', { p_order_id: 'o1' })
  })
  it('removeItem llama quitar_de_pedido y expone error de negocio', async () => {
    rpc.mockResolvedValue({ data: { error: 'order_not_pending' }, error: null })
    const { result } = renderHook(() => useOrders())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.removeItem('o1', 'p1', 1) })
    expect(rpc).toHaveBeenCalledWith('quitar_de_pedido', { p_order_id:'o1', p_product_id:'p1', p_quantity:1 })
    expect(result.current.error).toMatch(/pendiente/i)
  })
  it('setTotal llama set_total_pedido', async () => {
    rpc.mockResolvedValue({ data: { success: true, total: 200 }, error: null })
    const { result } = renderHook(() => useOrders())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.setTotal('o1', 200) })
    expect(rpc).toHaveBeenCalledWith('set_total_pedido', { p_order_id:'o1', p_total:200 })
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/hooks/useOrders.test.jsx` → FAIL
- [ ] **Step 3: Reescribir `useOrders.js`**

```js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { mapOrderError } from '../lib/orderErrors'

export function useOrders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .order('created_at', { ascending: false })
    setError(error ? error.message : null)
    setOrders(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Ejecuta una RPC que devuelve JSONB {success|error}. Refresca en éxito.
  async function callRpc(fn, args) {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) { setError(error.message); return { error: error.message } }
    if (data?.error) { setError(mapOrderError(data.error, data)); return { error: data.error } }
    setError(null)
    await fetch()
    return { error: null, data }
  }

  const addItems     = (orderId, items)            => callRpc('agregar_a_pedido',        { p_order_id: orderId, p_items: items })
  const removeItem   = (orderId, productId, qty)   => callRpc('quitar_de_pedido',        { p_order_id: orderId, p_product_id: productId, p_quantity: qty })
  const markDelivered= (orderId)                   => callRpc('marcar_entregado',        { p_order_id: orderId })
  const setTotal     = (orderId, total)            => callRpc('set_total_pedido',        { p_order_id: orderId, p_total: total })
  const recalcTotal  = (orderId)                   => callRpc('recalcular_total_pedido', { p_order_id: orderId })
  const cancel       = (orderId)                   => callRpc('cancelar_pedido',         { p_order_id: orderId })

  return { orders, loading, error, fetch, addItems, removeItem, markDelivered, setTotal, recalcTotal, cancel }
}
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): acciones de edicion en useOrders via RPC"`

### Task 5: `saveSettings` en `hooks/useAppSettings.js`

**Files:** Modify `src/hooks/useAppSettings.js`, Test `src/hooks/useAppSettings.test.jsx`

- [ ] **Step 1: Test**

```jsx
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppSettings } from './useAppSettings'

const upsert = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('../lib/supabase', () => ({ supabase: {
  from: () => ({ select: () => Promise.resolve({ data: [], error: null }), upsert: (...a) => upsert(...a) }),
}}))
beforeEach(() => upsert.mockClear())

describe('useAppSettings.saveSettings', () => {
  it('hace upsert de las 3 claves como filas key/value', async () => {
    const { result } = renderHook(() => useAppSettings())
    await act(async () => {
      await result.current.saveSettings({ weekdays:[1,2,3,4,5,6], cutoffTime:'19:00', cancelTime:'06:00' })
    })
    const rows = upsert.mock.calls[0][0]
    expect(rows).toEqual(expect.arrayContaining([
      { key:'order_weekdays',     value:'1,2,3,4,5,6' },
      { key:'order_cutoff_time',  value:'19:00' },
      { key:'cancel_cutoff_time', value:'06:00' },
    ]))
  })
})
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementar** (añadir `saveSettings`; invalida cache de módulo)

```js
// añadir dentro de useAppSettings, antes del return:
async function saveSettings({ weekdays, cutoffTime, cancelTime }) {
  const rows = [
    { key: 'order_weekdays',     value: [...weekdays].sort((a,b)=>a-b).join(',') },
    { key: 'order_cutoff_time',  value: cutoffTime },
    { key: 'cancel_cutoff_time', value: cancelTime },
  ]
  const { error } = await supabase.from('app_settings').upsert(rows)
  if (!error) { _cache = { weekdays, cutoffTime, cancelTime }; setConfig(_cache) }
  return { error }
}
// y en el return añadir: saveSettings
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): saveSettings en useAppSettings"`

---

## Fase 3 — Componentes (TDD, Testing Library)

Paleta: `brand-700 #2d6a4f`, `brand-900 #1b4332`, `brand-100`, `surface-*`, borde `#e7dfc6`. Estado "Pendiente" amarillo (`yellow-50/200/700`).

### Task 6: reescribir `OrderCard.jsx` (compacto + tag + navegación)

**Files:** Modify `src/components/admin/OrderCard.jsx`, Test `src/components/admin/OrderCard.test.jsx`

- [ ] **Step 1: Test**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OrderCard from './OrderCard'

const base = { id:'o1', order_number:'EM-012', status:'pending', customer_name:'María López',
  customer_phone:'5512345678', total:230, total_personalizado:false,
  order_items:[{ id:1, quantity:2, unit_price:45, products:{ name:'Agua 20L' } }] }

describe('OrderCard', () => {
  it('muestra folio, cliente y total; al click navega', () => {
    const onOpen = vi.fn()
    render(<OrderCard order={base} onOpen={onOpen} />)
    expect(screen.getByText('EM-012')).toBeInTheDocument()
    expect(screen.getByText(/María López/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('EM-012').closest('[role="button"]'))
    expect(onOpen).toHaveBeenCalledWith('o1')
  })
  it('muestra tag de total personalizado', () => {
    render(<OrderCard order={{ ...base, total_personalizado:true }} onOpen={vi.fn()} />)
    expect(screen.getByText(/total/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementar**

```jsx
const STATUS = {
  pending:   { label:'Pendiente', cls:'bg-yellow-50 border-yellow-200 text-yellow-700' },
  delivered: { label:'Entregado', cls:'bg-green-50 border-green-200 text-green-700' },
  cancelled: { label:'Cancelado', cls:'bg-red-50 border-red-200 text-red-600' },
}
export default function OrderCard({ order, onOpen }) {
  const s = STATUS[order.status]
  const items = order.order_items ?? []
  const resumen = items.map(i => `${i.quantity}× ${i.products?.name}`).join(' · ')
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(order.id)}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(order.id) }}
      className="bg-white border border-surface-border rounded-xl px-3 py-2.5 flex items-center gap-3 cursor-pointer hover:border-brand-200">
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-brand-700">{order.order_number}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${s.cls}`}>{s.label}</span>
          {order.total_personalizado && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-900 border border-brand-200 font-semibold">✎ total</span>
          )}
        </div>
        <span className="text-sm text-brand-900 font-medium truncate">
          {order.customer_name} <span className="text-gray-400 font-normal">· {order.customer_phone}</span>
        </span>
        {resumen && <span className="text-xs text-gray-400 truncate">{resumen}</span>}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-lg font-extrabold text-brand-900">${Number(order.total).toFixed(0)}</span>
        <span className="text-gray-300 text-lg leading-none">›</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): OrderCard compacto con navegacion y tag de total"`

### Task 7: `PorEntregarSummary.jsx` (mosaico abatible)

**Files:** Create `src/components/admin/PorEntregarSummary.jsx`, Test `.test.jsx`

- [ ] **Step 1: Test**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PorEntregarSummary from './PorEntregarSummary'

const day = { date:'2026-06-14', orderCount:2, products:[{ name:'Agua 20L', qty:8 }, { name:'Garrafón', qty:3 }] }

describe('PorEntregarSummary', () => {
  it('muestra cantidades por producto', () => {
    render(<PorEntregarSummary day={day} />)
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('Agua 20L')).toBeInTheDocument()
  })
  it('abate al tocar el header', () => {
    render(<PorEntregarSummary day={day} />)
    fireEvent.click(screen.getByRole('button', { name: /por entregar/i }))
    expect(screen.queryByText('Agua 20L')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementar**

```jsx
import { useState } from 'react'
import { formatLongDate } from '../../lib/deliveryDates'

export default function PorEntregarSummary({ day }) {
  const [open, setOpen] = useState(true)
  if (!day || !day.products.length) return null
  return (
    <div className="border border-brand-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full bg-brand-700 text-white px-3 py-2 flex justify-between items-center font-semibold">
        <span>Por entregar</span>
        <span className="flex items-center gap-2 text-brand-100 text-sm">
          {formatLongDate(day.date)} <span>{open ? '▾' : '▸'}</span>
        </span>
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-2 p-2 bg-brand-50">
          {day.products.map(p => (
            <div key={p.name} className="bg-white border border-brand-100 rounded-lg p-2 text-center">
              <div className="text-2xl font-extrabold text-brand-700 leading-none">{p.qty}</div>
              <div className="text-xs text-brand-900 mt-1">{p.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): PorEntregarSummary abatible"`

### Task 8: `OrderDateNav.jsx`

**Files:** Create `src/components/admin/OrderDateNav.jsx`, Test `.test.jsx`

- [ ] **Step 1: Test**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OrderDateNav from './OrderDateNav'

const dates = ['2026-06-14','2026-06-16']

describe('OrderDateNav', () => {
  it('muestra "Hoy" cuando la fecha activa es hoy', () => {
    render(<OrderDateNav dates={dates} active="2026-06-14" today="2026-06-14" onChange={vi.fn()} />)
    expect(screen.getByText(/hoy/i)).toBeInTheDocument()
  })
  it('avanza a la siguiente fecha disponible', () => {
    const onChange = vi.fn()
    render(<OrderDateNav dates={dates} active="2026-06-14" today="2026-06-14" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    expect(onChange).toHaveBeenCalledWith('2026-06-16')
  })
  it('deshabilita anterior en la primera fecha', () => {
    render(<OrderDateNav dates={dates} active="2026-06-14" today="2026-06-14" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementar**

```jsx
import { formatWeekday, formatLongDate } from '../../lib/deliveryDates'

export default function OrderDateNav({ dates, active, today, onChange }) {
  const i = dates.indexOf(active)
  const go = (delta) => { const n = i + delta; if (n >= 0 && n < dates.length) onChange(dates[n]) }
  const label = active === today ? 'Hoy' : formatWeekday(active)
  return (
    <div className="flex justify-between items-center bg-white border border-surface-border rounded-xl px-2 py-2">
      <button aria-label="anterior" disabled={i <= 0} onClick={() => go(-1)}
        className="w-9 h-9 rounded-lg border border-surface-border text-brand-700 font-bold disabled:opacity-30">‹</button>
      <div className="text-center leading-tight">
        <div className="font-bold text-brand-900 capitalize">{label}</div>
        <div className="text-xs text-gray-400 capitalize">{formatWeekday(active)} {formatLongDate(active)}</div>
      </div>
      <button aria-label="siguiente" disabled={i >= dates.length - 1} onClick={() => go(1)}
        className="w-9 h-9 rounded-lg border border-surface-border text-brand-700 font-bold disabled:opacity-30">›</button>
    </div>
  )
}
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): OrderDateNav navegador de fecha"`

### Task 9: `TotalOverride.jsx` (3 estados)

**Files:** Create `src/components/admin/TotalOverride.jsx`, Test `.test.jsx`

- [ ] **Step 1: Test**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TotalOverride from './TotalOverride'

describe('TotalOverride', () => {
  it('estado normal: muestra total y botón editar', () => {
    render(<TotalOverride total={240} personalizado={false} calculado={240} onSet={vi.fn()} onReset={vi.fn()} />)
    expect(screen.getByText('$240')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /editar total/i })).toBeInTheDocument()
  })
  it('editar → guardar llama onSet con el número', () => {
    const onSet = vi.fn()
    render(<TotalOverride total={240} personalizado={false} calculado={240} onSet={onSet} onReset={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /editar total/i }))
    fireEvent.change(screen.getByLabelText(/total/i), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))
    expect(onSet).toHaveBeenCalledWith(200)
  })
  it('personalizado: muestra tag y permite volver al calculado', () => {
    const onReset = vi.fn()
    render(<TotalOverride total={200} personalizado calculado={240} onSet={vi.fn()} onReset={onReset} />)
    expect(screen.getByText(/personalizado/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /volver al calculado/i }))
    expect(onReset).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementar**

```jsx
import { useState } from 'react'

export default function TotalOverride({ total, personalizado, calculado, onSet, onReset }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(total))

  if (editing) {
    return (
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 flex flex-col gap-2">
        <label className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Total a cobrar</label>
        <input aria-label="total" type="number" inputMode="decimal" value={value}
          onChange={e => setValue(e.target.value)}
          className="border border-surface-border rounded-lg px-3 py-2 text-brand-900 font-bold" />
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg border border-surface-border text-brand-900">Cancelar</button>
          <button onClick={() => { onSet(Number(value)); setEditing(false) }} className="px-3 py-1.5 rounded-lg bg-brand-700 text-white font-semibold">Guardar total</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-brand-50 border border-brand-100 rounded-xl p-3">
      <div className="flex justify-between items-center">
        <span className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Total a cobrar</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-brand-900">${Number(total).toFixed(0)}</span>
          {personalizado && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-900 border border-brand-200 font-semibold">✎ personalizado</span>}
        </div>
      </div>
      <div className="flex justify-between items-center mt-1.5 text-sm">
        <span className="text-gray-400">Calculado: ${Number(calculado).toFixed(0)}</span>
        {personalizado
          ? <button onClick={onReset} className="text-brand-700 underline font-semibold">Volver al calculado</button>
          : <button onClick={() => { setValue(String(total)); setEditing(true) }} className="text-brand-700 underline font-semibold">Editar total ✎</button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): TotalOverride con 3 estados"`

### Task 10: `OrderItemEditor.jsx` (stepper grande + guard de último)

**Files:** Create `src/components/admin/OrderItemEditor.jsx`, Test `.test.jsx`

Props: `items` (order_items con `product_id`, `quantity`, `unit_price`, `products.name`), `onChangeQty(productId, newQty)`, `onRemove(productId)`, `onRemoveLast()` (cuando quitar dejaría el pedido vacío → la página decide ofrecer cancelar).

- [ ] **Step 1: Test**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OrderItemEditor from './OrderItemEditor'

const items = [
  { product_id:'p1', quantity:2, unit_price:45, products:{ name:'Agua 20L' } },
  { product_id:'p2', quantity:3, unit_price:50, products:{ name:'Garrafón' } },
]

describe('OrderItemEditor', () => {
  it('+ y − ajustan cantidad', () => {
    const onChangeQty = vi.fn()
    render(<OrderItemEditor items={items} onChangeQty={onChangeQty} onRemove={vi.fn()} onRemoveLast={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: '+' })[0])
    expect(onChangeQty).toHaveBeenCalledWith('p1', 3)
  })
  it('quitar un artículo (quedan otros) llama onRemove', () => {
    const onRemove = vi.fn()
    render(<OrderItemEditor items={items} onChangeQty={vi.fn()} onRemove={onRemove} onRemoveLast={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: /quitar/i })[0])
    expect(onRemove).toHaveBeenCalledWith('p1')
  })
  it('quitar el último artículo restante llama onRemoveLast', () => {
    const onRemoveLast = vi.fn()
    render(<OrderItemEditor items={[items[0]]} onChangeQty={vi.fn()} onRemove={vi.fn()} onRemoveLast={onRemoveLast} />)
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }))
    expect(onRemoveLast).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementar**

```jsx
export default function OrderItemEditor({ items, onChangeQty, onRemove, onRemoveLast }) {
  const last = items.length === 1
  return (
    <div className="bg-white border border-surface-border rounded-xl p-3">
      <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">Artículos</div>
      {items.map(it => (
        <div key={it.product_id} className="py-2 border-b border-dashed border-surface-border last:border-0">
          <div className="flex justify-between items-center">
            <span className="text-brand-900">{it.products?.name} <span className="text-gray-400 text-sm">${Number(it.unit_price).toFixed(0)} c/u</span></span>
            <span className="font-bold text-brand-900">${(it.unit_price * it.quantity).toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 flex items-center justify-between border border-surface-border rounded-lg">
              <button aria-label="−" onClick={() => onChangeQty(it.product_id, it.quantity - 1)}
                className="w-11 h-10 text-brand-700 text-xl font-bold bg-brand-50 rounded-l-lg">−</button>
              <span className="font-extrabold text-base">{it.quantity}</span>
              <button aria-label="+" onClick={() => onChangeQty(it.product_id, it.quantity + 1)}
                className="w-11 h-10 text-brand-700 text-xl font-bold bg-brand-50 rounded-r-lg">+</button>
            </div>
            <button aria-label="quitar" onClick={() => (last ? onRemoveLast() : onRemove(it.product_id))}
              className="w-12 h-10 border border-red-200 rounded-lg text-red-600 bg-red-50">🗑</button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

> Nota: cuando `onChangeQty` recibe `newQty <= 0`, la **página** lo trata como quitar (o `onRemoveLast` si es el último). El editor solo emite intención.

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): OrderItemEditor con controles grandes y guard de ultimo"`

### Task 11: `AddProductPicker.jsx`

**Files:** Create `src/components/admin/AddProductPicker.jsx`, Test `.test.jsx`

Props: `products` (activos con stock: `id, name, price, stock`), `onAdd(productId, qty)`, `onClose()`.

- [ ] **Step 1: Test**

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AddProductPicker from './AddProductPicker'

const products = [{ id:'p1', name:'Agua 20L', price:45, stock:10 }, { id:'p2', name:'Garrafón', price:50, stock:4 }]

describe('AddProductPicker', () => {
  it('filtra por búsqueda y agrega con cantidad', () => {
    const onAdd = vi.fn()
    render(<AddProductPicker products={products} onAdd={onAdd} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'garra' } })
    expect(screen.queryByText('Agua 20L')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Garrafón'))
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }))
    expect(onAdd).toHaveBeenCalledWith('p2', 1)
  })
})
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementar**

```jsx
import { useState } from 'react'

export default function AddProductPicker({ products, onAdd, onClose }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const [qty, setQty] = useState(1)
  const list = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end" onClick={onClose}>
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-4 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
        <input autoFocus placeholder="Buscar producto…" value={q} onChange={e => setQ(e.target.value)}
          className="border border-surface-border rounded-lg px-3 py-2" />
        <div className="max-h-56 overflow-y-auto flex flex-col gap-1">
          {list.map(p => (
            <button key={p.id} onClick={() => setSel(p)}
              className={`text-left px-3 py-2 rounded-lg border ${sel?.id === p.id ? 'border-brand-700 bg-brand-50' : 'border-surface-border'}`}>
              <span className="text-brand-900">{p.name}</span>
              <span className="text-gray-400 text-sm"> · ${Number(p.price).toFixed(0)} · {p.stock} en stock</span>
            </button>
          ))}
          {!list.length && <p className="text-center text-gray-400 py-4">Sin resultados.</p>}
        </div>
        {sel && (
          <div className="flex items-center justify-between border-t border-surface-border pt-3">
            <div className="flex items-center border border-surface-border rounded-lg">
              <button aria-label="−" onClick={() => setQty(n => Math.max(1, n - 1))} className="w-10 h-10 text-brand-700 text-xl font-bold">−</button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <button aria-label="+" onClick={() => setQty(n => Math.min(sel.stock, n + 1))} className="w-10 h-10 text-brand-700 text-xl font-bold">+</button>
            </div>
            <button onClick={() => onAdd(sel.id, qty)} className="bg-brand-700 text-white px-4 py-2 rounded-lg font-semibold">Agregar</button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): AddProductPicker buscador + cantidad"`

---

## Fase 4 — Páginas y rutas

### Task 12: `AdminOrderDetailPage.jsx`

**Files:** Create `src/pages/AdminOrderDetailPage.jsx`, Test `.test.jsx`

Usa `useOrders()` (encuentra el pedido por `:id`), `useProducts()` (para el picker). Compone cliente + `OrderItemEditor` + `AddProductPicker` + `TotalOverride` + acciones. `calculado` = suma de líneas. Guard de último → `window.confirm` ofreciendo cancelar.

- [ ] **Step 1: Test** (supabase mockeado; ruta con id)

```jsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AdminOrderDetailPage from './AdminOrderDetailPage'

const order = { id:'o1', order_number:'EM-012', status:'pending', customer_name:'María', customer_phone:'5512345678',
  notes:'reja azul', total:240, total_personalizado:false, delivery_date:'2026-06-14',
  order_items:[{ id:1, product_id:'p1', quantity:2, unit_price:45, products:{ name:'Agua 20L' } }] }

vi.mock('../lib/supabase', () => ({ supabase: {
  rpc: () => Promise.resolve({ data: { success:true }, error:null }),
  from: (t) => ({ select: () => (t === 'products'
    ? { eq: () => ({ gt: () => ({ order: () => Promise.resolve({ data:[], error:null }) }) }) }
    : { order: () => Promise.resolve({ data:[order], error:null }) }) }),
}}))

describe('AdminOrderDetailPage', () => {
  it('muestra el pedido y sus artículos', async () => {
    render(<MemoryRouter initialEntries={['/admin/pedidos/o1']}>
      <Routes><Route path="/admin/pedidos/:id" element={<AdminOrderDetailPage />} /></Routes>
    </MemoryRouter>)
    expect(await screen.findByText('EM-012')).toBeInTheDocument()
    expect(screen.getByText('Agua 20L')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/marcar entregado/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementar**

```jsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useOrders } from '../hooks/useOrders'
import { useProducts } from '../hooks/useProducts'
import { formatWeekday, formatLongDate } from '../lib/deliveryDates'
import OrderItemEditor from '../components/admin/OrderItemEditor'
import AddProductPicker from '../components/admin/AddProductPicker'
import TotalOverride from '../components/admin/TotalOverride'

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { orders, loading, error, addItems, removeItem, markDelivered, setTotal, recalcTotal, cancel } = useOrders()
  const { products } = useProducts()
  const [picking, setPicking] = useState(false)

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>
  const order = orders.find(o => o.id === id)
  if (!order) return <div className="max-w-lg mx-auto px-4 py-6 text-gray-400">Pedido no encontrado. <button className="text-brand-700 underline" onClick={() => navigate('/admin/pedidos')}>Volver</button></div>

  const items = order.order_items ?? []
  const calculado = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const isPending = order.status === 'pending'

  async function changeQty(productId, newQty) {
    const it = items.find(i => i.product_id === productId)
    if (newQty <= 0) { return removeOne(productId) }
    if (newQty > it.quantity) await addItems(order.id, [{ product_id: productId, quantity: newQty - it.quantity }])
    else await removeItem(order.id, productId, it.quantity - newQty)
  }
  async function removeOne(productId) {
    if (items.length === 1) return offerCancel()
    await removeItem(order.id, productId, items.find(i => i.product_id === productId).quantity)
  }
  async function offerCancel() {
    if (window.confirm('Es el último artículo; el pedido quedaría vacío. ¿Cancelar el pedido?')) {
      await cancel(order.id); navigate('/admin/pedidos')
    }
  }
  async function deliver() { await markDelivered(order.id); navigate('/admin/pedidos') }
  async function cancelOrder() { if (window.confirm('¿Cancelar este pedido? Se restaura el stock.')) { await cancel(order.id); navigate('/admin/pedidos') } }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-3">
      <button onClick={() => navigate('/admin/pedidos')} className="text-brand-700 font-semibold self-start">← Pedidos</button>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="flex items-center gap-2">
        <span className="text-xl font-extrabold text-brand-700">{order.order_number}</span>
        <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-50 border-yellow-200 text-yellow-700 font-semibold capitalize">{order.status}</span>
      </div>

      <div className="bg-white border border-surface-border rounded-xl p-3">
        <div className="font-semibold text-brand-900">{order.customer_name}</div>
        <div className="text-gray-400">{order.customer_phone}</div>
        {order.notes && <div className="italic text-gray-400">"{order.notes}"</div>}
        <div className="flex justify-between mt-1.5 text-sm"><span className="text-gray-400 capitalize">Entrega</span><span className="capitalize">{formatWeekday(order.delivery_date)} {formatLongDate(order.delivery_date)}</span></div>
      </div>

      <OrderItemEditor items={items} onChangeQty={changeQty} onRemove={removeOne} onRemoveLast={offerCancel} />

      {isPending && <button onClick={() => setPicking(true)} className="border border-dashed border-brand-700 text-brand-700 bg-brand-50 rounded-lg py-2 font-semibold">+ Agregar producto</button>}

      <TotalOverride total={order.total} personalizado={order.total_personalizado} calculado={calculado}
        onSet={(t) => setTotal(order.id, t)} onReset={() => recalcTotal(order.id)} />

      {isPending && (
        <>
          <button onClick={deliver} className="bg-brand-700 text-white rounded-xl py-3 font-bold">✅ Marcar entregado</button>
          <button onClick={cancelOrder} className="border border-red-200 text-red-600 bg-red-50 rounded-xl py-2.5 font-semibold">Cancelar pedido</button>
        </>
      )}

      {picking && <AddProductPicker products={products} onClose={() => setPicking(false)}
        onAdd={async (pid, qty) => { await addItems(order.id, [{ product_id: pid, quantity: qty }]); setPicking(false) }} />}
    </div>
  )
}
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): AdminOrderDetailPage panel de edicion"`

### Task 13: `AdminSettingsPage.jsx`

**Files:** Create `src/pages/AdminSettingsPage.jsx`, Test `.test.jsx`

- [ ] **Step 1: Test**

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AdminSettingsPage from './AdminSettingsPage'

const saveSettings = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('../hooks/useAppSettings', () => ({ useAppSettings: () => ({
  config: { weekdays:[1,2,3,4,5,6,7], cutoffTime:'20:00', cancelTime:'06:00' }, loading:false, saveSettings,
})}))

describe('AdminSettingsPage', () => {
  it('alterna un día y guarda', async () => {
    render(<MemoryRouter><AdminSettingsPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'D' })) // quita domingo (7)
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))
    await waitFor(() => expect(saveSettings).toHaveBeenCalled())
    expect(saveSettings.mock.calls[0][0].weekdays).not.toContain(7)
  })
})
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementar**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSettings } from '../hooks/useAppSettings'

const DAYS = [['L',1],['M',2],['M',3],['J',4],['V',5],['S',6],['D',7]]

export default function AdminSettingsPage() {
  const navigate = useNavigate()
  const { config, loading, saveSettings } = useAppSettings()
  const [weekdays, setWeekdays] = useState(config.weekdays)
  const [cutoffTime, setCutoff] = useState(config.cutoffTime)
  const [cancelTime, setCancel] = useState(config.cancelTime)
  const [saved, setSaved] = useState(false)

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>
  const toggle = (n) => setWeekdays(w => w.includes(n) ? w.filter(x => x !== n) : [...w, n])

  async function save() { const { error } = await saveSettings({ weekdays, cutoffTime, cancelTime }); if (!error) setSaved(true) }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-5">
      <button onClick={() => navigate('/admin/pedidos')} className="text-brand-700 font-semibold self-start">← Pedidos</button>
      <h1 className="text-2xl font-bold text-brand-900">Configuración</h1>

      <div>
        <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Días de entrega</div>
        <div className="flex gap-1.5">
          {DAYS.map(([lbl, n], idx) => (
            <button key={idx} aria-label={lbl} onClick={() => toggle(n)}
              className={`w-9 h-9 rounded-lg font-bold border ${weekdays.includes(n) ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-gray-400 border-surface-border'}`}>{lbl}</button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Días que el cliente puede elegir para recibir su pedido.</p>
      </div>

      <div className="bg-white border border-surface-border rounded-xl p-3">
        <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Horarios de corte</div>
        <label className="flex justify-between items-center py-2 border-b border-dashed border-surface-border">
          <span>Corte para pedir <span className="block text-xs text-gray-400">Hasta esta hora del día anterior</span></span>
          <input type="time" value={cutoffTime} onChange={e => setCutoff(e.target.value)} className="border border-surface-border rounded-lg px-2 py-1.5 font-bold" />
        </label>
        <label className="flex justify-between items-center py-2">
          <span>Corte para cancelar <span className="block text-xs text-gray-400">Hasta esta hora del día de entrega</span></span>
          <input type="time" value={cancelTime} onChange={e => setCancel(e.target.value)} className="border border-surface-border rounded-lg px-2 py-1.5 font-bold" />
        </label>
      </div>

      <button onClick={save} className="bg-brand-700 text-white rounded-xl py-3 font-bold">Guardar configuración</button>
      {saved && <p className="text-center text-brand-700 text-sm">✓ Guardado</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(p3): AdminSettingsPage editor de configuracion"`

### Task 14: reescribir `AdminOrdersPage.jsx` + `OrderList.jsx`

**Files:** Modify `src/pages/AdminOrdersPage.jsx`, `src/components/admin/OrderList.jsx`, Test `src/pages/AdminOrdersPage.test.jsx`

`OrderList` pasa a recibir `orders` ya filtradas + `onOpen`.

- [ ] **Step 1: Test de AdminOrdersPage** (vista por fecha + historial)

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AdminOrdersPage from './AdminOrdersPage'

const orders = [
  { id:'o1', order_number:'EM-013', status:'pending', customer_name:'Juan', customer_phone:'5599887766',
    total:310, total_personalizado:false, delivery_date:'2026-06-14',
    order_items:[{ id:1, product_id:'p1', quantity:6, unit_price:45, products:{ name:'Agua 20L' } }] },
  { id:'o2', order_number:'EM-009', status:'delivered', customer_name:'Ana', customer_phone:'5500112233',
    total:90, total_personalizado:false, delivery_date:'2026-06-10', order_items:[] },
]
vi.mock('../lib/supabase', () => ({ supabase: {
  rpc: () => Promise.resolve({ data:{ success:true }, error:null }),
  from: () => ({ select: () => ({ order: () => Promise.resolve({ data: orders, error:null }) }) }),
}}))
vi.useFakeTimers().setSystemTime(new Date('2026-06-14T09:00:00'))

describe('AdminOrdersPage', () => {
  it('muestra resumen por entregar y el pedido pendiente del día', async () => {
    render(<MemoryRouter><AdminOrdersPage /></MemoryRouter>)
    expect(await screen.findByText(/por entregar/i)).toBeInTheDocument()
    expect(screen.getByText('EM-013')).toBeInTheDocument()
    expect(screen.queryByText('EM-009')).not.toBeInTheDocument() // entregado, no aparece en pendientes
  })
  it('el enlace de historial muestra entregados', async () => {
    render(<MemoryRouter><AdminOrdersPage /></MemoryRouter>)
    fireEvent.click(await screen.findByText(/entregados \/ cancelados/i))
    await waitFor(() => expect(screen.getByText('EM-009')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementar `OrderList.jsx`**

```jsx
import OrderCard from './OrderCard'
export default function OrderList({ orders, onOpen }) {
  if (!orders.length) return <p className="text-center text-gray-400 py-8">Sin pedidos.</p>
  return <div className="flex flex-col gap-2">{orders.map(o => <OrderCard key={o.id} order={o} onOpen={onOpen} />)}</div>
}
```

- [ ] **Step 4: Implementar `AdminOrdersPage.jsx`**

```jsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrders } from '../hooks/useOrders'
import { buildPendingSummary, defaultPendingDate } from '../lib/pendingSummary'
import { toISODate } from '../lib/deliveryDates'
import OrderList from '../components/admin/OrderList'
import PorEntregarSummary from '../components/admin/PorEntregarSummary'
import OrderDateNav from '../components/admin/OrderDateNav'

const HIST = [
  { value:'delivered', label:'Entregados' },
  { value:'cancelled', label:'Cancelados' },
  { value:'all',       label:'Todos' },
]

export default function AdminOrdersPage() {
  const { orders, loading, error } = useOrders()
  const navigate = useNavigate()
  const today = toISODate(new Date())
  const summary = useMemo(() => buildPendingSummary(orders), [orders])
  const [active, setActive] = useState(null)
  const [history, setHistory] = useState(false)
  const [histFilter, setHistFilter] = useState('delivered')

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

  const activeDate = active ?? defaultPendingDate(summary, today)
  const open = (id) => navigate(`/admin/pedidos/${id}`)
  const pendingOfDay = orders.filter(o => o.status === 'pending' && o.delivery_date === activeDate)
  const histList = histFilter === 'all' ? orders.filter(o => o.status !== 'pending') : orders.filter(o => o.status === histFilter)

  return (
    <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-900">Pedidos</h1>
        <button aria-label="Configuración" onClick={() => navigate('/admin/configuracion')} className="text-2xl">⚙️</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {!history ? (
        <>
          {summary.dates.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay pedidos pendientes.</p>
          ) : (
            <>
              <OrderDateNav dates={summary.dates} active={activeDate} today={today} onChange={setActive} />
              <PorEntregarSummary day={summary.byDate[activeDate]} />
              <OrderList orders={pendingOfDay} onOpen={open} />
            </>
          )}
          <button onClick={() => setHistory(true)} className="text-brand-700 underline text-center mt-1">Ver entregados / cancelados</button>
        </>
      ) : (
        <>
          <button onClick={() => setHistory(false)} className="text-brand-700 font-semibold self-start">← Pendientes</button>
          <div className="flex gap-2">
            {HIST.map(f => (
              <button key={f.value} onClick={() => setHistFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${histFilter === f.value ? 'bg-brand-700 text-white' : 'bg-white border border-surface-border text-brand-900'}`}>{f.label}</button>
            ))}
          </div>
          <OrderList orders={histList} onOpen={open} />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run** → PASS. **Commit** `git commit -am "feat(p3): AdminOrdersPage vista por fecha + resumen + historial"`

### Task 15: rutas en `App.jsx`

**Files:** Modify `src/App.jsx`

- [ ] **Step 1: Añadir imports y rutas**

```jsx
import AdminOrderDetailPage from './pages/AdminOrderDetailPage'
import AdminSettingsPage    from './pages/AdminSettingsPage'
// ...
<Route path="/admin/pedidos/:id" element={
  <ProtectedRoute><Layout showAdmin><AdminOrderDetailPage /></Layout></ProtectedRoute>
} />
<Route path="/admin/configuracion" element={
  <ProtectedRoute><Layout showAdmin><AdminSettingsPage /></Layout></ProtectedRoute>
} />
```

- [ ] **Step 2: Run build** `npm run build` → OK
- [ ] **Step 3: Commit** `git commit -am "feat(p3): rutas de detalle de pedido y configuracion"`

---

## Fase 5 — Verificación

### Task 16: suite completa + build

- [ ] **Step 1:** `npx vitest run` → todo verde (74 previos + nuevos).
- [ ] **Step 2:** `npm run build` → sin errores.
- [ ] **Step 3:** Si algo falla, arreglar antes de continuar. Commit de ajustes si hubo.

---

## Cutover (NO ejecutar sin aprobación explícita)

1. Aplicar `010_p3_admin.sql` vía Management API.
2. Smoke real: crear pedido → agregar/quitar (stock correcto) → set_total (override) → recalcular (limpia) → marcar entregado (`delivered_at` poblado) → verificar `admin update orders` ausente.
3. Deploy Vercel. Verificar en prod.
4. Actualizar manual §6 (P3 ✅), §7, memoria y `CLAUDE.md` (próxima sesión → P4).
