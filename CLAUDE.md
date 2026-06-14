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

**Estás en: P2 (Tienda/cliente) — diseño ✅ + plan ✅ aprobados y commiteados; falta IMPLEMENTAR.** Rama de trabajo: **`feat/p2-tienda-cliente`** (asegúrate de estar en ella: `git checkout feat/p2-tienda-cliente`).

**Lee SOLO esto (el plan trae TODO el código inline — NO releas el `src/`):**
1. `docs/superpowers/plans/2026-06-13-p2-tienda-cliente.md` — **plan de implementación (fuente de verdad para ejecutar).** Trae, por tarea, el test y la implementación completos.
2. (Solo si necesitas contexto de decisiones) `docs/superpowers/specs/2026-06-13-p2-tienda-cliente-design.md`. La memoria del proyecto se auto-carga.

**Siguiente paso:** ejecutar el plan con la skill `superpowers:subagent-driven-development` (o `executing-plans`), tarea por tarea, **sin releer el código fuente** (el plan ya lo contiene).

**Cadencia acordada:** "dejarlo correr" — las fases de código (rama feature, reversible) corren de corrido con la doble revisión por tarea como control. **PARAR siempre antes de tocar producción.**

**⚠️ Cutover de despliegue (crítico):** la migración `009` hace `DROP` del `crear_pedido` de 4 args y pone `delivery_date NOT NULL` → **rompería el checkout en vivo si se aplica antes** de desplegar el frontend nuevo (solo hay un proyecto Supabase, sin staging). Por eso: escribir el archivo de migración (Tarea 1.1) ahora, desarrollar todo el frontend con tests mockeados (Fases 2-4), y **aplicar la migración a prod JUNTO con el deploy del frontend al final** (Tareas 1.2 + 5.4), en una sola ventana y **con aprobación explícita**.

---

## 🧹 ANTES DE RECOMENDAR /clear

Cuando llegues a un punto limpio y vayas a recomendar `/clear` y darme la frase de arranque:
- Verifica primero que **todo esté guardado** (código/spec commiteado, migraciones aplicadas si hubo, memoria y manual al día).
- **Si la próxima sesión necesitará leer archivos DISTINTOS** a los de la sección "🔄 PRÓXIMA SESIÓN", **edita esa sección** de este `CLAUDE.md` para que apunte a los correctos (y commitea el cambio).
- **Si leerá los mismos**, déjala como está.

---