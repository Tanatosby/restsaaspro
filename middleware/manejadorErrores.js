// middleware/manejadorErrores.js
// Manejador de errores final de Express (se registra al final de app.js).
//
// Distingue dos clases de error:
//  - Error del CLIENTE (4xx): una URL mal formada, un JSON roto, un cuerpo demasiado grande…
//    Express ya marca estos errores con `err.status` 4xx. Antes caían todos en el 500 genérico
//    y volcaban un stack de ~12 líneas al log por cada intento: los escáneres que piden
//    `/..%c0%af..%c0%af.env` llenaban el error log y tapaban los errores reales. Ahora responden
//    con su código (400, 413…) y dejan UNA línea en el log normal (stdout), no en el de errores.
//  - Error del SERVIDOR (todo lo demás): igual que siempre — 500 y stack completo en el log.

function manejadorErrores(err, req, res, next) {
  // Si ya se empezó a responder, no se puede cambiar el status: que lo cierre Express.
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode;

  if (status >= 400 && status < 500) {
    // La URL se recorta: un escáner puede mandar miles de caracteres
    console.log(`[${status}] ${req.method} ${String(req.originalUrl).slice(0, 120)} → ${err.message}`);
    return res.status(status).json({ error: 'Solicitud inválida' });
  }

  console.error(`[ERROR] ${req.method} ${req.originalUrl} → ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = manejadorErrores;
