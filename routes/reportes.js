// routes/reportes.js
const express  = require('express');
const router   = express.Router();
const db       = require('../config/database');
const ExcelJS  = require('exceljs');
const { authenticate, authorize, authorizePermiso } = require('../middleware/authenticate');

router.use(authenticate);

// GET /api/reportes/clientes-timeline?intervalo=dia|semana|mes
router.get('/clientes-timeline', authorizePermiso(), (req, res) => {
  const { intervalo = 'dia' } = req.query;

  const formato = { dia: '%Y-%m-%d', semana: '%Y-W%W', mes: '%Y-%m' }[intervalo] || '%Y-%m-%d';
  const id = req.user.restaurant_id;

  const ordenes = db.prepare(`
    SELECT strftime(?, fecha) AS periodo, COUNT(*) AS cantidad
    FROM ordenes o
    JOIN estatus_orden e ON o.id_estatus = e.id
    WHERE o.id_restaurante = ? AND e.es_cancelado = 0
    GROUP BY periodo
    ORDER BY periodo
  `).all(formato, id);

  const reservas = db.prepare(`
    SELECT strftime(?, fecha) AS periodo, COUNT(*) AS cantidad
    FROM reservas r
    JOIN estatus_reserva e ON r.id_estatus = e.id
    WHERE r.id_restaurante = ? AND e.es_cancelado = 0
    GROUP BY periodo
    ORDER BY periodo
  `).all(formato, id);

  const mapaOrdenes  = new Map(ordenes.map(r  => [r.periodo,  r.cantidad]));
  const mapaReservas = new Map(reservas.map(r => [r.periodo, r.cantidad]));

  const periodos = [...new Set([
    ...ordenes.map(r  => r.periodo),
    ...reservas.map(r => r.periodo)
  ])].sort();

  res.json(periodos.map(periodo => ({
    periodo,
    ordenes:  mapaOrdenes.get(periodo)  || 0,
    reservas: mapaReservas.get(periodo) || 0,
    total:   (mapaOrdenes.get(periodo)  || 0) + (mapaReservas.get(periodo) || 0)
  })));
});

// GET /api/reportes/clientes-timeline/export?intervalo=dia|semana|mes
router.get('/clientes-timeline/export', authorizePermiso(), async (req, res) => {
  const { intervalo = 'dia' } = req.query;

  const formatoSQL  = { dia: '%Y-%m-%d', semana: '%Y-W%W', mes: '%Y-%m' }[intervalo] || '%Y-%m-%d';
  const labelInter  = { dia: 'Día', semana: 'Semana', mes: 'Mes' }[intervalo] || 'Día';
  const id          = req.user.restaurant_id;

  const restaurante = db.prepare(`SELECT nombre FROM restaurantes WHERE id = ?`).get(id);

  const ordenes = db.prepare(`
    SELECT strftime(?, fecha) AS periodo, COUNT(*) AS cantidad
    FROM ordenes o
    JOIN estatus_orden e ON o.id_estatus = e.id
    WHERE o.id_restaurante = ? AND e.es_cancelado = 0
    GROUP BY periodo ORDER BY periodo
  `).all(formatoSQL, id);

  const reservas = db.prepare(`
    SELECT strftime(?, fecha) AS periodo, COUNT(*) AS cantidad
    FROM reservas r
    JOIN estatus_reserva e ON r.id_estatus = e.id
    WHERE r.id_restaurante = ? AND e.es_cancelado = 0
    GROUP BY periodo ORDER BY periodo
  `).all(formatoSQL, id);

  const mapaOrdenes  = new Map(ordenes.map(r  => [r.periodo, r.cantidad]));
  const mapaReservas = new Map(reservas.map(r => [r.periodo, r.cantidad]));

  const periodos = [...new Set([
    ...ordenes.map(r  => r.periodo),
    ...reservas.map(r => r.periodo),
  ])].sort();

  const filas = periodos.map(p => ({
    periodo:  p,
    ordenes:  mapaOrdenes.get(p)  || 0,
    reservas: mapaReservas.get(p) || 0,
    total:   (mapaOrdenes.get(p)  || 0) + (mapaReservas.get(p) || 0),
  }));

  const totalOrdenes  = filas.reduce((s, f) => s + f.ordenes,  0);
  const totalReservas = filas.reduce((s, f) => s + f.reservas, 0);
  const totalGeneral  = totalOrdenes + totalReservas;

  // ── Workbook ──
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Demanda de Clientes');
  const COLS = 4;

  ws.columns = [
    { key: 'periodo',  width: 18 },
    { key: 'ordenes',  width: 14 },
    { key: 'reservas', width: 14 },
    { key: 'total',    width: 16 },
  ];

  // ── Fila 1: nombre del restaurante ──
  ws.mergeCells(1, 1, 1, COLS);
  const c1 = ws.getCell('A1');
  c1.value     = restaurante ? restaurante.nombre.toUpperCase() : 'RESTAURANTE';
  c1.font      = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  c1.alignment = { horizontal: 'center', vertical: 'middle' };
  c1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1612' } };
  ws.getRow(1).height = 28;

  // ── Fila 2: título e intervalo ──
  ws.mergeCells(2, 1, 2, COLS);
  const c2 = ws.getCell('A2');
  c2.value     = `Curva de Clientes  |  Intervalo: ${labelInter}  |  Histórico completo`;
  c2.font      = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  c2.alignment = { horizontal: 'center', vertical: 'middle' };
  c2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8692A' } };
  ws.getRow(2).height = 22;

  // ── Fila 3: encabezados ──
  const headers = ['Período', 'Órdenes', 'Reservas', 'Total clientes'];
  const hRow = ws.getRow(3);
  hRow.height = 18;
  headers.forEach((h, i) => {
    const cell = ws.getCell(3, i + 1);
    cell.value     = h;
    cell.font      = { bold: true, size: 10, color: { argb: 'FFA0521E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0E8' } };
    cell.border    = {
      top:    { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      bottom: { style: 'medium', color: { argb: 'FFC8692A' } },
      left:   { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      right:  { style: 'thin',   color: { argb: 'FFD4CDC4' } },
    };
  });

  // ── Filas de datos ──
  const BG_BLANCO = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  const BG_AZUL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF4FB' } };
  const BORDER    = { style: 'thin', color: { argb: 'FFD4CDC4' } };

  filas.forEach((f, idx) => {
    const rowNum  = idx + 4;
    const bg      = idx % 2 === 0 ? BG_BLANCO : BG_AZUL;
    const row     = ws.getRow(rowNum);
    row.height    = 16;

    const valores = [f.periodo, f.ordenes, f.reservas, f.total];
    valores.forEach((v, i) => {
      const cell   = ws.getCell(rowNum, i + 1);
      cell.value   = v;
      cell.fill    = bg;
      cell.font    = { size: 10 };
      cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
      cell.border  = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
    });
  });

  // ── Fila de totales ──
  const totRow = ws.getRow(filas.length + 4);
  totRow.height = 18;
  const totales = ['TOTAL', totalOrdenes, totalReservas, totalGeneral];
  totales.forEach((v, i) => {
    const cell     = ws.getCell(filas.length + 4, i + 1);
    cell.value     = v;
    cell.font      = { bold: true, size: 10, color: i === COLS - 1 ? { argb: 'FFC8692A' } : { argb: 'FF1A1612' } };
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0E8' } };
    cell.border    = {
      top:    { style: 'medium', color: { argb: 'FFC8692A' } },
      bottom: { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      left:   { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      right:  { style: 'thin',   color: { argb: 'FFD4CDC4' } },
    };
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="demanda_clientes_${intervalo}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// ── Helpers internos para la hoja Excel de pedidos ──────────────────────────
function construirExcelPedidos(wb, restaurante, tipo, filtro, filas) {
  const label  = tipo === 'menu' ? 'Sección' : 'Categoría';
  const titulo = tipo === 'menu'
    ? `Análisis de Pedidos — Menú · Sección: ${filtro}`
    : `Análisis de Pedidos — Carta · Categoría: ${filtro}`;
  const COLS   = 4;

  const ws = wb.addWorksheet('Análisis de Pedidos');
  ws.columns = [
    { key: 'plato',    width: 30 },
    { key: 'ordenes',  width: 14 },
    { key: 'reservas', width: 14 },
    { key: 'total',    width: 16 },
  ];

  // Fila 1 — nombre restaurante
  ws.mergeCells(1, 1, 1, COLS);
  const c1 = ws.getCell('A1');
  c1.value     = restaurante ? restaurante.nombre.toUpperCase() : 'RESTAURANTE';
  c1.font      = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  c1.alignment = { horizontal: 'center', vertical: 'middle' };
  c1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1612' } };
  ws.getRow(1).height = 28;

  // Fila 2 — título
  ws.mergeCells(2, 1, 2, COLS);
  const c2 = ws.getCell('A2');
  c2.value     = titulo;
  c2.font      = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  c2.alignment = { horizontal: 'center', vertical: 'middle' };
  c2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8692A' } };
  ws.getRow(2).height = 22;

  // Fila 3 — encabezados
  const headers = ['Plato', 'Órdenes', 'Reservas', 'Total pedidos'];
  ws.getRow(3).height = 18;
  headers.forEach((h, i) => {
    const cell = ws.getCell(3, i + 1);
    cell.value     = h;
    cell.font      = { bold: true, size: 10, color: { argb: 'FFA0521E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0E8' } };
    cell.border    = {
      top:    { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      bottom: { style: 'medium', color: { argb: 'FFC8692A' } },
      left:   { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      right:  { style: 'thin',   color: { argb: 'FFD4CDC4' } },
    };
  });

  // Filas de datos
  const BG_BLANCO = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  const BG_AZUL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF4FB' } };
  const BORDER    = { style: 'thin', color: { argb: 'FFD4CDC4' } };

  filas.forEach((f, idx) => {
    const rowNum = idx + 4;
    const bg     = idx % 2 === 0 ? BG_BLANCO : BG_AZUL;
    ws.getRow(rowNum).height = 16;
    [f.plato, f.ordenes, f.reservas, f.total].forEach((v, i) => {
      const cell     = ws.getCell(rowNum, i + 1);
      cell.value     = v;
      cell.fill      = bg;
      cell.font      = { size: 10 };
      cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
      cell.border    = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
    });
  });

  // Fila totales
  const totOrd = filas.reduce((s, f) => s + f.ordenes,  0);
  const totRes = filas.reduce((s, f) => s + f.reservas, 0);
  const totGen = totOrd + totRes;
  const totRow = filas.length + 4;
  ws.getRow(totRow).height = 18;
  ['TOTAL', totOrd, totRes, totGen].forEach((v, i) => {
    const cell     = ws.getCell(totRow, i + 1);
    cell.value     = v;
    cell.font      = { bold: true, size: 10, color: i === COLS - 1 ? { argb: 'FFC8692A' } : { argb: 'FF1A1612' } };
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0E8' } };
    cell.border    = {
      top:    { style: 'medium', color: { argb: 'FFC8692A' } },
      bottom: { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      left:   { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      right:  { style: 'thin',   color: { argb: 'FFD4CDC4' } },
    };
  });
}

// ── Helper: agrega conteos de órdenes y reservas por plato ──────────────────
function contarPedidosPorPlato(id, tipo, filtro) {
  let qOrd, qRes;

  if (tipo === 'menu') {
    qOrd = db.prepare(`
      SELECT pm.nombre AS plato, SUM(omi.cantidad) AS cantidad
      FROM orden_menu_items omi
      JOIN componentes_menu_dia cmd ON omi.id_componente   = cmd.id
      JOIN platos_menu pm           ON cmd.id_plato_menu   = pm.id
      JOIN secciones_menu sm        ON cmd.id_seccion_menu = sm.id
      JOIN ordenes o                ON omi.id_orden        = o.id
      JOIN estatus_orden e          ON o.id_estatus        = e.id
      WHERE o.id_restaurante = ? AND sm.nombre = ? AND e.es_cancelado = 0
      GROUP BY pm.nombre
    `).all(id, filtro);

    qRes = db.prepare(`
      SELECT pm.nombre AS plato, SUM(rmi.cantidad) AS cantidad
      FROM reserva_menu_items rmi
      JOIN componentes_menu_dia cmd ON rmi.id_componente   = cmd.id
      JOIN platos_menu pm           ON cmd.id_plato_menu   = pm.id
      JOIN secciones_menu sm        ON cmd.id_seccion_menu = sm.id
      JOIN reservas r               ON rmi.id_reserva      = r.id
      JOIN estatus_reserva e        ON r.id_estatus        = e.id
      WHERE r.id_restaurante = ? AND sm.nombre = ? AND e.es_cancelado = 0
      GROUP BY pm.nombre
    `).all(id, filtro);
  } else {
    qOrd = db.prepare(`
      SELECT pc.nombre AS plato, SUM(oci.cantidad) AS cantidad
      FROM orden_carta_items oci
      JOIN platos_carta pc    ON oci.id_plato_carta = pc.id
      JOIN categorias_carta cc ON pc.id_categoria   = cc.id
      JOIN ordenes o           ON oci.id_orden       = o.id
      JOIN estatus_orden e     ON o.id_estatus       = e.id
      WHERE o.id_restaurante = ? AND cc.nombre = ? AND e.es_cancelado = 0
      GROUP BY pc.nombre
    `).all(id, filtro);

    qRes = db.prepare(`
      SELECT pc.nombre AS plato, SUM(rci.cantidad) AS cantidad
      FROM reserva_carta_items rci
      JOIN platos_carta pc    ON rci.id_plato_carta = pc.id
      JOIN categorias_carta cc ON pc.id_categoria   = cc.id
      JOIN reservas r          ON rci.id_reserva    = r.id
      JOIN estatus_reserva e   ON r.id_estatus      = e.id
      WHERE r.id_restaurante = ? AND cc.nombre = ? AND e.es_cancelado = 0
      GROUP BY pc.nombre
    `).all(id, filtro);
  }

  const mapaOrd = new Map(qOrd.map(r => [r.plato, r.cantidad]));
  const mapaRes = new Map(qRes.map(r => [r.plato, r.cantidad]));
  const platos  = [...new Set([...mapaOrd.keys(), ...mapaRes.keys()])].sort();

  return platos.map(p => ({
    plato:    p,
    ordenes:  mapaOrd.get(p) || 0,
    reservas: mapaRes.get(p) || 0,
    total:   (mapaOrd.get(p) || 0) + (mapaRes.get(p) || 0),
  }));
}

// GET /api/reportes/pedidos/filtros
router.get('/pedidos/filtros', authorizePermiso(), (req, res) => {
  const id = req.user.restaurant_id;
  const secciones  = db.prepare(`SELECT nombre FROM secciones_menu  WHERE id_restaurante = ? ORDER BY nombre`).all(id);
  const categorias = db.prepare(`SELECT nombre FROM categorias_carta WHERE id_restaurante = ? ORDER BY nombre`).all(id);
  res.json({
    secciones:  secciones.map(r  => r.nombre),
    categorias: categorias.map(r => r.nombre),
  });
});

// GET /api/reportes/pedidos?tipo=menu|carta&filtro={nombre}
router.get('/pedidos', authorizePermiso(), (req, res) => {
  const { tipo = 'menu', filtro } = req.query;
  if (!filtro) return res.status(400).json({ error: 'filtro es requerido' });
  res.json(contarPedidosPorPlato(req.user.restaurant_id, tipo, filtro));
});

// GET /api/reportes/pedidos/export?tipo=menu|carta&filtro={nombre}
router.get('/pedidos/export', authorizePermiso(), async (req, res) => {
  const { tipo = 'menu', filtro } = req.query;
  if (!filtro) return res.status(400).json({ error: 'filtro es requerido' });

  const id          = req.user.restaurant_id;
  const restaurante = db.prepare(`SELECT nombre FROM restaurantes WHERE id = ?`).get(id);
  const filas       = contarPedidosPorPlato(id, tipo, filtro);

  const wb = new ExcelJS.Workbook();
  construirExcelPedidos(wb, restaurante, tipo, filtro, filas);

  const nombre = `pedidos_${tipo}_${filtro.replace(/\s+/g, '_').toLowerCase()}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
  await wb.xlsx.write(res);
  res.end();
});

// ── Helpers para ganancias ────────────────────────────────────────────────────
function sumarGanancias(id, extraWhere) {
  const where = extraWhere ? `AND ${extraWhere}` : '';
  const ord = db.prepare(`SELECT COALESCE(SUM(total), 0) AS s FROM ordenes  WHERE id_restaurante = ? AND total IS NOT NULL ${where}`).get(id).s;
  const res = db.prepare(`SELECT COALESCE(SUM(total), 0) AS s FROM reservas WHERE id_restaurante = ? AND total IS NOT NULL ${where}`).get(id).s;
  return ord + res;
}

function gananciasTimeline(id, formato) {
  const ordenes = db.prepare(`
    SELECT strftime(?, fecha) AS periodo, COALESCE(SUM(total), 0) AS ganancia
    FROM ordenes WHERE id_restaurante = ? AND total IS NOT NULL
    GROUP BY periodo ORDER BY periodo
  `).all(formato, id);

  const reservas = db.prepare(`
    SELECT strftime(?, fecha) AS periodo, COALESCE(SUM(total), 0) AS ganancia
    FROM reservas WHERE id_restaurante = ? AND total IS NOT NULL
    GROUP BY periodo ORDER BY periodo
  `).all(formato, id);

  const mapaOrd = new Map(ordenes.map(r => [r.periodo, r.ganancia]));
  const mapaRes = new Map(reservas.map(r => [r.periodo, r.ganancia]));
  const periodos = [...new Set([
    ...ordenes.map(r => r.periodo),
    ...reservas.map(r => r.periodo),
  ])].sort();

  return periodos.map(p => ({
    periodo:  p,
    ordenes:  mapaOrd.get(p)  || 0,
    reservas: mapaRes.get(p)  || 0,
    total:   (mapaOrd.get(p)  || 0) + (mapaRes.get(p) || 0),
  }));
}

// GET /api/reportes/ganancias/resumen
router.get('/ganancias/resumen', authorizePermiso(), (req, res) => {
  const id = req.user.restaurant_id;
  res.json({
    total:  sumarGanancias(id, ''),
    mes:    sumarGanancias(id, `strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')`),
    semana: sumarGanancias(id, `strftime('%Y-%W', fecha) = strftime('%Y-%W', 'now')`),
    dia:    sumarGanancias(id, `fecha = date('now')`),
  });
});

// GET /api/reportes/ganancias/timeline?intervalo=dia|semana|mes
router.get('/ganancias/timeline', authorizePermiso(), (req, res) => {
  const { intervalo = 'dia' } = req.query;
  const formato = { dia: '%Y-%m-%d', semana: '%Y-W%W', mes: '%Y-%m' }[intervalo] || '%Y-%m-%d';
  res.json(gananciasTimeline(req.user.restaurant_id, formato));
});

// GET /api/reportes/ganancias/export?intervalo=dia|semana|mes
router.get('/ganancias/export', authorizePermiso(), async (req, res) => {
  const { intervalo = 'dia' } = req.query;
  const formato    = { dia: '%Y-%m-%d', semana: '%Y-W%W', mes: '%Y-%m' }[intervalo] || '%Y-%m-%d';
  const labelInter = { dia: 'Día', semana: 'Semana', mes: 'Mes' }[intervalo] || 'Día';
  const id         = req.user.restaurant_id;

  const restaurante = db.prepare(`SELECT nombre FROM restaurantes WHERE id = ?`).get(id);
  const filas       = gananciasTimeline(id, formato);
  const totOrd      = filas.reduce((s, f) => s + f.ordenes,  0);
  const totRes      = filas.reduce((s, f) => s + f.reservas, 0);
  const totGen      = totOrd + totRes;

  const wb   = new ExcelJS.Workbook();
  const COLS = 4;
  const ws   = wb.addWorksheet('Ganancias');

  ws.columns = [
    { key: 'periodo',  width: 18 },
    { key: 'ordenes',  width: 20 },
    { key: 'reservas', width: 20 },
    { key: 'total',    width: 18 },
  ];

  // Fila 1: nombre restaurante
  ws.mergeCells(1, 1, 1, COLS);
  const c1 = ws.getCell('A1');
  c1.value     = restaurante ? restaurante.nombre.toUpperCase() : 'RESTAURANTE';
  c1.font      = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  c1.alignment = { horizontal: 'center', vertical: 'middle' };
  c1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1612' } };
  ws.getRow(1).height = 28;

  // Fila 2: título
  ws.mergeCells(2, 1, 2, COLS);
  const c2 = ws.getCell('A2');
  c2.value     = `Ganancias  |  Intervalo: ${labelInter}  |  Histórico completo`;
  c2.font      = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  c2.alignment = { horizontal: 'center', vertical: 'middle' };
  c2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8692A' } };
  ws.getRow(2).height = 22;

  // Fila 3: encabezados
  const headers = ['Período', 'Ganancias Órdenes', 'Ganancias Reservas', 'Total'];
  ws.getRow(3).height = 18;
  headers.forEach((h, i) => {
    const cell = ws.getCell(3, i + 1);
    cell.value     = h;
    cell.font      = { bold: true, size: 10, color: { argb: 'FFA0521E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0E8' } };
    cell.border    = {
      top:    { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      bottom: { style: 'medium', color: { argb: 'FFC8692A' } },
      left:   { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      right:  { style: 'thin',   color: { argb: 'FFD4CDC4' } },
    };
  });

  // Filas de datos
  const BG_BLANCO = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  const BG_AZUL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF4FB' } };
  const BORDER    = { style: 'thin', color: { argb: 'FFD4CDC4' } };
  const FMT_SOL   = '"S/ "#,##0.00';

  filas.forEach((f, idx) => {
    const rowNum = idx + 4;
    const bg     = idx % 2 === 0 ? BG_BLANCO : BG_AZUL;
    ws.getRow(rowNum).height = 16;
    [f.periodo, f.ordenes, f.reservas, f.total].forEach((v, i) => {
      const cell     = ws.getCell(rowNum, i + 1);
      cell.value     = v;
      cell.fill      = bg;
      cell.font      = { size: 10 };
      cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
      cell.border    = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
      if (i > 0) cell.numFmt = FMT_SOL;
    });
  });

  // Fila totales
  const totRow = filas.length + 4;
  ws.getRow(totRow).height = 18;
  ['TOTAL', totOrd, totRes, totGen].forEach((v, i) => {
    const cell     = ws.getCell(totRow, i + 1);
    cell.value     = v;
    cell.font      = { bold: true, size: 10, color: i === COLS - 1 ? { argb: 'FFC8692A' } : { argb: 'FF1A1612' } };
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0E8' } };
    cell.border    = {
      top:    { style: 'medium', color: { argb: 'FFC8692A' } },
      bottom: { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      left:   { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      right:  { style: 'thin',   color: { argb: 'FFD4CDC4' } },
    };
    if (i > 0) cell.numFmt = FMT_SOL;
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="ganancias_${intervalo}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// Helper: clientes timeline — reutilizado desde admin
function clientesTimeline(id, formato) {
  const ordenes = db.prepare(`
    SELECT strftime(?, fecha) AS periodo, COUNT(*) AS cantidad
    FROM ordenes o JOIN estatus_orden e ON o.id_estatus = e.id
    WHERE o.id_restaurante = ? AND e.es_cancelado = 0
    GROUP BY periodo ORDER BY periodo
  `).all(formato, id);
  const reservas = db.prepare(`
    SELECT strftime(?, fecha) AS periodo, COUNT(*) AS cantidad
    FROM reservas r JOIN estatus_reserva e ON r.id_estatus = e.id
    WHERE r.id_restaurante = ? AND e.es_cancelado = 0
    GROUP BY periodo ORDER BY periodo
  `).all(formato, id);
  const mapaOrd = new Map(ordenes.map(r => [r.periodo, r.cantidad]));
  const mapaRes = new Map(reservas.map(r => [r.periodo, r.cantidad]));
  const periodos = [...new Set([...ordenes.map(r => r.periodo), ...reservas.map(r => r.periodo)])].sort();
  return periodos.map(p => ({
    periodo:  p,
    ordenes:  mapaOrd.get(p) || 0,
    reservas: mapaRes.get(p) || 0,
    total:   (mapaOrd.get(p) || 0) + (mapaRes.get(p) || 0),
  }));
}

// ════════════════════════════════════════════════════════
// KPIs nuevos (versión Opus) — A1 ticket promedio + A3 tasa de cancelación
// ════════════════════════════════════════════════════════

// GET /api/reportes/kpis → ticket promedio y tasa de cancelación
router.get('/kpis', authorizePermiso(), (req, res) => {
  const id = req.user.restaurant_id;

  // A1 — Ticket promedio: sobre registros con total calculado
  // (órdenes pagadas / reservas completadas persisten su total)
  const ord = db.prepare(`SELECT COUNT(*) AS c, COALESCE(SUM(total),0) AS s FROM ordenes  WHERE id_restaurante = ? AND total IS NOT NULL`).get(id);
  const rsv = db.prepare(`SELECT COUNT(*) AS c, COALESCE(SUM(total),0) AS s FROM reservas WHERE id_restaurante = ? AND total IS NOT NULL`).get(id);
  const cuenta = ord.c + rsv.c;
  const ticket_promedio = cuenta ? (ord.s + rsv.s) / cuenta : 0;

  // A3 — Tasa de cancelación: cancelados / total (órdenes + reservas)
  const ordTot = db.prepare(`SELECT COUNT(*) AS c FROM ordenes WHERE id_restaurante = ?`).get(id).c;
  const rsvTot = db.prepare(`SELECT COUNT(*) AS c FROM reservas WHERE id_restaurante = ?`).get(id).c;
  const ordCan = db.prepare(`SELECT COUNT(*) AS c FROM ordenes o JOIN estatus_orden   e ON o.id_estatus = e.id WHERE o.id_restaurante = ? AND e.es_cancelado = 1`).get(id).c;
  const rsvCan = db.prepare(`SELECT COUNT(*) AS c FROM reservas r JOIN estatus_reserva e ON r.id_estatus = e.id WHERE r.id_restaurante = ? AND e.es_cancelado = 1`).get(id).c;
  const total = ordTot + rsvTot;
  const cancelados = ordCan + rsvCan;
  const tasa_cancelacion = total ? (cancelados / total) * 100 : 0;

  res.json({ ticket_promedio, tasa_cancelacion, total_registros: total, cancelados });
});

// GET /api/reportes/hora-pico → A2: demanda por hora del día (hora Lima, UTC-5)
router.get('/hora-pico', authorizePermiso(), (req, res) => {
  const id = req.user.restaurant_id;
  const porHora = (tabla, estatus) => db.prepare(`
    SELECT CAST(strftime('%H', created_at, '-5 hours') AS INTEGER) AS hora, COUNT(*) AS cantidad
    FROM ${tabla} x
    JOIN ${estatus} e ON x.id_estatus = e.id
    WHERE x.id_restaurante = ? AND e.es_cancelado = 0 AND created_at IS NOT NULL
    GROUP BY hora
  `).all(id);

  const mO = new Map(porHora('ordenes',  'estatus_orden').map(r  => [r.hora, r.cantidad]));
  const mR = new Map(porHora('reservas', 'estatus_reserva').map(r => [r.hora, r.cantidad]));

  const out = [];
  for (let h = 0; h < 24; h++) {
    out.push({ hora: h, ordenes: mO.get(h) || 0, reservas: mR.get(h) || 0, total: (mO.get(h) || 0) + (mR.get(h) || 0) });
  }
  res.json(out);
});

module.exports = { router, sumarGanancias, gananciasTimeline, clientesTimeline };
