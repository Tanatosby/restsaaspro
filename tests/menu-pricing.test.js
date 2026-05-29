/**
 * Pruebas para utils/menuPricing.js
 * Verifican la distribución del precio del menú del día entre secciones
 * obligatorias y opcionales, incluyendo el caso borde de todas-opcionales.
 */

const { calcularPrecioUnitario, calcularMenuTotal } = require('../utils/menuPricing');

// ── Helper ────────────────────────────────────────────────────────────────────
function item({ precio_menu, requerido, total_obligatorias, cantidad = 1, id_menu_dia = 1 }) {
  return { precio_menu, requerido, total_obligatorias, cantidad, id_menu_dia };
}

function mapItems(items) {
  const m = new Map();
  for (const i of items) m.set(i.id_menu_dia, (m.get(i.id_menu_dia) || 0) + 1);
  return m;
}

// ── calcularPrecioUnitario ────────────────────────────────────────────────────

describe('calcularPrecioUnitario', () => {
  describe('con secciones obligatorias', () => {
    test('sección obligatoria recibe precio_menu / total_obligatorias', () => {
      const it = item({ precio_menu: 20, requerido: 1, total_obligatorias: 2 });
      expect(calcularPrecioUnitario(it, mapItems([it]))).toBeCloseTo(10);
    });

    test('sección opcional vale 0 cuando hay obligatorias', () => {
      const it = item({ precio_menu: 20, requerido: 0, total_obligatorias: 2 });
      expect(calcularPrecioUnitario(it, mapItems([it]))).toBe(0);
    });

    test('precio se divide exactamente entre las obligatorias', () => {
      const obligatoria = item({ precio_menu: 30, requerido: 1, total_obligatorias: 3 });
      expect(calcularPrecioUnitario(obligatoria, mapItems([obligatoria]))).toBeCloseTo(10);
    });
  });

  describe('caso borde: todas las secciones son opcionales', () => {
    test('con 1 sección pedida se cobra el precio completo', () => {
      const it = item({ precio_menu: 20, requerido: 0, total_obligatorias: 0 });
      const m = mapItems([it]);
      expect(calcularPrecioUnitario(it, m)).toBeCloseTo(20);
    });

    test('con 2 secciones pedidas el precio se divide en 2', () => {
      const a = item({ precio_menu: 20, requerido: 0, total_obligatorias: 0, id_menu_dia: 1 });
      const b = item({ precio_menu: 20, requerido: 0, total_obligatorias: 0, id_menu_dia: 1 });
      const m = mapItems([a, b]);
      expect(calcularPrecioUnitario(a, m)).toBeCloseTo(10);
      expect(calcularPrecioUnitario(b, m)).toBeCloseTo(10);
    });
  });
});

// ── calcularMenuTotal ─────────────────────────────────────────────────────────

describe('calcularMenuTotal', () => {
  test('menú con 3 obligatorias, cliente pide las 3 → paga precio completo', () => {
    const items = [
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 3 }),
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 3 }),
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 3 }),
    ];
    expect(calcularMenuTotal(items)).toBeCloseTo(20);
  });

  test('menú 2 obligatorias + 1 opcional, cliente pide las 3 → paga precio completo', () => {
    const items = [
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 2 }),
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 2 }),
      item({ precio_menu: 20, requerido: 0, total_obligatorias: 2 }),
    ];
    expect(calcularMenuTotal(items)).toBeCloseTo(20);
  });

  test('menú 2 obligatorias + 1 opcional, cliente OMITE la opcional → igual paga precio completo', () => {
    const items = [
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 2 }),
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 2 }),
    ];
    expect(calcularMenuTotal(items)).toBeCloseTo(20);
  });

  test('2 comensales piden el mismo menú con 2 obligatorias → pagan 2 × precio', () => {
    // 4 filas: 2 secciones × 2 comensales
    const items = [
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 2, id_menu_dia: 1 }),
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 2, id_menu_dia: 1 }),
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 2, id_menu_dia: 1 }),
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 2, id_menu_dia: 1 }),
    ];
    expect(calcularMenuTotal(items)).toBeCloseTo(40);
  });

  test('cantidad > 1 en un item se multiplica correctamente', () => {
    const items = [
      item({ precio_menu: 30, requerido: 1, total_obligatorias: 3, cantidad: 2 }),
      item({ precio_menu: 30, requerido: 1, total_obligatorias: 3, cantidad: 1 }),
      item({ precio_menu: 30, requerido: 1, total_obligatorias: 3, cantidad: 1 }),
    ];
    // precio por item = 30/3 = 10 → total = 10×2 + 10×1 + 10×1 = 40
    expect(calcularMenuTotal(items)).toBeCloseTo(40);
  });

  test('lista vacía retorna 0', () => {
    expect(calcularMenuTotal([])).toBe(0);
  });

  test('caso borde todas-opcionales: 1 sección pedida → paga precio completo', () => {
    const items = [
      item({ precio_menu: 25, requerido: 0, total_obligatorias: 0 }),
    ];
    expect(calcularMenuTotal(items)).toBeCloseTo(25);
  });

  test('caso borde todas-opcionales: 3 secciones pedidas → paga precio completo', () => {
    const items = [
      item({ precio_menu: 25, requerido: 0, total_obligatorias: 0, id_menu_dia: 1 }),
      item({ precio_menu: 25, requerido: 0, total_obligatorias: 0, id_menu_dia: 1 }),
      item({ precio_menu: 25, requerido: 0, total_obligatorias: 0, id_menu_dia: 1 }),
    ];
    expect(calcularMenuTotal(items)).toBeCloseTo(25);
  });

  test('dos menús distintos en la misma orden se calculan independientemente', () => {
    const items = [
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 2, id_menu_dia: 1 }),
      item({ precio_menu: 20, requerido: 1, total_obligatorias: 2, id_menu_dia: 1 }),
      item({ precio_menu: 30, requerido: 1, total_obligatorias: 3, id_menu_dia: 2 }),
      item({ precio_menu: 30, requerido: 1, total_obligatorias: 3, id_menu_dia: 2 }),
      item({ precio_menu: 30, requerido: 1, total_obligatorias: 3, id_menu_dia: 2 }),
    ];
    expect(calcularMenuTotal(items)).toBeCloseTo(50);
  });
});
