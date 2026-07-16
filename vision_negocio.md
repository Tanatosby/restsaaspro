# Visión del Negocio — Menú Pro

> Este documento es la brújula del proyecto. Debe leerse al inicio de cada sesión de desarrollo
> para garantizar que cada decisión técnica va en la dirección correcta.
> Última actualización: 2026-07-09

---

## 1. Target de Mercado

**Restaurantes de menú pequeños en Perú.**

- Menos de 10 mesas
- Atienden universitarios, trabajadores y comensales cotidianos
- Distribuidos por todo el país
- Hoy gestionan todo con cuaderno, lapicero y WhatsApp
- **No son restaurantes elegantes de reserva de mesa** — ese es otro mercado completamente distinto

El producto que resuelve: digitalizar el flujo completo de pedidos, cocina y pagos de estos restaurantes sin cambiar su forma de trabajar, solo optimizándola.

---

## 2. Productos que Venden

### 2.1 Menú del día
La oferta principal. Precio fijo, cambia cada día.

- Puede ser **fijo** (el restaurante sirve lo que hay, sin elección) o **elegible** (el cliente elige por sección). ✅ Ya implementado.
- Puede haber **varios menús activos el mismo día** (ej: Menú Universitario + Menú Ejecutivo). ✅ Ya implementado.
- Si un restaurante tiene variantes de precio distintas (universitario vs ejecutivo), **crea un menú separado por variante** — no un solo menú con múltiples precios.
- El precio varía por **modalidad de pedido** (ver sección 3): comer en local es más barato que para llevar (diferencia = costo de tapper + cubiertos descartables).

### 2.2 Platos a la carta
Oferta complementaria. Platos individuales con precio propio.

- Ceviches, causas, sopas, platos del menú vendidos individualmente, etc.
- Una reserva o una orden puede incluir menú del día + platos a la carta en el mismo pedido. ✅ Ya implementado.
- Para pedidos de para llevar o delivery, los platos a la carta pueden tener un costo adicional de descartable (configurable por el dueño — feature pendiente).

---

## 3. Modalidades de Pedido

Cada menú tiene habilitadas las modalidades que el dueño configure. No todos los restaurantes ofrecen delivery.

| Modalidad | Descripción | Precio |
|-----------|-------------|--------|
| **Comer en local** | El cliente come en el restaurante | Precio base del menú |
| **Para llevar** | El cliente recoge en el local | Precio base + costo de tapper (configurable) |
| **Delivery** | El restaurante lleva el pedido a domicilio | Precio base + tapper + tarifa de delivery (configurable) |

### Configuración de delivery por restaurante
El dueño elige una de tres opciones:
- **Sin delivery**: no se ofrece la opción
- **Delivery fijo**: tarifa única (ej: S/3 siempre)
- **Delivery por zona/distancia**: zonas con tarifas distintas (ej: cerca = S/4, lejos = S/7)

> **Nota roadmap:** La versión MVP implementa "fijo" o "sin delivery". La versión por distancia requiere geolocalización con mapa — se implementa en fase posterior.

---

## 4. Flujo de Reserva (Pre-orden Anticipada)

Una **reserva** en este sistema **no es reservar una mesa** — es un **pedido anticipado de comida**. El cliente elige qué va a comer, a qué hora llega, y lo confirma con anticipación. La reserva ya contiene todos los ítems del pedido.

### 4.1 Flujo completo dine-in

```
[Cliente]
1. Abre menu.html (QR del restaurante)
2. Elige menú/platos + modalidad (en local) + hora de llegada (OBLIGATORIO)
3. Elige método de pago:
   - Paga ahora (Yape/Plin/Efectivo-comprobante) → reserva confirmada automáticamente
   - Paga al llegar → reserva queda pendiente de confirmación

[Sistema]
4. Genera código de reserva aleatorio (ej: "r7Xk2mQ") — no secuencial
5. Muestra pantalla: "GUARDA TU CÓDIGO: r7Xk2mQ" con opción de screenshot

[Dueño/Owner — owner.html]
6. Ve la reserva entrante, la confirma (si es "pagar al llegar")
7. Configura: "preparar X minutos antes de la hora de llegada"

[Sistema — automático]
8. X minutos antes de la hora de llegada → reserva pasa automáticamente a estado "en_cocina"
   → aparece en el panel de cocina

[Cocina]
9. Prepara el pedido

[Cuando el pedido está listo]
10. Cocinero marca "plato listo" en el panel → mozo ve notificación (a validar en producción)

[Mozo — cuando llega el cliente]
11. Cliente llega, dice su código (ej: "soy r7Xk2mQ")
    - Si es dine-in: mozo asigna mesa, marca "cliente_llegó" en el sistema
      → la reserva queda vinculada a esa mesa (auto-merge)
      → cualquier orden adicional del cliente en esa mesa se suma a la misma cuenta
    - Si es para llevar: mozo busca el pedido por código, lo entrega, marca "entregado"

[Pago]
12. Cliente paga (ver sección 6)
13. Reserva pasa a "completada" → va a historial
```

### 4.2 Flujo para llevar

Igual que dine-in hasta el paso 10. Cuando el pedido está listo:
- Sistema notifica al cliente (MVP: el cliente revisa el estado con su código en menu.html; futuro: WhatsApp/SMS)
- Cliente llega, muestra código, recoge el pedido
- Paga (si no pagó por adelantado)
- Reserva → "completada"

### 4.3 Flujo delivery

Igual hasta que el pedido está listo. Luego:
- El restaurante lo lleva a domicilio (sin integración con terceros — el dueño coordina con su propio repartidor)
- Mozo/dueño marca "en camino" → "entregado"
- Pago normalmente es anticipado (recomendado para delivery)

---

## 5. Flujo de Orden Walk-in (Sin Reserva)

```
[Cliente]
1. Llega al restaurante, se sienta
2. Escanea QR de la mesa → menu.html (identificado como "Mesa X")
3. Elige menú/platos (sin hora de llegada, es inmediato)
4. Puede dejar su nombre (opcional)
5. Confirma el pedido → pago al final o pago por app

[Sistema]
6. Crea orden asociada a la mesa

[Cocina]
7. Ve la orden en el panel (junto con las reservas activas)
8. Prepara, marca "listo"

[Mozo]
9. Ve "Mesa X — plato listo" en su pantalla
10. Lleva el plato a la mesa correcta

[Pago]
11. Cliente paga (ver sección 6)
12. Mozo cierra la mesa → orden → historial
```

---

## 6. Flujo de Cocina (Vista Unificada)

El panel de cocina muestra **reservas y órdenes juntas** en una sola lista ordenada por urgencia/hora.

- **Reservas**: ordenadas por hora de llegada programada
- **Órdenes walk-in**: ordenadas por hora de creación
- Diferenciadas visualmente por color (reservas vs órdenes)
- El mozo también tiene acceso a esta vista unificada para saber qué plato va a qué mesa

**Principio:** el mozo no necesita adivinar — la pantalla le dice exactamente: "Mesa 3 — Menú lomo saltado — Reserva r7Xk2mQ".

> **A validar en producción:** si el flujo de notificación "plato listo" lo dispara el cocinero (presiona botón) o el mozo (escucha la campana y actualiza él mismo). Se implementará el botón del cocinero primero y se evalúa con uso real.

---

## 7. Flujo de Pago

### Reservas pagadas por adelantado
- Pago al momento de reservar: **Yape/Plin + foto de comprobante obligatoria** (es la única evidencia de una transferencia digital — sin foto no se puede verificar, así que el sistema no acepta el pago sin ella), o **Efectivo** marcado como "pagará al recoger" (no requiere foto — se cobra en persona).
- **No existe un "pagar más tarde"** — el cliente siempre sale del flujo con un método definido. Efectivo ya cubre el caso de pago diferido de forma legítima; un tercer estado "sin definir" solo generaba pedidos/reservas sin ningún rastro de pago y sin forma de retomarlos.
- **Verificación humana antes de completar:** si el método fue Yape/Plin, el owner debe revisar el comprobante y tocar "✓ Confirmar pago" (`PATCH /:id/confirmar-pago`) antes de poder marcar la orden/reserva como pagada/completada — el sistema bloquea ese paso si no se confirmó primero. Efectivo no pasa por este paso (se cobra y completa en el mismo momento).
- Al llegar: solo verificación, no hay cobro adicional (salvo órdenes extras en mesa).

### Reservas "pagar al llegar"
- Riesgo de no-show → el cliente puede **cancelar hasta 30 minutos antes** de su hora de llegada
- Pasados los 30 minutos: el dueño prepara igual; si el cliente no llega es su responsabilidad
- El dueño puede marcar "no se presentó" → la reserva va a historial como cancelada (no distorsiona reportes)

### Cuenta unificada por mesa (auto-merge)
Cuando el mozo marca "cliente_llegó" y asigna mesa X:
- La reserva queda vinculada a mesa X
- Cualquier orden adicional que el cliente haga desde el QR de mesa X se suma automáticamente
- Al cobrar: el mozo cierra "mesa X" → el sistema muestra el total de la reserva + órdenes adicionales juntos
- Si el grupo quiere pagar por separado: el mozo divide manualmente

### Métodos de pago disponibles
- Yape (deep link a app)
- Plin (deep link a app)
- Efectivo
- *(Tarjeta/Culqi: fase futura)*

---

## 8. Cancelaciones y Créditos

### Cancelación de reserva prepagada
El dueño define su política (configurable por restaurante):
- **Opción A — Devolución**: el dueño devuelve el dinero manualmente por Yape/Plin
- **Opción B — Crédito**: se genera un código de descuento/cupón que el cliente usa en su próxima reserva

### Código de reserva
- Alfanumérico aleatorio, no secuencial (ej: `r7Xk2mQ`) — evita que alguien enumere reservas ajenas
- El cliente lo guarda en screenshot o lo anota
- Sirve para:
  - Identificarse al llegar al restaurante
  - Cambiar hora de llegada (hasta 1 min antes)
  - Cancelar (hasta 30 min antes)
  - Verificar el estado en tiempo real desde menu.html
  - Reclamar créditos/cupones (si aplica)

---

## 9. Sistema de Clientes (Híbrido)

**Principio:** el cliente que tiene hambre NO se quiere loguear. La velocidad de pedido es sagrada.

| Tipo | Flujo | Beneficios |
|------|-------|------------|
| **Anónimo** | Nombre + teléfono + código de reserva | Rápido, sin fricción, sin contraseña |
| **Con cuenta** | Email/teléfono + contraseña | Historial de pedidos, cupones, descuentos |

- El login es **siempre opcional** — jamás se fuerza
- El teléfono es el puente: si un cliente anónimo luego se registra con el mismo teléfono, sus reservas previas pueden vincularse
- Los créditos/cupones por cancelación pueden usarse tanto anónimo (con código) como logueado

> **Nota roadmap:** El sistema de cuentas de cliente es feature futura. MVP opera en modo 100% anónimo.

---

## 10. Roles y Responsabilidades

### Owner / Dueño
- Configura el restaurante: menús, precios, modalidades, métodos de pago, delivery, tiempo de preparación
- Confirma reservas (cuando son "pagar al llegar")
- Ve reportes, historial, ganancias
- Gestiona usuarios (cocinero, mozo)
- Puede hacer todo lo que hacen cocinero y mozo

### Cocinero / Cocinera
- Ve el panel de cocina (reservas + órdenes unificadas por urgencia)
- Actualiza el estado de cada pedido: en preparación → listo
- No ve reportes ni configuración

### Mozo
- Ve el panel de mesas y pedidos activos (celular/tablet — interfaz móvil grande y limpia)
- Recibe a los clientes con reserva (identifica por código, marca "cliente_llegó", asigna mesa)
- Lleva los platos a la mesa correcta (la pantalla le indica exactamente qué plato va a dónde)
- Cobra (cierra la mesa en el sistema)
- Puede crear órdenes walk-in desde su vista

---

## 11. Principios de Diseño

1. **Mobile-first — REQUISITO NO NEGOCIABLE**: el sistema vive en celulares de gama media. No hay tablets. No hay laptops en el punto de venta. Owner, mozo, cocinero y cliente usan celular. Esto no es una preferencia de diseño — es la única realidad de hardware del negocio.
   - Touch targets ≥ 44px
   - Font-size ≥ 14px (16px en inputs para no activar zoom en iOS)
   - Sin overflow horizontal (mínimo 360px de ancho)
   - Sin hover-only interactions
   - El sistema debe ser instalable como PWA (sin Play Store ni App Store)
2. **Velocidad sobre funcionalidad**: el cliente nunca debe sentir que el sistema lo frena para pedir comida.
3. **Sin romper lo que funciona**: los cambios son milimétricos. Si algo ya está bien, no se toca.
4. **Feedback en producción antes de over-engineer**: flujos como "cocinero presiona listo vs mozo actualiza" se validan con uso real.
5. **Anónimo por defecto, cuenta como plus**: nunca forzar login al cliente.
6. **Módulos sobre monolito**: la lógica JS vive en archivos de módulo separados (`public/js/modules/`). `owner.html` es un orquestador delgado. Cada feature nueva nace como módulo propio.
7. **CSS custom ahora, Tailwind en producción**: todo el proyecto usa CSS custom extraído a `public/css/owner.css`. La migración a Tailwind es progresiva — módulo por módulo — durante las primeras semanas en producción. Los features nuevos del cliente (menu.html y nuevas páginas) pueden adoptar Tailwind antes.
8. **Zonas visuales por estado**: las vistas de pedidos activos (órdenes + reservas) se organizan en zonas/columnas por fase (Pendientes → En Cocina → Listos → Cliente llegó → Cobrar). En móvil: tabs con badge de cantidad. Elimina la necesidad de leer estado por estado en una lista — el personal ve de un vistazo qué hay en cada etapa.

---

## 12. Lo que Ya Está Implementado ✅

- Auth + roles (owner, cocinero, mozo, admin) con permisos granulares
- Menú del día: secciones, platos, fijo vs elegible, múltiples menús por día
- Toggle visible/oculto por menú, platos agotados
- **Flujo de armado v2 del menú del día** (2026-07-02): acordeón vertical de secciones, picker multi-selección, herencia de secciones del último menú, «Crear y agregar platos →» — el menú diario se arma en ~15 taps (ver `flujo-menuv2.md`)
- **Stock por plato del menú** (2026-07-02): el owner fija "hoy tengo 25 arroz con pollo" por plato y POR MENÚ (si el plato está en 2 menús, reparte porciones entre ambos — decisión del negocio). Cada pedido descuenta al crearse; cancelar devuelve; en 0 el plato desaparece del QR solo. Opcional: sin stock fijado, todo funciona como antes
- Platos a la carta: categorías, precios, toggle activo/inactivo, fotos
- Órdenes: creación, flujo completo de estatus, historial, descarga Excel
- Reservas: creación, confirmación, hora de llegada, flujo completo (Confirmar → Cocina → Listo → Cliente llegó → Completar), asignación de mesa, historial, descarga Excel
- Plano de mesas visual con estado en tiempo real
- Panel de cocina con polling y alerta de sonido — órdenes + reservas en preparación unificadas (ISS-008 resuelto 2026-05-23)
- Cola del día unificada: órdenes + reservas activas ordenadas por urgencia (`pedidos.js`)
- **Pagos Fase 1 (endurecido 2026-07-09):** Yape/Plin/Efectivo, foto de comprobante **obligatoria** en pagos digitales, confirmación manual del owner **bloqueante** (no se puede completar una orden/reserva pagada por Yape/Plin sin que el owner confirme el comprobante primero) — ver `flujo-pago.md`
- Reportes: curva de clientes, análisis de pedidos, ganancias, descarga Excel
- Configuración visual: foto de portada, colores, QR del menú
- Panel admin: gestión de restaurantes, usuarios y estatus
- Menú QR público (`menu.html`) con carta + menú del día, fotos, hero banner dinámico
- Flags semánticos en estatus (`es_inicial`, `es_en_cocina`, `es_listo`, `es_entregado`, `es_pagado`, `es_cancelado` en órdenes; `es_inicial`, `es_cancelado`, `es_confirmada`, `es_en_cocina`, `es_listo`, `es_cliente_llego`, `es_full` en reservas) — REFACTOR-001 completo 2026-05-21
- **Kanban "Cola del día"** (Gap 2): 4 tabs (Pendientes / En Cocina / Listos / Por cobrar), badges con conteo, botones de acción rápida por zona, nuevo flag `es_entregado` para el paso Listos→Por cobrar en órdenes. Botón "🍽 Entregado" en reservas (semánticamente: cliente llegó + sentó + plato entregado). — Gap 2 completo 2026-05-23
- **PWA instalable** (manifest.json + service worker) — ARCH-002 completo 2026-05-22
- **Mobile CSS audit completo** (touch targets 44px, font-size 14-16px, sin overflow, type en inputs) — ARCH-003 completo 2026-05-23
- **Modularización completa** owner.html → ES Modules (`utils.js`, `config.js`, `usuarios.js`, `mesas.js`, `cocina.js`, `reservas.js`, `ordenes.js`, `reportes.js`, `pedidos.js`) — ARCH-001 completo 2026-05-23

---

## 13. Gaps Identificados (Pendientes de Implementar)

En orden de impacto:

> **Contexto de lanzamiento (2026-05):** Los primeros 8 restaurantes objetivo no implementan delivery — solo para llevar. Por tanto los gaps relacionados con delivery (9, 11) son de baja prioridad para el MVP de lanzamiento. Los gaps 8 y 10 son los más necesarios para cerrar el flujo completo con estos clientes.

| # | Gap | Impacto | Complejidad | Estado |
|---|-----|---------|-------------|--------|
| — | ~~ARCH-001: Modularizar owner.html en ES Modules~~ | ~~Alto~~ | ~~Media~~ | ✅ Completado 2026-05-23 |
| — | ~~ARCH-002: PWA instalable en celular~~ | ~~Alto~~ | ~~Baja~~ | ✅ Completado 2026-05-22 |
| — | ~~ARCH-003: Mobile CSS audit en owner.html~~ | ~~Alto~~ | ~~Baja~~ | ✅ Completado 2026-05-23 |
| — | ~~ARCH-004: Columna `modalidad` en reservas~~ | ~~Alto~~ | ~~Baja~~ | ✅ Completado 2026-05-21 |
| 1 | ~~Flujo completo UI reservas: `es_en_cocina`, `es_listo`, `es_cliente_llego`~~ | ~~Alto~~ | ~~Baja~~ | ✅ Completado 2026-05-23 (ISS-006) |
| 2 | ~~Vista unificada "Cola del día" con zonas por estado (Kanban): órdenes + reservas en tablero Pendientes→Cocina→Listo→Cobrar~~ | ~~Alto~~ | ~~Media~~ | ✅ Completado 2026-05-23 — 4 tabs Kanban (Pendientes/En Cocina/Listos/Por cobrar), badges por zona, botones de acción rápida, flag `es_entregado` en órdenes, polling 15s |
| 3 | ~~Auto-preparación: reserva pasa a cocina X min antes (configurable)~~ | ~~Alto~~ | ~~Media~~ | ✅ Completado 2026-05-25 — Job en servidor 60s + Web Push al celular aunque app cerrada |
| 4 | ~~Modalidad de pedido (en local / para llevar / delivery)~~ | ~~Alto~~ | ~~Media~~ | ✅ Completado 2026-05-25 — `modalidad` en `ordenes` y `reservas`; validación diferenciada; flujo de estados abreviado para para_llevar/delivery; badges visuales; selectores en menu.html; config en owner. 22 tests. |
| 5 | ~~Precio por modalidad (tapper, delivery fee)~~ | ~~Alto~~ | ~~Media~~ | ✅ Completado 2026-05-25 — `costo_tapper`/`tarifa_delivery` en `restaurantes`; `cargo_modalidad` en `ordenes` y `reservas`; total incluye cargo; desglose visual en menu.html; config en owner. 21 tests. |
| 6 | ~~Código de reserva aleatorio + página de estado para el cliente~~ | ~~Alto~~ | ~~Media~~ | ✅ Completado 2026-05-21 |
| 7 | ~~Refactor estatus dinámicos por flags (REFACTOR-001)~~ | ~~Alto~~ | ~~Alta~~ | ✅ Completado 2026-05-21 |
| 8 | ~~Auto-merge cuenta por mesa al marcar `cliente llegó`~~ | ~~**Alto MVP**~~ | ~~Media~~ | ✅ Completado 2026-05-25 — Al marcar `es_cliente_llego`, copia ítems carta+menú de la reserva a la orden activa de la misma mesa. Solo actúa si `auto_merge_activo=1` y la reserva tiene mesa. Configurable desde owner. 17 tests. |
| 9 | Configuración de delivery (fijo / gratis / por zona) | Bajo MVP | Media | Pendiente — diferido: primeros 8 clientes no usan delivery |
| 10 | ~~Descartable opcional para à la carta en pedidos de llevar/delivery~~ | ~~**Alto MVP**~~ | ~~Baja~~ | ✅ Cerrado por diseño 2026-05-25 — El `costo_tapper` ya cubre envase + menaje en pedidos para llevar. El caso edge (comer en local y llevarse algo) se resuelve agregando "Cubiertos descartables" como ítem de carta con el precio que quiera el owner. No requiere feature dedicada. |
| 11 | Delivery por distancia con geolocalización | Bajo | Alta | Fase 2 |
| 12 | Sistema de cuentas de cliente (híbrido anónimo + login) | Bajo | Alta | Fase 2 |
| 13 | Cupones y créditos por cancelación | Bajo | Media | Fase 2 |
| 14 | Notificaciones WhatsApp/SMS | Bajo | Alta | Fase 2 |
| 15 | Métrica de visitas al menú por restaurante (dashboard admin) | Bajo (hoy) / Alto (a escala) | Media | Fase 2 — ver sección 15, "cuando inicie masivo" |
| 16 | ~~Deep link real de Yape (requiere pasarela de pago afiliada)~~ | ~~Bajo~~ | ~~Alta~~ | ❌ Cerrado por diseño 2026-07-13 — inviable, complejidad no justificada; "Copiar número" es la solución definitiva |
| 17 | ~~Pago obligatorio antes de crear la orden/reserva~~ | ~~Alto~~ | ~~Media~~ | ✅ Completado 2026-07-13 — ver detalle abajo |
| 18 | Horario de atención configurable y estricto | Medio | Baja | Pendiente — ver detalle abajo |
| 19 | Cola del día: cancelar pedido + mostrar todos los datos (modalidad) | **Alto** | Baja | Pendiente — ver detalle abajo |
| 20 | Módulo Pensionistas (saldo prepagado + login propio) | Medio | Alta | Anotado 2026-07-15 — ver detalle abajo y `pensionistas.md` |

> **Nota flujo Caso B reservas (sin pago anticipado):** el cliente llega sin haber pagado → mozo marca `es_cliente_llego` y asigna mesa → envía a cocina manualmente → flujo normal → cobra al final → `es_full`. La UI mostrará badge "⚠️ Sin pago" en la tarjeta para que el mozo lo identifique.

### Detalle de gaps pendientes

**Gap 5 — Precio por modalidad (tapper + delivery fee)**
Al crear una orden/reserva, calcular el cargo extra según modalidad: `para_llevar` suma costo de tapper configurable (ej: S/0.50); `delivery` suma tapper + tarifa de delivery. El precio final se muestra en tiempo real en `menu.html` al cambiar el radio button. Columnas `costo_tapper` y `tarifa_delivery` en `restaurantes`. El cargo queda registrado en la orden/reserva para reportes.

**Gap 8 — Auto-merge cuenta por mesa al marcar `cliente llegó`**
Cuando el mozo marca `es_cliente_llego` en una reserva que tiene mesa asignada, el sistema busca automáticamente si hay una orden activa en esa misma mesa y fusiona los ítems en una sola cuenta. Evita que el mozo tenga que hacer el merge manual en hora pico. Si no hay orden en la mesa, no hace nada. Configurable: el owner puede desactivar el auto-merge si prefiere manejar cuentas separadas.

**Gap 9 — Configuración de delivery (fijo / gratis / por zona)** *(diferido — primeros 8 clientes no usan delivery)*
El dueño elige el tipo de tarifa de delivery desde el panel Configuración: sin delivery, delivery gratis, o tarifa fija única. La variante por zona/distancia pertenece a Gap 11. Solo relevante cuando algún cliente active `delivery_activo`.

**Gap 10 — Descartable opcional para à la carta en pedidos de llevar/delivery**
Hoy cuando se pide para llevar, el sistema cobra el tapper (Gap 5) pero no pregunta si el cliente quiere cubiertos descartables (tenedor, cuchara, servilleta). Gap 10 agrega un checkbox opcional en `menu.html` para pedidos `para_llevar`/`delivery`: "¿Incluir cubiertos descartables? (+S/X)". El restaurante configura el costo. Aparece solo si el restaurante lo activa. Impacta directamente al flujo de los primeros 8 clientes que sí hacen para llevar.

**Gap 11 — Delivery por distancia con geolocalización** *(Fase 2)*
El cliente comparte su ubicación GPS o ingresa su dirección. El sistema calcula la zona y aplica la tarifa correspondiente. Requiere integrar Google Maps API, definir polígonos de zona por restaurante, y lógica de cálculo de distancia. No es MVP — los restaurantes de menú pequeño rara vez hacen delivery a zonas múltiples.

**Gap 12 — Sistema de cuentas de cliente** *(Fase 2)*
El cliente puede crear una cuenta (o usar su teléfono como identificador) para ver su historial de pedidos, guardar su dirección de delivery y acumular puntos. Requiere auth del lado del cliente, separado al auth de owner/mozo/cocinero. Cambia la arquitectura de `menu.html` significativamente.

**Gap 13 — Cupones y créditos por cancelación** *(Fase 2)*
Cuando una reserva se cancela, el sistema emite un cupón de descuento o crédito para la próxima visita. Requiere tabla de cupones, validación al momento del pedido, e ingreso del código en `menu.html`. Depende parcialmente de Gap 12 para control de uso por cliente.

**Gap 14 — Notificaciones WhatsApp/SMS** *(Fase 2)*
Mensajes automáticos al cliente: confirmación de reserva, pedido listo, delivery en camino. Requiere integrar Twilio o Meta WhatsApp Business API (con costo por mensaje). Web Push (Gap 3) ya cubre las notificaciones al owner/mozo/cocinero — este gap es para el cliente final.

**Gap 15 — Métrica de visitas al menú por restaurante** *(Fase 2 — "cuando inicie masivo")*
Ver sección 15 para el detalle del modelo de negocio. Resumen técnico: registrar cada carga de `GET /api/public/menu` (o de la carga inicial de `menu.html`) por restaurante y por día, y mostrar el conteo en un dashboard nuevo del panel admin (`routes/admin.js` + `public/admin/dashboard.html`). A definir antes de implementar: ¿se cuenta cada request (page views) o visitantes únicos por sesión/día (requeriría un identificador anónimo, ej. cookie o hash de IP+user-agent, con las implicancias de privacidad que eso trae); retención de los datos (¿cuánto tiempo se guardan?); si el owner del restaurante puede ver su propio número o es información exclusiva del admin de la plataforma.

**Gap 16 — Investigar deep link real de la app Yape**
`https://yape.com.pe/cobrar?phone=XXXX` (usado hasta el 2026-07-13, ver [ISS-017](issues/ISS-017-boton-abrir-yape-roto.md)) no era un endpoint real — abría una página inexistente y fue removido.

**Investigación 2026-07-13 (vía búsqueda web):** Yape sí tiene un deep link real y documentado: `https://www.yape.com.pe/app/checkout/approval_code`. Pero **no es un link estático armable desde el frontend con solo el número de teléfono** — es un link *dinámico*, generado del lado del servidor por una pasarela de pago afiliada (Mercado Pago, Culqi, Izipay, ProntoPaga — funcionalidades llamadas "Yape Código de Pago" / "Yape On File"), válido solo ~15 minutos por transacción, y requiere: (1) el restaurante afiliado como comercio a una de esas pasarelas, (2) una llamada server-side a su API para generar el `approval_code` por cada cobro, (3) el monto y datos de la transacción ya definidos antes de abrir el link. Es decir, no es "abrir Yape con el número precargado" como se asumió originalmente — es una integración completa de pasarela de pago, con costo por transacción y proceso de afiliación como comercio.

**Decisión del usuario (2026-07-13):** inviable para el negocio actual — la complejidad de afiliarse a una pasarela (comisión por transacción, onboarding, integración server-side) no se justifica frente al flujo "Copiar número" que ya funciona bien. **Gap cerrado por diseño, no se implementará** salvo que cambie el contexto del negocio (ej. escala grande, restaurantes que ya usan pasarela). El flujo actual (número + botón "Copiar número", igual que Plin) queda como solución definitiva, no temporal.

Fuentes: [Mercado Pago Developers — Yape Checkout API](https://www.mercadopago.com.pe/developers/es/docs/checkout-api-payments/integration-configuration/yape), [Culqi — Cargo único con Yape](https://docs.culqi.com/es/documentacion/pagos-online/cargo-unico/tokens-yape), [Izipay — Pago con Código Yape](https://developers.izipay.pe/products/pay-with-yape-code/), [ProntoPaga — Yape On File](https://docs.prontopaga.com/docs/yape-on-file-ocp)

**Gap 17 — Pago obligatorio antes de crear la orden/reserva** ✅ *Completado 2026-07-13*

**Problema real, confirmado en código:** `confirmarPedido()`/`confirmarReserva()` en `menu.html` llamaban primero a `POST /api/public/orders` (o `/reservations`) — el pedido **se creaba y ya entraba a la Cola del día como pendiente** — y solo después, si había métodos de pago configurados, se mostraba `showPagoStep()`. El pago nunca bloqueaba la creación: un cliente podía pedir y su orden/reserva viajaba a Cocina/Cola sin haber elegido siquiera un método de pago.

**Flujo implementado (3 pasos, definido junto con el usuario):**
```
[Carrito] → tap "Ir a pagar" (nombre obligatorio, ver Gap nombre en features.md)
     ↓
[Pantalla de pago] — elegir método (si no hay Yape/Plin activo, Efectivo
   queda como único/default, sigue mostrando la pantalla, no se salta)
   → si Yape/Plin: adjuntar foto del comprobante
   → tap "✓ Ya pagué" → SOLO valida (foto adjunta si aplica), no envía nada
     ↓
[Pantalla de repaso final] — resumen de ítems + total + nombre + método
   elegido (+ miniatura de la foto si aplica), botón "← Volver" para
   corregir el método sin perder nombre/ítems
   → tap "✓ Confirmar pedido/reserva" → AHORA SÍ se crea la orden/reserva
     y se le adjunta el pago, en la misma acción
     ↓
[¡Pedido enviado! 🎉]
```

Eliminar el pago en efectivo sigue siendo posible desde Configuración (toggle existente `efectivo_activo`) — no se tocó esa parte. Si el restaurante no tiene **ningún** método de pago activo, se mantiene el comportamiento anterior: se crea directo, sin pantalla de pago (no hay nada que gatear).

**Decisión de arquitectura (con el usuario):** se evaluaron 2 opciones — fusionar creación+pago en un solo endpoint atómico, vs. mantener las 2 llamadas actuales (`POST /orders`/`/reservations` + `PATCH /pago/...`) pero disparadas juntas al confirmar en el repaso. Se eligió la segunda: **no se tocó `routes/orders.js` ni `routes/reservations.js`**, todo el cambio vive en `menu.html` (frontend). Queda una ventana muy chica (~200ms entre ambas llamadas) donde, si la conexión se corta justo ahí, la orden quedaría creada sin pago adjunto — mucho menos probable que el bug original (que dejaba esa ventana abierta indefinidamente, ya que el cliente podía abandonar el navegador después de crear pero antes de pagar) pero no 100% atómico. Riesgo aceptado explícitamente por el usuario a cambio de no tocar la lógica central de creación de órdenes/reservas.

**Implementado — `public/menu.html`:**
- `pagoPendiente` (nuevo estado global): guarda `{ tipo, payload, nombre, items, total, metodo, foto }` mientras el cliente resuelve el pago. Reemplaza a `pagoOrdenId`/`pagoTipo`/`pagoCodigoReserva`, que ya no tienen sentido (no existe id hasta el final).
- `crearOrden(payload)` / `crearReserva(payload)` (nuevas, extraídas del POST que antes estaba inline).
- `confirmarPedido()`/`confirmarReserva()`: si hay algún método de pago activo, arman el payload y abren `showPagoStep()` sin crear nada; si no hay ninguno, crean directo (comportamiento sin cambios para ese caso).
- `showPagoStep()`: ya no recibe un id (no existe aún); muestra un resumen de ítems en vez de "Orden #X".
- `enviarPago()`: ahora **solo valida** (foto adjunta para yape/plin) y avanza a `showRepasoStep()` — ya no llama al backend.
- `showRepasoStep()` (nueva): pantalla `#repaso-screen` con resumen de ítems (renderizado limpio, sin los botones de quitar del carrito original — evita que tocarlos en el repaso desincronice lo que se va a enviar), nombre, método, miniatura de la foto si aplica.
- `volverAPago()` (nueva): regresa a `#pago-screen` para corregir el método sin perder nombre/ítems (`pagoPendiente.payload`/`.nombre`/`.items` se conservan).
- `confirmarEnvioFinal()` (nueva): el único punto del flujo donde el pedido pasa a existir de verdad — llama a `crearOrden`/`crearReserva`, obtiene el id real, y recién ahí hace el `PATCH` de pago con la foto.
- Nueva pantalla `#repaso-screen` en el HTML (mismo patrón `.confirm-screen` + `overflow-y:auto` que `#pago-screen`/`#estado-screen`).
- Etiqueta del botón de confirmar carrito pasa a "Ir a pagar →" cuando el restaurante tiene algún método de pago activo (se calcula una vez al cargar `pagoInfo`).

**Gap 18 — Horario de atención configurable y estricto** *(anotado 2026-07-13, implementado y cerrado 2026-07-14)*

Antes no existía ningún control de horario de atención — un cliente podía pedir/reservar a cualquier hora. Ahora el owner puede fijar un rango horario (ej. 12:00–15:00) + los días de la semana en que atiende; fuera de eso, `routes/public.js` bloquea con 400 tanto `POST /orders` como `POST /reservations` (las reservas además validan que la `hora_llegada` futura, si se especifica, caiga dentro del horario). `menu.html` muestra un banner "Cerrado" y deshabilita el botón de confirmar sin bloquear la navegación de la carta/menú. Configuración en `owner.html` → Configuración → "🕐 Horario de atención". No confundir con el "análisis de hora pico" de reportería (`GET /api/reportes/hora-pico`), que sigue siendo una métrica histórica, no una restricción operativa. Límite conocido: no soporta horarios que crucen la medianoche (asume `hora_apertura < hora_cierre` en el mismo día); horarios distintos por día de la semana (no solo días on/off) quedan como posible fase futura. Ver detalle técnico en `status.md` (sesión 2026-07-14).

**Gap 19 — Cola del día: cancelar pedido + mostrar todos los datos** *(anotado 2026-07-13, cerrado 2026-07-14)*

La modalidad (`badgeModalidad()`) ya se mostraba en las tarjetas de la Cola. Faltaba cancelar directo desde ahí sin entrar a los paneles separados de Órdenes/Reservas — agregado botón "✗ Cancelar" en `renderKanbanOrden()`/`renderKanbanReserva()`, reutilizando `accionRapidaOrden()`/`accionRapidaReserva()` (mismo endpoint `PATCH /:id/estatus` con flag `es_cancelado` que ya usan Órdenes/Reservas — la devolución de stock ya la maneja el backend, sin cambios). Mismo criterio de visibilidad que esos paneles: en órdenes siempre disponible; en reservas se oculta una vez que el cliente ya llegó o la reserva ya se completó.

**Gap 20 — Módulo Pensionistas (saldo prepagado + login propio)** *(anotado 2026-07-15, sin implementar)*

Un pensionista es un comensal recurrente al que el restaurante le administra un **saldo prepagado
en dinero** (no menús contados) — paga por adelantado (semana/mes, a criterio del restaurante) y va
consumiendo ese saldo pedido a pedido, sin pasar por ningún flujo de pago (Yape/Plin/Efectivo).

**Piezas centrales del diseño (análisis completo en `pensionistas.md`):**
- El owner da de alta al pensionista desde un módulo nuevo ("Pensionistas", separado del panel
  "Usuarios") indicando nombre, apellido, teléfono, credenciales de login y saldo inicial.
- El pensionista tiene **login propio** — reutiliza el sistema de auth existente (JWT + rol nuevo
  `pensionista` en la tabla `roles`) en vez de construir un sistema paralelo. Entra a una pantalla
  mobile-first propia (`pensionista.html`), pide del menú del día/carta del restaurante, y el
  sistema descuenta el total de su saldo automáticamente — sin pantalla de pago.
- Sus pedidos viven en una **tabla y flujo completamente separados** de `ordenes` y `reservas`
  (`pedidos_pensionista`) — nunca se confunden con el pedido de una mesa walk-in. Pero sí aparecen
  **en la Cola del día y en Cocina**, unificados junto con órdenes y reservas, con un tag visual
  distintivo ("🪪 Pensionista") mostrando nombre y apellido completo — el personal necesita
  ubicarlos igual que a cualquier otro pedido activo.
- Reportería: las recargas de saldo (dinero real entrando) y el consumo (gasto del saldo ya
  cobrado) se reportan por separado de "Ganancias" de órdenes/reservas, para no contar el mismo
  dinero dos veces.

**Decisiones pendientes de validar con el usuario antes de implementar** (detalle en
`pensionistas.md` sección 11): si el saldo insuficiente bloquea el pedido o permite negativo
("fiado"); si el pensionista puede pedir cualquier plato del menú o el owner puede restringirlo;
si la recarga de saldo la puede hacer solo el owner o también un mozo con permiso.

---

## 14. Decisiones Pendientes de Validar en Producción

- ¿El cocinero presiona "plato listo" o el mozo actualiza al escuchar la campana? → implementar botón del cocinero primero, evaluar con uso real
- ¿Cuánto tiempo antes prepara cada restaurante sus reservas? → configurable por owner (default: 20 min)
- ¿Los clientes usan más "pagar ahora" o "pagar al llegar"? → observar con datos reales

---

## 15. Modelo de Ingreso Indirecto — Publicidad (idea, sin implementar)

> Anotado 2026-07-09, a partir de una idea del usuario. Sin diseño ni implementación aún — queda documentado para retomarlo "cuando inicie masivo" (múltiples restaurantes activos y con tráfico real).

**La idea:** Menú Pro no le cobra directamente al comensal — el ingreso hoy es 100% B2B (lo que paga cada restaurante por usar el sistema). Pero si el sistema junta muchos restaurantes activos, cada uno con su propio flujo de comensales viendo su menú QR, la suma de ese tráfico agregado tiene valor: es una audiencia local, geolocalizada por barrio/ciudad, ya segmentada por "gente que está por comer en este momento". Ese tráfico se podría vender como espacio publicitario dentro de las páginas de menú (`menu.html`) — un ingreso indirecto que no depende de subirle la cuota al restaurante.

**Ejemplo del propio usuario:** si cada restaurante recibe ~100 visitas, 10 restaurantes ya representan ~1000 personas — una audiencia agregada interesante para anunciantes locales (proveedores, otros negocios del barrio, marcas de bebidas/insumos), aunque cada restaurante individualmente sea un negocio pequeño.

**Por qué "indirecto":** no es el modelo de negocio principal (que sigue siendo la suscripción/cuota del restaurante) — es una fuente de ingreso adicional que solo se vuelve viable con escala (muchos restaurantes, tráfico agregado suficiente para interesar a un anunciante). No tiene sentido activarlo con 1-8 restaurantes piloto.

**Prerequisito de este feature (Gap 15, sección 13):** antes de poder vender publicidad hace falta poder *medir* el tráfico — de ahí que el primer paso concreto sea la métrica de visitas al menú en el dashboard admin, no la publicidad en sí. Sin ese dato, no hay forma de saber si la idea es viable ni qué precio cobrar.

**Preguntas a resolver antes de diseñar la implementación (deliberadamente sin responder todavía):**
- ¿Qué se cuenta? Page views (cada carga) vs. visitantes únicos (requiere un identificador anónimo por sesión/día).
- ¿Cómo se ve en el dashboard admin? ¿Por restaurante, por ciudad, agregado total?
- ¿El owner del restaurante ve su propio número, o es solo visibilidad del admin de la plataforma (para no filtrar información competitiva entre restaurantes)?
- ¿Cuándo se activa la conversación de venta de publicidad? (ej. umbral mínimo de restaurantes activos o de tráfico agregado mensual)
- Implicancias de privacidad si se decide trackear visitantes únicos (el sistema hoy es 100% anónimo del lado del cliente — sección 9).
