# Backlog priorizado — Menú Pro

Plan de la etapa actual y **el porqué** de cada prioridad. El log técnico de lo ya hecho está en
`status.md`; el detalle por feature en `features.md`; los flujos y gaps de negocio en
`vision_negocio.md`.

> **Origen:** portado desde `conversacion_opues10082026.md` (2026-08-10), que está en `.gitignore`
> (`conversacion_*.md`) y por lo tanto **no viajaba entre las 2 laptops del usuario**. Este archivo sí
> está en git: es la copia viva del backlog. Actualizarlo al cerrar cada sesión.

**Última actualización:** 2026-08-10

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

## P1 — Antes de cobrarle al primer restaurante

- [ ] **Backup diario automático con restauración probada.** No basta con generarlo: hay que probar el
      restore completo.
- [ ] **Cobro recurrente** resuelto, para no perseguir pagos uno por uno.
- [ ] **Protocolo de onboarding** documentado en `pilotos.md`: instalar la PWA juntos, forzar cierre y
      reapertura, enviar una notificación de prueba y verificarla en su celular, quedarse a observar
      un servicio en hora punta, check-in día 1, 3 y 7.

---

## P1 — Módulo Pensionistas (pedido por el mercado)

**Casi todo el target tiene pensionistas almorzando en su menú, y lo piden.** No es especulativo: es
funcionalidad de segmento y probablemente un diferenciador, porque los sistemas de restaurante
genéricos no manejan comensales recurrentes con saldo prepagado.

Análisis arquitectónico completo en `pensionistas.md` (Gap 20). **Su dependencia era 3.2 (sesión
persistente), que ya está hecha → desbloqueado.**

**Recorte propuesto para una v1 que se pueda soltar rápido:**
- **Incluir:** tabla `pensionistas` (extiende `usuarios`), `pensionista_movimientos` como ledger de
  recargas y consumos, y el módulo del owner para registrar recargas y descontar consumo. Con eso ya
  se resuelve el dolor real del dueño: saber quién pagó, cuánto le queda, y evitar discusiones de "yo
  recargué y no aparece".
- **Diferir a v2:** login propio del pensionista, `pedidos_pensionista` y su integración en Cola del
  día y Cocina con tag. Es la mitad del trabajo y no es lo que el dueño pide primero.
- **Decisión de negocio pendiente** (`pensionistas.md` §11): si el saldo insuficiente bloquea el
  pedido o permite negativo. Sugerencia: configurable por restaurante, permitiendo negativo por
  defecto con alerta visible, porque **el fiado es práctica normal en este segmento**.
- **Reportería separada desde el día uno:** recargas (ingreso real) vs. consumo (gasto de saldo ya
  cobrado), para no contar el mismo dinero dos veces en Ganancias.

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
