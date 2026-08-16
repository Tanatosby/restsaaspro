// Verificación manual (no forma parte de la suite jest) del agrupamiento de
// platos por instancia de menú — ISS-041.
//
// Si un comensal pide 2 menús del día con entrada y segundo distintos, el
// ticket tiene que decir qué entrada va con qué segundo. renderMenuAgrupado()
// vive en utils.js y la usan las 4 vistas que pintan el detalle de un pedido:
// Cocina, Órdenes, Reservas y Cola del día.
//
// No hace falta navegador ni servidor: los render solo devuelven strings.
//
// Uso: node scripts/test-menus-agrupados.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

const MODULES = path.join(__dirname, '..', 'public', 'js', 'modules');
const ctx = vm.createContext({});
for (const f of ['utils.js', 'cocina.js']) {
  vm.runInContext(fs.readFileSync(path.join(MODULES, f), 'utf8'), ctx, { filename: f });
}

const linea = i => `<li>${i.plato}</li>`;
const head  = t => `<h4>${t}</h4>`;
const item  = (plato, seccion, grupo, menu_nombre = 'Menú del día') =>
  ({ plato, seccion, cantidad: 1, grupo, menu_nombre });

// Dos menús del día, cada uno con su entrada y su segundo — el caso del issue
const dosMenus = [
  item('Causa limeña',  'Entrada', 1),
  item('Lomo saltado',  'Segundo', 1),
  item('Ají de gallina','Entrada', 2),
  item('Tallarín verde','Segundo', 2),
];

// ── Cuándo agrupa y cuándo no ───────────────────────────────────────────────
console.log('\nCuándo se agrupa');

const html2 = ctx.renderMenuAgrupado(dosMenus, linea, head);
check((html2.match(/<h4>/g) || []).length === 2, 'con 2 menús aparecen 2 encabezados');
check(html2.includes('🍽️ Menú 1') && html2.includes('🍽️ Menú 2'), 'los encabezados se numeran 1 y 2');
check(html2.indexOf('Causa limeña') < html2.indexOf('🍽️ Menú 2'),
  'los platos quedan debajo del encabezado de su propio menú');
check(html2.indexOf('Ají de gallina') > html2.indexOf('🍽️ Menú 2'),
  'el segundo menú agrupa sus dos platos');

const unMenu = [item('Causa limeña', 'Entrada', 1), item('Lomo saltado', 'Segundo', 1)];
check(!ctx.renderMenuAgrupado(unMenu, linea, head).includes('<h4>'),
  'con UN solo menú no se agrupa — el encabezado sería ruido');

// Pedidos anteriores a la migración: grupo NULL
const viejos = [
  { plato: 'Causa limeña', seccion: 'Entrada', cantidad: 1, grupo: null },
  { plato: 'Lomo saltado', seccion: 'Segundo', cantidad: 1, grupo: null },
];
const htmlViejo = ctx.renderMenuAgrupado(viejos, linea, head);
check(!htmlViejo.includes('<h4>'), 'un pedido viejo (grupo null) se pinta plano, sin inventar grupos');
check(htmlViejo.includes('Causa limeña') && htmlViejo.includes('Lomo saltado'),
  'un pedido viejo no pierde ningún plato');

// Mezcla: algunos con grupo y otros sin él (no debería pasar, pero si pasa
// agrupar a medias es peor que no agrupar)
const mezcla = [item('Causa limeña', 'Entrada', 1), { plato: 'Sopa', seccion: 'Entrada', cantidad: 1, grupo: null }];
check(!ctx.renderMenuAgrupado(mezcla, linea, head).includes('<h4>'),
  'si algún ítem no tiene grupo, no se agrupa nada');

check(ctx.renderMenuAgrupado([], linea, head) === '', 'sin ítems devuelve string vacío');
check(ctx.renderMenuAgrupado(null, linea, head) === '', 'con null devuelve string vacío, no rompe');

// ── El nombre del menú, solo cuando aporta ──────────────────────────────────
console.log('\nCuándo se muestra el nombre del menú');

check(!html2.includes('Menú del día'),
  'dos menús del MISMO tipo: no se repite el nombre (con letra máxima partiría en 2 líneas)');

const tiposDistintos = [
  item('Sopa de res',     'Entrada', 1, 'Menú del día'),
  item('Pollo apanado',   'Segundo', 1, 'Menú del día'),
  item('Ensalada fresca', 'Entrada', 2, 'Menú ejecutivo'),
  item('Chuleta de res',  'Segundo', 2, 'Menú ejecutivo'),
];
const htmlMixto = ctx.renderMenuAgrupado(tiposDistintos, linea, head);
check(htmlMixto.includes('🍽️ Menú 1 · Menú del día'), 'tipos distintos: el primer encabezado lleva su nombre');
check(htmlMixto.includes('🍽️ Menú 2 · Menú ejecutivo'), 'tipos distintos: el segundo también');

// ── Casos borde ─────────────────────────────────────────────────────────────
console.log('\nCasos borde');

// Huecos en la numeración (un menú borrado del carrito antes de confirmar)
const conHueco = [item('Causa limeña', 'Entrada', 1), item('Ají de gallina', 'Entrada', 3)];
const htmlHueco = ctx.renderMenuAgrupado(conHueco, linea, head);
check(htmlHueco.includes('🍽️ Menú 1') && htmlHueco.includes('🍽️ Menú 2') && !htmlHueco.includes('Menú 3'),
  'grupos 1 y 3 se leen como "Menú 1" y "Menú 2" — se numera por posición');

// Orden de llegada alterado
const desordenado = [item('B', 'Segundo', 2), item('A', 'Entrada', 1)];
const htmlDesordenado = ctx.renderMenuAgrupado(desordenado, linea, head);
check(htmlDesordenado.indexOf('🍽️ Menú 1') < htmlDesordenado.indexOf('🍽️ Menú 2'),
  'aunque los ítems lleguen desordenados, los grupos salen en orden');

// El nombre del menú lo escribe el owner: tiene que ir escapado
const conHtml = [
  item('Causa limeña', 'Entrada', 1, '<img src=x onerror=alert(1)>'),
  item('Ají de gallina', 'Entrada', 2, 'Menú ejecutivo'),
];
const htmlEscapado = ctx.renderMenuAgrupado(conHtml, linea, head);
check(!htmlEscapado.includes('<img'), 'el nombre del menú va escapado (lo escribe el owner)');
check(htmlEscapado.includes('&lt;img'), 'se escapa, no se borra');

// Sin encabezado (una vista que solo quiera las líneas)
check(!ctx.renderMenuAgrupado(dosMenus, linea).includes('<h4>'),
  'sin función de encabezado devuelve solo las líneas');

// ── Integración con el ticket de cocina ─────────────────────────────────────
console.log('\nEn el ticket de cocina');

const orden = {
  id: 7, numero_dia: 3, mesa: 4, nombre_cliente: 'Ana', estatus: 'pendiente',
  es_inicial: 1, es_en_cocina: 0, modalidad: 'para_llevar',
  carta_items: [], menu_items: dosMenus,
};
const ticket = ctx.renderCocinaTicket(orden);
check(ticket.includes('menu-grupo-head'), 'el ticket usa la clase .menu-grupo-head');
check((ticket.match(/menu-grupo-head/g) || []).length === 2, 'pinta los 2 encabezados');
check(ticket.includes('Para llevar'), 'el badge de modalidad (ISS-042) sigue estando');
check(ticket.indexOf('Para llevar') < ticket.indexOf('menu-grupo-head'),
  'la modalidad va antes que los grupos: primero cómo se sirve, después qué se cocina');
check(ticket.includes('🍳 Preparando'), 'el botón de acción sigue estando');

const reserva = {
  id: 12, codigo: 'AB12', nombre_cliente: 'Luis', hora_llegada: '13:30', mesa: null,
  modalidad: 'en_local', menu_items: dosMenus, carta_items: [],
};
check((ctx.renderCocinaReserva(reserva).match(/menu-grupo-head/g) || []).length === 2,
  'las reservas en cocina también agrupan');

const ticketViejo = ctx.renderCocinaTicket({ ...orden, menu_items: viejos });
check(!ticketViejo.includes('menu-grupo-head'), 'un pedido viejo en cocina se ve como siempre');
check(ticketViejo.includes('Causa limeña'), 'y no pierde platos');

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
