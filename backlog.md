# Backlog priorizado — Menú Pro

Plan de la etapa actual y **el porqué** de cada prioridad. El log técnico de lo ya hecho está en
`status.md`; el detalle por feature en `features.md`; los flujos y gaps de negocio en
`vision_negocio.md`.

> **Origen:** portado desde `conversacion_opues10082026.md` (2026-08-10), que está en `.gitignore`
> (`conversacion_*.md`) y por lo tanto **no viajaba entre las 2 laptops del usuario**. Este archivo sí
> está en git: es la copia viva del backlog. Actualizarlo al cerrar cada sesión.

**Última actualización:** 2026-08-10

---

## 🚨 Miércoles 2026-08-12 — "el primer reto": primera atención masiva (+60 menús en el día)

**Es la primera vez que un restaurante piloto atiende volumen real con el sistema.** Más de 60 menús
vendidos en un día, concentrados casi todos en el almuerzo. Todo lo que hoy funciona con 2-3 pedidos
simultáneos se prueba de verdad ese día.

### Por qué el deploy dejó de ser rutina y es lo más urgente

**`ISS-026` es literalmente el bug de este escenario y está sin desplegar.** Se arregló el 2026-08-10
(commit `181ddf3`) y describe exactamente lo que pasa con carga: pedidos que no avanzan de etapa, que
vuelven a su zona anterior, y el error falso *"No se puede cambiar una orden pagado"* por doble tap.
Si el miércoles atienden 60+ menús con la versión que hoy corre en producción, chocan de frente con
él **en el peor día posible**.

`ISS-027` (sesión de 30 días) es el segundo: nadie quiere reloguearse en medio de un servicio lleno.

### Prioridades del martes 2026-08-11, en orden

1. **🔴 DEPLOY, primero que nada** — `181ddf3` (`ISS-026` + `ISS-027`) y `6d4576e` (`ISS-028`). No
   dejarlo para la tarde: hay que desplegar **con tiempo de sobra para probar en producción** y con
   margen de reacción si algo sale mal. Un deploy la noche del martes es la peor opción.
2. **🔴 Prueba de carga antes del miércoles** — ya existen `scripts/k6-load-test.js` y
   `scripts/k6-stress-test.js`. Vale correrlos contra un escenario de ~60 menús concentrados en 2
   horas. `better-sqlite3` es **síncrono** y bloquea el proceso entero: es justo el tipo de cosa que
   no se nota con 3 pedidos y sí con 60.
3. **🟡 Riesgo conocido sin resolver:** `GET /api/orders/activas` (el panel **Órdenes**, no la Cola)
   conserva su **N+1 y su falta de filtro por fecha** — quedó anotado en `status.md` (sesión
   2026-08-10) como deliberadamente no tocado. Con 60 pedidos en el día ese panel es candidato a
   ponerse lento. Migrarlo a `utils/colaDia.js` es directo si aparece el problema.
4. **🟡 Backup manual antes del miércoles.** El backup diario automático con restore probado sigue
   siendo un P1 pendiente (ver más abajo). Antes del primer día de volumen real conviene, como
   mínimo, un backup manual verificado: si algo se rompe con datos reales de 60 pedidos, no hay
   vuelta atrás.
5. **🟢 Contador "menús vendidos hoy"** — ver la sección de Reportería. **Es la métrica que la clienta
   va a querer mirar justo ese día**, y es mucho más chica que el rediseño completo. Si algo de
   features entra el martes, que sea esto.
6. **⏸️ Pensionistas — postergar.** La lógica ya está cerrada y no se va a perder. Pero es un módulo
   grande (rol nuevo, tablas, rutas, panel del owner, página nueva) y meterlo el día antes de la
   primera atención masiva es exactamente cuando no conviene tocar el sistema. Retomarlo el jueves,
   con el aprendizaje del miércoles encima.

---

## Etapa actual

Producto online en `menupro.tech` con landing y **2 restaurantes piloto**. La etapa no es construir
features nuevas: es **pruebas con restaurantes reales hasta que un dueño pueda usar la app solo**. Las
pruebas existen para encontrar y arreglar estos problemas, no para esperar.

### Lo que revelaron los pilotos — de aquí salen las prioridades

| Piloto | Perfil | Qué pasó | Causa |
|---|---|---|---|
| #1 (sra. ~45) | dueña | Usó la app 13–14 de julio y la dejó. Quejas: letra chica, sin notificaciones, lentitud, botón de pago no visible | Casi todas coinciden con bugs reales activos esos días. Los fixes `ISS-018`–`ISS-024` se desplegaron **después** de sus dos días: probó una versión vieja |
| #2 (señor 70 + esposa 65) | dueños | "Hoy no, mañana mejor". **No lograba ni iniciar sesión** | Barrera de acceso: sesión que expiraba + credenciales difíciles de escribir en celular |

Con el piloto #2 se va más lento; con la señora de ~45 se retoma el contacto.

---

## P0 — Features que salen directo de las pruebas

### 3.1 Letra aún más grande — ✅ Completado 2026-08-10
`ISS-028`. Escala **16,1 / 19,6 / 23,8px** (antes 14 / 16,1 / 18,2). Se mantienen 3 niveles, no 4:
menos opciones es mejor para un dueño de 70 años. Migración `mp-font-scale-v2` sube la preferencia
guardada un nivel, **nunca la baja**. `menu.html` (la carta del cliente) **no** se tocó — decisión del
usuario, queda para más adelante.

### 3.2 Sesión que no se cierre — ✅ Completado 2026-08-10
`ISS-027`. Sesión de **30 días** con renovación deslizante; admin del SaaS acotado a 1 día. La causa
real no era el `expiresIn` sino que la sesión vivía en `sessionStorage`, que el navegador borra al
cerrar la PWA. **Era probablemente el bug de adopción más caro del proyecto.**

### 3.3 Entrada directa a Cola del día — ⬜ PENDIENTE
**Único P0 de features abierto.** Toggle en Configuración: al iniciar sesión, abrir directamente el
panel Cola del día en lugar del dashboard. Opcional y por usuario/restaurante, para no romperle el
flujo a quien ya usa el resto.

**Complementos evaluados y no hechos** (venían con 3.2): PIN de 4–6 dígitos con teclado numérico en
lugar de contraseña, y revisar `login.html` (`autocapitalize`, `inputmode`, tamaños de input).

---

## P0 — Operativo

- [ ] **Deploy del trabajo del 2026-08-10** — 2 commits: `181ddf3` (`ISS-027` + `ISS-026`) y
      `6d4576e` (`ISS-028`). Al entrar al servidor, anotar `git log -1 --oneline` **antes** del pull.
      Avisarle al dueño que la letra le va a crecer otra vez: es esperado, no una falla.
- [ ] **Confirmar VAPID keys reales** en el `.env` de producción. Sin esto el Gap 21 está desplegado
      pero las push no salen.
- [ ] **`ISS-025`** — feedback visible del estado de la suscripción push en Configuración. Hoy es
      silencioso (catch vacío): es imposible saber si está activa, denegada o sin keys.
- [x] ~~Deploy de lo acumulado de julio~~ — **hecho**, por la consola web del Droplet entre el
      2026-07-16 y el 2026-08-10 (no quedó registrado en su momento; corregido en `status.md`,
      sesión 2026-08-10 parte 3).
- ⏸️ **Auto-actualización del service worker — CONGELADO 2026-08-10.** Decisión del usuario. El
      enunciado original estaba equivocado (`skipWaiting` **ya existe** en `sw.js:20`) y la premisa
      también: el dueño **ya ve** la letra grande y el ícono "MP" en su celular, o sea que el SW se
      actualiza solo. Se valida con el deploy pendiente; si los cambios se ven sin cerrar y reabrir la
      app, **se borra del backlog**. Detalle en `status.md`, sesión 2026-08-10 (parte 3).

---

## 🔴 P0 — Reportería: rediseño completo (nuevo, 2026-08-10)

**La reportería actual no le sirve a la clienta.** Palabras del usuario: *"las gráficas son
microscópicas y no dan nada de valor que le interesa a la clienta"*. **Toda la reportería va a
cambiar** — no es un ajuste de tamaño, es un rediseño de qué se muestra y para qué.

### El dato #1 que la clienta quiere ver

> **Cuántos menús va vendiendo en ese momento, en el día.**

> 🚨 **Este número importa muchísimo más el miércoles 2026-08-12** (primera atención masiva, +60
> menús). Es exactamente el día en que la dueña va a querer mirar el contador cada rato. **Conviene
> separar el contador simple del rediseño completo:** un número grande y visible de "menús vendidos
> hoy" (una query de conteo + una tarjeta) es chico y entrega el 80% del valor; el rediseño de las
> gráficas puede esperar al jueves.

- Es **lo principal**, y hoy **no se muestra en ninguna parte**.
- **No importa si el menú vino por mesa o por reserva** — es la cantidad total de menús vendidos hoy.
  El sistema hoy separa esas dos fuentes en todos lados; para este número hay que unificarlas.
- Es un dato **en vivo**, para consultar en pleno servicio, no un reporte de cierre.

### Después de eso

- Qué **platos** va vendiendo (mismo criterio: del día, en vivo).
- **Requiere análisis previo** antes de implementar: qué métricas reemplazan a las actuales, cuáles
  se eliminan, y cómo se ve en un celular de 360px. No empezar por el código.

### Ya diagnosticado, aprovechar

`features.md` → "Estadísticas: qué pidió la gente hoy + fix del gráfico de barras chico"
(anotado 2026-07-13) ya tiene medio camino hecho:
- **Por qué el gráfico se ve chiquito:** `#chart-pedidos-wrap` (`owner.html:557`) solo tiene
  `min-height:220px`, sin `position:relative` ni alto fijo — a diferencia de los otros dos gráficos,
  que sí los tienen. Chart.js con `responsive:true` necesita ambos.
- **Por qué no sirve el dato:** `contarPedidosPorPlato()` en `routes/reportes.js` no filtra por fecha
  (es un acumulado histórico total) y obliga a elegir una sección/categoría a la vez.

---

## P1 — Antes de cobrarle al primer restaurante

- [ ] **Backup diario automático con restauración probada.** No basta con generarlo: hay que probar el
      restore completo.
- [ ] **Cobro recurrente** resuelto, para no perseguir pagos uno por uno.
- [ ] **Protocolo de onboarding** documentado en `pilotos.md`: instalar la PWA juntos, forzar cierre y
      reapertura, enviar una notificación de prueba y verificarla en su celular, quedarse a observar
      un servicio en hora punta, check-in día 1, 3 y 7.

---

## 🎯 Módulo Pensionistas — LÓGICA CERRADA, listo para implementar

**Casi todo el target tiene pensionistas almorzando en su menú, y lo piden.** No es especulativo: es
funcionalidad de segmento y probablemente un diferenciador, porque los sistemas de restaurante
genéricos no manejan comensales recurrentes con saldo prepagado.

**Estado: sin preguntas abiertas.** Todas las decisiones de negocio se cerraron el 2026-08-10 — ver
**`pensionistas.md` §0**, que manda sobre el resto de ese documento. Su dependencia era 3.2 (sesión
persistente), que ya está hecha.

### La lógica, en palabras del usuario

> "Se le coloca el dinero que tiene y él va gastando; si se necesita más, la señora le coloca más, y
> así ad infinitum."

1. El pensionista **es un usuario más**, creado desde el panel Usuarios que el owner ya usa, con rol
   nuevo `pensionista`.
2. El owner le **carga el dinero disponible**; cuando se acaba, recarga. Sin límite.
3. El pensionista **entra por el login normal** y pide desde `pensionista.html`; cada pedido le
   descuenta del saldo, sin pantalla de pago.
4. **Aviso de saldo bajo** (S/20 por defecto, configurable por restaurante).
5. **Saldo insuficiente bloquea el pedido.** Si el dueño quiere fiarle, le recarga.
6. **Todos los usuarios deben tener email `@menupro.tech`** — hoy `routes/usuarios.js:50` acepta
   cualquier dominio.

### Descartado — no volver sobre esto

- ❌ El "v1 recortado" sin login del pensionista (estuvo anotado aquí mismo el 2026-08-10 por la
  mañana; el usuario lo descartó ese día).
- ❌ `id_usuario` nullable — el pensionista siempre es un usuario real.
- ❌ Reutilizar `menu.html` con un "modo pensionista": es la carta pública por la que los 2 pilotos
  reciben pedidos hoy, y tocarla es riesgo puro. Va **`pensionista.html`**, página propia.

### Primer paso acordado (chico e independiente)

Forzar `@menupro.tech` en la creación de usuarios: validación en `routes/usuarios.js` + el formulario
en `owner.html`. No toca nada de pensionistas y sirve igual por sí solo.

### Facilidad confirmada

Mandar al pensionista a su propia página **no es complicado**: `login.html:420` ya tiene el mapa
`ROLE_REDIRECT` por rol (hecho en `ISS-007`). Es agregar una línea.

### Sigue vigente del análisis original

- Reportería separada: recargas (ingreso real) vs. consumo (gasto de saldo ya cobrado), para no
  contar el mismo dinero dos veces en Ganancias — `pensionistas.md` §8.
- Devolución automática de saldo al cancelar un pedido; el pedido respeta stock y horario de atención.

---

## P2 — Congelado

- **Migración a PostgreSQL.** El disparador no es el número de restaurantes, es técnico: escrituras
  concurrentes, necesidades de backup/PITR, aislamiento por tenant.

---

## Comercial

> ⚠️ **El precio es tentativo y puede cambiar** (indicación del usuario, 2026-08-10). No tomarlo como
> dato firme para decisiones de producto.

- Precio de referencia: **S/250 al mes** por restaurante.
- **Gratis solo para los 2 pilotos actuales.** Desde el restaurante #3 se cobra.
- El precio se acuerda por escrito el día uno (aunque sea por WhatsApp): "gratis hasta tal fecha,
  después S/X", para que la conversión no sea una venta nueva.

### Perfil de cliente a buscar
Dueño de 25–45 años, ya usa Yape y WhatsApp Business, quizá vende por delivery, 1–2 mozos, carta que
cambia seguido.
