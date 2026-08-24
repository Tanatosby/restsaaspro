# ISS-065 — Reservar sin hora de llegada podía bloquearse por el horario de "ahora", no el de la reserva

**Estado:** ✅ **Resuelto 2026-08-24.**
**Módulo:** `utils/horarioAtencion.js`, `routes/public.js`.
**Prioridad:** 🔴 Alta — bloqueaba reservas reales de comensales.
**Origen:** piloto #1, Día 10 (2026-08-23), reportado por el usuario el 2026-08-24: un comensal
quiso reservar y no pudo por el tema de la hora. El usuario asumió el diseño original (D1,
2026-08-13) como un error propio y pidió la corrección en la misma sesión.

---

## Diagnóstico

"Hora de llegada" es un campo opcional en el formulario de reserva. `validarHorarioReserva()`
(D1, 2026-08-13) decía: si el comensal especifica hora, valida que **esa** hora caiga en el
horario de atención; si no la especifica, "no hay hora futura que validar" y cae a
`validarHorarioAhora()` — es decir, exige que el restaurante esté **abierto ahora mismo** (con la
fecha de HOY, no la de la reserva).

Eso rompía el caso real: reservar sin hora para un día futuro (o incluso para hoy, fuera del
horario de atención) fallaba aunque la fecha elegida sí tuviera horario válido, porque el
chequeo comparaba contra el momento de creación de la reserva, no contra la fecha reservada.
Confuso además porque el campo dice "(opcional)" pero terminaba siendo, de hecho, una condición
para poder reservar.

## Corrección de diseño (decidida con el usuario)

La hora de llegada nunca debe ser un requisito para reservar — solo existe para ayudar a
anticipar cuándo pasar el pedido a cocina (a mano; **no existe ningún paso automático que la
use** — se confirmó que `esInminente()` en `mesas.js` solo resalta la reserva como "inminente" en
el plano de mesas, nunca cambia su estatus). Lógica correcta:

- **Sin hora:** nunca se asume ninguna hora — la reserva **siempre pasa**, sin validar horario.
- **Con hora:** se valida que esa hora caiga en el horario de atención (sin cambios, D1 sigue
  vigente para este caso).

## Solución implementada

```js
function validarHorarioReserva(rest, fecha, hora_llegada) {
  if (!hora_llegada) return { permitido: true };

  const momentoReserva = new Date(`${fecha}T${hora_llegada}:00Z`);
  const { abierto } = estadoHorario(rest, momentoReserva);
  if (!abierto)
    return { permitido: false, error: `No puedes reservar para esa hora — ${mensajeHorario(rest)}` };
  return { permitido: true };
}
```

Se quitó el parámetro `ahora` (ya no se usa) y se actualizó el único call site
(`routes/public.js`). `validarHorarioAhora()` sigue existiendo tal cual — la usan órdenes
(`public.js`, `pensionista.js`), que no tienen este campo opcional.

## Pendiente relacionado (no implementado hoy)

El usuario pidió además un tooltip/mensaje junto al campo "Hora de llegada" explicando para qué
sirve, para que el comensal entienda que es solo informativo. Queda como mejora de UI aparte —
anotado en `pilotos.md` Día 10.

## Verificación

`tests/horario-atencion.test.js` reescrito para el nuevo contrato (sin hora → siempre
`permitido: true`, sin importar el horario ni el día). 454/454 jest en total. Sin E2E nuevo — es
un cambio puramente de backend, ya cubierto por los tests unitarios de `validarHorarioReserva`.
