# ISS-020 — Error handler global no loguea ruta ni stack trace

**Módulo:** `app.js` (infraestructura)
**Prioridad:** 🔴 Alta (infra) — bloqueaba diagnosticar cualquier 500 en producción
**Estado:** ✅ Resuelto 2026-07-13

## Reporte original

Al investigar ISS-021 (foto de comprobante que no carga en Cola), los logs de producción mostraban `[ERROR] FOREIGN KEY constraint failed` repetido varias veces, sin ninguna forma de saber a qué endpoint o acción pertenecía.

## Diagnóstico

El manejador global de errores en `app.js` solo logueaba `err.message`:

```js
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({ error: 'Error interno del servidor' });
});
```

Sin método, ruta ni stack trace, cualquier 500 en producción queda indiagnosticable desde los logs — es la razón por la que no se pudo confirmar el origen real del `FOREIGN KEY constraint failed`.

## Fix

`app.js` — el handler ahora loguea `req.method`, `req.originalUrl` y `err.stack` completo.

## Verificación

Forzado un error real localmente (`curl -X POST -d '{invalid json' /api/public/orders`) → antes: `[ERROR] Expected property name...` sin contexto. Después: `[ERROR] POST /api/public/orders → Expected property name or '}' in JSON...` + stack completo. **254/254 jest verde.** Pendiente: desplegar a producción y monitorear la próxima vez que ocurra el `FOREIGN KEY constraint failed` para identificar su origen real.
