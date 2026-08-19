/**
 * ISS-047 — modalidad por menú.
 * Cubre las tres piezas del util compartido: normalizar la modalidad de cada
 * línea, derivar el resumen del pedido, y contar cuántos menús se llevan
 * (que es lo que decide cuántos tappers se cobran).
 */
const {
  MODALIDADES_LINEA,
  modalidadDeLinea,
  normalizarModalidades,
  resumirModalidad,
  contarMenusPorModalidad,
} = require('../utils/modalidadPedido');

// El caso real del día 5: 2 menús, uno se lleva y el otro se come en el local.
const menuMixto = [
  { id_menu_dia: 1, id_componente: 10, grupo: 1, modalidad: 'en_local'   },
  { id_menu_dia: 1, id_componente: 11, grupo: 1, modalidad: 'en_local'   },
  { id_menu_dia: 1, id_componente: 12, grupo: 2, modalidad: 'para_llevar' },
  { id_menu_dia: 1, id_componente: 13, grupo: 2, modalidad: 'para_llevar' },
];

describe('modalidadDeLinea', () => {
  it('respeta la modalidad propia de la línea', () => {
    expect(modalidadDeLinea({ modalidad: 'para_llevar' }, 'en_local')).toBe('para_llevar');
    expect(modalidadDeLinea({ modalidad: 'en_local' }, 'para_llevar')).toBe('en_local');
  });

  it('hereda la del pedido cuando la línea no la trae (cliente viejo)', () => {
    expect(modalidadDeLinea({}, 'para_llevar')).toBe('para_llevar');
    expect(modalidadDeLinea({}, 'en_local')).toBe('en_local');
  });

  it('ignora valores que no son de línea', () => {
    expect(modalidadDeLinea({ modalidad: 'inventado' }, 'en_local')).toBe('en_local');
    expect(MODALIDADES_LINEA).toEqual(['en_local', 'para_llevar']);
  });

  it('en delivery deja las líneas en en_local: el cargo es del viaje', () => {
    expect(modalidadDeLinea({ modalidad: 'para_llevar' }, 'delivery')).toBe('en_local');
  });
});

describe('normalizarModalidades', () => {
  it('mantiene separadas las dos instancias de menú', () => {
    const { menu } = normalizarModalidades(menuMixto, [], 'en_local');
    expect(menu.filter(i => i.grupo === 1).every(i => i.modalidad === 'en_local')).toBe(true);
    expect(menu.filter(i => i.grupo === 2).every(i => i.modalidad === 'para_llevar')).toBe(true);
  });

  it('un menú se lleva entero: si una línea del grupo dice llevar, todas lo dicen', () => {
    const incoherente = [
      { grupo: 1, modalidad: 'en_local'    },
      { grupo: 1, modalidad: 'para_llevar' },   // cliente manipulado o con bug
    ];
    const { menu } = normalizarModalidades(incoherente, [], 'en_local');
    expect(menu.every(i => i.modalidad === 'para_llevar')).toBe(true);
  });

  it('un cliente viejo sin modalidad por línea se comporta como antes', () => {
    const sinModalidad = [{ grupo: 1 }, { grupo: 1 }, { grupo: 2 }];
    const { menu } = normalizarModalidades(sinModalidad, [], 'para_llevar');
    expect(menu.every(i => i.modalidad === 'para_llevar')).toBe(true);
  });

  it('los platos de carta llevan la suya, independiente de los menús', () => {
    const carta = [{ id_plato_carta: 5, cantidad: 2, modalidad: 'para_llevar' }];
    const { carta: out } = normalizarModalidades(menuMixto, carta, 'en_local');
    expect(out[0].modalidad).toBe('para_llevar');
  });

  it('no muta los ítems recibidos', () => {
    const original = JSON.parse(JSON.stringify(menuMixto));
    normalizarModalidades(menuMixto, [], 'para_llevar');
    expect(menuMixto).toEqual(original);
  });
});

describe('resumirModalidad', () => {
  const resumen = (menu, carta = [], pedido = 'en_local') => {
    const n = normalizarModalidades(menu, carta, pedido);
    return resumirModalidad(n.menu, n.carta, pedido);
  };

  it('mixto cuando conviven las dos', () => {
    expect(resumen(menuMixto)).toBe('mixto');
  });

  it('en_local cuando no se lleva nada', () => {
    expect(resumen(menuMixto.map(i => ({ ...i, modalidad: 'en_local' })))).toBe('en_local');
  });

  it('para_llevar cuando se lleva todo', () => {
    expect(resumen(menuMixto.map(i => ({ ...i, modalidad: 'para_llevar' })))).toBe('para_llevar');
  });

  it('delivery manda sobre todo: es del pedido, no de la línea', () => {
    expect(resumen(menuMixto, [], 'delivery')).toBe('delivery');
  });

  it('un plato de carta para llevar basta para volverlo mixto', () => {
    const carta = [{ id_plato_carta: 5, cantidad: 1, modalidad: 'para_llevar' }];
    const soloLocal = menuMixto.map(i => ({ ...i, modalidad: 'en_local' }));
    expect(resumen(soloLocal, carta)).toBe('mixto');
  });
});

describe('contarMenusPorModalidad — de acá salen los tappers que se cobran', () => {
  it('cuenta instancias, no filas: 4 filas de 2 menús son 2 unidades', () => {
    const { menu } = normalizarModalidades(menuMixto, [], 'en_local');
    expect(contarMenusPorModalidad(menu)).toEqual({ total: 2, llevar: 1 });
  });

  it('el caso del día 5 cobra UN tapper, no dos', () => {
    const { menu } = normalizarModalidades(menuMixto, [], 'en_local');
    const { llevar } = contarMenusPorModalidad(menu);
    const costoTapper = 1.0;
    expect(llevar * costoTapper).toBe(1.0);
  });

  it('todo para llevar cobra por cada menú', () => {
    const todos = menuMixto.map(i => ({ ...i, modalidad: 'para_llevar' }));
    const { menu } = normalizarModalidades(todos, [], 'para_llevar');
    expect(contarMenusPorModalidad(menu)).toEqual({ total: 2, llevar: 2 });
  });

  it('líneas sin grupo (anteriores a ISS-041) cuentan una por fila', () => {
    const viejas = [
      { id_menu_dia: 1, grupo: null, modalidad: 'para_llevar' },
      { id_menu_dia: 1, grupo: null, modalidad: 'en_local'    },
    ];
    expect(contarMenusPorModalidad(viejas)).toEqual({ total: 2, llevar: 1 });
  });

  it('sin menús no cuenta nada', () => {
    expect(contarMenusPorModalidad([])).toEqual({ total: 0, llevar: 0 });
  });
});
