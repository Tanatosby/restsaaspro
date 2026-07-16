# ISS-018 — Botón "Ya pagué" no visible / sin scroll en la pantalla de pago

**Módulo:** `menu.html` (cliente)
**Prioridad:** 🔴 Crítica — bloqueaba pagos reales
**Estado:** ✅ Resuelto 2026-07-13

## Reporte original

El usuario compartió 3 capturas (`issues/screenshots/issue_error_pago_no_se_ve_boton_1.jpeg`, `_2.jpeg`, `_3.jpeg`) de una clienta real a quien, tras elegir método de pago (Yape) y subir la foto del comprobante, no le aparecía el botón "✓ Ya pagué". El proceso se veía "cortado" y no se podía hacer scroll hacia abajo para alcanzarlo.

## Diagnóstico

`#pago-screen` usa la clase `.confirm-screen` (`public/css/menu.css:667`):

```css
.confirm-screen {
  position: fixed; inset: 0; justify-content: center; padding: 2rem;
  /* sin overflow-y — el contenido no puede scrollear */
}
```

Es una pantalla de posición fija, centrada verticalmente, **sin `overflow-y`**. Cuando el contenido crece (método elegido + número + botón "Copiar número" + instrucciones + foto de comprobante ya seleccionada) y no entra en el alto disponible del celular (agravado en iPhone por las barras de Safari, visibles en las capturas), el navegador recorta arriba y abajo por igual sin dejar forma de alcanzar el contenido cortado.

Dato revelador: `#estado-screen` (otra pantalla del mismo tipo, la de "consulta tu código de reserva") ya tenía `overflow-y:auto` puesto inline — el fix se había aplicado ahí pero no en `#pago-screen`.

## Fix

`public/menu.html` — `#pago-screen` ahora tiene `style="justify-content:flex-start;overflow-y:auto"` (mismo patrón que `#estado-screen`).

## Verificación

`scripts/test-fixes-pago-comprobante.js` (Test 1) — Playwright con viewport reducido a propósito (390×550, simula un celular con las barras de Safari ocupando espacio vertical):
- Confirma `overflow-y:auto` en el elemento.
- Confirma que en ese viewport el contenido efectivamente desborda (`scrollHeight=594 > clientHeight=550`) — reproduce el escenario real del bug.
- Confirma que el botón "Ya pagué" es alcanzable haciendo scroll hasta el fondo.

**254/254 jest verde** (sin cambios de backend). Pendiente: desplegar a producción.
