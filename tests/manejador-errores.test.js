/**
 * @jest-environment node
 *
 * Pruebas del manejador de errores final (middleware/manejadorErrores.js).
 *
 * Origen: el chequeo de salud del 2026-09-21 mostró en el error log de producción decenas de
 * stacks por `GET /..%c0%af..%c0%af..%c0%af.env` (escáneres buscando el .env). La app no filtraba
 * nada, pero respondía 500 en vez de 400 y el log se llenaba de ruido que tapa errores reales.
 */

const http = require('http');
const os = require('os');
const express = require('express');
const manejadorErrores = require('../middleware/manejadorErrores');

function falsoRes() {
  return {
    headersSent: false,
    codigo: null,
    cuerpo: null,
    status(c) { this.codigo = c; return this; },
    json(b) { this.cuerpo = b; return this; },
  };
}

const req = { method: 'GET', originalUrl: '/algo' };

let logSpy, errSpy;
beforeEach(() => {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('manejadorErrores — unitario', () => {
  test('error 400 del cliente: responde 400, una sola línea de log y NADA en el error log', () => {
    const res = falsoRes();
    const err = Object.assign(new URIError('Failed to decode param'), { status: 400 });

    manejadorErrores(err, req, res, jest.fn());

    expect(res.codigo).toBe(400);
    expect(res.cuerpo).toEqual({ error: 'Solicitud inválida' });
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errSpy).not.toHaveBeenCalled();
  });

  test('otro 4xx (413 cuerpo demasiado grande) conserva su código', () => {
    const res = falsoRes();
    manejadorErrores(Object.assign(new Error('too large'), { status: 413 }), req, res, jest.fn());
    expect(res.codigo).toBe(413);
    expect(errSpy).not.toHaveBeenCalled();
  });

  test('acepta `statusCode` además de `status`', () => {
    const res = falsoRes();
    manejadorErrores(Object.assign(new Error('x'), { statusCode: 400 }), req, res, jest.fn());
    expect(res.codigo).toBe(400);
  });

  test('error del servidor: 500 genérico y stack completo en el error log (como siempre)', () => {
    const res = falsoRes();
    manejadorErrores(new Error('se rompió la BD'), req, res, jest.fn());

    expect(res.codigo).toBe(500);
    expect(res.cuerpo).toEqual({ error: 'Error interno del servidor' });
    expect(errSpy).toHaveBeenCalledTimes(2);          // línea [ERROR] + stack
    expect(String(errSpy.mock.calls[0][0])).toContain('se rompió la BD');
  });

  test('un status 5xx explícito sigue siendo error del servidor (500 + stack)', () => {
    const res = falsoRes();
    manejadorErrores(Object.assign(new Error('bad gateway'), { status: 502 }), req, res, jest.fn());
    expect(res.codigo).toBe(500);
    expect(errSpy).toHaveBeenCalled();
  });

  test('si ya se empezó a responder, delega en Express con `next(err)` y no toca la respuesta', () => {
    const res = falsoRes();
    res.headersSent = true;
    const next = jest.fn();
    const err = new Error('tarde');

    manejadorErrores(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.codigo).toBeNull();
  });

  test('la URL del log se recorta a 120 caracteres', () => {
    const res = falsoRes();
    const larga = { method: 'GET', originalUrl: '/' + 'a'.repeat(5000) };
    manejadorErrores(Object.assign(new Error('x'), { status: 400 }), larga, res, jest.fn());
    expect(logSpy.mock.calls[0][0].length).toBeLessThan(200);
  });
});

describe('manejadorErrores — con Express real (el caso del escáner de .env)', () => {
  let server, puerto;

  beforeAll(async () => {
    const app = express();
    app.use(express.static(os.tmpdir()));            // mismo tipo de middleware que app.js
    app.get('/rompe', () => { throw new Error('bug real del servidor'); });
    // Igual que el atajo /:slug de app.js: al probar esta ruta contra una URL con `%c0%af` el router
    // intenta decodificar el parámetro, lanza URIError (status 400) y ahí nace el ruido del log.
    app.get('/:slug', (req, res) => res.status(404).json({ error: 'sin slug' }));
    app.use(manejadorErrores);
    await new Promise(r => { server = app.listen(0, r); });
    puerto = server.address().port;
  });
  afterAll(() => new Promise(r => server.close(r)));

  // http.request con `path` crudo: fetch/URL normalizarían o rechazarían la ruta rara.
  function pedir(ruta) {
    return new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port: puerto, path: ruta }, res => {
        let cuerpo = '';
        res.on('data', d => (cuerpo += d));
        res.on('end', () => resolve({ status: res.statusCode, cuerpo }));
      }).on('error', reject);
    });
  }

  test('GET /..%c0%af..%c0%af.env → 400 (antes 500) y sin stack en el error log', async () => {
    const r = await pedir('/..%c0%af..%c0%af..%c0%af.env');
    expect(r.status).toBe(400);
    expect(JSON.parse(r.cuerpo)).toEqual({ error: 'Solicitud inválida' });
    expect(errSpy).not.toHaveBeenCalled();
  });

  test('un bug real de una ruta sigue dando 500 con stack', async () => {
    const r = await pedir('/rompe');
    expect(r.status).toBe(500);
    expect(errSpy).toHaveBeenCalled();
  });
});
