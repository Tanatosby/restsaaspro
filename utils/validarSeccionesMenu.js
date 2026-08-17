// utils/validarSeccionesMenu.js
//
// Valida que los menu_items de un pedido/reserva no lleguen incompletos a
// cocina — ISS-046. Dos reglas:
//   1) Las secciones marcadas obligatorias (menu_secciones.requerido=1)
//      tienen que estar cubiertas.
//   2) Un plato puede exigir OTRA sección aunque esa sección sea opcional en
//      general (componentes_menu_dia.requiere_seccion_id) — ej. "arroz con
//      papas fritas" exige "Proteínas", pero "arroz con pollo" no exige nada
//      porque ya está completo.
//
// Se valida POR INSTANCIA de menú (agrupando por `grupo`, ISS-041), no por
// id_menu_dia a secas: un mismo pedido puede traer 2+ menús del mismo tipo
// con selecciones distintas, y agrupar solo por id_menu_dia dejaría pasar una
// instancia incompleta si otra instancia del mismo menú sí trae la sección
// completa (el mismo tipo de bug que ya se encontró en reportes.js). Los
// ítems sin `grupo` (pedidos viejos / clientes que no lo mandan) se agrupan
// entre sí por id_menu_dia — degradación razonable, no un bloqueo.
//
// db: instancia better-sqlite3.
// menuItems: [{ id_componente, id_menu_dia, grupo? }]
// Devuelve null si todo OK, o un string con el primer error encontrado.
function validarSeccionesMenu(db, menuItems) {
  if (!menuItems?.length) return null;

  const idsComponente = [...new Set(menuItems.map(i => i.id_componente))];
  const placeholders = idsComponente.map(() => '?').join(',');
  const info = db.prepare(`
    SELECT
      cmd.id                  AS id_componente,
      cmd.id_menu_dia,
      cmd.id_seccion_menu,
      cmd.requiere_seccion_id,
      sm2.nombre              AS requiere_seccion_nombre
    FROM componentes_menu_dia cmd
    LEFT JOIN secciones_menu sm2 ON cmd.requiere_seccion_id = sm2.id
    WHERE cmd.id IN (${placeholders})
  `).all(...idsComponente);
  const infoPorComponente = new Map(info.map(i => [i.id_componente, i]));

  const idsMenu = [...new Set(menuItems.map(i => i.id_menu_dia))];
  const phMenu = idsMenu.map(() => '?').join(',');
  const obligatorias = db.prepare(`
    SELECT ms.id_menu_dia, ms.id_seccion_menu, sm.nombre AS nombre_seccion
    FROM menu_secciones ms
    JOIN secciones_menu sm ON sm.id = ms.id_seccion_menu
    WHERE ms.id_menu_dia IN (${phMenu}) AND ms.requerido = 1
  `).all(...idsMenu);
  const obligatoriasPorMenu = new Map();
  for (const o of obligatorias) {
    if (!obligatoriasPorMenu.has(o.id_menu_dia)) obligatoriasPorMenu.set(o.id_menu_dia, []);
    obligatoriasPorMenu.get(o.id_menu_dia).push(o);
  }

  // Agrupar por instancia de menú: clave = grupo si viene, si no id_menu_dia.
  const instancias = new Map();
  for (const item of menuItems) {
    const c = infoPorComponente.get(item.id_componente);
    if (!c) continue; // componente inválido — lo rechaza la validación existente, no esta
    const clave = item.grupo != null ? `g${item.grupo}` : `m${item.id_menu_dia}`;
    if (!instancias.has(clave)) {
      instancias.set(clave, { id_menu_dia: item.id_menu_dia, secciones: new Set(), componentes: [] });
    }
    const inst = instancias.get(clave);
    inst.secciones.add(c.id_seccion_menu);
    inst.componentes.push(c);
  }

  for (const inst of instancias.values()) {
    const requeridas = obligatoriasPorMenu.get(inst.id_menu_dia) || [];
    for (const r of requeridas) {
      if (!inst.secciones.has(r.id_seccion_menu))
        return `Falta elegir la sección "${r.nombre_seccion}"`;
    }

    for (const c of inst.componentes) {
      if (c.requiere_seccion_id && !inst.secciones.has(c.requiere_seccion_id))
        return `Un plato elegido también necesita la sección "${c.requiere_seccion_nombre || ''}"`;
    }
  }

  return null;
}

module.exports = { validarSeccionesMenu };
