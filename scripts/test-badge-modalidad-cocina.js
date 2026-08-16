// Verificación manual (no forma parte de la suite jest) del badge "para
// llevar" en los tickets de cocina — ISS-042.
//
// El dato (`modalidad`) ya viajaba desde el backend (utils/colaDia.js lo
// selecciona para órdenes y reservas), pero cocina.js nunca lo leía: el
// cocinero veía el mismo ticket para comer en el local que para llevar.
//
// No hace falta navegador ni servidor: renderCocinaTicket()/renderCocinaReserva()
// solo devuelven strings, así que se cargan utils.js + cocina.js en un contexto
// de vm y se inspecciona el HTML resultante.
//
// Uso: node scripts/test-badge-modalidad-cocina.js
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
// El orden importa solo por legibilidad: ninguno de los dos tiene side effects
// al cargar. utils.js define esc()/badgeEst()/badgeModalidad().
for (const f of ['utils.js', 'cocina.js']) {
  vm.runInContext(fs.readFileSync(path.join(MODULES, f), 'utf8'), ctx, { filename: f });
}

// ── badgeModalidad() ────────────────────────────────────────────────────────
console.log('\nbadgeModalidad() — vive en utils.js, no en ordenes.js');
check(typeof ctx.badgeModalidad === 'function', 'utils.js expone badgeModalidad()');
check(ctx.badgeModalidad('en_local', true) === '', 'en_local no pinta badge (sería ruido en todos los tickets)');
check(ctx.badgeModalidad(null, true) === '', 'modalidad nula no pinta badge');
check(ctx.badgeModalidad('para_llevar').includes('0.785714rem'), 'sin `grande` mantiene el tamaño chico de Órdenes/Reservas/Cola');
check(ctx.badgeModalidad('para_llevar', true).includes('0.9375rem'), 'con `grande` sube a 15px para el ticket de cocina');

// ── Ticket de orden ─────────────────────────────────────────────────────────
console.log('\nrenderCocinaTicket() — órdenes');
const ordenBase = {
  id: 7, numero_dia: 3, mesa: 4, nombre_cliente: 'Ana', estatus: 'pendiente',
  es_inicial: 1, es_en_cocina: 0,
  carta_items: [{ nombre: 'Ceviche', cantidad: 1 }],
  menu_items:  [{ plato: 'Lomo saltado', cantidad: 1, seccion: 'Segundo' }],
};

const ticketLlevar = ctx.renderCocinaTicket({ ...ordenBase, modalidad: 'para_llevar' });
check(ticketLlevar.includes('Para llevar'), 'una orden para llevar muestra "🥡 Para llevar"');

const ticketDelivery = ctx.renderCocinaTicket({ ...ordenBase, modalidad: 'delivery' });
check(ticketDelivery.includes('Delivery'), 'una orden delivery muestra "🛵 Delivery"');

const ticketLocal = ctx.renderCocinaTicket({ ...ordenBase, modalidad: 'en_local' });
check(!ticketLocal.includes('Para llevar') && !ticketLocal.includes('Delivery'),
  'una orden en local no muestra ningún badge de modalidad');

// Regresión: el badge no debe desplazar ni romper lo que el cocinero ya usaba
check(ticketLlevar.includes('Lomo saltado') && ticketLlevar.includes('Ceviche'),
  'los platos siguen apareciendo con el badge presente');
check(ticketLlevar.includes('🍳 Preparando'), 'el botón de acción sigue presente');
check(ticketLlevar.indexOf('Para llevar') < ticketLlevar.indexOf('order-items'),
  'el badge va antes de la lista de platos (se lee primero, decide cómo emplatar)');

// Sin `modalidad` (registros viejos anteriores a la columna) no debe romper
const ticketSinModalidad = ctx.renderCocinaTicket({ ...ordenBase });
check(!ticketSinModalidad.includes('undefined'), 'una orden sin `modalidad` no imprime "undefined"');

// ── Ticket de reserva ───────────────────────────────────────────────────────
console.log('\nrenderCocinaReserva() — reservas');
const reservaBase = {
  id: 12, codigo: 'AB12', nombre_cliente: 'Luis', hora_llegada: '13:30', mesa: null,
  menu_items:  [{ plato: 'Ají de gallina', cantidad: 2, seccion: 'Segundo' }],
  carta_items: [],
};

const resLlevar = ctx.renderCocinaReserva({ ...reservaBase, modalidad: 'para_llevar' });
check(resLlevar.includes('Para llevar'), 'una reserva para llevar muestra "🥡 Para llevar"');

const resLocal = ctx.renderCocinaReserva({ ...reservaBase, mesa: 5, modalidad: 'en_local' });
check(!resLocal.includes('Para llevar'), 'una reserva en local no muestra badge de modalidad');
check(resLlevar.includes('✅ Listo'), 'el botón de la reserva sigue presente');

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
