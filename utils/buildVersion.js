// utils/buildVersion.js
// Una sola perilla para invalidar todos los cachés del navegador — ISS-044.
//
// Antes, cada archivo se invalidaba por su cuenta: `owner.html` y `owner.css`
// viajaban en ASSETS del service worker y se renovaban al bumpear su `CACHE`,
// pero los módulos JS se pedían siempre con la misma URL y quedaban a merced
// del caché HTTP del navegador. Un deploy podía dejar un `utils.js` viejo junto
// a un `cocina.js` nuevo: el módulo nuevo llamaba a una función que el viejo no
// tenía, el render se cortaba, y el panel aparecía **vacío** — que el owner lee
// como "se borraron mis datos" (pasó en producción el 2026-08-16).
//
// Ahora `BUILD` viaja en la URL de cada asset (`/js/modules/utils.js?v=11`) y
// en el nombre del caché del SW. Al subirlo, TODAS las URLs cambian a la vez:
// el navegador está obligado a bajar el juego completo y no puede mezclar
// versiones. `app.js` lo inyecta reemplazando `__BUILD__` al servir los HTML y
// el `sw.js`, así que **este es el único número que hay que tocar por deploy**.
//
// Subir BUILD en cada deploy que toque HTML, CSS o JS de `public/`.
const BUILD = '11';

module.exports = { BUILD };
