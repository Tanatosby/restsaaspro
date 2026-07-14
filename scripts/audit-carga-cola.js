// Auditoría de carga — Cola del día + imágenes del menú.
// Simula el historial que se acumula con el tiempo (reservas viejas
// completadas/canceladas) y mide tiempos de respuesta reales contra un
// servidor corriendo, para cuantificar el problema de ISS-023 (N+1 +
// GET /api/reservations sin filtro) y separarlo de la lentitud reportada
// en imágenes del menú.
//
// Uso: PORT=3311 node app.js &   (servidor ya debe estar corriendo)
//      node scripts/audit-carga-cola.js
const db  = require('../config/database');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE   = 'http://localhost:3311';
const REST_ID = 1;
const N_RESERVAS = 3000; // orden de magnitud de "varios meses de historial"

function tiempoMs(fn) {
  return (async () => {
    const t0 = Date.now();
    const data = await fn();
    return { ms: Date.now() - t0, data };
  })();
}

async function main() {
  const token = jwt.sign({ id: 5, name: 'Carlos', role: 'owner', restaurant_id: REST_ID, permisos: null }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const headers = { Cookie: `auth_token=${token}` };

  const catPlato = db.prepare(`SELECT id, precio FROM platos_carta WHERE id_restaurante=? AND activo=1 LIMIT 1`).get(REST_ID);
  if (!catPlato) throw new Error('No hay platos a la carta activos en el restaurante 1 — necesarios para sembrar ítems realistas');

  console.log(`\n[Antes de sembrar] reservas de rest ${REST_ID}: ${db.prepare('SELECT COUNT(*) c FROM reservas WHERE id_restaurante=?').get(REST_ID).c}`);

  // ── Sembrar N reservas históricas realistas (80% completadas, 15% canceladas, 5% activas) ──
  console.log(`\nSembrando ${N_RESERVAS} reservas históricas (con 1 ítem de carta c/u)...`);
  const estFull      = db.prepare(`SELECT id FROM estatus_reserva WHERE es_full=1`).get().id;
  const estCancelado  = db.prepare(`SELECT id FROM estatus_reserva WHERE es_cancelado=1`).get().id;
  const estInicial    = db.prepare(`SELECT id FROM estatus_reserva WHERE es_inicial=1`).get().id;

  const insertReserva = db.prepare(`
    INSERT INTO reservas (nombre_cliente, telefono_cliente, fecha, mesa, id_restaurante, id_estatus, codigo, modalidad, cargo_modalidad)
    VALUES (?, ?, ?, NULL, ?, ?, ?, 'en_local', 0)
  `);
  const insertItem = db.prepare(`
    INSERT INTO reserva_carta_items (id_reserva, id_plato_carta, cantidad, precio_unitario)
    VALUES (?, ?, 1, ?)
  `);

  const t0Seed = Date.now();
  const seedIds = [];
  db.transaction(() => {
    for (let i = 0; i < N_RESERVAS; i++) {
      const r = Math.random();
      const estatus = r < 0.80 ? estFull : (r < 0.95 ? estCancelado : estInicial);
      const diasAtras = Math.floor(Math.random() * 300) + 1;
      const fecha = new Date(Date.now() - diasAtras * 86400000).toISOString().slice(0, 10);
      const { lastInsertRowid } = insertReserva.run(`Cliente Audit ${i}`, '999999999', fecha, REST_ID, estatus, `AUD${i}XYZ`.slice(0, 10) + i);
      insertItem.run(lastInsertRowid, catPlato.id, catPlato.precio);
      seedIds.push(lastInsertRowid);
    }
  })();
  console.log(`Sembrado en ${Date.now() - t0Seed}ms.`);

  // ── Medir: comportamiento VIEJO de pedidos.js (GET /api/reservations sin filtro) ──
  console.log('\n=== GET /api/reservations SIN filtro (comportamiento viejo de pedidos.js) ===');
  const viejo = await tiempoMs(() => fetch(`${BASE}/api/reservations`, { headers }).then(r => r.json()));
  console.log(`  ${viejo.ms}ms — ${viejo.data.length} reservas devueltas (¡todo el historial!)`);

  // ── Medir: comportamiento NUEVO (5 llamadas filtradas por flag, en paralelo) ──
  console.log('\n=== GET /api/reservations?flag=... x5 en paralelo (fix aplicado) ===');
  const t0Nuevo = Date.now();
  const [a,b,c,d,e] = await Promise.all([
    'es_inicial','es_confirmada','es_en_cocina','es_listo','es_cliente_llego'
  ].map(flag => fetch(`${BASE}/api/reservations?flag=${flag}`, { headers }).then(r => r.json())));
  const msNuevo = Date.now() - t0Nuevo;
  const totalActivas = a.length + b.length + c.length + d.length + e.length;
  console.log(`  ${msNuevo}ms — ${totalActivas} reservas activas devueltas (excluye ${viejo.data.length - totalActivas} históricas)`);
  console.log(`  Mejora: ${(viejo.ms / Math.max(msNuevo,1)).toFixed(1)}x más rápido, ${((1 - totalActivas/viejo.data.length)*100).toFixed(1)}% menos datos transferidos`);

  // ── GET /api/orders/activas (ya estaba bien acotado — control) ──
  console.log('\n=== GET /api/orders/activas (control, ya estaba acotado) ===');
  const ordenes = await tiempoMs(() => fetch(`${BASE}/api/orders/activas`, { headers }).then(r => r.json()));
  console.log(`  ${ordenes.ms}ms — ${ordenes.data.length} órdenes activas`);

  // ── Imágenes del menú (reporte separado del usuario) ──
  console.log('\n=== Imágenes del menú (reporte separado de lentitud) ===');
  const menu = await tiempoMs(() => fetch(`${BASE}/api/public/menu?restaurante=${REST_ID}`).then(r => r.json()));
  console.log(`  GET /api/public/menu: ${menu.ms}ms`);
  const fotos = [];
  menu.data.forEach(m => m.secciones.forEach(s => s.platos.forEach(p => { if (p.url_foto) fotos.push(p.url_foto); })));
  console.log(`  ${fotos.length} fotos referenciadas en el menú de hoy`);
  for (const foto of fotos.slice(0, 8)) {
    const t0 = Date.now();
    const res = await fetch(`${BASE}${foto}`);
    const buf = await res.arrayBuffer();
    console.log(`    ${foto} — ${(buf.byteLength/1024).toFixed(1)}KB — ${Date.now()-t0}ms — ${res.headers.get('content-type')}`);
  }
  if (!fotos.length) console.log('  (sin fotos en el menú de hoy en este entorno — no se puede medir acá)');

  // ── Limpieza ──
  console.log('\nLimpiando datos sembrados...');
  db.transaction(() => {
    const delItems = db.prepare(`DELETE FROM reserva_carta_items WHERE id_reserva = ?`);
    const delRes   = db.prepare(`DELETE FROM reservas WHERE id = ?`);
    for (const id of seedIds) { delItems.run(id); delRes.run(id); }
  })();
  console.log(`[Después de limpiar] reservas de rest ${REST_ID}: ${db.prepare('SELECT COUNT(*) c FROM reservas WHERE id_restaurante=?').get(REST_ID).c}`);
}

main().then(() => process.exit(0)).catch(e => { console.error('❌', e); process.exit(1); });
