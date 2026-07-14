# ISS-021 — Foto de comprobante en Cola: no carga / rompe la app instalada

**Módulo:** `owner.html` (PWA instalada) — `pedidos.js`, `ordenes.js`, `reservas.js`
**Prioridad:** 🟠 Alta
**Estado:** ✅ Resuelto 2026-07-13

## Reporte original

"La foto del screenshot en cola no se puede abrir, genera error y luego volver a abrir la app demora mucho". Al pedir más detalle: "cuando entra a cola a ver la foto de pago de yape, no carga esa foto" y luego "sale de la app y como que quiere volver a abrir la app pero no llega a abrir, abrió una vez, y luego no abre solo se cierra la app".

## Diagnóstico

Se descartaron dos hipótesis con evidencia del servidor antes de llegar a la causa real:
1. **Límite de tamaño** (Nginx `client_max_body_size 5M` = límite de Multer): descartado — `ls -la public/uploads/comprobantes/` en producción mostró archivos reales entre 26KB y 1.2MB, todos bien por debajo del límite.
2. **Archivo faltante/corrupto en disco:** descartado — los archivos existen con tamaños normales.

**Causa real:** `owner.html` está instalado como **PWA standalone** (`manifest.json`: `"display": "standalone"`, `"start_url": "/owner.html"`). El helper `comprobanteThumb()` (duplicado en `pedidos.js`, y como bloques inline en `ordenes.js`/`reservas.js`) envolvía la miniatura en:

```html
<a href="/uploads/comprobantes/comp-XX.jpg" target="_blank"><img ...></a>
```

`target="_blank"` dentro de una PWA instalada en modo standalone no tiene un contenedor de pestañas donde abrir el link — el sistema operativo intenta sacar al usuario hacia el navegador, y en muchos celulares (sobre todo iOS) eso deja la PWA en un estado roto: se cierra y no vuelve a abrir con normalidad. Es un anti-patrón conocido de PWAs instalables.

`menu.html` no tiene este problema porque normalmente se usa desde el navegador (no instalado), y además ya usa un modal in-app (`openPhotoModal`) para las fotos de platos — el mismo patrón que faltaba aplicar a los comprobantes en `owner.html`.

## Fix

- **`public/js/modules/utils.js`** (nuevo, compartido): `comprobanteThumb(x)` — genera la miniatura sin `<a target="_blank">`, con `onclick="verComprobante(url)"`. Más `verComprobante(url)` / `cerrarComprobante(event)` que abren/cierran un modal in-app.
- **`public/owner.html`**: nuevo modal `#comprobante-modal` (imagen a pantalla completa + botón ✕, cierra también al tocar el fondo).
- **`public/css/owner.css`**: estilos `.comprobante-modal` (overlay oscuro, imagen centrada, botón ✕ de 44×44px).
- **`public/js/modules/pedidos.js`**: eliminada su copia local de `comprobanteThumb()` (ahora usa la de `utils.js`).
- **`public/js/modules/ordenes.js`** y **`reservas.js`**: sus bloques inline duplicados con `<a target="_blank">` reemplazados por una llamada a `comprobanteThumb()`.

De paso se eliminó la triplicación del mismo snippet (existía una copia casi idéntica en `pedidos.js`, `ordenes.js` y `reservas.js`) — ahora hay una sola implementación en `utils.js`.

## Verificación

`scripts/test-fixes-pago-comprobante.js` (Test 2) — flujo real de punta a punta con Playwright: crea una orden vía API pública, sube un comprobante real (multipart), loguea como owner, navega a Órdenes → Activas, y confirma:
- La miniatura se renderiza y **ya no** está envuelta en `<a target="_blank">`.
- Tocarla abre `#comprobante-modal` **sin abrir ninguna pestaña/ventana nueva** (verificado contando `context.pages()` antes/después).
- El modal muestra la foto correcta y cierra con el botón ✕.

**254/254 jest verde.** Nota aparte: el `FOREIGN KEY constraint failed` de los logs de producción (ver ISS-020) no correlacionó con este bug — queda como asunto separado, a monitorear con el logging mejorado. Pendiente: desplegar a producción.
