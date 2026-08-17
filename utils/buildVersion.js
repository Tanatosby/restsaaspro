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
// `BUILD` viaja en la URL de cada asset (`/js/modules/utils.js?v=<hash>`) y en
// el nombre del caché del SW. Al cambiar cualquier archivo, TODAS las URLs
// cambian a la vez: el navegador está obligado a bajar el juego completo y no
// puede mezclar versiones. `app.js` lo inyecta reemplazando `__BUILD__` al
// servir los HTML y el `sw.js`.
//
// T0 (2026-08-17): `BUILD` dejó de ser un número escrito a mano — era el único
// paso manual del deploy y, si alguien se olvidaba de subirlo, volvía
// exactamente ISS-044. Ahora es un hash sha1 del contenido de los mismos
// archivos que el SW precachea, calculado una sola vez al arrancar el
// servidor. Mismo código → mismo hash: un `pm2 restart` sin cambios no
// invalida los cachés de nadie.
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
// Los mismos archivos que el SW precachea + los HTML que los referencian.
// sw.js queda afuera a propósito: en disco guarda el placeholder __BUILD__,
// así que su contenido no puede depender de su propio hash (recursión).
const RUTAS = ['owner.html', 'menu.html', 'css/owner.css', 'css/menu.css', 'js'];

function calcular() {
  const h = crypto.createHash('sha1');
  const recorrer = p => {
    const st = fs.statSync(p);
    if (st.isDirectory()) return fs.readdirSync(p).sort().forEach(f => recorrer(path.join(p, f)));
    if (/\.(js|css|html)$/.test(p)) h.update(fs.readFileSync(p));
  };
  for (const r of RUTAS) recorrer(path.join(PUBLIC, r));
  return h.digest('hex').slice(0, 8);
}

let BUILD;
try {
  BUILD = calcular();
} catch (e) {
  // Nunca dejar la app sin arrancar por esto — peor caso, se invalida caché de más.
  console.error('[build] no se pudo calcular el hash de assets, usando timestamp:', e.message);
  BUILD = String(Date.now());
}

module.exports = { BUILD };
