# Módulo Pensionistas — Análisis Arquitectónico

> Documento de análisis, sin implementar aún. Define el modelo de datos, los flujos y las
> decisiones de arquitectura para el nuevo módulo "Pensionistas". Complementa a
> `vision_negocio.md` (sección de gaps) y `features.md` (pendientes). Fecha: 2026-07-15.

---

## 1. Qué es un pensionista (concepto de negocio)

Un **pensionista** es un comensal recurrente al que el restaurante le administra un **saldo
prepagado en dinero** (no en menús contados). El pensionista paga por adelantado (semana, quincena,
mes — la periodicidad la decide el propio restaurante fuera del sistema, no es un plan rígido) y el
owner le carga ese monto como saldo. Cada vez que el pensionista pide, el sistema **descuenta del
saldo el total del pedido**, sin pasar por ningún flujo de pago (Yape/Plin/Efectivo).

Diferencias clave frente al resto de comensales:

| | Comensal anónimo (`menu.html`) | Pensionista |
|---|---|---|
| Identidad | Ninguna (nombre + teléfono sueltos) | Cuenta propia con login |
| Pago | Por pedido, antes de crear la orden/reserva (Gap 17) | Ya pagado — descuenta de un saldo existente |
| Quién lo crea | Se auto-registra al pedir | El **owner** lo da de alta (como con `usuarios`) |
| Dónde pide | `menu.html`, sin login | Pantalla propia, **con login** |
| Aparece en | Órdenes o Reservas | **Espacio propio "Pensionistas"**, separado, pero con tag visible en Cola del día y Cocina |

---

## 2. Decisión de arquitectura: reutilizar el sistema de login existente

El pensionista necesita **loguearse** para pedir. El sistema ya tiene una infraestructura de auth
completa (JWT + cookie httpOnly + tabla `roles` + tabla `usuarios`, ver `routes/auth.js` y
`middleware/authenticate.js`). Construir un segundo sistema de auth en paralelo sería duplicar
lógica de sesión, rate-limiting de login, hashing de password, etc. sin necesidad.

**Propuesta:** agregar un rol nuevo `pensionista` a la tabla `roles` (`requiere_restaurante = 1`),
y que cada pensionista tenga una fila en `usuarios` como cualquier cocinero/mozo. Así:

- `POST /api/auth/login` funciona sin cambios — ya resuelve `role` desde `roles` y arma el JWT.
- `authenticate` (middleware) funciona sin cambios.
- `authorize('pensionista')` restringe cualquier endpoint nuevo a ese rol, igual que hoy se hace
  con `authorize('owner','mozo')`.
- `login.html` ya tiene un mapa `ROLE_REDIRECT[role]` (`public/login.html:373`) — se agrega
  `pensionista: '/pensionista.html'` y el redirect post-login funciona sin tocar el resto del flujo.

**Lo que NO se reutiliza:** el panel "Usuarios" (`routes/usuarios.js`, `usuarios.js` del owner). Ese
panel es para staff operativo (cocinero/mozo) y su UI (selector de rol, permisos granulares) no
aplica a un pensionista. `GET /api/usuarios` debe **excluir** `role = 'pensionista'`
(`WHERE r.nombre != 'pensionista'`) para no mezclarlos ahí. El pensionista se gestiona 100% desde
el módulo nuevo.

**Por qué no una tabla de auth 100% separada (paralela a `usuarios`):** se evaluó, pero duplicaría
`password_hash`, login endpoint, rate limiting y cookie handling — tres veces más superficie para
bugs de seguridad por un beneficio marginal. La tabla `pensionistas` (abajo) extiende `usuarios`
1-a-1 solo con los campos que le son propios (apellido, saldo, teléfono), igual que el patrón que
ya existe implícitamente entre `usuarios` y sus datos de rol.

---

## 3. Modelo de datos propuesto

```sql
-- ============================================================
-- PENSIONISTAS
-- Extiende 1-a-1 a un usuario con id_rol = 'pensionista'.
-- ============================================================
CREATE TABLE pensionistas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario     INTEGER NOT NULL UNIQUE,      -- FK usuarios(id), rol='pensionista'
  apellido       TEXT NOT NULL,
  telefono       TEXT,
  saldo          REAL NOT NULL DEFAULT 0,      -- saldo disponible en soles
  activo         INTEGER DEFAULT 1,            -- baja lógica, no se borra el historial
  id_restaurante INTEGER NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario)     REFERENCES usuarios(id),
  FOREIGN KEY (id_restaurante) REFERENCES restaurantes(id)
);

-- ============================================================
-- MOVIMIENTOS DE SALDO
-- Ledger completo — toda recarga y todo consumo queda registrado.
-- Es la fuente de verdad para reportería y para auditar reclamos
-- ("yo recargué S/50 y no aparece").
-- ============================================================
CREATE TABLE pensionista_movimientos (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pensionista         INTEGER NOT NULL,
  tipo                   TEXT NOT NULL CHECK (tipo IN ('recarga','consumo','ajuste','devolucion')),
  monto                  REAL NOT NULL,        -- + recarga/devolución/ajuste positivo, - consumo
  saldo_resultante        REAL NOT NULL,        -- saldo tras aplicar el movimiento (snapshot)
  id_pedido_pensionista  INTEGER,              -- NULL salvo tipo='consumo'/'devolucion'
  nota                   TEXT,                 -- ej: "Recarga semanal en efectivo"
  id_usuario_registro    INTEGER NOT NULL,     -- quién lo hizo (owner/mozo con permiso)
  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pensionista)  REFERENCES pensionistas(id),
  FOREIGN KEY (id_usuario_registro) REFERENCES usuarios(id)
);

-- ============================================================
-- PEDIDOS DE PENSIONISTA
-- Tercera entidad de pedido, deliberadamente separada de
-- `ordenes` y `reservas` — nunca se confunde con el pedido de
-- una mesa walk-in ni con una reserva anticipada.
-- ============================================================
CREATE TABLE pedidos_pensionista (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pensionista INTEGER NOT NULL,
  mesa           INTEGER,                      -- opcional, informativo (si come en local)
  modalidad      TEXT NOT NULL DEFAULT 'en_local',  -- en_local | para_llevar
  fecha          TEXT NOT NULL,
  total          REAL NOT NULL,                -- monto descontado del saldo
  id_restaurante INTEGER NOT NULL,
  id_estatus     INTEGER DEFAULT 1,            -- reutiliza estatus_orden (pendiente..completado)
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pensionista)  REFERENCES pensionistas(id),
  FOREIGN KEY (id_restaurante)  REFERENCES restaurantes(id),
  FOREIGN KEY (id_estatus)      REFERENCES estatus_orden(id)
);

-- Mismo patrón que orden_menu_items / orden_carta_items
CREATE TABLE pedido_pensionista_menu_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pedido      INTEGER NOT NULL,
  id_menu_dia    INTEGER NOT NULL,
  id_componente  INTEGER NOT NULL,
  cantidad       INTEGER DEFAULT 1,
  FOREIGN KEY (id_pedido)      REFERENCES pedidos_pensionista(id),
  FOREIGN KEY (id_menu_dia)    REFERENCES menus_dia(id),
  FOREIGN KEY (id_componente)  REFERENCES componentes_menu_dia(id)
);

CREATE TABLE pedido_pensionista_carta_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pedido       INTEGER NOT NULL,
  id_plato_carta  INTEGER NOT NULL,
  cantidad        INTEGER DEFAULT 1,
  precio_unitario REAL NOT NULL,
  FOREIGN KEY (id_pedido)       REFERENCES pedidos_pensionista(id),
  FOREIGN KEY (id_plato_carta)  REFERENCES platos_carta(id)
);
```

**Por qué tabla propia y no reusar `ordenes` con una columna `es_pensionista`:** se evaluó, pero
`ordenes` ya tiene semántica de "mesa walk-in" acoplada a `mesas.js`/plano de mesas/auto-merge
(Gap 8) y al flujo de cobro con `estado_pago`. Forzar el caso pensionista ahí obligaría a agregar
condicionales `if (es_pensionista)` en cobro, auto-merge y plano — exactamente el tipo de mezcla
que el usuario pidió evitar ("no puede confundirse con el pedido de una mesa"). Una tabla separada
mantiene `ordenes`/`reservas` intactas y el módulo pensionista aislado — el costo es duplicar el
patrón de items (menú+carta), que ya se duplica hoy entre `ordenes` y `reservas` de todas formas.

**Reutiliza `estatus_orden`** (pendiente → preparando → entregando → completado/cancelado) porque
el ciclo de vida en cocina es idéntico al de una orden walk-in — no hay razón para inventar un
cuarto catálogo de estados. No usa `estado_pago` (no aplica: el pedido nace ya cobrado, vía el
descuento de saldo en el mismo `INSERT`).

---

## 4. Flujo de vida del pensionista

```
[Owner — módulo "Pensionistas"]
1. Crea pensionista: nombre, apellido, teléfono, email, password, saldo inicial
   → INSERT usuarios (id_rol='pensionista') + INSERT pensionistas (saldo inicial)
   → INSERT pensionista_movimientos (tipo='recarga', monto=saldo inicial)

[Pensionista]
2. Recibe sus credenciales (el owner se las da en persona/WhatsApp — no hay auto-registro)
3. Entra a login.html → redirige a /pensionista.html (su panel propio, mobile-first)
4. Ve su saldo actual arriba: "Saldo: S/ 45.00"
5. Arma su pedido igual que en menu.html (menú del día + carta), SIN pantalla de pago
6. Confirma → si saldo ≥ total: se crea el pedido y se descuenta el saldo en la misma transacción
             → si saldo < total: bloqueado, mensaje "Saldo insuficiente, saldo actual S/ X"

[Sistema]
7. INSERT pedidos_pensionista + items
   INSERT pensionista_movimientos (tipo='consumo', monto=-total)
   UPDATE pensionistas SET saldo = saldo - total

[Cocina / Cola del día — owner, mozo, cocinero]
8. El pedido aparece en la Cola del día y en Cocina junto con órdenes y reservas,
   con tag visual "🪪 Pensionista" + nombre y apellido completo
9. Flujo de estados igual que una orden walk-in: pendiente → en cocina → listo → entregado
   (NO pasa por "Por cobrar" — ya está pagado)

[Owner — recarga periódica]
10. Cuando el pensionista paga su siguiente semana/mes (en persona, Yape, Plin — fuera del
    sistema, el owner lo recibe y solo lo registra):
    → módulo Pensionistas → "+ Recargar saldo" → INSERT pensionista_movimientos (tipo='recarga')
                                                 → UPDATE pensionistas SET saldo = saldo + monto
```

---

## 5. Integración con Cola del día y Cocina

Hoy `pedidos.js` (Cola del día) y `cocina.js` combinan **2 fuentes** (`ordenes` + `reservas`) en
una sola lista ordenada. Con este módulo pasan a combinar **3 fuentes**:

```
GET /api/pedidos/cola   (nuevo, o extensión del endpoint actual)
  → ordenes activas
  → reservas activas
  → pedidos_pensionista activos
  → unificadas y ordenadas por hora de creación / urgencia, cada una marcada con su `tipo`
```

**Tag visual:** las reservas y órdenes ya se diferencian por color (sección 6 de
`vision_negocio.md`). Se agrega un tercer color/badge para pensionistas — propuesta: **violeta**
+ icono **🪪 Pensionista**, con nombre y apellido completo siempre visibles en la card (a
diferencia de una orden walk-in donde el nombre es opcional). El total/saldo restante del
pensionista puede mostrarse también en la card de Cola del día (le sirve al owner para saber si
hay que avisarle que recargue pronto) — no hace falta mostrarlo en Cocina, donde solo importa qué
preparar y para quién.

**No se toca el plano de mesas ni el auto-merge (Gap 8)** — el campo `mesa` en
`pedidos_pensionista` es solo informativo para que el mozo sepa dónde llevar el plato; no participa
de la lógica de cuenta unificada por mesa (esa lógica es específica de `ordenes`+`reservas` y no
debe extenderse a pensionistas, que nunca "cobran" en mesa).

---

## 6. Módulo del owner: "Pensionistas"

Nuevo panel al mismo nivel que "Usuarios" (hub Ajustes, o un hub propio si el owner maneja muchos
pensionistas — a definir con uso real). Mismo patrón de UI que `usuarios.js` pero sin selector de
rol (implícito) y con estos campos y acciones:

| Acción | Detalle |
|---|---|
| **Listar** | Nombre, apellido, teléfono, saldo actual, estado (activo/inactivo) |
| **Crear** | Nombre, apellido, teléfono, email, password, saldo inicial |
| **Recargar saldo** | Monto + nota opcional ("Recarga semana del 14 al 18") → nuevo movimiento |
| **Ver historial** | Lista de `pensionista_movimientos` (recargas y consumos) — transparencia si el pensionista reclama |
| **Editar datos** | Nombre, apellido, teléfono (igual que editar usuario) |
| **Cambiar password** | Mismo patrón que `PATCH /api/usuarios/:id/password` |
| **Desactivar** | Baja lógica (`activo=0`) — no borra historial ni permite nuevos pedidos, pero conserva movimientos para reportería |

**Permisos:** por defecto solo el owner gestiona pensionistas (crear, recargar). Se puede sumar un
permiso granular nuevo (`pensionistas`) al sistema ya existente de `authorizePermiso()` si el
owner quiere delegarlo a un mozo de confianza — mismo patrón que los permisos actuales de
cocinero/mozo. No es necesario para el MVP.

---

## 7. Reglas de negocio y casos límite

**Saldo insuficiente al pedir — decisión pendiente de validar con el usuario:**
- Opción A (recomendada, default más seguro): **bloquear** el pedido si `total > saldo`, mostrando
  el saldo actual para que el pensionista sepa que debe recargar (hablar con el owner).
- Opción B: permitir saldo negativo (fiado), y que el owner lo cobre en la siguiente recarga.
- Sea cual sea, debe ser **una decisión explícita del negocio**, no un default silencioso — igual
  que se hizo con "no existe pagar más tarde" en el flujo de pago general.

**Cancelación de un pedido de pensionista:** debe devolver el saldo automáticamente —
`pensionista_movimientos` (tipo='devolucion', monto=+total) + `UPDATE pensionistas SET saldo = saldo + total`.
Mismo principio que la devolución de stock en órdenes/reservas canceladas (`utils/stock.js`).

**Pensionista se da de baja con saldo positivo:** el sistema no hace reembolsos automáticos (no
hay pasarela de pago integrada, ver Gap 16 — decisión ya tomada de no integrar Yape real). El
owner ve el saldo pendiente en el historial y lo devuelve en efectivo fuera del sistema; puede
registrar ese egreso como un movimiento `tipo='ajuste'` con nota, o simplemente desactivar al
pensionista una vez saldado en persona.

**Stock de platos:** un pedido de pensionista descuenta stock igual que cualquier orden (reutiliza
`utils/stock.js` sin cambios) — un plato agotado se agota para todos, sin importar el origen del
pedido.

**Horario de atención (Gap 18):** el pensionista debe respetar el mismo horario configurado del
restaurante — no tiene sentido que pueda pedir fuera de horario solo porque ya pagó.

---

## 8. Impacto en reportería (evitar doble conteo de ingresos)

Este es el punto más delicado. El dinero real entra al sistema en el momento de la **recarga**, no
en el momento del **consumo** — si "Ganancias" sigue sumando el total de cada pedido (como hace hoy
con órdenes/reservas), un pensionista que recarga S/100 y los gasta en 10 almuerzos de S/10
generaría un reporte que ve S/100 de ingreso en la recarga (si se registrara así) **más** S/100 en
consumo — dinero contado dos veces.

**Regla propuesta:** los pedidos de `pedidos_pensionista` **NO** se suman a "Ganancias" en
`reportes.js` (esa métrica sigue siendo solo `ordenes` + `reservas`, dinero que entra por pedido).
El ingreso por pensionistas se reporta aparte, con sus propias métricas:

- **Recargas del período** (dinero real que entró — esto sí es "ganancia" en el sentido contable)
- **Consumo del período** (para saber qué tan rápido gastan los pensionistas su saldo — operativo, no contable)
- **Saldo total pendiente en el sistema** (suma de `pensionistas.saldo` de todos los activos) — esto es
  técnicamente un **pasivo** del restaurante (plata ya cobrada que "debe" en comida), útil para que
  el owner sepa cuánta comida futura ya está comprometida.

Esto es coherente con cómo el negocio real ve la plata: cuando el pensionista paga la semana, ESA
es la venta. Lo que pasa después es solo el pensionista "retirando" lo que ya compró.

---

## 9. UI móvil del pensionista (`pensionista.html`)

Página nueva, mobile-first (mismas reglas que el resto del sistema — touch targets 44px, sin
overflow, PWA-instalable eventualmente). Versión simplificada de `menu.html`:

- Header con nombre del pensionista + **saldo destacado** (siempre visible, ej. sticky bar
  "Saldo: S/ 32.50")
- Menú del día + carta del restaurante (mismos datos que `menu.html`, filtrados por
  `req.user.restaurant_id` del JWT — no necesita `?restaurante=`/`?mesa=` por query string)
- Carrito → confirmar → **sin pantalla de pago** (a diferencia de `menu.html`, que sí la tiene por Gap 17)
- Si saldo insuficiente: mensaje claro, sin crear el pedido
- Historial propio: "Mis pedidos" con estado en tiempo real (pendiente/en cocina/listo), igual
  que la pantalla de estado por código que ya existe para reservas — pero aquí identificado por
  sesión, no por código público
- Sin selector de mesa obligatorio (opcional, solo si el restaurante lo pide)

---

## 10. Fases sugeridas

**MVP (fase 1):**
- Tablas: `pensionistas`, `pensionista_movimientos`, `pedidos_pensionista` + items
- Rol `pensionista` en `roles`, login reutilizado
- Módulo owner: crear, recargar, listar, ver historial, desactivar
- `pensionista.html`: pedir con descuento de saldo, ver saldo, ver historial propio
- Integración en Cola del día y Cocina con tag "🪪 Pensionista"
- Reglas: bloqueo por saldo insuficiente (a validar), devolución de saldo al cancelar
- Reportería separada (recargas, consumo, saldo pendiente total)

**Fase 2 (futuro, no bloqueante):**
- Recarga de saldo por el propio pensionista vía Yape/Plin + foto de comprobante (owner confirma,
  mismo patrón que el flujo de pago general) — hoy la recarga la registra el owner manualmente
- Notificación push cuando el saldo baja de un umbral configurable
- Integración con plano de mesas si el restaurante quiere ver pensionistas sentados en el mapa
- Permiso granular dedicado (`pensionistas`) para delegar la gestión a un mozo de confianza
- Reporte de "pensionistas en riesgo de vencer saldo" (consumo proyectado vs. saldo restante)

---

## 11. Preguntas abiertas para validar antes de implementar

1. **¿Saldo insuficiente bloquea el pedido, o se permite negativo (fiado)?** (sección 7 — recomendado: bloquear)
2. **¿El pensionista puede pedir cualquier menú/plato del restaurante, o el owner puede restringirlo a un menú fijo?** El diseño actual asume acceso total al menú del día + carta, igual que cualquier comensal — más simple y flexible. Si el negocio real necesita restringir, sería una tabla `pensionista_restricciones` en fase 2.
3. **¿Puede haber más de un pensionista con el mismo nombre?** (ej. dos "Juan Pérez" en el mismo restaurante) — el email de login ya los distingue, no debería ser un problema, pero vale confirmarlo.
4. **¿El mozo puede recargar saldo, o es exclusivo del owner?** (sección 6 — MVP: solo owner)
5. **¿El pensionista necesita ver el historial de sus propios movimientos de saldo (no solo pedidos), o alcanza con ver el saldo actual?**
