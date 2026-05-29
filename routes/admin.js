// routes/admin.js
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const ExcelJS = require('exceljs');
const db      = require('../config/database');
const { authenticate, authorize } = require('../middleware/authenticate');
const { fechaLima } = require('../utils/fecha');
const { sumarGanancias, gananciasTimeline, clientesTimeline } = require('./reportes');

// All routes in this file require admin role
router.use(authenticate, authorize('admin'));

// ─────────────────────────────────────────
// GET /api/admin/stats
// Global platform overview numbers
// ─────────────────────────────────────────
router.get('/stats', (req, res) => {
  const totalRestaurantes = db.prepare(`SELECT COUNT(*) AS n FROM restaurantes`).get().n;
  const totalUsuarios     = db.prepare(`SELECT COUNT(*) AS n FROM usuarios`).get().n;
  const totalOrdenes      = db.prepare(`SELECT COUNT(*) AS n FROM ordenes`).get().n;
  const totalReservas     = db.prepare(`SELECT COUNT(*) AS n FROM reservas`).get().n;

  const totalRevenue =
    db.prepare(`SELECT COALESCE(SUM(total), 0) AS s FROM ordenes  WHERE total IS NOT NULL`).get().s +
    db.prepare(`SELECT COALESCE(SUM(total), 0) AS s FROM reservas WHERE total IS NOT NULL`).get().s;

  const today = fechaLima();

  const ordenesHoy = db.prepare(`
    SELECT COUNT(*) AS n FROM ordenes WHERE fecha = ?
  `).get(today).n;

  const revenueHoy =
    db.prepare(`SELECT COALESCE(SUM(total), 0) AS s FROM ordenes  WHERE fecha = ? AND total IS NOT NULL`).get(today).s +
    db.prepare(`SELECT COALESCE(SUM(total), 0) AS s FROM reservas WHERE fecha = ? AND total IS NOT NULL`).get(today).s;

  res.json({
    totalRestaurantes,
    totalUsuarios,
    totalOrdenes,
    totalReservas,
    totalRevenue,
    ordenesHoy,
    revenueHoy
  });
});

// ─────────────────────────────────────────
// GET /api/admin/restaurantes
// All restaurants with aggregated stats
// ─────────────────────────────────────────
router.get('/restaurantes', (req, res) => {
  const restaurantes = db.prepare(`
    SELECT
      r.id,
      r.nombre,
      r.activo,
      r.created_at,
      -- Owner info
      u.nombre AS owner_nombre,
      u.email  AS owner_email,
      -- Counts
      (SELECT COUNT(*) FROM usuarios   u2 WHERE u2.id_restaurante = r.id) AS total_usuarios,
      (SELECT COUNT(*) FROM ordenes     o WHERE o.id_restaurante  = r.id) AS total_ordenes,
      (SELECT COUNT(*) FROM reservas   rv WHERE rv.id_restaurante = r.id) AS total_reservas,
      (SELECT COUNT(*) FROM platos_carta pc WHERE pc.id_restaurante = r.id) AS total_platos,
      -- Revenue: suma de ordenes.total + reservas.total guardados al momento del pago
      (SELECT COALESCE(SUM(o2.total), 0) FROM ordenes  o2 WHERE o2.id_restaurante = r.id AND o2.total IS NOT NULL) +
      (SELECT COALESCE(SUM(rv.total), 0) FROM reservas rv WHERE rv.id_restaurante = r.id AND rv.total IS NOT NULL)
        AS revenue
    FROM restaurantes r
    LEFT JOIN usuarios u
      ON u.id_restaurante = r.id
      AND u.id_rol = (SELECT id FROM roles WHERE nombre = 'owner')
    ORDER BY r.created_at DESC
  `).all();

  res.json(restaurantes);
});

// ─────────────────────────────────────────
// GET /api/admin/restaurantes/:id/ordenes
// Recent orders for a specific restaurant
// ─────────────────────────────────────────
router.get('/restaurantes/:id/ordenes', (req, res) => {
  const ordenes = db.prepare(`
    SELECT
      o.id,
      o.nombre_cliente,
      o.mesa,
      o.fecha,
      o.created_at,
      eo.nombre AS estatus,
      -- Total de la orden (carta únicamente)
      COALESCE(SUM(oci.precio_unitario * oci.cantidad), 0) AS total
    FROM ordenes o
    JOIN estatus_orden eo      ON o.id_estatus = eo.id
    LEFT JOIN orden_carta_items oci ON oci.id_orden = o.id
    WHERE o.id_restaurante = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT 50
  `).all(req.params.id);

  res.json(ordenes);
});

// ─────────────────────────────────────────
// GET /api/admin/restaurantes/:id/reportes/resumen
// Stat cards: órdenes, reservas, ganancias
// ─────────────────────────────────────────
router.get('/restaurantes/:id/reportes/resumen', (req, res) => {
  const id = parseInt(req.params.id);
  const hoy = fechaLima();
  const ordenes  = db.prepare(`SELECT COUNT(*) AS n FROM ordenes  WHERE id_restaurante = ?`).get(id).n;
  const reservas = db.prepare(`SELECT COUNT(*) AS n FROM reservas WHERE id_restaurante = ?`).get(id).n;
  const ordenesHoy  = db.prepare(`SELECT COUNT(*) AS n FROM ordenes  WHERE id_restaurante = ? AND fecha = ?`).get(id, hoy).n;
  const reservasHoy = db.prepare(`SELECT COUNT(*) AS n FROM reservas WHERE id_restaurante = ? AND fecha = ?`).get(id, hoy).n;
  res.json({
    ordenes, reservas, ordenesHoy, reservasHoy,
    ganancias: {
      total:  sumarGanancias(id, ''),
      mes:    sumarGanancias(id, `strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')`),
      semana: sumarGanancias(id, `strftime('%Y-%W', fecha) = strftime('%Y-%W', 'now')`),
      dia:    sumarGanancias(id, `fecha = date('now')`),
    },
  });
});

// ─────────────────────────────────────────
// GET /api/admin/restaurantes/:id/reportes/clientes-timeline?intervalo=
// Curva de demanda de clientes
// ─────────────────────────────────────────
router.get('/restaurantes/:id/reportes/clientes-timeline', (req, res) => {
  const id      = parseInt(req.params.id);
  const formato = { dia: '%Y-%m-%d', semana: '%Y-W%W', mes: '%Y-%m' }[req.query.intervalo] || '%Y-%m-%d';
  res.json(clientesTimeline(id, formato));
});

// ─────────────────────────────────────────
// GET /api/admin/restaurantes/:id/reportes/ganancias/resumen
// Cards de ganancias
// ─────────────────────────────────────────
router.get('/restaurantes/:id/reportes/ganancias/resumen', (req, res) => {
  const id = parseInt(req.params.id);
  res.json({
    total:  sumarGanancias(id, ''),
    mes:    sumarGanancias(id, `strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')`),
    semana: sumarGanancias(id, `strftime('%Y-%W', fecha) = strftime('%Y-%W', 'now')`),
    dia:    sumarGanancias(id, `fecha = date('now')`),
  });
});

// ─────────────────────────────────────────
// GET /api/admin/restaurantes/:id/reportes/ganancias/timeline?intervalo=
// Gráfica de ganancias
// ─────────────────────────────────────────
router.get('/restaurantes/:id/reportes/ganancias/timeline', (req, res) => {
  const id      = parseInt(req.params.id);
  const formato = { dia: '%Y-%m-%d', semana: '%Y-W%W', mes: '%Y-%m' }[req.query.intervalo] || '%Y-%m-%d';
  res.json(gananciasTimeline(id, formato));
});

// ─────────────────────────────────────────
// Helpers de Excel para admin (mismo diseño que reportes.js)
// ─────────────────────────────────────────
const EXCEL_STYLE = {
  BG_DARK:    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1612' } },
  BG_ACCENT:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8692A' } },
  BG_HEADER:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0E8' } },
  BG_WHITE:   { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
  BG_BLUE:    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF4FB' } },
  BORDER:     { style: 'thin',   color: { argb: 'FFD4CDC4' } },
  BORDER_MED: { style: 'medium', color: { argb: 'FFC8692A' } },
  FMT_SOL:    '"S/ "#,##0.00',
};

function excelHeader(ws, nombre, titulo, cols) {
  ws.mergeCells(1, 1, 1, cols);
  Object.assign(ws.getCell('A1'), {
    value: nombre ? nombre.toUpperCase() : 'RESTAURANTE',
    font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: EXCEL_STYLE.BG_DARK,
  });
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, cols);
  Object.assign(ws.getCell('A2'), {
    value: titulo,
    font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: EXCEL_STYLE.BG_ACCENT,
  });
  ws.getRow(2).height = 22;
}

// ─────────────────────────────────────────
// GET /api/admin/restaurantes/:id/reportes/resumen/export
// Excel con las 8 métricas del resumen
// ─────────────────────────────────────────
router.get('/restaurantes/:id/reportes/resumen/export', async (req, res) => {
  const id  = parseInt(req.params.id);
  const hoy = fechaLima();
  const restaurante = db.prepare(`SELECT nombre FROM restaurantes WHERE id = ?`).get(id);

  const ordenes     = db.prepare(`SELECT COUNT(*) AS n FROM ordenes  WHERE id_restaurante = ?`).get(id).n;
  const reservas    = db.prepare(`SELECT COUNT(*) AS n FROM reservas WHERE id_restaurante = ?`).get(id).n;
  const ordenesHoy  = db.prepare(`SELECT COUNT(*) AS n FROM ordenes  WHERE id_restaurante = ? AND fecha = ?`).get(id, hoy).n;
  const reservasHoy = db.prepare(`SELECT COUNT(*) AS n FROM reservas WHERE id_restaurante = ? AND fecha = ?`).get(id, hoy).n;

  const metricas = [
    ['Órdenes totales',        ordenes],
    ['Reservas totales',       reservas],
    ['Órdenes hoy',            ordenesHoy],
    ['Reservas hoy',           reservasHoy],
    ['Ganancias totales',      sumarGanancias(id, '')],
    ['Ganancias este mes',     sumarGanancias(id, `strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')`)],
    ['Ganancias esta semana',  sumarGanancias(id, `strftime('%Y-%W', fecha) = strftime('%Y-%W', 'now')`)],
    ['Ganancias hoy',          sumarGanancias(id, `fecha = date('now')`)],
  ];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Resumen');
  ws.columns = [{ key: 'metrica', width: 28 }, { key: 'valor', width: 20 }];

  excelHeader(ws, restaurante?.nombre, `Resumen de métricas  |  ${hoy}`, 2);

  ['Métrica', 'Valor'].forEach((h, i) => {
    const cell = ws.getCell(3, i + 1);
    cell.value = h;
    cell.font      = { bold: true, size: 10, color: { argb: 'FFA0521E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill      = EXCEL_STYLE.BG_HEADER;
    cell.border    = { top: EXCEL_STYLE.BORDER, bottom: EXCEL_STYLE.BORDER_MED, left: EXCEL_STYLE.BORDER, right: EXCEL_STYLE.BORDER };
  });
  ws.getRow(3).height = 18;

  const esSol = (label) => label.startsWith('Ganancias');
  metricas.forEach(([label, valor], idx) => {
    const rowNum = idx + 4;
    const bg     = idx % 2 === 0 ? EXCEL_STYLE.BG_WHITE : EXCEL_STYLE.BG_BLUE;
    ws.getRow(rowNum).height = 16;

    const cLabel = ws.getCell(rowNum, 1);
    cLabel.value = label; cLabel.fill = bg; cLabel.font = { size: 10 };
    cLabel.alignment = { horizontal: 'left', vertical: 'middle' };
    cLabel.border = { top: EXCEL_STYLE.BORDER, bottom: EXCEL_STYLE.BORDER, left: EXCEL_STYLE.BORDER, right: EXCEL_STYLE.BORDER };

    const cVal = ws.getCell(rowNum, 2);
    cVal.value = valor; cVal.fill = bg; cVal.font = { size: 10 };
    cVal.alignment = { horizontal: 'center', vertical: 'middle' };
    cVal.border = { top: EXCEL_STYLE.BORDER, bottom: EXCEL_STYLE.BORDER, left: EXCEL_STYLE.BORDER, right: EXCEL_STYLE.BORDER };
    if (esSol(label)) cVal.numFmt = EXCEL_STYLE.FMT_SOL;
  });

  const nombre = restaurante ? restaurante.nombre.replace(/\s+/g, '_').toLowerCase() : 'restaurante';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="resumen_${nombre}_${hoy}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// ─────────────────────────────────────────
// GET /api/admin/restaurantes/:id/reportes/clientes-timeline/export?intervalo=
// Excel curva de demanda (igual al del owner pero con ID explícito)
// ─────────────────────────────────────────
router.get('/restaurantes/:id/reportes/clientes-timeline/export', async (req, res) => {
  const id         = parseInt(req.params.id);
  const intervalo  = req.query.intervalo || 'dia';
  const formatoSQL = { dia: '%Y-%m-%d', semana: '%Y-W%W', mes: '%Y-%m' }[intervalo] || '%Y-%m-%d';
  const labelInter = { dia: 'Día', semana: 'Semana', mes: 'Mes' }[intervalo] || 'Día';
  const restaurante = db.prepare(`SELECT nombre FROM restaurantes WHERE id = ?`).get(id);
  const filas = clientesTimeline(id, formatoSQL);

  const totOrd = filas.reduce((s, f) => s + f.ordenes,  0);
  const totRes = filas.reduce((s, f) => s + f.reservas, 0);
  const totGen = totOrd + totRes;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Demanda de Clientes');
  ws.columns = [{ key: 'periodo', width: 18 }, { key: 'ordenes', width: 14 }, { key: 'reservas', width: 14 }, { key: 'total', width: 16 }];

  excelHeader(ws, restaurante?.nombre, `Curva de Clientes  |  Intervalo: ${labelInter}  |  Histórico completo`, 4);

  ['Período', 'Órdenes', 'Reservas', 'Total clientes'].forEach((h, i) => {
    const cell = ws.getCell(3, i + 1);
    cell.value = h;
    cell.font      = { bold: true, size: 10, color: { argb: 'FFA0521E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill      = EXCEL_STYLE.BG_HEADER;
    cell.border    = { top: EXCEL_STYLE.BORDER, bottom: EXCEL_STYLE.BORDER_MED, left: EXCEL_STYLE.BORDER, right: EXCEL_STYLE.BORDER };
  });
  ws.getRow(3).height = 18;

  filas.forEach((f, idx) => {
    const rowNum = idx + 4;
    const bg     = idx % 2 === 0 ? EXCEL_STYLE.BG_WHITE : EXCEL_STYLE.BG_BLUE;
    ws.getRow(rowNum).height = 16;
    [f.periodo, f.ordenes, f.reservas, f.total].forEach((v, i) => {
      const cell = ws.getCell(rowNum, i + 1);
      cell.value = v; cell.fill = bg; cell.font = { size: 10 };
      cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
      cell.border = { top: EXCEL_STYLE.BORDER, bottom: EXCEL_STYLE.BORDER, left: EXCEL_STYLE.BORDER, right: EXCEL_STYLE.BORDER };
    });
  });

  const totRow = filas.length + 4;
  ws.getRow(totRow).height = 18;
  ['TOTAL', totOrd, totRes, totGen].forEach((v, i) => {
    const cell = ws.getCell(totRow, i + 1);
    cell.value = v;
    cell.font  = { bold: true, size: 10, color: i === 3 ? { argb: 'FFC8692A' } : { argb: 'FF1A1612' } };
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    cell.fill  = EXCEL_STYLE.BG_HEADER;
    cell.border = { top: EXCEL_STYLE.BORDER_MED, bottom: EXCEL_STYLE.BORDER, left: EXCEL_STYLE.BORDER, right: EXCEL_STYLE.BORDER };
  });

  const nombre = restaurante ? restaurante.nombre.replace(/\s+/g, '_').toLowerCase() : 'restaurante';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="demanda_${nombre}_${intervalo}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// ─────────────────────────────────────────
// GET /api/admin/restaurantes/:id/reportes/ganancias/export?intervalo=
// Excel ganancias (igual al del owner pero con ID explícito)
// ─────────────────────────────────────────
router.get('/restaurantes/:id/reportes/ganancias/export', async (req, res) => {
  const id         = parseInt(req.params.id);
  const intervalo  = req.query.intervalo || 'dia';
  const formatoSQL = { dia: '%Y-%m-%d', semana: '%Y-W%W', mes: '%Y-%m' }[intervalo] || '%Y-%m-%d';
  const labelInter = { dia: 'Día', semana: 'Semana', mes: 'Mes' }[intervalo] || 'Día';
  const restaurante = db.prepare(`SELECT nombre FROM restaurantes WHERE id = ?`).get(id);
  const filas = gananciasTimeline(id, formatoSQL);

  const totOrd = filas.reduce((s, f) => s + f.ordenes,  0);
  const totRes = filas.reduce((s, f) => s + f.reservas, 0);
  const totGen = totOrd + totRes;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Ganancias');
  ws.columns = [{ key: 'periodo', width: 18 }, { key: 'ordenes', width: 22 }, { key: 'reservas', width: 22 }, { key: 'total', width: 18 }];

  excelHeader(ws, restaurante?.nombre, `Ganancias  |  Intervalo: ${labelInter}  |  Histórico completo`, 4);

  ['Período', 'Ganancias Órdenes', 'Ganancias Reservas', 'Total'].forEach((h, i) => {
    const cell = ws.getCell(3, i + 1);
    cell.value = h;
    cell.font      = { bold: true, size: 10, color: { argb: 'FFA0521E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill      = EXCEL_STYLE.BG_HEADER;
    cell.border    = { top: EXCEL_STYLE.BORDER, bottom: EXCEL_STYLE.BORDER_MED, left: EXCEL_STYLE.BORDER, right: EXCEL_STYLE.BORDER };
  });
  ws.getRow(3).height = 18;

  filas.forEach((f, idx) => {
    const rowNum = idx + 4;
    const bg     = idx % 2 === 0 ? EXCEL_STYLE.BG_WHITE : EXCEL_STYLE.BG_BLUE;
    ws.getRow(rowNum).height = 16;
    [f.periodo, f.ordenes, f.reservas, f.total].forEach((v, i) => {
      const cell = ws.getCell(rowNum, i + 1);
      cell.value = v; cell.fill = bg; cell.font = { size: 10 };
      cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
      cell.border = { top: EXCEL_STYLE.BORDER, bottom: EXCEL_STYLE.BORDER, left: EXCEL_STYLE.BORDER, right: EXCEL_STYLE.BORDER };
      if (i > 0) cell.numFmt = EXCEL_STYLE.FMT_SOL;
    });
  });

  const totRow = filas.length + 4;
  ws.getRow(totRow).height = 18;
  ['TOTAL', totOrd, totRes, totGen].forEach((v, i) => {
    const cell = ws.getCell(totRow, i + 1);
    cell.value = v;
    cell.font  = { bold: true, size: 10, color: i === 3 ? { argb: 'FFC8692A' } : { argb: 'FF1A1612' } };
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    cell.fill  = EXCEL_STYLE.BG_HEADER;
    cell.border = { top: EXCEL_STYLE.BORDER_MED, bottom: EXCEL_STYLE.BORDER, left: EXCEL_STYLE.BORDER, right: EXCEL_STYLE.BORDER };
    if (i > 0) cell.numFmt = EXCEL_STYLE.FMT_SOL;
  });

  const nombre = restaurante ? restaurante.nombre.replace(/\s+/g, '_').toLowerCase() : 'restaurante';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="ganancias_${nombre}_${intervalo}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// ─────────────────────────────────────────
// POST /api/admin/restaurantes
// Create a new restaurant + owner account
// ─────────────────────────────────────────
router.post('/restaurantes', (req, res) => {
  const { restaurantName, ownerName, email, password } = req.body;

  if (!restaurantName || !ownerName || !email || !password)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });

  if (password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

  const existing = db.prepare(`SELECT id FROM usuarios WHERE email = ?`).get(email);
  if (existing) return res.status(400).json({ error: 'El email ya está registrado' });

  const ownerRole = db.prepare(`SELECT id FROM roles WHERE nombre = 'owner'`).get();
  const hash      = bcrypt.hashSync(password, 10);

  const { lastInsertRowid: restaurantId } = db.prepare(
    `INSERT INTO restaurantes (nombre) VALUES (?)`
  ).run(restaurantName);

  db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante)
    VALUES (?, ?, ?, ?, ?)
  `).run(ownerName, email, hash, ownerRole.id, restaurantId);

  res.status(201).json({
    message: 'Restaurante creado correctamente',
    id:      restaurantId,
    nombre:  restaurantName
  });
});

// ─────────────────────────────────────────
// PATCH /api/admin/restaurantes/:id/toggle
// Activate or deactivate a restaurant
// ─────────────────────────────────────────
router.patch('/restaurantes/:id/toggle', (req, res) => {
  const restaurante = db.prepare(
    `SELECT id, nombre, activo FROM restaurantes WHERE id = ?`
  ).get(req.params.id);

  if (!restaurante) return res.status(404).json({ error: 'Restaurante no encontrado' });

  const nuevoActivo = restaurante.activo ? 0 : 1;
  db.prepare(`UPDATE restaurantes SET activo = ? WHERE id = ?`).run(nuevoActivo, req.params.id);

  res.json({
    message: nuevoActivo
      ? `"${restaurante.nombre}" activado`
      : `"${restaurante.nombre}" desactivado`,
    activo: nuevoActivo
  });
});

// ─────────────────────────────────────────
// DELETE /api/admin/restaurantes/:id
// Delete a restaurant and ALL its data
// ─────────────────────────────────────────
router.delete('/restaurantes/:id', (req, res) => {
  const restaurante = db.prepare(
    `SELECT id, nombre FROM restaurantes WHERE id = ?`
  ).get(req.params.id);

  if (!restaurante) return res.status(404).json({ error: 'Restaurante no encontrado' });

  db.transaction(() => {
    // Orden: primero los items, luego las cabeceras, luego el resto
    db.prepare(`DELETE FROM orden_menu_items   WHERE id_orden  IN (SELECT id FROM ordenes  WHERE id_restaurante = ?)`).run(req.params.id);
    db.prepare(`DELETE FROM orden_carta_items  WHERE id_orden  IN (SELECT id FROM ordenes  WHERE id_restaurante = ?)`).run(req.params.id);
    db.prepare(`DELETE FROM reserva_menu_items WHERE id_reserva IN (SELECT id FROM reservas WHERE id_restaurante = ?)`).run(req.params.id);
    db.prepare(`DELETE FROM reserva_carta_items WHERE id_reserva IN (SELECT id FROM reservas WHERE id_restaurante = ?)`).run(req.params.id);
    db.prepare(`DELETE FROM ordenes                WHERE id_restaurante = ?`).run(req.params.id);
    db.prepare(`DELETE FROM reservas               WHERE id_restaurante = ?`).run(req.params.id);
    db.prepare(`DELETE FROM componentes_menu_dia   WHERE id_restaurante = ?`).run(req.params.id);
    db.prepare(`DELETE FROM menu_secciones         WHERE id_menu_dia IN (SELECT id FROM menus_dia WHERE id_restaurante = ?)`).run(req.params.id);
    db.prepare(`DELETE FROM menus_dia              WHERE id_restaurante = ?`).run(req.params.id);
    db.prepare(`DELETE FROM platos_menu            WHERE id_restaurante = ?`).run(req.params.id);
    db.prepare(`DELETE FROM platos_carta           WHERE id_restaurante = ?`).run(req.params.id);
    db.prepare(`DELETE FROM categorias_carta       WHERE id_restaurante = ?`).run(req.params.id);
    db.prepare(`DELETE FROM secciones_menu         WHERE id_restaurante = ?`).run(req.params.id);
    db.prepare(`DELETE FROM usuarios               WHERE id_restaurante = ?`).run(req.params.id);
    db.prepare(`DELETE FROM restaurantes           WHERE id = ?`).run(req.params.id);
  })();

  res.json({ message: `Restaurante "${restaurante.nombre}" y todos sus datos eliminados` });
});

// ─────────────────────────────────────────
// GET /api/admin/usuarios
// All users across the platform
// ─────────────────────────────────────────
router.get('/usuarios', (req, res) => {
  const usuarios = db.prepare(`
    SELECT
      u.id,
      u.nombre,
      u.email,
      r.nombre      AS rol,
      rs.nombre     AS restaurante,
      u.created_at
    FROM usuarios u
    JOIN roles r          ON u.id_rol         = r.id
    LEFT JOIN restaurantes rs ON u.id_restaurante = rs.id
    ORDER BY u.created_at DESC
  `).all();

  res.json(usuarios);
});

// ─────────────────────────────────────────
// PATCH /api/admin/usuarios/:id/password
// Reset a user's password (admin only)
// ─────────────────────────────────────────
router.patch('/usuarios/:id/password', (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

  const usuario = db.prepare(`SELECT id, nombre FROM usuarios WHERE id = ?`).get(req.params.id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`UPDATE usuarios SET password_hash = ? WHERE id = ?`).run(hash, req.params.id);

  res.json({ message: `Contraseña de "${usuario.nombre}" actualizada correctamente` });
});


// ─────────────────────────────────────────
// POST /api/admin/usuarios
// Create a standalone user for an existing restaurant
// ─────────────────────────────────────────
router.post('/usuarios', (req, res) => {
  const { nombre, email, password, rol, id_restaurante } = req.body;

  if (!nombre || !email || !password || !rol)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });

  if (password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

  const existing = db.prepare(`SELECT id FROM usuarios WHERE email = ?`).get(email);
  if (existing) return res.status(400).json({ error: 'El email ya está registrado' });

  const rolRow = db.prepare(`SELECT id FROM roles WHERE nombre = ?`).get(rol);
  if (!rolRow) return res.status(400).json({ error: `Rol inválido: ${rol}` });

  if (id_restaurante) {
    const rest = db.prepare(`SELECT id FROM restaurantes WHERE id = ?`).get(id_restaurante);
    if (!rest) return res.status(400).json({ error: 'Restaurante no encontrado' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante)
    VALUES (?, ?, ?, ?, ?)
  `).run(nombre, email, hash, rolRow.id, id_restaurante || null);

  res.status(201).json({ message: `Usuario "${nombre}" creado correctamente` });
});



// ─────────────────────────────────────────
// GET /api/admin/estatus-orden
// Lista todos los estatus de orden
// ─────────────────────────────────────────
router.get('/estatus-orden', (req, res) => {
  const estatus = db.prepare(`
    SELECT
      eo.id,
      eo.nombre,
      eo.es_inicial,
      eo.es_pagado,
      eo.es_cancelado,
      eo.es_en_cocina,
      eo.es_listo,
      COUNT(o.id) AS total_ordenes
    FROM estatus_orden eo
    LEFT JOIN ordenes o ON o.id_estatus = eo.id
    GROUP BY eo.id
    ORDER BY eo.id ASC
  `).all();
  res.json(estatus);
});

// ─────────────────────────────────────────
// POST /api/admin/estatus-orden
// Crea un nuevo estatus de orden
// ─────────────────────────────────────────
router.post('/estatus-orden', (req, res) => {
  const { nombre } = req.body;

  if (!nombre || !nombre.trim())
    return res.status(400).json({ error: 'El nombre del estatus es requerido' });

  const existing = db.prepare(`SELECT id FROM estatus_orden WHERE nombre = ?`).get(nombre.trim().toLowerCase());
  if (existing) return res.status(400).json({ error: `El estatus "${nombre}" ya existe` });

  const { lastInsertRowid: id } = db.prepare(
    `INSERT INTO estatus_orden (nombre) VALUES (?)`
  ).run(nombre.trim().toLowerCase());

  res.status(201).json({ message: `Estatus "${nombre}" creado correctamente`, id });
});

// ─────────────────────────────────────────
// PATCH /api/admin/estatus-orden/:id/set-inicial
// Marca este estatus como el "inicial" y desmarca los demás
// ─────────────────────────────────────────
router.patch('/estatus-orden/:id/set-inicial', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_orden WHERE id = ?`).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });
  db.transaction(() => {
    db.prepare(`UPDATE estatus_orden SET es_inicial = 0`).run();
    db.prepare(`UPDATE estatus_orden SET es_inicial = 1 WHERE id = ?`).run(req.params.id);
  })();
  res.json({ message: `"${estatus.nombre}" marcado como estatus inicial` });
});

// ─────────────────────────────────────────
// PATCH /api/admin/estatus-orden/:id/set-pagado
// Marca este estatus como el "pagado/completado" y desmarca los demás
// ─────────────────────────────────────────
router.patch('/estatus-orden/:id/set-pagado', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_orden WHERE id = ?`).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });
  db.transaction(() => {
    db.prepare(`UPDATE estatus_orden SET es_pagado = 0`).run();
    db.prepare(`UPDATE estatus_orden SET es_pagado = 1 WHERE id = ?`).run(req.params.id);
  })();
  res.json({ message: `"${estatus.nombre}" marcado como estatus pagado` });
});

// ─────────────────────────────────────────
// PATCH /api/admin/estatus-orden/:id/set-cancelado
// Marca este estatus como el "cancelado" y desmarca los demás
// ─────────────────────────────────────────
router.patch('/estatus-orden/:id/set-cancelado', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_orden WHERE id = ?`).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });
  db.transaction(() => {
    db.prepare(`UPDATE estatus_orden SET es_cancelado = 0`).run();
    db.prepare(`UPDATE estatus_orden SET es_cancelado = 1 WHERE id = ?`).run(req.params.id);
  })();
  res.json({ message: `"${estatus.nombre}" marcado como estatus cancelado` });
});

// ─────────────────────────────────────────
// PATCH /api/admin/estatus-orden/:id/set-en-cocina
// Marca este estatus como el "en cocina/preparando" y desmarca los demás
// ─────────────────────────────────────────
router.patch('/estatus-orden/:id/set-en-cocina', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_orden WHERE id = ?`).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });
  db.transaction(() => {
    db.prepare(`UPDATE estatus_orden SET es_en_cocina = 0`).run();
    db.prepare(`UPDATE estatus_orden SET es_en_cocina = 1 WHERE id = ?`).run(req.params.id);
  })();
  res.json({ message: `"${estatus.nombre}" marcado como estatus en cocina` });
});

// ─────────────────────────────────────────
// PATCH /api/admin/estatus-orden/:id/set-listo
// Marca este estatus como el "listo/entregado" y desmarca los demás
// ─────────────────────────────────────────
router.patch('/estatus-orden/:id/set-listo', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_orden WHERE id = ?`).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });
  db.transaction(() => {
    db.prepare(`UPDATE estatus_orden SET es_listo = 0`).run();
    db.prepare(`UPDATE estatus_orden SET es_listo = 1 WHERE id = ?`).run(req.params.id);
  })();
  res.json({ message: `"${estatus.nombre}" marcado como estatus listo` });
});

// ─────────────────────────────────────────
// DELETE /api/admin/estatus-orden/:id
// Elimina un estatus solo si no tiene órdenes asignadas
// ─────────────────────────────────────────
router.delete('/estatus-orden/:id', (req, res) => {
  const estatus = db.prepare(`
    SELECT id, nombre, es_inicial, es_pagado, es_cancelado, es_en_cocina, es_listo
    FROM estatus_orden WHERE id = ?
  `).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });

  if (estatus.es_inicial || estatus.es_pagado || estatus.es_cancelado || estatus.es_en_cocina || estatus.es_listo)
    return res.status(409).json({
      error: `No se puede eliminar "${estatus.nombre}": tiene un flag semántico activo. Asigna el flag a otro estatus primero.`
    });

  const enUso = db.prepare(`SELECT COUNT(*) AS n FROM ordenes WHERE id_estatus = ?`).get(req.params.id).n;
  if (enUso > 0)
    return res.status(409).json({
      error: `No se puede eliminar "${estatus.nombre}": tiene ${enUso} orden(es) asignada(s)`
    });

  db.prepare(`DELETE FROM estatus_orden WHERE id = ?`).run(req.params.id);
  res.json({ message: `Estatus "${estatus.nombre}" eliminado correctamente` });
});

// ─────────────────────────────────────────
// GET /api/admin/estatus-reserva
// Lista todos los estatus de reserva
// ─────────────────────────────────────────
router.get('/estatus-reserva', (req, res) => {
  const estatus = db.prepare(`
    SELECT
      er.id,
      er.nombre,
      er.es_full,
      er.es_inicial,
      er.es_cancelado,
      er.es_confirmada,
      er.es_en_cocina,
      er.es_listo,
      er.es_cliente_llego,
      COUNT(r.id) AS total_reservas
    FROM estatus_reserva er
    LEFT JOIN reservas r ON r.id_estatus = er.id
    GROUP BY er.id
    ORDER BY er.id ASC
  `).all();

  res.json(estatus);
});

// ─────────────────────────────────────────
// POST /api/admin/estatus-reserva
// Crea un nuevo estatus de reserva
// ─────────────────────────────────────────
router.post('/estatus-reserva', (req, res) => {
  const { nombre } = req.body;

  if (!nombre || !nombre.trim())
    return res.status(400).json({ error: 'El nombre del estatus es requerido' });

  const existing = db.prepare(`SELECT id FROM estatus_reserva WHERE nombre = ?`).get(nombre.trim().toLowerCase());
  if (existing) return res.status(400).json({ error: `El estatus "${nombre}" ya existe` });

  const { lastInsertRowid: id } = db.prepare(
    `INSERT INTO estatus_reserva (nombre, es_full) VALUES (?, 0)`
  ).run(nombre.trim().toLowerCase());

  res.status(201).json({ message: `Estatus "${nombre}" creado correctamente`, id });
});

// ─────────────────────────────────────────
// PATCH /api/admin/estatus-reserva/:id/set-inicial
// Marca este estatus como el "inicial" y desmarca los demás
// ─────────────────────────────────────────
router.patch('/estatus-reserva/:id/set-inicial', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_reserva WHERE id = ?`).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });
  db.transaction(() => {
    db.prepare(`UPDATE estatus_reserva SET es_inicial = 0`).run();
    db.prepare(`UPDATE estatus_reserva SET es_inicial = 1 WHERE id = ?`).run(req.params.id);
  })();
  res.json({ message: `"${estatus.nombre}" marcado como estatus inicial` });
});

// ─────────────────────────────────────────
// PATCH /api/admin/estatus-reserva/:id/set-cancelado
// Marca este estatus como el "cancelado" y desmarca los demás
// ─────────────────────────────────────────
router.patch('/estatus-reserva/:id/set-cancelado', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_reserva WHERE id = ?`).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });
  db.transaction(() => {
    db.prepare(`UPDATE estatus_reserva SET es_cancelado = 0`).run();
    db.prepare(`UPDATE estatus_reserva SET es_cancelado = 1 WHERE id = ?`).run(req.params.id);
  })();
  res.json({ message: `"${estatus.nombre}" marcado como estatus cancelado` });
});

// ─────────────────────────────────────────
// PATCH /api/admin/estatus-reserva/:id/set-confirmada
// Marca este estatus como el "confirmada" y desmarca los demás
// ─────────────────────────────────────────
router.patch('/estatus-reserva/:id/set-confirmada', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_reserva WHERE id = ?`).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });
  db.transaction(() => {
    db.prepare(`UPDATE estatus_reserva SET es_confirmada = 0`).run();
    db.prepare(`UPDATE estatus_reserva SET es_confirmada = 1 WHERE id = ?`).run(req.params.id);
  })();
  res.json({ message: `"${estatus.nombre}" marcado como estatus confirmada` });
});

// ─────────────────────────────────────────
// PATCH /api/admin/estatus-reserva/:id/set-en-cocina
// ─────────────────────────────────────────
router.patch('/estatus-reserva/:id/set-en-cocina', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_reserva WHERE id = ?`).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });
  db.transaction(() => {
    db.prepare(`UPDATE estatus_reserva SET es_en_cocina = 0`).run();
    db.prepare(`UPDATE estatus_reserva SET es_en_cocina = 1 WHERE id = ?`).run(req.params.id);
  })();
  res.json({ message: `"${estatus.nombre}" marcado como estatus en cocina` });
});

// ─────────────────────────────────────────
// PATCH /api/admin/estatus-reserva/:id/set-listo
// ─────────────────────────────────────────
router.patch('/estatus-reserva/:id/set-listo', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_reserva WHERE id = ?`).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });
  db.transaction(() => {
    db.prepare(`UPDATE estatus_reserva SET es_listo = 0`).run();
    db.prepare(`UPDATE estatus_reserva SET es_listo = 1 WHERE id = ?`).run(req.params.id);
  })();
  res.json({ message: `"${estatus.nombre}" marcado como estatus listo` });
});

// ─────────────────────────────────────────
// PATCH /api/admin/estatus-reserva/:id/set-cliente-llego
// ─────────────────────────────────────────
router.patch('/estatus-reserva/:id/set-cliente-llego', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_reserva WHERE id = ?`).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });
  db.transaction(() => {
    db.prepare(`UPDATE estatus_reserva SET es_cliente_llego = 0`).run();
    db.prepare(`UPDATE estatus_reserva SET es_cliente_llego = 1 WHERE id = ?`).run(req.params.id);
  })();
  res.json({ message: `"${estatus.nombre}" marcado como estatus cliente llegó` });
});

// ─────────────────────────────────────────
// PATCH /api/admin/estatus-reserva/:id/set-full
// Marca este estatus como el "full" y desmarca los demás
// ─────────────────────────────────────────
router.patch('/estatus-reserva/:id/set-full', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_reserva WHERE id = ?`).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });

  db.transaction(() => {
    db.prepare(`UPDATE estatus_reserva SET es_full = 0`).run();
    db.prepare(`UPDATE estatus_reserva SET es_full = 1 WHERE id = ?`).run(req.params.id);
  })();

  res.json({ message: `"${estatus.nombre}" marcado como estatus full` });
});

// ─────────────────────────────────────────
// DELETE /api/admin/estatus-reserva/:id
// Elimina un estatus solo si no tiene reservas asignadas y no es el full
// ─────────────────────────────────────────
router.delete('/estatus-reserva/:id', (req, res) => {
  const estatus = db.prepare(`
    SELECT id, nombre, es_full, es_inicial, es_cancelado, es_confirmada, es_en_cocina, es_listo, es_cliente_llego
    FROM estatus_reserva WHERE id = ?
  `).get(req.params.id);
  if (!estatus) return res.status(404).json({ error: 'Estatus no encontrado' });

  if (estatus.es_full || estatus.es_inicial || estatus.es_cancelado || estatus.es_confirmada ||
      estatus.es_en_cocina || estatus.es_listo || estatus.es_cliente_llego)
    return res.status(409).json({
      error: `No se puede eliminar "${estatus.nombre}": tiene un flag semántico activo. Asigna el flag a otro estatus primero.`
    });

  const enUso = db.prepare(`SELECT COUNT(*) AS n FROM reservas WHERE id_estatus = ?`).get(req.params.id).n;
  if (enUso > 0)
    return res.status(409).json({
      error: `No se puede eliminar "${estatus.nombre}": tiene ${enUso} reserva(s) asignada(s)`
    });

  db.prepare(`DELETE FROM estatus_reserva WHERE id = ?`).run(req.params.id);
  res.json({ message: `Estatus "${estatus.nombre}" eliminado correctamente` });
});

module.exports = router;