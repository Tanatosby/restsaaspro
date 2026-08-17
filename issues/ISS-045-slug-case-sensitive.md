# ISS-045 — Link del menú da "Cannot GET" si llega con mayúscula (case-sensitive)

**Estado:** ✅ **Resuelto 2026-08-17** — pendiente de deploy.
**Módulo:** `app.js` (rutas `/:slug` y `/:slug/:mesa`)
**Prioridad:** 🟠 Alta — rompe el acceso al menú desde fuera del navegador (WhatsApp, notas,
apps de mensajería) para cualquier restaurante con URL personalizada configurada.

---

## Síntoma reportado

El usuario reportó (con captura, `issues/screenshots/dontget.jpeg`):

> "creo que hay un screenshot: dontget, solo pasa en la app, cuando hago clic en el link de
> karinamenu, me da ese error, pero en web, entrando manualmente a la url:
> menupro.tech/karinamenu sí me aparece el menú"

La captura muestra: `Cannot GET /Karinamenu` — con **K mayúscula**.

- Escribiendo la URL a mano en el navegador (`menupro.tech/karinamenu`, minúsculas) → funciona.
- Abriendo el mismo link desde "la app" (mensajería / notas, no el navegador) → 404.

---

## Diagnóstico

El slug **siempre se guarda en minúsculas** en la base de datos: `PATCH /api/menu/config/slug`
(`routes/menu.js:896`) hace `.toLowerCase()` sobre el valor recibido y además valida con una
regex que solo permite `a-z0-9-`. Nunca puede existir un slug con mayúscula en la tabla
`restaurantes`.

El problema estaba en la resolución de la ruta, en `app.js:188-203`:

```js
const rest = db.prepare(`SELECT id FROM restaurantes WHERE slug = ? AND activo = 1`).get(slug);
```

Esa comparación en SQLite es **case-sensitive** por defecto. Si la request llega con
`/Karinamenu` (K mayúscula), no matchea contra el `karinamenu` guardado, la ruta cae a
`next()` y termina en el 404 genérico de Express.

**Por qué solo pasa "en la app" y no tipeando la URL:** al escribir la URL en la barra del
navegador el usuario la tipea en minúsculas. Pero cuando el link se abre desde otra app
(WhatsApp, notas, etc.), es común que el teclado (autocorrección tipo Gboard) auto-capitalice
la primera letra por tratarla como inicio de mensaje/oración, convirtiendo `karinamenu` en
`Karinamenu` antes del tap. Es un comportamiento del teclado/app externa, fuera de nuestro
control — el fix es que el servidor lo tolere.

No hay riesgo de ambigüedad entre restaurantes: se verificó que no pueden existir dos slugs
activos que difieran solo en mayúsculas (la regla de guardado ya fuerza minúsculas).

---

## Fix

`COLLATE NOCASE` en las dos consultas de resolución de slug (`app.js`), para que la
comparación sea case-insensitive sin tocar cómo se guarda el slug:

```js
db.prepare(`SELECT id FROM restaurantes WHERE slug = ? COLLATE NOCASE AND activo = 1`).get(slug);
```

Aplica tanto a `/:slug` como a `/:slug/:mesa` (QR de mesa).

---

## Verificación

- Restaurante de prueba con slug temporal `testslug045`: `/testslug045`, `/Testslug045` y
  `/TESTSLUG045` redirigen los tres al mismo `id` (302 → `/menu?restaurante=1`).
- Slug inexistente sigue devolviendo 404 (sin falsos positivos).
- 758/758 tests de Jest en verde tras el cambio.
