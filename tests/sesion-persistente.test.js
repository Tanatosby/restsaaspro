/**
 * Pruebas para la sesión persistente (ISS-027).
 *
 * Contexto: la sesión duraba 8h y además el frontend la guardaba en
 * sessionStorage, que el navegador borra al cerrar la PWA — por eso el dueño
 * tenía que iniciar sesión cada vez que abría el ícono de la app.
 *
 * Cubre las reglas puras de utils/sesion.js (vida por rol, opciones de cookie,
 * renovación deslizante) y el ciclo real de firma/verificación del JWT.
 */

const jwt = require('jsonwebtoken');
const {
  DIA_MS,
  SESION_DIAS,
  SESION_DIAS_ADMIN,
  diasSesion,
  cookieSesion,
  necesitaRenovacion,
} = require('../utils/sesion');

const SECRET = 'secreto-de-prueba';

// ── Vida de la sesión según el rol ───────────────────────────────────────────

describe('diasSesion', () => {
  test('el owner mantiene la sesión 30 días', () => {
    expect(diasSesion('owner')).toBe(30);
    expect(SESION_DIAS).toBe(30);
  });

  test('mozo y cocinero también — son quienes atienden con el celular', () => {
    expect(diasSesion('mozo')).toBe(30);
    expect(diasSesion('cocinero')).toBe(30);
  });

  test('el admin del SaaS queda acotado a 1 día', () => {
    expect(diasSesion('admin')).toBe(SESION_DIAS_ADMIN);
    expect(diasSesion('admin')).toBeLessThan(diasSesion('owner'));
  });
});

// ── Opciones de la cookie ────────────────────────────────────────────────────

describe('cookieSesion', () => {
  test('httpOnly siempre — el JS no debe poder leer el token', () => {
    expect(cookieSesion('owner', true).httpOnly).toBe(true);
    expect(cookieSesion('owner', false).httpOnly).toBe(true);
  });

  test("sameSite 'lax', no 'strict' — con strict la PWA no manda la cookie al abrir desde el ícono", () => {
    expect(cookieSesion('owner', true).sameSite).toBe('lax');
  });

  test('secure solo en producción (en local se sirve por http)', () => {
    expect(cookieSesion('owner', true).secure).toBe(true);
    expect(cookieSesion('owner', false).secure).toBe(false);
  });

  test('maxAge coincide con los días del rol', () => {
    expect(cookieSesion('owner', true).maxAge).toBe(30 * DIA_MS);
    expect(cookieSesion('admin', true).maxAge).toBe(1 * DIA_MS);
  });
});

// ── Renovación deslizante ────────────────────────────────────────────────────

describe('necesitaRenovacion', () => {
  const ahora = Date.parse('2026-08-10T12:00:00Z');
  const expEn = dias => Math.floor((ahora + dias * DIA_MS) / 1000);

  test('token recién emitido (30 días por delante) no se renueva', () => {
    expect(necesitaRenovacion(expEn(30), 'owner', ahora)).toBe(false);
  });

  test('con más de la mitad de vida restante no se renueva', () => {
    expect(necesitaRenovacion(expEn(16), 'owner', ahora)).toBe(false);
  });

  test('justo en la mitad exacta todavía no se renueva (borde)', () => {
    expect(necesitaRenovacion(expEn(15), 'owner', ahora)).toBe(false);
  });

  test('pasada la mitad de la vida se renueva', () => {
    expect(necesitaRenovacion(expEn(14), 'owner', ahora)).toBe(true);
  });

  test('a punto de vencer se renueva', () => {
    expect(necesitaRenovacion(expEn(0.5), 'owner', ahora)).toBe(true);
  });

  test('el admin usa su propio umbral (mitad de 1 día = 12h)', () => {
    expect(necesitaRenovacion(expEn(0.6), 'admin', ahora)).toBe(false);
    expect(necesitaRenovacion(expEn(0.4), 'admin', ahora)).toBe(true);
  });

  test('sin exp no renueva (token malformado — lo rechaza jwt.verify antes)', () => {
    expect(necesitaRenovacion(undefined, 'owner', ahora)).toBe(false);
    expect(necesitaRenovacion(null, 'owner', ahora)).toBe(false);
  });
});

// ── Ciclo real del JWT ───────────────────────────────────────────────────────

describe('JWT con la vida nueva', () => {
  const payload = { id: 1, name: 'Rosa', role: 'owner', restaurant_id: 1, permisos: null };

  test('un token de owner sigue siendo válido pasadas 8 horas (el bug original)', () => {
    const token = jwt.sign(payload, SECRET, { expiresIn: `${diasSesion('owner')}d` });
    // 8h + 1 min: con la vida vieja de 8h esto ya fallaba y expulsaba al dueño
    const luego = Math.floor(Date.now() / 1000) + (8 * 60 * 60) + 60;

    const decoded = jwt.verify(token, SECRET, { clockTimestamp: luego });
    expect(decoded.role).toBe('owner');
    expect(decoded.restaurant_id).toBe(1);
  });

  test('sigue válido a los 29 días y expira pasados los 30', () => {
    const token = jwt.sign(payload, SECRET, { expiresIn: `${diasSesion('owner')}d` });
    const dia   = 24 * 60 * 60;
    const ahora = Math.floor(Date.now() / 1000);

    expect(jwt.verify(token, SECRET, { clockTimestamp: ahora + 29 * dia }).role).toBe('owner');
    expect(() => jwt.verify(token, SECRET, { clockTimestamp: ahora + 31 * dia }))
      .toThrow(jwt.TokenExpiredError);
  });

  test('el token de admin expira pasado su día', () => {
    const token = jwt.sign({ ...payload, role: 'admin' }, SECRET, { expiresIn: `${diasSesion('admin')}d` });
    const ahora = Math.floor(Date.now() / 1000);

    expect(() => jwt.verify(token, SECRET, { clockTimestamp: ahora + 2 * 24 * 60 * 60 }))
      .toThrow(jwt.TokenExpiredError);
  });

  test('un token firmado con otro secreto se rechaza', () => {
    const token = jwt.sign(payload, 'otro-secreto', { expiresIn: '30d' });
    expect(() => jwt.verify(token, SECRET)).toThrow(jwt.JsonWebTokenError);
  });

  test('el exp del token real dispara la renovación cuando corresponde', () => {
    const token   = jwt.sign(payload, SECRET, { expiresIn: `${diasSesion('owner')}d` });
    const decoded = jwt.verify(token, SECRET);

    // Recién emitido: no
    expect(necesitaRenovacion(decoded.exp, 'owner')).toBe(false);
    // Simulando estar 20 días en el futuro: sí
    expect(necesitaRenovacion(decoded.exp, 'owner', Date.now() + 20 * DIA_MS)).toBe(true);
  });
});
