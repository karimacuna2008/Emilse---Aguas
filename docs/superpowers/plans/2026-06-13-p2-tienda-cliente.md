# P2 — Tienda (cliente) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la experiencia de cliente de la tienda (catálogo Lista/Tarjetas, modal de cantidad, checkout con fecha de entrega + detección de pedido abierto, "Mi pedido" por teléfono, nav de 4 tabs) sobre el stack actual, manteniendo "todo acceso a `orders` pasa por RPC `SECURITY DEFINER`".

**Architecture:** SPA React 19 + Vite 8 + Tailwind v3 + react-router 7. Lógica de negocio crítica en funciones PostgreSQL (RPC `SECURITY DEFINER`, `search_path=''`). El cálculo de fechas y los helpers de catálogo/WhatsApp viven como **lógica pura en `src/lib/`** (testeable con Vitest) y se **validan también en servidor** (`crear_pedido`). Configuración de negocio (días hábiles, cortes) en tabla `app_settings` key-value, leída pública por el cliente; su **UI de edición es P3** (en P2 solo seed/defaults).

**Tech Stack:** React 19, react-router-dom 7, Tailwind v3, @supabase/supabase-js 2, Vitest 4 + @testing-library/react 16. **Sin librerías nuevas.**

**Fuente de verdad:** `docs/superpowers/specs/2026-06-13-p2-tienda-cliente-design.md`.

**Tema (clases ya existentes):** `brand-100` (verde claro), `brand-200`, `brand-700` (verde primario), `brand-900` (texto), `surface`, `surface-border`.

**Convención de pruebas SQL:** las RPC no tienen framework de test unitario en este repo. Su corrección se verifica **manualmente** (sección de verificación de la Fase 1: `information_schema` + `curl` anónimo). La lógica equivalente del lado cliente (`lib/deliveryDates.js`) **sí** está cubierta por TDD.

---

## Decisiones de implementación que afinan el spec (leer antes de empezar)

1. **`buscar_pedido_abierto` devuelve `order_id` (UUID).** El UUID no es PII y es **no enumerable** (a diferencia de `EM-001`), así que funciona como "capability token": el cliente solo lo obtiene tras probar su teléfono. `agregar_a_pedido(p_order_id, p_items)` lo usa. Esto respeta la regla de datos mínimos (sin nombre/notas/teléfono) y la firma del spec §6.
2. **`agregar_a_pedido` fusiona líneas:** si el producto ya está en el pedido, suma a la línea existente; si no, inserta. Recalcula `total` y pone `total_personalizado = FALSE` (decisión #15).
3. **Matriz de fechas = próximos 5 días *calendario* a partir de MAÑANA.** Hoy **nunca** es entregable: el corte para el día `D` es a las `order_cutoff_time` del día anterior, así que para hoy ese corte ya pasó siempre. Por eso la matriz empieza en `today + 1`. Cada celda queda habilitada solo si (a) weekday activo y (b) antes del corte (configurable por el admin); las no disponibles se ven atenuadas; preselecciona la primera disponible. (Decisión confirmada por el usuario 2026-06-13, ajusta la interpretación del spec §7/#5.)
4. **Componentes presentacionales controlados** (ViewToggle, DeliveryDatePicker, CatalogToolbar): reciben estado + callbacks; el estado y la persistencia viven en la página. Esto los hace puros y fáciles de testear.
5. **`localStorage`:** `emi_view` (`lista|tarjetas`) y `emi_phone` (último teléfono, prefill en checkout y Mi pedido). El carrito ya usa `emi_cart`.

---

## Estructura de archivos

**Nuevos (frontend)**
- `src/lib/catalog.js` — `uniqueCategories`, `filterProducts` (puro, testeable).
- `src/lib/deliveryDates.js` — parse de settings + lógica de fechas (puro, testeable).
- `src/lib/whatsapp.js` — armado de links/mensajes (puro, testeable).
- `src/hooks/useAppSettings.js` — lee `app_settings` (cache de módulo).
- `src/components/store/ViewToggle.jsx`
- `src/components/store/CatalogToolbar.jsx`
- `src/components/store/ProductListItem.jsx`
- `src/components/store/ProductQuantityModal.jsx`
- `src/components/store/DeliveryDatePicker.jsx`
- `src/components/store/OpenOrderChoice.jsx`
- `src/components/store/ActiveOrdersList.jsx`
- `src/components/store/CustomerOrderDetail.jsx`
- `src/pages/MyOrdersPage.jsx`

**Modificados (frontend)**
- `src/context/CartContext.jsx` — `+ setItemQuantity(product, quantity)`.
- `src/hooks/useProducts.js` — exponer `category` (ya hace `select('*')`, solo se documenta/verifica).
- `src/pages/StorePage.jsx` — vista/búsqueda/filtro/orden + modal; quita el FAB de WhatsApp.
- `src/components/store/ProductCard.jsx` — Tarjeta clickeable (precio, verde+badge, abre modal).
- `src/components/store/ProductGrid.jsx` — usa `onCardClick` + leyenda.
- `src/components/store/Cart.jsx` — etiqueta "Continuar →".
- `src/components/store/CheckoutForm.jsx` — validación teléfono 10 díg. + `DeliveryDatePicker` + prefill.
- `src/pages/CheckoutPage.jsx` — flujo 2 pasos + detección de pedido abierto (sumar/nuevo).
- `src/components/shared/Layout.jsx` — nav 4 tabs + admin discreto en header + tab Ayuda (WhatsApp).
- `src/components/shared/WhatsAppLink.jsx` — deja de ser FAB; se reemplaza por helper en `lib/whatsapp.js` (el archivo se elimina).
- `src/App.jsx` — ruta `/mis-pedidos`.

**Tests afectados (se actualizan en sus tareas):** `ProductCard.test.jsx`, `Cart.test.jsx`, `CheckoutForm.test.jsx`.

**Nuevos (DB)**
- `supabase/migrations/009_p2_tienda.sql` — `delivery_date` + índice + `app_settings` (+seed+RLS) + `crear_pedido` (rehecha) + 4 RPC nuevas + GRANTs.

---

## FASE 1 — Datos & RPC (crítico, bloquea el resto)

> Esta fase produce un único archivo de migración y lo aplica en Supabase vía Management API (el token está en `.env.local`, ver CLAUDE.md). No hay tests Vitest; verificación manual al final.

### Task 1.1: Escribir la migración `009_p2_tienda.sql`

**Files:**
- Create: `supabase/migrations/009_p2_tienda.sql`

- [ ] **Step 1: Crear el archivo con esquema + `app_settings` + seed + RLS**

```sql
-- 009_p2_tienda.sql
-- P2 (tienda/cliente): fecha de entrega, configuración (app_settings) y RPCs de cliente.
-- Idempotente donde es posible. Aplicar vía Supabase Management API.

-- ── Esquema: fecha de entrega obligatoria ──────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
-- Backfill de filas viejas antes del NOT NULL (riesgo: spec §11)
UPDATE orders SET delivery_date = created_at::date WHERE delivery_date IS NULL;
ALTER TABLE orders ALTER COLUMN delivery_date SET NOT NULL;

-- Índice para buscar_pedido_abierto / listar_pedidos_activos
CREATE INDEX IF NOT EXISTS idx_orders_phone_date_status
  ON orders(customer_phone, delivery_date, status);

-- ── Configuración editable (key-value) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Lectura pública (el cliente arma el calendario; no hay PII)
DROP POLICY IF EXISTS "public read app_settings" ON app_settings;
CREATE POLICY "public read app_settings"
  ON app_settings FOR SELECT USING (TRUE);

-- Escritura solo admin (la UI de edición llega en P3)
DROP POLICY IF EXISTS "admin write app_settings" ON app_settings;
CREATE POLICY "admin write app_settings"
  ON app_settings FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Seed de valores por defecto (decisiones #10, #11, #13)
INSERT INTO app_settings (key, value) VALUES
  ('order_cutoff_time',  '20:00'),
  ('cancel_cutoff_time', '06:00'),
  ('order_weekdays',     '1,2,3,4,5,6,7')   -- ISO 1=Lun..7=Dom; todos activos
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 2: Añadir `crear_pedido` rehecha (fecha + validaciones)**

Append al mismo archivo:

```sql
-- ── crear_pedido: + p_delivery_date + validaciones (teléfono 10 díg.,
--    items no vacíos, fecha permitida). Mantiene atomicidad y recálculo. ──
DROP FUNCTION IF EXISTS crear_pedido(TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION crear_pedido(
  p_customer_name  TEXT,
  p_customer_phone TEXT,
  p_notes          TEXT,
  p_delivery_date  DATE,
  p_items          JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order_id     UUID;
  v_order_number TEXT;
  v_total        DECIMAL := 0;
  v_item         JSONB;
  v_product      RECORD;
  v_phone        TEXT;
  v_cutoff_time  TEXT;
  v_weekdays     TEXT;
  v_dow          INT;
BEGIN
  -- Teléfono: exactamente 10 dígitos tras quitar no-dígitos
  v_phone := regexp_replace(COALESCE(p_customer_phone, ''), '[^0-9]', '', 'g');
  IF length(v_phone) <> 10 THEN
    RETURN jsonb_build_object('error', 'invalid_phone');
  END IF;

  -- Items no vacíos
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', 'empty_items');
  END IF;

  -- Fecha permitida: día activo + antes del corte del día anterior
  IF p_delivery_date IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_date');
  END IF;
  SELECT value INTO v_cutoff_time FROM public.app_settings WHERE key = 'order_cutoff_time';
  SELECT value INTO v_weekdays    FROM public.app_settings WHERE key = 'order_weekdays';
  v_cutoff_time := COALESCE(v_cutoff_time, '20:00');
  v_weekdays    := COALESCE(v_weekdays, '1,2,3,4,5,6,7');
  v_dow := EXTRACT(ISODOW FROM p_delivery_date)::INT;   -- 1=Lun..7=Dom
  IF NOT (v_dow::text = ANY (string_to_array(v_weekdays, ','))) THEN
    RETURN jsonb_build_object('error', 'date_not_allowed');
  END IF;
  IF now() >= ((p_delivery_date - INTERVAL '1 day') + v_cutoff_time::time) THEN
    RETURN jsonb_build_object('error', 'past_cutoff');
  END IF;

  -- Validar y bloquear cada producto
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, name, price, stock INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID AND active = TRUE
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'product_not_found');
    END IF;
    IF v_product.stock < (v_item->>'quantity')::INT THEN
      RETURN jsonb_build_object('error', 'out_of_stock', 'product_name', v_product.name);
    END IF;
    v_total := v_total + v_product.price * (v_item->>'quantity')::INT;
  END LOOP;

  v_order_number := 'EM-' || LPAD(nextval('public.order_number_seq')::TEXT, 3, '0');

  INSERT INTO public.orders
    (order_number, customer_name, customer_phone, notes, status, total, delivery_date)
  VALUES
    (v_order_number, p_customer_name, v_phone, p_notes, 'pending', v_total, p_delivery_date)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    SELECT v_order_id, p.id, (v_item->>'quantity')::INT, p.price
    FROM public.products p WHERE p.id = (v_item->>'product_id')::UUID;
    UPDATE public.products SET stock = stock - (v_item->>'quantity')::INT
    WHERE id = (v_item->>'product_id')::UUID;
  END LOOP;

  RETURN jsonb_build_object('success', TRUE, 'order_number', v_order_number, 'order_id', v_order_id);
END;
$$;
```

- [ ] **Step 3: Añadir `buscar_pedido_abierto`**

```sql
-- ── buscar_pedido_abierto: pedido pending del teléfono PARA ESA FECHA.
--    Datos mínimos + order_id (UUID no enumerable = capability token). ──
CREATE OR REPLACE FUNCTION buscar_pedido_abierto(p_phone TEXT, p_delivery_date DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_order RECORD; v_items JSONB; v_phone TEXT;
BEGIN
  v_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
  IF length(v_phone) <> 10 THEN
    RETURN jsonb_build_object('error', 'invalid_phone');
  END IF;

  SELECT id, order_number, total, delivery_date INTO v_order
  FROM public.orders
  WHERE customer_phone = v_phone AND delivery_date = p_delivery_date AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', FALSE);
  END IF;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object('name', p.name, 'quantity', oi.quantity, 'unit_price', oi.unit_price)
           ORDER BY oi.id), '[]'::jsonb)
  INTO v_items
  FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'found', TRUE, 'order_id', v_order.id, 'order_number', v_order.order_number,
    'total', v_order.total, 'delivery_date', v_order.delivery_date, 'items', v_items);
END;
$$;
```

- [ ] **Step 4: Añadir `agregar_a_pedido`**

```sql
-- ── agregar_a_pedido: suma items a un pedido pending; fusiona líneas;
--    recalcula total y limpia total_personalizado (decisión #15). ──
CREATE OR REPLACE FUNCTION agregar_a_pedido(p_order_id UUID, p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_order RECORD; v_item JSONB; v_product RECORD; v_new_total DECIMAL;
BEGIN
  SELECT id, status INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'order_not_found'); END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('error', 'order_not_pending'); END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', 'empty_items');
  END IF;

  -- Bloquear + validar stock de todos los productos primero
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, name, price, stock INTO v_product
    FROM public.products WHERE id = (v_item->>'product_id')::UUID AND active = TRUE FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'product_not_found'); END IF;
    IF v_product.stock < (v_item->>'quantity')::INT THEN
      RETURN jsonb_build_object('error', 'out_of_stock', 'product_name', v_product.name);
    END IF;
  END LOOP;

  -- Aplicar: fusiona línea existente o inserta; descuenta stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE public.order_items
    SET quantity = quantity + (v_item->>'quantity')::INT
    WHERE order_id = p_order_id AND product_id = (v_item->>'product_id')::UUID;
    IF NOT FOUND THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
      SELECT p_order_id, p.id, (v_item->>'quantity')::INT, p.price
      FROM public.products p WHERE p.id = (v_item->>'product_id')::UUID;
    END IF;
    UPDATE public.products SET stock = stock - (v_item->>'quantity')::INT
    WHERE id = (v_item->>'product_id')::UUID;
  END LOOP;

  SELECT COALESCE(SUM(quantity * unit_price), 0) INTO v_new_total
  FROM public.order_items WHERE order_id = p_order_id;
  UPDATE public.orders SET total = v_new_total, total_personalizado = FALSE WHERE id = p_order_id;

  RETURN jsonb_build_object('success', TRUE, 'total', v_new_total);
END;
$$;
```

- [ ] **Step 5: Añadir `listar_pedidos_activos` y `cancelar_pedido_cliente`**

```sql
-- ── listar_pedidos_activos: todos los pending del teléfono (datos mínimos) ──
CREATE OR REPLACE FUNCTION listar_pedidos_activos(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_phone TEXT; v_result JSONB;
BEGIN
  v_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
  IF length(v_phone) <> 10 THEN RETURN jsonb_build_object('error', 'invalid_phone'); END IF;

  SELECT COALESCE(jsonb_agg(o ORDER BY (o->>'delivery_date')), '[]'::jsonb) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'order_number',  ord.order_number,
      'delivery_date', ord.delivery_date,
      'status',        ord.status,
      'total',         ord.total,
      'items', (
        SELECT COALESCE(jsonb_agg(
                 jsonb_build_object('name', p.name, 'quantity', oi.quantity, 'unit_price', oi.unit_price)
                 ORDER BY oi.id), '[]'::jsonb)
        FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = ord.id)
    ) AS o
    FROM public.orders ord
    WHERE ord.customer_phone = v_phone AND ord.status = 'pending'
  ) sub;

  RETURN jsonb_build_object('orders', v_result);
END;
$$;

-- ── cancelar_pedido_cliente: valida teléfono + corte; cancela y restaura stock ──
CREATE OR REPLACE FUNCTION cancelar_pedido_cliente(p_order_number TEXT, p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_order RECORD; v_phone TEXT; v_cancel_time TEXT;
BEGIN
  v_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
  SELECT id, status, customer_phone, delivery_date INTO v_order
  FROM public.orders WHERE order_number = UPPER(p_order_number) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF v_order.customer_phone <> v_phone THEN RETURN jsonb_build_object('error', 'phone_mismatch'); END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('error', 'order_not_pending'); END IF;

  SELECT value INTO v_cancel_time FROM public.app_settings WHERE key = 'cancel_cutoff_time';
  v_cancel_time := COALESCE(v_cancel_time, '06:00');
  IF now() >= (v_order.delivery_date + v_cancel_time::time) THEN
    RETURN jsonb_build_object('error', 'past_cutoff');
  END IF;

  PERFORM p.id FROM public.products p
    JOIN public.order_items oi ON oi.product_id = p.id
    WHERE oi.order_id = v_order.id FOR UPDATE;
  UPDATE public.products p SET stock = p.stock + oi.quantity
    FROM public.order_items oi WHERE oi.order_id = v_order.id AND p.id = oi.product_id;
  UPDATE public.orders SET status = 'cancelled' WHERE id = v_order.id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;
```

- [ ] **Step 6: Añadir GRANTs**

```sql
-- ── GRANTs: RPC de cliente para anon + authenticated ──
GRANT EXECUTE ON FUNCTION crear_pedido(TEXT, TEXT, TEXT, DATE, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION buscar_pedido_abierto(TEXT, DATE)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION agregar_a_pedido(UUID, JSONB)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION listar_pedidos_activos(TEXT)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancelar_pedido_cliente(TEXT, TEXT)      TO anon, authenticated;
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/009_p2_tienda.sql
git commit -m "feat(p2): migración 009 — delivery_date, app_settings y RPCs de cliente"
```

### Task 1.2: Aplicar la migración en Supabase y verificar

**Files:** ninguno (operación sobre la BD).

- [ ] **Step 1: Aplicar `009_p2_tienda.sql`** vía Supabase Management API (token en `.env.local`, mismo método que la migración 008 — ver MANUAL §6 P1). Ejecutar el SQL completo en una sola transacción.

- [ ] **Step 2: Verificar esquema**

Ejecutar (SQL):
```sql
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name='orders' AND column_name='delivery_date';
SELECT indexname FROM pg_indexes WHERE tablename='orders' AND indexname='idx_orders_phone_date_status';
SELECT key, value FROM app_settings ORDER BY key;
```
Expected: `delivery_date | NO`; el índice existe; 3 filas seed (`cancel_cutoff_time=06:00`, `order_cutoff_time=20:00`, `order_weekdays=1,2,3,4,5,6,7`).

- [ ] **Step 3: Verificar que `app_settings` es legible anónimamente y `orders` sigue cerrada**

Run (bash, con `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` de `.env.local`):
```bash
curl -s "$VITE_SUPABASE_URL/rest/v1/app_settings?select=key,value" -H "apikey: $VITE_SUPABASE_ANON_KEY"
curl -s "$VITE_SUPABASE_URL/rest/v1/orders?select=*" -H "apikey: $VITE_SUPABASE_ANON_KEY"
```
Expected: la primera devuelve las 3 claves; la segunda devuelve `[]` (RLS sigue cerrada, P0 intacto).

- [ ] **Step 4: Smoke test de RPC anónima** (firma nueva)

Run:
```bash
curl -s "$VITE_SUPABASE_URL/rest/v1/rpc/crear_pedido" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"p_customer_name":"x","p_customer_phone":"123","p_notes":"","p_delivery_date":"2020-01-01","p_items":[]}'
```
Expected: `{"error":"invalid_phone"}` (valida teléfono antes que nada). Confirma que la firma de 5 args quedó registrada y ejecutable por `anon`.

---

## FASE 2 — Catálogo (Lista/Tarjetas, búsqueda, chips, modal)

### Task 2.1: `lib/catalog.js` — helpers puros de catálogo (TDD)

**Files:**
- Create: `src/lib/catalog.js`
- Test: `src/lib/catalog.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
// src/lib/catalog.test.js
import { describe, it, expect } from 'vitest'
import { uniqueCategories, filterProducts } from './catalog'

const products = [
  { id: '1', name: 'Garrafón 20L',  category: 'Garrafones' },
  { id: '2', name: 'Agua 5L',       category: 'Botellas' },
  { id: '3', name: 'Botella 1L',    category: 'Botellas' },
  { id: '4', name: 'Hielo',         category: null },
]

describe('uniqueCategories', () => {
  it('returns sorted unique non-empty categories', () => {
    expect(uniqueCategories(products)).toEqual(['Botellas', 'Garrafones'])
  })
  it('handles empty/undefined input', () => {
    expect(uniqueCategories([])).toEqual([])
    expect(uniqueCategories(undefined)).toEqual([])
  })
})

describe('filterProducts', () => {
  it('sorts alphabetically by name by default', () => {
    expect(filterProducts(products, {}).map(p => p.name))
      .toEqual(['Agua 5L', 'Botella 1L', 'Garrafón 20L', 'Hielo'])
  })
  it('filters by case-insensitive name substring', () => {
    expect(filterProducts(products, { query: 'agua' }).map(p => p.id)).toEqual(['2'])
  })
  it('filters by category', () => {
    expect(filterProducts(products, { category: 'Botellas' }).map(p => p.id)).toEqual(['2', '3'])
  })
  it('combines category + query', () => {
    expect(filterProducts(products, { category: 'Botellas', query: 'botella' }).map(p => p.id)).toEqual(['3'])
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/lib/catalog.test.js`
Expected: FAIL (`uniqueCategories is not a function` / módulo no existe).

- [ ] **Step 3: Implementar**

```js
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
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/lib/catalog.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalog.js src/lib/catalog.test.js
git commit -m "feat(p2): lib/catalog — búsqueda, filtro por categoría y orden alfabético"
```

### Task 2.2: `CartContext` — `setItemQuantity` (cantidad absoluta) (TDD)

**Files:**
- Modify: `src/context/CartContext.jsx`
- Test: `src/context/CartContext.test.jsx` (añadir casos)

- [ ] **Step 1: Añadir tests que fallan** (al final del `describe('useCart', …)` en `src/context/CartContext.test.jsx`)

```js
  it('setItemQuantity adds product with absolute quantity if not present', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })
    act(() => result.current.setItemQuantity(p1, 3))
    expect(result.current.items[0]).toMatchObject({ product_id: 'p1', quantity: 3 })
  })

  it('setItemQuantity overwrites quantity (not increments) if present', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })
    act(() => result.current.addItem(p1))
    act(() => result.current.setItemQuantity(p1, 5))
    expect(result.current.items[0].quantity).toBe(5)
  })

  it('setItemQuantity clamps to stock and removes on <= 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })
    act(() => result.current.setItemQuantity(p1, 999))
    expect(result.current.items[0].quantity).toBe(10) // p1.stock = 10
    act(() => result.current.setItemQuantity(p1, 0))
    expect(result.current.items).toHaveLength(0)
  })
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/context/CartContext.test.jsx`
Expected: FAIL (`setItemQuantity is not a function`).

- [ ] **Step 3: Implementar** — en `src/context/CartContext.jsx`, añadir la función antes de `clearCart` y exponerla en `value`:

```js
  function setItemQuantity(product, quantity) {
    if (quantity <= 0) { removeItem(product.id); return }
    setItems(prev => {
      const q = Math.min(quantity, product.stock)
      const exists = prev.find(i => i.product_id === product.id)
      if (exists) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: q } : i)
      }
      return [...prev, {
        product_id: product.id, name: product.name, price: product.price,
        quantity: q, maxStock: product.stock,
      }]
    })
  }
```

Y actualizar el objeto `value`:
```js
  const value = { items, total, addItem, removeItem, updateQuantity, setItemQuantity, clearCart }
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/context/CartContext.test.jsx`
Expected: PASS (todos, incluyendo los 3 nuevos).

- [ ] **Step 5: Commit**

```bash
git add src/context/CartContext.jsx src/context/CartContext.test.jsx
git commit -m "feat(p2): CartContext.setItemQuantity (cantidad absoluta para el modal)"
```

### Task 2.3: `ViewToggle` (TDD)

**Files:**
- Create: `src/components/store/ViewToggle.jsx`
- Test: `src/components/store/ViewToggle.test.jsx`

- [ ] **Step 1: Test que falla**

```js
// src/components/store/ViewToggle.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ViewToggle from './ViewToggle'

describe('ViewToggle', () => {
  it('marks the active view with aria-pressed', () => {
    render(<ViewToggle view="lista" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Vista lista')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Vista tarjetas')).toHaveAttribute('aria-pressed', 'false')
  })
  it('calls onChange with the other view', () => {
    const onChange = vi.fn()
    render(<ViewToggle view="lista" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Vista tarjetas'))
    expect(onChange).toHaveBeenCalledWith('tarjetas')
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/components/store/ViewToggle.test.jsx`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```jsx
// src/components/store/ViewToggle.jsx
export default function ViewToggle({ view, onChange }) {
  const btn = (v, label, glyph) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={view === v}
      onClick={() => onChange(v)}
      className={`px-3 py-2 text-lg ${view === v ? 'bg-brand-700 text-white' : 'bg-white text-brand-700'}`}
    >{glyph}</button>
  )
  return (
    <div className="flex border border-brand-200 rounded-lg overflow-hidden shrink-0">
      {btn('lista', 'Vista lista', '≣')}
      {btn('tarjetas', 'Vista tarjetas', '▦')}
    </div>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/components/store/ViewToggle.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/store/ViewToggle.jsx src/components/store/ViewToggle.test.jsx
git commit -m "feat(p2): ViewToggle (lista/tarjetas)"
```

### Task 2.4: `CatalogToolbar` (TDD)

**Files:**
- Create: `src/components/store/CatalogToolbar.jsx`
- Test: `src/components/store/CatalogToolbar.test.jsx`

- [ ] **Step 1: Test que falla**

```jsx
// src/components/store/CatalogToolbar.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CatalogToolbar from './CatalogToolbar'

const base = {
  query: '', onQueryChange: vi.fn(),
  categories: ['Botellas', 'Garrafones'], activeCategory: null, onCategoryChange: vi.fn(),
  view: 'lista', onViewChange: vi.fn(),
}

describe('CatalogToolbar', () => {
  it('calls onQueryChange on typing', () => {
    const onQueryChange = vi.fn()
    render(<CatalogToolbar {...base} onQueryChange={onQueryChange} />)
    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'agua' } })
    expect(onQueryChange).toHaveBeenCalledWith('agua')
  })
  it('renders a chip per category plus "Todos"', () => {
    render(<CatalogToolbar {...base} />)
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Botellas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Garrafones' })).toBeInTheDocument()
  })
  it('calls onCategoryChange with the chip value, and null for Todos', () => {
    const onCategoryChange = vi.fn()
    render(<CatalogToolbar {...base} onCategoryChange={onCategoryChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Botellas' }))
    expect(onCategoryChange).toHaveBeenCalledWith('Botellas')
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
    expect(onCategoryChange).toHaveBeenCalledWith(null)
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/components/store/CatalogToolbar.test.jsx`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```jsx
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
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/components/store/CatalogToolbar.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/store/CatalogToolbar.jsx src/components/store/CatalogToolbar.test.jsx
git commit -m "feat(p2): CatalogToolbar (buscador + chips de categoría + toggle)"
```

### Task 2.5: `ProductListItem` (TDD)

**Files:**
- Create: `src/components/store/ProductListItem.jsx`
- Test: `src/components/store/ProductListItem.test.jsx`

- [ ] **Step 1: Test que falla**

```jsx
// src/components/store/ProductListItem.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductListItem from './ProductListItem'

const product = { id: '1', name: 'Agua 5L', price: 20, stock: 10, image_url: null }

describe('ProductListItem', () => {
  it('shows Agregar when quantity is 0', () => {
    render(<ProductListItem product={product} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })
  it('calls onAdd when Agregar clicked', () => {
    const onAdd = vi.fn()
    render(<ProductListItem product={product} onAdd={onAdd} onRemove={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }))
    expect(onAdd).toHaveBeenCalledWith(product)
  })
  it('shows stepper when quantity > 0 and green class', () => {
    const { container } = render(<ProductListItem product={product} quantity={2} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByLabelText('Quitar uno')).toBeInTheDocument()
    expect(screen.getByLabelText('Agregar uno')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('bg-brand-100')
  })
  it('stepper buttons call onRemove(id) and onAdd(product)', () => {
    const onAdd = vi.fn(); const onRemove = vi.fn()
    render(<ProductListItem product={product} quantity={2} onAdd={onAdd} onRemove={onRemove} />)
    fireEvent.click(screen.getByLabelText('Quitar uno'))
    expect(onRemove).toHaveBeenCalledWith('1')
    fireEvent.click(screen.getByLabelText('Agregar uno'))
    expect(onAdd).toHaveBeenCalledWith(product)
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/components/store/ProductListItem.test.jsx`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```jsx
// src/components/store/ProductListItem.jsx
export default function ProductListItem({ product, quantity = 0, onAdd, onRemove }) {
  const hasItems = quantity > 0
  return (
    <div className={`flex items-center gap-3 border rounded-xl p-2 transition-colors ${
      hasItems ? 'bg-brand-100 border-brand-700' : 'bg-white border-brand-100'
    }`}>
      <div className="w-14 h-14 rounded-lg bg-brand-100 flex items-center justify-center text-2xl overflow-hidden shrink-0">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          : '💧'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-brand-900 leading-tight">{product.name}</p>
        <p className="text-brand-700 font-bold">${product.price.toFixed(2)}</p>
      </div>
      {hasItems ? (
        <div className="flex items-center bg-white border border-brand-700 rounded-lg overflow-hidden">
          <button aria-label="Quitar uno" onClick={() => onRemove(product.id)}
                  className="text-brand-700 font-bold text-xl px-3 py-1">−</button>
          <span className="font-bold w-8 text-center text-brand-900">{quantity}</span>
          <button aria-label="Agregar uno" onClick={() => onAdd(product)}
                  className="text-brand-700 font-bold text-xl px-3 py-1">+</button>
        </div>
      ) : (
        <button onClick={() => onAdd(product)}
                className="bg-brand-700 hover:bg-brand-900 text-white font-medium px-4 py-2 rounded-lg text-sm shrink-0">
          Agregar
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/components/store/ProductListItem.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/store/ProductListItem.jsx src/components/store/ProductListItem.test.jsx
git commit -m "feat(p2): ProductListItem (fila lista normal/agregado)"
```

### Task 2.6: `ProductQuantityModal` (hoja inferior) (TDD)

**Files:**
- Create: `src/components/store/ProductQuantityModal.jsx`
- Test: `src/components/store/ProductQuantityModal.test.jsx`

- [ ] **Step 1: Test que falla**

```jsx
// src/components/store/ProductQuantityModal.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductQuantityModal from './ProductQuantityModal'

const product = { id: '1', name: 'Agua 5L', price: 20, stock: 10, image_url: null }

describe('ProductQuantityModal', () => {
  it('renders nothing when product is null', () => {
    const { container } = render(<ProductQuantityModal product={null} onConfirm={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('starts at qty 1 for a new product and updates subtotal', () => {
    render(<ProductQuantityModal product={product} initialQuantity={0} onConfirm={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Más'))
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar al carrito \$40\.00/i })).toBeInTheDocument()
  })
  it('clamps + at stock and − at 1', () => {
    render(<ProductQuantityModal product={{ ...product, stock: 2 }} initialQuantity={0} onConfirm={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Más'))
    fireEvent.click(screen.getByLabelText('Más')) // would be 3, clamps to 2
    expect(screen.getByText('2')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Menos'))
    fireEvent.click(screen.getByLabelText('Menos'))
    fireEvent.click(screen.getByLabelText('Menos')) // clamps at 1
    expect(screen.getByText('1')).toBeInTheDocument()
  })
  it('confirm calls onConfirm(product, qty)', () => {
    const onConfirm = vi.fn()
    render(<ProductQuantityModal product={product} initialQuantity={0} onConfirm={onConfirm} onRemove={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /agregar al carrito/i }))
    expect(onConfirm).toHaveBeenCalledWith(product, 1)
  })
  it('editing mode (initialQuantity>0) shows Actualizar + Quitar', () => {
    const onRemove = vi.fn()
    render(<ProductQuantityModal product={product} initialQuantity={3} onConfirm={vi.fn()} onRemove={onRemove} onClose={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /actualizar/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /quitar del carrito/i }))
    expect(onRemove).toHaveBeenCalledWith('1')
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/components/store/ProductQuantityModal.test.jsx`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```jsx
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
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/components/store/ProductQuantityModal.test.jsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/store/ProductQuantityModal.jsx src/components/store/ProductQuantityModal.test.jsx
git commit -m "feat(p2): ProductQuantityModal (hoja inferior agregar/actualizar/quitar)"
```

### Task 2.7: `ProductCard` → Tarjeta clickeable + `ProductGrid` (actualizar tests)

**Files:**
- Modify: `src/components/store/ProductCard.jsx`
- Modify: `src/components/store/ProductCard.test.jsx` (reescribir para el nuevo contrato)
- Modify: `src/components/store/ProductGrid.jsx`

- [ ] **Step 1: Reescribir `ProductCard.test.jsx`** (el contrato cambia: tarjeta clickeable, sin stepper inline, badge de cantidad)

```jsx
// src/components/store/ProductCard.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductCard from './ProductCard'

const product = { id: '1', name: 'Agua 5L', price: 20, stock: 10, image_url: null }

describe('ProductCard', () => {
  it('displays product name and price', () => {
    render(<ProductCard product={product} onClick={vi.fn()} />)
    expect(screen.getByText('Agua 5L')).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })
  it('calls onClick with product when the card is clicked', () => {
    const onClick = vi.fn()
    render(<ProductCard product={product} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith(product)
  })
  it('shows quantity badge and green class when quantity > 0', () => {
    const { container } = render(<ProductCard product={product} quantity={3} onClick={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('bg-brand-100')
    expect(container.firstChild).toHaveClass('border-brand-700')
  })
  it('does NOT show badge / green when quantity is 0', () => {
    const { container } = render(<ProductCard product={product} quantity={0} onClick={vi.fn()} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(container.firstChild).not.toHaveClass('bg-brand-100')
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/components/store/ProductCard.test.jsx`
Expected: FAIL (el ProductCard viejo no acepta `onClick` ni muestra badge).

- [ ] **Step 3: Reescribir `ProductCard.jsx`**

```jsx
// src/components/store/ProductCard.jsx
export default function ProductCard({ product, quantity = 0, onClick }) {
  const hasItems = quantity > 0
  return (
    <button
      onClick={() => onClick(product)}
      className={`relative text-left border-2 rounded-2xl overflow-hidden transition-colors w-full ${
        hasItems ? 'bg-brand-100 border-brand-700' : 'bg-white border-brand-100'
      }`}
    >
      {hasItems && (
        <span className="absolute top-2 right-2 z-10 bg-brand-700 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">
          {quantity}
        </span>
      )}
      <div className={`h-32 flex items-center justify-center text-5xl ${hasItems ? 'bg-brand-200' : 'bg-brand-100'}`}>
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          : '💧'}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-brand-900 leading-tight">{product.name}</h3>
        <p className="text-brand-700 font-bold mt-1">${product.price.toFixed(2)}</p>
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/components/store/ProductCard.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Actualizar `ProductGrid.jsx`** (nuevo contrato: `getQuantity` + `onCardClick`, leyenda global)

```jsx
// src/components/store/ProductGrid.jsx
import ProductCard from './ProductCard'

export default function ProductGrid({ products, getQuantity, onCardClick }) {
  if (!products.length) {
    return <p className="text-center text-gray-400 py-12">No hay productos disponibles en este momento.</p>
  }
  return (
    <>
      <p className="text-sm text-gray-400 mb-3 text-center">Toca un producto para elegir cantidad</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {products.map(p => (
          <ProductCard key={p.id} product={p} quantity={getQuantity(p.id)} onClick={onCardClick} />
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/store/ProductCard.jsx src/components/store/ProductCard.test.jsx src/components/store/ProductGrid.jsx
git commit -m "feat(p2): Tarjeta clickeable con badge + ProductGrid abre modal"
```

### Task 2.8: Integrar el catálogo en `StorePage`

**Files:**
- Modify: `src/pages/StorePage.jsx`
- Delete: `src/components/shared/WhatsAppLink.jsx` (deja de ser FAB; se elimina aquí su uso y el archivo se borra en la Fase 4 al introducir el tab Ayuda — ver nota)

> Nota: en esta tarea solo se **quita el `<WhatsAppLink />`** de StorePage. El archivo se elimina en la Task 4.1 cuando el tab "Ayuda" lo reemplaza, para no dejar imports rotos entre fases.

- [ ] **Step 1: Reescribir `StorePage.jsx`**

```jsx
// src/pages/StorePage.jsx
import { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useCart } from '../context/CartContext'
import { uniqueCategories, filterProducts } from '../lib/catalog'
import CatalogToolbar from '../components/store/CatalogToolbar'
import ProductGrid from '../components/store/ProductGrid'
import ProductListItem from '../components/store/ProductListItem'
import ProductQuantityModal from '../components/store/ProductQuantityModal'
import Layout from '../components/shared/Layout'

const VIEW_KEY = 'emi_view'

export default function StorePage() {
  const { products, loading, error } = useProducts()
  const { items, addItem, updateQuantity, setItemQuantity, removeItem } = useCart()
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'lista')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(null)
  const [modalProduct, setModalProduct] = useState(null)

  function changeView(v) { setView(v); localStorage.setItem(VIEW_KEY, v) }
  function getQuantity(id) { return items.find(i => i.product_id === id)?.quantity ?? 0 }
  function decrement(id) {
    const it = items.find(i => i.product_id === id)
    if (it) updateQuantity(id, it.quantity - 1)
  }

  const categories = uniqueCategories(products)
  const visible = filterProducts(products, { query, category })

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-brand-900">Nuestros productos</h1>
          <p className="text-gray-500 text-sm mt-1">Agua fresca a domicilio</p>
        </div>

        {loading && <p className="text-center py-12 text-gray-400">Cargando productos...</p>}
        {error   && <p className="text-center py-12 text-red-500">Error al cargar productos.</p>}

        {!loading && !error && (
          <>
            <CatalogToolbar
              query={query} onQueryChange={setQuery}
              categories={categories} activeCategory={category} onCategoryChange={setCategory}
              view={view} onViewChange={changeView}
            />
            <div className="mt-4">
              {visible.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No se encontraron productos.</p>
              ) : view === 'lista' ? (
                <div className="flex flex-col gap-2">
                  {visible.map(p => (
                    <ProductListItem key={p.id} product={p} quantity={getQuantity(p.id)} onAdd={addItem} onRemove={decrement} />
                  ))}
                </div>
              ) : (
                <ProductGrid products={visible} getQuantity={getQuantity} onCardClick={setModalProduct} />
              )}
            </div>
          </>
        )}
      </div>

      <ProductQuantityModal
        product={modalProduct}
        initialQuantity={modalProduct ? getQuantity(modalProduct.id) : 0}
        onConfirm={(p, q) => { setItemQuantity(p, q); setModalProduct(null) }}
        onRemove={(id) => { removeItem(id); setModalProduct(null) }}
        onClose={() => setModalProduct(null)}
      />
    </Layout>
  )
}
```

- [ ] **Step 2: Verificar build + suite completa**

Run: `npm run test:run && npm run build`
Expected: todos los tests PASS; `vite build` OK. (StorePage no tiene test propio; se valida manualmente en la Fase 5.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/StorePage.jsx
git commit -m "feat(p2): StorePage — toggle lista/tarjetas, búsqueda, chips, modal"
```

---

## FASE 3 — Carrito & checkout (fecha de entrega + detección de pedido abierto)

### Task 3.1: `lib/deliveryDates.js` — lógica de fechas pura (TDD)

**Files:**
- Create: `src/lib/deliveryDates.js`
- Test: `src/lib/deliveryDates.test.js`

> Reglas (spec §7): `D` disponible ⇔ (a) `weekday(D) ∈ order_weekdays` y (b) `now() < (D−1 día) @ order_cutoff_time`. Cancelación cliente permitida mientras `now() < deliveryDate @ cancel_cutoff_time`. ISO weekday: 1=Lun..7=Dom.

- [ ] **Step 1: Test que falla**

```js
// src/lib/deliveryDates.test.js
import { describe, it, expect } from 'vitest'
import {
  parseAppSettings, isoWeekday, toISODate,
  isDeliveryDateAvailable, getDeliveryDateOptions, isCancelAllowed,
} from './deliveryDates'

describe('parseAppSettings', () => {
  it('returns defaults when rows are empty', () => {
    expect(parseAppSettings([])).toEqual({ cutoffTime: '20:00', cancelTime: '06:00', weekdays: [1,2,3,4,5,6,7] })
  })
  it('parses rows into config', () => {
    const rows = [
      { key: 'order_cutoff_time', value: '18:30' },
      { key: 'cancel_cutoff_time', value: '07:00' },
      { key: 'order_weekdays', value: '1,2,5' },
    ]
    expect(parseAppSettings(rows)).toEqual({ cutoffTime: '18:30', cancelTime: '07:00', weekdays: [1,2,5] })
  })
})

describe('isoWeekday', () => {
  it('maps Sunday to 7 and Monday to 1', () => {
    expect(isoWeekday(new Date(2026, 5, 14))).toBe(7) // 2026-06-14 is Sunday
    expect(isoWeekday(new Date(2026, 5, 15))).toBe(1) // Monday
  })
})

describe('toISODate', () => {
  it('formats local YYYY-MM-DD (no UTC shift)', () => {
    expect(toISODate(new Date(2026, 5, 3))).toBe('2026-06-03')
  })
})

const cfg = { cutoffTime: '20:00', cancelTime: '06:00', weekdays: [1,2,3,4,5,6,7] }

describe('isDeliveryDateAvailable', () => {
  it('false when weekday not in config', () => {
    const onlyMon = { ...cfg, weekdays: [1] }
    const tue = new Date(2026, 5, 16) // Tuesday
    const now = new Date(2026, 5, 14, 10, 0)
    expect(isDeliveryDateAvailable(tue, now, onlyMon)).toBe(false)
  })
  it('true when before cutoff of previous day', () => {
    const d = new Date(2026, 5, 16)            // deliver Tue Jun 16
    const now = new Date(2026, 5, 15, 19, 0)   // Mon 19:00 < 20:00 cutoff
    expect(isDeliveryDateAvailable(d, now, cfg)).toBe(true)
  })
  it('false when after cutoff of previous day', () => {
    const d = new Date(2026, 5, 16)
    const now = new Date(2026, 5, 15, 20, 1)   // Mon 20:01 >= cutoff
    expect(isDeliveryDateAvailable(d, now, cfg)).toBe(false)
  })
})

describe('getDeliveryDateOptions', () => {
  it('returns next 5 calendar days starting TOMORROW (today is never deliverable)', () => {
    const now = new Date(2026, 5, 15, 10, 0) // Mon 10:00
    const opts = getDeliveryDateOptions(now, cfg)
    expect(opts).toHaveLength(5)
    expect(opts[0].iso).toBe('2026-06-16') // mañana, no hoy
    expect(opts.map(o => o.iso)).toEqual([
      '2026-06-16','2026-06-17','2026-06-18','2026-06-19','2026-06-20',
    ])
    // mañana (Jun 16): corte Jun 15 20:00, now 10:00 -> disponible
    expect(opts[0].available).toBe(true)
  })

  it('drops tomorrow when past the cutoff (after 20:00 today)', () => {
    const now = new Date(2026, 5, 15, 20, 30) // Lun 20:30 -> corte de Jun 16 ya pasó
    const opts = getDeliveryDateOptions(now, cfg)
    expect(opts[0].iso).toBe('2026-06-16')
    expect(opts[0].available).toBe(false)   // corte (Jun 15 20:00) pasó
    expect(opts[1].available).toBe(true)    // Jun 17: corte (Jun 16 20:00) sigue por delante
  })
})

describe('isCancelAllowed', () => {
  it('true before deliveryDate @ cancelTime', () => {
    const now = new Date(2026, 5, 16, 5, 0)    // 05:00 < 06:00
    expect(isCancelAllowed('2026-06-16', now, cfg)).toBe(true)
  })
  it('false at/after cancel cutoff', () => {
    const now = new Date(2026, 5, 16, 6, 1)    // 06:01 >= 06:00
    expect(isCancelAllowed('2026-06-16', now, cfg)).toBe(false)
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/lib/deliveryDates.test.js`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```js
// src/lib/deliveryDates.js
const DEFAULTS = { cutoffTime: '20:00', cancelTime: '06:00', weekdays: [1, 2, 3, 4, 5, 6, 7] }

export function parseAppSettings(rows) {
  const map = Object.fromEntries((rows ?? []).map(r => [r.key, r.value]))
  const weekdays = (map.order_weekdays ?? '1,2,3,4,5,6,7')
    .split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= 7)
  return {
    cutoffTime: map.order_cutoff_time ?? DEFAULTS.cutoffTime,
    cancelTime: map.cancel_cutoff_time ?? DEFAULTS.cancelTime,
    weekdays: weekdays.length ? weekdays : DEFAULTS.weekdays,
  }
}

// ISO weekday: 1=Mon..7=Sun (JS getDay: 0=Sun..6=Sat)
export function isoWeekday(date) {
  const d = date.getDay()
  return d === 0 ? 7 : d
}

// Local YYYY-MM-DD (avoids UTC off-by-one from toISOString)
export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function timeParts(t) { const [h, m] = t.split(':').map(Number); return [h, m] }

// (a) weekday active  AND  (b) now < (D - 1 day) @ cutoffTime
export function isDeliveryDateAvailable(deliveryDate, now, config) {
  if (!config.weekdays.includes(isoWeekday(deliveryDate))) return false
  const cutoff = new Date(deliveryDate)
  cutoff.setDate(cutoff.getDate() - 1)
  const [h, m] = timeParts(config.cutoffTime)
  cutoff.setHours(h, m, 0, 0)
  return now < cutoff
}

// Próximos `count` días de calendario a partir de MAÑANA (hoy nunca es entregable),
// cada uno con su disponibilidad según corte/weekday.
export function getDeliveryDateOptions(now, config, count = 5) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + 1) // empezar desde mañana
  const options = []
  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    options.push({ date: d, iso: toISODate(d), available: isDeliveryDateAvailable(d, now, config) })
  }
  return options
}

// Cancellation allowed while now < deliveryDate @ cancelTime
export function isCancelAllowed(deliveryDateISO, now, config) {
  const [y, mo, da] = deliveryDateISO.split('-').map(Number)
  const cutoff = new Date(y, mo - 1, da)
  const [h, m] = timeParts(config.cancelTime)
  cutoff.setHours(h, m, 0, 0)
  return now < cutoff
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/lib/deliveryDates.test.js`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/deliveryDates.js src/lib/deliveryDates.test.js
git commit -m "feat(p2): lib/deliveryDates — corte+día (creación) y corte de cancelación"
```

### Task 3.2: `useAppSettings` hook

**Files:**
- Create: `src/hooks/useAppSettings.js`

> No es TDD (es un hook de I/O simple, con fallback seguro a defaults). Se verifica vía build + uso en el form.

- [ ] **Step 1: Implementar**

```js
// src/hooks/useAppSettings.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { parseAppSettings } from '../lib/deliveryDates'

let _cache = null // settings cambian rara vez; cache a nivel de módulo

export function useAppSettings() {
  const [config, setConfig] = useState(_cache)
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) return
    supabase.from('app_settings').select('key, value').then(({ data, error }) => {
      const cfg = parseAppSettings(error ? [] : data)
      _cache = cfg
      setConfig(cfg)
      setLoading(false)
    })
  }, [])

  return { config: config ?? parseAppSettings([]), loading }
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAppSettings.js
git commit -m "feat(p2): useAppSettings (lee app_settings con cache + defaults)"
```

### Task 3.3: `DeliveryDatePicker` (controlado) (TDD)

**Files:**
- Create: `src/components/store/DeliveryDatePicker.jsx`
- Test: `src/components/store/DeliveryDatePicker.test.jsx`

- [ ] **Step 1: Test que falla**

```jsx
// src/components/store/DeliveryDatePicker.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DeliveryDatePicker from './DeliveryDatePicker'

const options = [
  { date: new Date(2026, 5, 15), iso: '2026-06-15', available: false },
  { date: new Date(2026, 5, 16), iso: '2026-06-16', available: true },
  { date: new Date(2026, 5, 17), iso: '2026-06-17', available: true },
]

describe('DeliveryDatePicker', () => {
  it('disables unavailable cells', () => {
    render(<DeliveryDatePicker options={options} value="2026-06-16" onChange={vi.fn()} cutoffTime="20:00" />)
    // unavailable day 15
    const cells = screen.getAllByRole('button')
    expect(cells[0]).toBeDisabled()
    expect(cells[1]).not.toBeDisabled()
  })
  it('calls onChange with iso when an available cell is clicked', () => {
    const onChange = vi.fn()
    render(<DeliveryDatePicker options={options} value="2026-06-16" onChange={onChange} cutoffTime="20:00" />)
    fireEvent.click(screen.getByText('17'))
    expect(onChange).toHaveBeenCalledWith('2026-06-17')
  })
  it('does not call onChange for a disabled cell', () => {
    const onChange = vi.fn()
    render(<DeliveryDatePicker options={options} value="2026-06-16" onChange={onChange} cutoffTime="20:00" />)
    fireEvent.click(screen.getByText('15'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/components/store/DeliveryDatePicker.test.jsx`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```jsx
// src/components/store/DeliveryDatePicker.jsx
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function DeliveryDatePicker({ options, value, onChange, cutoffTime = '20:00' }) {
  return (
    <div>
      <p className="text-sm font-medium text-brand-900 mb-2">Fecha de entrega</p>
      <div className="grid grid-cols-5 gap-2">
        {options.map(o => {
          const selected = o.iso === value
          return (
            <button
              type="button"
              key={o.iso}
              disabled={!o.available}
              onClick={() => o.available && onChange(o.iso)}
              className={`flex flex-col items-center rounded-xl py-2 border text-sm ${
                !o.available
                  ? 'opacity-40 cursor-not-allowed border-surface-border bg-gray-50'
                  : selected
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-brand-900 border-brand-200'
              }`}
            >
              <span className="text-xs">{DOW[o.date.getDay()]}</span>
              <span className="font-bold text-base">{o.date.getDate()}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-2">Pide antes de las {cutoffTime} del día anterior.</p>
    </div>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/components/store/DeliveryDatePicker.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/store/DeliveryDatePicker.jsx src/components/store/DeliveryDatePicker.test.jsx
git commit -m "feat(p2): DeliveryDatePicker (matriz de 5 días)"
```

### Task 3.4: `Cart` — etiqueta "Continuar →" (actualizar test)

**Files:**
- Modify: `src/components/store/Cart.jsx`
- Modify: `src/components/store/Cart.test.jsx`

> El carrito ya es editable (stepper + quitar). Solo cambia la etiqueta del botón (decisión #3 / §13.3).

- [ ] **Step 1: Actualizar el test** — en `src/components/store/Cart.test.jsx`, cambiar el matcher del botón:

```js
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/components/store/Cart.test.jsx`
Expected: FAIL (no existe botón "continuar"; sigue diciendo "Hacer pedido").

- [ ] **Step 3: Implementar** — en `src/components/store/Cart.jsx`, cambiar el texto del botón:

```jsx
      <button
        onClick={onCheckout}
        className="w-full bg-brand-700 hover:bg-brand-900 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Continuar →
      </button>
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/components/store/Cart.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/store/Cart.jsx src/components/store/Cart.test.jsx
git commit -m "feat(p2): Cart — botón 'Continuar →'"
```

### Task 3.5: `CheckoutForm` — teléfono 10 díg. + fecha + prefill (actualizar test)

**Files:**
- Modify: `src/components/store/CheckoutForm.jsx`
- Modify: `src/components/store/CheckoutForm.test.jsx`

- [ ] **Step 1: Reescribir `CheckoutForm.test.jsx`** (mockea `useAppSettings`; valida 10 díg.; `onSubmit` incluye `delivery_date`)

```jsx
// src/components/store/CheckoutForm.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CheckoutForm from './CheckoutForm'

vi.mock('../../hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    config: { cutoffTime: '20:00', cancelTime: '06:00', weekdays: [1,2,3,4,5,6,7] },
    loading: false,
  }),
}))

beforeEach(() => localStorage.clear())

describe('CheckoutForm', () => {
  it('rejects phone that is not 10 digits', async () => {
    render(<CheckoutForm onSubmit={vi.fn()} loading={false} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: '5551234' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(await screen.findByText(/10 dígitos/i)).toBeInTheDocument()
  })

  it('calls onSubmit with name, 10-digit phone, notes and a delivery_date', async () => {
    const onSubmit = vi.fn()
    render(<CheckoutForm onSubmit={onSubmit} loading={false} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: '55-1234-5678' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Ana', phone: '5512345678', notes: '',
      delivery_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })))
  })

  it('shows error when name is empty', async () => {
    render(<CheckoutForm onSubmit={vi.fn()} loading={false} />)
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: '5512345678' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(await screen.findByText(/nombre es requerido/i)).toBeInTheDocument()
  })
})
```

> Nota: el test usa el "now" real del sistema. Con `weekdays` todos activos, en la matriz de 5 días siempre hay al menos un día disponible (mañana, si la hora actual < 20:00; o pasado-mañana en caso límite), así que la preselección produce un `delivery_date` válido. El matcher solo exige formato `YYYY-MM-DD`.

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/components/store/CheckoutForm.test.jsx`
Expected: FAIL (el form viejo no valida 10 díg. ni emite `delivery_date`).

- [ ] **Step 3: Reescribir `CheckoutForm.jsx`**

```jsx
// src/components/store/CheckoutForm.jsx
import { useState, useMemo, useEffect } from 'react'
import { useAppSettings } from '../../hooks/useAppSettings'
import { getDeliveryDateOptions } from '../../lib/deliveryDates'
import DeliveryDatePicker from './DeliveryDatePicker'

const PHONE_KEY = 'emi_phone'

export default function CheckoutForm({ onSubmit, loading, raceError }) {
  const { config } = useAppSettings()
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_KEY) || '')
  const [notes, setNotes] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(null)
  const [errors, setErrors] = useState({})

  const options = useMemo(() => getDeliveryDateOptions(new Date(), config), [config])
  useEffect(() => {
    if (!deliveryDate) {
      const first = options.find(o => o.available)
      if (first) setDeliveryDate(first.iso)
    }
  }, [options, deliveryDate])

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'El nombre es requerido'
    const digits = phone.replace(/[\s-]/g, '')
    if (!digits) e.phone = 'El teléfono es requerido'
    else if (!/^\d{10}$/.test(digits)) e.phone = 'El teléfono debe tener 10 dígitos'
    if (!deliveryDate) e.date = 'Selecciona una fecha de entrega'
    return e
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    const digits = phone.replace(/[\s-]/g, '')
    localStorage.setItem(PHONE_KEY, digits)
    onSubmit({ name: name.trim(), phone: digits, notes: notes.trim(), delivery_date: deliveryDate })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {raceError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{raceError}</div>
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
          placeholder="Tu teléfono (10 dígitos)" type="tel" inputMode="numeric"
          className="w-full border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700"
        />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
      </div>

      <div>
        <DeliveryDatePicker options={options} value={deliveryDate} onChange={setDeliveryDate} cutoffTime={config.cutoffTime} />
        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
      </div>

      <textarea
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Dirección o indicaciones (opcional)" rows={3}
        className="w-full border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700 resize-none"
      />
      <button
        type="submit" disabled={loading}
        className="bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {loading ? 'Procesando...' : 'Confirmar pedido'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/components/store/CheckoutForm.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/store/CheckoutForm.jsx src/components/store/CheckoutForm.test.jsx
git commit -m "feat(p2): CheckoutForm — teléfono 10 díg., fecha de entrega y prefill"
```

### Task 3.6: `OpenOrderChoice` (sumar/nuevo) (TDD)

**Files:**
- Create: `src/components/store/OpenOrderChoice.jsx`
- Test: `src/components/store/OpenOrderChoice.test.jsx`

- [ ] **Step 1: Test que falla**

```jsx
// src/components/store/OpenOrderChoice.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OpenOrderChoice from './OpenOrderChoice'

const openOrder = {
  order_id: 'uuid-1', order_number: 'EM-007', total: 60,
  items: [{ name: 'Agua 5L', quantity: 3, unit_price: 20 }],
}

describe('OpenOrderChoice', () => {
  it('shows the existing order number', () => {
    render(<OpenOrderChoice openOrder={openOrder} loading={false} onAddToOpen={vi.fn()} onCreateNew={vi.fn()} />)
    expect(screen.getByText(/EM-007/)).toBeInTheDocument()
  })
  it('calls onAddToOpen and onCreateNew', () => {
    const onAddToOpen = vi.fn(); const onCreateNew = vi.fn()
    render(<OpenOrderChoice openOrder={openOrder} loading={false} onAddToOpen={onAddToOpen} onCreateNew={onCreateNew} />)
    fireEvent.click(screen.getByRole('button', { name: /sumar/i }))
    expect(onAddToOpen).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /nuevo/i }))
    expect(onCreateNew).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/components/store/OpenOrderChoice.test.jsx`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```jsx
// src/components/store/OpenOrderChoice.jsx
export default function OpenOrderChoice({ openOrder, loading, onAddToOpen, onCreateNew }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-brand-100 border border-brand-200 rounded-2xl p-4">
        <p className="text-brand-900 font-semibold">Ya tienes un pedido abierto para esta fecha</p>
        <p className="text-brand-700 font-bold text-lg mt-1">{openOrder.order_number}</p>
        <div className="mt-2 text-sm text-gray-600">
          {openOrder.items.map((it, idx) => (
            <p key={idx}>{it.name} × {it.quantity}</p>
          ))}
          <p className="font-semibold text-brand-900 mt-1">Total actual: ${Number(openOrder.total).toFixed(2)}</p>
        </div>
      </div>
      <button
        onClick={onAddToOpen} disabled={loading}
        className="w-full bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
      >
        ➕ Sumar al pedido {openOrder.order_number}
      </button>
      <button
        onClick={onCreateNew} disabled={loading}
        className="w-full border border-brand-700 text-brand-700 font-semibold py-3 rounded-xl disabled:opacity-50"
      >
        🆕 Crear un pedido nuevo aparte
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/components/store/OpenOrderChoice.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/store/OpenOrderChoice.jsx src/components/store/OpenOrderChoice.test.jsx
git commit -m "feat(p2): OpenOrderChoice (sumar al abierto / crear nuevo)"
```

### Task 3.7: `CheckoutPage` — flujo 2 pasos + detección de pedido abierto (TDD de integración)

**Files:**
- Modify: `src/pages/CheckoutPage.jsx`
- Test: `src/pages/CheckoutPage.test.jsx`

> Acceptance #6: con pedido pendiente del mismo día → aparece sumar/nuevo; sin él → crea normal. Se prueba mockeando `supabase.rpc` (la corrección "mismo día" real es server-side, verificada en Fase 5).

- [ ] **Step 1: Test que falla**

```jsx
// src/pages/CheckoutPage.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CartProvider } from '../context/CartContext'
import CheckoutPage from './CheckoutPage'

vi.mock('../../hooks/useAppSettings', () => ({}), { virtual: true }) // not used here directly

const rpc = vi.fn()
vi.mock('../lib/supabase', () => ({ supabase: { rpc: (...a) => rpc(...a), from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) } }))

// Mock CheckoutForm to submit a fixed payload synchronously (isolate page flow)
vi.mock('../components/store/CheckoutForm', () => ({
  default: ({ onSubmit }) => (
    <button onClick={() => onSubmit({ name: 'Ana', phone: '5512345678', notes: '', delivery_date: '2026-06-16' })}>
      submit-form
    </button>
  ),
}))

function seedCart() {
  // CartProvider reads localStorage 'emi_cart'
  localStorage.setItem('emi_cart', JSON.stringify([
    { product_id: 'p1', name: 'Agua 5L', price: 20, quantity: 2, maxStock: 10 },
  ]))
}

function renderPage() {
  return render(
    <MemoryRouter><CartProvider><CheckoutPage /></CartProvider></MemoryRouter>
  )
}

beforeEach(() => { localStorage.clear(); rpc.mockReset(); seedCart() })

describe('CheckoutPage flow', () => {
  it('creates order directly when no open order for that date', async () => {
    rpc.mockImplementation((fn) => {
      if (fn === 'buscar_pedido_abierto') return Promise.resolve({ data: { found: false }, error: null })
      if (fn === 'crear_pedido') return Promise.resolve({ data: { success: true, order_number: 'EM-010' }, error: null })
      return Promise.resolve({ data: {}, error: null })
    })
    renderPage()
    fireEvent.click(screen.getByText(/continuar/i))   // cart -> form
    fireEvent.click(screen.getByText('submit-form'))  // form submit
    expect(await screen.findByText('EM-010')).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('crear_pedido', expect.objectContaining({ p_delivery_date: '2026-06-16' }))
  })

  it('shows sumar/nuevo choice when an open order exists for that date', async () => {
    rpc.mockImplementation((fn) => {
      if (fn === 'buscar_pedido_abierto') return Promise.resolve({ data: { found: true, order_id: 'u1', order_number: 'EM-007', total: 60, items: [] }, error: null })
      return Promise.resolve({ data: {}, error: null })
    })
    renderPage()
    fireEvent.click(screen.getByText(/continuar/i))
    fireEvent.click(screen.getByText('submit-form'))
    expect(await screen.findByRole('button', { name: /sumar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nuevo/i })).toBeInTheDocument()
  })

  it('adds to open order when choosing Sumar', async () => {
    rpc.mockImplementation((fn) => {
      if (fn === 'buscar_pedido_abierto') return Promise.resolve({ data: { found: true, order_id: 'u1', order_number: 'EM-007', total: 60, items: [] }, error: null })
      if (fn === 'agregar_a_pedido') return Promise.resolve({ data: { success: true, total: 100 }, error: null })
      return Promise.resolve({ data: {}, error: null })
    })
    renderPage()
    fireEvent.click(screen.getByText(/continuar/i))
    fireEvent.click(screen.getByText('submit-form'))
    fireEvent.click(await screen.findByRole('button', { name: /sumar/i }))
    expect(await screen.findByText('EM-007')).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('agregar_a_pedido', expect.objectContaining({ p_order_id: 'u1' }))
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/pages/CheckoutPage.test.jsx`
Expected: FAIL (la página actual no maneja `buscar_pedido_abierto` ni el paso `choice`).

- [ ] **Step 3: Reescribir `CheckoutPage.jsx`**

```jsx
// src/pages/CheckoutPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import CheckoutForm from '../components/store/CheckoutForm'
import OrderConfirmation from '../components/store/OrderConfirmation'
import OpenOrderChoice from '../components/store/OpenOrderChoice'
import Cart from '../components/store/Cart'
import Layout from '../components/shared/Layout'

export default function CheckoutPage() {
  const { items, total, removeItem, updateQuantity, clearCart } = useCart()
  const [step, setStep] = useState('cart')          // cart | form | choice | done
  const [loading, setLoading] = useState(false)
  const [raceError, setRaceError] = useState(null)
  const [orderNumber, setOrderNumber] = useState('')
  const [openOrder, setOpenOrder] = useState(null)
  const navigate = useNavigate()

  const payload = () => items.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
  const finish = (num) => { clearCart(); setOrderNumber(num); setStep('done') }

  async function createOrder(data) {
    setLoading(true); setRaceError(null)
    const { data: res, error } = await supabase.rpc('crear_pedido', {
      p_customer_name: data.name, p_customer_phone: data.phone, p_notes: data.notes,
      p_delivery_date: data.delivery_date, p_items: payload(),
    })
    setLoading(false)
    if (error) { setRaceError('Ocurrió un error. Inténtalo de nuevo.'); return }
    if (res?.error === 'out_of_stock') {
      setRaceError(`Alguien más tomó el último ${res.product_name}. Por favor, elige otra opción para continuar.`); return
    }
    if (res?.error) { setRaceError('No se pudo crear el pedido. Revisa tus datos e inténtalo de nuevo.'); return }
    finish(res.order_number)
  }

  async function handleFormSubmit(data) {
    setLoading(true); setRaceError(null)
    const { data: open, error } = await supabase.rpc('buscar_pedido_abierto', {
      p_phone: data.phone, p_delivery_date: data.delivery_date,
    })
    setLoading(false)
    if (!error && open?.found && open.order_id) {
      setOpenOrder({ ...open, _form: data })
      setStep('choice')
      return
    }
    createOrder(data)
  }

  async function addToOpen() {
    setLoading(true); setRaceError(null)
    const { data: res, error } = await supabase.rpc('agregar_a_pedido', {
      p_order_id: openOrder.order_id, p_items: payload(),
    })
    setLoading(false)
    if (error || res?.error) { setRaceError('No se pudo sumar al pedido. Inténtalo de nuevo.'); return }
    finish(openOrder.order_number)
  }

  if (step === 'done') {
    return (
      <Layout>
        <div className="max-w-md mx-auto px-4 py-8">
          <OrderConfirmation orderNumber={orderNumber} onTrack={() => navigate(`/pedido/${orderNumber}`)} />
        </div>
      </Layout>
    )
  }

  const title = step === 'cart' ? '🛒 Tu carrito' : step === 'form' ? '📋 Tus datos' : '📦 Pedido abierto'

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-brand-900">{title}</h1>

        {step === 'cart' && (
          <>
            <Cart items={items} total={total} onRemove={removeItem} onUpdateQty={updateQuantity} onCheckout={() => setStep('form')} />
            <button onClick={() => navigate('/')} className="text-brand-700 underline text-sm text-center">← Seguir comprando</button>
          </>
        )}

        {step === 'form' && (
          <>
            <CheckoutForm onSubmit={handleFormSubmit} loading={loading} raceError={raceError} />
            <button onClick={() => setStep('cart')} className="text-brand-700 underline text-sm text-center">← Volver al carrito</button>
          </>
        )}

        {step === 'choice' && openOrder && (
          <>
            {raceError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{raceError}</div>}
            <OpenOrderChoice
              openOrder={openOrder} loading={loading}
              onAddToOpen={addToOpen}
              onCreateNew={() => createOrder(openOrder._form)}
            />
            <button onClick={() => setStep('form')} className="text-brand-700 underline text-sm text-center">← Volver a datos</button>
          </>
        )}
      </div>
    </Layout>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/pages/CheckoutPage.test.jsx`
Expected: PASS (3 tests).

> Si el mock virtual de `useAppSettings` da problemas, elimínalo: `CheckoutForm` está mockeado por completo en este test, así que `useAppSettings` no se carga. Deja solo el mock de `../lib/supabase` y de `../components/store/CheckoutForm`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CheckoutPage.jsx src/pages/CheckoutPage.test.jsx
git commit -m "feat(p2): CheckoutPage — 2 pasos + detección de pedido abierto (sumar/nuevo)"
```

---

## FASE 4 — Navegación & "Mi pedido"

### Task 4.1: `lib/whatsapp.js` — links/mensajes (TDD) + eliminar `WhatsAppLink.jsx`

**Files:**
- Create: `src/lib/whatsapp.js`
- Test: `src/lib/whatsapp.test.js`
- Delete: `src/components/shared/WhatsAppLink.jsx`

- [ ] **Step 1: Test que falla**

```js
// src/lib/whatsapp.test.js
import { describe, it, expect } from 'vitest'
import { buildWhatsAppLink, genericHelpMessage, orderHelpMessage } from './whatsapp'

describe('whatsapp', () => {
  it('builds a wa.me link with url-encoded message', () => {
    expect(buildWhatsAppLink('Hola Emi', '5215555555555'))
      .toBe('https://wa.me/5215555555555?text=Hola%20Emi')
  })
  it('generic help message', () => {
    expect(genericHelpMessage()).toBe('Hola Emi, tengo una pregunta.')
  })
  it('order help message includes the order id', () => {
    expect(orderHelpMessage('EM-007')).toBe('Hola Emi, necesito ayuda con mi pedido EM-007.')
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/lib/whatsapp.test.js`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```js
// src/lib/whatsapp.js
export function buildWhatsAppLink(message, number) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export function genericHelpMessage() {
  return 'Hola Emi, tengo una pregunta.'
}

export function orderHelpMessage(orderNumber) {
  return `Hola Emi, necesito ayuda con mi pedido ${orderNumber}.`
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/lib/whatsapp.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Eliminar el FAB viejo**

```bash
git rm src/components/shared/WhatsAppLink.jsx
```

(En la Task 2.8 ya se quitó su uso de `StorePage`; ningún otro archivo lo importa — verificar con `grep`.)

Run: `grep -rn "WhatsAppLink" src/`
Expected: sin resultados.

- [ ] **Step 6: Commit**

```bash
git add src/lib/whatsapp.js src/lib/whatsapp.test.js
git commit -m "feat(p2): lib/whatsapp + eliminar FAB WhatsAppLink"
```

### Task 4.2: `Layout` — nav de 4 tabs + admin discreto + Ayuda

**Files:**
- Modify: `src/components/shared/Layout.jsx`
- Test: `src/components/shared/Layout.test.jsx`

> Cliente: header con `💧 Aguas de Emi` (izq.) + `👩‍💼` discreto (der., → `/admin/login`). Barra inferior: 🏪 Tienda · 🛒 Carrito(badge) · 📦 Mi pedido · 💬 Ayuda. "Ayuda" es un `<a>` directo a WhatsApp (no router Link). El modo `showAdmin` (Pedidos/Productos/Salir) no cambia.

- [ ] **Step 1: Test que falla**

```jsx
// src/components/shared/Layout.test.jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CartProvider } from '../../context/CartContext'
import Layout from './Layout'

function renderLayout() {
  return render(
    <MemoryRouter><CartProvider><Layout><div>contenido</div></Layout></CartProvider></MemoryRouter>
  )
}

describe('Layout (cliente)', () => {
  it('renders the 4 client tabs', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /tienda/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /carrito/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /mi pedido/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ayuda/i })).toBeInTheDocument()
  })
  it('Mi pedido links to /mis-pedidos', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /mi pedido/i })).toHaveAttribute('href', '/mis-pedidos')
  })
  it('Ayuda links to wa.me', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /ayuda/i }).getAttribute('href')).toMatch(/wa\.me/)
  })
  it('exposes a discreet admin access in the header', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /admin/i })).toHaveAttribute('href', '/admin/login')
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/components/shared/Layout.test.jsx`
Expected: FAIL (no existe tab "Mi pedido"/"Ayuda"; Admin sigue en la barra inferior).

- [ ] **Step 3: Reescribir `Layout.jsx`**

```jsx
// src/components/shared/Layout.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../hooks/useAuth'
import { buildWhatsAppLink, genericHelpMessage } from '../../lib/whatsapp'

export default function Layout({ children, showAdmin = false }) {
  const { items } = useCart()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const count = items.reduce((s, i) => s + i.quantity, 0)
  const helpHref = buildWhatsAppLink(genericHelpMessage(), import.meta.env.VITE_WHATSAPP_NUMBER)

  async function handleSignOut() { await signOut(); navigate('/') }

  function navClass(path) {
    const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
    return `flex flex-col items-center gap-0.5 transition-colors ${isActive ? 'text-white' : 'text-brand-200'}`
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-brand-700 text-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg text-brand-100">💧 Aguas de Emi</Link>
          {!showAdmin && (
            <Link to="/admin/login" aria-label="Admin" className="text-brand-200/70 hover:text-white text-lg">👩‍💼</Link>
          )}
        </div>
      </header>

      <main className="pb-20">{children}</main>

      <nav className="bg-brand-700 fixed bottom-0 inset-x-0 z-50 h-16 flex items-center">
        <div className="max-w-lg mx-auto w-full flex justify-around px-4">
          {!showAdmin ? (
            <>
              <Link to="/" className={navClass('/')}>
                <span className="text-2xl">🏪</span>
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

              <Link to="/mis-pedidos" className={navClass('/mis-pedidos')}>
                <span className="text-2xl">📦</span>
                <span className="text-xs font-semibold">Mi pedido</span>
              </Link>

              <a href={helpHref} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-0.5 text-brand-200 hover:text-white transition-colors">
                <span className="text-2xl">💬</span>
                <span className="text-xs font-semibold">Ayuda</span>
              </a>
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

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/components/shared/Layout.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/Layout.jsx src/components/shared/Layout.test.jsx
git commit -m "feat(p2): Layout — nav 4 tabs (Tienda/Carrito/Mi pedido/Ayuda) + admin discreto"
```

### Task 4.3: `ActiveOrdersList` (TDD)

**Files:**
- Create: `src/components/store/ActiveOrdersList.jsx`
- Test: `src/components/store/ActiveOrdersList.test.jsx`

- [ ] **Step 1: Test que falla**

```jsx
// src/components/store/ActiveOrdersList.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ActiveOrdersList from './ActiveOrdersList'

const orders = [
  { order_number: 'EM-007', delivery_date: '2026-06-16', status: 'pending', total: 60, items: [] },
  { order_number: 'EM-009', delivery_date: '2026-06-18', status: 'pending', total: 90, items: [] },
]

describe('ActiveOrdersList', () => {
  it('renders a card per order', () => {
    render(<ActiveOrdersList orders={orders} onSelect={vi.fn()} />)
    expect(screen.getByText('EM-007')).toBeInTheDocument()
    expect(screen.getByText('EM-009')).toBeInTheDocument()
  })
  it('calls onSelect with the order when a card is clicked', () => {
    const onSelect = vi.fn()
    render(<ActiveOrdersList orders={orders} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('EM-007'))
    expect(onSelect).toHaveBeenCalledWith(orders[0])
  })
  it('shows empty state when there are no orders', () => {
    render(<ActiveOrdersList orders={[]} onSelect={vi.fn()} />)
    expect(screen.getByText(/no tienes pedidos activos/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/components/store/ActiveOrdersList.test.jsx`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```jsx
// src/components/store/ActiveOrdersList.jsx
function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function ActiveOrdersList({ orders, onSelect }) {
  if (!orders.length) {
    return <p className="text-center text-gray-400 py-12">No tienes pedidos activos.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {orders.map(o => (
        <button
          key={o.order_number}
          onClick={() => onSelect(o)}
          className="text-left bg-white border border-brand-100 rounded-2xl p-4 flex items-center justify-between hover:border-brand-700 transition-colors"
        >
          <div>
            <p className="font-bold text-brand-700">{o.order_number}</p>
            <p className="text-sm text-gray-500">Entrega: {formatDate(o.delivery_date)}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">Pendiente</span>
          </div>
          <div className="text-right">
            <p className="font-bold text-brand-900">${Number(o.total).toFixed(2)}</p>
            <span className="text-brand-700">›</span>
          </div>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/components/store/ActiveOrdersList.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/store/ActiveOrdersList.jsx src/components/store/ActiveOrdersList.test.jsx
git commit -m "feat(p2): ActiveOrdersList (lista de pedidos activos)"
```

### Task 4.4: `CustomerOrderDetail` (TDD)

**Files:**
- Create: `src/components/store/CustomerOrderDetail.jsx`
- Test: `src/components/store/CustomerOrderDetail.test.jsx`

> ID arriba + estatus debajo (centrados), fecha, ítems, total, "💬 Pedir ayuda con este pedido" (link WhatsApp con ID) y "Cancelar pedido" (deshabilitado si pasó el corte; el cálculo `isCancelAllowed` lo hace el padre y se pasa como `canCancel`).

- [ ] **Step 1: Test que falla**

```jsx
// src/components/store/CustomerOrderDetail.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CustomerOrderDetail from './CustomerOrderDetail'

const order = {
  order_number: 'EM-007', delivery_date: '2026-06-16', status: 'pending', total: 60,
  items: [{ name: 'Agua 5L', quantity: 3, unit_price: 20 }],
}

describe('CustomerOrderDetail', () => {
  it('shows order number and status', () => {
    render(<CustomerOrderDetail order={order} canCancel={true} onCancel={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('EM-007')).toBeInTheDocument()
    expect(screen.getByText(/pendiente/i)).toBeInTheDocument()
  })
  it('help link points to wa.me and contains the order id', () => {
    render(<CustomerOrderDetail order={order} canCancel={true} onCancel={vi.fn()} onBack={vi.fn()} />)
    const help = screen.getByRole('link', { name: /pedir ayuda/i })
    expect(help.getAttribute('href')).toMatch(/wa\.me/)
    expect(decodeURIComponent(help.getAttribute('href'))).toContain('EM-007')
  })
  it('cancel button enabled calls onCancel', () => {
    const onCancel = vi.fn()
    render(<CustomerOrderDetail order={order} canCancel={true} onCancel={onCancel} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /cancelar pedido/i }))
    expect(onCancel).toHaveBeenCalled()
  })
  it('cancel button disabled when canCancel is false', () => {
    render(<CustomerOrderDetail order={order} canCancel={false} onCancel={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: /cancelar pedido/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/components/store/CustomerOrderDetail.test.jsx`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```jsx
// src/components/store/CustomerOrderDetail.jsx
import { buildWhatsAppLink, orderHelpMessage } from '../../lib/whatsapp'

const STATUS = {
  pending:   { label: 'Pendiente', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  delivered: { label: 'Entregado', color: 'text-green-700 bg-green-50 border-green-200' },
  cancelled: { label: 'Cancelado', color: 'text-red-600 bg-red-50 border-red-200' },
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function CustomerOrderDetail({ order, canCancel, onCancel, onBack }) {
  const s = STATUS[order.status] ?? STATUS.pending
  const helpHref = buildWhatsAppLink(orderHelpMessage(order.order_number), import.meta.env.VITE_WHATSAPP_NUMBER)

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="text-brand-700 underline text-sm self-start">← Mis pedidos</button>

      <div className="text-center">
        <p className="text-3xl font-bold text-brand-700">{order.order_number}</p>
        <span className={`inline-block mt-2 text-sm px-3 py-1 rounded-full border ${s.color}`}>{s.label}</span>
      </div>

      <div className="bg-white border border-brand-100 rounded-2xl p-4 text-sm">
        <p><span className="text-gray-400">Entrega:</span> {formatDate(order.delivery_date)}</p>
      </div>

      <div className="bg-white border border-brand-100 rounded-2xl p-4">
        <p className="font-semibold text-brand-900 mb-2">Productos</p>
        {order.items.map((it, idx) => (
          <div key={idx} className="flex justify-between text-sm py-1 border-b border-surface-border last:border-0">
            <span>{it.name} × {it.quantity}</span>
            <span className="text-brand-700">${(it.unit_price * it.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2 mt-1 font-semibold text-brand-900">
          <span>Total</span><span className="text-brand-700">${Number(order.total).toFixed(2)}</span>
        </div>
      </div>

      <a href={helpHref} target="_blank" rel="noopener noreferrer"
         className="w-full text-center bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl">
        💬 Pedir ayuda con este pedido
      </a>

      <button
        onClick={onCancel} disabled={!canCancel}
        className="w-full border border-red-300 text-red-600 font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Cancelar pedido
      </button>
      {!canCancel && <p className="text-xs text-gray-400 text-center -mt-2">Ya no se puede cancelar (pasó el horario de corte).</p>}
    </div>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/components/store/CustomerOrderDetail.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/store/CustomerOrderDetail.jsx src/components/store/CustomerOrderDetail.test.jsx
git commit -m "feat(p2): CustomerOrderDetail (ayuda con ID + cancelar con corte)"
```

### Task 4.5: `MyOrdersPage` (lookup → lista → detalle)

**Files:**
- Create: `src/pages/MyOrdersPage.jsx`
- Test: `src/pages/MyOrdersPage.test.jsx`

> Prefill del teléfono desde `localStorage('emi_phone')`. Lookup → `listar_pedidos_activos`. Detalle → `canCancel = isCancelAllowed(...)` con `config` de `useAppSettings`; cancelar → `cancelar_pedido_cliente` y refresca la lista.

- [ ] **Step 1: Test que falla**

```jsx
// src/pages/MyOrdersPage.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CartProvider } from '../context/CartContext'
import MyOrdersPage from './MyOrdersPage'

const rpc = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...a) => rpc(...a),
    from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
  },
}))

function renderPage() {
  return render(<MemoryRouter><CartProvider><MyOrdersPage /></CartProvider></MemoryRouter>)
}

beforeEach(() => { localStorage.clear(); rpc.mockReset() })

describe('MyOrdersPage', () => {
  it('looks up active orders by phone', async () => {
    rpc.mockResolvedValue({ data: { orders: [
      { order_number: 'EM-007', delivery_date: '2026-06-16', status: 'pending', total: 60, items: [] },
    ] }, error: null })
    renderPage()
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: '5512345678' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(await screen.findByText('EM-007')).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('listar_pedidos_activos', { p_phone: '5512345678' })
  })

  it('shows empty state when no active orders', async () => {
    rpc.mockResolvedValue({ data: { orders: [] }, error: null })
    renderPage()
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: '5512345678' } })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(await screen.findByText(/no tienes pedidos activos/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:run -- src/pages/MyOrdersPage.test.jsx`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

```jsx
// src/pages/MyOrdersPage.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAppSettings } from '../hooks/useAppSettings'
import { isCancelAllowed } from '../lib/deliveryDates'
import Layout from '../components/shared/Layout'
import ActiveOrdersList from '../components/store/ActiveOrdersList'
import CustomerOrderDetail from '../components/store/CustomerOrderDetail'

const PHONE_KEY = 'emi_phone'

export default function MyOrdersPage() {
  const { config } = useAppSettings()
  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_KEY) || '')
  const [orders, setOrders] = useState(null)   // null = aún no se buscó
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function lookup() {
    const digits = phone.replace(/[\s-]/g, '')
    if (!/^\d{10}$/.test(digits)) { setError('Ingresa un teléfono de 10 dígitos'); return }
    localStorage.setItem(PHONE_KEY, digits)
    setLoading(true); setError(null); setSelected(null)
    const { data, error } = await supabase.rpc('listar_pedidos_activos', { p_phone: digits })
    setLoading(false)
    if (error || data?.error) { setError('No se pudo consultar. Inténtalo de nuevo.'); setOrders([]); return }
    setOrders(data.orders ?? [])
  }

  async function cancelSelected() {
    const digits = phone.replace(/[\s-]/g, '')
    setLoading(true); setError(null)
    const { data, error } = await supabase.rpc('cancelar_pedido_cliente', {
      p_order_number: selected.order_number, p_phone: digits,
    })
    setLoading(false)
    if (error || data?.error) { setError('No se pudo cancelar el pedido.'); return }
    setSelected(null)
    lookup()
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
        {!selected && (
          <>
            <h1 className="text-2xl font-bold text-brand-900">Mi pedido</h1>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="Tu teléfono (10 dígitos)" type="tel" inputMode="numeric"
                  className="flex-1 border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700"
                />
                <button onClick={lookup} disabled={loading}
                        className="bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold px-5 rounded-xl">
                  Buscar
                </button>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>

            {loading && <p className="text-center py-8 text-gray-400">Buscando...</p>}
            {!loading && orders !== null && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Tus pedidos activos</p>
                <ActiveOrdersList orders={orders} onSelect={setSelected} />
              </div>
            )}
          </>
        )}

        {selected && (
          <CustomerOrderDetail
            order={selected}
            canCancel={selected.status === 'pending' && isCancelAllowed(selected.delivery_date, new Date(), config)}
            onCancel={cancelSelected}
            onBack={() => setSelected(null)}
          />
        )}
      </div>
    </Layout>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:run -- src/pages/MyOrdersPage.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/MyOrdersPage.jsx src/pages/MyOrdersPage.test.jsx
git commit -m "feat(p2): MyOrdersPage (lookup por teléfono → lista → detalle)"
```

### Task 4.6: Ruta `/mis-pedidos` en `App`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Añadir import + ruta**

En `src/App.jsx`, añadir el import:
```jsx
import MyOrdersPage     from './pages/MyOrdersPage'
```

Y la ruta (después de `/checkout`):
```jsx
          <Route path="/mis-pedidos"     element={<MyOrdersPage />} />
```

- [ ] **Step 2: Verificar build + suite completa**

Run: `npm run test:run && npm run build`
Expected: todo PASS; build OK.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat(p2): ruta /mis-pedidos"
```

---

## FASE 5 — Pulido & verificación

### Task 5.1: Suite completa + build

**Files:** ninguno.

- [ ] **Step 1: Correr toda la suite**

Run: `npm run test:run`
Expected: PASS — incluye los nuevos: `lib/catalog`, `lib/deliveryDates`, `lib/whatsapp`, `ViewToggle`, `CatalogToolbar`, `ProductListItem`, `ProductQuantityModal`, `ProductCard` (reescrito), `DeliveryDatePicker`, `Cart` (continuar), `CheckoutForm` (reescrito), `OpenOrderChoice`, `CheckoutPage`, `Layout`, `ActiveOrdersList`, `CustomerOrderDetail`, `MyOrdersPage`, `CartContext` (setItemQuantity). Los de P1 siguen verdes.

- [ ] **Step 2: Lint + build de producción**

Run: `npm run lint && npm run build`
Expected: sin errores de lint; `vite build` OK.

- [ ] **Step 3: (si algo falla) depurar** con `superpowers:systematic-debugging` antes de continuar. No marcar la fase como hecha con tests en rojo.

### Task 5.2: Verificación manual en `npm run dev` (camino crítico)

**Files:** ninguno. Requiere la migración 009 ya aplicada (Task 1.2).

- [ ] **Step 1: Levantar la app** — `npm run dev` y abrir en móvil-emulado (DevTools responsive).

- [ ] **Step 2: Checklist de aceptación** (spec §10) — verificar uno por uno:
  1. [ ] Toggle Lista/Tarjetas cambia la vista y **persiste** tras recargar (`localStorage emi_view`).
  2. [ ] Buscar por nombre filtra; chips filtran por categoría; productos en **orden alfabético**.
  3. [ ] Tocar una Tarjeta abre el modal; "Agregar" refleja la cantidad; producto agregado se ve **verde** (badge en Tarjetas, stepper en Lista) y el **badge del carrito** se actualiza al instante (no regresión de bug #3).
  4. [ ] "Mi carrito" permite cambiar cantidad y eliminar; **"Continuar →"** lleva a datos+fecha.
  5. [ ] La **matriz** solo permite fechas válidas (día activo + antes del corte); preselecciona la primera disponible. Forzar una fecha inválida (editar el estado) → el servidor responde `past_cutoff`/`date_not_allowed`.
  6. [ ] Con un **pedido pendiente del mismo día** (mismo teléfono+fecha) aparece sumar/nuevo; con **fecha distinta**, crea normal sin preguntar.
  7. [ ] "Sumar" agrega ítems al pedido, ajusta **stock** y **total** (atómico) y deja `total_personalizado = FALSE` (verificar en BD).
  8. [ ] "Mi pedido": lista **todos** los activos por teléfono; el detalle permite **ayuda con ID** (abre WhatsApp con el `EM-XXX`) y **cancelar** solo antes del corte (probar `cancelar_pedido_cliente` con corte pasado → deshabilitado/`past_cutoff`).
  9. [ ] Nav de **4 tabs**; **Admin** discreto en header; **WhatsApp/Ayuda** sin FAB ni traslape con la barra.

- [ ] **Step 3: Verificación de privacidad** (riesgo §11): confirmar que las respuestas de `buscar_pedido_abierto`, `listar_pedidos_activos` y `consultar_pedido` **no** incluyen `customer_name`, `notes` ni `customer_phone` (revisar payloads en la pestaña Network).

### Task 5.3: Actualizar manual, memoria y punteros de retoma

**Files:**
- Modify: `docs/MANUAL-aguas-emi.md`
- Modify: `CLAUDE.md`
- Modify: memoria del proyecto (`project-aguas-emi.md` + `MEMORY.md`)

- [ ] **Step 1:** En `docs/MANUAL-aguas-emi.md` marcar **P2 ✅ HECHO** en §2 (encabezado de estado) y §6 (roadmap), anotando: migración `009` aplicada, RPCs nuevas, archivos creados. Añadir P2 a la tabla "qué releer por fase" si aplica.

- [ ] **Step 2:** En `CLAUDE.md`, actualizar la sección **"🔄 PRÓXIMA SESIÓN"** para apuntar a **P3 (Admin: gestión de pedidos)** y sus archivos (`AdminOrdersPage.jsx`, `OrderCard.jsx`, `OrderList.jsx`, `useOrders.js` + RPCs de edición), ya que la próxima sesión leerá archivos distintos.

- [ ] **Step 3:** Actualizar la memoria del proyecto: P2 ✅ implementado y verificado en prod; P3 siguiente.

- [ ] **Step 4: Commit**

```bash
git add docs/MANUAL-aguas-emi.md CLAUDE.md
git commit -m "docs(p2): marcar P2 hecho + puntero de retoma a P3"
```

### Task 5.4: Despliegue y verificación en producción

**Files:** ninguno.

- [ ] **Step 1:** Confirmar que la migración `009` ya está en la BD de prod (Task 1.2 la aplicó sobre el proyecto Supabase real `hqcdeiefvypaeigehvwu`).

- [ ] **Step 2:** `git push` a `main` → Vercel despliega automáticamente. Verificar el deploy en `emilse-aguas.vercel.app`.

- [ ] **Step 3:** Smoke test en prod: crear un pedido real de prueba con fecha de entrega, verlo en "Mi pedido", y cancelarlo (antes del corte). Confirmar que el stock se restaura.

---

## Self-Review (hecho por el autor del plan)

**1. Cobertura del spec (§§ del spec → tarea):**
- §3/§5 `delivery_date` + índice + `app_settings` + seed + RLS → **Task 1.1**.
- §6 `crear_pedido` (fecha+validaciones), `buscar_pedido_abierto`, `agregar_a_pedido`, `listar_pedidos_activos`, `cancelar_pedido_cliente` + GRANTs → **Task 1.1** (aplicación/verificación **1.2**).
- §7 lógica de fechas (corte+día, cancelación) → **Task 3.1** (`lib/deliveryDates`), validada también server-side en `crear_pedido`/`cancelar_pedido_cliente`.
- §8 componentes nuevos: ProductListItem (2.5), ProductQuantityModal (2.6), ViewToggle (2.3), CatalogToolbar (2.4), DeliveryDatePicker (3.3), MyOrdersPage (4.5), ActiveOrdersList (4.3), CustomerOrderDetail (4.4), useAppSettings (3.2), lib/deliveryDates (3.1), lib/whatsapp (4.1). **+** lib/catalog (2.1) y OpenOrderChoice (3.6) que el spec implica.
- §8 modificados: StorePage (2.8), ProductGrid/ProductCard (2.7), CheckoutPage (3.7), CheckoutForm (3.5), Cart (3.4), Layout (4.2), WhatsAppLink→helper (4.1), useProducts (ya hace `select('*')` → expone `category` sin cambio; verificado en 5.1), App.jsx (4.6).
- §3 vista principal Lista + preferencia `localStorage`, búsqueda, chips, orden, estado verde → Fase 2.
- §10 criterios de aceptación → **Task 5.2** checklist.
- §13.2 "Disponibles: N" en el modal → presente en `ProductQuantityModal`.
- **OUT (correcto que no esté):** UI de edición de `app_settings` (P3), panel admin, BI (P4). Coincide con spec §2 OUT.

**2. Placeholders:** revisado — cada paso de código trae el código completo; no hay "TODO"/"añadir validación" sin contenido. Las RPC traen SQL completo.

**3. Consistencia de tipos/firmas:**
- `buscar_pedido_abierto` devuelve `{ found, order_id, order_number, total, delivery_date, items }`; CheckoutPage usa `open.found` + `open.order_id`. ✔
- `agregar_a_pedido(p_order_id, p_items)`; CheckoutPage llama con `{ p_order_id: openOrder.order_id, p_items }`. ✔
- `crear_pedido(p_customer_name,p_customer_phone,p_notes,p_delivery_date,p_items)`; CheckoutPage pasa esas 5 claves. ✔
- `listar_pedidos_activos(p_phone)` → `{ orders: [...] }`; MyOrdersPage lee `data.orders`. ✔
- `cancelar_pedido_cliente(p_order_number,p_phone)`; MyOrdersPage pasa ambas. ✔
- `setItemQuantity(product, quantity)` (CartContext) usado por StorePage modal. ✔
- `getDeliveryDateOptions/isCancelAllowed/parseAppSettings` consumidos por CheckoutForm/MyOrdersPage/useAppSettings con las firmas definidas en 3.1. ✔
- `ProductCard` nuevo contrato (`onClick`, `quantity`) — ProductGrid y su test actualizados juntos (2.7). ✔

**Riesgo de ejecución conocido:** los tests de `CheckoutForm` y `CheckoutPage` dependen del reloj real solo para el formato de fecha (no del valor exacto), así que son estables. Si CI corriera exactamente a medianoche en un caso límite de corte, el matcher de formato `YYYY-MM-DD` sigue pasando.

---

## Execution Handoff

Ver la sección de opciones de ejecución al final de la conversación. **Recordatorio del proyecto (CLAUDE.md): puerta de validación obligatoria** — pedir aprobación explícita por cambio antes de escribir/aplicar nada (código y migración). La Fase 1 (migración 009) es bloqueante: aplicarla y verificarla antes de tocar el frontend que la consume.
