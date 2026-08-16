# ISS-040 — El monto a pagar no se muestra en la pantalla de Yape/Plin

**Estado:** ✅ **Resuelto 2026-08-16** — pendiente de deploy
**Módulo:** `public/menu.html` (`showPagoStep`, `pagoPendiente`, `#pago-screen`)
**Prioridad:** 🔴 Crítica — ocurre en el momento exacto en que el comensal necesita el dato
para completar el pago; sin él, no puede terminar la transacción con confianza

---

## Síntoma reportado

El usuario, sobre un comensal pidiendo desde `menu.html`:

> "Cuándo está pidiendo un comensal y pasó a pago alertó que no le aparecía la cantidad que
> tenía que pagar justo cuando quería hacer el yape, no recordaba, justo antes de adjuntar la
> captura."

---

## Diagnóstico

El total del pedido/reserva sí se calcula y se guarda en memoria (`pagoPendiente.total`,
`menu.html:893` para pedidos y `:1003` para reservas), pero **nunca se pinta en la pantalla
de pago** (`showPagoStep()`, `menu.html:1022-1047`). Ese paso —donde el comensal elige
Yape/Plin, ve el número al que transferir y sube la foto del comprobante— solo muestra
`#pago-orden-ref` con la cantidad de ítems ("Tu pedido — 3 ítems"), sin ningún monto.

El monto sí existe en dos pantallas, pero ninguna es la que importa en el momento del pago:

- **Antes:** en el carrito (`cart-total-bar`/`cart-total-drawer`), que el comensal ya cerró
  al pasar a pagar.
- **Después:** recién en el repaso final (`#repaso-total`, `showRepasoStep()`,
  `menu.html:1147`), que aparece **después** de elegir método, subir la foto y tocar
  "Ya pagué" — cuando la transferencia ya se hizo.

Es decir: el único hueco sin el monto es exactamente la pantalla donde el comensal abre su
app de Yape/Plin y necesita el número a transferir. Coincide con lo reportado: se olvida
justo antes de adjuntar la captura.

---

## Reproducción

1. Abrir `menu.html`, agregar ítems al carrito, tocar "Confirmar pedido" con un restaurante
   que tenga Yape/Plin activos.
2. En la pantalla "💳 ¿Cómo vas a pagar?", elegir Yape o Plin.
3. Observar: se muestra el número a transferir y el campo para subir la foto, pero en ningún
   punto de esa pantalla aparece cuánto hay que pagar.

---

## Solución implementada (2026-08-16)

Bloque "Total a pagar" en `#pago-screen`, entre el subtítulo de ítems y los botones de
método — lo primero que se ve al entrar a la pantalla.

1. **`public/menu.html`, `#pago-screen`:** nuevo bloque con `#pago-total`, en caja
   `--accent-light` con borde `--accent`. Va **`position:sticky; top:0`** dentro del
   contenedor scrolleable: el hueco real no era solo "entrar a la pantalla" sino *bajar a
   subir el comprobante* — sin sticky, el monto se iba arriba justo cuando el comensal
   vuelve de su app de Yape con la captura.
2. **`showPagoStep()`:** desestructura `total` de `pagoPendiente` y lo pinta con
   `Number(total || 0).toFixed(2)`. El valor ya venía calculado e **incluye el cargo por
   tapper y la tarifa de delivery** (`menu.html:893` para pedidos, `:1003` para reservas) —
   no se recalculó nada, solo faltaba mostrarlo.
3. **`public/sw.js`:** `CACHE` a `menupro-v9`. `menu.html` está en `ASSETS`, así que sin el
   bump los celulares con la PWA instalada seguirían viendo la pantalla vieja (ISS-022).

Sirve igual para **efectivo**: el bloque no depende del método elegido, así que el comensal
que paga en efectivo también ve cuánto tiene que preparar.

---

## Verificación

`scripts/test-monto-pago-visible.js` (Playwright, viewport 360×600 — gama media real, con
poca altura a propósito para forzar el scroll). **9/9:**

- el monto es visible al entrar y muestra `S/ 33.50` (2 decimales);
- se lee de lejos: 24px computados;
- sin overflow horizontal a 360px y el bloque entra completo en el ancho;
- **sticky confirmado:** con `#pago-screen` scrolleado al fondo y el campo de comprobante
  abierto, el monto sigue en pantalla (`y=56`);
- con efectivo el monto sigue visible;
- coincide con el total del repaso final (si divergieran, el comensal transferiría un
  importe distinto al que confirma).

`npx jest` → **408/408 verde** (el fix no toca backend).

Revisado además en captura clara y oscura: el contraste del bloque funciona en los dos temas.

---

## Pendiente

- **Deploy** (lo hace el usuario).
- Confirmar con la dueña del piloto #1, en uso real, que el comensal ya no pregunta el monto.
