// utils/mesas.js
//
// ISS-094 — crear las mesas de una sola vez.
//
// Antes cada mesa se creaba a mano (número + capacidad + "Agregar"): 20 vueltas
// para el piloto, 40-50 para los locales del target. Ahora la dueña pone
// cuántas mesas tiene y se crean numeradas del 1 al N.
//
// Ojo con lo que la lista de mesas NO hace: "Por cobrar" agrupa por el número
// que trae cada pedido (`ordenes.mesa`), el QR lleva la mesa en el link y
// "Agregar manual" se escribe a mano. Ninguno consulta esta tabla. Hoy solo
// alimenta el Plano de mesas.

const MAX_MESAS = 100;  // mismo tope que el generador de QR por mesa

// Crea las mesas 1..cantidad que falten. Nunca borra ni modifica las que ya
// existen: repetir con el mismo número no duplica, y poner un número menor no
// quita ninguna (quitar mesas en bloque es otra decisión, y peligrosa).
//
// db: instancia better-sqlite3.
// Devuelve { creadas: [números nuevos], total: mesas del restaurante }.
function crearMesasLote(db, idRestaurante, cantidad) {
  const insertar = db.prepare(`
    INSERT OR IGNORE INTO mesas (numero, capacidad, id_restaurante) VALUES (?, 4, ?)
  `);

  const creadas = db.transaction(() => {
    const nuevas = [];
    for (let numero = 1; numero <= cantidad; numero++) {
      if (insertar.run(numero, idRestaurante).changes) nuevas.push(numero);
    }
    return nuevas;
  })();

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM mesas WHERE id_restaurante = ?`).get(idRestaurante);
  return { creadas, total };
}

// Valida la cantidad pedida para crear en lote. Devuelve el entero o null.
function cantidadMesasValida(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 1 && n <= MAX_MESAS ? n : null;
}

// Normaliza el número de mesa de un pedido. "Agregar manual" lo recibe
// escrito a mano, así que puede venir vacío, con espacios o inválido.
// Devuelve { mesa: entero | null } o { error }.
function normalizarNumeroMesa(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return { mesa: null };
  const texto = String(valor).trim();
  if (!/^\d+$/.test(texto) || Number(texto) < 1)
    return { error: 'El número de mesa tiene que ser un número entero mayor a 0' };
  return { mesa: Number(texto) };
}

module.exports = { crearMesasLote, cantidadMesasValida, normalizarNumeroMesa, MAX_MESAS };
