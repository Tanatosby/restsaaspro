/**
 * Gate de verificación de pago antes de completar una orden/reserva
 * (fix del flujo de pago, 2026-07-09): un pago digital (yape/plin) no puede
 * marcarse como completado/pagado hasta que el owner lo confirme
 * (PATCH /:id/confirmar-pago) tras revisar el comprobante. Efectivo se
 * cobra en persona al completar, no requiere este paso.
 */

const { requiereConfirmarPagoAntes } = require('../utils/verificacionPago');

describe('requiereConfirmarPagoAntes', () => {
  test('yape sin confirmar → requiere confirmación', () => {
    expect(requiereConfirmarPagoAntes('yape', 'enviado')).toBe(true);
  });

  test('plin sin confirmar → requiere confirmación', () => {
    expect(requiereConfirmarPagoAntes('plin', 'enviado')).toBe(true);
  });

  test('yape ya confirmado → no requiere confirmación', () => {
    expect(requiereConfirmarPagoAntes('yape', 'confirmado')).toBe(false);
  });

  test('efectivo nunca requiere confirmación', () => {
    expect(requiereConfirmarPagoAntes('efectivo', null)).toBe(false);
    expect(requiereConfirmarPagoAntes('efectivo', 'enviado')).toBe(false);
  });

  test('sin metodo_pago (nunca pasó por el flujo de pago) → no bloquea (no hay nada que confirmar)', () => {
    expect(requiereConfirmarPagoAntes(null, null)).toBe(false);
  });

  test('yape con estado_pago null (no debería pasar tras hacer la foto obligatoria, pero por defecto bloquea)', () => {
    expect(requiereConfirmarPagoAntes('yape', null)).toBe(true);
  });
});
