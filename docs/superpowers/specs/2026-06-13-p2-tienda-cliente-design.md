# Spec de diseño — P2: Tienda (cliente)

**Fecha:** 2026-06-13
**Fase:** P2 del roadmap (`docs/MANUAL-aguas-emi.md` §6)
**Estado:** Diseño visual aprobado (visual companion) — pendiente: aprobación del spec → plan de implementación
**Dependencias:** P0 (seguridad) y P1 (CartContext, esquema base) ✅

---

## 1. Objetivo

Rediseñar la experiencia de cliente de la tienda: catálogo con dos vistas (Lista/Tarjetas), modal de cantidad, navegación nueva, consulta de pedidos por teléfono, y un checkout con **fecha de entrega** y **detección de pedido abierto del mismo día**. Todo móvil-first, manteniendo el tema crema/verde y la regla de "todo acceso a `orders` pasa por RPC `SECURITY DEFINER`".

## 2. Alcance

**IN (P2):**
- Catálogo: vista **Lista** (principal) y **Tarjetas**, toggle persistente, **chips de categoría**, **buscador por nombre**, orden **alfabético**, estado visual "agregado".
- **Modal de cantidad** (hoja inferior) al tocar una Tarjeta.
- **Rediseño de navegación**: barra inferior de 4 tabs (Tienda · Carrito · Mi pedido · Ayuda), acceso a **Admin discreto** en el encabezado, arreglo del traslape de WhatsApp.
- **Mi carrito** en 2 pantallas: (1) lista editable, (2) datos + fecha.
- **Fecha de entrega** con reglas configurables (días hábiles + hora de corte).
- **Detección de pedido abierto** (mismo día) → sumar/nuevo.
- **Mi pedido**: consulta por teléfono → lista de **todos los pedidos activos** → detalle con **pedir ayuda (con ID)** y **cancelar** (con hora de corte).
- **Ayuda** (tab) → WhatsApp con mensaje genérico.
- Datos/RPC/migración que habilitan lo anterior. **Seed** de la configuración con valores por defecto.

**OUT (se difiere a P3/P4):**
- **Pantalla de admin para editar la configuración** (días hábiles, horas de corte). En P2 solo se crean la tabla y los **valores por defecto**; Emi los edita hasta P3.
- Panel de edición de pedidos del admin, resumen "por entregar", total personalizado UI (P3).
- BI/Dashboard (P4).

## 3. Decisiones aprobadas (sesión 2026-06-13, visual companion)

1. **Vista principal:** Lista. Tarjetas disponible en el toggle (preferencia en `localStorage`).
2. **Lista:** imagen chica izq., nombre (multilínea) + precio centro, a la derecha **"Agregar"**; al tener cantidad se convierte en **stepper −/cant/+ más ancho**.
3. **Tarjetas:** imagen normal + nombre + precio (debajo), **toda la tarjeta clickeable** → abre modal. Leyenda global "Toca un producto…".
4. **Estado agregado:** Lista → fila **verde** + stepper **blanco**; Tarjetas → tarjeta **verde** + **badge** con la cantidad.
5. **Buscador** por nombre + **chips de categoría**; productos **ordenados alfabéticamente**.
6. **Modal de cantidad:** **hoja inferior** (bottom sheet); imagen, nombre, precio c/u, disponibles, stepper grande, subtotal en vivo; "Agregar"/"Actualizar" + "Quitar" si ya estaba.
7. **Navegación:** 4 tabs (Tienda · Carrito · Mi pedido · Ayuda); **Admin** = ícono discreto en encabezado; **WhatsApp** ya no es FAB suelto.
8. **Mi carrito (2 pantallas):** (1) lista editable (cantidad + quitar) + total + "Continuar →"; (2) datos (nombre, teléfono) + **fecha en matriz (5 días)** + indicaciones + "Confirmar pedido".
9. **Fecha de entrega obligatoria** en cada pedido.
10. **Corte de creación:** para pedir para un día, antes de las **20:00 del día anterior** (configurable).
11. **Días hábiles** para pedir = **toggles por día de la semana** (Lun/Mar/…), configurable.
12. **Detección de pedido abierto = solo mismo día de entrega.** Fechas distintas → no pregunta, crea normal.
13. **Mi pedido:** por teléfono salen **todos los activos**; el cliente elige cuál ver. En el detalle: **pedir ayuda** (mensaje WhatsApp con el **ID**) y **cancelar** (hasta **06:00 del día de entrega**, configurable).
14. **Ayuda** (tab) → WhatsApp con mensaje genérico (sin previsualización; redirige directo).
15. Al **sumar** a un pedido abierto, se **recalcula el total real** y se sobrescribe `total_personalizado` (regla del manual §3.2-C).

## 4. Diseño visual aprobado (resumen por pantalla)

> Mockups guardados en `.superpowers/brainstorm/` (no versionado).

- **Catálogo:** encabezado verde; toolbar = buscador + toggle ▦/≣, debajo chips de categoría; cuerpo Lista o Tarjetas; barra inferior 4 tabs.
- **Modal cantidad:** hoja inferior sobre catálogo atenuado; handle, ✕, producto, "Cantidad" con − N +, botón "Agregar al carrito $XX".
- **Navegación:** encabezado `💧 Aguas de Emi` + 👩‍💼 discreto a la derecha; tabs 🏪 Tienda · 🛒 Carrito(badge) · 📦 Mi pedido · 💬 Ayuda.
- **Mi carrito (1):** filas editables (img, nombre, precio c/u, stepper, 🗑), total, "Continuar →", "Seguir comprando".
- **Datos y entrega (2):** "Volver al carrito", recap (n art./total), nombre, teléfono (10 díg.), **matriz de 5 días**, nota de corte, indicaciones, "Confirmar pedido".
- **Pedido abierto (mismo día):** tarjeta del pedido existente + dos opciones: **➕ Sumar al pedido EM-XXX** / **🆕 Crear pedido nuevo aparte**.
- **Mi pedido (lista):** "Tus pedidos activos" → cards (código, fecha, badge pendiente, total, ›).
- **Mi pedido (detalle):** **ID arriba + estatus debajo, centrados**, fecha de entrega, ítems, total, **💬 Pedir ayuda con este pedido**, **Cancelar pedido** (deshabilitado si pasó el corte).

## 5. Modelo de datos (nueva migración `009_p2_tienda.sql`)

| Tabla | Cambio | Motivo |
|---|---|---|
| `orders` | `+ delivery_date DATE NOT NULL` | Fecha de entrega solicitada (decisión #9). Backfill de filas viejas: `delivery_date = created_at::date`, luego `SET NOT NULL`. |
| `orders` | índice en `(customer_phone, delivery_date, status)` | Soporta `buscar_pedido_abierto` y `listar_pedidos_activos`. |
| `app_settings` | **tabla nueva** `key TEXT PK, value TEXT NOT NULL, updated_at timestamptz default now()` | Configuración editable (días/horas). |

**Seed de `app_settings` (valores por defecto):**
- `order_cutoff_time = '20:00'` — corte de creación (decisión #10).
- `cancel_cutoff_time = '06:00'` — corte de cancelación (decisión #13).
- `order_weekdays = '1,2,3,4,5,6,7'` — ISO (1=Lun … 7=Dom); todos activos por defecto (decisión #11).

**RLS de `app_settings`:** lectura **pública** (`anon`) — el cliente la necesita para render del calendario; no hay PII. Escritura solo `authenticated` (la usará el admin en P3).

## 6. Funciones RPC (`SECURITY DEFINER`, `search_path` fijo)

| Función | Tipo | Comportamiento |
|---|---|---|
| `crear_pedido(...)` | **modificar** | Añadir `p_delivery_date DATE`. Validar: teléfono **exactamente 10 dígitos** (tras quitar espacios/guiones); ítems no vacíos; **`delivery_date` permitida** (día de la semana activo + antes del corte `order_cutoff_time` del día anterior + dentro de horizonte). Guarda `delivery_date`. Mantiene atomicidad y recálculo de precio/stock. |
| `buscar_pedido_abierto(p_phone, p_delivery_date)` | **nueva** | Devuelve el pedido `pending` de ese teléfono **para esa fecha** (datos mínimos: `order_number`, items, total). Habilita la detección "mismo día" (decisión #12). |
| `agregar_a_pedido(p_order_id, p_items)` | **nueva** | Suma ítems a un pedido `pending`: re-bloquea productos `FOR UPDATE`, valida stock, inserta líneas, descuenta stock, **recalcula total** y pone `total_personalizado = FALSE` (decisión #15). |
| `listar_pedidos_activos(p_phone)` | **nueva** | Devuelve **todos** los pedidos `pending` del teléfono (cada uno: `order_number`, `delivery_date`, `status`, `total`, items[]). Datos mínimos, sin nombre/notas/teléfono ajeno. Para "Mi pedido" (decisión #13). |
| `cancelar_pedido_cliente(p_order_number, p_phone)` | **nueva** | Verifica que el teléfono coincide y que **no pasó el corte** (`now() < delivery_date + cancel_cutoff_time`) y que está `pending`; entonces cancela y **restaura stock** (reusa lógica de `cancelar_pedido`). |

**GRANT EXECUTE:** `anon` solo en las RPC de cliente listadas; las de admin quedan para `authenticated`.

**Privacidad:** ninguna RPC de cliente devuelve nombre, notas ni el teléfono — respeta la regla de visibilidad de datos (el cliente solo ve info mínima; el admin lo ve todo).

## 7. Reglas de negocio (lógica de fechas)

- **Día candidato `D` seleccionable** ⇔ (a) `weekday(D)` ∈ `order_weekdays` **y** (b) `now() < (D − 1 día) @ order_cutoff_time`.
- **Matriz de fechas:** muestra los **próximos 5 días candidatos** desde hoy; cada celda habilitada solo si cumple (a) y (b); las no disponibles se ven **atenuadas**; el **primer día disponible** queda preseleccionado.
- **Cálculo en cliente** (para render, leyendo `app_settings`) **y validación en servidor** (`crear_pedido`), para que no se pueda forzar una fecha inválida.
- **Cancelación de cliente** permitida hasta `delivery_date @ cancel_cutoff_time`; se valida en `cancelar_pedido_cliente`.

## 8. Componentes frontend

**Nuevos**
- `components/store/ProductListItem.jsx` — fila Lista (normal/agregado).
- `components/store/ProductQuantityModal.jsx` — hoja inferior (agregar/actualizar/quitar).
- `components/store/ViewToggle.jsx` — ▦/≣ (persiste en `localStorage`).
- `components/store/CatalogToolbar.jsx` — buscador + chips + toggle.
- `components/store/DeliveryDatePicker.jsx` — matriz de 5 días.
- `pages/MyOrdersPage.jsx` — "Mi pedido": lookup por teléfono → lista → detalle.
- `components/store/ActiveOrdersList.jsx` y `CustomerOrderDetail.jsx`.
- `hooks/useAppSettings.js` — lee `app_settings` (con cache).
- `lib/deliveryDates.js` — utilidades puras (días disponibles, corte) — **testeables**.
- `lib/whatsapp.js` — arma links de ayuda (genérico / con ID de pedido).

**Modificados**
- `pages/StorePage.jsx` — estado de vista, búsqueda, filtro por categoría, orden alfabético.
- `components/store/ProductGrid.jsx` / `ProductCard.jsx` — Tarjetas: precio, click total, estado verde + badge, abre modal.
- `pages/CheckoutPage.jsx` — 2 pasos; integra fecha + detección de pedido abierto.
- `components/store/CheckoutForm.jsx` — validación de formato de teléfono + `DeliveryDatePicker`.
- `components/store/Cart.jsx` — lista editable (stepper + quitar).
- `components/shared/Layout.jsx` — nav de 4 tabs + acceso admin discreto.
- `components/shared/WhatsAppLink.jsx` → tab "Ayuda" + helper de mensaje con ID.
- `hooks/useProducts.js` — exponer `category`.
- `App.jsx` — ruta `/mis-pedidos` (Mi pedido).

**`localStorage`:** preferencia de vista (`tarjetas|lista`) y último teléfono (prefill en checkout y Mi pedido).

## 9. Tecnología y justificación

- **Sin librerías nuevas.** Todo se resuelve con el stack actual (React 19, Tailwind v3, react-router 7, Supabase RPC). El modal (hoja inferior), los chips, el toggle y la matriz de fechas son CSS/estado local — no se justifica meter un date-picker ni un component lib (peso y estilo ajeno al tema). El cálculo de fechas es lógica pura en `lib/` (fácil de testear con Vitest, ya en el proyecto).
- **`app_settings` key-value** en vez de columnas dedicadas: pocas claves, evolución sin migraciones nuevas, y lectura pública trivial.
- **RPC para todo acceso a `orders`:** mantiene cerrada la fuga #1 del manual (cliente nunca hace `select` directo) y centraliza validación/atomicidad en el servidor.

## 10. Criterios de éxito (aceptación)

1. Toggle Lista/Tarjetas cambia la vista y la preferencia persiste tras recargar.
2. Buscar por nombre filtra; chips filtran por categoría; productos en orden alfabético.
3. Tocar una Tarjeta abre el modal; "Agregar" refleja la cantidad; un producto agregado se ve **verde** (badge en Tarjetas, stepper blanco en Lista) y el **badge del carrito** se actualiza.
4. "Mi carrito" permite cambiar cantidad y eliminar; "Continuar" lleva a datos+fecha.
5. La **matriz** solo permite fechas válidas (día activo + antes del corte); el servidor rechaza una fecha inválida.
6. Al confirmar con un **pedido pendiente del mismo día**, aparece sumar/nuevo; con fecha distinta, no.
7. "Sumar" agrega ítems al pedido, ajusta stock y total (atómico) y limpia `total_personalizado`.
8. "Mi pedido" lista **todos** los activos por teléfono; el detalle permite **ayuda con ID** y **cancelar** solo antes del corte (validado en servidor).
9. Nav de 4 tabs; "Admin" discreto; WhatsApp sin traslape.
10. **Pruebas (TDD)** verdes para: `deliveryDates` (corte+día), detección mismo-día, corte de cancelación, edición de carrito, búsqueda/filtro/orden. `vite build` OK.

## 11. Riesgos y mitigaciones

- **Sondeo de PII por teléfono** (Mi pedido / detección) → RPC devuelven **datos mínimos**; sin nombre/notas/teléfono.
- **Manipulación de fecha** (cliente fuerza fecha fuera de corte) → **validación server-side** en `crear_pedido`.
- **Backfill de `delivery_date`** en filas viejas antes del `NOT NULL` → usar `created_at::date`; verificar conteos antes/después.
- **Carrera entre `buscar_pedido_abierto` y `crear_pedido`** → aceptable; cada RPC es atómica; si aparece otro pedido del mismo día, el peor caso es un pedido extra (no corrupción).
- **Config sin UI en P2** → defaults sensatos (20:00/06:00/todos los días); si Emi necesita cambiarlos antes de P3, se ajustan por SQL.

## 12. Desglose en sub-fases (para el plan)

1. **Datos & RPC** (S/M): migración `009` (delivery_date, índice, `app_settings` + seed + RLS), `crear_pedido` (fecha+validaciones), nuevas RPC, GRANTs. *(crítico, bloquea el resto)*
2. **Catálogo** (M): toggle + buscador + chips + orden + estado agregado + modal de cantidad.
3. **Carrito & checkout** (M): carrito editable en 2 pasos, `DeliveryDatePicker`, validación de teléfono, detección de pedido abierto (sumar/nuevo).
4. **Mi pedido & navegación** (M): nav de 4 tabs + admin discreto + Ayuda; `MyOrdersPage` (lookup→lista→detalle) con ayuda(ID) y cancelar.
5. **Pulido & pruebas** (S): tests TDD, `localStorage`, build, verificación en prod.

## 13. Decisiones confirmadas (2026-06-13)

1. **Admin de configuración → P3.** En P2 solo se crean la tabla `app_settings` y sus valores por defecto.
2. **"Disponibles: N"** (stock exacto) en el modal: **se mantiene**.
3. **Etiqueta del botón** de la pantalla 1 del carrito: **"Continuar →"**.
4. **`order_weekdays` por defecto = todos activos.** Regla de negocio: **nada de días bloqueado en código** — cualquier día es entregable por defecto y Emi decide cuáles no vende moviéndolos en `app_settings` (la UI de edición llega en P3). El front debe leer SIEMPRE de `app_settings`, sin listas de días hard-codeadas.
5. **Horizonte de la matriz = próximos 5 días candidatos.** Confirmado.
