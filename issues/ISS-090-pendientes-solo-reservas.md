# ISS-090 — "Pendientes" desaparece para órdenes

**Estado:** ✅ Implementado el 2026-09-12 — **sin desplegar**, sin verificar en uso real
**Origen:** revisión del flujo de la cola durante ISS-089
**Módulo:** `routes/public.js` · `public/js/modules/pedidos.js`
**Prioridad:** 🟡 Media — no es un bug, es un paso de más en hora pico

---

## El problema

Todo pedido que el comensal hace desde su celular nace con `es_inicial` (`routes/public.js:354`) y
cae en la zona **Pendientes**, donde alguien tiene que tocar "🍳 A cocina" para que avance. Los
pedidos manuales no pasan por ahí: nacen con `es_en_cocina` (`routes/orders.js`, `manual:true`).

La justificación de esa parada era que ahí se revisa el comprobante de Yape/Plin antes de que la
cocina gaste insumos. **En el uso real no ocurre.** Palabras del usuario (2026-09-12):

> *"Hoy no es verificación necesaria sino por gusto, es falso eso que se verifican los pagos de Plin
> o Yape en pendientes. Durante un momento de aglomeración la dueña no mira el Yape en pendientes,
> los pasa a veces sin verificar; igual ese mensaje aparece luego en cobrar y sabe que tiene error."*

## Por qué no se pierde nada

- `comprobanteThumb()` (`utils.js`) y el aviso **"⚠️ Ya usado en el pedido #N"**
  (`comprobante_repetido_de`, ISS-051) se pintan en la tarjeta **en todas las zonas**, no solo en
  Pendientes. El aviso llega a "Por cobrar" intacto.
- El backend ya bloquea cobrar un pago digital sin confirmar
  (`requiereConfirmarPagoAntes`, `utils/verificacionPago.js`), y desde ISS-072 el botón "Cobrar" hace
  confirmar + cobrar en un solo tap. **La verificación efectiva ya vive en el cobro**, que es donde
  la dueña sí está mirando el dinero.

## Qué se hizo (2026-09-12)

- **`routes/public.js`** — `POST /api/public/orders` inserta con
  `(SELECT id FROM estatus_orden WHERE es_en_cocina = 1)` en vez de `es_inicial = 1`.
- **`routes/public.js`** — el push pasa de "🆕 Nueva orden" a **"🆕 Nueva orden en cocina"**: el
  pedido ya está para preparar, el cocinero no espera que nadie lo habilite.
- **`pedidos.js`** — `clasificarZonas()` y `btnOrden()` **conservan a propósito** el soporte de
  órdenes `es_inicial` en la zona "Pendientes", documentado en el código. Las que ya estaban en ese
  estado al desplegar tienen que seguir viéndose y poder pasar a cocina; si se quitara el filtro
  quedarían activas pero invisibles — el mismo agujero que obligó a construir el cierre de caja
  (ISS-026). Ninguna orden nueva nace ahí, así que la zona se vacía sola con el uso.
- **No se tocó** `estatus_orden`: la fila `pendiente` / `es_inicial` sigue existiendo.

### Tests

- **Nuevo:** `scripts/test-iss090-pedido-directo-cocina.js` — **17/17**. Cubre: la orden pública nace
  `es_en_cocina` / no `es_inicial` / estatus `preparando`; `clasificarZonas()` manda la orden a cocina
  y deja la vieja `es_inicial` en pendientes; las reservas siguen en pendientes; `btnOrden()` conserva
  "🍳 A cocina" para las viejas; el pedido se ve en `zona-cocina` y no en `zona-pendientes`; y el
  pedido manual sigue entrando a cocina (sin regresión).
- **Adaptado:** `scripts/test-cola-carrera.js` — **21/21**. Sus pruebas de carrera (ISS-026) usaban la
  transición Pendientes → En cocina, que ya no existe para órdenes nuevas: pasaron a
  **En cocina → Listos** ("✅ Listo"), el primer paso manual que le queda a una orden. El mecanismo
  probado es el mismo. De paso se arreglaron dos fallas propias del script, anteriores a este cambio:
  no cerraba los modales de Términos (ISS-082) ni de Novedades (ISS-076) —sus overlays se comían
  todos los clicks— y buscaba el botón por texto con `.first()`, así que con más de un pedido en la
  zona el click caía en el pedido equivocado (ahora va por `onclick*="accionRapidaOrden(<id>,…)"`).
- `jest` **478/478**. E2E sin regresión: `test-cobrar-homologado` 14/14, `test-menus-vendidos` 9/9.
- `scripts/test-agregar-manual.js`: se le agregó el cierre de los mismos dos modales (estaba roto por
  eso). Queda **1 check fallando** — "el chip vacío dice '+ Elegir [sección]'" — que es del widget
  PlatoPicker y **no tiene relación con ISS-090**: el test quedó desactualizado respecto al widget.
  Sin tocar.

## Nota al desplegar

Si al momento del deploy hay órdenes de hoy en `pendiente`, van a seguir en la zona "Pendientes" con
su botón "🍳 A cocina" hasta que se las pase a mano. Es el comportamiento buscado, no un resto.
