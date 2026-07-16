/**
 * Regla de verificación de pago antes de marcar una orden/reserva como
 * pagada/completada (es_pagado / es_full). Los pagos digitales (yape/plin)
 * necesitan que el owner haya revisado el comprobante y confirmado
 * (estado_pago === 'confirmado') vía PATCH /:id/confirmar-pago. Efectivo se
 * cobra en persona al completar, no requiere este paso.
 */
function requiereConfirmarPagoAntes(metodo_pago, estado_pago) {
  return ['yape', 'plin'].includes(metodo_pago) && estado_pago !== 'confirmado';
}

module.exports = { requiereConfirmarPagoAntes };
