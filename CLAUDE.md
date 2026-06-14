# CLAUDE.md

---

## 📋 ESTÁNDARES

Local: C:\Users\Karim Acuna\OneDrive\Desktop\Programs\CLAUDE\Standards
GitHub: https://github.com/karimacuna2008/Code-Standards.git

### Cómo usar los Estándares:
- Si trabajas con **Python** → lee `python/INDEX.md` dentro de la carpeta Standards
- Si trabajas con **Planeación/Git/Documentación** → lee `general/INDEX.md` dentro de la carpeta Standards
- Cada `INDEX.md` contiene la lista de archivos disponibles y cuándo usar cada uno

---

## 🔒 1. PUERTA DE VALIDACIÓN OBLIGATORIA

Después de presentar el plan y las justificaciones, debes detenerte y pedir validación para cada cambio específico. **No estás autorizado a ejecutar, escribir o guardar ningún código hasta que el usuario confirme explícitamente cada paso.**

NUNCA modifiques nada sin aprobación explícita. Siempre pregunta: "¿Apruebas este cambio? Sí/No" antes de continuar.

El idioma depende del que se utilice en la sesión.

---

## 📝 2. GESTIÓN DE CAMBIOS Y JUSTIFICACIÓN

Tienes prohibido ejecutar cambios o escribir código final hasta que se complete el siguiente proceso de justificación:

### Regla "Plan Primero"
Proporciona primero un resumen estructurado de todos los cambios propuestos.

### Razonamiento por Dominio
- **Ciencia de Datos e IA/ML:** Explica la metodología. Justifica por qué se eligió este modelo/enfoque específico sobre las alternativas y por qué se adapta a este caso de uso específico.
- **Tecnología y Librerías:** Identifica todas las librerías/tecnologías a utilizar. Justifica su necesidad y cómo se integran en el stack existente.

### Desglose Técnico Profundo (Scripts y Funciones)
Para cada función o método (nativo o de librería), detalla:
- **Funcionalidad:** Lógica interna y propósito.
- **Parámetros:** Desglose de los argumentos y qué controlan.
- **Valores de Retorno:** Qué devuelve y su impacto en el flujo posterior.
- **Variables:** Desglose de las variables utilizadas y las que se crearán.

---

## ✅ ACERCA DE ESTE PROYECTO

En el .env.local esta el token de supabase para que hagas los edits automaticamente en las tablas.

---

## 🔄 PRÓXIMA SESIÓN — QUÉ LEER AL RETOMAR

> Esta sección la mantiene Claude al día. Indica qué leer al iniciar una sesión nueva para trabajar, **sin releer todo el código**.

**Estás en: P2 ✅ HECHO y verificado en prod (2026-06-14) — mergeado a `main`, desplegado en Vercel, migración `009` aplicada. Siguiente: P3 (Admin: gestión de pedidos).** Empieza en `main` y crea rama nueva para P3 (p.ej. `feat/p3-admin-pedidos`).

**Para arrancar P3, lee:**
1. `docs/MANUAL-aguas-emi.md` §6 (roadmap, entrada **P3 — Admin: gestión de pedidos**) y §7 (decisiones: total personalizado = override; recálculo siempre al editar; "venta" = solo `delivered`).
2. Archivos a releer (de la tabla §"qué releer por fase", fila P3): `AdminOrdersPage.jsx`, `OrderCard.jsx`, `OrderList.jsx`, `useOrders.js` + diseñar las RPC de edición (`agregar_a_pedido` ya existe de P2; faltan `quitar_de_pedido`, `marcar_entregado`, edición de total). La memoria del proyecto se auto-carga.
3. Si P3 lleva diseño/visual, usar `superpowers:brainstorming` → spec → plan antes de implementar.

**Cadencia acordada (sigue vigente):** "dejarlo correr" — fases de código en rama feature corren de corrido con la revisión por tarea como control. **PARAR siempre antes de tocar producción** y pedir aprobación explícita para el cutover (migración + deploy).

---

## 🧹 ANTES DE RECOMENDAR /clear

Cuando llegues a un punto limpio y vayas a recomendar `/clear` y darme la frase de arranque:
- Verifica primero que **todo esté guardado** (código/spec commiteado, migraciones aplicadas si hubo, memoria y manual al día).
- **Si la próxima sesión necesitará leer archivos DISTINTOS** a los de la sección "🔄 PRÓXIMA SESIÓN", **edita esa sección** de este `CLAUDE.md` para que apunte a los correctos (y commitea el cambio).
- **Si leerá los mismos**, déjala como está.

---