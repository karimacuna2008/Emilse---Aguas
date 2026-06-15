# Spec — P3: Admin · Gestión de pedidos

**Fecha:** 2026-06-14
**Fase:** P3 (roadmap `docs/MANUAL-aguas-emi.md` §6)
**Estado:** Diseño aprobado (brainstorming con visual companion). Pendiente: plan de implementación → código.
**Depende de:** P1 (`delivered_at`, `total_personalizado`, índices) y P2 (`delivery_date`, `app_settings`, `agregar_a_pedido`, `cancelar_pedido`).

---

## 1. Alcance

P3 cubre **dos cosas** (decisión de alcance tomada en esta sesión):

1. **Gestión de pedidos (admin):** lista por fecha de entrega + resumen "por entregar" + panel de edición (agregar/quitar artículos, marcar entregado, cancelar, total personalizado).
2. **Configuración (admin):** editor de `app_settings` — días de entrega + horas de corte (la UI que P2 dejó pendiente).

**Fuera de alcance:** BI/dashboard de ventas (P4). Categorías en tienda (P4/posterior). "Des-entregar" un pedido (entregar es definitivo).

---

## 2. Decisiones tomadas

Recap de §7 del manual + nuevas decisiones de esta sesión:

- **Total personalizado = override del total** del pedido. Al **editar artículos** (agregar/quitar) **siempre se recalcula** el total real y se **sobreescribe** el override (`total_personalizado=FALSE`). *(Ya implementado en `agregar_a_pedido`; `quitar_de_pedido` debe hacerlo igual.)*
- **"Venta" = solo `delivered`.** `marcar_entregado` puebla `delivered_at` (insumo de P4).
- **Resumen "por entregar" = por fecha de entrega**, no global. Por defecto muestra **hoy**; si hoy no tiene pendientes (todo entregado o ninguno), salta al **siguiente día con pendientes**. Emi navega ‹ › solo entre fechas que tienen pedidos. Siempre se ve **día + fecha**. Es "qué entregar", no inventario.
- **Agregación del resumen en el cliente** (sin RPC nueva): el admin ya descarga todos los pedidos con ítems vía RLS `admin read`; el agregado por fecha/producto se calcula en `lib/pendingSummary.js`. (YAGNI sobre la RPC `resumen_pendientes` sugerida en el manual.)
- **Quitar el último artículo:** si la operación dejaría el pedido sin artículos (total 0), la UI **no** lo deja vacío: ofrece **cancelar el pedido** (vía `cancelar_pedido`, que restaura stock atómicamente).
- **Entregar es definitivo** (no hay reversa en P3).
- **Toda escritura de pedidos pasa por RPC** `SECURITY DEFINER` (se elimina el `UPDATE` directo del admin sobre `orders`).

---

## 3. Diseño de UI

Paleta real del tema (Tailwind): `brand-700 #2d6a4f`, `brand-900 #1b4332`, `brand-100 #d8f3dc`, `brand-500 #52b788`, `surface #fffdf7` / `surface-soft #fef9f0`, `surface-border #e7dfc6`, fuente Inter. Estado "Pendiente" = amarillo suave actual (`yellow-50/200/700`).

### 3.1 Pantalla "Pedidos" (`/admin/pedidos`, reorganiza `AdminOrdersPage`)

De arriba a abajo:

1. **Barra superior:** título "Pedidos" + icono **⚙️** (→ Configuración).
2. **Navegador de fecha** (`OrderDateNav`): `‹  [Hoy · viernes 14 jun]  ›`. Etiqueta "Hoy" cuando es la fecha actual; si no, el día de la semana. ‹ › saltan solo a fechas con pedidos pendientes (no a días vacíos). Fecha por defecto: hoy si tiene pendientes; si no, la siguiente fecha con pendientes.
3. **Resumen "Por entregar"** (`PorEntregarSummary`), **abatible**: header verde (`brand-700`) con "Por entregar · [día]" + fecha + chevron ▾/▸. Al expandir, **mosaico** de cuadros (2 columnas) con la **cantidad** grande (`brand-700`) y el nombre del producto, sumando las unidades pendientes de esa fecha.
4. **Tarjetas de pedido** (`OrderCard`, estilo **compacto**): una fila — izquierda: folio (`brand-700`) + badge estado + nombre·teléfono + resumen de ítems (mutado); derecha: **total grande** (`brand-900`) + chevron. Si `total_personalizado`, tag verde claro **"✎ total"**. Tocar la tarjeta → navega al panel `/admin/pedidos/:id`. (Se le quitan los botones inline de entregar/cancelar; se mueven al panel.)
5. **Enlace** "Ver entregados / cancelados" → vista de historial (lista plana, sin navegador de fecha, con filtros Entregados/Cancelados/Todos).

### 3.2 Panel de edición (`/admin/pedidos/:id`, nueva `AdminOrderDetailPage`)

Pantalla completa con botón **←** (vuelve a la lista). Contenido:

1. **Barra:** `← EM-012` + badge de estado.
2. **Tarjeta de cliente:** nombre, teléfono, notas (admin ve todo) + fecha de entrega.
3. **Artículos** (`OrderItemEditor`, estilo "control en su propia fila"): por artículo, fila superior con nombre + precio unitario + subtotal de línea; **fila inferior** con **stepper ancho** (`− n +`, objetivo ~44 px) + botón **quitar** (rojo suave). El `+`/`−` ajustan cantidad; quitar elimina la línea.
   - **Guard de último artículo:** si `−` o quitar dejaría el pedido sin artículos, mostrar confirm "Este es el último artículo; el pedido quedaría vacío. ¿Cancelar el pedido?" → si acepta, `cancelar_pedido`; si no, no hace nada.
4. **+ Agregar producto** (`AddProductPicker`): abre hoja con buscador de **productos activos** + selector de cantidad → `agregar_a_pedido`.
5. **Total a cobrar** (`TotalOverride`), 3 estados:
   - **Normal:** total (= calculado) + "Editar total ✎".
   - **Editando:** input `$ ___` + "Guardar total" / "Cancelar" → `set_total_pedido`.
   - **Personalizado:** total override + tag "✎ personalizado" + línea "Calculado: $X · **Volver al calculado**" (volver = `set_total_pedido` con el total calculado, o un recálculo que limpie el flag).
   - Aviso: agregar/quitar artículos **recalcula** y pierde el personalizado.
6. **Acciones:** **Marcar entregado** (botón `brand-700`) → `marcar_entregado`; **Cancelar pedido** (rojo suave) → `cancelar_pedido`. Solo visibles si `status='pending'`.

### 3.3 Configuración (`/admin/configuracion`, nueva `AdminSettingsPage`)

Pantalla completa con **←**. Edita `app_settings`:

1. **Días de entrega:** 7 toggles (L M M J V S D) → `order_weekdays` (ISO `1..7`). Verde = activo.
2. **Horarios de corte:**
   - **Corte para pedir** (`order_cutoff_time`, default `20:00`): "hasta esta hora del día anterior".
   - **Corte para cancelar** (`cancel_cutoff_time`, default `06:00`): "hasta esta hora del día de entrega".
3. **Guardar configuración** → upsert en `app_settings` (RLS `admin write` ya existe).

---

## 4. Capa de datos — migración `010_p3_admin.sql`

Todas las funciones: `LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''`, nombres calificados (`public.…`), `GRANT EXECUTE … TO authenticated`. Patrón de retorno: `jsonb_build_object('success', TRUE, …)` o `jsonb_build_object('error', '<código>')`.

### 4.1 `quitar_de_pedido(p_order_id UUID, p_product_id UUID, p_quantity INT)`

1. `SELECT … FOR UPDATE` del pedido; error `order_not_found`; si `status<>'pending'` → `order_not_pending`.
2. `p_quantity` > 0; localizar la línea (`order_items` por `order_id`+`product_id`); si no existe → `item_not_found`.
3. Bloquear el producto (`FOR UPDATE`). Cantidad a devolver = `min(p_quantity, cantidad_actual)`.
4. Si la resta deja la línea en 0 → **eliminar** la línea; si no, restar.
5. **Devolver stock** del producto (`stock + devuelto`).
6. **Recalcular** `total` = `SUM(quantity*unit_price)` de las líneas restantes (0 si no quedan) y **`total_personalizado=FALSE`**.
7. Devolver `{success, total, items_restantes}` (el front usa `items_restantes` para el guard de último artículo / banner de vacío).

### 4.2 `marcar_entregado(p_order_id UUID)`

1. `FOR UPDATE`; `order_not_found`; si `status<>'pending'` → `order_not_pending`.
2. `UPDATE orders SET status='delivered', delivered_at=now()`.
3. `{success}`.

### 4.3 `set_total_pedido(p_order_id UUID, p_total NUMERIC)`

1. `FOR UPDATE`; `order_not_found`; si `status<>'pending'` → `order_not_pending`.
2. Validar `p_total >= 0` → si no, `invalid_total`.
3. `UPDATE orders SET total=p_total, total_personalizado=TRUE`.
4. `{success, total}`.

### 4.4 `recalcular_total_pedido(p_order_id UUID)`

Da soporte a "Volver al calculado" del `TotalOverride`.

1. `FOR UPDATE`; `order_not_found`; si `status<>'pending'` → `order_not_pending`.
2. `UPDATE orders SET total = COALESCE(SUM(quantity*unit_price),0), total_personalizado = FALSE` (suma de las líneas del pedido).
3. `{success, total}`.

### 4.5 Reutilizadas (sin cambios)

- `agregar_a_pedido(p_order_id, p_items)` — suma/fusiona líneas, valida stock, recalcula total, limpia override. Ya `GRANT` a `anon, authenticated`.
- `cancelar_pedido(p_order_id)` — cancela y restaura stock (admin).

### 4.6 RLS

- **Eliminar** `admin update orders` (`DROP POLICY IF EXISTS "admin update orders" ON orders;`): el único uso era el `deliver` directo, que pasa a `marcar_entregado`. Tras esto, toda escritura de `orders`/`order_items` va por RPC `SECURITY DEFINER`. Se conservan `admin read orders` / `admin read order_items`.
- `app_settings`: sin cambios (ya tiene `admin write`).

---

## 5. Frontend

### 5.1 Rutas (`App.jsx`)

- `/admin/pedidos/:id` → `AdminOrderDetailPage` (protegida, admin).
- `/admin/configuracion` → `AdminSettingsPage` (protegida, admin).
- (Existente `/admin/pedidos` → `AdminOrdersPage`.)

### 5.2 Componentes nuevos

| Componente | Responsabilidad | Depende de |
|---|---|---|
| `PorEntregarSummary` | Mosaico abatible de unidades por producto de la fecha activa | recibe `summary` (calculado) |
| `OrderDateNav` | Navegar ‹ › entre fechas con pendientes; mostrar día+fecha | recibe fechas disponibles + fecha activa |
| `OrderItemEditor` | Filas de artículos con stepper grande + quitar + guard último | `useOrders` (removeItem) |
| `AddProductPicker` | Hoja: buscar producto activo + cantidad | productos activos, `useOrders` (addItems) |
| `TotalOverride` | 3 estados del total (normal/editando/personalizado) | `useOrders` (setTotal, recalc) |

### 5.3 Componentes/archivos modificados

- `AdminOrdersPage.jsx`: orquesta fecha activa (default hoy/siguiente con pendientes), pasa `summary` a `PorEntregarSummary`, filtra tarjetas por fecha, ⚙️, enlace historial.
- `OrderCard.jsx`: estilo compacto; `onClick`→`navigate('/admin/pedidos/'+id)`; tag "✎ total"; sin botones inline.
- `OrderList.jsx`: filtra por fecha+`pending` (vista por fecha) o por estado (historial).
- `useOrders.js`: `select` añade `delivery_date, total_personalizado, delivered_at`; nuevas acciones `addItems(orderId, items)`→`agregar_a_pedido`, `removeItem(orderId, productId, qty)`→`quitar_de_pedido`, `markDelivered(orderId)`→`marcar_entregado`, `setTotal(orderId, total)`→`set_total_pedido`, `recalcTotal(orderId)`→`recalcular_total_pedido`; `deliver` pasa a `markDelivered` (RPC). Cada acción re-`fetch` y expone `error`.
- `useAppSettings.js`: extender para **escritura** (upsert de claves) además de la lectura que ya hace.
- Nueva `lib/pendingSummary.js`: dada la lista de pedidos `pending`, agrupa por `delivery_date` y por producto → `{ fechas: [...], porFecha: { '2026-06-14': { totalPedidos, productos: [{name, qty}] } } }`. Helper `fechaPorDefecto(porFecha, hoy)`.
- Reutiliza `lib/deliveryDates.js` (formato día/fecha) de P2.

---

## 6. Manejo de errores

- Las RPC devuelven `{error: código}`; los hooks los exponen (igual que el fix #6 de P1) y la UI muestra mensaje en español. Mapa de códigos:
  - `order_not_found` → "Pedido no encontrado."
  - `order_not_pending` → "El pedido ya no está pendiente."
  - `item_not_found` → "Ese artículo ya no está en el pedido."
  - `out_of_stock` (+`product_name`) → "Sin stock suficiente de {producto}."
  - `invalid_total` → "El total debe ser mayor o igual a 0."
  - `product_not_found` → "Producto no disponible."

---

## 7. Pruebas (TDD, Vitest + Testing Library)

**SQL / RPC (smoke vía Management API, como P2):**
- `quitar_de_pedido`: resta cantidad y devuelve stock; elimina línea al llegar a 0; recalcula total; limpia `total_personalizado`; `items_restantes` correcto; rechaza no-pending.
- `marcar_entregado`: setea `status='delivered'` + `delivered_at`; rechaza no-pending.
- `set_total_pedido`: setea total + `total_personalizado=TRUE`; rechaza negativo y no-pending.
- `recalcular_total_pedido`: total = suma de líneas y `total_personalizado=FALSE`.

**Frontend (unit):**
- `lib/pendingSummary`: agrupación por fecha/producto; `fechaPorDefecto` (hoy con pendientes → hoy; hoy vacío → siguiente fecha con pendientes; sin pendientes → null).
- `OrderDateNav`: navega solo entre fechas disponibles.
- `TotalOverride`: transición de estados y llamadas correctas.
- `OrderItemEditor`: `+`/`−`/quitar; guard de último artículo ofrece cancelar.
- `OrderCard`: render compacto + tag "✎ total" cuando `total_personalizado`.
- `AdminSettingsPage`: toggles de días + horas → upsert.

---

## 8. Casos de borde

- **Pedido sin artículos:** prevenido por el guard (ofrece cancelar). Si aun así un pedido llega a 0 ítems (p.ej. estado intermedio), el panel muestra banner "Pedido sin artículos — ¿cancelar?".
- **Sin pendientes en ninguna fecha:** el resumen y la lista muestran estado vacío ("No hay pedidos pendientes"); el navegador de fecha se oculta.
- **Concurrencia:** todas las RPC bloquean filas (`FOR UPDATE`) antes de tocar stock/total (mismo patrón que P0/P2).
- **Editar un pedido con override + agregar/quitar:** el override se pierde (recálculo), con aviso visible en el panel.

---

## 9. Artefactos a producir (resumen)

- **Migración:** `supabase/migrations/010_p3_admin.sql` (4 RPC nuevas: `quitar_de_pedido`, `marcar_entregado`, `set_total_pedido`, `recalcular_total_pedido` + GRANTs + drop `admin update orders`).
- **Front nuevo:** `pages/AdminOrderDetailPage.jsx`, `pages/AdminSettingsPage.jsx`, `components/admin/{PorEntregarSummary,OrderDateNav,OrderItemEditor,AddProductPicker,TotalOverride}.jsx`, `lib/pendingSummary.js`.
- **Front modificado:** `pages/AdminOrdersPage.jsx`, `components/admin/{OrderCard,OrderList}.jsx`, `hooks/{useOrders,useAppSettings}.js`, `App.jsx`.
- **Tests** correspondientes (sección 7).

---

## 10. Cutover (producción)

Igual que P2: la fase corre en rama feature; **PARAR antes de tocar producción** y pedir aprobación explícita para aplicar `010` (Management API) + deploy (Vercel). Verificación post-migración: esquema/funciones presentes, `admin update orders` ausente, smoke real (agregar/quitar/entregar/total/cancelar) con stock correcto, `delivered_at` poblado al entregar.
