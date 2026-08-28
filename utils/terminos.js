// utils/terminos.js
// Versión vigente del texto de Términos y Condiciones — Gap 22 / ISS-082.
//
// El owner acepta una sola vez, en su primer ingreso a owner.html. Si más
// adelante cambia el texto de `public/terminos.html` o del resumen que se
// muestra en el overlay, SUBIR esta fecha: `GET /api/auth/terminos` vuelve a
// devolver `pendiente: true` para todos los owners y se les pide aceptar de
// nuevo en su próximo ingreso.
//
// Formato: fecha ISO (YYYY-MM-DD) del día en que quedó vigente ese texto.
const TERMINOS_VERSION = '2026-08-28';

module.exports = { TERMINOS_VERSION };
