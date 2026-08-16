// Verificación manual (no forma parte de la suite jest) de la cadena completa
// de ISS-041: el cliente manda 2 menús con su `grupo`, el backend lo guarda, y
// la cola de cocina lo devuelve para que el ticket pueda agruparlos.
//
// El test de jest (tests/cola-dia.test.js) cubre la lectura sobre una BD en
// memoria; este cubre la escritura real por HTTP contra el endpoint público,
// que es por donde entra el pedido del comensal.
//
// Crea un pedido de prueba en la BD local y lo borra al terminar.
//
// Uso: PORT=3311 node app.js &   (servidor ya debe estar corriendo)
//      node scripts/test-grupo-punta-a-punta.js
const path = require('path');
const Database = require('better-sqlite3');

const BASE = 'http://localhost:3311';
const db = new Database(path.join(__dirname, '..', 'database.sqlite'));

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

(async () => {
  // Un menú elegible del restaurante 1 con componentes en 2 secciones distintas
  const menu = db.prepare(`
    SELECT md.id, md.nombre
    FROM menus_dia md
    WHERE md.id_restaurante = 1 AND md.elegible = 1
      AND (SELECT COUNT(DISTINCT id_seccion_menu) FROM componentes_menu_dia WHERE id_menu_dia = md.id) >= 2
    LIMIT 1
  `).get();
  if (!menu) { console.error('❌ No hay un menú elegible con 2+ secciones en la BD local'); process.exit(1); }

  const comps = db.prepare(`
    SELECT id, id_seccion_menu FROM componentes_menu_dia WHERE id_menu_dia = ? ORDER BY id_seccion_menu, id
  `).all(menu.id);
  const secciones = [...new Set(comps.map(c => c.id_seccion_menu))];
  // Dos combinaciones DISTINTAS del mismo menú — el caso exacto del issue
  const combo = s => comps.filter(c => c.id_seccion_menu === s);
  const menu1 = secciones.map(s => combo(s)[0]);
  const menu2 = secciones.map(s => combo(s)[combo(s).length - 1]);

  const menu_items = [
    ...menu1.map(c => ({ id_componente: c.id, id_menu_dia: menu.id, cantidad: 1, grupo: 1 })),
    ...menu2.map(c => ({ id_componente: c.id, id_menu_dia: menu.id, cantidad: 1, grupo: 2 })),
  ];

  console.log(`\nPedido de prueba — 2× "${menu.nombre}" con ${secciones.length} secciones cada uno`);

  const res = await fetch(`${BASE}/api/public/orders`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_restaurante: 1, mesa: '99', nombre_cliente: 'Prueba ISS-041',
      carta_items: [], menu_items, modalidad: 'en_local',
    }),
  });
  const data = await res.json();
  check(res.ok, `el pedido se crea (HTTP ${res.status})${res.ok ? '' : ' — ' + JSON.stringify(data)}`);
  if (!res.ok) { process.exit(1); }

  const ordenId = data.id_orden;

  try {
    // ── Escritura ──
    const filas = db.prepare(
      `SELECT id_componente, grupo FROM orden_menu_items WHERE id_orden = ? ORDER BY grupo, id`
    ).all(ordenId);

    check(filas.length === menu_items.length, `se guardaron las ${menu_items.length} filas`);
    check(filas.every(f => f.grupo !== null), 'ninguna fila quedó con grupo NULL');
    check(new Set(filas.map(f => f.grupo)).size === 2, 'quedaron 2 grupos distintos');
    check(filas.filter(f => f.grupo === 1).length === secciones.length,
      `el grupo 1 tiene sus ${secciones.length} platos`);

    // Cada grupo conserva EXACTAMENTE los componentes que mandó el cliente:
    // es lo que se perdía antes al aplanar el carrito.
    const delGrupo = g => filas.filter(f => f.grupo === g).map(f => f.id_componente).sort();
    check(JSON.stringify(delGrupo(1)) === JSON.stringify(menu1.map(c => c.id).sort()),
      'el grupo 1 conserva la combinación exacta que eligió el comensal');
    check(JSON.stringify(delGrupo(2)) === JSON.stringify(menu2.map(c => c.id).sort()),
      'el grupo 2 conserva la suya, distinta de la del grupo 1');

    // ── Lectura: lo que recibe la vista de Cocina ──
    const { cocinaDelDia } = require('../utils/colaDia');
    const { fechaLima } = require('../utils/fecha');
    const cocina = cocinaDelDia(db, 1, fechaLima());
    const enCocina = cocina.ordenes.find(o => o.id === ordenId);

    check(!!enCocina, 'el pedido aparece en la cola de cocina');
    if (enCocina) {
      check(enCocina.menu_items.every(i => i.grupo != null), 'los ítems llegan a cocina con su grupo');
      check(enCocina.menu_items.every(i => i.menu_nombre === menu.nombre),
        'y con el nombre del menú, para rotular grupos cuando se mezclan tipos');

      // ── Render: el ticket que ve la persona de cocina ──
      const fs = require('fs');
      const vm = require('vm');
      const MODULES = path.join(__dirname, '..', 'public', 'js', 'modules');
      const ctx = vm.createContext({});
      for (const f of ['utils.js', 'cocina.js']) {
        vm.runInContext(fs.readFileSync(path.join(MODULES, f), 'utf8'), ctx, { filename: f });
      }
      const ticket = ctx.renderCocinaTicket(enCocina);
      check((ticket.match(/menu-grupo-head/g) || []).length === 2,
        'el ticket de cocina pinta los 2 menús por separado');
      check(ticket.includes('🍽️ Menú 1') && ticket.includes('🍽️ Menú 2'),
        'con sus encabezados numerados');
      check(!ticket.includes(menu.nombre),
        'sin repetir el nombre del menú: los 2 son del mismo tipo');
    }
  } finally {
    // Limpieza — este script no debe dejar basura en la BD local
    db.prepare(`DELETE FROM orden_menu_items WHERE id_orden = ?`).run(ordenId);
    db.prepare(`DELETE FROM orden_carta_items WHERE id_orden = ?`).run(ordenId);
    db.prepare(`DELETE FROM ordenes WHERE id = ?`).run(ordenId);
    console.log(`\n(pedido de prueba #${ordenId} borrado)`);
  }

  console.log(`\n${pass} pasaron, ${fail} fallaron`);
  // Sin process.exit(): en Windows, salir a la fuerza con la conexión de
  // better-sqlite3 abierta aborta el proceso en libuv y se pierde el código de
  // salida real. Se cierra la BD y se deja que el proceso termine solo.
  db.close();
  process.exitCode = fail ? 1 : 0;
})().catch(e => {
  console.error('❌ Error inesperado:', e);
  try { db.close(); } catch (_) {}
  process.exitCode = 1;
});
