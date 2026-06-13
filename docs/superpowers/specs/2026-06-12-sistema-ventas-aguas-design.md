# Diseño: Sistema de Ventas e Inventario — Aguas de Emi

**Fecha:** 2026-06-12  
**Estado:** Aprobado

---

## Idea / Problema

Emi vende agua (garrafones, botellas y similares) y necesita un sistema para que sus clientes puedan hacer pedidos en línea y para que ella pueda gestionar su inventario y el ciclo de vida de cada pedido — desde que entra hasta que se entrega y se cobra en efectivo.

---

## Objetivo

Construir una aplicación web mobile-first que permita a los clientes de Emi ver el catálogo disponible y hacer pedidos, y que le dé a Emi una vista de administración para gestionar productos, inventario y pedidos.

---

## Alcance

**Dentro del alcance:**
- Catálogo público de productos con stock en tiempo real
- Pedidos anónimos (sin registro de cliente)
- Panel admin para Emi: gestión de productos, inventario y pedidos
- Control de inventario automático (descuento al pedir, devolución al cancelar)
- Manejo de race conditions (dos clientes pidiendo el último artículo simultáneamente)
- Link a WhatsApp de Emi para contacto directo

**Fuera del alcance:**
- Pagos en línea (el cobro se hace en persona)
- Cuentas de cliente / historial de pedidos por cliente
- Notificaciones push o por correo
- App nativa (iOS/Android) — solo web responsive
- Multi-tienda o multi-administrador

---

## Restricciones y No-Negociables

- **Hosting 100% gratuito** (Vercel free tier + Supabase free tier)
- **Mobile-first**: clientes principalmente en celular; Emi en celular, tablet y computadora
- **Sin backend propio**: toda la lógica de servidor vive en Supabase (PostgreSQL functions + RLS)
- **Sin pagos en línea**: la app solo registra el pedido

---

## Criterios de Éxito

- Un cliente puede ir del catálogo al pedido confirmado en menos de 3 pasos
- Emi puede marcar un pedido como entregado desde su celular en menos de 5 segundos
- Si dos clientes piden el último artículo al mismo tiempo, solo uno lo obtiene; el otro recibe un mensaje claro
- El stock se actualiza automáticamente sin intervención manual de Emi al procesar pedidos
- El sistema funciona correctamente dentro de los límites del free tier (< 500 MB de base de datos, < 100 GB de bandwidth/mes en Vercel)

---

## Tecnología

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | SPA mobile-responsive; Vite para build rápido; Tailwind para implementar el estilo visual elegido |
| Hosting frontend | Vercel (free tier) | Sin cold starts, CDN global, deploys automáticos desde Git |
| Base de datos | Supabase (PostgreSQL) | Free tier generoso (500 MB), API REST auto-generada, Auth, RLS y Storage incluidos |
| Auth | Supabase Auth | Login email+contraseña para Emi; clientes son anónimos |
| Seguridad | Row Level Security (RLS) | Clientes solo leen productos y crean pedidos; Emi puede hacer todo |
| Lógica de negocio | PostgreSQL Functions (RPC) | Transacciones atómicas para manejo de stock y race conditions |
| Imágenes | Supabase Storage | Almacenamiento de fotos de productos |

**Alternativas rechazadas:**
- Streamlit: mal soporte móvil, no apto para app de clientes
- FastAPI + Railway: cold starts en free tier, experiencia de usuario degradada
- Firebase: vendor lock-in, pricing poco predecible en escala

---

## Estilo Visual

**Opción C — Cálido y Cercano:**
- Fondo: crema/arena (`#fffdf7`, `#fef9f0`)
- Color primario: verde natural (`#2d6a4f`)
- Acentos: verde claro (`#d8f3dc`), texto oscuro (`#1b4332`)
- Tipografía: sans-serif limpia (Inter o similar)
- Sensación: negocio local, amigable, confiable

---

## Modelo de Datos

### `products`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | Auto |
| name | text | Nombre del producto |
| description | text | Descripción opcional |
| price | decimal | Precio unitario |
| stock | integer | Unidades disponibles |
| image_url | text | URL en Supabase Storage |
| active | boolean | Ocultar sin borrar (temporadas) |
| created_at | timestamp | Auto |

### `orders`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | Auto |
| order_number | text | Código legible: EM-001, EM-002… — generado por secuencia PostgreSQL en `crear_pedido` |
| customer_name | text | Nombre del cliente |
| customer_phone | text | Teléfono de contacto |
| status | enum | `pending` → `delivered` / `cancelled` |
| total | decimal | Suma total del pedido |
| notes | text | Dirección o indicaciones opcionales |
| created_at | timestamp | Auto |

### `order_items`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | Auto |
| order_id | uuid FK | → orders |
| product_id | uuid FK | → products |
| quantity | integer | Unidades pedidas |
| unit_price | decimal | Precio al momento del pedido (snapshot) |

---

## Lógica de Inventario

El descuento y la devolución de stock se ejecutan dentro de una **función PostgreSQL atómica** llamada `crear_pedido`:

1. `SELECT ... FOR UPDATE` bloquea los productos del pedido
2. Verifica que `stock >= quantity` para cada producto
3. Si alguno tiene stock insuficiente → devuelve error con el nombre del producto
4. Si todo está bien → descuenta stock e inserta `order` + `order_items` en un solo commit

**Mensaje de race condition (frontend):**
> "Alguien más tomó el último {nombre_producto}. Por favor, elige otra opción para continuar."

Cuando se cancela un pedido → `products.stock += quantity` (también atómico, función `cancelar_pedido`).

---

## Pantallas

### Vista Pública (Clientes)

1. **Catálogo** — productos activos con stock > 0, foto, nombre, precio, botón "Agregar al carrito"
2. **Carrito** — resumen de selección, ajuste de cantidades, botón "Hacer pedido"
3. **Checkout** — formulario: nombre, teléfono, notas opcionales
4. **Confirmación** — código de pedido `EM-XXX`, estado actual, instrucciones
5. **Rastrear pedido** — ingresar código para ver estado (`pending / delivered / cancelled`)
6. **Link WhatsApp** — visible en catálogo y confirmación para contacto directo con Emi; el número se guarda como variable de entorno en Vercel (`VITE_WHATSAPP_NUMBER`)

### Vista Admin (Emi — requiere login)

1. **Login** — email + contraseña vía Supabase Auth
2. **Pedidos** — lista filtrable por estado (`pending` primero), nombre/teléfono del cliente, total, acciones "Entregar" y "Cancelar"
3. **Detalle de pedido** — productos, cantidades, notas del cliente
4. **Productos** — lista con stock actual, editar, ocultar/mostrar
5. **Agregar stock** — sumar unidades cuando llega mercancía

---

## Fases de Desarrollo

### Fase 1 — Setup (S)
- Crear proyecto Supabase: tablas, RLS, Auth, funciones PostgreSQL
- Crear app React + Vite + Tailwind, aplicar estilo C
- Conectar a Vercel: deploy automático desde Git
- Verificar conexión frontend ↔ Supabase

### Fase 2 — Panel Admin (M)
- Login / logout de Emi
- CRUD de productos con subida de imagen
- Vista y filtrado de pedidos
- Acciones: marcar entregado, cancelar (con devolución de stock)
- Actualización manual de stock

### Fase 3 — Tienda Cliente (M)
- Catálogo con filtro de activos y con stock
- Carrito con ajuste de cantidades
- Checkout anónimo y confirmación con `EM-XXX`
- Página de rastreo de pedido por código
- Link a WhatsApp de Emi

### Fase 4 — Integración y Pulido (S)
- Transacción atómica `crear_pedido` con manejo de race condition
- Mensaje de "se agotó" con nombre del producto
- Optimización móvil completa (Emi y clientes)
- Validaciones de formularios (teléfono, campos requeridos)
- Pruebas manuales del flujo completo

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Supabase pausa proyectos free tras 7 días sin actividad | Con uso regular no ocurre; plan Pro ($25/mes) como alternativa futura |
| Dos clientes piden el último artículo simultáneamente | Función atómica con `SELECT FOR UPDATE` lo previene |
| Vercel bandwidth limit (100 GB/mes free) | Más que suficiente para este volumen de negocio |
| Pérdida de código de pedido por el cliente | La página de rastreo acepta el código; Emi puede buscarlo por teléfono en el admin |
