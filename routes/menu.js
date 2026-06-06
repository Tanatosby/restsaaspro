// routes/menu.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { authenticate, authorize, authorizeRestaurante, authorizePermiso } = require('../middleware/authenticate');

// All routes require authentication
router.use(authenticate);

// ─────────────────────────────────────────────────────
// SECCIONES DE MENÚ
// Cada restaurante define sus propias secciones:
// entrada, fondo, postre, refresco, etc.
// ─────────────────────────────────────────────────────

// GET /api/menu/secciones
router.get('/secciones', (req, res) => {
  const secciones = db.prepare(`
    SELECT id, nombre FROM secciones_menu
    WHERE id_restaurante = ?
    ORDER BY nombre ASC
  `).all(req.user.restaurant_id);

  res.json(secciones);
});

// POST /api/menu/secciones
router.post('/secciones', authorizePermiso(), (req, res) => {
  const { nombre } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre de la sección es requerido' });

  const existe = db.prepare(`
    SELECT id FROM secciones_menu
    WHERE nombre = ? AND id_restaurante = ?
  `).get(nombre.trim(), req.user.restaurant_id);

  if (existe)
    return res.status(400).json({ error: 'Ya existe una sección con ese nombre' });

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO secciones_menu (nombre, id_restaurante) VALUES (?, ?)
  `).run(nombre.trim(), req.user.restaurant_id);

  res.status(201).json({ id: lastInsertRowid, nombre: nombre.trim() });
});

// DELETE /api/menu/secciones/:id
router.delete('/secciones/:id', authorizePermiso(), (req, res) => {
  const seccion = db.prepare(`
    SELECT id, nombre FROM secciones_menu
    WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!seccion)
    return res.status(404).json({ error: 'Sección no encontrada' });

  db.prepare(`DELETE FROM secciones_menu WHERE id = ?`).run(req.params.id);
  res.json({ message: `Sección "${seccion.nombre}" eliminada` });
});

// ─────────────────────────────────────────────────────
// PLATOS DE MENÚ
// Catálogo de platos usados en los menús del día.
// No tienen precio propio — el precio vive en menus_dia.
// ─────────────────────────────────────────────────────

// GET /api/menu/platos-menu
router.get('/platos-menu', (req, res) => {
  const platos = db.prepare(`
    SELECT id, nombre, descripcion, url_foto
    FROM platos_menu
    WHERE id_restaurante = ?
    ORDER BY nombre ASC
  `).all(req.user.restaurant_id);

  res.json(platos);
});

// POST /api/menu/platos-menu
router.post('/platos-menu', authorizePermiso(), (req, res) => {
  const { nombre, descripcion, url_foto } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre del plato es requerido' });

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO platos_menu (nombre, descripcion, url_foto, id_restaurante)
    VALUES (?, ?, ?, ?)
  `).run(nombre.trim(), descripcion || null, url_foto || null, req.user.restaurant_id);

  res.status(201).json({ id: lastInsertRowid, nombre: nombre.trim() });
});

// DELETE /api/menu/platos-menu/:id
router.delete('/platos-menu/:id', authorizePermiso(), (req, res) => {
  const plato = db.prepare(`
    SELECT id, nombre FROM platos_menu
    WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!plato)
    return res.status(404).json({ error: 'Plato no encontrado' });

  db.prepare(`DELETE FROM platos_menu WHERE id = ?`).run(req.params.id);
  res.json({ message: `Plato "${plato.nombre}" eliminado` });
});

// PATCH /api/menu/platos-menu/:id  (editar nombre y descripción)
router.patch('/platos-menu/:id', authorizePermiso(), (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre del plato es requerido' });

  const plato = db.prepare(`
    SELECT id FROM platos_menu WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);
  if (!plato)
    return res.status(404).json({ error: 'Plato no encontrado' });

  db.prepare(`
    UPDATE platos_menu SET nombre = ?, descripcion = ? WHERE id = ?
  `).run(nombre.trim(), descripcion?.trim() || null, req.params.id);

  res.json({ id: Number(req.params.id), nombre: nombre.trim(), descripcion: descripcion?.trim() || null });
});

// ─────────────────────────────────────────────────────
// MENÚS DEL DÍA
// elegible=0 → menú fijo (cada sección tiene 1 plato)
// elegible=1 → el cliente elige por sección (N opciones)
// ─────────────────────────────────────────────────────

// GET /api/menu/menus-dia?dia=YYYY-MM-DD
router.get('/menus-dia', (req, res) => {
  const { dia } = req.query;

  const menus = dia
    ? db.prepare(`
        SELECT id, nombre, elegible, dia, precio, activo, id_plato_portada
        FROM menus_dia
        WHERE id_restaurante = ? AND dia = ?
        ORDER BY created_at DESC
      `).all(req.user.restaurant_id, dia)
    : db.prepare(`
        SELECT id, nombre, elegible, dia, precio, activo, id_plato_portada
        FROM menus_dia
        WHERE id_restaurante = ?
        ORDER BY dia DESC, created_at DESC
      `).all(req.user.restaurant_id);

  // Para cada menú, traer sus secciones con sus componentes
  const result = menus.map(menu => {
    const secciones = db.prepare(`
      SELECT
        ms.id       AS id_menu_seccion,
        ms.requerido,
        sm.id       AS id_seccion,
        sm.nombre   AS nombre_seccion
      FROM menu_secciones ms
      JOIN secciones_menu sm ON ms.id_seccion_menu = sm.id
      WHERE ms.id_menu_dia = ?
    `).all(menu.id);

    const seccionesConPlatos = secciones.map(s => {
      const platos = db.prepare(`
        SELECT
          cmd.id      AS id_componente,
          cmd.agotado,
          pm.id       AS id_plato,
          pm.nombre,
          pm.descripcion,
          pm.url_foto
        FROM componentes_menu_dia cmd
        JOIN platos_menu pm ON cmd.id_plato_menu = pm.id
        WHERE cmd.id_menu_dia = ? AND cmd.id_seccion_menu = ?
      `).all(menu.id, s.id_seccion);

      return { ...s, platos };
    });

    return { ...menu, secciones: seccionesConPlatos };
  });

  res.json(result);
});

// POST /api/menu/menus-dia
router.post('/menus-dia', authorizePermiso(), (req, res) => {
  const { nombre, elegible, dia, precio } = req.body;

  if (!dia)
    return res.status(400).json({ error: 'La fecha del menú es requerida' });
  if (!precio || isNaN(precio))
    return res.status(400).json({ error: 'El precio es requerido' });

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO menus_dia (nombre, elegible, dia, precio, id_restaurante)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    nombre?.trim() || 'Menú del día',
    elegible ? 1 : 0,
    dia,
    parseFloat(precio),
    req.user.restaurant_id
  );

  res.status(201).json({
    id:      lastInsertRowid,
    nombre:  nombre?.trim() || 'Menú del día',
    elegible: elegible ? 1 : 0,
    dia,
    precio:  parseFloat(precio)
  });
});

// PATCH /api/menu/menus-dia/:id — editar nombre y/o precio
router.patch('/menus-dia/:id', authorizePermiso(), (req, res) => {
  const { nombre, precio } = req.body;
  if (!nombre && precio === undefined)
    return res.status(400).json({ error: 'Se requiere nombre o precio' });

  const menu = db.prepare(`
    SELECT id FROM menus_dia WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);
  if (!menu) return res.status(404).json({ error: 'Menú no encontrado' });

  const sets = []; const params = [];
  if (nombre !== undefined) { sets.push('nombre = ?'); params.push(nombre); }
  if (precio !== undefined) { sets.push('precio = ?'); params.push(parseFloat(precio)); }
  params.push(req.params.id);
  db.prepare(`UPDATE menus_dia SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Menú actualizado' });
});

// PATCH /api/menu/menus-dia/:id/portada — define el plato cuya foto es la portada del menú
// Body: { id_plato_portada: <id|null> }. null/'' limpia la portada (vuelve a la automática).
router.patch('/menus-dia/:id/portada', authorizePermiso(), (req, res) => {
  const { id_plato_portada } = req.body;

  const menu = db.prepare(`
    SELECT id FROM menus_dia WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);
  if (!menu) return res.status(404).json({ error: 'Menú no encontrado' });

  let valor = null;
  if (id_plato_portada !== null && id_plato_portada !== undefined && id_plato_portada !== '') {
    const plato = db.prepare(`
      SELECT id FROM platos_menu WHERE id = ? AND id_restaurante = ?
    `).get(id_plato_portada, req.user.restaurant_id);
    if (!plato) return res.status(400).json({ error: 'Plato no válido' });
    valor = plato.id;
  }

  db.prepare(`UPDATE menus_dia SET id_plato_portada = ? WHERE id = ?`).run(valor, req.params.id);
  res.json({ message: 'Portada actualizada', id_plato_portada: valor });
});

// PATCH /api/menu/menus-dia/:id/activo
router.patch('/menus-dia/:id/activo', authorizePermiso(), (req, res) => {
  const menu = db.prepare(`
    SELECT id FROM menus_dia WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!menu) return res.status(404).json({ error: 'Menú no encontrado' });

  const { activo } = req.body;
  if (activo === undefined || activo === null)
    return res.status(400).json({ error: 'El campo activo es obligatorio' });

  db.prepare(`UPDATE menus_dia SET activo = ? WHERE id = ?`)
    .run(activo ? 1 : 0, req.params.id);

  res.json({ message: 'Menú actualizado', activo: activo ? 1 : 0 });
});

// PATCH /api/menu/menus-dia/:id/elegible
router.patch('/menus-dia/:id/elegible', authorizePermiso(), (req, res) => {
  const menu = db.prepare(`
    SELECT id FROM menus_dia WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!menu) return res.status(404).json({ error: 'Menú no encontrado' });

  const { elegible } = req.body;
  if (elegible === undefined || elegible === null)
    return res.status(400).json({ error: 'El campo elegible es obligatorio' });

  db.prepare(`UPDATE menus_dia SET elegible = ? WHERE id = ?`)
    .run(elegible ? 1 : 0, req.params.id);

  res.json({ message: 'Menú actualizado', elegible: elegible ? 1 : 0 });
});

// DELETE /api/menu/menus-dia/:id
router.delete('/menus-dia/:id', authorizePermiso(), (req, res) => {
  const menu = db.prepare(`
    SELECT id, nombre FROM menus_dia
    WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!menu)
    return res.status(404).json({ error: 'Menú no encontrado' });

  db.transaction(() => {
    db.prepare(`DELETE FROM componentes_menu_dia WHERE id_menu_dia = ?`).run(req.params.id);
    db.prepare(`DELETE FROM menu_secciones WHERE id_menu_dia = ?`).run(req.params.id);
    db.prepare(`DELETE FROM menus_dia WHERE id = ?`).run(req.params.id);
  })();

  res.json({ message: `Menú "${menu.nombre}" eliminado` });
});

// ─────────────────────────────────────────────────────
// SECCIONES DEL MENÚ DEL DÍA
// Define qué secciones tiene un menú y si son obligatorias
// ─────────────────────────────────────────────────────

// POST /api/menu/menus-dia/:id/secciones
router.post('/menus-dia/:id/secciones', authorizePermiso(), (req, res) => {
  const menu = db.prepare(`
    SELECT id FROM menus_dia WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!menu)
    return res.status(404).json({ error: 'Menú no encontrado' });

  const { id_seccion_menu, requerido } = req.body;
  if (!id_seccion_menu)
    return res.status(400).json({ error: 'id_seccion_menu es requerido' });

  // Verificar que la sección pertenece al restaurante
  const seccion = db.prepare(`
    SELECT id FROM secciones_menu
    WHERE id = ? AND id_restaurante = ?
  `).get(id_seccion_menu, req.user.restaurant_id);

  if (!seccion)
    return res.status(404).json({ error: 'Sección no encontrada' });

  // Evitar duplicados
  const existe = db.prepare(`
    SELECT id FROM menu_secciones
    WHERE id_menu_dia = ? AND id_seccion_menu = ?
  `).get(req.params.id, id_seccion_menu);

  if (existe)
    return res.status(400).json({ error: 'Esta sección ya está en el menú' });

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu, requerido)
    VALUES (?, ?, ?)
  `).run(req.params.id, id_seccion_menu, requerido ? 1 : 0);

  res.status(201).json({ id: lastInsertRowid, message: 'Sección agregada al menú' });
});

// PATCH /api/menu/menus-dia/:id/secciones/:seccionId
router.patch('/menus-dia/:id/secciones/:seccionId', authorizePermiso(), (req, res) => {
  const menu = db.prepare(`
    SELECT id FROM menus_dia WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!menu) return res.status(404).json({ error: 'Menú no encontrado' });

  const { requerido } = req.body;
  if (requerido === undefined || requerido === null)
    return res.status(400).json({ error: 'El campo requerido es obligatorio' });

  const seccion = db.prepare(`
    SELECT id FROM menu_secciones WHERE id_menu_dia = ? AND id_seccion_menu = ?
  `).get(req.params.id, req.params.seccionId);

  if (!seccion) return res.status(404).json({ error: 'Sección no encontrada en este menú' });

  db.prepare(`UPDATE menu_secciones SET requerido = ? WHERE id = ?`)
    .run(requerido ? 1 : 0, seccion.id);

  res.json({ message: 'Sección actualizada', requerido: requerido ? 1 : 0 });
});

// DELETE /api/menu/menus-dia/:id/secciones/:seccionId
router.delete('/menus-dia/:id/secciones/:seccionId', authorizePermiso(), (req, res) => {
  const menu = db.prepare(`
    SELECT id FROM menus_dia WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!menu)
    return res.status(404).json({ error: 'Menú no encontrado' });

  // Eliminar solo los componentes sin referencias históricas (órdenes/reservas)
  db.transaction(() => {
    db.prepare(`
      DELETE FROM componentes_menu_dia
      WHERE id_menu_dia = ? AND id_seccion_menu = ?
        AND id NOT IN (SELECT id_componente FROM orden_menu_items)
        AND id NOT IN (SELECT id_componente FROM reserva_menu_items)
    `).run(req.params.id, req.params.seccionId);

    db.prepare(`
      DELETE FROM menu_secciones
      WHERE id_menu_dia = ? AND id_seccion_menu = ?
    `).run(req.params.id, req.params.seccionId);
  })();

  res.json({ message: 'Sección eliminada del menú' });
});

// ─────────────────────────────────────────────────────
// COMPONENTES DEL MENÚ DEL DÍA
// Los platos disponibles por sección en cada menú
// ─────────────────────────────────────────────────────

// POST /api/menu/menus-dia/:id/secciones/:seccionId/platos
router.post('/menus-dia/:id/secciones/:seccionId/platos', authorizePermiso(), (req, res) => {
  const menu = db.prepare(`
    SELECT id, dia FROM menus_dia WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!menu)
    return res.status(404).json({ error: 'Menú no encontrado' });

  const { id_plato_menu } = req.body;
  if (!id_plato_menu)
    return res.status(400).json({ error: 'id_plato_menu es requerido' });

  // Verificar que el plato pertenece al restaurante
  const plato = db.prepare(`
    SELECT id FROM platos_menu WHERE id = ? AND id_restaurante = ?
  `).get(id_plato_menu, req.user.restaurant_id);

  if (!plato)
    return res.status(404).json({ error: 'Plato no encontrado' });

  // Verificar que la sección está en el menú
  const seccionEnMenu = db.prepare(`
    SELECT id FROM menu_secciones
    WHERE id_menu_dia = ? AND id_seccion_menu = ?
  `).get(req.params.id, req.params.seccionId);

  if (!seccionEnMenu)
    return res.status(400).json({ error: 'La sección no pertenece a este menú' });

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO componentes_menu_dia
      (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    req.params.id,
    menu.dia,
    req.params.seccionId,
    id_plato_menu,
    req.user.restaurant_id
  );

  res.status(201).json({ id: lastInsertRowid, message: 'Plato agregado al menú' });
});

// PATCH /api/menu/menus-dia/:id/secciones/:seccionId/platos/:componenteId/agotado
router.patch('/menus-dia/:id/secciones/:seccionId/platos/:componenteId/agotado', authorizePermiso(), (req, res) => {
  const menu = db.prepare(`
    SELECT id FROM menus_dia WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!menu) return res.status(404).json({ error: 'Menú no encontrado' });

  const componente = db.prepare(`
    SELECT id FROM componentes_menu_dia
    WHERE id = ? AND id_menu_dia = ? AND id_seccion_menu = ?
  `).get(req.params.componenteId, req.params.id, req.params.seccionId);

  if (!componente) return res.status(404).json({ error: 'Componente no encontrado' });

  const { agotado } = req.body;
  if (agotado === undefined || agotado === null)
    return res.status(400).json({ error: 'El campo agotado es obligatorio' });

  db.prepare(`UPDATE componentes_menu_dia SET agotado = ? WHERE id = ?`)
    .run(agotado ? 1 : 0, componente.id);

  res.json({ message: 'Plato actualizado', agotado: agotado ? 1 : 0 });
});

// DELETE /api/menu/menus-dia/:id/secciones/:seccionId/platos/:componenteId
router.delete('/menus-dia/:id/secciones/:seccionId/platos/:componenteId', authorizePermiso(), (req, res) => {
  const menu = db.prepare(`
    SELECT id FROM menus_dia WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!menu)
    return res.status(404).json({ error: 'Menú no encontrado' });

  const componente = db.prepare(`
    SELECT id FROM componentes_menu_dia
    WHERE id = ? AND id_menu_dia = ? AND id_seccion_menu = ?
  `).get(req.params.componenteId, req.params.id, req.params.seccionId);

  if (!componente)
    return res.status(404).json({ error: 'Componente no encontrado' });

  db.prepare(`DELETE FROM componentes_menu_dia WHERE id = ?`).run(req.params.componenteId);
  res.json({ message: 'Plato eliminado del menú' });
});

// ─────────────────────────────────────────────────────
// CATEGORÍAS DE CARTA
// ─────────────────────────────────────────────────────

// GET /api/menu/categorias
router.get('/categorias', (req, res) => {
  const categorias = db.prepare(`
    SELECT id, nombre FROM categorias_carta
    WHERE id_restaurante = ?
    ORDER BY nombre ASC
  `).all(req.user.restaurant_id);

  res.json(categorias);
});

// POST /api/menu/categorias
router.post('/categorias', authorizePermiso(), (req, res) => {
  const { nombre } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre de la categoría es requerido' });

  const existe = db.prepare(`
    SELECT id FROM categorias_carta
    WHERE nombre = ? AND id_restaurante = ?
  `).get(nombre.trim(), req.user.restaurant_id);

  if (existe)
    return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO categorias_carta (nombre, id_restaurante) VALUES (?, ?)
  `).run(nombre.trim(), req.user.restaurant_id);

  res.status(201).json({ id: lastInsertRowid, nombre: nombre.trim() });
});

// DELETE /api/menu/categorias/:id
router.delete('/categorias/:id', authorizePermiso(), (req, res) => {
  const categoria = db.prepare(`
    SELECT id, nombre FROM categorias_carta
    WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!categoria)
    return res.status(404).json({ error: 'Categoría no encontrada' });

  // Verificar que no tenga platos asociados
  const tienaPlatos = db.prepare(`
    SELECT id FROM platos_carta WHERE id_categoria = ?
  `).get(req.params.id);

  if (tienaPlatos)
    return res.status(400).json({
      error: 'No se puede eliminar una categoría con platos. Elimina los platos primero.'
    });

  db.prepare(`DELETE FROM categorias_carta WHERE id = ?`).run(req.params.id);
  res.json({ message: `Categoría "${categoria.nombre}" eliminada` });
});

// ─────────────────────────────────────────────────────
// PLATOS A LA CARTA
// ─────────────────────────────────────────────────────

// GET /api/menu/platos-carta
// Incluye conteo de veces pedido para la métrica del owner
router.get('/platos-carta', (req, res) => {
  const platos = db.prepare(`
    SELECT
      pc.id,
      pc.nombre,
      pc.descripcion,
      pc.precio,
      pc.url_foto,
      pc.activo,
      pc.id_categoria,
      cc.nombre AS categoria,
      COUNT(oci.id) AS veces_pedido
    FROM platos_carta pc
    JOIN categorias_carta cc ON pc.id_categoria = cc.id
    LEFT JOIN orden_carta_items oci ON oci.id_plato_carta = pc.id
    WHERE pc.id_restaurante = ?
    GROUP BY pc.id
    ORDER BY cc.nombre ASC, pc.nombre ASC
  `).all(req.user.restaurant_id);

  res.json(platos);
});

// POST /api/menu/platos-carta
router.post('/platos-carta', authorizePermiso(), (req, res) => {
  const { nombre, descripcion, precio, url_foto, id_categoria } = req.body;

  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre del plato es requerido' });
  if (!precio || isNaN(precio))
    return res.status(400).json({ error: 'El precio es requerido' });
  if (!id_categoria)
    return res.status(400).json({ error: 'La categoría es requerida' });

  // Verificar que la categoría pertenece al restaurante
  const categoria = db.prepare(`
    SELECT id FROM categorias_carta WHERE id = ? AND id_restaurante = ?
  `).get(id_categoria, req.user.restaurant_id);

  if (!categoria)
    return res.status(404).json({ error: 'Categoría no encontrada' });

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO platos_carta (nombre, descripcion, precio, url_foto, id_categoria, id_restaurante)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    nombre.trim(),
    descripcion || null,
    parseFloat(precio),
    url_foto || null,
    id_categoria,
    req.user.restaurant_id
  );

  res.status(201).json({ id: lastInsertRowid, nombre: nombre.trim() });
});

// PATCH /api/menu/platos-carta/:id/toggle
// Activar o inactivar un plato de carta
router.patch('/platos-carta/:id/toggle', authorizePermiso(), (req, res) => {
  const plato = db.prepare(`
    SELECT id, nombre, activo FROM platos_carta
    WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!plato)
    return res.status(404).json({ error: 'Plato no encontrado' });

  const nuevoActivo = plato.activo ? 0 : 1;
  db.prepare(`UPDATE platos_carta SET activo = ? WHERE id = ?`).run(nuevoActivo, req.params.id);

  res.json({
    message: nuevoActivo
      ? `"${plato.nombre}" activado`
      : `"${plato.nombre}" desactivado`,
    activo: nuevoActivo
  });
});

// PATCH /api/menu/platos-carta/:id  (editar nombre, precio, descripción y categoría)
router.patch('/platos-carta/:id', authorizePermiso(), (req, res) => {
  const { nombre, descripcion, precio, id_categoria } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre del plato es requerido' });
  if (!precio || isNaN(precio))
    return res.status(400).json({ error: 'El precio es requerido' });
  if (!id_categoria)
    return res.status(400).json({ error: 'La categoría es requerida' });

  const plato = db.prepare(`
    SELECT id FROM platos_carta WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);
  if (!plato)
    return res.status(404).json({ error: 'Plato no encontrado' });

  // La categoría debe pertenecer al mismo restaurante
  const categoria = db.prepare(`
    SELECT id FROM categorias_carta WHERE id = ? AND id_restaurante = ?
  `).get(id_categoria, req.user.restaurant_id);
  if (!categoria)
    return res.status(404).json({ error: 'Categoría no encontrada' });

  db.prepare(`
    UPDATE platos_carta SET nombre = ?, descripcion = ?, precio = ?, id_categoria = ? WHERE id = ?
  `).run(nombre.trim(), descripcion?.trim() || null, parseFloat(precio), id_categoria, req.params.id);

  res.json({ id: Number(req.params.id), nombre: nombre.trim() });
});

// DELETE /api/menu/platos-carta/:id
router.delete('/platos-carta/:id', authorizePermiso(), (req, res) => {
  const plato = db.prepare(`
    SELECT id, nombre FROM platos_carta
    WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!plato)
    return res.status(404).json({ error: 'Plato no encontrado' });

  db.prepare(`DELETE FROM platos_carta WHERE id = ?`).run(req.params.id);
  res.json({ message: `Plato "${plato.nombre}" eliminado` });
});

// ─────────────────────────────────────────────────────
// CONFIGURACIÓN VISUAL DEL RESTAURANTE
// ─────────────────────────────────────────────────────
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Crear carpetas de uploads si no existen (evita ENOENT al subir fotos en laptop nueva)
['restaurantes', 'platos-menu', 'platos-carta'].forEach(sub => {
  fs.mkdirSync(path.join(__dirname, '..', 'public', 'uploads', sub), { recursive: true });
});

const uploadStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads', 'restaurantes'));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `rest_${req.user.restaurant_id}${ext}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Solo se permiten imágenes jpg, png o webp'));
  }
});

// GET /api/menu/restaurante/config
router.get('/restaurante/config', authorizePermiso(), (req, res) => {
  const row = db.prepare(`
    SELECT nombre, foto_portada, color_primario, color_secundario,
           yape_activo, yape_telefono, plin_activo, plin_telefono, efectivo_activo,
           minutos_preparacion, para_llevar_activo, delivery_activo,
           costo_tapper, tarifa_delivery, auto_merge_activo
    FROM restaurantes WHERE id = ?
  `).get(req.user.restaurant_id);
  if (!row) return res.status(404).json({ error: 'Restaurante no encontrado' });
  res.json({
    nombre:               row.nombre,
    foto_portada:         row.foto_portada         || null,
    color_primario:       row.color_primario        || '#c8692a',
    color_secundario:     row.color_secundario      || '#1a6090',
    yape_activo:          row.yape_activo           ?? 0,
    yape_telefono:        row.yape_telefono         || '',
    plin_activo:          row.plin_activo           ?? 0,
    plin_telefono:        row.plin_telefono         || '',
    efectivo_activo:      row.efectivo_activo       ?? 0,
    minutos_preparacion:  row.minutos_preparacion   ?? 20,
    para_llevar_activo:   row.para_llevar_activo    ?? 1,
    delivery_activo:      row.delivery_activo       ?? 0,
    costo_tapper:         row.costo_tapper          ?? 0,
    tarifa_delivery:      row.tarifa_delivery       ?? 0,
    auto_merge_activo:    row.auto_merge_activo     ?? 1,
  });
});

// PATCH /api/menu/config/modalidades — activar/desactivar modalidades y configurar costos
router.patch('/config/modalidades', authorizePermiso(), (req, res) => {
  const { para_llevar_activo, delivery_activo, costo_tapper, tarifa_delivery } = req.body;
  const tapper  = Math.max(0, parseFloat(costo_tapper)    || 0);
  const delivery = Math.max(0, parseFloat(tarifa_delivery) || 0);
  db.prepare(`
    UPDATE restaurantes
    SET para_llevar_activo = ?, delivery_activo = ?, costo_tapper = ?, tarifa_delivery = ?
    WHERE id = ?
  `).run(para_llevar_activo ? 1 : 0, delivery_activo ? 1 : 0, tapper, delivery, req.user.restaurant_id);
  res.json({
    para_llevar_activo: para_llevar_activo ? 1 : 0,
    delivery_activo:    delivery_activo    ? 1 : 0,
    costo_tapper:       tapper,
    tarifa_delivery:    delivery,
  });
});

// PATCH /api/menu/config/auto-merge — activar/desactivar auto-merge cuenta por mesa
router.patch('/config/auto-merge', authorizePermiso(), (req, res) => {
  const activo = req.body.auto_merge_activo ? 1 : 0;
  db.prepare(`UPDATE restaurantes SET auto_merge_activo = ? WHERE id = ?`)
    .run(activo, req.user.restaurant_id);
  res.json({ auto_merge_activo: activo });
});

// PATCH /api/menu/config/minutos-preparacion — tiempo de anticipación por restaurante
router.patch('/config/minutos-preparacion', authorizePermiso(), (req, res) => {
  const minutos = parseInt(req.body.minutos_preparacion, 10);
  if (isNaN(minutos) || minutos < 1 || minutos > 180)
    return res.status(400).json({ error: 'minutos_preparacion debe ser un número entre 1 y 180' });

  db.prepare(`UPDATE restaurantes SET minutos_preparacion = ? WHERE id = ?`)
    .run(minutos, req.user.restaurant_id);

  res.json({ minutos_preparacion: minutos });
});

// PATCH /api/menu/config/pagos — guardar métodos de pago del restaurante
router.patch('/config/pagos', authorizePermiso(), (req, res) => {
  const { yape_activo, yape_telefono, plin_activo, plin_telefono, efectivo_activo } = req.body;
  db.prepare(`
    UPDATE restaurantes
    SET yape_activo = ?, yape_telefono = ?, plin_activo = ?, plin_telefono = ?, efectivo_activo = ?
    WHERE id = ?
  `).run(
    yape_activo    ? 1 : 0,
    yape_telefono?.trim()  || null,
    plin_activo    ? 1 : 0,
    plin_telefono?.trim()  || null,
    efectivo_activo ? 1 : 0,
    req.user.restaurant_id
  );
  res.json({ message: 'Métodos de pago guardados' });
});

// PATCH /api/menu/restaurante/config
router.patch('/restaurante/config', authorizePermiso(), (req, res) => {
  const { color_primario, color_secundario } = req.body;
  const hexRegex = /^#[0-9a-fA-F]{6}$/;
  if (color_primario   && !hexRegex.test(color_primario))
    return res.status(400).json({ error: 'color_primario debe ser un color hex válido' });
  if (color_secundario && !hexRegex.test(color_secundario))
    return res.status(400).json({ error: 'color_secundario debe ser un color hex válido' });

  const sets = [];
  const vals = [];
  if (color_primario)   { sets.push('color_primario = ?');   vals.push(color_primario); }
  if (color_secundario) { sets.push('color_secundario = ?'); vals.push(color_secundario); }
  if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar' });

  vals.push(req.user.restaurant_id);
  db.prepare(`UPDATE restaurantes SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  res.json({ message: 'Colores actualizados' });
});

// POST /api/menu/restaurante/foto
router.post('/restaurante/foto', authorizePermiso(), (req, res) => {
  upload.single('foto')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const ruta = `/uploads/restaurantes/${req.file.filename}`;
    db.prepare(`UPDATE restaurantes SET foto_portada = ? WHERE id = ?`)
      .run(ruta, req.user.restaurant_id);
    res.json({ foto_portada: ruta });
  });
});

// DELETE /api/menu/restaurante/foto — elimina la foto de portada
router.delete('/restaurante/foto', authorizePermiso(), (req, res) => {
  const row = db.prepare(`SELECT foto_portada FROM restaurantes WHERE id = ?`)
    .get(req.user.restaurant_id);
  if (row?.foto_portada) {
    const abs = path.join(__dirname, '..', 'public', row.foto_portada);
    try { fs.unlinkSync(abs); } catch (_) {}
  }
  db.prepare(`UPDATE restaurantes SET foto_portada = NULL WHERE id = ?`)
    .run(req.user.restaurant_id);
  res.json({ message: 'Foto eliminada' });
});

// ─────────────────────────────────────────────────────
// FOTOS DE PLATOS
// ─────────────────────────────────────────────────────
function makeUploadPlato(subcarpeta) {
  return multer({
    storage: multer.diskStorage({
      destination(req, file, cb) {
        cb(null, path.join(__dirname, '..', 'public', 'uploads', subcarpeta));
      },
      filename(req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        // Nombre versionado con timestamp: cada subida genera una URL nueva.
        // Evita 2 problemas del nombre fijo (ISS-015):
        //   1) el navegador cachea la URL estable y no muestra la foto nueva
        //   2) si la extensión coincide, multer sobrescribe y luego el unlink
        //      del "anterior" borraba la imagen recién subida (quedaba sin foto)
        cb(null, `plato_${req.params.id}_${Date.now()}${ext}`);
      }
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter(req, file, cb) {
      if (file.mimetype.startsWith('image/')) return cb(null, true);
      cb(new Error('Solo se permiten imágenes'));
    }
  });
}

function subirFotoPlato(tabla, subcarpeta, uploadInst) {
  return (req, res) => {
    const plato = db.prepare(`SELECT id, url_foto FROM ${tabla} WHERE id = ? AND id_restaurante = ?`)
      .get(req.params.id, req.user.restaurant_id);
    if (!plato) return res.status(404).json({ error: 'Plato no encontrado' });

    uploadInst.single('foto')(req, res, err => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

      // Eliminar archivo anterior si existía
      if (plato.url_foto) {
        try { fs.unlinkSync(path.join(__dirname, '..', 'public', plato.url_foto)); } catch (_) {}
      }

      const ruta = `/uploads/${subcarpeta}/${req.file.filename}`;
      db.prepare(`UPDATE ${tabla} SET url_foto = ? WHERE id = ?`).run(ruta, plato.id);
      res.json({ url_foto: ruta });
    });
  };
}

function eliminarFotoPlato(tabla) {
  return (req, res) => {
    const plato = db.prepare(`SELECT id, url_foto FROM ${tabla} WHERE id = ? AND id_restaurante = ?`)
      .get(req.params.id, req.user.restaurant_id);
    if (!plato) return res.status(404).json({ error: 'Plato no encontrado' });
    if (plato.url_foto) {
      try { fs.unlinkSync(path.join(__dirname, '..', 'public', plato.url_foto)); } catch (_) {}
    }
    db.prepare(`UPDATE ${tabla} SET url_foto = NULL WHERE id = ?`).run(plato.id);
    res.json({ message: 'Foto eliminada' });
  };
}

const uploadPlatoMenu  = makeUploadPlato('platos-menu');
const uploadPlatoCarta = makeUploadPlato('platos-carta');

// POST   /api/menu/platos-menu/:id/foto
// DELETE /api/menu/platos-menu/:id/foto
router.post('/platos-menu/:id/foto',   authorizePermiso(), subirFotoPlato('platos_menu',  'platos-menu',  uploadPlatoMenu));
router.delete('/platos-menu/:id/foto', authorizePermiso(), eliminarFotoPlato('platos_menu'));

// POST   /api/menu/platos-carta/:id/foto
// DELETE /api/menu/platos-carta/:id/foto
router.post('/platos-carta/:id/foto',   authorizePermiso(), subirFotoPlato('platos_carta', 'platos-carta', uploadPlatoCarta));
router.delete('/platos-carta/:id/foto', authorizePermiso(), eliminarFotoPlato('platos_carta'));

module.exports = router;