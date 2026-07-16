# ISS-015 — La foto de un plato no se actualiza en pantalla tras "Cambiar foto"

- **Módulo:** MENÚ DEL DÍA / CARTA (fotos de platos)
- **Fecha:** 2026-06-06
- **Estado:** 🟢 Fix implementado y desplegado a producción (2026-06-06) — pendiente de verificación funcional del owner
- **Prioridad:** Alta (el owner no puede actualizar las fotos de sus platos)

## Síntoma

Al usar **"Cambiar foto"** en un plato, el sistema muestra el toast verde **"Foto actualizada"** (la subida al servidor sí tiene éxito), pero la imagen **no cambia en pantalla**: sigue viéndose la foto anterior o un placeholder gris.

Capturas:
- `screenshots/carga_foto.png` — "Ají de gallina" con toast "Foto actualizada".
- `screenshots/no_actualiza.png` — "Sopa criolla" sin imagen tras intentar actualizar.

## Diagnóstico — causa raíz

**Caché del navegador por nombre de archivo fijo.** El backend guarda la foto siempre con el mismo nombre:

```js
// routes/menu.js:864-866 — makeUploadPlato()
filename(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, `plato_${req.params.id}${ext}`);   // nombre SIEMPRE igual (ej. plato_5.jpg)
}
```

El flujo en `owner.html` (`uploadFotoPlatoMenu`, línea ~1299) es correcto: hace `POST /api/menu/platos-menu/:id/foto`, recibe 200, muestra `toast('Foto actualizada')` y llama `loadPlatosMenu()` para re-renderizar. Pero como el archivo conserva el **mismo nombre**, la `url_foto` en la BD no cambia (`/uploads/platos-menu/plato_5.jpg`). Al re-dibujar `<img src="/uploads/platos-menu/plato_5.jpg">` con la misma URL, el navegador usa la **copia cacheada** y no descarga la imagen nueva.

- El **upload sí funciona** (el archivo en el servidor se reemplaza correctamente).
- Lo que falla es la **visualización**: misma URL → caché del navegador → foto vieja / 404 cacheado (gris).
- Afecta a todas las vistas que pintan `url_foto` con URL estable: `plato-picker.js:177`, miniaturas de owner, y el menú público `menu.html`.

> Nota: el reporte inicial mencionaba un "error del servidor" al cambiar la foto, pero ese 500 era de **otra** acción (DELETE de plato referenciado, ver más abajo). El problema de la foto NO da error 500 — da "Foto actualizada" pero no refresca.

## Solución propuesta

**Nombre de archivo único por versión** (rompe el caché de forma definitiva):

```js
// routes/menu.js — makeUploadPlato(), filename()
cb(null, `plato_${req.params.id}_${Date.now()}${ext}`);
```

Cada subida genera una URL nueva → el navegador la trata como imagen distinta → se ve al instante. El borrado del archivo anterior ya existe en `subirFotoPlato()` (`fs.unlinkSync(plato.url_foto)` usando la URL vieja de la BD), así que no se acumulan archivos.

**Pasos:**
1. Cambiar `filename` en `makeUploadPlato` (afecta menú y carta a la vez).
2. Verificar que el borrado del archivo anterior siga correcto con el nombre versionado.
3. Probar: subir foto 2 veces al mismo plato → la miniatura cambia sin recargar.
4. Deploy (`git pull` + `pm2 restart`).

**Alternativa descartada:** cache-buster `?v=Date.now()` en cada render del frontend — funciona pero hay que tocarlo en cada `<img>` y, si se usa `Date.now()` en cada render, recarga la imagen siempre (desperdicia caché). El nombre versionado en backend es más limpio y global.

## Nota sobre el error 500 al eliminar (NO es bug)

Durante el diagnóstico se observó que `DELETE /api/menu/platos-menu/:id` falla con `FOREIGN KEY constraint failed` cuando el plato está en uso en un menú del día. **Esto es comportamiento esperado y correcto**: no se deben eliminar platos referenciados por el historial de órdenes/reservas (preserva la reportería, ver ISS-014). Decisión del owner (2026-06-06): **no cambiar** este comportamiento. Queda documentado aquí solo para evitar reabrirlo como bug en el futuro.

Cadena de FKs que protege el historial:
```
platos_menu → componentes_menu_dia → orden_menu_items / reserva_menu_items
```
