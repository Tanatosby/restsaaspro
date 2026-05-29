// Replica la lógica de detección de kitchen.html para pruebas aisladas.
// La función detectAndAlertNewOrders compara el snapshot anterior de IDs
// pendientes con el actual y decide si debe sonar la alerta.

function createDetector() {
  let prevIds = null;
  const alerts = [];

  function detect(orders) {
    const pendingIds = orders.filter(o => o.status === 'pending').map(o => o.id);
    let alerted = false;
    if (prevIds !== null) {
      const hasNew = pendingIds.some(id => !prevIds.has(id));
      if (hasNew) { alerts.push(pendingIds); alerted = true; }
    }
    prevIds = new Set(pendingIds);
    return alerted;
  }

  return { detect, getAlerts: () => alerts };
}

describe('detección de órdenes nuevas para alerta de sonido', () => {

  describe('primera carga (prevIds = null)', () => {
    test('no dispara alerta en la primera carga con órdenes', () => {
      const { detect } = createDetector();
      expect(detect([{ id: 1, status: 'pending' }])).toBe(false);
    });

    test('no dispara alerta en la primera carga vacía', () => {
      const { detect } = createDetector();
      expect(detect([])).toBe(false);
    });
  });

  describe('orden nueva detectada', () => {
    test('dispara alerta cuando aparece un ID que antes no estaba', () => {
      const { detect } = createDetector();
      detect([{ id: 1, status: 'pending' }]);
      expect(detect([{ id: 1, status: 'pending' }, { id: 2, status: 'pending' }])).toBe(true);
    });

    test('dispara alerta cuando la cola pasa de vacía a tener una orden pending', () => {
      const { detect } = createDetector();
      detect([]);
      expect(detect([{ id: 5, status: 'pending' }])).toBe(true);
    });

    test('múltiples órdenes nuevas simultáneas disparan una sola alerta', () => {
      const { detect, getAlerts } = createDetector();
      detect([]);
      detect([{ id: 1, status: 'pending' }, { id: 2, status: 'pending' }]);
      expect(getAlerts()).toHaveLength(1);
    });
  });

  describe('sin órdenes nuevas', () => {
    test('no dispara si el set de pending no cambia', () => {
      const { detect } = createDetector();
      detect([{ id: 1, status: 'pending' }]);
      expect(detect([{ id: 1, status: 'pending' }])).toBe(false);
    });

    test('no dispara si la cola sigue vacía', () => {
      const { detect } = createDetector();
      detect([]);
      expect(detect([])).toBe(false);
    });

    test('no dispara si una orden pasa de pending a cooking (desaparece del set)', () => {
      const { detect } = createDetector();
      detect([{ id: 1, status: 'pending' }]);
      expect(detect([{ id: 1, status: 'cooking' }])).toBe(false);
    });

    test('no dispara si aparece una orden nueva en cooking (solo pending alerta)', () => {
      const { detect } = createDetector();
      detect([]);
      expect(detect([{ id: 3, status: 'cooking' }])).toBe(false);
    });
  });

  describe('combinaciones mixtas', () => {
    test('una orden nueva pending + una existente cooking solo dispara por la pending', () => {
      const { detect } = createDetector();
      detect([{ id: 1, status: 'cooking' }]);
      expect(detect([{ id: 1, status: 'cooking' }, { id: 2, status: 'pending' }])).toBe(true);
    });

    test('orden que vuelve a pending tras cooking sí dispara (salió del set prevIds)', () => {
      // Al pasar a cooking, id=1 desaparece del set prevIds (solo guarda pending).
      // Si vuelve a pending, es una entrada nueva → alerta correcta.
      const { detect } = createDetector();
      detect([{ id: 1, status: 'pending' }]);
      detect([{ id: 1, status: 'cooking' }]);
      expect(detect([{ id: 1, status: 'pending' }])).toBe(true);
    });
  });
});
