# Flujo de Pago — Menú Pro

> Documenta el flujo real de pago tras el fix del 2026-07-09. Antes de este fix, la foto de
> comprobante era opcional, existía un botón "Pagar más tarde" sin retorno, y el endpoint de
> confirmación manual del owner existía en el backend pero no estaba conectado a ninguna
> pantalla — el owner "verificaba" el pago con el mismo botón que completaba el pedido/reserva,
> sin mirar nunca el comprobante. Ver diagnóstico completo en `status.md`, sesión 2026-07-09.

---

## 1. Flujo del cliente (elegir método de pago)

```
Cliente confirma orden/reserva
          │
          ▼
  ¿El restaurante tiene métodos de pago configurados?
          │
    ┌─────┴─────┐
    │           │
   No           Sí
    │           │
    ▼           ▼
 Confirma   Elige método:
 directo    ┌─────────┬─────────┬───────────┐
            │  Yape   │  Plin   │ Efectivo  │
            └────┬────┴────┬────┴─────┬─────┘
                 ▼         ▼          ▼
           Foto del    Foto del   "Pagarás en
           comprobante comprobante efectivo al
           OBLIGATORIA OBLIGATORIA llegar/recoger"
                 │         │          │
                 └────┬────┘          │
                      ▼               ▼
              PATCH /api/public/pago/{orden|reserva}/:id
              metodo_pago + foto → estado_pago = 'enviado'
                      │               │
                      └───────┬───────┘
                              ▼
                    Confirmación al cliente
```

**No existe "pagar más tarde".** Fue eliminado (`skipPago()` en `menu.html`) porque:
- No estaba en la visión de negocio original (sección 7 de `vision_negocio.md` solo contempla Yape/Plin+foto o Efectivo).
- Dejaba `metodo_pago`/`estado_pago` en `NULL` para siempre, sin ningún camino de vuelta para que el cliente completara el pago.
- Efectivo ya cubre el caso legítimo de "pago diferido" (se paga en persona) — no hacía falta un segundo mecanismo.

**La foto es obligatoria para Yape/Plin** (`routes/public.js`, `handlePago()`): sin ella no hay evidencia de la transferencia, y el backend rechaza el `PATCH` con 400. Efectivo no la necesita.

---

## 2. Flujo del owner (verificar y completar)

```
Pago enviado (estado_pago = 'enviado')
          │
          ▼
  Owner ve la card en Órdenes/Reservas/Cola del día:
  badge "💚 Yape · Pendiente confirmación" + miniatura del comprobante
          │
          ▼
  ¿metodo_pago es yape/plin?
          │
    ┌─────┴─────┐
    │           │
   Sí          No (efectivo, o sin metodo_pago —
    │           pedido tomado en mesa por el mozo)
    ▼               │
Botón visible:       │
"✓ Confirmar pago"    │
    │                 │
    ▼                 │
PATCH /:id/confirmar-pago       │
(revisa la foto, toca el botón) │
estado_pago = 'confirmado'      │
    │                           │
    └─────────────┬─────────────┘
                  ▼
        Botón "💰 Cobrar" / "💰 Completar" ahora visible
                  │
                  ▼
        PATCH /:id/estatus { flag: 'es_pagado' | 'es_full' }
        (el backend also valida: si el método es yape/plin
         y no está 'confirmado', responde 400)
```

**El gate es doble** (defensa en profundidad, `utils/verificacionPago.js`):
- **Frontend:** `ordenes.js`, `reservas.js` y `pedidos.js` muestran "✓ Confirmar pago" en vez de "💰 Cobrar/Completar" mientras el pago digital no esté confirmado.
- **Backend:** `PATCH /api/orders/:id/estatus` y `PATCH /api/reservations/:id/estatus` rechazan la transición a `es_pagado`/`es_full` con 400 si `metodo_pago` es yape/plin y `estado_pago !== 'confirmado'` — aunque alguien intente el cambio directo por API, sin pasar por la UI.

---

## 3. Estados de `estado_pago`

| Valor | Significado | Quién lo setea |
|---|---|---|
| `NULL` | Sin pago registrado (pedido tomado en mesa por el mozo, o reserva/orden recién creada) | — |
| `'enviado'` | Cliente marcó el pago y (si es digital) adjuntó comprobante | `PATCH /api/public/pago/...` |
| `'confirmado'` | Owner revisó el comprobante y lo aprobó | `PATCH /:id/confirmar-pago` |
| `'pagado'` | Orden/reserva completada — cobro cerrado | `PATCH /:id/estatus` con flag `es_pagado`/`es_full` |

---

## 4. Por qué efectivo no pasa por "confirmar-pago"

El efectivo se cobra en persona en el mismo momento en que se completa el pedido/reserva — no hay comprobante que revisar por separado, el mozo/owner cuenta el dinero y completa en un solo paso. Forzar una confirmación previa sería fricción sin beneficio (a diferencia de Yape/Plin, donde la foto es la única evidencia de que el dinero realmente llegó).

---

## 5. Pendiente / fuera de alcance de este fix

- No hay reversión de `estado_pago = 'confirmado'` si el owner se equivoca (tendría que cancelar la orden/reserva completa).
- No hay notificación push al owner cuando llega un comprobante nuevo (hoy se entera al abrir el panel).
- Tarjeta/Culqi (pago con verificación automática vía pasarela) es fase futura — eliminaría la necesidad de confirmación manual para ese método.
