// ════════════════════════════════════════════════════════
// MÓDULO: COLA DEL DÍA — KANBAN
// Órdenes + reservas activas agrupadas por zona/etapa.
// Hace polling cada 60 s mientras el panel está activo (bajado de 30s —
// día 11 del piloto, cada refresh reordenaba los ítems por urgencia y se
// sentía como "todo se sube al principio" en medio de la hora pico).
// Globals requeridos (owner.html): detectNuevasOrdenes(),
//   detectNuevasReservas(), cambiarEstatusOrdenFlag(),
//   cambiarEstatusReservaFlag(), badgeEst(), toUTC()
// ════════════════════════════════════════════════════════

let _pedidosPollTimer = null;
let _zonaActiva = 'pendientes';

// ── Estado de la cola (ISS-026) ──────────────────────────
// Antes, tocar un botón disparaba el PATCH y una recarga completa, sin bloquear
// el botón ni descartar las respuestas de polls viejos. Resultado: el pedido
// tardaba en moverse, reaparecía en la zona anterior cuando llegaba la respuesta
// de un poll anterior al cambio, y el segundo tap devolvía "No se puede cambiar
// una orden pagado" aunque la acción sí se había aplicado.

// Token de secuencia: toda carga guarda el suyo y descarta su resultado si
// mientras tanto empezó otra más nueva (o se ejecutó una acción).
let _cargaSeq = 0;

// Acciones en vuelo, por ítem — evita que el doble tap dispare 2 PATCH
const _enVuelo = new Set();

// Última respuesta del servidor, para repintar tras una acción optimista
let _cache = { ordenes: [], reservas: [] };

// Última "firma" (JSON de los datos) pintada por zona — evita el parpadeo de
// reconstruir todo el DOM en cada poll cuando no cambió nada. Día 11 del
// piloto: "cada vez que refresca... no deja leer los pedidos bien". Solo
// compara los datos, no el orden (la urgencia puede desplazarse solo por el
// paso del tiempo sin que eso amerite un repintado).
let _ultimaFirmaZona = {};

// Flags de estatus, en orden. Aplicar uno implica apagar los demás — es como
// el backend modela el estatus (una fila de estatus_orden/estatus_reserva).
const FLAGS_ORDEN   = ['es_inicial', 'es_en_cocina', 'es_listo', 'es_entregado', 'es_pagado', 'es_cancelado'];
const FLAGS_RESERVA = ['es_inicial', 'es_confirmada', 'es_en_cocina', 'es_listo', 'es_cliente_llego', 'es_full', 'es_cancelado'];

function aplicarFlagLocal(x, flags, destino) {
  flags.forEach(f => { x[f] = 0; });
  x[destino] = 1;
}

// ── Polling ──────────────────────────────────────────────

function initPedidosPoll() {
  stopPedidosPoll();
  loadColaDia();
  // Los pedidos viejos no cambian solos: basta con mirarlos al abrir el panel,
  // no en cada poll.
  loadSinCerrar();
  _pedidosPollTimer = setInterval(loadColaDia, 60000);
}

function stopPedidosPoll() {
  if (_pedidosPollTimer) {
    clearInterval(_pedidosPollTimer);
    _pedidosPollTimer = null;
  }
}

// Reinicia la cuenta del poll tras una acción, para que el siguiente refresco
// automático no caiga justo encima del cambio que el usuario acaba de hacer.
function reiniciarPoll() {
  if (!_pedidosPollTimer) return;   // el panel no está activo
  clearInterval(_pedidosPollTimer);
  _pedidosPollTimer = setInterval(loadColaDia, 60000);
}

// ── Cambio de tab ────────────────────────────────────────

function switchZona(zona) {
  _zonaActiva = zona;
  document.querySelectorAll('#kanban-tabs .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.zona === zona);
  });
  ['pendientes', 'cocina', 'listos', 'cobrar'].forEach(z => {
    const el = document.getElementById(`zona-${z}`);
    if (el) el.style.display = z === zona ? '' : 'none';
  });
}

// ── Carga principal ──────────────────────────────────────

async function loadColaDia() {
  const seq = ++_cargaSeq;

  try {
    // Una sola llamada: antes eran 6 requests en paralelo (órdenes + 5 estados
    // de reserva), cada una con su N+1 de ítems. Como better-sqlite3 es
    // síncrono, esas consultas bloquean el proceso Node entero mientras se
    // resuelven — con 2-3 pedidos ya se notaba. Ver ISS-026.
    const { ordenes, reservas } = await api('GET', '/api/orders/cola');

    // Si mientras viajaba esta respuesta empezó otra carga, o el usuario
    // ejecutó una acción, este resultado ya es viejo: descartarlo. Sin esto,
    // un pedido recién movido reaparecía en su zona anterior.
    if (seq !== _cargaSeq) return;

    _cache = { ordenes, reservas };

    detectNuevasOrdenes(ordenes);
    detectNuevasReservas(reservas);

    renderColaDesdeCache();

  } catch(e) {
    if (seq !== _cargaSeq) return;
    ['pendientes','cocina','listos','cobrar'].forEach(z => {
      const el = document.getElementById(`zona-${z}`);
      if (el) el.innerHTML = emptyState('⚠️', e.message);
    });
  }
}

// Pinta la cola con lo que hay en _cache. Separado de loadColaDia() para poder
// repintar al instante tras una acción, sin esperar al servidor.
function renderColaDesdeCache() {
  const { ordenes, reservas } = _cache;
  const zonas = clasificarZonas(ordenes, reservas);

  // Preservar el scroll del panel (vive en .content, no en cada zona — ver
  // owner.css:322) al repintar. Sin esto, cada poll (o cada acción) reconstruye
  // las 4 zonas y el usuario que estaba viendo un pedido a mitad de la lista
  // "pierde" su lugar en cada refresco — día 11 del piloto.
  const content = document.querySelector('.content');
  const scrollPrevio = content ? content.scrollTop : 0;

  // Badge del nav (total activos)
  const total = ordenes.length + reservas.length;
  const badgeNav = document.getElementById('badge-pedidos');
  if (badgeNav) {
    badgeNav.textContent = total;
    badgeNav.classList.toggle('show', total > 0);
  }

  // Actualizar badges de tabs y contenido
  ['pendientes', 'cocina', 'listos', 'cobrar'].forEach(z => {
    const badge = document.getElementById(`kb-${z}`);
    if (badge) {
      badge.textContent = zonas[z].length;
      badge.classList.toggle('kb-badge-active', zonas[z].length > 0);
    }
    renderZona(z, zonas[z]);
  });

  if (content) content.scrollTop = scrollPrevio;
}

// ── Clasificación por zona ───────────────────────────────

function clasificarZonas(ordenes, reservas) {
  return {
    pendientes: [
      ...ordenes.filter(o => o.es_inicial)
                .map(o => ({ tipo: 'orden', datos: o })),
      ...reservas.filter(r => r.es_inicial || r.es_confirmada)
                 .map(r => ({ tipo: 'reserva', datos: r })),
    ],
    cocina: [
      ...ordenes.filter(o => o.es_en_cocina)
                .map(o => ({ tipo: 'orden', datos: o })),
      ...reservas.filter(r => r.es_en_cocina)
                 .map(r => ({ tipo: 'reserva', datos: r })),
    ],
    // Listos = órdenes listas en cocina (pendientes de entregar) + reservas listas (cliente aún no llegó)
    listos: [
      ...ordenes.filter(o => o.es_listo)
                .map(o => ({ tipo: 'orden', datos: o })),
      ...reservas.filter(r => r.es_listo)
                 .map(r => ({ tipo: 'reserva', datos: r })),
    ],
    // Por cobrar = órdenes entregadas a la mesa + reservas con cliente llegado
    cobrar: [
      ...ordenes.filter(o => o.es_entregado)
                .map(o => ({ tipo: 'orden', datos: o })),
      ...reservas.filter(r => r.es_cliente_llego)
                 .map(r => ({ tipo: 'reserva', datos: r })),
    ],
  };
}

// ── Render por zona ──────────────────────────────────────

function renderZona(zona, items) {
  const el = document.getElementById(`zona-${zona}`);
  if (!el) return;

  // Si los datos son idénticos a lo último pintado, no tocar el DOM — evita
  // el parpadeo de destruir y recrear todas las cards en cada poll.
  const firma = JSON.stringify(items.map(i => i.datos));
  if (_ultimaFirmaZona[zona] === firma) return;
  _ultimaFirmaZona[zona] = firma;

  if (!items.length) {
    el.innerHTML = emptyState('✅', 'Sin pedidos en esta etapa');
    return;
  }
  el.innerHTML = items
    .sort((a, b) => urgenciaItem(b) - urgenciaItem(a))
    .map(item => renderKanbanCard(item, zona))
    .join('');
}

function urgenciaItem(item) {
  if (item.tipo === 'orden') {
    return Date.now() - new Date(toUTC(item.datos.created_at)).getTime();
  }
  // Reserva sin hora de llegada: se trata igual que una orden — mientras más
  // tiempo lleva esperando sin avanzar, más urgente. Antes tenía urgencia fija
  // en 0 y quedaba enterrada debajo de cualquier orden u otra reserva con hora
  // ya vencida — día 11 del piloto: el cliente ya había llegado y la dueña no
  // encontraba la reserva en la Cola para pasarla a cocina.
  if (!item.datos.hora_llegada) {
    return Date.now() - new Date(toUTC(item.datos.created_at)).getTime();
  }
  const hoy    = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const llegada = new Date(`${hoy}T${item.datos.hora_llegada}:00-05:00`).getTime();
  return -(llegada - Date.now());
}

// ── Cards con botón de acción rápida ─────────────────────

function renderKanbanCard(item, zona) {
  return item.tipo === 'orden'
    ? renderKanbanOrden(item.datos, zona)
    : renderKanbanReserva(item.datos, zona);
}

// comprobanteThumb() vive en utils.js — compartida con ordenes.js/reservas.js.

function renderKanbanOrden(o, zona) {
  const minutos    = Math.floor((Date.now() - new Date(toUTC(o.created_at)).getTime()) / 60000);
  // Mesa grande / #orden chico (día 11 del piloto) — el cocinero/mozo actúa
  // por mesa, no por número de orden. Para llevar/delivery no tienen mesa:
  // ahí el #orden vuelve a ser lo único que identifica el pedido.
  const numTag     = `#${o.numero_dia ?? o.id}`;
  const tituloHtml = o.mesa
    ? `🧾 <strong>Mesa ${o.mesa}</strong> <span class="cola-meta">${numTag}</span>`
    : `🧾 <strong>${numTag}</strong>`;
  const items      = renderItemLines(o.carta_items, o.menu_items, o.modalidad);
  const btnAccion  = btnOrden(o, zona);
  // Cancelar: siempre disponible en cualquier etapa (mismo criterio que el panel de Órdenes).
  const btnCancelar = `<button class="btn btn-danger btn-sm" onclick="accionRapidaOrden(${o.id},'es_cancelado')">✗ Cancelar</button>`;
  const modBadge   = badgeModalidad(o.modalidad, false, contarMenusParaLlevar(o.menu_items));
  const pagoHtml   = (o.metodo_pago || o.es_manual) ? `<div style="margin-top:4px">${badgeManual(o)}${badgePago(o)}${comprobanteThumb(o)}</div>` : '';

  return `
    <div class="cola-card cola-orden">
      <div class="cola-card-header">
        <div class="cola-card-title">
          ${tituloHtml}
          <span class="cola-meta">${o.nombre_cliente ? esc(o.nombre_cliente) : ''}</span>
          ${modBadge}
        </div>
        <span class="cola-tiempo">${minutos} min</span>
      </div>
      ${items ? `<div class="cola-items">${items}</div>` : ''}
      ${pagoHtml}
      <div class="order-actions" style="margin-top:0.5rem">${btnAccion}${btnCancelar}</div>
    </div>`;
}

function renderKanbanReserva(r, zona) {
  const horaTag    = r.hora_llegada ? `🕐 ${r.hora_llegada} ` : '';
  // Mesa grande (día 11 del piloto) — sale del rincón chico/gris y pasa al
  // título, igual que en renderKanbanOrden().
  const mesaHtml   = r.mesa ? `<strong>Mesa ${r.mesa}</strong>` : '';
  const codigo     = r.codigo ? `<span class="cola-codigo">🔑 ${r.codigo}</span>` : '';
  const items      = renderItemLines(r.carta_items, r.menu_items, r.modalidad);
  const btnAccion  = btnReserva(r, zona);
  // Cancelar: se oculta una vez que el cliente ya llegó o la reserva ya se completó
  // (mismo criterio que el panel de Reservas — no tiene sentido cancelar en ese punto).
  const btnCancelar = (!r.es_cliente_llego && !r.es_full)
    ? `<button class="btn btn-danger btn-sm" onclick="accionRapidaReserva(${r.id},'es_cancelado')">✗ Cancelar</button>`
    : '';
  const modBadge   = badgeModalidad(r.modalidad, false, contarMenusParaLlevar(r.menu_items));
  const pagoHtml   = r.metodo_pago ? `<div style="margin-top:4px">${badgePago(r)}${comprobanteThumb(r)}</div>` : '';

  return `
    <div class="cola-card cola-reserva">
      <div class="cola-card-header">
        <div class="cola-card-title">
          📅 <strong>${esc(r.nombre_cliente || '—')}</strong>
          ${mesaHtml}
          ${codigo}
          ${modBadge}
        </div>
        <span class="cola-tiempo">${horaTag}</span>
      </div>
      ${items ? `<div class="cola-items">${items}</div>` : ''}
      ${pagoHtml}
      ${(btnAccion || btnCancelar) ? `<div class="order-actions" style="margin-top:0.5rem">${btnAccion}${btnCancelar}</div>` : ''}
    </div>`;
}

// ── Botones de acción rápida ──────────────────────────────

// Pago digital (yape/plin) sin confirmar: el owner debe revisar el comprobante
// antes de poder cobrar/completar (el backend también lo bloquea).
function requiereConfirmarPago(x) {
  return ['yape', 'plin'].includes(x.metodo_pago) && x.estado_pago !== 'confirmado';
}

// ISS-055: la cocinera pidió poder deshacer un toque accidental en "Listo".
// El backend ya acepta cualquier flag hacia atrás mientras la orden/reserva no
// esté pagada ni cancelada (ver orders.js/reservations.js) — este botón solo
// reusa accionRapidaOrden/Reserva con 'es_en_cocina'. Solo se ofrece en la zona
// Listos: una vez cobrado/entregado no tiene sentido mostrarlo.
function btnRegresarACocinaOrden(o) {
  return `<button class="btn btn-ghost btn-sm" onclick="accionRapidaOrden(${o.id},'es_en_cocina')">↩️ Regresar a cocina</button>`;
}
function btnRegresarACocinaReserva(r) {
  return `<button class="btn btn-ghost btn-sm" onclick="accionRapidaReserva(${r.id},'es_en_cocina')">↩️ Regresar a cocina</button>`;
}

function btnOrden(o, zona) {
  const paraLlevar = o.modalidad === 'para_llevar';
  const btnCobrar = `<button class="btn btn-success btn-sm" onclick="cobrarColaOrden(${o.id})">💰 Cobrar</button>`;
  if (zona === 'pendientes' && o.es_inicial)
    return `<button class="btn btn-primary btn-sm" onclick="accionRapidaOrden(${o.id},'es_en_cocina')">🍳 A cocina</button>`;
  // Día 9 del piloto: en la zona Cocina solo se podía cancelar, no marcar listo.
  // Como "↩️ Regresar a cocina" ya existe en Listos (ISS-055), el ciclo queda
  // simétrico y no hay riesgo de dejar un pedido sin forma de volver atrás.
  if (zona === 'cocina' && o.es_en_cocina)
    return `<button class="btn btn-primary btn-sm" onclick="accionRapidaOrden(${o.id},'es_listo')">✅ Listo</button>`;
  // ISS-079: antes, para llevar se cobraba directo desde "Listos" (btnCobrar),
  // sin pasar por "Cobrar" — la orden se cerraba de un solo toque y no quedaba
  // ningún lugar donde confirmar si pagó o no. Ahora ambas modalidades hacen
  // la misma parada intermedia (marcar es_entregado) antes de "Cobrar";
  // homologa el flujo con el de mesa y con reservas — ver btnReserva().
  if (zona === 'listos' && o.es_listo)
    return `<button class="btn btn-primary btn-sm" onclick="accionRapidaOrden(${o.id},'es_entregado')">${paraLlevar ? '📦 Recogido' : '🍽 Entregar'}</button>${btnRegresarACocinaOrden(o)}`;
  if (zona === 'cobrar' && o.es_entregado)
    return btnCobrar;
  return '';
}

function btnReserva(r, zona) {
  const sinMesa = r.modalidad === 'para_llevar' || r.modalidad === 'delivery';
  const btnCompletar = `<button class="btn btn-success btn-sm" onclick="cobrarColaReserva(${r.id})">💰 Completar</button>`;
  if (zona === 'pendientes' && r.es_confirmada)
    return `<button class="btn btn-primary btn-sm" onclick="accionRapidaReserva(${r.id},'es_en_cocina')">🍳 A cocina</button>`;
  if (zona === 'pendientes' && r.es_inicial)
    return `<button class="btn btn-success btn-sm" onclick="accionRapidaReserva(${r.id},'es_confirmada')">✓ Confirmar</button>`;
  // Día 9 del piloto — mismo criterio que btnOrden(): ver comentario arriba.
  if (zona === 'cocina' && r.es_en_cocina)
    return `<button class="btn btn-primary btn-sm" onclick="accionRapidaReserva(${r.id},'es_listo')">✅ Listo</button>`;
  // ISS-079: para llevar/delivery se completaba directo desde "Listos", sin
  // pasar por "Cobrar" — igual que btnOrden(), ahora hace la misma parada
  // intermedia (marcar es_cliente_llego) para que siempre haya un lugar donde
  // confirmar el pago antes de cerrar.
  if (zona === 'listos' && r.es_listo)
    return `<button class="btn btn-primary btn-sm" onclick="accionRapidaReserva(${r.id},'es_cliente_llego')">${sinMesa ? '📦 Recogido' : '🍽 Entregado'}</button>${btnRegresarACocinaReserva(r)}`;
  if (zona === 'cobrar' && r.es_cliente_llego)
    return btnCompletar;
  return '';
}

// ── Acciones rápidas ─────────────────────────────────────

// Mueve el ítem de zona al instante y recién después confirma con el servidor.
// Si el backend rechaza, se revierte al estado anterior y se avisa.
//
// El guard por clave (`o12`/`r34`) es lo que mata el bug del doble tap: antes,
// como no pasaba nada visible durante la request, el owner tocaba de nuevo; el
// primer PATCH funcionaba y el segundo devolvía "No se puede cambiar una orden
// pagado", mostrando un error por una acción que sí había funcionado.
async function accionRapida({ clave, item, flags, flag, url, okMsg }) {
  if (_enVuelo.has(clave)) return;
  _enVuelo.add(clave);

  // Invalidar cargas en vuelo: sus datos ya no reflejan lo que acaba de pasar
  _cargaSeq++;

  const previo = item ? { ...item } : null;
  if (item) {
    aplicarFlagLocal(item, flags, flag);
    renderColaDesdeCache();
  }

  try {
    await api(url.method, url.path, { flag });
    toast(okMsg);
    reiniciarPoll();
    await loadColaDia();
  } catch (e) {
    // Revertir: el cambio optimista no llegó a aplicarse en el servidor
    if (previo) {
      Object.assign(item, previo);
      renderColaDesdeCache();
    }
    toast(e.message, 'err');
  } finally {
    _enVuelo.delete(clave);
  }
}

async function accionRapidaOrden(id, flag) {
  return accionRapida({
    clave: `o${id}`,
    item:  _cache.ordenes.find(o => o.id === id),
    flags: FLAGS_ORDEN,
    flag,
    url:   { method: 'PATCH', path: `/api/orders/${id}/estatus` },
    okMsg: 'Orden actualizada',
  });
}

async function accionRapidaReserva(id, flag) {
  return accionRapida({
    clave: `r${id}`,
    item:  _cache.reservas.find(r => r.id === id),
    flags: FLAGS_RESERVA,
    flag,
    url:   { method: 'PATCH', path: `/api/reservations/${id}/estatus` },
    okMsg: 'Reserva actualizada',
  });
}

// ── Cobro en 1 clic desde la Cola ──────────────────────────
// Decisión del usuario, 2026-08-25: revisar el comprobante en 2 pasos
// separados ("Confirmar pago" y luego "Cobrar"/"Completar") no le daba a la
// dueña la seguridad para la que estaba pensado — igual termina verificando
// por fuera en la app de Yape — y sí le sumaba un punto más donde perder el
// hilo en plena hora pico. Ahora un solo tap hace las 2 llamadas que hacía
// falta hacer por separado; el backend sigue validando lo mismo
// (requiereConfirmarPagoAntes), solo que lo satisface este mismo tap.
// No se reutilizan cobrarOrden()/completarReserva() de ordenes.js/reservas.js
// porque esas refrescan sus propios paneles (loadOrdenesActivas/
// loadReservasActivas): tocadas desde la Cola, el cambio no se veía hasta el
// siguiente poll y parecía que el botón no había hecho nada.
async function cobrarColaOrden(id) {
  const item = _cache.ordenes.find(o => o.id === id);
  if (item && requiereConfirmarPago(item)) {
    try { await api('PATCH', `/api/orders/${id}/confirmar-pago`); }
    catch (e) { toast(e.message, 'err'); return; }
  }
  return accionRapidaOrden(id, 'es_pagado');
}

async function cobrarColaReserva(id) {
  const item = _cache.reservas.find(r => r.id === id);
  if (item && requiereConfirmarPago(item)) {
    try { await api('PATCH', `/api/reservations/${id}/confirmar-pago`); }
    catch (e) { toast(e.message, 'err'); return; }
  }
  return accionRapidaReserva(id, 'es_full');
}

// ════════════════════════════════════════════════════════
// CIERRE DE CAJA — pedidos de días anteriores sin cerrar
//
// La Cola muestra solo lo de hoy, para que no se llene de basura acumulada.
// Pero lo que quedó abierto de días previos no se puede simplemente ocultar:
// `total` solo se escribe cuando la orden se marca como cobrada, y Ganancias
// suma `WHERE total IS NOT NULL` — mientras sigan abiertos, ese dinero no
// aparece en ningún reporte. Acá el dueño los cierra uno por uno.
// ════════════════════════════════════════════════════════

let _sinCerrar = { ordenes: [], reservas: [] };

async function loadSinCerrar() {
  const banner = document.getElementById('banner-sin-cerrar');
  if (!banner) return;

  try {
    _sinCerrar = await api('GET', '/api/orders/sin-cerrar');
  } catch (_) {
    // El aviso es secundario: si falla, la cola del día debe seguir funcionando
    banner.style.display = 'none';
    return;
  }

  const total = _sinCerrar.ordenes.length + _sinCerrar.reservas.length;
  banner.style.display = total > 0 ? '' : 'none';

  const conteo = document.getElementById('sin-cerrar-conteo');
  if (conteo) conteo.textContent = total === 1 ? '1 pedido' : `${total} pedidos`;
}

// ── Agregar manual (mesa/sin internet/sin celular, ver backlog.md) ──────
// El pedido lo toma la dueña/mozo de palabra y entra directo a "En cocina"
// (routes/orders.js, manual:true) — sin el tap extra de "→ Preparando" que
// sí tienen los pedidos de la app. El método de pago y el aviso de "Confirmar
// pago" los pinta badgeManual()/badgePago() en la propia tarjeta de la cola.
//
// Con fotos (2026-08-19): antes cada plato se elegía con un <select> de
// texto plano. Ahora reusa PlatoPicker — el mismo selector visual (grid de
// fotos) que ya se usaba para armar las secciones del menú del día en
// Configuración — sin construir ningún widget nuevo. De paso se sumó la
// carta (antes "Agregar manual" solo tenía menú del día): mismo patrón de
// card con foto + stepper de cantidad que ya usaba el menú.

let _manualMenus      = [];  // menús del día activos hoy, con secciones y platos
let _manualInstancias = {};  // { [id_menu_dia]: [ {id_seccion: id_componente}, ... ] } — 1 entrada por instancia
let _manualCarta      = [];  // platos de carta activos
let _manualCartaQty   = {};  // { [id_plato_carta]: cantidad }

function todayLimaPedidos() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

async function abrirModalAgregarManual() {
  document.getElementById('manual-nombre').value = '';
  document.getElementById('manual-error').textContent = '';
  _manualInstancias = {};
  _manualCartaQty   = {};

  document.getElementById('modal-agregar-manual').style.display = 'flex';

  const selMesa    = document.getElementById('manual-mesa');
  const listaMenus = document.getElementById('manual-menus-lista');
  const listaCarta = document.getElementById('manual-carta-lista');
  selMesa.innerHTML = '<option value="">Sin mesa</option>';
  listaMenus.innerHTML = '<div class="loading-text">Cargando menú del día…</div>';
  listaCarta.innerHTML = '';

  try {
    const [mesas, menus, carta] = await Promise.all([
      api('GET', '/api/mesas/estado'),
      api('GET', `/api/menu/menus-dia?dia=${todayLimaPedidos()}`),
      api('GET', '/api/menu/platos-carta'),
    ]);

    if (mesas.length) {
      selMesa.innerHTML += mesas.map(m => `<option value="${m.numero}">Mesa ${m.numero} · ${esc(m.estado)}</option>`).join('');
    }

    // Igual criterio que el cliente en menu.html (routes/public.js): solo
    // menús activos hoy — el mozo no debería poder tomar un pedido de un
    // menú que la dueña ya deshabilitó.
    _manualMenus = menus.filter(m => m.activo);
    listaMenus.innerHTML = _manualMenus.length
      ? _manualMenus.map(renderManualMenuCard).join('')
      : emptyState('🍽️', 'No hay menú configurado para hoy');

    _manualCarta = carta.filter(p => p.activo);
    listaCarta.innerHTML = _manualCarta.length
      ? `<div style="font-size:0.857143rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:0.3rem">Carta</div>${_manualCarta.map(renderManualCartaItem).join('')}`
      : '';
  } catch (e) {
    listaMenus.innerHTML = emptyState('⚠️', e.message);
  }
}

function cerrarModalAgregarManual() {
  document.getElementById('modal-agregar-manual').style.display = 'none';
}

// ── Stock rápido: marcar "Agotado" sin entrar a Configuración ───────────
// Acceso directo desde Cola del día — día 11 del piloto: el camino normal
// (Configuración → Menú del día → sección → plato → ⋯ → Stock) es demasiado
// lento para un ajuste de emergencia en plena hora pico. Reusa el mismo
// endpoint de "agotado" que ya existía — solo cambia el camino para llegar,
// y muestra los platos en una lista plana (sin el acordeón de secciones)
// para encontrar cualquiera de un vistazo.
let _stockRapidoMenus = [];

async function abrirStockRapido() {
  document.getElementById('modal-stock-rapido').style.display = 'flex';
  await cargarStockRapido();
}

async function cargarStockRapido() {
  const lista = document.getElementById('stock-rapido-lista');
  lista.innerHTML = '<div class="loading-text">Cargando…</div>';
  try {
    const menus = await api('GET', `/api/menu/menus-dia?dia=${todayLimaPedidos()}`);
    // Mismo criterio que "Agregar manual": solo menús activos hoy.
    _stockRapidoMenus = menus.filter(m => m.activo);
    renderStockRapidoLista();
  } catch (e) {
    lista.innerHTML = emptyState('⚠️', e.message);
  }
}

function renderStockRapidoLista() {
  const lista = document.getElementById('stock-rapido-lista');
  const filas = _stockRapidoMenus.flatMap(m =>
    m.secciones.flatMap(s => s.platos.map(p => ({ m, s, p })))
  );
  if (!filas.length) { lista.innerHTML = emptyState('🍽️', 'No hay menú configurado para hoy'); return; }

  const multiMenu = _stockRapidoMenus.length > 1;
  lista.innerHTML = filas.map(({ m, s, p }) => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;padding:0.55rem 0;border-bottom:1px solid var(--border)">
      <div style="min-width:0">
        <div style="font-weight:600;font-size:0.95rem;${p.agotado ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(p.nombre)}</div>
        <div style="font-size:0.8rem;color:var(--muted)">${esc(s.nombre_seccion)}${multiMenu ? ' · ' + esc(m.nombre) : ''}</div>
      </div>
      <button onclick="toggleAgotadoRapido(${m.id},${s.id_seccion},${p.id_componente},${p.agotado ? 1 : 0})"
        style="min-height:44px;padding:0 14px;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;white-space:nowrap;border:1px solid ${p.agotado ? 'var(--accent)' : 'var(--danger,#dc3545)'};background:${p.agotado ? 'var(--accent)' : 'transparent'};color:${p.agotado ? '#fff' : 'var(--danger,#dc3545)'}">
        ${p.agotado ? '✔ Disponible' : '⛔ Agotado'}
      </button>
    </div>
  `).join('');
}

async function toggleAgotadoRapido(menuId, seccionId, componenteId, agotadoActual) {
  try {
    await api('PATCH', `/api/menu/menus-dia/${menuId}/secciones/${seccionId}/platos/${componenteId}/agotado`, { agotado: agotadoActual ? 0 : 1 });
    toast(agotadoActual ? 'Marcado como disponible' : 'Marcado como agotado');
    await cargarStockRapido();
  } catch (e) { toast(e.message, 'err'); }
}

function cerrarStockRapido() {
  document.getElementById('modal-stock-rapido').style.display = 'none';
}

// Misma prioridad que usa menu.html para la portada: el plato que el owner
// eligió explícitamente (id_plato_portada) y, si no hay, el primero con foto.
function fotoPortadaManual(menu) {
  const todos = menu.secciones.flatMap(s => s.platos);
  const portada = todos.find(p => p.id_plato === menu.id_plato_portada);
  return (portada && portada.url_foto) || todos.find(p => p.url_foto)?.url_foto || null;
}

function renderManualMenuCard(menu) {
  const cantidad = (_manualInstancias[menu.id] || []).length;
  const foto = fotoPortadaManual(menu);
  const fotoHtml = foto
    ? `<img src="${esc(foto)}" alt="${esc(menu.nombre)}" style="width:100%;height:84px;object-fit:cover;display:block">`
    : `<div style="width:100%;height:84px;background:linear-gradient(135deg,var(--accent),var(--accent-dark));display:flex;align-items:center;justify-content:center;font-size:1.714286rem">🍽️</div>`;
  return `
    <div class="manual-menu-card" data-menu="${menu.id}" style="border:1px solid var(--border);border-radius:10px;overflow:hidden;display:flex;flex-direction:column">
      ${fotoHtml}
      <div style="padding:0.75rem;display:flex;flex-direction:column;gap:0.6rem">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
          <strong style="font-size:1rem">${esc(menu.nombre)}</strong>
          <span style="color:var(--muted);font-size:0.928571rem">S/ ${Number(menu.precio).toFixed(2)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem">
          <button type="button" onclick="cambiarCantidadManual(${menu.id},-1)" style="min-width:44px;min-height:44px;border-radius:8px;border:1px solid var(--border-2);background:var(--white);font-size:1.142857rem;cursor:pointer">−</button>
          <span class="manual-qty-num" style="min-width:1.5rem;text-align:center;font-weight:700">${cantidad}</span>
          <button type="button" onclick="cambiarCantidadManual(${menu.id},1)" style="min-width:44px;min-height:44px;border-radius:8px;border:1px solid var(--border-2);background:var(--white);font-size:1.142857rem;cursor:pointer">+</button>
          <span style="font-size:0.857143rem;color:var(--muted)">${cantidad ? 'menú(s)' : 'agregar'}</span>
        </div>
        <div id="manual-secciones-${menu.id}">${renderManualInstancias(menu)}</div>
      </div>
    </div>`;
}

function renderManualInstancias(menu) {
  const instancias = _manualInstancias[menu.id] || [];
  if (!instancias.length) return '';
  return instancias.map((seleccion, idx) => `
    <div style="border-top:1px dashed var(--border);padding-top:0.6rem;display:flex;flex-direction:column;gap:0.5rem">
      ${instancias.length > 1 ? `<div style="font-size:0.785714rem;font-weight:700;color:var(--muted)">Menú ${idx + 1} de ${instancias.length}</div>` : ''}
      ${menu.secciones.map(s => renderManualSeccion(menu.id, idx, s, seleccion)).join('')}
    </div>`).join('');
}

// Mismo criterio de disponibilidad que usa el cliente en menu.html
// (routes/public.js): ni agotado a mano NI sin porciones restantes.
// stock_restante === null → sin control de stock, siempre disponible.
function platoDisponibleManual(p) {
  return !p.agotado && (p.stock_restante === null || p.stock_restante > 0);
}

// Lista plana de nombres, sin fotos ni modal aparte — antes cada sección
// abría PlatoPicker (grid de fotos) encima de este modal, y era el mismo
// camino largo que ya sabemos que le cuesta a la dueña (ISS-072, día 11 del
// piloto: no le hace falta ver la foto, ella ya sabe qué es cada plato).
// Tocar el mismo plato ya elegido lo deselecciona — mismo patrón de
// ISS-069 en menu.html.
function renderManualSeccion(menuId, idx, seccion, seleccion) {
  const disponibles = seccion.platos.filter(platoDisponibleManual);
  const actualId = seleccion[seccion.id_seccion] ?? null;

  const opciones = disponibles.length
    ? disponibles.map(p => {
        const activo = actualId !== null && Number(actualId) === p.id_componente;
        return `<button type="button"
            onclick="elegirPlatoManual(${menuId},${idx},${seccion.id_seccion},${p.id_componente})"
            style="text-align:left;padding:9px 10px;min-height:44px;border-radius:8px;font-family:inherit;cursor:pointer;font-size:0.892857rem;
              border:1.5px solid ${activo ? 'var(--accent)' : 'var(--border-2)'};
              background:${activo ? 'var(--accent-light)' : 'var(--white)'};
              color:var(--text);font-weight:${activo ? '700' : '500'}">
            ${activo ? '● ' : ''}${esc(p.nombre)}
          </button>`;
      }).join('')
    : `<span style="font-size:0.8rem;color:var(--muted)">Sin platos disponibles</span>`;

  return `
    <label style="display:flex;flex-direction:column;gap:0.3rem">
      <span style="font-size:0.785714rem;color:var(--muted)">${esc(seccion.nombre_seccion)}${seccion.requerido ? ' <span style="color:var(--danger)">*</span>' : ''}</span>
      <div style="display:flex;flex-direction:column;gap:5px">${opciones}</div>
    </label>`;
}

function cambiarCantidadManual(menuId, delta) {
  const menu = _manualMenus.find(m => m.id === menuId);
  if (!menu) return;
  if (!_manualInstancias[menuId]) _manualInstancias[menuId] = [];
  const arr = _manualInstancias[menuId];

  if (delta > 0) arr.push({});
  else if (arr.length) arr.pop();

  const card = document.querySelector(`.manual-menu-card[data-menu="${menuId}"]`);
  if (!card) return;
  card.querySelector('.manual-qty-num').textContent = arr.length;
  document.getElementById(`manual-secciones-${menuId}`).innerHTML = renderManualInstancias(menu);
}

function elegirPlatoManual(menuId, idx, idSeccion, idComponente) {
  const seleccion = (_manualInstancias[menuId] || [])[idx];
  if (!seleccion) return;

  // Tocar el mismo plato ya elegido lo deselecciona (ISS-069, mismo patrón).
  if (seleccion[idSeccion] === Number(idComponente)) delete seleccion[idSeccion];
  else seleccion[idSeccion] = Number(idComponente);

  const menu = _manualMenus.find(m => m.id === menuId);
  if (!menu) return;
  const cont = document.getElementById(`manual-secciones-${menuId}`);
  if (cont) cont.innerHTML = renderManualInstancias(menu);
}

// ── Carta — mismo patrón de card+stepper que el menú del día, sin picker
// (acá no hay secciones que elegir, solo cantidad) ──
function renderManualCartaItem(plato) {
  const cantidad = _manualCartaQty[plato.id] || 0;
  const foto = plato.url_foto
    ? `<img src="${esc(plato.url_foto)}" alt="" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0">`
    : `<span style="width:44px;height:44px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.142857rem;background:var(--surface-2);border:1px solid var(--border);color:var(--muted)">🍽️</span>`;
  return `
    <div class="manual-carta-item" data-plato="${plato.id}" style="display:flex;align-items:center;gap:0.65rem;padding:0.5rem 0;border-bottom:1px solid var(--border)">
      ${foto}
      <div style="flex:1;min-width:0">
        <div style="font-size:0.857143rem;font-weight:600;color:var(--text)">${esc(plato.nombre)}</div>
        <div style="font-size:0.785714rem;color:var(--muted)">S/ ${Number(plato.precio).toFixed(2)}</div>
      </div>
      <button type="button" onclick="cambiarCantidadCartaManual(${plato.id},-1)" style="min-width:38px;min-height:38px;border-radius:8px;border:1px solid var(--border-2);background:var(--white);font-size:1.071429rem;cursor:pointer">−</button>
      <span class="manual-carta-qty-num" style="min-width:1.3rem;text-align:center;font-weight:700;font-size:0.857143rem">${cantidad}</span>
      <button type="button" onclick="cambiarCantidadCartaManual(${plato.id},1)" style="min-width:38px;min-height:38px;border-radius:8px;border:1px solid var(--border-2);background:var(--white);font-size:1.071429rem;cursor:pointer">+</button>
    </div>`;
}

function cambiarCantidadCartaManual(platoId, delta) {
  const next = Math.max(0, (_manualCartaQty[platoId] || 0) + delta);
  _manualCartaQty[platoId] = next;
  const row = document.querySelector(`.manual-carta-item[data-plato="${platoId}"] .manual-carta-qty-num`);
  if (row) row.textContent = next;
}

async function enviarPedidoManual() {
  const nombre = document.getElementById('manual-nombre').value.trim();
  const mesa   = document.getElementById('manual-mesa').value || null;
  const errEl  = document.getElementById('manual-error');
  errEl.textContent = '';

  if (!nombre) { errEl.textContent = 'El nombre del cliente es obligatorio'; return; }

  // Mismo criterio de secciones obligatorias que ISS-046 (utils/validarSeccionesMenu.js) —
  // el backend vuelve a validarlo, esto solo evita el ida-y-vuelta con el error 400.
  let grupo = 0;
  const menu_items = [];
  for (const menu of _manualMenus) {
    for (const seleccion of (_manualInstancias[menu.id] || [])) {
      grupo++;
      const faltante = menu.secciones.find(s => s.requerido && !seleccion[s.id_seccion]);
      if (faltante) { errEl.textContent = `"${menu.nombre}": falta elegir "${faltante.nombre_seccion}"`; return; }
      for (const s of menu.secciones) {
        const idComponente = seleccion[s.id_seccion];
        if (idComponente) menu_items.push({ id_componente: idComponente, id_menu_dia: menu.id, cantidad: 1, grupo });
      }
    }
  }

  const carta_items = Object.entries(_manualCartaQty)
    .filter(([, cantidad]) => cantidad > 0)
    .map(([id_plato_carta, cantidad]) => ({ id_plato_carta: Number(id_plato_carta), cantidad }));

  if (!menu_items.length && !carta_items.length) { errEl.textContent = 'Agrega al menos un ítem'; return; }

  const btn = document.getElementById('manual-btn-enviar');
  btn.disabled = true;
  btn.textContent = 'Enviando…';
  try {
    await api('POST', '/api/orders', { mesa, nombre_cliente: nombre, menu_items, carta_items, manual: true });
    toast('Pedido manual enviado a cocina');
    cerrarModalAgregarManual();
    reiniciarPoll();
    loadColaDia();
  } catch (e) {
    errEl.textContent = e.message || 'No se pudo crear el pedido';
  } finally {
    btn.disabled = false;
    btn.textContent = '🍳 Enviar a cocina';
  }
}

function abrirCierreCaja() {
  renderCierreCaja();
  const modal = document.getElementById('modal-cierre-caja');
  if (modal) modal.style.display = 'flex';
}

function cerrarCierreCaja() {
  const modal = document.getElementById('modal-cierre-caja');
  if (modal) modal.style.display = 'none';
}

function renderCierreCaja() {
  const cont = document.getElementById('cierre-caja-lista');
  if (!cont) return;

  const filas = [
    ..._sinCerrar.ordenes.map(o  => cierreItemOrden(o)),
    ..._sinCerrar.reservas.map(r => cierreItemReserva(r)),
  ];

  cont.innerHTML = filas.length
    ? filas.join('')
    : emptyState('✅', 'No queda nada sin cerrar');

  if (!filas.length) loadSinCerrar();   // esconde el banner al vaciarse
}

// La fecha viene 'YYYY-MM-DD' o con timestamp — fDate() espera solo la fecha
const soloFecha = f => String(f || '').slice(0, 10);

// Un pago digital sin confirmar bloquea el cobro en el backend
// (routes/orders.js:405 y reservations.js:270). Hasta que estas tarjetas
// mostraron el comprobante, el mensaje "Confirma el pago (revisa el
// comprobante)" era un callejón sin salida: la foto y el botón de confirmar
// solo existían en la Cola del día, y estos pedidos son de días anteriores, así
// que ya no aparecen ahí. La dueña del piloto se quedó trabada justo acá.
function cierreItemOrden(o) {
  const items = renderItemLines(o.carta_items, o.menu_items, o.modalidad);
  const mesa  = o.mesa ? ` · Mesa ${o.mesa}` : '';
  const monto = o.total ? ` · S/ ${o.total.toFixed(2)}` : '';
  const pagoHtml = (o.metodo_pago || o.es_manual) ? `<div style="margin-top:4px">${badgeManual(o)}${badgePago(o)}${comprobanteThumb(o)}</div>` : '';
  const btnCobro = `<button class="btn btn-success btn-sm" onclick="cobrarCierre('orden',${o.id})">💰 Se cobró</button>`;

  return `
    <div class="cierre-item">
      <div class="cierre-item-head">🧾 Orden #${o.numero_dia ?? o.id}${mesa}</div>
      <div class="cierre-item-meta">${fDate(soloFecha(o.fecha))} · ${esc(o.nombre_cliente || 'Sin nombre')} · ${esc(o.estatus)}${monto}</div>
      ${items ? `<div class="cierre-item-items">${items}</div>` : ''}
      ${pagoHtml}
      <div class="cierre-item-acciones">
        ${btnCobro}
        <button class="btn btn-danger btn-sm"  onclick="cerrarPedidoViejo('orden',${o.id},'anulado')">✗ No se concretó</button>
      </div>
    </div>`;
}

function cierreItemReserva(r) {
  const items = renderItemLines(r.carta_items, r.menu_items, r.modalidad);
  const codigo = r.codigo ? ` · 🔑 ${esc(r.codigo)}` : '';
  const pagoHtml = r.metodo_pago ? `<div style="margin-top:4px">${badgePago(r)}${comprobanteThumb(r)}</div>` : '';
  const btnCobro = `<button class="btn btn-success btn-sm" onclick="cobrarCierre('reserva',${r.id})">💰 Se cobró</button>`;

  return `
    <div class="cierre-item">
      <div class="cierre-item-head">📅 ${esc(r.nombre_cliente || 'Sin nombre')}${codigo}</div>
      <div class="cierre-item-meta">${fDate(soloFecha(r.fecha))} · ${esc(r.estatus)}</div>
      ${items ? `<div class="cierre-item-items">${items}</div>` : ''}
      ${pagoHtml}
      <div class="cierre-item-acciones">
        ${btnCobro}
        <button class="btn btn-danger btn-sm"  onclick="cerrarPedidoViejo('reserva',${r.id},'anulado')">✗ No se concretó</button>
      </div>
    </div>`;
}

// Un solo tap: si hace falta, confirma el pago digital y de una vez cierra
// el pedido como cobrado — reusa cerrarPedidoViejo() para el paso final. No
// se reutiliza cobrarColaOrden()/cobrarColaReserva(): esas operan sobre
// _cache y repintan la Cola del día con renderColaDesdeCache(). Acá la
// lista es _sinCerrar y el modal tiene su propio render.
async function cobrarCierre(tipo, id) {
  const esOrden = tipo === 'orden';
  const lista   = esOrden ? 'ordenes' : 'reservas';
  const item    = _sinCerrar[lista].find(x => x.id === id);
  if (item && requiereConfirmarPago(item)) {
    try {
      await api('PATCH', esOrden
        ? `/api/orders/${id}/confirmar-pago`
        : `/api/reservations/${id}/confirmar-pago`);
    } catch (e) { toast(e.message, 'err'); return; }
  }
  return cerrarPedidoViejo(tipo, id, 'cobrado');
}

// 'cobrado' → cuenta en Ganancias (el backend calcula y persiste el total).
// 'anulado' → se cancela y devuelve el stock, igual que cualquier cancelación.
async function cerrarPedidoViejo(tipo, id, resultado) {
  const clave = `cierre-${tipo}${id}`;
  if (_enVuelo.has(clave)) return;
  _enVuelo.add(clave);

  const esOrden = tipo === 'orden';
  const flag = resultado === 'cobrado'
    ? (esOrden ? 'es_pagado' : 'es_full')
    : 'es_cancelado';
  const url = esOrden ? `/api/orders/${id}/estatus` : `/api/reservations/${id}/estatus`;

  try {
    await api('PATCH', url, { flag });
    toast(resultado === 'cobrado' ? 'Pedido cobrado ✓' : 'Pedido anulado');

    // Sacarlo de la lista local y repintar el modal sin cerrarlo: el dueño
    // normalmente cierra varios seguidos.
    const lista = esOrden ? 'ordenes' : 'reservas';
    _sinCerrar[lista] = _sinCerrar[lista].filter(x => x.id !== id);
    renderCierreCaja();

    const total = _sinCerrar.ordenes.length + _sinCerrar.reservas.length;
    const conteo = document.getElementById('sin-cerrar-conteo');
    if (conteo) conteo.textContent = total === 1 ? '1 pedido' : `${total} pedidos`;
    if (total === 0) {
      const banner = document.getElementById('banner-sin-cerrar');
      if (banner) banner.style.display = 'none';
    }
  } catch (e) {
    // Caso típico: pago digital sin confirmar bloquea el cobro (el backend lo
    // valida). El mensaje del servidor explica qué falta.
    toast(e.message, 'err');
  } finally {
    _enVuelo.delete(clave);
  }
}

// ── Helpers ───────────────────────────────────────────────

function renderItemLines(cartaItems = [], menuItems = [], modalidad = null) {
  const carta = cartaItems
    .map(i => `<span class="cola-item-line">🍽 ${esc(i.nombre)} ×${i.cantidad}</span>`)
    .join('');
  // Agrupado por instancia de menú cuando el pedido trae 2 o más — ISS-041.
  // Si el pedido es mixto, cada menú además dice si se lleva — ISS-047.
  const mixto = modalidad === 'mixto';
  const menu = renderMenuAgrupado(
    menuItems,
    i => `<span class="cola-item-line">📋 ${esc(i.plato)} ×${i.cantidad} <em>${esc(i.seccion)}</em></span>`,
    (texto, lineas) => `<span class="menu-grupo-head">${texto}${mixto ? badgeModalidadMenu(lineas) : ''}</span>`
  );
  return carta + menu;
}
