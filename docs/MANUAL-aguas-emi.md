# Manual de Trabajo — Aguas de Emi

**Fecha:** 2026-06-13
**Estado:** P0 (seguridad) aplicado y verificado en prod (2026-06-13, commit `323760c`) · P1-P4 pendientes
**Autor del análisis:** Claude (revisión en 2 pasadas + cruce con specs)

---

## 0. Cómo usar este documento

Este es el **manual maestro** para retomar el proyecto en otra sesión. Reúne tres cosas:

1. **El análisis del estado actual** de la app (qué está bien y qué hay que arreglar).
2. **Los cambios que quiere Emi/Karim** (features nuevas), con las decisiones ya tomadas.
3. **Mis recomendaciones** técnicas y de producto, más un roadmap priorizado.

**Convenciones:**
- 🔴 Crítico · 🟠 Importante · 🟡 Menor · ⭐ Recomendación mía · 🎨 Requiere diseño visual (visual companion, próxima sesión) · ❓ Decisión abierta.
- "Pedido abierto" = pedido con `status = 'pending'` (aún no entregado ni cancelado).
- **P0 (seguridad) ya está implementado y verificado en producción** (2026-06-13, commit `323760c`). El resto (P1-P4) sigue pendiente. Estado por fase en §6.
- El orden recomendado de trabajo está en la **§6 Roadmap**. Léelo antes de empezar a picar.

### ♻️ Trabajar entre sesiones — cuándo hacer `/clear` y qué releer (optimizar tokens)

**Sí: conviene `/clear` al terminar cada fase o ronda de cambios.** Empezar fresco evita arrastrar contexto viejo que ya no sirve y que encarece cada mensaje. El "estado durable" que sobrevive al `/clear` es **(1) la memoria del agente** (se auto-carga) y **(2) este manual** — así que no se pierde nada *si antes guardaste todo*.

**✅ Checklist ANTES de hacer `/clear`** (si falta algo, NO limpies — se perdería):
- [ ] Código **commiteado** (y pusheado si aplica).
- [ ] Migraciones SQL **aplicadas en Supabase** (si la fase tuvo).
- [ ] **§6 Roadmap** actualizado (fase marcada ✅) y **§7 Decisiones** si se cerró alguna.
- [ ] **Memoria del proyecto** actualizada (pídelo: *"actualiza la memoria"*).
- [ ] Sin preguntas abiertas que solo existan en el chat.

> Regla simple: `/clear` **solo en un punto limpio** = trabajo commiteado + manual y memoria al día. A mitad de una fase con cambios sin guardar, **no**.

**📖 Al RETOMAR (sesión nueva), qué releer — y qué NO:**
1. **Siempre:** este manual (sobre todo §6 fase actual, §7 decisiones, §2 estado). La memoria del proyecto se auto-carga.
2. **Solo los archivos de la fase** que vas a tocar, según la **§8 (Mapa de archivos)**. *No releas todo el código* — eso es lo que desperdicia tokens.
3. **No** hace falta releer fases ya terminadas ni código no relacionado.

**Frase de arranque sugerida** tras `/clear`:
> *"Lee `docs/MANUAL-aguas-emi.md` y continuemos con la **fase PX**. Relee solo los archivos de esa fase (§8)."*

**Atajo — qué releer por fase:**
| Fase | Archivos a releer al retomar |
|---|---|
| P1 | `hooks/useCart.js`, `App.jsx`, `Layout.jsx`, `StorePage.jsx`, `CheckoutPage.jsx`, `useAdminProducts.js`, `useOrders.js` + la nueva migración de esquema |
| P2 🎨 | `StorePage.jsx`, `ProductGrid.jsx`, `ProductCard.jsx`, `CheckoutPage.jsx`, `Layout.jsx` (nav) + RPCs `buscar_pedido_abierto` / `agregar_a_pedido` |
| P3 🎨 | `AdminOrdersPage.jsx`, `OrderCard.jsx`, `OrderList.jsx`, `useOrders.js` + RPCs de edición |
| P4 🎨 | nueva `AdminReportsPage.jsx` + RPC/vistas de reporte |

---

## 1. Estado actual (resumen)

**Producción:** `emilse-aguas.vercel.app` · **Repo:** `github.com/karimacuna2008/Emilse---Aguas` · **Supabase:** `hqcdeiefvypaeigehvwu` (us-east-1)

**Stack:** React 19 + Vite 8 + Tailwind v3 (tema crema/verde, "Estilo C") · react-router-dom 7 · Supabase (PostgreSQL + Auth + RLS + Storage) · Vitest + Testing Library · Deploy automático en Vercel.

**Arquitectura:** SPA sin backend propio. Toda la lógica de negocio crítica vive en **funciones PostgreSQL (RPC)**. `src/` está bien organizado: `lib/`, `hooks/`, `components/{store,admin,shared}/`, `pages/`.

**Lo que está bien hecho (conservar):**
- ✅ `crear_pedido` atómica: bloquea filas con `FOR UPDATE`, valida stock y **recalcula precio/total en el servidor** (el cliente no puede manipular precios). Maneja race conditions correctamente.
- ✅ `cancelar_pedido` bloquea filas de productos antes de restaurar stock (es **mejor que el plan original**, que no lo hacía).
- ✅ RLS habilitado en las 3 tablas; productos: lectura pública solo de activos, escritura solo `authenticated`.
- ✅ `vercel.json` con rewrites SPA (los deep-links `/pedido/EM-001` no dan 404).
- ✅ Secretos bien manejados (`.gitignore` correcto, `.env.example`, la anon key es pública **por diseño**).
- ✅ UX móvil-first coherente; estados de carga/error/vacío; código de pedido legible `EM-XXX`.
- ✅ TDD en piezas core (useCart, ProductCard, Cart, CheckoutForm, useProducts) — 18 tests aprox.

---

## 2. Hallazgos del análisis (priorizados)

> **Estado (2026-06-13):** los hallazgos de seguridad **#1, #2, #4, #5 → RESUELTOS y verificados en producción** (commit `323760c`; migraciones `005_security_hardening`, `006_harden_functions`, `007_storage_policies` + frontend). Verificado: `pg_policies` sin políticas públicas y `curl` anónimo a `orders` → `[]`. Siguen abiertos **#3** y **#6** (→ P1) y los 🟡 menores.

### 🔴 CRÍTICO — seguridad (atender ANTES de features nuevas)

**#1 — Fuga de datos personales: cualquiera puede leer TODOS los pedidos.**
- **Qué pasa:** la política `public read orders` usa `USING (TRUE)`. Como la anon key es pública (se extrae del bundle JS), cualquiera puede hacer `select *` de `orders`/`order_items` y obtener **nombre, teléfono, notas y total de todos los clientes**. Se agrava porque los códigos `EM-001, EM-002…` son **secuenciales y adivinables**.
- **Origen:** viene del diseño. El spec tenía el comentario *"anyone can read their own order by order_number"*, pero `USING (TRUE)` **no limita a "su propio" pedido** — RLS no puede forzar "solo si filtras por código".
- **Arreglo ⭐:** quitar la política `SELECT` pública y exponer la consulta por código vía función `SECURITY DEFINER` (`consultar_pedido(order_number)`). Idealmente exigir también teléfono o usar un código no secuencial. *(Esto se acopla perfecto con la feature de "pedido abierto" — ver §3.1.)*
- **Archivos:** `supabase/migrations/002_rls.sql`, `src/pages/OrderStatusPage.jsx`.

**#2 — Inserción pública directa de pedidos burla la función atómica.**
- **Qué pasa:** `public create orders` / `public create order_items` (`WITH CHECK (TRUE)`) permiten insertar pedidos/ítems arbitrarios **sin pasar por `crear_pedido`**: totales falsos, **sin descontar stock**, spam de pedidos.
- **Por qué sobran:** `crear_pedido` es `SECURITY DEFINER` y ya ignora RLS, así que esas políticas INSERT no se necesitan.
- **Arreglo ⭐:** eliminar ambas políticas `INSERT`; dejar la creación **solo** vía RPC.
- **Archivos:** `supabase/migrations/002_rls.sql`.

### 🟠 IMPORTANTE — funcionalidad / robustez

**#3 — Estado del carrito fragmentado (bug funcional real, verificado).**
- **Qué pasa:** `useCart` es un hook con `useState` local, **no un Context**, y no hay sync por evento `storage`. `Layout`, `StorePage` y `CheckoutPage` crean **instancias independientes**. Síntoma: al agregar productos en la tienda, las tarjetas se ponen verdes y muestran el contador, **pero el badge del carrito en la barra inferior no se actualiza** hasta recargar o cambiar de pestaña; tras finalizar la compra el badge sigue mostrando ítems.
- **Arreglo ⭐:** un único `CartContext`/Provider en `App` (consumido por todos). Misma idea opcional para `useAuth` (aunque auth sí se sincroniza por `onAuthStateChange`, así que no es bug).
- **Archivos:** `src/hooks/useCart.js`, `src/App.jsx`, `src/components/shared/Layout.jsx`.

**#4 — Subida de imágenes sin red de seguridad.**
- **Qué pasa:** `ProductForm` sube a `product-images`, pero (a) el bucket se crea **manualmente** en el dashboard (no hay migración → no reproducible), (b) **no existe una policy de Storage que permita `INSERT` a `authenticated`** → Supabase bloquea uploads por defecto, así que la subida **probablemente falla**, y (c) el error de `upload` **no se revisa** → queda un `image_url` roto guardado.
- **Arreglo ⭐:** crear la policy de Storage (INSERT/UPDATE para `authenticated` en el bucket) idealmente vía migración SQL; manejar el `error` de `upload` y avisar en la UI.
- **Archivos:** `src/components/admin/ProductForm.jsx`, nueva migración de Storage.

**#5 — Funciones `SECURITY DEFINER` sin `search_path` fijo.**
- **Qué pasa:** `crear_pedido`, `cancelar_pedido`, `add_stock` no fijan `SET search_path = ''` (advertencia estándar del linter de Supabase; vector de hijacking).
- **Arreglo ⭐:** añadir `SET search_path = ''` (o `pg_catalog, public` con nombres calificados) a todas las funciones.

**#6 — Errores silenciados en hooks admin.**
- **Qué pasa:** `useAdminProducts` y `useOrders` ignoran el `error` de Supabase; si una operación falla (RLS/red), la UI no avisa y parece que "guardó".
- **Arreglo ⭐:** capturar y exponer errores (toast/mensaje).
- **Archivos:** `src/hooks/useAdminProducts.js`, `src/hooks/useOrders.js`.

### 🟡 MENORES / pulido
- **WhatsApp FAB** (`bottom-6 right-6`) se traslapa con la barra inferior (`h-16`) → subirlo a `bottom-20`.
- **Sin tests del camino crítico:** CheckoutPage + RPC, manejo `out_of_stock`, OrderStatus, admin, funciones SQL. (Parte fue decisión consciente del spec, pero el checkout no tiene test.)
- **Validaciones de borde en BD:** `crear_pedido` no rechaza items vacíos; `customer_phone` puede llegar vacío (la columna es `NOT NULL` pero acepta `''`). *(El guard `add_stock p_units > 0` ya se añadió en P0 / migración `006`.)*
- **Sin ruta 404 (`path="*"`) ni ErrorBoundary** → ruta inexistente = pantalla en blanco.
- **Tipo de `price`/`total` inconsistente** (a veces `Number(x).toFixed`, a veces `x.toFixed`). Unificar.
- **Falta `README.md`.** Docs (specs/plan) quedaron en React 18/Vite 5/router 6; la app usa 19/8/7 (solo anotado en memoria).
- **Se muestra el stock exacto** al cliente ("{stock} disponibles") — decisión de negocio, no bug.

---

## 3. Cambios solicitados

### 3.1 Tienda (cliente)

#### A) Teléfono obligatorio + identidad por teléfono
- **Estado actual:** el teléfono **ya es obligatorio** en la validación de `CheckoutForm` (nombre y teléfono required). La columna `orders.customer_phone` es `NOT NULL`.
- **Nuevo:** el teléfono pasa a ser la **clave de identidad** del cliente (para detectar pedidos abiertos). Añadir:
  - Validación de **formato** (solo dígitos, longitud mínima) en el form.
  - Validación **server-side** en la RPC (rechazar teléfono vacío/ inválido).

#### B) Detección de pedido abierto → **el cliente elige** ✅ (decisión tomada)
- **Flujo:** al confirmar el checkout, antes de crear el pedido se busca si el teléfono tiene un **pedido abierto** (`pending`).
  - Si **no** hay → se crea normal (`crear_pedido`).
  - Si **sí** hay → se le muestra: *"Ya tienes el pedido EM-XXX abierto"* y **dos opciones**:
    1. **Sumar a ese pedido** → los nuevos artículos se añaden al pedido existente (ajusta stock y total atómicamente).
    2. **Crear un pedido nuevo aparte** → se crea uno independiente.
- **Funciones nuevas (RPC, `SECURITY DEFINER`):**
  - `buscar_pedido_abierto(p_phone)` → devuelve el pedido `pending` del teléfono (campos mínimos: `order_number`, items, total). ⭐ **Esto reemplaza el `select` directo y permite cerrar la fuga #1.**
  - `agregar_a_pedido(p_order_id, p_items)` → suma items a un pedido `pending`: re-bloquea productos `FOR UPDATE`, valida stock, inserta `order_items`, descuenta stock y **recalcula el total** (ver nota de override en §3.2-C).
- **✅ Privacidad (decisión tomada):** la RPC devuelve **solo datos mínimos** — `order_number` + resumen de ítems y total. **No** devuelve nombre completo ni notas, y **no** se pide confirmación extra de identidad. Mitiga el sondeo de PII sin agregar fricción al cliente.
- **Edge cases a documentar:** ¿qué pasa si el pedido abierto ya tiene **total personalizado** (override) y se le suman artículos? (Ver §3.2-C — recomiendo invalidar el override y avisar a Emi.)

#### C) Dos vistas en el catálogo: Tarjetas / Lista (toggle) 🎨
- Quitar el grid fijo de 2 columnas. Añadir un **selector de vista** (persistir preferencia en `localStorage`).
- **Vista Tarjetas:** solo **imagen + nombre**. Al hacer **click** se abre un menú (modal/popover) para **elegir cantidad** y agregar.
- **Vista Lista:** **imagen a la izquierda**, info al centro, **botones +/−** a la derecha.
- 🎨 **El diseño visual fino (layout del modal, lista, transiciones) se hará la próxima sesión con el visual companion.** Aquí solo queda el requisito.
- **Archivos:** `src/pages/StorePage.jsx`, `src/components/store/ProductGrid.jsx`, `ProductCard.jsx` (+ nuevos: `ProductListItem.jsx`, `ProductQuantityModal.jsx`, `ViewToggle.jsx`).

### 3.2 Admin (Emi)

#### A) Lista de pedidos como tarjetas → click abre **pantalla de edición del pedido** 🎨
- Cada pedido se muestra como **tarjeta resumida**; al hacer click se abre una **pantalla/panel de detalle-edición** donde Emi puede:
  - **Agregar** artículos al pedido (ajusta stock).
  - **Quitar** artículos (devuelve stock).
  - **Cancelar** el pedido (ya existe `cancelar_pedido`).
  - **Marcar entregado** (⭐ pasar a RPC `marcar_entregado` que además guarde `delivered_at`).
  - **Poner un total personalizado** (ver C).
- **Funciones nuevas (RPC):**
  - `agregar_a_pedido(p_order_id, p_items)` (compartida con la tienda).
  - `quitar_de_pedido(p_order_id, p_product_id, p_quantity)` → resta/elimina línea y **devuelve stock** atómicamente.
  - `marcar_entregado(p_order_id)` → `status='delivered'` + `delivered_at = now()`.
- 🎨 Diseño visual del panel → próxima sesión.
- **Archivos:** `src/components/admin/OrderCard.jsx`, `OrderList.jsx`, `src/pages/AdminOrdersPage.jsx` (+ nuevos: `OrderDetailPanel.jsx`, `OrderItemEditor.jsx`), `src/hooks/useOrders.js`.

#### B) Resumen "por entregar" arriba de la lista de pedidos
- Encima de todos los pedidos, mostrar un **agregado de lo pendiente**: suma de cantidades por producto en todos los pedidos `pending` (ej.: *"Por entregar: 12× Agua 5L · 5× Garrafón 20L · 8× Pack x6"*).
- **Implementación ⭐:** vista SQL o RPC `resumen_pendientes()` que agrupe `order_items` de pedidos `pending` por producto.

#### C) Total personalizado por pedido — **override del total** ✅ (decisión tomada)
- Emi puede **fijar manualmente el total a cobrar** de un pedido (descuento/recargo global). Los precios de línea no cambian; lo que se cobra y se guarda en `orders.total` es el valor manual.
- **Modelo de datos ⭐ (recomendado):** en `orders` mantener `total` = lo que se cobra, y añadir `total_personalizado BOOLEAN DEFAULT FALSE` para saber que fue override (y para reportes/auditoría). Opcional: guardar también `total_calculado` (la suma original) como referencia.
- **Función:** `set_total_pedido(p_order_id, p_total)` → fija `total` y marca `total_personalizado = TRUE`.
- **Interacción con "agregar artículos" (✅ decisión tomada):** **siempre que se edite una orden** (agregar/quitar artículos) se **recalcula el total real**. Si el pedido tenía `total_personalizado = TRUE`, ese override se **sobreescribe** (`total_personalizado = FALSE`, `total` = suma recalculada). Las RPC de edición (`agregar_a_pedido`, `quitar_de_pedido`) deben aplicar esta regla siempre.

#### D) Pantalla de resumen / BI de ventas 🎨
- Dashboard para que Emi vea **cuánto ha vendido**: total general, **por producto** y **por categoría** ("por tipo"), con **filtro por fechas** y agrupaciones.
- **✅ Definición de "venta" (decisión tomada):** "vendido" cuenta **solo pedidos entregados** (`delivered`) = ventas reales (el cobro es en efectivo al entregar). Los `pending` se muestran **aparte** como "pipeline / por cobrar", nunca sumados a las ventas.
- **Requisito de datos ⭐:** añadir `orders.delivered_at TIMESTAMPTZ` para que el filtro por fechas de **ventas** sea correcto (no por fecha de creación).
- **Implementación:** RPC(s) de reporte, ej. `reporte_ventas(p_desde, p_hasta)` que devuelva totales y desgloses por producto/categoría; o vistas SQL agregadas.
- 🎨 Diseño visual (gráficas, tarjetas de KPIs, layout) → próxima sesión con visual companion.
- **Métricas sugeridas ⭐ (a refinar):** ventas totales del periodo, # pedidos, ticket promedio, top productos, ventas por categoría, comparativo entre periodos.

#### E) Categorías de productos — **campo de texto en `products`** ✅ (decisión tomada)
- Añadir columna `products.category TEXT` (nullable). Emi escribe la categoría del producto.
- **⭐ Recomendación (respetando tu decisión de texto libre):** en el `ProductForm`, usar un `<input>` con **`<datalist>` de las categorías ya existentes** (autocompletado). Así sigue siendo texto libre pero evita duplicados/typos ("Garrafones" vs "garrafon") que romperían el agrupado del BI. Costo casi nulo.
- Usos: agrupar/filtrar en la tienda y agrupar en el BI ("por tipo").
- **Archivos:** nueva migración (`ALTER TABLE products ADD COLUMN category TEXT`), `ProductForm.jsx`, `useProducts.js` (exponer category), StorePage (agrupar/filtrar).

---

## 4. Impacto en modelo de datos y funciones

### 4.1 Cambios de esquema (nueva migración, ej. `005_features.sql`)
| Tabla | Cambio | Motivo |
|---|---|---|
| `products` | `+ category TEXT` | Categorías (§3.2-E) |
| `orders` | `+ delivered_at TIMESTAMPTZ` | Fecha real de venta para BI (§3.2-D) |
| `orders` | `+ total_personalizado BOOLEAN DEFAULT FALSE` (+ opcional `total_calculado`) | Override de total (§3.2-C) |
| `orders` | índice en `customer_phone` | Búsqueda de pedido abierto (§3.1-B) |

### 4.2 Funciones RPC (nuevas / modificadas)
| Función | Tipo | Comportamiento |
|---|---|---|
| `consultar_pedido(order_number)` | nueva, DEFINER | Devuelve 1 pedido + items por código. Reemplaza el `select` directo (cierra #1) |
| `buscar_pedido_abierto(phone)` | nueva, DEFINER | Devuelve pedido `pending` del teléfono (datos mínimos) |
| `agregar_a_pedido(order_id, items)` | nueva, DEFINER | Suma items a pedido `pending`, ajusta stock y total (atómico) |
| `quitar_de_pedido(order_id, product_id, qty)` | nueva, DEFINER | Quita/reduce línea, devuelve stock (atómico) |
| `marcar_entregado(order_id)` | nueva, DEFINER | `status='delivered'` + `delivered_at` |
| `set_total_pedido(order_id, total)` | nueva, DEFINER | Override del total (§3.2-C) |
| `resumen_pendientes()` | nueva | Agregado de cantidades por producto en `pending` (§3.2-B) |
| `reporte_ventas(desde, hasta)` | nueva | Totales y desglose por producto/categoría (§3.2-D) |
| `crear_pedido` | modificar | Validar phone no vacío; items no vacíos; `SET search_path` |
| `cancelar_pedido`, `add_stock` | modificar | `SET search_path`; `add_stock` validar `p_units > 0` |

### 4.3 RLS (nueva migración, ej. `006_rls_hardening.sql`)
- **Quitar** `public read orders`, `public read order_items`, `public create orders`, `public create order_items`.
- Todo acceso de cliente a pedidos pasa por RPC `SECURITY DEFINER` (`crear_pedido`, `consultar_pedido`, `buscar_pedido_abierto`, `agregar_a_pedido`).
- Considerar mover el "marcar entregado" del admin a `marcar_entregado` (RPC) y revisar si se mantiene la policy `UPDATE` directa.
- `GRANT EXECUTE` afinado por rol (`anon` solo lo de cliente; admin lo suyo).
- Storage: policy de `INSERT/UPDATE` para `authenticated` en `product-images` (#4).

---

## 5. Mis recomendaciones (resumen accionable)

1. ⭐ **Hacer P0 (seguridad) antes que las features.** Hoy hay datos reales de clientes (nombre+teléfono) expuestos y explotables. Es lo único urgente de verdad.
2. ⭐ **Centralizar el carrito en un `CartContext`** (arregla #3 y es prerequisito limpio para las dos vistas y el modal de cantidad).
3. ⭐ **Canalizar TODO acceso a `orders` por RPC.** Mata dos pájaros: cierra #1/#2 y habilita la búsqueda de pedido abierto.
4. ⭐ **Añadir `delivered_at`** desde ya: sin eso, el BI por fechas saldrá mal y rehacerlo después es caro.
5. ⭐ **Manejo de errores + toasts** en hooks admin y en la subida de imágenes (#4, #6).
6. ⭐ **Datalist de categorías** en el form (consistencia sin tabla).
7. ⭐ **Tests del camino crítico** (checkout/RPC, merge de pedidos, override de total) — es donde vive el riesgo real.
8. ⭐ **Pinear `search_path`** en todas las funciones (#5) — barato y cierra una advertencia de seguridad.
9. 🎨 Las vistas de tienda y el BI: **diseñarlas con el visual companion** antes de implementarlas.

**Riesgos a vigilar:**
- La búsqueda de pedido abierto por teléfono introduce un vector de sondeo de PII → devolver datos mínimos.
- Editar items de un pedido con total personalizado → definir bien el comportamiento (recomendación en §3.2-C).
- Supabase free tier pausa proyectos tras inactividad (ya contemplado en el spec original).

---

## 6. Roadmap por fases (orden recomendado)

> Cada fase es candidata a su propio ciclo brainstorming → spec → plan → implementación. Las marcadas 🎨 necesitan el visual companion primero.

**P0 — Seguridad ✅ HECHO y verificado en prod (2026-06-13, commit `323760c`)**
- ✅ Cerrado RLS de `orders`/`order_items` (#1, #2) + RPC `consultar_pedido` (sin teléfono) — migración `005`.
- ✅ `search_path` pineado (#5) — migración `006` (+ guard `add_stock p_units>0`). ✅ Policy de Storage + manejo de error de subida (#4) — migración `007` + `ProductForm`.
- *Verificado:* `pg_policies` sin políticas públicas; `curl` anónimo a `/rest/v1/orders` → `[]`. Frontend desplegado (Vercel).

**P1 — Fundamentos de datos y arquitectura**
- Migración de esquema: `category`, `delivered_at`, `total_personalizado` (+ índice phone).
- Refactor carrito → `CartContext` (#3). Manejo de errores en hooks (#6).
- *Dependencias:* P0 idealmente antes. Habilita todo lo demás.

**P2 — Tienda (cliente)** 🎨
- Vistas Tarjetas/Lista + modal de cantidad + toggle persistente.
- **Rediseño de navegación** (decidido en §7): repensar la barra inferior junto con las vistas nuevas; integrar el arreglo del FAB de WhatsApp aquí.
- Teléfono: validación de formato + identidad. Detección de pedido abierto (elige sumar/nuevo) con `buscar_pedido_abierto` + `agregar_a_pedido`.
- *Dependencias:* P1 (CartContext, RPCs). Visual companion antes de implementar.

**P3 — Admin: gestión de pedidos** 🎨
- Pedidos como tarjetas → panel de edición (agregar/quitar/cancelar/entregar) con sus RPC.
- Resumen "por entregar" arriba. Total personalizado (override).
- *Dependencias:* P1 (`delivered_at`, `total_personalizado`, RPCs de edición).

**P4 — BI / Dashboard de ventas** 🎨
- Reportes por producto/categoría/fecha. KPIs. Filtros.
- *Dependencias:* P1 (`category`, `delivered_at`), P3 (`marcar_entregado` poblando `delivered_at`).

---

## 7. Decisiones tomadas vs abiertas

**Tomadas (sesión inicial):**
- Pedido abierto → **el cliente elige** sumar al abierto o crear uno nuevo.
- Precio personalizado → **override del total** del pedido (no por artículo).
- Categorías → **campo de texto en `products`** (+ datalist recomendado).

**Tomadas (sesión 2026-06-13):**
- Privacidad de `buscar_pedido_abierto` → devuelve **solo datos mínimos** (`order_number` + resumen), sin nombre/notas y sin confirmación extra (§3.1-B).
- Override de total al editar ítems → **siempre se recalcula el total real y se sobreescribe** el personalizado (§3.2-C).
- BI → "venta" = **solo pedidos `delivered`**; los `pending` van aparte como pipeline (§3.2-D).
- Navegación → **se rediseña** junto con las vistas nuevas (no se mantiene la barra actual tal cual). El diseño concreto entra en la sesión visual.

**Abiertas para la próxima sesión ❓ (todas requieren visual companion):**
- Diseño visual de: vistas Tarjetas/Lista + modal de cantidad, panel de edición de pedido, dashboard BI.
- Rediseño concreto de la **navegación** (decidido que se rediseña; falta el diseño).
- BI: métricas exactas y agrupaciones a mostrar.

---

## 8. Apéndice — Mapa rápido de archivos por cambio

| Cambio | Archivos / artefactos |
|---|---|
| RLS hardening (#1,#2) | `supabase/migrations/00X_rls_hardening.sql`, `OrderStatusPage.jsx` |
| Carrito Context (#3) | `hooks/useCart.js`, `App.jsx`, `Layout.jsx`, todos los consumidores |
| Storage (#4) | `ProductForm.jsx`, migración de Storage policies |
| search_path (#5) | `003_functions.sql`, `004_add_stock.sql` (o nueva migración) |
| Errores (#6) | `useAdminProducts.js`, `useOrders.js` |
| Categorías | migración `products.category`, `ProductForm.jsx`, `useProducts.js`, `StorePage.jsx` |
| Vistas tienda | `StorePage.jsx`, `ProductGrid.jsx`, `ProductCard.jsx`, nuevos `ProductListItem.jsx`/`ProductQuantityModal.jsx`/`ViewToggle.jsx` |
| Pedido abierto | `CheckoutPage.jsx`, RPCs `buscar_pedido_abierto`/`agregar_a_pedido` |
| Edición de pedido (admin) | `OrderCard.jsx`, `OrderList.jsx`, `AdminOrdersPage.jsx`, nuevos `OrderDetailPanel.jsx`/`OrderItemEditor.jsx`, `useOrders.js`, RPCs |
| Resumen por entregar | RPC/vista `resumen_pendientes`, `AdminOrdersPage.jsx` |
| Total personalizado | migración `orders`, RPC `set_total_pedido`, panel de edición |
| BI | RPC/vistas de reporte, nueva página `AdminReportsPage.jsx` + ruta |

---

*Fin del manual. Siguiente paso sugerido: validar este documento, luego abrir la próxima sesión por la Fase P0 (seguridad) y, para lo visual (P2/P3/P4), arrancar con el visual companion.*
