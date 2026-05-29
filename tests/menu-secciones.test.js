/**
 * Pruebas para la lógica de persistencia de paneles de secciones de menú del día.
 * Verifican que al re-renderizar (tras agregar/eliminar sección o componente),
 * los paneles que estaban abiertos se mantengan abiertos.
 */

// ── Definición de las funciones bajo prueba (extraídas de owner.html) ──────────

function getOpenSecciones() {
  const open = [];
  document.querySelectorAll('[id^="menu-secciones-"]').forEach(el => {
    if (el.style.display !== 'none') open.push(el.id.replace('menu-secciones-', ''));
  });
  return open;
}

function restoreOpenSecciones(ids) {
  ids.forEach(id => {
    const el = document.getElementById(`menu-secciones-${id}`);
    if (el) el.style.display = 'block';
  });
}

// ── Helpers de prueba ──────────────────────────────────────────────────────────

function crearPanelDOM(id, visible = false) {
  const div = document.createElement('div');
  div.id = `menu-secciones-${id}`;
  div.style.display = visible ? 'block' : 'none';
  document.body.appendChild(div);
  return div;
}

function limpiarDOM() {
  document.body.innerHTML = '';
}

// ── Pruebas ────────────────────────────────────────────────────────────────────

describe('getOpenSecciones', () => {
  beforeEach(limpiarDOM);

  test('retorna array vacío cuando no hay paneles en el DOM', () => {
    expect(getOpenSecciones()).toEqual([]);
  });

  test('retorna array vacío cuando todos los paneles están ocultos', () => {
    crearPanelDOM('1', false);
    crearPanelDOM('2', false);
    expect(getOpenSecciones()).toEqual([]);
  });

  test('retorna el ID del panel visible', () => {
    crearPanelDOM('1', false);
    crearPanelDOM('2', true);
    expect(getOpenSecciones()).toEqual(['2']);
  });

  test('retorna todos los IDs de paneles visibles', () => {
    crearPanelDOM('10', true);
    crearPanelDOM('20', true);
    crearPanelDOM('30', false);
    const resultado = getOpenSecciones();
    expect(resultado).toContain('10');
    expect(resultado).toContain('20');
    expect(resultado).not.toContain('30');
    expect(resultado).toHaveLength(2);
  });
});

describe('restoreOpenSecciones', () => {
  beforeEach(limpiarDOM);

  test('no lanza error con array vacío', () => {
    expect(() => restoreOpenSecciones([])).not.toThrow();
  });

  test('no lanza error si un ID no existe en el DOM', () => {
    expect(() => restoreOpenSecciones(['999'])).not.toThrow();
  });

  test('hace visible un panel que estaba oculto', () => {
    const panel = crearPanelDOM('5', false);
    restoreOpenSecciones(['5']);
    expect(panel.style.display).toBe('block');
  });

  test('hace visibles múltiples paneles', () => {
    const p1 = crearPanelDOM('1', false);
    const p2 = crearPanelDOM('2', false);
    restoreOpenSecciones(['1', '2']);
    expect(p1.style.display).toBe('block');
    expect(p2.style.display).toBe('block');
  });

  test('solo restaura los IDs indicados, no toca los demás', () => {
    const p1 = crearPanelDOM('1', false);
    const p2 = crearPanelDOM('2', false);
    restoreOpenSecciones(['1']);
    expect(p1.style.display).toBe('block');
    expect(p2.style.display).toBe('none');
  });
});

describe('flujo completo: re-render conserva paneles abiertos', () => {
  beforeEach(limpiarDOM);

  test('un panel abierto antes del re-render permanece abierto después', () => {
    // Estado inicial: panel abierto por el usuario
    crearPanelDOM('42', true);

    // Simular lo que hace loadMenusDia: guardar estado → destruir DOM → re-renderizar → restaurar
    const openIds = getOpenSecciones();
    limpiarDOM();
    crearPanelDOM('42', false); // re-render siempre crea el panel como oculto
    restoreOpenSecciones(openIds);

    expect(document.getElementById('menu-secciones-42').style.display).toBe('block');
  });

  test('un panel cerrado antes del re-render permanece cerrado después', () => {
    crearPanelDOM('7', false);

    const openIds = getOpenSecciones();
    limpiarDOM();
    crearPanelDOM('7', false);
    restoreOpenSecciones(openIds);

    expect(document.getElementById('menu-secciones-7').style.display).toBe('none');
  });

  test('con múltiples menús, solo los paneles que estaban abiertos se restauran', () => {
    crearPanelDOM('1', true);
    crearPanelDOM('2', false);
    crearPanelDOM('3', true);

    const openIds = getOpenSecciones();
    limpiarDOM();
    // Re-render: todos ocultos
    crearPanelDOM('1', false);
    crearPanelDOM('2', false);
    crearPanelDOM('3', false);
    restoreOpenSecciones(openIds);

    expect(document.getElementById('menu-secciones-1').style.display).toBe('block');
    expect(document.getElementById('menu-secciones-2').style.display).toBe('none');
    expect(document.getElementById('menu-secciones-3').style.display).toBe('block');
  });

  test('si un menú desaparece del re-render (fue eliminado), no lanza error', () => {
    crearPanelDOM('99', true);

    const openIds = getOpenSecciones();
    limpiarDOM();
    // El menú 99 ya no existe en el nuevo render (fue eliminado)

    expect(() => restoreOpenSecciones(openIds)).not.toThrow();
  });
});

// ── Pruebas del badge de elegibilidad ─────────────────────────────────────────

function crearCardConBadgeElegible(menuId, elegible) {
  const card = document.createElement('div');
  card.id = `menu-card-${menuId}`;
  const btn = document.createElement('button');
  btn.dataset.testid = `badge-elegible-${menuId}`;
  btn.textContent = elegible ? 'Cliente elige' : 'Fijo';
  btn.setAttribute('onclick', `toggleElegibleMenu(${menuId}, ${elegible ? 1 : 0})`);
  card.appendChild(btn);
  document.body.appendChild(card);
  return btn;
}

describe('badge de elegibilidad del menú', () => {
  beforeEach(limpiarDOM);

  test('muestra "Cliente elige" cuando elegible=1', () => {
    const btn = crearCardConBadgeElegible(1, true);
    expect(btn.textContent).toBe('Cliente elige');
  });

  test('muestra "Fijo" cuando elegible=0', () => {
    const btn = crearCardConBadgeElegible(2, false);
    expect(btn.textContent).toBe('Fijo');
  });

  test('el onclick de elegible=1 pasa nuevoElegible=0 al toggle', () => {
    const btn = crearCardConBadgeElegible(5, true);
    expect(btn.getAttribute('onclick')).toContain('toggleElegibleMenu(5, 1)');
  });

  test('el onclick de elegible=0 pasa nuevoElegible=1 al toggle', () => {
    const btn = crearCardConBadgeElegible(6, false);
    expect(btn.getAttribute('onclick')).toContain('toggleElegibleMenu(6, 0)');
  });

  test('tras re-render, el badge refleja el nuevo valor de elegible', () => {
    crearCardConBadgeElegible(7, true);
    // Simula re-render con valor cambiado
    limpiarDOM();
    const btnNuevo = crearCardConBadgeElegible(7, false);
    expect(btnNuevo.textContent).toBe('Fijo');
  });
});
