# ISS-051 — Detección de comprobante Yape/Plin reutilizado

**Estado:** ✅ **Resuelto 2026-08-19.**
**Módulo:** `utils/comprobanteDuplicado.js` (nuevo), `routes/public.js` (`handlePago()`),
`public/js/modules/utils.js` (`comprobanteThumb()`), `routes/orders.js`,
`routes/reservations.js`, `utils/colaDia.js`.
**Prioridad:** 🟠 Alta — pregunta real de la dueña, día 4 del piloto.

---

## Síntoma reportado

La dueña, día 4 del piloto: *"¿qué pasa si un chico comparte su pago de Yape con otro y ambos
envían la misma captura?"*. Diagnosticado ese mismo día (`routes/public.js` guardaba el
comprobante sin comparar nada — cero detección de duplicados), sin implementar hasta ahora.

## Decisión de diseño

**Avisar al owner, no bloquear al comensal.** El owner ya revisa cada comprobante a mano antes
de poder tocar "✓ Confirmar pago" (gate ya existente) — tiene el contexto para decidir si es
sospechoso. Bloquear la subida del lado del comensal lo dejaría varado en el paso final del
pedido sin ninguna salida clara, justo el tipo de fricción que se acaba de sacar con ISS-049.

**Limitación conocida y aceptada:** solo atrapa el archivo **idéntico** (mismos bytes). Si el
segundo comensal le saca una captura de pantalla a la captura del primero, el hash cambia y no
lo agarra — no tiene una solución barata.

## Implementación

- `utils/comprobanteDuplicado.js` nuevo: `calcularHashArchivo()` (SHA-256) y
  `buscarComprobanteRepetido()` — busca el hash en `ordenes` y `reservas` **del mismo
  restaurante**, excluyendo el propio registro (para no marcarse a sí mismo si el comensal
  reintenta subir su propia foto).
- Columnas nuevas `comprobante_hash`, `comprobante_repetido_de`, `comprobante_repetido_tipo`
  (nullable, sin backfill) en `ordenes` y `reservas`.
- `handlePago()` calcula el hash al guardar el archivo y guarda la referencia si ya existía.
- `comprobanteThumb()` (compartida por Órdenes, Reservas y Cola del día) pinta un aviso rojo
  "⚠️ Ya usado en el pedido/la reserva #N" cuando corresponde — el comensal no ve nada distinto
  en ningún caso.

## Verificación

`tests/comprobante-duplicado.test.js` — **8/8** (hash estable, detecta en órdenes y en reservas,
no cruza restaurantes, no se marca a sí mismo en un reintento, el caso real de dos pedidos
distintos con la misma foto). `scripts/test-comprobante-duplicado.js` — **7/7** E2E: sube el
mismo comprobante en 2 pedidos distintos y confirma que el segundo queda marcado y el primero
no, sube un tercero con foto distinta y confirma que no hay falso positivo, y que el comensal
nunca ve ningún bloqueo. 457/457 jest + `test-numero-dia-pedido` 10/10, `test-iss049` 12/12,
`test-iss048` 15/15 y `test-modalidad-mixta` 19/19 sin regresiones.
