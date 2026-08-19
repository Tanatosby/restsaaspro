// utils/comprobanteDuplicado.js
// Detección de comprobante de pago (Yape/Plin) reutilizado — pregunta real
// de la dueña de un piloto: "¿qué pasa si un chico comparte su pago de
// Yape con otro y ambos envían la misma captura?".
//
// Decisión de diseño (2026-08-19): AVISAR al owner, no bloquear al
// comensal. El owner ya revisa cada comprobante a mano antes de poder
// tocar "✓ Confirmar pago" (gate ya existente) — tiene el contexto para
// decidir si es sospechoso o una coincidencia inocente. Bloquear la
// subida del lado del comensal lo deja varado en el paso final del pedido
// sin ninguna salida clara.
//
// Solo atrapa el archivo IDÉNTICO (mismos bytes) — si alguien le saca una
// captura de pantalla a la captura, el hash cambia y no lo agarra. Es una
// limitación conocida y aceptada, no un bug.
const fs     = require('fs');
const crypto = require('crypto');

function calcularHashArchivo(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

// Busca si `hash` ya se usó en otra orden/reserva del mismo restaurante.
// Excluye el propio registro (para no marcarse a sí mismo si el comensal
// reintenta subir la misma foto para SU MISMO pedido, ej. tras un timeout).
// Devuelve { hash, repetido: {tipo, id} | null }.
function buscarComprobanteRepetido(db, idRestaurante, filePath, tablaActual, idActual) {
  const hash = calcularHashArchivo(filePath);

  const enOrdenes = db.prepare(`
    SELECT id FROM ordenes
    WHERE id_restaurante = ? AND comprobante_hash = ?
      ${tablaActual === 'ordenes' ? 'AND id != ?' : ''}
    ORDER BY id ASC LIMIT 1
  `).get(...(tablaActual === 'ordenes' ? [idRestaurante, hash, idActual] : [idRestaurante, hash]));
  if (enOrdenes) return { hash, repetido: { tipo: 'orden', id: enOrdenes.id } };

  const enReservas = db.prepare(`
    SELECT id FROM reservas
    WHERE id_restaurante = ? AND comprobante_hash = ?
      ${tablaActual === 'reservas' ? 'AND id != ?' : ''}
    ORDER BY id ASC LIMIT 1
  `).get(...(tablaActual === 'reservas' ? [idRestaurante, hash, idActual] : [idRestaurante, hash]));
  if (enReservas) return { hash, repetido: { tipo: 'reserva', id: enReservas.id } };

  return { hash, repetido: null };
}

module.exports = { calcularHashArchivo, buscarComprobanteRepetido };
