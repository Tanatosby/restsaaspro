# ISS-061 — Status "En preparación" no le dejaba claro al cliente que su pedido estaba listo/en curso

**Estado:** ✅ **Resuelto 2026-08-24.**
**Módulo:** `public/menu.html` (`STATUS_MAP`, pantalla "Ver estado de mi reserva").
**Prioridad:** 🟡 Media.
**Origen:** piloto #1, Día 9 (2026-08-22), reportado por el usuario el 2026-08-24.

---

## Diagnóstico

`STATUS_MAP.es_en_cocina.label` decía **"En preparación"** — genérico, no deja explícito que es
*su* pedido el que se está cocinando. El usuario lo pidió más directo: algo como "El restaurante
ya está cocinando tu pedido".

## Solución implementada

Cambio de copy de una línea en `menu.html`:

```js
es_en_cocina: { label: 'Ya estamos cocinando tu pedido', color: '#5b21b6', bg: '#ede9fe', icon: '👨‍🍳' },
```

El ícono 👨‍🍳 se sigue pintando aparte, arriba del texto (`renderEstadoReserva()`), así que el
label no lo repite.

## Verificación

454/454 jest sin regresiones (cambio puramente de texto, sin lógica).
