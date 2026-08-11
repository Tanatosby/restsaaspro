# ISS-029 — Cargo de tapper fijo en vez de por unidad (Gap 5)

**Estado:** ✅ Resuelto — 2026-08-11
**Módulo:** `routes/public.js`, `utils/menuPricing.js`, `public/menu.html`
**Prioridad:** 🟡 Media — afectaba a producción, cobraba de menos en cada pedido de 2+ ítems para llevar

---

## Reporte del usuario

> "cuando se asigna para llevar y son + de 1 menú por llevar igual cobra 1.5, por ejemplo si un pedido
> en una mesa hace 2 menús solo se le suma S/1.5, pero debería sumar 3 soles y así consecutivamente"

---

## Diagnóstico

El cargo por modalidad "para llevar"/"delivery" (`costo_tapper`, Gap 5) se calculaba como un **monto
fijo por orden/reserva**, sin importar cuántos ítems se pedían:

```js
// routes/public.js (antes)
const cargo_modalidad = modalidad === 'para_llevar' ? (rest.costo_tapper ?? 0) : 0;
```

Cada menú del día (y, por decisión del usuario en esta misma sesión, cada plato a la carta) necesita su
propio envase para llevar — el cargo debía escalar por unidad, no ser plano. El mismo patrón estaba
duplicado 4 veces en `public/menu.html` (cálculo en vivo del carrito de orden y de reserva).

**Dificultad:** la BD no guarda un ID de "instancia de menú" — solo filas por sección elegida
(`orden_menu_items`/`reserva_menu_items`). Se deduce la cantidad de menús contando las filas de
secciones **obligatorias** por `id_menu_dia` y dividiendo entre el total de secciones obligatorias de
ese menú (cada unidad de menú aporta exactamente 1 fila por sección obligatoria) — mismo patrón de
agrupación que ya usaba `utils/totales.js` para prorratear el precio del menú entre sus secciones.

---

## Solución

- `utils/menuPricing.js` — nueva `contarUnidadesMenu(menuItems)`, misma lógica de agrupación por
  `id_menu_dia`/`total_obligatorias` que `calcularMenuTotal`.
- `routes/public.js` — nuevos helpers `enriquecerMenuItems()` (consulta `componentes_menu_dia` +
  `menu_secciones` para los `menu_items` recibidos) y `calcularCargoModalidad()`:
  `cargo = costo_tapper × (unidadesMenu + Σ cantidad de carta_items)`, + `tarifa_delivery` fija si
  aplica. Reemplaza el cálculo fijo en `POST /orders` y `POST /reservations`.
- `public/menu.html` — `contarTappers(cartArr)` cuenta 1 por cada entrada de menú en el carrito + la
  cantidad de cada ítem de carta; usado en los 4 puntos donde se mostraba/enviaba el cargo (orden y
  reserva, con y sin pago pendiente).

## Alcance ampliado a pedido del usuario

El plan original solo cubría menús del día (`carta_items` quedaba fuera, ver Gap 10 en
`vision_negocio.md`). El usuario pidió sumarlo también: cada unidad de plato a la carta para llevar
ahora suma su propio tapper.

---

## Verificación

- `tests/precio-modalidad.test.js` ampliado: 29 casos (antes 21), cubriendo múltiples menús, menús con
  secciones opcionales, menús distintos combinados, y mezcla menú + carta.
- Smoke test manual end-to-end contra la BD real (`_smoke-tapper.js`, descartado tras la corrida):
  `POST /api/public/orders` con 2 menús (2 secciones obligatorias c/u) + 2 unidades de carta →
  `cargo_modalidad = 6.00` (2+2 × S/1.50) ✅; `POST /api/public/reservations` con 1 menú + delivery →
  `cargo_modalidad = 4.50` (1 × S/1.50 + S/3.00 tarifa) ✅. Restaurante/menú/orden/reserva de prueba
  limpiados al final, sin residuos en `database.sqlite`.
- Suite completa: 325/325 jest verde (317 previos + 8 nuevos).

---

## Relacionado

`vision_negocio.md` Gap 5 (precio por modalidad) y Gap 10 (cubiertos descartables para à la carta,
sigue siendo una feature aparte — cubre menaje/utensilios opcionales, no el envase que ya cubre este
fix).
