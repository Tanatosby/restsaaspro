# ISS-094 — Crear las mesas era de a una, y "Agregar manual" dependía de que existieran

**Estado:** ✅ Resuelto el 2026-09-13 — desplegado el 2026-09-13 (`b5e471b`), sin verificar en uso real
**Encontrado:** 2026-09-13, pedido del usuario: *"¿puedes mejorar la parte de crear mesas para
hacerlo más rápido? No sé si sea necesario tener todas las mesas en el mapa para el cambio que
hemos hecho"* (el cambio: "Por cobrar" por mesa, ISS-089)
**Módulo:** `routes/mesas.js`, `utils/mesas.js`, `routes/orders.js`, `public/js/modules/config.js`,
`public/js/modules/pedidos.js`, `public/owner.html`
**Prioridad:** 🟡 Media — fricción de alta de un restaurante nuevo + un pedido manual podía quedar
fuera de la cuenta de su mesa

**Mockup:** [`ISS-094-crear-mesas-mockups.html`](ISS-094-crear-mesas-mockups.html) ·
https://claude.ai/code/artifact/3e2d3b49-996b-41fb-be4a-44c32f03a517

---

## Qué pasaba

1. **Crear mesas era de a una:** número + capacidad + "+ Agregar mesa". Karina tiene 20 mesas y el
   target llega a 40-50. Además los campos medían 80 px de ancho con poco relleno, y la ✕ para
   borrar cada mesa era diminuta (bajo el mínimo de 44 px).
2. **"Agregar manual" tenía un selector de las mesas creadas.** Si la dueña no las había creado,
   solo ofrecía "Sin mesa", y ese pedido no se juntaba en "Por cobrar" con los pedidos por QR de
   su mesa.

## Qué depende de la lista de mesas (tabla `mesas`)

| Lugar | ¿Usa la lista? |
|---|---|
| "Por cobrar" por mesa (ISS-089) | **No** — agrupa por `ordenes.mesa` / `reservas.mesa` (`claveMesaItem()`) |
| Pedido por QR | **No** — la mesa viene en el link (`/:slug/:mesa` → `menu?mesa=N`) |
| Generador de QR por mesa | **No** — genera `1..N` con el número que se escriba |
| Asignar mesa a una reserva | **No** — número libre |
| "Agregar manual" | Sí, hasta hoy → **ya no** (ver abajo) |
| Plano de mesas | **Sí** — única dependencia que queda |

El número es lo que une todo: el QR de la mesa 5 y un pedido manual escrito "5" quedan los dos con
`mesa = 5` (la columna es `INTEGER`, así que el `"5"` que llega del link se guarda como entero).

## Decisiones del usuario (sobre el mockup)

- Le gustaron la pantalla **A** (un número + un botón) y la **D** (mesa escrita a mano).
- **"Agregar manual": siempre número**, haya o no mesas creadas. Más rápido con el teclado numérico
  que buscar en una lista de 20-50, y coincide siempre con el QR. Se pierde ver "libre/ocupada" en
  el selector.
- **Configuración → Mesas: solo el formulario + un resumen.** Se descartaron la grilla de números y
  el modo "quitar o agregar una mesa" del mockup (pantallas B y C): con "Agregar manual" escrito a
  mano, la lista solo alimenta el plano.

## Qué se hizo

- **`POST /api/mesas/lote`** `{ cantidad }` (1-100, mismo tope que el QR) → `utils/mesas.js::crearMesasLote()`:
  `INSERT OR IGNORE` de la 1 a la N en una transacción, capacidad 4. **Nunca borra ni modifica**:
  repetir no duplica, un número menor no quita nada, respeta la capacidad de las creadas a mano.
  Devuelve `{ creadas, total }`.
- **Configuración → Mesas:** *"¿Cuántas mesas tiene tu local? [20] → Crear mesas"*. Con mesas, el
  resumen dice *"Tienes 20 mesas: 1 a 20."* (rangos, p. ej. "1 a 20, 30") y el botón pasa a
  *"Crear las que faltan"*. Un texto debajo anticipa qué va a pasar antes de tocar
  (*"Se agregan las mesas 21 a 25. No se borra ninguna."*). Sin capacidad (solo se veía en el
  plano). Input de 16 px+ y 44 px de alto.
- **Ya no hay pantalla para borrar mesas.** Los endpoints `POST /`, `PATCH /:id` y `DELETE /:id`
  siguen existiendo.
- **QR por mesa:** "Número de mesas" arranca con la mesa más alta creada (antes, 10 fijo).
- **"Agregar manual":** `<input type="number" inputmode="numeric">` en vez del `<select>`; ya no
  pide `/api/mesas/estado`. El modal valida entero > 0 (y `validity.badInput`, para no mandar como
  "sin mesa" algo que no es número).
- **`POST /api/orders`** valida y normaliza la mesa con `normalizarNumeroMesa()`: vacío → `NULL`,
  `" 12 "` → 12, `0`/`2.5`/`abc` → 400. Antes guardaba `mesa || null` sin validar.

## Verificación

- `tests/mesas-lote.test.js` **31 casos** · jest **524/524**.
- `scripts/test-iss094-mesas.js` **30/30**: crear 20, repetir sin duplicar, ampliar a 25, un número
  menor no borra, 0 no crea; 360 px con la letra al ×1,7 sin overflow y todo ≥ 44 px; "Agregar
  manual" **sin ninguna mesa creada** escribiendo 97 + un pedido por QR de la mesa 97 → los dos
  `mesa = 97 (integer)` y **una sola fila "Mesa 97 · 2 pedidos"** en "Por cobrar"; mesa inválida
  rechazada en el modal y en el servidor. Guarda y restaura las mesas de la BD de desarrollo.
- Sin regresión: `test-agregar-manual` 35/35, `test-iss089-cobrar-por-mesa` 39/39,
  `test-cobrar-homologado` 14/14, `test-iss090-pedido-directo-cocina` 17/17,
  `test-iss091-auto-entregado` 22/22.

## Pendiente

- ~~Deploy~~ — desplegado el 2026-09-13 (`b5e471b`).
- Ver a la dueña crear las mesas y tomar un pedido manual escribiendo la mesa en hora pico.
- Si algún día hace falta quitar mesas desde la pantalla, el diseño está en el mockup (pantalla C).
