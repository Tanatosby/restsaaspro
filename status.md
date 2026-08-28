# Estado del Proyecto — Menú Pro

---

## 📍 DÓNDE ESTAMOS — actualizado el 2026-08-24

**Lo que está en producción** — nueve deploys entre el 17 y el 21 de agosto, todos confirmados
por el usuario:

| Deploy | Commits | Qué salió |
|---|---|---|
| 2026-08-17 | `a47d132` | **T0** (`BUILD` automático por hash), **ISS-045** (link del menú con mayúscula), **ISS-046** (plato exige sección condicional — arroz sin proteína) y, de paso, lo que venía pendiente de antes: **ISS-044 + T11** (versionado de assets / precache del SW) |
| 2026-08-18 | `9c9de62` + `32c8fb0` | **«Descargar menú» como foto** para compartir por WhatsApp (+ el copy del pie: «Reserva ahora») |
| 2026-08-18 | `bc593a4` + `14ce74f` | Botón **"Agregar manual"** en la Cola del día + **fix del conteo de menús** ("Menús pedidos"/"Menús reservados") + tarjeta nueva **"Menús de hoy"**. Ver las 2 sesiones de hoy más abajo |
| 2026-08-19 | `7803818` | **ISS-047** — modalidad por menú (para llevar / comer acá por línea, no por pedido entero). |
| 2026-08-19 | `7803818..60c9e6f` (incluye `ca262b1`, `ba710d0`) | **Pensionistas Fase 1 + Fase 2** (panel del owner + `pensionista.html` — el flujo completo, sin riesgo de 404) y **ISS-048** (volver de "¿Cómo vas a pagar?" a la carta). `git pull` fast-forward, `pm2 restart`, `/health` → `{"status":"ok"}`. |
| 2026-08-19 | `60c9e6f..e7fc697` | **ISS-049** (recuperar el pedido si la pestaña se recarga al pagar), **ISS-050** (número de pedido igual para comensal y dueña) e **ISS-051** (aviso de comprobante Yape/Plin reutilizado). `git pull` fast-forward, `pm2 restart`, `/health` → `{"status":"ok"}`. |
| 2026-08-19 | `e7fc697..5b3af72` | **ISS-052** — el pensionista puede cambiar su propia contraseña. `git pull` fast-forward, `pm2 restart`, `/health` → `{"status":"ok"}`. |
| 2026-08-20 | `5b3af72..1658902` | **ISS-053** ("Agregar manual" con fotos + soporte de carta) + doc: corrección del target de mercado (20-50 mesas, no <10). `git pull` fast-forward, `pm2 restart`, confirmado por el usuario (log de consola). |
| 2026-08-20 | `1658902..e35eb4a` | **ISS-054** — el picker de "Agregar manual" no filtraba por `stock_restante`, solo por `agotado`. `git pull` fast-forward, `pm2 restart`, `/health` → `{"status":"ok"}`. |
| 2026-08-21 | `e35eb4a..9ea9a51` | **ISS-055** (regresar de Listos a Cocina), **ISS-056** (instrucción para volver de Yape/Plin), **ISS-057** (letra ajustable en la carta del cliente) e **ISS-058** (Historial de Órdenes sin foto de comprobante) — día 7 del piloto. `git pull` fast-forward, `pm2 restart`, `pm2 status` → online. |
| 2026-08-21 (tarde) | `9ea9a51..1b38b57` | **ISS-056 (rediseño)** — la nota de "cómo volver de Yape/Plin" pasó de instrucciones de gestos del celular a 3 pasos numerados con emoji. `git pull` fast-forward, `pm2 restart`, `/health` → `{"status":"ok"}`. |
| 2026-08-24 | `1b38b57..c269fb1` | **ISS-061** (status "En preparación" más claro), **ISS-062** (botón "Listo" en zona Cocina), **ISS-063** (Reservas: carta antes que el formulario), **ISS-064** ("+1 mismo menú") e **ISS-065** (reserva sin hora ya no se bloquea) — día 9 y día 10 del piloto. `git pull` fast-forward, `pm2 restart`, `pm2 status` → online, `/health` → `{"status":"ok"}`. |
| 2026-08-25 | `c269fb1..bd2b991` | **ISS-066** (plato bloquea sección opcional), **ISS-067** (Cola: reservas sin hora enterradas + parpadeo) e **ISS-068** (Stock rápido desde Cola) — día 10 del piloto (visita en persona), más el mockup de descubribilidad (solo doc). `git pull` fast-forward, `pm2 restart`, `pm2 status` → online, `curl /health` → `{"status":"ok"}`. |
| 2026-08-25 (tarde) | `bd2b991..440e9e8` | **ISS-069** — deselección de plato en sección opcional (radio nativo no se podía desmarcar) + tap en la foto ahora selecciona el plato en vez de abrir el zoom. `git pull` fast-forward, `pm2 restart`, `pm2 status` → online, `curl /health` → `{"status":"ok"}`. |
| 2026-08-25 (noche) | `440e9e8..c148008` | Explicación permanente de Obligatoria/Opcional + **ISS-070** (Compatibilidad de platos, control de 3 estados) + **ISS-071** ("Reservas" oculto del bottom-nav) + **ISS-072** (cobro en 1 clic) + **ISS-073** (anti-parpadeo en Cocina/Órdenes/Reservas) + **ISS-074** (Mesa grande/#orden chico) + **ISS-075** (Agregar manual simplificado) + **ISS-076** (modal "Qué hay de nuevo" + badge "🆕") — día 11 del piloto. `git pull` fast-forward, `pm2 restart`, `pm2 status` → online, `curl /health` → `{"status":"ok"}`. |
| 2026-08-26 | `c148008..617f3e6` | Cambio de nombre del restaurante (self-service en Configuración + edición desde el admin). `git pull` fast-forward, `pm2 restart`, `pm2 status` → online, `curl /health` → `{"status":"ok"}`. Confirmado por el usuario. |
| 2026-08-26 (noche) | `617f3e6..0eb1f56` | Entrada de `novedades.js` para el cambio de nombre (se había olvidado) + **ISS-077** (módulos JS fuera de precache/versionado: `novedades.js` y `charts-theme-admin.js` del admin). `git pull` fast-forward, `pm2 restart`, `pm2 status` → online, `curl /health` → `{"status":"ok"}`. Confirmado por el usuario. |
| 2026-08-27 | `0eb1f56..1085807` | Doc del Día 12 del piloto (7 hallazgos, sin implementar). `git pull` fast-forward, `pm2 restart`, `pm2 status` → online, `curl /health` → `{"status":"ok"}`. Confirmado por el usuario. |
| 2026-08-27 (2) | `1085807..bc4109e` | **"⬇ Descargar carta"** — foto de los platos a la carta con precio (`carta-export.js`), pedido real de la dueña, día 13 del piloto. `git pull` fast-forward, `pm2 restart`, `pm2 status` → online, `curl /health` → `{"status":"ok"}`. Confirmado por el usuario. |
| 2026-08-27 (3) | `bc4109e..4947e23` | **ISS-078** — la pantalla de pago no cobraba el tapper en un carrito mixto (para llevar + en local), el comensal pagaba de menos por Yape/Plin. `git pull` fast-forward, `pm2 restart`, `pm2 status` → online, `curl /health` → `{"status":"ok"}`. Confirmado por el usuario. |
| 2026-08-28 | `4947e23..3e1d922` | **ISS-079** (homologar "Cobrar" para llevar/delivery) + **ISS-080** (Pedir: cantidad primero, configurar después + editar unidad puntual) — los 2 commits juntos en un solo deploy. `git pull` fast-forward, `pm2 restart`, `pm2 status` → online, `curl /health` → `{"status":"ok"}`. Confirmado por el usuario. |
| 2026-08-28 (2) | `3e1d922..f3ff74a` | **ISS-081** — pago en 1 sola pantalla (se elimina "Revisa tu pedido") + aviso temporal + encuesta de producto (solo panel admin). `git pull` fast-forward, `pm2 restart`, `pm2 status` → online, `curl /health` → `{"status":"ok"}`. Confirmado por el usuario. |

**Sin pendientes de deploy** — producción está al día con `main` (`f3ff74a`). ISS-059 y ISS-060
siguen **diagnosticados, sin implementar** (Día 8 del piloto). **Sin verificar todavía en uso
real:** ISS-069 a ISS-076 (desplegados 2026-08-25) e ISS-077 más el cambio de nombre (desplegados
hoy) — falta confirmar con la dueña y con un comensal nuevo (deselección, tap en foto, control de
compatibilidad, cobro en 1 clic, Cocina sin parpadeo, mesa grande, Agregar manual sola, modal de
novedades con las 2 entradas, y el campo de nombre en Configuración).

**Sin verificar todavía en uso real, la más importante:** ISS-080 (Pedir: cantidad primero,
configurar después) — es el cambio más grande al flujo del comensal hasta ahora. Falta que la
dueña lo vea funcionar en un servicio real antes de darlo por cerrado del todo. **ISS-081**
(pago en 1 pantalla + banner + encuesta) recién se desplegó — falta ver las primeras respuestas
de la encuesta llegar al panel admin (`menupro.tech/admin` → Feedback) con uso real.

**Nota aparte, no accionar:** el droplet avisó `New release '24.04.4 LTS' available` y `*** System
restart required ***` al loguearse por SSH. Es una actualización de Ubuntu, no del proyecto —
decisión de infraestructura del usuario, no se tocó nada.

**T6, el backup de la BD — corregido hoy, sigue quedando el restore de prueba.** El script y el
cron existían desde el **29 de mayo**, pero al script le faltaba `mkdir -p`, así que **cada
corrida nocturna fallaba en silencio durante casi 3 meses** (el `echo` final de "Backup creado"
imprimía igual, sin importar si el `cp` había funcionado). Esto explica con precisión el
incidente del 2026-08-16: la respuesta a "¿restauramos?" fue "no hay backup" pese a que el cron
llevaba meses corriendo. Corregido y verificado 2026-08-19 — primer backup real, 241 KB. Detalle
completo en `deploy.md` §7. **El usuario decidió dejar para el fin de semana:** probar un restore
real al menos una vez, y copiar los backups a un lugar externo al servidor.

**Pendiente, no bloqueante:**
- Borrar el git worktree abandonado `.claude/worktrees/foamy-moseying-nebula` — el comando fue
  bloqueado por el clasificador de permisos, lo borra el usuario.
- Fiados — ver `backlog.md`.
- **Sin verificar en uso real:** nadie usó todavía «Descargar menú» en un servicio. Falta
  que la dueña baje una foto y la comparta, y confirmar que el pie muestra
  `menupro.tech/<slug>` con el slug real.
- **Pensionistas recién desplegado, sin usar todavía:** falta que la dueña dé de alta al
  primer pensionista real y le pase credenciales; confirmar en uso real que `pensionista.html`
  funciona en un celular de gama media.
- Pensionistas: falta integración en Cola del día/Cocina y reportería separada — ver
  `pensionistas.md` §0-bis y `features.md`. No bloquea el uso de las Fases 1+2.

---

## 🎯 Sesión 2026-08-28 — ISS-081: pago en 1 paso + aviso temporal + encuesta de producto

**Prompt del usuario:** un día después del deploy de ISS-080, feedback de uso real: letra chica
en el picker, pantalla de pago solo con el total, y la pregunta de si se podía sacar "Revisa tu
pedido" — más la idea nueva de un aviso temporal y una encuesta de 2 preguntas al terminar el
pedido, con las respuestas visibles **solo en el panel admin** (menupro.tech/admin), nunca en el
panel de la dueña. Validado primero con el mismo prototipo interactivo del día anterior (banner,
pantalla de pago reordenada, encuesta con panel "lo que vería el admin" simulado) antes de tocar
código real.

**Implementado** (detalle técnico completo en
[ISS-081](issues/ISS-081-pago-en-un-paso-mas-banner-y-encuesta.md)):
- `public/js/widgets/menu-modal.js` — `.mm-progreso` de 13px a 15.5px.
- `public/menu.html` — se eliminó `#repaso-screen`; `enviarPago()` absorbió toda la lógica de
  `confirmarEnvioFinal()`/`showRepasoStep()`/`volverAPago()` (eliminadas), conservando la misma
  garantía de Gap 17 (nunca crear sin método + comprobante resueltos) en una sola pantalla en vez
  de dos. `#pago-screen` suma el resumen de ítems (antes solo en el repaso) y sube la letra del
  comprobante a 14.5px (estaba bajo el mínimo mobile-first de 14px). Banner temporal
  `#aviso-flujo-banner` (localStorage, hasta 2026-08-31) y encuesta `#encuesta-flujo-wrap` (2
  preguntas con botones + comentario opcional, misma fecha límite) nuevos.
- `config/database.js` — tabla `feedback_producto` (con `tipo`, reusable para futuras encuestas).
- `routes/public.js` — `POST /api/public/feedback` (sin sesión, valida tipo/enum/al menos una
  respuesta).
- `routes/admin.js` — `GET /api/admin/feedback` (rol admin, filtra por `?tipo=`).
- `public/admin/dashboard.html` — panel nuevo "Feedback de producto" (nav + bottom-nav + tabla).
  Comentario escaped antes de pintarlo — verificado a mano que un intento de `<script>` no se
  ejecuta.

**Verificación:** `scripts/test-gate-pago.js` reescrito para el flujo de 1 pantalla (21/21, misma
cobertura de garantías que antes). `scripts/test-feedback-flujo.js` nuevo (16/16). Ajustados sin
cambiar el fondo: `test-iss049-recuperar-pago.js` (12/12), `test-comprobante-duplicado.js` (7/7),
`test-numero-dia-pedido.js` (10/10), `test-monto-pago-visible.js` (9/9). Sin cambios necesarios en
`test-iss048-volver-pago.js`, `test-pago-mixto.js`, `test-pedir-cantidad-primero.js`,
`test-repetir-menu.js`, `test-cobrar-homologado.js`, `test-carta-export.js`,
`test-version-assets.js`. 469/469 jest. Panel admin verificado a mano end-to-end.

**Sin cambios (fuera de alcance, previo a esta sesión):** `test-fixes-pago-comprobante.js` sigue
roto por no llenar `#nombre-cliente` — visto y documentado desde ISS-080.

**Docs:** `issues/ISS-081-...md` (nuevo), `issues/ISSUES.md`, `vision_negocio.md` (Gap 17),
`backlog.md`, `pilotos.md` (Día 14), `features.md`, `novedades.js` (entrada id 5), este archivo.
**Pendiente:** deploy (el usuario decide cuándo).

---

## 🎯 Sesión 2026-08-27 (5) — ISS-080: rediseño de "Pedir" — cantidad primero, configurar después

**Prompt del usuario:** seguir con #3/#4 de la lista priorizada (stock a mitad de pedido / editar
un menú puntual), pero primero pidió un **mockup interactivo** para probar la solución antes de
dar veredicto. Sobre la marcha sumó ideas propias de UX (cantidad antes de configurar, carrito con
2 accesos, encadenar entre menús, forzar el freno del carrito) que terminaron ampliando bastante
el alcance original — 4 iteraciones sobre el prototipo hasta la aprobación final.

**Prototipo (artifact "Pedido Directo", JS puro sin backend):** simuló el flujo completo — stepper
de cantidad en la card, picker encadenado ("1/n"), resumen editable por unidad, modalidad
para llevar/comer aquí, y el freno del carrito con pendientes sin configurar. Sirvió para atrapar
un bug real antes de tocar producción: el contador de stock sumaba en vez de restar la selección
en curso.

**Migrado a código real, solo "Pedir"** (decisión de alcance tomada antes de empezar: Reservar
queda para otra sesión, ya tuvo su propio rediseño en ISS-063 — cambiar los 2 flujos el mismo día
en producción duplicaba el riesgo).

**Implementado** (detalle técnico completo en
[ISS-080](issues/ISS-080-flujo-pedir-cantidad-primero.md)):
- `public/menu.html` — `renderMenuDiaCard()` bifurca por modo (Pedir: stepper + "Elegir opciones";
  Reservar: sin cambios). `elegirOpcionesPedir()`/`continuarWizardPedir()` encadenan unidad tras
  unidad y entre tipos de menú. `abrirCarritoPedir()` frena el carrito si queda algo pendiente sin
  configurar. `editarUnidadPedir()`/`guardarEdicionMenuPedir()` — "✏️ Editar" por unidad del
  carrito, resuelve directo los hallazgos #1 y #2 del Día 12. `validarSeleccionMenu()`/
  `armarItemMenu()` extraídas de `agregarMenu()` para compartir la validación (ISS-046/ISS-066)
  entre agregar y editar. Atajo "+1 mismo menú" (ISS-064) retirado solo para Pedir — Reservar lo
  sigue teniendo. `toggleModalidadGrupo()` eliminado (quedó sin ningún llamador).
- `public/js/widgets/menu-modal.js` — extendido con `posicion`/`total` (aviso "Estás eligiendo tu
  Menú X i/n"), `onAdded` (encadenar en vez de cerrar solo) y `onSave` (modo edición). Sin estas 3
  opciones se comporta exactamente igual que siempre, así Reservar queda intacto.
- `public/css/menu.css` — `.menu-dia-footer`/`.menu-dia-estado` (stepper + CTA de la card),
  `.cart-edit` (botón "✏️ Editar" del carrito).

**Verificación:** `scripts/test-pedir-cantidad-primero.js` nuevo (24/24). `test-repetir-menu.js`
recortado a solo Reservar (11/11 — la parte de Pedir que probaba el atajo retirado ya no aplica).
Sin regresiones: `test-modalidad-mixta.js` (19/19), `test-pago-mixto.js` (5/5),
`test-iss048-volver-pago.js` (15/15), `test-iss049-recuperar-pago.js` (12/12), `test-gate-pago.js`
(24/24), `test-comprobante-duplicado.js` (7/7), `test-numero-dia-pedido.js` (10/10),
`test-pensionista-cliente.js` (29/29), `test-carta-export.js` (16/16),
`test-cobrar-homologado.js` (14/14), `test-version-assets.js` (25/25). 469/469 jest.

**Hallazgos colaterales, sin relación con este cambio (no corregidos, fuera de alcance):**
`test-cola-carrera.js` (dato hardcodeado desactualizado, visto en ISS-079), `test-horario-atencion.js`
(un caso quedó desactualizado desde ISS-065, previo a esta sesión), `test-fixes-pago-comprobante.js`
(nunca llena `#nombre-cliente`, parece roto desde antes). Varios scripts mutan la config de pagos/
horario del restaurante de prueba sin restaurarla — se restauró a mano durante la verificación.

**Docs:** `issues/ISS-080-...md` (nuevo), `issues/ISSUES.md`, `backlog.md`, `pilotos.md`,
`features.md`, `novedades.js` (entrada id 4, nueva), este archivo.
**Pendiente:** deploy (el usuario decide cuándo).

---

## 🎯 Sesión 2026-08-27 (4) — ISS-079: homologar "Cobrar" para llevar/delivery

**Prompt del usuario:** confirmó ISS-078 desplegado y pidió seguir con el #11 de la lista
priorizada — homologar "Cobrar" (aprobado 2 sesiones atrás: el caso real era para llevar/delivery,
no dine-in).

**Implementado:**
- `public/js/modules/pedidos.js` — `btnOrden()`/`btnReserva()`: la zona "Listos" ya no bifurca por
  modalidad. Antes, para llevar/delivery mostraba "💰 Cobrar"/"💰 Completar" directo (cerraba de un
  toque, sin pasar por "Cobrar"); ahora hace la misma parada intermedia que con mesa
  (`es_entregado`/`es_cliente_llego`), con la etiqueta "📦 Recogido" en vez de "🍽 Entregar/
  Entregado". La zona "Cobrar" no cambió — ya mostraba genéricamente cualquiera con esos flags.
- `public/js/modules/reservas.js` — mismo cambio en `renderReservaCard()` (panel clásico
  "Reservas", accesible desde el menú lateral desde ISS-071), para que no quede una segunda
  pantalla con el comportamiento viejo.
- Sin backend: los flags ya eran válidos para cualquier modalidad, la restricción era solo de qué
  botón mostraba el frontend.

**Verificación:** `scripts/test-cobrar-homologado.js` nuevo (14/14) — verifica los 2 botones por
función con las 4 combinaciones modalidad×zona, y punta a punta con una orden y una reserva para
llevar reales (confirma que NO están en "Cobrar" al llegar a "Listos", y que sí aparecen ahí tras
tocar "📦 Recogido"). `test-modalidad-mixta.js` 19/19 sin regresiones. 469/469 jest.

**Hallazgo colateral, sin corregir (fuera de alcance):** `scripts/test-cola-carrera.js` falla por
un dato hardcodeado (`Plato #1 no disponible`) que ya no existe así en la BD local de desarrollo —
sin relación con este cambio, no se investigó más a fondo.

**Docs:** `issues/ISS-079-...md` (nuevo), `issues/ISSUES.md`, `backlog.md`, `pilotos.md`,
`novedades.js` (entrada id 3, ampliada de nuevo), este archivo.
**Pendiente:** deploy (el usuario decide cuándo).

---

## 🎯 Sesión 2026-08-27 (3) — ISS-078: total de pago no coincidía con el carrito (carrito mixto)

**Prompt del usuario:** confirmó que la dueña verificó "Descargar carta" en uso real (OK) y pidió
seguir con el #8 de la lista priorizada — la discrepancia de precio carrito vs. pantalla de pago
diagnosticada en la sesión anterior.

**Implementado:**
- `public/menu.html` — `confirmarPedido()`: el cargo del tapper pasa de
  `getModalidadOrden() === 'para_llevar' ? contarTappers(cart) * costo_tapper : 0` a
  `contarTappersLlevar(cart) * costo_tapper` — misma cuenta por ítem que ya usa `updateCart()`. Con
  un carrito mixto (1 menú para llevar + 1 en local) ya no se cae a 0.
- Reservas revisadas aparte: **no tenían el bug** — la modalidad de una reserva es un radio button
  para todo el pedido, no por ítem, así que no existe el caso de carrito mixto ahí.

**Verificación:** `scripts/test-pago-mixto.js` nuevo (5/5) — arma el carrito mixto real, activa
Yape, y compara el total del carrito contra el de la pantalla de pago (con el código viejo este
test fallaba: S/ 30.00 en pago vs. S/ 31.50 en el carrito). `scripts/test-modalidad-mixta.js`
19/19 sin regresiones. 469/469 jest.

**Docs:** `issues/ISS-078-...md` (nuevo), `issues/ISSUES.md`, `backlog.md`, `pilotos.md`,
`novedades.js` (entrada id 3, ampliada), este archivo.
**Pendiente:** deploy (el usuario decide cuándo).

---

## 🎯 Sesión 2026-08-27 (2) — Día 13: "Descargar carta" implementado + homologación de Cobrar priorizada

**Prompt del usuario:** de los 10 puntos abiertos de la sesión anterior, eligió empezar por el #10
(descargar la carta como foto). En el camino surgieron 2 temas más: aclarar el flujo real de
estados de reservas (4 zonas de la Cola del día vs. los 5-6 estados internos) y confirmar el pedido
de homologar "Cobrar" para para llevar/delivery en ambas entidades — quedó aprobado pero **sin
implementar todavía**, se ataca en una próxima sesión según la lista priorizada.

**Implementado — #10, "⬇ Descargar carta":**
- `public/js/widgets/carta-export.js` — nuevo, hermano autocontenido de `menu-export.js`. Compone
  un canvas con banda superior (nombre + "CARTA"), título "Nuestra carta" y una fila de cards por
  categoría (foto + nombre + **precio por plato**, que el menú del día no necesita). Reusa
  `GET /api/menu/platos-carta` y `GET /api/menu/restaurante/config` — sin backend nuevo. Platos con
  `activo = 0` quedan afuera.
- `public/owner.html` — botón "⬇ Descargar carta" junto a "＋ Crear plato" (Carta → Platos a la
  carta) + script tag versionado (`?v=__BUILD__`).
- `public/sw.js` — `carta-export.js` sumado a `ASSETS` (mismo criterio de ISS-044/ISS-077).
- **Decisión de alcance con el usuario:** solo imagen única por ahora, sin PDF ni paginado — se
  evaluó jsPDF (primera librería de ese tipo en el proyecto) y se descartó para un caso
  hipotético; la carta real de la dueña (3 categorías, 10 platos) no lo necesita. Se revisa si
  hace falta cuando exista una carta real que se vea mal en una sola foto.

**Verificación:** `scripts/test-carta-export.js` nuevo, 16/16. `scripts/test-version-assets.js`
25/25. 469/469 jest sin regresiones.

**Hallazgo colateral, corregido de paso:** `scripts/test-menu-export.js` estaba roto desde ISS-076
(25/08) — el modal "Qué hay de nuevo" tapa los botones en un navegador de test nuevo y nadie lo
había vuelto a correr. Mismo fix de una línea (cerrar el modal antes de interactuar) en ambos
tests; vuelve a dar 25/25.

**Sin implementar, aprobado y priorizado para la próxima sesión:** homologar "Cobrar" — que
para llevar/delivery (orden y reserva) pasen por la pestaña "Cobrar" antes de cerrarse, en vez de
completarse directo desde "Listos". Ver `pilotos.md` Día 13 y la tabla de prioridades.

**Aparte, sin acción:** se notó que `dotenv` (v17.4.2) imprime un "tip" promocional al arrancar
el server (`◇ injected env... // tip: ...`), incluyendo una mención a un producto de terceros
("vestauth.com"). Se confirmó en el código de la librería que es una función propia de dotenv
(array `TIPS` en `node_modules/dotenv/lib/main.js`), no un problema de seguridad — solo ruido en
los logs. No se tocó nada; mencionado por transparencia.

**Docs:** `features.md`, `novedades.js` (entrada id 3), `pilotos.md`, `backlog.md`,
`issues/ISSUES.md`, este archivo.
**Pendiente:** deploy (el usuario decide cuándo). Retomar la lista priorizada: #8 (discrepancia de
precio) → homologar Cobrar → #3/#4 (stock a mitad de pedido) → #9 (reservas atascadas) → resto de
UX del Día 12.

---

## 🎯 Sesión 2026-08-27 — Día 13 del piloto: 3 hallazgos nuevos, solo documentación

**Prompt del usuario:** 3 reportes en conversación de escritorio, sin implementar nada — se pidió
explícitamente documentar y armar una tabla para decidir qué se trabaja.

1. **Discrepancia de precio carrito vs. pantalla de pago** (con pérdida de dinero real). Causa
   raíz encontrada en `menu.html`: `confirmarPedido()` calcula el cargo del tapper con
   `getModalidadOrden() === 'para_llevar'` (chequeo de TODO el pedido, previo a ISS-047), en vez
   de `contarTappersLlevar()` (por ítem, lo que ya usa el carrito) — con un carrito mixto
   (1 menú para llevar + 1 en local) el cargo se cae a 0 en la pantalla de pago. El comensal paga
   por Yape/Plin el monto de menos; el backend sí calcula el total correcto al crear el pedido. El
   mismo patrón está duplicado en `updateResCartSummary()`/`confirmarReserva()` (reservas).
2. **Reservas atascadas en "confirmada", no llegan a Cobrar.** No es un bug de pérdida de datos —
   el avance por estados es manual (botones en `pedidos.js`/`reservas.js`). La causa concreta:
   `utils/autoPreparacion.js` (el job que empuja sola una reserva confirmada a "🍳 A cocina")
   exige `hora_llegada IS NOT NULL`, y desde **ISS-065** (2026-08-24) reservar sin hora ya no se
   bloquea — las reservas sin hora nunca activan el job y quedan atascadas hasta que alguien las
   toca a mano. Si pasa la fecha, salen de la Cola del día y aparecen solo en el banner "Pedidos
   sin cerrar".
3. **Idea nueva:** descargar la carta (à la carta) como foto/PDF, mismo estilo que
   `MenuExport`/"⬇ Descargar menú" pero con platos + precios; PDF si la lista es muy larga para
   una sola imagen.

**Sin cambios de código.** Los 3 quedan sumados a los 7 hallazgos del Día 12 (todavía sin
priorizar) para la próxima sesión.

**Docs:** `pilotos.md` (Día 13, 3 entradas), este archivo.
**Pendiente:** priorizar en conjunto los 10 puntos abiertos (7 del Día 12 + 3 de hoy).

---

## 🎯 Sesión 2026-08-26 (3) — Día 12 del piloto: 7 hallazgos, solo documentación

**Prompt del usuario:** reporte de uso real de hoy (Día 12 — la fecha desambiguó la duda entre
"día 11 o 12" del propio usuario), pidiendo explícitamente **solo documentar, sin implementar**
— la discusión de prioridad y solución sigue en la próxima sesión, desde la otra laptop.

**Registrado en `pilotos.md` (Día 12, 2026-08-26):**
- Seguimiento de ISS-074: la mesa se ve mejor, pero el # de orden sigue confundiendo en
  Cola/Cocina — piden evaluar sacarlo de la vista, no solo achicarlo.
- Seguimiento de ISS-073: ya no parpadea, pero el refresco periódico de Cocina sigue siendo
  incómodo para la cocinera — causa exacta sin determinar todavía.
- 5 hallazgos de comensales: (1) stock agotado a mitad de un pedido con varios menús obliga a
  rehacer todo desde cero; (2) no se puede editar un menú puntual ya en el carrito (misma causa
  raíz que el 1); (3) elegir el mismo menú para varias personas seguidas (ej. una mamá por sus
  hijos) no es intuitivo — hay que salir y re-entrar al picker por cada uno; (4) el botón del
  carrito es poco descubrible; (5) nombre + adjuntar foto es un paso complicado para varios,
  se recomienda agrandarlo por defecto.

**Sin cambios de código.** No se tocó `backlog.md` — la priorización de estos 7 puntos es
justamente lo que queda por discutir.

**Docs:** `pilotos.md`, este archivo.
**Pendiente:** retomar la discusión de estos 7 puntos en la próxima sesión.

---

## 🎯 Sesión 2026-08-26 (2) — ISS-077 resuelto: módulos JS fuera del precache/versionado

**Prompt del usuario:** pidió evaluar la mejor solución para el hallazgo de ISS-077 (2 casos:
`novedades.js` sin precache, `charts-theme-admin.js` sin versionado en el admin).

**Solución evaluada y aprobada:** extender el mecanismo ya probado en ISS-044 en vez de crear
algo nuevo (se descartó registrar un service worker para el admin — no lo necesita, es
herramienta de un solo usuario).

**Implementado:**
- `public/sw.js` — `novedades.js` agregado a `ASSETS`.
- `app.js` — `/admin/dashboard.html` sumado a `PLANTILLAS` (recibe `__BUILD__` y
  `Cache-Control: no-cache`, igual que `owner.html`/`menu.html`/`pensionista.html`).
- `public/admin/dashboard.html` — el script `charts-theme-admin.js` pasa a pedirse con
  `?v=__BUILD__`.
- Antes de tocar nada, se verificó que la navegación real (PWA `start_url`, `ADMIN_REDIRECT` del
  login admin) usa las URLs con `.html` — las rutas sin extensión (`/owner`, `/admin/dashboard`)
  son alias que no participan del flujo real, así que el fix cubre el tráfico efectivo.

**Verificación:** `scripts/test-version-assets.js` (server local `PORT=3311`) → 25/25 (antes
24/25). Caso 2 verificado a mano con `curl` (no cubierto por ese script): sin `__BUILD__` sin
reemplazar, script con `?v=`, `Cache-Control: no-cache`, asset versionado responde 200.
469/469 jest.

**Docs:** `issues/ISS-077-...md` (→ Resuelto), `issues/ISSUES.md`, este archivo.
**Desplegado 2026-08-26 (noche)** (commit `0eb1f56`, junto con `b6c3fc3`) — `git pull`
fast-forward, `pm2 restart`, `pm2 status` → online, `curl /health` → `{"status":"ok"}`.
Confirmado por el usuario.

---

## 🎯 Sesión 2026-08-26 — Cambio de nombre del restaurante + regla de novedades.js en CLAUDE.md

**Prompt del usuario:** hoy la dueña pidió cambiar el nombre de su restaurante y no había forma
de hacerlo — ni desde Configuración (self-service) ni desde el admin (para que el usuario lo
corrija a mano). Antes de eso, también preguntó por la dinámica del modal "Qué hay de nuevo"
(ISS-076): creyó que dependía de reloguearse porque ayer no le apareció hasta cerrar sesión.

**Diagnóstico del modal de novedades (sin cambios de código, solo explicación):** no depende de
la sesión — se dispara en cada carga de `owner.html`. Lo que probablemente pasó ayer es el
`stale-while-revalidate` de `sw.js` para los HTML: la primera apertura tras el deploy sirvió el
`owner.html` cacheado de *antes* del deploy mientras revalidaba en segundo plano; el cierre de
sesión fue, por timing, la primera carga después de que esa revalidación terminara — no la causa
real. Documentado ya en `ISS-044`, mismo mecanismo.

**Hallazgo colateral (preexistente, no introducido hoy):** al correr
`scripts/test-version-assets.js` para verificar los cambios de esta sesión, salió en rojo algo
que no toqué — `novedades.js` **no está** en el array `ASSETS` de `sw.js`, a diferencia del
resto de los módulos JS. No se precachea; siempre depende de la red. No es la causa del
incidente de ayer (el HTML viejo cacheado ya alcanza para explicarlo), pero es un descuido real
que el propio test detecta. **Sin corregir** — fuera del alcance aprobado hoy, queda para la
próxima sesión.

**Implementado:**
- `routes/menu.js` — `PATCH /api/menu/config/nombre` (self-service, guard `authorizePermiso()`,
  valida 2–60 caracteres).
- `routes/admin.js` — `PATCH /api/admin/restaurantes/:id/nombre` (mismo tipo de validación, para
  que el usuario lo edite desde el dashboard admin).
- `public/owner.html` + `public/js/modules/config.js` — card "Nombre del restaurante" en
  Configuración, con guardado que refresca el sidebar.
- `public/admin/dashboard.html` — botón "✏️ Editar" por fila en la tabla de restaurantes, con
  modal reutilizando el patrón visual de "Reset contraseña".
- `.claude/CLAUDE.md` — agregada `public/js/modules/novedades.js` a la lista de "Documentación —
  regla obligatoria": si un cambio es visible para la dueña, entra una entrada nueva al array
  `NOVEDADES`, igual que ya se hace con `status.md`.

**Tests:** `tests/nombre-restaurante.test.js` (nuevo, 11 casos: validación + BD). 35/35 test
suites, 469/469 tests.

**Docs:** `.claude/CLAUDE.md`, este archivo.
**Desplegado 2026-08-26** (commit `617f3e6`) — `git pull` fast-forward, `pm2 restart`, `pm2
status` → online, `curl /health` → `{"status":"ok"}`. Confirmado por el usuario (log de consola
pegado en la conversación).

**Corrección tras el deploy, mismo día:** el usuario preguntó si iba a salir aviso del cambio de
nombre en el modal de novedades — no había entrada cargada, se pasó por alto pese a la regla
recién agregada a `CLAUDE.md` en esta misma sesión. Agregada `id: 2` en `novedades.js`. Queda
pendiente de un nuevo commit/deploy (ver tabla de arriba).

**ISS-077 extendido:** al listar todos los módulos JS en disco contra el array `ASSETS` de
`sw.js`, apareció un **segundo** archivo fuera de precache — `charts-theme-admin.js`, usado
solo por `admin/dashboard.html`. Ahí el caso es más grave: ese HTML **no registra el service
worker en absoluto** (el admin no es una PWA), así que ese script depende 100% del caché HTTP
normal del navegador — y se pide sin `?v=` de cache-busting, a diferencia de todo lo demás. Es
el mismo patrón de fondo que ISS-044, sin ninguna de las mitigaciones que ya se aplicaron ahí.
Detalle actualizado en `issues/ISS-077-novedades-js-fuera-de-assets.md`. Sigue sin
implementarse — pendiente de aprobación.

---

## 🎯 Sesión 2026-08-25 (7) — ISS-076: "Qué hay de nuevo", retomado antes del deploy

**Prompt del usuario:** antes de desplegar, preguntó si a la dueña le va a aparecer algún
aviso de qué cambió — recordó que el modal "Qué hay de nuevo" se había aprobado temprano en la
conversación de hoy pero nunca se implementó (quedó pendiente cuando la sesión giró hacia la
corrección de `kitchen.html` y siguió directo a ISS-070 a ISS-075).

**Implementado:** las 2 piezas acordadas entonces.
- `novedades.js` (nuevo módulo) — array `NOVEDADES` mantenido a mano, `mostrarNovedadesSiHay()`
  compara contra `localStorage` y muestra todo lo no visto en un solo modal.
- `badgeNuevo()` en `utils.js` — puntito "🆕" por control, se apaga a los 14 días o al tocarlo.
- Disparado tras el login, **solo owner/admin** (las novedades de hoy son de Configuración).
- Primera entrada cargada con los 6 cambios visibles de hoy (ISS-070 a ISS-075). Badge de
  prueba aplicado al control de Compatibilidad de platos (ISS-070).

Sin cambios de backend. 34/34 test suites, 458/458 tests.

**Docs:** `issues/ISS-076-que-hay-de-nuevo.md` (nuevo), `issues/ISSUES.md`, este archivo.
**Pendiente:** deploy a producción (con esto, el mismo deploy ya deja el aviso listo para la
dueña) + confirmar que el modal aparece la primera vez que abre la app.

---

## 🎯 Sesión 2026-08-25 (6) — Reflexión de campo + ISS-075: Agregar manual simplificado

**Prompt del usuario:** compartió, sin pedir un fix concreto, cómo usa la app la dueña en la
práctica: no mira el celular en hora pico (coordina verbal con la cocinera), con pocas mesas
"la app se vuelve inútil" y mide que pedir por la app toma ~1 minuto vs. 5-10 segundos a boca
de jarro (6-12x más lento), la cena es 100% manual, y "Agregar manual" no se le pega — solo lo
registró guiado, nunca solo. Terminó preguntando si la app fue un fracaso y si debería
abandonarla.

**Respuesta:** no es un fracaso — reservas, cocina en hora pico, pago con comprobante y
pensionistas funcionan sin relación con este problema. Lo que falla es una pieza específica
(pedido por QR con pocas mesas) con una causa medida con precisión, no vaga — el mejor tipo de
problema para atacar. Documentado completo en `pilotos.md`, Día 11 (varias entradas).

**ISS-075 — "Agregar manual" simplificado:** revisando el modal completo se encontró que no
era un atajo — abría el mismo camino que el cliente (tarjeta de menú → por sección, un chip que
abría PlatoPicker, grid de fotos, encima del modal → repetir). Se reemplazó por una lista plana
de nombres inline, sin modal aparte ni fotos (ella ya sabe qué es cada plato); tocar el mismo
plato lo deselecciona (mismo patrón de ISS-069). Mesa/Nombre marcados "(opcional)" — ya lo eran
en el backend, faltaba que se viera. La carta no se tocó, ya era una lista plana.

**Nota aparte, corregida en el momento:** al proponer que además descontara stock de la carta
("kardex de productos"), primero se dijo que era un ajuste chico sin haber revisado el schema —
equivocado. `platos_carta` no tiene columnas de stock y el patrón se repite en 4 rutas — es del
mismo tamaño que el stock del menú del día de julio. Corregido con el usuario en el momento;
decisión: separarlo. Anotado en `backlog.md` como su propio ítem, distinto del kardex de
ingredientes completo (que ya estaba deliberadamente pausado desde el 19 de agosto).

Sin cambios de backend en ISS-075. 34/34 test suites, 458/458 tests.

**Docs:** `issues/ISS-075-agregar-manual-simplificado.md` (nuevo), `issues/ISSUES.md`,
`backlog.md` (stock en carta anotado), este archivo, `pilotos.md` (Día 11, varias entradas).
**Pendiente:** deploy a producción + verificar con la dueña que logra registrar un pedido
manual sola.

---

## 🎯 Sesión 2026-08-25 (5) — ISS-072/073/074: cobro en 1 clic, anti-parpadeo, mesa grande

**Prompt del usuario:** contó una conversación del mismo día con la dueña, dos temas:
1. *"No entiendo la función del cobro, ¿por qué son dos clics con yape? y solo uno cuando paga
en efectivo?... me confundo cuando en una mesa uno es en efectivo y 2 en yape."*
2. *"Cocina tiene un refresco de 20 segundos, a todas las zonas debes hacerle lo mismo que le
hiciste a cola... debería aparecer el número de la mesa grande, aparece el # de orden grande y
el número de mesa pequeño, debería ser al revés."*

**Cobro (ISS-072):** el paso extra "Confirmar pago" para Yape/Plin era un candado de
verificación a propósito (`utils/verificacionPago.js`), no un accidente. Antes de tocarlo
pregunté si eliminarlo era realmente lo que quería, dado el riesgo de sacar una protección
contra fraude. El usuario explicó el detalle real de uso que cambió la lectura: la dueña **ya
revisa la foto hasta 3 veces** en el camino de un pedido y aun así verifica por fuera en la app
real de Yape — el paso no le daba la confianza para la que estaba pensado. Además, comensales
evaden el paso completo eligiendo "efectivo" y pagando por Yape en persona, y hubo 2 casos de
comprobantes por un monto menor al debido que la app nunca avisó. Con esos hechos, la decisión
de la dueña fue explícita: *"redúcelo a un clic."* Implementado — un solo botón hace las 2
llamadas que antes requerían 2 taps, en los 4 lugares con el mismo patrón
(`reservas.js`/`ordenes.js`/`pedidos.js` x2). **Sin cambios de backend** — el candado del
servidor sigue vigente, solo que ahora un mismo tap lo satisface. Detalle en
`issues/ISS-072-cobro-en-un-clic.md`, incluye 2 ideas sin implementar (aviso de monto distinto
en el comprobante, corrección de método de pago post-creación).

**Anti-parpadeo (ISS-073):** Cocina refresca cada 30s (no 20 como se percibía) y, junto con
Órdenes activas y Reservas activas (ambas cada 20s), tenía el mismo parpadeo que ISS-067 ya
había arreglado — pero solo en la Cola del día, nunca portado a estos 3 paneles. Se extrajo el
mecanismo a un helper compartido `pintarSiCambio()` en `utils.js` y se aplicó a los 3 — la
Cola del día no se tocó, ya funcionaba bien.

**Mesa grande / #orden chico (ISS-074):** invertida la jerarquía visual en las 4 pantallas que
comparten el patrón (Cola, Cocina, Órdenes, Reservas) — Mesa en negrita, #orden chico y gris.
Para llevar/delivery sin mesa quedan como antes (el #orden es lo único que identifica el
pedido ahí).

Sin cambios de backend en ninguno de los 3. 34/34 test suites, 458/458 tests.

**Docs:** `issues/ISS-072-cobro-en-un-clic.md`, `issues/ISS-073-anti-parpadeo-cocina-ordenes-reservas.md`,
`issues/ISS-074-mesa-grande-orden-chico.md` (nuevos), `issues/ISSUES.md`, este archivo,
`pilotos.md` (Día 11). **Pendiente:** deploy a producción + verificar en uso real los 3.

---

## 🎯 Sesión 2026-08-25 (4) — ISS-071: "Reservas" oculto del bottom-nav

**Prompt del usuario:** contó algo que le dijo la dueña — se confunde y entra a "Reservas"
cuando quiere entrar a "Cola". Costó 3 idas y vueltas encontrar la causa exacta: al principio
investigué la lista de reservas activas (el panel `reservas.js`) pensando que el problema era
una reserva vieja del 17 de julio sin cerrar mezclada ahí — real, pero no era lo que preguntaba.
La causa real: en el **bottom-nav** (barra de acceso rápido fija abajo del celular), "Reservas"
queda en la posición del medio (Cola · Cocina · **Reservas** · Menú · Inicio) y la dueña lo toca
por error yendo hacia "Cola".

**Fix:** `owner.html` — botón `#bn-reservas` marcado `hidden` (clase CSS ya existente). Ya no
hacía falta como atajo: desde ISS-067 la Cola del día muestra las reservas del día con las
mismas acciones (`renderKanbanReserva`). El panel Reservas sigue accesible desde el menú
lateral, para historial y reservas futuras que la Cola del día no cubre.

Sin cambios de backend. 34/34 test suites, 458/458 tests.

**Hallazgos aparte, sin implementar** (quedaron documentados en
`issues/ISS-071-reservas-en-medio-bottom-nav.md`, no se tocó nada de esto):
1. El panel "Reservas activas" (`reservas.js`) parpadea en cada refresco — corre cada 20s
   (no ~5s como se percibía), pero repinta todo desde cero sin comparar cambios, el mismo
   patrón que ISS-067 ya arregló en Cola del día pero nunca se portó a este archivo.
2. No hay expiración de reservas viejas — una reserva nunca cerrada ("Completar"/"Cancelar")
   se queda en "activas" para siempre. La reserva del 17 de julio que vio la dueña es
   probablemente un caso real de esto, no un bug de renderizado.

**Pendiente:** deploy a producción.

---

## 🎯 Sesión 2026-08-25 (3) — ISS-070: Compatibilidad de platos, Opción A implementada

**Continuación** de la sesión (2) — con el punto 1 (Obligatoria/Opcional) ya resuelto, se
retomó el punto 2 pausado desde el 24 de agosto: la relación Exige/No permite sección.

**Repaso del mockup:** el usuario probó la Opción A del mockup ["Compatibilidad de
Platos"](https://claude.ai/code/artifact/76b60128-c12a-4a3b-98f8-98a937a745c3) y no entendió
la etiqueta del estado neutral "🤷 Como quiera" — se cambió a **"🔓 Puede llevar"** (mismo verbo
que "No lleva") y se agregó un botón ⓘ que despliega la explicación de los 3 estados al
tocarlo. El usuario confirmó que así se entiende mejor y eligió la **Opción A**.

**Pregunta abierta que quedó resuelta al implementar:** `requiere_seccion_id` y
`no_permite_seccion_id` son 2 columnas independientes por plato — un plato puede necesitar una
sección opcional y no llevar otra distinta a la vez. La solución: un control de 3 estados por
cada sección opcional del menú relacionada (no solo una) — con 1 sola sección opcional en el
menú (el caso real hoy) es 1 control por plato, igual que en el mockup.

**Implementado en `owner.html`/`owner.css`** — ver detalle completo en
`issues/ISS-070-compatibilidad-platos-opcion-a.md`. Reemplaza los 2 modales viejos
(`abrirRequiereSeccion`/`abrirNoPermiteSeccion`) y los 2 botones detrás de "⋯" por un control
siempre visible bajo cada plato, con el mismo tooltip ⓘ probado en el mockup. Reusa los 2
endpoints PATCH existentes, sin cambios de backend.

Sin cambios de backend. 34/34 test suites, 458/458 tests.

**Pendiente:** deploy a producción + verificar con la dueña que el control se entiende sin
explicación manual.

---

## 🎯 Sesión 2026-08-25 (2) — Explicación permanente de Obligatoria/Opcional

**Prompt del usuario:** contó que a la dueña le resulta confuso el tema "obligatorio vs
opcional" y las condiciones entre platos (Exige/No permite sección) — preguntó si se podía
explicar con UX o ya era tema de explicación manual.

**Análisis:** son dos confusiones distintas. (1) Obligatoria/Opcional es un toggle simple
(`owner.html:1790`) con palabras ya claras, pero el único feedback al tocarlo es un `toast()`
que se esfuma a los 3s (`utils.js:25`) sin explicar la consecuencia para el cliente — si la
dueña configuró el menú hace días, no queda nada en pantalla que se lo recuerde. (2)
Exige/No permite sección (ISS-046/ISS-066) es la relación entre dos elementos que ya estaba
diagnosticada y pausada el 24 de agosto (mockup "Compatibilidad de Platos" en `backlog.md`) —
esa sigue pendiente de decisión, es más difícil de resolver solo con una etiqueta porque es
lógica relacional, no un estado.

**Implementado (solo el punto 1, bajo riesgo):** línea de ayuda permanente debajo del botón
Obligatoria/Opcional en cada sección del acordeón de Configuración — ya no depende de pillar
el toast a tiempo. Texto según el estado: *"El cliente debe elegir algo aquí para poder pedir
este menú"* (obligatoria) / *"El cliente puede saltar esta sección sin elegir nada"* (opcional).

- `public/owner.html` — nuevo `<div class="mc-sec-hint-req">` en el pie de cada sección.
- `public/css/owner.css` — clase `.mc-sec-hint-req` (texto muted, 14px+, sin nuevo touch target).

Sin cambios de backend. 34/34 test suites, 458/458 tests.

**Pendiente:** el punto 2 (Exige/No permite sección) queda abierto para retomar la
conversación pausada — decidir entre las opciones A/B/C del mockup. Deploy de este cambio.

---

## 🎯 Sesión 2026-08-25 — ISS-069: deseleccionar plato opcional + tap en foto selecciona

**Prompt del usuario:** reportó que dentro del menú no se puede deseleccionar un plato una vez
elegido, ni siquiera en una sección opcional. En la misma conversación agregó un segundo
hallazgo: varios comensales (sobre todo nuevos) tocan primero la foto del plato en vez del
radio, y la foto abre un visor ampliado en lugar de seleccionar — pidió que tocar la foto
elija el plato directamente, sin abrir el zoom, razonando que al pedir no hace falta ver la
foto en grande.

**Causa raíz encontrada al investigar el primer problema:** `render()` en `menu-modal.js`
nunca marcaba el `<input type="radio">` como `checked` según la selección ya guardada. Como
`MenuModal.refresh()` reconstruye `.mm-body` con `innerHTML` completo tras cada selección
(mecanismo que ISS-066 agregó para el bloqueo de secciones en vivo), el radio recién elegido
perdía su marca visual en cada refresco — el estado interno quedaba bien, pero visualmente no
se notaba, y sin eso tampoco había forma confiable de detectar "el usuario tocó de nuevo el
plato ya elegido".

**Fix:**
- `menu-modal.js` — el radio ahora recibe `checked` según `seleccionActual`, sobrevive al
  `refresh()`.
- `menu-modal.js` + `menu.html` (nueva función `deselectMenuPlato`) — el `<label>` de cada
  plato registra en `onpointerdown` si su radio ya estaba marcado; si el usuario toca de nuevo
  esa fila (radio, texto o foto), se desmarca y se borra la selección de esa sección.
- `menu-modal.js` — se quitó el `onclick` de zoom en la foto de platos **elegibles**; tocarla
  ahora selecciona el plato como el resto de la fila. El menú fijo y la carta libre conservan
  el zoom (ahí no hay selección que hacer).

Sin cambios de backend. 34/34 test suites, 458/458 tests — sin regresión.

**Docs:** `issues/ISS-069-deseleccion-y-tap-en-foto.md` (nuevo), `issues/ISSUES.md`, este
archivo. **Pendiente:** deploy a producción + verificar en uso real con un comensal nuevo.

---

## 🎯 Sesión 2026-08-24 (4) — Mockup: descubribilidad de "Exige/No permite sección" — sin implementar

**Prompt del usuario:** continuación del punto 4 del Día 10 (Configuración/Usuarios no
descubribles) — contó que ese día sirvió "ají de gallina" como plato libre y preguntó qué
alternativa había para que la dueña configure "este plato no lleva proteína" al armar su menú,
en vez de tener que encontrar la relación "Exige/No permite sección" (ISS-046/ISS-066) escondida
detrás de "⋯". Pidió un mockup en Artifact antes de elegir.

**Mockup publicado:** ["Compatibilidad de Platos"](https://claude.ai/code/artifact/76b60128-c12a-4a3b-98f8-98a937a745c3)
— 3 alternativas lado a lado con el mismo look de `owner.html` (mismos tokens de color/tipografía),
sobre el caso real (Arroces: "ají de gallina" no lleva Proteínas, "arroz con papas" sí). Detalle
de las 3 opciones y mi lectura de cada una, portado a `backlog.md` (sección "Decisión del usuario
pendiente" junto al ícono de calendario) para no perderlo.

**Aclaración pedida por el usuario:** si el ejemplo "Arroces/Proteínas" estaba hardcodeado —
confirmado que no, `secciones_menu.nombre` es texto libre por restaurante y las relaciones son
por ID, sin nada fijo en código. Quedó una pregunta abierta sin responder: si un menú puede tener
más de una sección opcional relacionada a la vez (cambia el diseño de las 3 opciones).

**Sin implementar — el usuario pidió pausar y solo documentar** ("ya no pienso, después
continúo"). Nada de código tocado esta sesión.

**Documentación actualizada:** `backlog.md` (decisión pendiente + mockup + pregunta abierta),
`pilotos.md` (Día 10, punto 4, caso concreto vinculado al mockup).

---

## 🎯 Sesión 2026-08-24 (3) — ISS-067, ISS-068: visita en persona, Día 10 del piloto

**Prompt del usuario:** contó 3 confusiones observadas en persona con la dueña del piloto #1
("observa las tareas... solo ver dónde hay trabas") — Cola vs Reservas, stock lento de ajustar
en caliente, y reservas sin hora que "no guardaron comida". Se documentaron primero en
`pilotos.md` (Día 10 — visita en persona) con diagnóstico cruzado contra el código real; después,
en la conversación, el usuario aclaró el punto 1 con más detalle: no era una confusión de
nombres, era que las reservas sin hora quedaban invisibles en la Cola cuando el cliente llegaba.
De paso reportó que el refresco de la Cola "parpadeaba" y perdía el scroll.

**ISS-067 — Cola: reservas sin hora enterradas + parpadeo en cada refresco.**
`urgenciaItem()` en `pedidos.js` le daba urgencia fija 0 a cualquier reserva sin hora — mientras
las órdenes y reservas con hora vencida suben de urgencia con el tiempo, esa quedaba siempre al
mismo nivel, enterrada. Fix: se calcula igual que una orden (por antigüedad). También: `renderZona()`
reconstruía el DOM completo en cada poll sin comparar si algo cambió (de ahí el parpadeo) — ahora
compara una "firma" de los datos y solo repinta si cambió algo de verdad; `renderColaDesdeCache()`
preserva el `scrollTop` de `.content`. Polling bajado de 30s a 60s (pedido explícito). **Confirmado
en vivo por el usuario: "ya no hay parpadeo con el refresco de los datos".**

**ISS-068 — Stock rápido desde Cola.** La dueña no fija stock al inicio del día ("estimar las
cantidades aún no le da"), así que ajusta sobre la marcha — pero el camino normal (Configuración
→ Menú del día → sección → plato → ⋯ → Agotado) es demasiado lento en plena hora pico, y para
cuando llegaba ahí varios pedidos ya habían fallado. Fix: botón "📦 Stock" nuevo en el header de
Cola del día, abre una lista plana de todos los platos de hoy con toggle de 1 tap "⛔ Agotado" —
reusa el endpoint que ya existía, sin cambios de backend. Pendiente de probar en uso real.

**TODO 3 (reordenar "Usuarios" al grupo "Ajustes" en el sidebar) queda en pausa** — el usuario
pidió no tocarlo todavía.

**Verificación:** sintaxis (`node --check`) en ambos archivos; sin cambios de backend, suite
completa sigue en 34/34 test suites · 458/458 tests.

**Documentación actualizada:** `pilotos.md` (Día 10, diagnóstico + qué se implementó),
`issues/ISS-067-*` e `issues/ISS-068-*` (nuevos), `issues/ISSUES.md` (índice).

**Pendiente: deploy** (lo hace el usuario).

---

## 🎯 Sesión 2026-08-24 (2) — ISS-066: plato que bloquea una sección opcional (inverso de ISS-046)

**Prompt del usuario:** razonando sobre el mismo caso de ISS-046 (arroces + proteína opcional),
planteó el caso inverso — si "Arroces" tiene "ají de gallina" y "arroz con papas" y "Proteínas"
tiene "pollo" y "pescado", "arroz con papas" sí debe permitir elegir proteína, pero "ají de
gallina" no debería permitirlo — con la salvedad de que si ambas secciones fueran obligatorias,
deben permitirse siempre sin excepción. Aprobó el TODO propuesto y confirmó alcance a nivel de
**sección completa** (no por opción individual dentro de la sección).

**Diagnóstico:** `ISS-046` ya resolvió la dirección "el plato necesita más" con
`requiere_seccion_id`. Faltaba la dirección opuesta — nada impedía combinar un plato
autocontenido con una sección opcional que no necesita.

**Fix:** nuevo `componentes_menu_dia.no_permite_seccion_id` (espejo exacto de
`requiere_seccion_id`, migración idempotente). `utils/validarSeccionesMenu.js` gana una tercera
regla: bloquea la combinación solo si la sección referida es opcional en ese menú — si es
obligatoria, el bloqueo se ignora. Nuevo `PATCH …/no-permite-seccion` en `routes/menu.js`
(mismo patrón que `…/requiere-seccion`); `GET /menus-dia` y `GET /api/public/menu` devuelven el
campo nuevo. `owner.html`: badge `🚫 No permite <sección>` + acción para configurarlo (selector
filtrado a solo secciones opcionales, ya que bloquear una obligatoria no tendría efecto).

**Frontend dinámico:** `public/js/widgets/menu-modal.js` (compartido por `menu.html` y
`pensionista.html`) gana `MenuModal.refresh()` — al elegir un plato con
`no_permite_seccion_id`, la sección bloqueada se deshabilita en vivo dentro del mismo modal
("🚫 No disponible — '<plato>' ya viene completo"), sin cerrarlo. `selectMenuPlato()` limpia y
avisa si ya había una selección en la sección que el nuevo plato bloquea (cubre elegir en
cualquier orden). `agregarMenu()` valida también como red de seguridad final.

**Verificación:** `tests/validar-secciones-menu.test.js` ampliado con 4 casos nuevos (15/15).
Suite completa: **34/34 test suites, 458/458 tests**. Migración verificada corriendo contra
`database.sqlite` real (columna se crea sola, sin romper datos existentes).

**Documentación actualizada:** `issues/ISS-066-plato-no-permite-seccion-opcional.md` (nuevo),
`issues/ISSUES.md` (índice).

**Pendiente: deploy** (lo hace el usuario, por consola web o SSH — ver `deploy.md` §16).

---

## 🎯 Sesión 2026-08-24 — ISS-061 a ISS-065: día 9 y día 10 del piloto, implementado

**Prompt del usuario:** cuatro hallazgos del Día 9 del piloto #1 (2026-08-22) — status
"En preparación" poco claro, zona Cocina de la Cola del día sin botón "Listo", pedido de
reordenar Reservas (carta primero, datos después) y de poder repetir un mismo menú sin rearmarlo
— más, en el medio de la sesión, un hallazgo del Día 10 (2026-08-24 — ver corrección de fecha
más abajo): un comensal no pudo reservar por no poner hora de llegada. Pidió mockups (artifact)
antes de tocar código para los
dos cambios de flujo (reordenar Reservas, +1 mismo menú); una vez aprobados, "avanza todo".

**Corrección de fecha, Día 8:** al arrancar la sesión el usuario dio 3 fechas distintas para el
Día 8 (21, 27, luego 22 de agosto). Se verificó contra 3 fuentes commiteadas (narrativa del doc,
encabezado de sesión, fecha del commit `b369646`) — las 3 apuntaban a **2026-08-21**, consistente.
Confirmado con el usuario: Día 8 se queda en 21-08 tal como estaba; los hallazgos de esta sesión
son Día 9 (22-08) y Día 10 (23-08).

**Mockup:** artifact publicado con marcos de teléfono antes/después para Reservas y para "+1
mismo menú" (concepto "comanda de cambios" — solo referencia de flujo, no del diseño final
pixel a pixel). Aprobado por el usuario.

**ISS-061 — status "En preparación" confuso:** copy cambiado a "Ya estamos cocinando tu pedido"
en `STATUS_MAP` de `menu.html`.

**ISS-062 — sin botón "Listo" en zona Cocina:** `btnOrden()`/`btnReserva()` en `pedidos.js` no
manejaban `zona === 'cocina'`. Agregado, simétrico con "↩️ Regresar a cocina" (ISS-055).

**ISS-063 — Reservas: carta primero, datos después:** `#res-panel` ya no tiene el formulario
completo arriba — solo un selector de fecha compacto + la carta. Datos del comensal (modalidad,
hora, nombre, teléfono) + resumen + confirmar se movieron a un drawer nuevo (`#res-drawer`),
mismo patrón que `#cart-drawer`. `scripts/test-iss048-volver-pago.js` y `scripts/test-gate-pago.js`
actualizados al nuevo flujo (abren el drawer antes de llenar los campos).

**ISS-064 — "+1 mismo menú":** cada unidad sigue siendo su propia fila del carrito (compatible
con la numeración de grupos de ISS-041), agrupadas visualmente con un stepper + atajo "+1 mismo
menú" al agregar. Aplica a Pedir y Reservar. E2E nuevo: `scripts/test-repetir-menu.js` (17/17).

**ISS-065 — reserva sin hora bloqueada por error (Día 10):** en el medio de implementar lo
anterior, el usuario contó que un comensal no pudo reservar sin poner hora. Se encontró que
`validarHorarioReserva()` caía a validar "¿abierto AHORA?" (fecha de hoy, no la de la reserva)
cuando no había hora — el usuario lo asumió como error de diseño propio y pidió corregirlo en el
momento: sin hora, la reserva debe pasar **siempre** (el campo es solo informativo, no hay ningún
paso automático que lo use). Corregido en `utils/horarioAtencion.js` + `routes/public.js`;
`tests/horario-atencion.test.js` reescrito para el nuevo contrato. Queda pendiente (no
implementado): un tooltip junto al campo explicando que es opcional.

**Corrección de fecha (misma sesión, más tarde):** el "Día 10" quedó anotado originalmente como
2026-08-23 (domingo) — mal fechado. El restaurante piloto no abre domingos, así que el hecho no
pudo pasar ese día; confirmado con el usuario que fue el mismo 2026-08-24. Corregido en
`pilotos.md` (con nota permanente sobre el horario del local para no repetir el error).

**Verificación:** 454/454 jest (bajó de 457 por consolidar 7 tests de horario en 4, mismo
cubrimiento). E2E corridos contra servidores locales temporales (puertos 3399 y 3311, apagados
al terminar): `test-iss048-volver-pago.js` (15/15), `test-gate-pago.js` (24/24, con `plin_activo`
reactivado temporalmente en la BD dev para completar el flujo y revertido después),
`test-grupo-punta-a-punta.js` (13/13), `test-modalidad-mixta.js` (19/19),
`test-iss049-recuperar-pago.js` (12/12), `test-repetir-menu.js` nuevo (17/17). Botón "Listo" de
zona Cocina verificado invocando `btnOrden`/`btnReserva` directo (sin E2E dedicado — mismo patrón
que botones ya cubiertos).

**Documentación actualizada:** `pilotos.md` (Día 9 y Día 10, con corrección de fecha del Día 8),
`issues/ISS-061-*` a `issues/ISS-065-*` (nuevos), `issues/ISSUES.md` (índice).

**Deploy confirmado 2026-08-24** — el usuario lo hizo manual por SSH: `git pull origin main`
(`1b38b57..c269fb1`, fast-forward), `pm2 restart menupro`, `pm2 status` → online,
`curl /health` → `{"status":"ok"}`.

---

## 🎯 Sesión 2026-08-21 (noche) — ISS-059, ISS-060: diagnóstico del Día 8 del piloto, sin implementar

**Prompt del usuario:** dos hallazgos del Día 8 del piloto #1 — "Pedro, no puedo devolverla para
que se cuente como menú?" (la cocinera canceló un pedido por error) y una pregunta de negocio
sobre cómo bajan la app sus pensionistas / si conviene subirla a Play Store. Pidió solo
documentar y pushear — sin implementar código todavía.

**ISS-059 — revertir pedido cancelado:** distinto de `ISS-055` (donde el backend ya permitía el
regreso), acá `orders.js:440`/`reservations.js:282`/`orders.js:707` **bloquean explícitamente**
cualquier cambio una vez `es_cancelado` — es un estado terminal a propósito, y cancelar además
devuelve stock (`devolverStock`). Restaurar exige relajar esa regla, re-descontar stock (con el
caso de que ya no alcance) y decidir a qué estado "aterriza" (propuesto: `es_en_cocina`, mismo
criterio que ISS-055) ya que no hay historial de en qué zona estaba antes de cancelar. Los
pedidos cancelados tampoco aparecen en ninguna zona de la Cola del día hoy. Diagnosticado,
**sin implementar** — ver `ISS-059`.

**ISS-060 — acceso de pensionistas:** se descartó Play Store (fricción de cuenta de
desarrollador + revisión, sin aportar nada a un comensal que ya conoce el restaurante puntual)
a favor del mecanismo de instalación PWA que ya existe (`pwa-install.js`). Se diagnosticó que
hoy el único camino a `pensionista.html` es que el dueño dicte de palabra `menupro.tech/login`
— no hay QR ni link desde `menu.html`. Se plantearon 3 opciones (QR al login genérico, ruta
propia `/pensionista`, enlace desde `menu.html`) y el usuario eligió la tercera: un enlace
"¿Eres pensionista?" en el header de `menu.html`, junto al botón "Consultar mi reserva".
Diagnosticado y decidido, **sin implementar** — ver `ISS-060`.

**Documentación actualizada:** `pilotos.md` (Día 8, con las citas textuales), `issues/ISS-059-*`
e `issues/ISS-060-*` (nuevos), `issues/ISSUES.md` (índice, sección "Fix pendiente"),
`backlog.md`.

**Sin cambios de código, sin tests nuevos, sin deploy** — queda para una próxima sesión
implementar ambos.

---

## 🎯 Sesión 2026-08-21 (tarde) — ISS-056: rediseño de la nota de "cómo volver de Yape/Plin"

**Prompt del usuario:** la nota agregada hoy más temprano (ver sesión de abajo) "tiene buena
intención pero no se entiende" — pidió diseñar primero un artifact con opciones antes de tocar
código.

**Proceso:** 3 mockups en un artifact (escalera numerada con línea conectora, checklist con
íconos por fila, nota conversacional), todos sobre la tarjeta de pago real a 360px con la
paleta/tipografía de `menu.css`. El usuario eligió mezclar escalera + checklist, y pidió
invertir el énfasis: número grande (marca el orden), emoji chiquito en la esquina (detalle).

**Implementación:** `volverInstruccionHtml()` en `menu.html` ahora recibe `appNombre` ('Yape' o
'Plin' según el método elegido en `seleccionarMetodoPago()`) y arma 3 pasos numerados con línea
conectora:
1. 💚 Anda a tu app **Yape/Plin** y paga el monto.
2. 📸 Captura la foto del comprobante con tu celular.
3. ↩️ Vuelve a esta página **(no la cierres)** y adjunta tu foto.

Colores tomados de las variables de `menu.css` (`--accent`, `--surface`, `--border`, `--text`)
en vez de colores sueltos como antes. Detalle completo en `issues/ISS-056-...md`.

**Verificación:** 457/457 jest sin regresiones.

**Deploy:** commit `1b38b57` pusheado a `main` y desplegado por el usuario en producción el
2026-08-21 (`9ea9a51..1b38b57`, `git pull` fast-forward, `pm2 restart`, `/health` →
`{"status":"ok"}`).

---

## 🎯 Sesión 2026-08-21 — ISS-055, ISS-056, ISS-057, ISS-058: día 7 del piloto

**Prompt del usuario:** recopilación de 4 hallazgos de la visita del día anterior (2026-08-20,
"Día 7" del piloto #1) — cocinera, dueña y clientes — más un comentario de un cliente sin
acción de producto. Ver el registro completo, con las citas textuales, en `pilotos.md` →
"Día 7 (2026-08-20, jueves)".

**ISS-055 — sin forma de regresar un pedido de "Listo" a "Cocina":** la cocinera mandó pedidos
a Listo por error y no podía deshacerlo. El backend ya aceptaba el cambio de flag hacia atrás
(`orders.js`/`reservations.js` solo bloquean pagado/cancelado) — solo faltaba el botón. Nuevo
"↩️ Regresar a cocina" en la zona Listos de la Cola del día (`pedidos.js`), por ítem individual
(reusa `accionRapidaOrden`/`accionRapidaReserva`, sin cambios de backend).

**ISS-058 — Historial de Órdenes no mostraba la foto del comprobante:** la dueña preguntó por
las fotos pasadas para revalidar cobros. El diagnóstico inicial ("ya existe, es solo
descubribilidad") fue corregido en la misma sesión tras confirmar con el usuario que en
producción no se ve. Causa real: `GET /api/orders` nunca seleccionaba `metodo_pago`,
`estado_pago`, `comprobante_url` ni los campos de duplicado — el frontend (`ordenes.js`) ya
sabía pintarlos, pero la condición para mostrarlos siempre daba falso. `GET /api/reservations`
no tenía el bug. Se agregaron las columnas faltantes al `SELECT`.

**ISS-056 — cliente sin saber cómo volver a la app tras pagar por Yape/Plin:** distinto de
`ISS-049` (el pedido ya no se pierde) — era confusión de navegación. Bloque de instrucción
nuevo bajo el número de Yape/Plin en `menu.html`, solo en esos 2 métodos.

**ISS-057 — tamaño de letra ajustable en la carta del cliente:** un cliente no alcanzaba a leer
las letras. `ISS-028` (2026-08-10) había cubierto solo `owner.html` — quedó anotado como
pendiente en `backlog.md`. Se portó el mismo mecanismo (`--font-scale` en `<html>`, aplicado
antes del paint): 63 declaraciones de `font-size` en `menu.css` convertidas de `px` a `rem`,
botón 🔤 nuevo en el header (3 niveles: Normal/Grande/Muy grande), `localStorage` con clave
propia (`mp-font-scale-menu`, separada de la del panel).

**Sin acción de producto:** el comentario de un cliente ("mejor manejar todo por lápiz") —
lectura registrada en `pilotos.md`, probablemente ligado a la misma fricción de ISS-056.

**Verificación:** 457/457 jest sin regresiones en las 4. Sin tests E2E nuevos — los cuatro son
cambios acotados (un botón que reusa mecanismo existente, columnas agregadas a un SELECT, texto
estático, y una conversión de unidades CSS) sin lógica de negocio nueva que amerite un script
Playwright propio; pendiente verificar ISS-057 a mano en un celular real (360px) antes del
próximo servicio.

**Deploy:** commit `9ea9a51` pusheado a `main` y desplegado por el usuario en producción el
2026-08-21 (`e35eb4a..9ea9a51`, `git pull` fast-forward, `pm2 restart`, `pm2 status` → online).

---

## 🎯 Sesión 2026-08-20 — ISS-054: stock por plato no se respetaba en "Agregar manual"

**Prompt del usuario:** "al momento de hacer un ingreso manual ahora mismo no leyó el kardex,
es decir seguían apareciendo platos y a algunos comensales también les aparecía el kardex del
día anterior. ¿Puedes revisar lo del stock de los platos?"

**Diagnóstico:** se revisó todo el flujo de `stock_inicial`/`stock_restante` por plato del menú
del día (lo que el usuario llama "kardex" — el kardex de ingredientes de verdad todavía no
existe, ver `backlog.md`). Se confirmó un bug real: el picker de "Agregar manual" (sumado en
ISS-053) filtraba los platos elegibles solo por `agotado`, nunca por `stock_restante` — un plato
sin porciones seguía apareciendo elegible si nadie lo había marcado "Agotado" a mano, a
diferencia de `menu.html` que ya filtraba ambas condiciones desde siempre. El segundo síntoma
reportado ("a algunos comensales les aparecía el kardex del día anterior") **no se pudo
reproducir por código** — fecha (Lima, tanto frontend como backend), filtro por `dia` y el
Service Worker (nunca cachea `/api/*`) están todos correctos; el usuario aceptó que probablemente
fue un error de cuentas del owner, no un bug.

De paso se verificó y confirmó con el usuario que el descuento de stock ocurre exactamente al
CONFIRMAR el pedido/reserva (no antes, no después) en los 4 puntos de entrada: orden y reserva
del cliente (`routes/public.js`), orden del mozo/manual (`routes/orders.js`) y reserva del owner
(`routes/reservations.js`) — todos llaman `descontarStock` dentro de la misma transacción del
INSERT, y se devuelve al cancelar.

**Fix:** nueva función compartida `platoDisponibleManual(p)` en `pedidos.js` —
`!p.agotado && (p.stock_restante === null || p.stock_restante > 0)` — reemplaza el filtro
`!p.agotado` en los dos lugares del picker (`renderManualSeccion`, `abrirPickerManual`).

**Verificación:** `scripts/test-agregar-manual.js` sumó un fixture de plato con
`stock_restante = 0` (sin marcar "Agotado") y confirma que no aparece en el `PlatoPicker`.
**30/30** (antes 28) + 457/457 jest sin regresiones. Detalle completo en
`issues/ISS-054-stock-agregar-manual.md`.

**Deploy:** commit `e35eb4a` pusheado a `main` y desplegado por el usuario en producción el
2026-08-20 (`1658902..e35eb4a`, `pm2 restart`, `/health` → `{"status":"ok"}`).

---

## 🎯 Sesión 2026-08-19 (parte 9) — ISS-053: "Agregar manual" con fotos + carta

**Prompt del usuario:** "el tema del menú manual, está bien pero no puede ser más visual (bonito)
como en menu.html, o sea algunas ideas de mockup?".

**Diagnóstico:** el `<select>` de texto plano por sección era el único selector de plato de toda
la app sin foto. Revisando el código apareció que **ya existía el widget que hacía falta**:
`PlatoPicker` — grid de fotos, ya cargado en `owner.html`, ya usado en producción para armar
secciones de menú en Configuración. Cero widget nuevo que construir.

**Mockup primero** (mismo criterio que ISS-047 y Pensionistas): 2 estados reusando los tokens
reales de `owner.css` — el chip nuevo que reemplaza al `<select>`, y `PlatoPicker` abierto
encima. <https://claude.ai/code/artifact/0dfcfb2a-7fdc-494f-ab31-156ce87850a8>. Se aprovechó para
marcar una pregunta aparte, no pedida: "Agregar manual" solo tenía menú del día, nada de carta.
El usuario aprobó sumarla también.

**El cambio:** chip nuevo (vacío: "+ Elegir [sección]"; con selección: foto + nombre + "cambiar")
que abre `PlatoPicker.open()`. Foto de portada en la card del menú (misma prioridad que
`menu.html`). Sección "Carta" nueva con el mismo patrón card+stepper — `POST /api/orders` ya
aceptaba `carta_items`, cero cambios de backend. Detalle en
`issues/ISS-053-agregar-manual-con-fotos.md`.

**Verificación:** `scripts/test-agregar-manual.js` (ya existía) actualizado — pasó de usar
`page.selectOption()` sobre un `<select>` a interactuar con `PlatoPicker` de verdad, más una
rama nueva de menú+carta juntos. **28/28** + 457/457 jest + `test-modalidad-mixta` 19/19 sin
regresiones.

---

## 🎯 Sesión 2026-08-19 (parte 8) — ISS-052: el pensionista no podía cambiar su contraseña

**Prompt del usuario:** el pensionista no tiene forma de cambiar su propia contraseña.

**Diagnóstico:** `owner.html` ya tenía "🔑 Cambiar contraseña" (modal → `PATCH
/api/auth/me/password`). El backend de ese endpoint solo exige `authenticate`, no filtra por
rol, y opera sobre `req.user.id` contra `usuarios` — donde el pensionista ya vive. Cero cambios
de backend necesarios: era puramente un hueco de UI en `pensionista.html`, que no tenía nada
equivalente.

**El cambio:** botón "🔑 Contraseña" junto a "Salir" + modal, mismo patrón que `owner.html`
(contraseña actual + nueva + confirmar, mismas validaciones), llamando al mismo endpoint
compartido. Detalle completo en `issues/ISS-052-pensionista-sin-cambiar-password.md`.

**Verificación:** `scripts/test-pensionista-password.js` nuevo, **12/12** — valida los 4 casos de
error, y confirma el cambio de verdad (la contraseña vieja deja de servir para loguear, la nueva
sí funciona — no solo que el modal cierra sin error). 457/457 jest + `test-pensionista-cliente`
29/29 sin regresiones.

---

## 🎯 Sesión 2026-08-19 (parte 7) — ISS-050 (número de pedido) + ISS-051 (comprobante duplicado)

**Prompt del usuario:** dijo que desplegaba ISS-049 ahora mismo (sin confirmación explícita
todavía — sigue en la lista de pendientes de deploy hasta que la mande). Aprobó el diseño
propuesto para la detección de comprobante duplicado ("avisar, no bloquear") y, de inmediato,
contó otro incidente del Día 5: una clienta dijo *"mi orden de pedido me sale 96"* pero la dueña
solo veía órdenes del 1 al 22 — con la hipótesis correcta ya adelantada por el usuario (la
pantalla del comensal no se reinicia por día, la de la dueña sí).

**ISS-050 — diagnóstico:** confirmado exactamente lo que sospechaba el usuario. El owner ya veía
`numero_dia` (1, 2, 3… por restaurante y por día, `ROW_NUMBER() OVER (PARTITION BY o.fecha ORDER
BY o.id ASC)` en `routes/orders.js`) en Cola del día/Órdenes/Cocina. `POST /api/public/orders`
nunca lo calculaba ni lo devolvía, así que `menu.html` no tenía otra opción que mostrarle al
comensal el id crudo de la tabla — un autoincrement que nunca se reinicia. Fix: el endpoint
calcula `numero_dia` con el mismo criterio y lo devuelve; `menu.html` lo usa en la confirmación
en los dos caminos que crean una orden (con pago y sin pago). Las reservas no tienen este
problema — usan código aleatorio, no número secuencial, por diseño.

**ISS-051 — comprobante duplicado:** implementado según lo aprobado. `utils/comprobanteDuplicado.js`
nuevo (hash SHA-256 + búsqueda de coincidencias en `ordenes`/`reservas` del mismo restaurante,
excluyendo el propio registro). Columnas `comprobante_hash`/`comprobante_repetido_de`/
`comprobante_repetido_tipo` nuevas. `comprobanteThumb()` (compartida por Órdenes, Reservas y
Cola del día) pinta el aviso — el comensal no ve nada distinto en ningún caso.

**Verificación:** `scripts/test-numero-dia-pedido.js` (10/10) y `tests/comprobante-duplicado.test.js`
(8/8) + `scripts/test-comprobante-duplicado.js` (7/7) nuevos. 457/457 jest + `test-iss049` 12/12,
`test-iss048` 15/15 y `test-modalidad-mixta` 19/19 sin regresiones. Un test jest existente
(`cola-dia.test.js`) tenía su propio esquema de tabla en memoria, sin las columnas nuevas —
corregido.

**Documentación actualizada:** `issues/ISS-050-...md` e `issues/ISS-051-...md` (nuevos),
`issues/ISSUES.md`, `pilotos.md` (Día 4 e Incidente 3 del Día 5), `status.md` (esta entrada).

---

## 🎯 Sesión 2026-08-19 (parte 6) — ISS-049: el pedido se pierde al salir a pagar

**Prompt del usuario:** dejó el restore de prueba y la copia externa de backups para el fin de
semana. Preguntó si quedaba algo pendiente de los inputs de la señora (sí: detección de Yape
duplicado, sin implementar) y contó un incidente nuevo del Día 5: una persona salió a pagar por
Yape y al volver la página "había expirado", con la frase textual de la dueña sobre el riesgo de
que la gente se aburra de usar la app. Pidió implementarlo ya, por esa prioridad.

**Diagnóstico:** `menu.html` no persistía nada del pedido en curso — ni `localStorage` ni manejo
de ciclo de vida de la página. En un celular de gama media, Chrome puede descargar la pestaña de
fondo mientras el comensal está pagando en otra app y recargarla de cero al volver — se pierde
todo lo que vivía en memoria. No es un caso raro: es el camino normal de pago del sistema.

**El cambio:** se guarda `pagoPendiente` en `localStorage` desde que el comensal elige un método
de pago (`seleccionarMetodoPago()`) — el punto justo antes de salir a pagar —, y de nuevo si ya
se creó la orden/reserva en el backend (evita duplicarla en un reintento). `init()` restaura ese
estado al cargar, con un toast "Recuperamos tu pedido". La foto del comprobante no se persiste
(un `File` no sobrevive un `JSON.stringify`) — hay que volver a adjuntarla si ya la había
elegido. Se limpia al confirmar con éxito, al volver a la carta (ISS-048) o al reiniciar todo.
Detalle completo en `issues/ISS-049-pedido-se-pierde-al-salir-a-pagar.md`.

**Verificación:** `scripts/test-iss049-recuperar-pago.js` nuevo, **12/12** — usa `page.reload()`
para simular el caso real (borra la memoria, conserva `localStorage`, igual que Chrome matando
una pestaña de fondo): arma el carrito, elige método, recarga, confirma que vuelve solo a la
pantalla de pago con el mismo total y método marcado, que se puede terminar de confirmar sin
duplicar la orden, y que una visita nueva después no trae de vuelta nada viejo. 449/449 jest +
`test-iss048-volver-pago` 15/15 y `test-modalidad-mixta` 19/19 sin regresiones (mismo archivo).

**Documentación actualizada:** `issues/ISS-049-...md` (nuevo), `issues/ISSUES.md`, `pilotos.md`
(Día 5, con la frase textual de la dueña), `status.md` (esta entrada).

---

## 🎯 Sesión 2026-08-19 (parte 5) — T6: el backup llevaba 3 meses fallando en silencio

**Prompt del usuario:** confirmó el deploy de Pensionistas Fase 1+2 e ISS-048, preguntó de qué
trataba T6, y pidió revisar primero si ya existía un backup antes de armar uno nuevo — sospecha
correcta, del primer deploy (29 de mayo).

**Diagnóstico, guiando al usuario por SSH** (Claude no tiene acceso al servidor): el script y el
cron existían, pero `/var/www/menupro/backups/` nunca se había creado. `cat` del script mostró la
causa exacta: faltaba la línea `mkdir -p /var/www/menupro/backups` que sí tiene la versión
documentada en `deploy.md` §7. Sin ella, `cp` no podía crear el archivo — y como el `echo "Backup
creado: ..."` final no depende de si el `cp` funcionó, el log (`/var/log/backup-menupro.log`)
mostraba "Backup creado" seguido del error de `cp`, todas las noches desde el 29 de mayo, sin que
nadie lo notara.

**Esto resuelve una duda que quedaba abierta desde antes:** el incidente del 2026-08-16 (el owner
creyó haber perdido menús y platos — era caché, ISS-044) tuvo como respuesta real "no hay
backup". Ahora se sabe por qué: el cron llevaba meses "corriendo" sin producir nada.

**Fix:** una línea. El usuario reescribió el script con el `mkdir -p` agregado y lo corrió a
mano — primer backup real creado, 241 KB (tamaño correcto de `database.sqlite`). El cron no
necesitó ningún cambio, ya estaba bien puesto (3am diario).

**Lo que queda de T6:** probar un restore real al menos una vez (tener el archivo no alcanza si
nunca se confirmó que se puede volver a levantar la app con él) y copiar los backups a un lugar
externo al servidor. Ninguno de los dos se hizo todavía.

**Documentación actualizada:** `deploy.md` §7 (historia completa del bug + script corregido),
`status.md` (esta entrada), `backlog.md` (T6).

---

## 🎯 Sesión 2026-08-19 (parte 4) — Documentación de pilotos + ISS-048

**Prompt del usuario:** puso al día `pilotos.md` — faltaban los días 4 y 5 del piloto (el
documento saltaba del Día 3 directo a la sesión de ISS-047), el nombre del restaurante (Karina
Menú, menupro.tech/karinamenu) y confirmó que el 12 de agosto fue miércoles, no martes. Después
confirmó que ISS-048 lo encontró él mismo probando, no la dueña, y pidió arreglarlo ya que
Pensionistas quedó cerrado.

**Documentación:** reconstruidos Día 4 (2026-08-17) y Día 5 (2026-08-18) cruzando lo que recordaba
el usuario contra `status.md`, que ya tenía todo el detalle en sesiones anteriores — no hacía
falta inventar nada, solo trasladarlo. Corregidos los días de la semana de la tabla de retoma
(estaban corridos uno). `pensionista.html`, además de nuevo, pasa a estar en `.claude/CLAUDE.md`
como lectura obligatoria de inicio de sesión y en la regla de documentación, con la fecha
explícita como requisito — el hueco de días 4-5 se generó justamente por no llevarla.

**ISS-048:** implementado. Botón `←` en `#pago-screen` + `volverDePago()` — oculta la pantalla y
reabre el drawer si es un pedido (la reserva no cierra nada, alcanza con ocultar). Confirmado
seguro sin gate adicional: en ese punto del flujo todavía no se crea ni la orden ni la reserva.
Detalle técnico completo en `issues/ISS-048-sin-volver-desde-pago.md`.

**Verificación:** `scripts/test-iss048-volver-pago.js` nuevo, **15/15** (pedido y reserva: llega a
pago, vuelve, nada se crea de más, el carrito sigue intacto, confirmar de nuevo funciona igual,
touch target 46px, sin overflow a 360px) + 449/449 jest + `test-modalidad-mixta` 19/19 sin
regresiones (mismo archivo tocado, `menu.html`).

---

## 🎯 Sesión 2026-08-19 (parte 3) — Pensionistas, Fase 2: `pensionista.html`

**Prompt del usuario:** pull seguro al empezar (traía ISS-047 y Pensionistas Fase 1 de la otra
laptop, confirmó ISS-047 ya desplegado), una pregunta de negocio sobre si tiene sentido separar
modalidad por línea también en reservas (se anotó la respuesta, sin tocar código), otra sobre si
la dueña ya ve el saldo de cada pensionista (sí, desde la Fase 1; se le explicó que el ledger de
movimientos ya soporta cualquier reporte futuro sin rediseñar nada), un bug reportado de
`menu.html` (sin forma de volver desde "¿Cómo vas a pagar?" — anotado como **ISS-048**, sin
implementar) y, por último, "terminemos la parte B de los pensionistas".

**Mockup primero** (como en ISS-047): 6 pantallas armadas con el CSS real de `menu.html`, dos
decisiones marcadas para aprobar — <https://claude.ai/code/artifact/10d9848f-0a00-4ff6-a5f6-44aa50452038>.
El usuario aprobó sin objetar los defaults propuestos (modalidad a nivel de pedido completo, no
por ítem; cancelar sin ventana de tiempo) y dio luz verde a implementar.

**Lo hecho:** `public/pensionista.html` nuevo — saldo siempre visible, menú del día + carta
(mismo `MenuModal` que `menu.html`, sin duplicar la lógica de secciones/validación condicional),
confirmar sin pantalla de pago, "Mis pedidos" con estado en vivo y cancelar. `public/css/pensionista.css`
nuevo, capa sobre los tokens de `menu.css`. Detalle de decisiones y arquitectura en `features.md`.

**Lo que no era obvio hasta mirar el código:** `pensionista.html` no estaba en la lista de
archivos a los que `app.js` les inyecta `__BUILD__` (`PLANTILLAS`), ni en el hash que lo calcula
(`utils/buildVersion.js` `RUTAS`) — de no corregirlo, el archivo hubiera quedado sirviendo el
placeholder `__BUILD__` literal en sus URLs de CSS/JS y expuesto exactamente al bug de fondo de
ISS-044 (versiones mezcladas por caché). Se sumó a ambos + al precache del SW.

**Verificación:** `scripts/test-pensionista-cliente.js` nuevo — **29/29** (flujo feliz, saldo
insuficiente, baja lógica, sin sesión, sin overflow a 360px, touch targets ≥44px) + 449/449 jest
+ `test-panel-pensionistas` 30/30 y `test-modalidad-mixta` 19/19 sin regresiones. Un bug propio
del test (no del producto): las dos pensionistas de prueba se logueaban reusando el mismo
contexto de Playwright que el owner, pisándole la cookie de sesión a mitad de la corrida —
corregido usando un contexto de browser propio por login.

**Pendiente:** commitear y avisar al usuario para que confirme cuándo lo despliega (junto con la
Fase 1, que sigue sin deployar).

---

## 🎯 Sesión 2026-08-19 (parte 2) — Pensionistas, Fase 1: el panel del owner

**Prompt del usuario:** "avancemos con pensionistas entonces" — el segundo de sus tres frentes.
Se propuso partirlo en dos entregas y aprobó: **Fase 1** el panel del owner (sirve sola: la
dueña ya puede poner gente en cuenta y recargarle), **Fase 2** `pensionista.html`.

**El punto de partida:** el backend estaba **entero y montado desde el 2026-08-11** — 12
endpoints con 3 archivos de tests — y **sin una sola pantalla**. No había que decidir nada de
negocio (`pensionistas.md` §6 lo especifica campo por campo); era construir sobre una API que ya
funcionaba. Por eso no se hizo mockup: el panel es un calco de `usuarios.js`.

**Lo hecho:** `public/js/modules/pensionistas.js` + panel en `owner.html` + CSS. Alta con saldo
inicial, recarga con nota, historial desplegable, editar, contraseña, baja lógica reversible.
Cards en vez de tabla — el saldo es lo que la dueña mira de reojo y en 360px una tabla lo
esconde. Detalle en `features.md`.

**Dos cosas que faltaban y bloqueaban de verdad:**
- `login.html:420` no tenía `pensionista` en `ROLE_REDIRECT`: **un pensionista que entraba iba a
  `undefined`**. Ya estaba anotado el 2026-08-19 parte 1 y acá se corrigió.
- `GET /api/menu/restaurante/config` no devolvía `pensionista_saldo_aviso`, así que el panel no
  podía saber a partir de qué saldo avisar. Se agregó (2 líneas).

**Bug encontrado por el test, no por revisión:** `.pen-movs` tenía `display:flex`, que pisa el
`display:none` que el navegador da a `[hidden]` — el botón de Movimientos abría pero no cerraba.
Regla `[hidden]` explícita.

**Verificación:** `scripts/test-panel-pensionistas.js` nuevo, **30/30** (ciclo completo, validaciones
de alta, redirect del login, sin overflow a 360px, touch targets ≥44px) + **449/449 jest** +
`test-menu-wizard` 51/51 y `test-modalidad-mixta` 19/19 sin regresiones. Panel revisado por captura.

### ⚠️ Ojo antes de desplegar esta fase sola

`pensionista.html` **todavía no existe** (es la Fase 2). El redirect del login ya apunta ahí, así
que **un pensionista que inicie sesión hoy cae en un 404**. El panel del owner funciona perfecto
y la dueña puede dejar todo armado, pero **no conviene repartirles credenciales hasta la Fase 2**.
La alternativa es desplegar las dos fases juntas.

### Fase 2 — lo que falta

`pensionista.html` según `pensionistas.md` §9: saldo siempre visible, menú del día + carta,
carrito → confirmar **sin pantalla de pago**, mensaje claro si el saldo no alcanza, y "Mis
pedidos" con estado en vivo. **Empezar por el mockup** — es pantalla nueva con decisiones
reales, a diferencia de esta fase.

---

## 🎯 Sesión 2026-08-19 — ISS-047: un menú para llevar y otro para comer acá

**Prompt del usuario:** tras el deploy del día anterior, planteó **tres frentes**: (1) cerrar la
seguridad de pagos —la pregunta de la señora el día 4: *"¿qué pasa si un chico comparte su pago
de Yape con otro y ambos envían la misma captura?"*—, (2) avanzar pensionistas para que tengan
saldo en cuenta en vez de mandar foto o pagar en efectivo, y (3) un **error nuevo del día 5**:
una persona pidió 2 menús, uno para llevar y otro para comer ahí, y el sistema no deja
separarlos. Eligió arrancar por el (3).

**Lo que se verificó de los otros dos, para retomarlos con datos** (ninguno tocado todavía):
- **Pagos:** cero detección de duplicados. `routes/public.js` guarda el comprobante como
  `comp-<id>-<timestamp>.jpg` y no compara nada. El agujero es real. Lo barato es hashear el
  archivo al subirlo y avisar si ese hash ya se usó — **con la salvedad** de que un hash de
  bytes solo atrapa el archivo idéntico (reenviar la misma imagen por WhatsApp, que es el caso
  que ella describió); si el segundo le saca captura a la captura, el hash no lo agarra.
- **Pensionistas:** el **backend ya está entero y montado** — `routes/pensionistas.js` (alta,
  recarga, movimientos) y `routes/pensionista.js` (saldo, pedidos, pedir, cancelar), con 3
  archivos de tests. Falta **todo el frontend**: `owner.html` no menciona la palabra ni una vez,
  no existe `pensionista.html`, no hay módulo JS. Y `login.html:420` **no tiene `pensionista` en
  `ROLE_REDIRECT`**, así que hoy un pensionista que entra va a `undefined`.

**El diseño se cerró sobre mockups** de las **dos** vistas (pedido suyo: decidir también el lado
del restaurante antes de tocar la app), renderizados con el CSS real:
<https://claude.ai/code/artifact/80079977-29bb-4d6a-be75-7c0c5f8c192e>. Eligió **A2** (comensal)
y **B2** (cocina). Una pregunta suya sobre A2 destapó un error en el mockup: mostraba «Todo
aquí» marcado con un menú en «Para llevar», un estado imposible; se corrigió y se agregaron los
3 estados del selector.

**El cambio:** `modalidad` baja a las líneas (`utils/modalidadPedido.js` nuevo, compartido). La
columna del pedido se conserva como resumen derivado con un valor nuevo, `mixto`, así que las 4
vistas que hoy leen `o.modalidad` no se tocan. Detalle completo en `ISS-047` y `features.md`.

**Dos cosas que aparecieron al implementar, ninguna pedida:**
- **Un cobro de más que ya existía:** el envase se cobraba por el pedido entero. El caso del día
  5 —1 para llevar + 1 para comer ahí— cobraba **2 tappers en vez de 1**.
- **Las órdenes nunca validaron `para_llevar_activo`.** Con la modalidad por línea el hueco se
  agrandaba, así que se cerró en órdenes y reservas sobre las líneas ya normalizadas.

**Una regresión propia, detectada y corregida antes de terminar:** al pasar el cargo a "solo lo
que se lleva", el **delivery** dejaba de cobrar envase — y en delivery viaja todo, así que todo
va envasado. Se separó ese caso.

**Verificación:** 19/19 unitarios nuevos + 19/19 E2E punta a punta + **449/449 jest**;
`test-grupo-punta-a-punta` 13/13 y `test-menu-wizard` 51/51 sin regresiones. Las dos vistas se
revisaron **por captura**, no solo por asserts.

**Ojo con `scripts/test-gate-pago.js`:** falla en este entorno, pero **falla igual sin estos
cambios** (comprobado con `git stash`). Es un fallo previo por datos locales del restaurante #1,
no una regresión. También hardcodea el puerto **3311**, no respeta `PORT` — igual que
`test-grupo-punta-a-punta.js`.

**Fuera de alcance, a propósito:** el selector por menú se hizo en el **pedido** (el caso del
día 5 es una orden de mesa). La **reserva** conserva su selector de pedido completo; el backend
la normaliza igual y todas sus líneas heredan esa modalidad, así que no se rompe nada.

---

## 🎯 Sesión 2026-08-18 (parte 2) — Fix del conteo de menús + tarjeta "Menús de hoy"

**Prompt del usuario:** "menús vendidos, primero corregir el conteo de menús + añadir esa nueva
caja de menús vendidos en el día a día" — retoma el P0 del día 4 del piloto.

**El bug (resuelto):** `reportes.js` calculaba "Menús pedidos"/"Menús reservados" en el
**frontend**, dividiendo `filas / total de secciones del menú` (`/api/menu/menus-dia` trae TODAS
las secciones, obligatorias + opcionales). Con secciones opcionales sin pedir, subcontaba — el
backend ya tenía la lógica correcta y probada (`contarUnidadesMenu()`, `utils/menuPricing.js`,
usada por `calcularTotalOrden`/`calcularTotalReserva` para cobrar bien), pero nunca se usaba para
este conteo.

**El fix:** el cálculo se movió al backend. `GET /api/reportes/kpis` ahora arma las filas de
`menu_items` (con `requerido` + `total_obligatorias`, mismo JOIN que ya usa `utils/totales.js`)
y llama `contarUnidadesMenu()` directamente — sin reimplementar la lógica en JS del navegador.
Como `total_obligatorias` es constante por `id_menu_dia`, sumar las filas de TODAS las
órdenes/reservas del restaurante antes de dividir da el mismo resultado que sumar los conteos de
cada una por separado (verificado con test dedicado) — permite un solo cálculo agregado en vez
de iterar orden por orden. `reportes.js` (frontend) dejó de pedir `/api/menu/menus-dia` para esto
y solo consume los 3 campos nuevos de `/kpis`.

**La tarjeta "Menús de hoy":** nueva, primera en la grilla de Análisis (junto a "Menús
pedidos"/"Menús reservados", que ya estaban). Suma órdenes + reservas de **hoy** que ya están
**cobradas o entregadas** (`es_pagado`/`es_entregado` en órdenes, `es_full`/`es_cliente_llego` en
reservas — mismo criterio que ya usa la zona "Por cobrar" de la Cola del día). Decisión leída del
backlog: "adicional a las 2 actuales, va primera" — las "2 actuales" son justamente "Menús
pedidos"/"Menús reservados".

**Verificación:**
- `tests/menu-pricing.test.js`: 8 tests nuevos para `contarUnidadesMenu()` (no tenía tests
  directos, solo se probaba indirecto vía el cargo de tapper). Incluye el caso real del bug
  (secciones opcionales sin pedir) y la propiedad de agregación entre varias "órdenes" pooled
  de la que depende `reportes.js`.
- `scripts/test-menus-vendidos.js` nuevo, **9/9** — arma un menú con 2 obligatorias + 1 opcional,
  crea 3 pedidos que solo piden las obligatorias, confirma que el conteo da 3 (la fórmula vieja
  habría dado `Math.round(3×2/3) = 2`, subcontando), que "Menús de hoy" solo cuenta lo
  cobrado/entregado (2 de los 3 — el tercero se deja pendiente a propósito), y que la tarjeta
  nueva aparece primera en la UI real.
- `scripts/test-agregar-manual.js` (sesión anterior) sigue en 19/19, sin regresiones.
- **430/430 jest** (423 + 7 nuevos de `contarUnidadesMenu`).

**Estado:** hecho y **desplegado** — el usuario juntó este commit (`14ce74f`) con `bc593a4`
("Agregar manual") en un solo deploy el 2026-08-18.

---

## 🎯 Sesión 2026-08-18 — Botón «Agregar manual» en la Cola del día

**Prompt del usuario:** implementar el pedido pendiente del día 4 del piloto — 4 clientes no
pudieron usar la app (2 se rehusaron, 1 sin internet, 1 sin celular). La dueña necesita anotar
mesa + nombre + menú(s) de palabra, y que el pedido vaya directo a cocina, con el pago por
defecto en "efectivo" para no trabar el cobro. El usuario marcó un caso a resolver: si el
restaurante no tiene "efectivo" activo en su configuración de pagos, marcarlo igual sería
confuso. Tras una pregunta de confirmación (aviso visual claro vs. gate real de confirmación,
como Yape/Plin), el usuario eligió **aviso visual, sin gate** — el cobro sigue siendo un solo
paso.

**Diseño implementado:**
- Columna nueva `es_manual` en `ordenes` — identifica el *origen* del pedido, independiente de
  `metodo_pago`. Antes esa señal no existía; un pedido tomado a mano y uno de la app con
  `metodo_pago=NULL` eran indistinguibles.
- `metodo_pago = 'efectivo'` solo si el restaurante tiene `efectivo_activo=1`; si no, queda
  `NULL`. El comportamiento de cobro es idéntico en ambos casos (ni efectivo ni NULL piden
  confirmación previa, a diferencia de yape/plin) — el cambio es solo que nunca se etiqueta un
  pedido con un método que el restaurante dice no aceptar.
- `estado_pago` queda `NULL` siempre — evita que se pinte el badge "Pendiente confirmación"
  (pensado para comprobantes de yape/plin), que sería falso para un cobro en mano.
- Badge propio **"🧾 Pedido manual · Confirmar pago al cobrar"** (`badgeManual()` en
  `ordenes.js`), visible en Órdenes y en la Cola del día, sin depender de `metodo_pago`.
- La orden entra con estatus **"En cocina" directo** (no "pendiente") — sin el tap extra de
  "→ Preparando" que sí tienen los pedidos de la app.
- Reutiliza `POST /api/orders/` (`routes/orders.js`), que ya existía autenticado y sin ningún
  frontend llamándolo — ya hacía `validarSeccionesMenu` (ISS-046) y `descontarStock`; solo se le
  agregó el parámetro `manual`.
- Modal nuevo en `owner.html` (botón "+ Agregar manual" en el header de la Cola del día): mesa
  (select de `/api/mesas/estado`), nombre del cliente, y selector de menú(s) del día con
  stepper de cantidad + un `<select>` por sección (obligatoria marcada con `*`) — reutiliza
  `GET /api/menu/menus-dia` (misma fuente que usa `menu-wizard.js`). Lógica en `pedidos.js`.

**Verificación:** `scripts/test-agregar-manual.js` nuevo, **19/19** — cubre ambas ramas de
`efectivo_activo` (con y sin), que el pedido entra directo a "En cocina", que nunca aparece un
badge "💵 Efectivo" contradictorio, que la sección obligatoria del menú sigue bloqueando el
envío si falta elegirla (ISS-046), y 0 errores de consola. `tests/cola-dia.test.js` necesitó
agregar `es_manual` a su schema in-memory. **423/423 jest** sin regresiones.

**Estado:** hecho y **desplegado** — el usuario confirmó el deploy el 2026-08-18 en la tarde,
junto con `14ce74f` (fix del conteo de menús, sesión de arriba) en un solo commit desplegado.

---

## 🎯 Sesión 2026-08-17 (parte 5) — «Descargar menú» como foto para WhatsApp

**Prompt del usuario:** pull de lo trabajado en la otra laptop y, tras revisar el backlog,
retomar el pedido de la dueña del día 4: *"para que la señora saque su foto del menú que
genera"*. Precisión suya sobre el alcance: es el **menú del día**, vive en **Configuración de
menús** justo debajo de «Configurar» y «Copiar a otro día», la etiqueta es **«Descargar
menú»**, se exporta como foto, y **hacerlo barato está bien**. Pidió mockup antes de codear.

**Cómo se decidió:** se renderizaron 3 variantes (A solo texto, B con portada, C con foto por
plato) con el CSS y las fotos reales del proyecto. La recomendación inicial fue **B**, con el
argumento de que la C se llenaría de placeholders porque casi ningún plato tiene foto.
**El usuario corrigió el dato:** esa carencia es de la BD local, no de producción — la dueña
**ya tiene todas sus fotos cargadas**. Con eso la objeción a la C caía, y eligió **B+C**. Se
rediseñó y se implementó esa. *(Lección: no inferir el estado de producción desde la BD de
desarrollo.)*

**El cambio:** `public/js/widgets/menu-export.js` (nuevo, autocontenido) + botón `data-export`
en `menuCard()` de `menu-wizard.js` + `<script>` en `owner.html` + entrada en el precache de
`sw.js`. **0 endpoints, 0 migraciones, 0 dependencias** — los datos y las URLs de las fotos ya
estaban en memoria. El `BUILD` automático (T0) tomó el archivo nuevo solo, porque `RUTAS`
incluye el directorio `js` completo.

**Lo que destapó mirar la imagen generada.** Los 18 checks numéricos pasaban y el lienzo estaba
mal: con una grilla fija de 3 columnas, una sección de 1 o 2 platos dejaba **dos tercios de
fila vacíos**. Se cambió a grilla adaptativa (1-3 platos ocupan la fila entera, 4 se parte 2+2,
5+ van de a 3; con 1 plato va centrado y con tope de 600px) y la miniatura escala con el ancho
para conservar la proporción. **Ninguna medida automática podía detectarlo** — hizo falta
exportar el JPEG y verlo.

**Verificación:** `scripts/test-menu-export.js` nuevo, **25/25** (medidas, color de la banda
leído por píxel, alto dinámico contra la fórmula del diseño para secciones de 1 a 7 platos,
descarga real con su nombre, aviso si el menú no tiene platos, 0 errores de consola).
**423/423 jest** y **51/51** de `test-menu-wizard.js` sin regresiones. Imagen final revisada a
ojo tras el fix.

**Desplegado el 2026-08-17** (confirmado por el usuario), commits `9c9de62` (la feature) y
`32c8fb0` (el copy del pie).

**Detalles del diseño ya cerrados, no volver sobre ellos:** el pie dice «Reserva ahora» +
el link del menú; los agotados van en gris, tachados y con chip «Agotado»; los menús ocultos se
pueden descargar igual (sirve para preparar la imagen del día siguiente). El ancho siempre es
1080px y el alto es dinámico.

---

## 🎯 Sesión 2026-08-17 (parte 4) — ISS-046: plato exige sección condicional + día 4 del piloto

**Prompt del usuario:** recopilación del día 4 del piloto (cocinera adaptándose bien, dueña
todavía no, 4 clientes que no pidieron por la app, pedido de un contador "menús de hoy") y,
como hallazgo central, el incidente real: un plato "arroz con papas fritas" pedido sin su
proteína porque el sistema no distinguía platos autocontenidos de platos que sí la necesitan.
Ver `ISS-046` para el detalle técnico completo.

**El cambio:** `componentes_menu_dia.requiere_seccion_id` (nullable, genérico — no hardcodea
"proteína") + `utils/validarSeccionesMenu.js` nuevo, compartido por los 4 endpoints que crean
pedidos/reservas (`orders.js`, `reservations.js`, `public.js` ×2). Valida **por instancia de
menú** (agrupando por `grupo`, ISS-041) para no dejar pasar una instancia incompleta
"prestándose" la selección de otra — mismo patrón de bug que el encontrado en el conteo de
`reportes.js` (ver abajo). UI en `owner.html` para marcar el plato + bloqueo real en
`menu.html` al armar el pedido.

**De paso, dos hallazgos que no eran parte del pedido original:**
1. **Bug de conteo en `reportes.js`** ("Menús pedidos"/"Menús reservados"): divide por el total
   de secciones del menú en vez de por las obligatorias — subcuenta cuando hay secciones
   opcionales. **Queda pendiente de arreglar** (no se tocó en esta sesión, prioridad P0 para la
   próxima). La lógica correcta ya existe en `utils/menuPricing.js::contarUnidadesMenu()`
   (usada para el cobro) — falta que `reportes.js` la reuse en vez de su propio cálculo.
2. **Conteo de tests inflado**: un git worktree abandonado en `.claude/worktrees/` (del
   2026-08-11) hacía que `npx jest` contara sus tests duplicados — 758 en vez de los 412 reales.
   Se agregó `testPathIgnorePatterns` al jest de `package.json`. El worktree en sí no se pudo
   borrar (el comando fue bloqueado por el clasificador de permisos) — pendiente de que lo
   borre el usuario: `git worktree remove --force .claude/worktrees/foamy-moseying-nebula`.
   Se corrigieron los "758/758" ya anotados en `ISS-045` y en la sesión de T0, arriba.

**Backlog nuevo del día 4 del piloto** (ver `backlog.md` para el detalle y la razón de cada
prioridad):
- 🔴 P0: bug de conteo en `reportes.js` (arriba).
- 🟡 P1: cajita "Menús de hoy" en Análisis (menús cobrados + entregados, filtrado a hoy, suma
  órdenes + reservas) — depende del P0.
- 🟡 P1: botón "Agregar manual" en la cola, para los clientes que no pueden usar la app (hoy 4:
  2 se rehusaron, 1 sin internet, 1 sin celular) — entra directo a cocina con status "validar
  pago".
- 🟢 P2: imagen descargable del menú para compartir por WhatsApp (complementaria al link).
- 🟢 P2 / backlog explícito: fiados/pago diferido (cliente sin dinero que promete pagar
  después) — el usuario lo bajó de prioridad a propósito.
- Sin definir todavía: validar comprobantes de pago (yape) duplicados o reenviados — problema
  real mencionado por la dueña, sin alcance definido aún.

**Verificación:**
- `tests/validar-secciones-menu.test.js` nuevo, 11/11 (incluye el caso real del incidente y el
  de múltiples instancias del mismo menú en un pedido).
- Suite completa: **32/32 suites, 423/423 tests**.
- Migración de schema verificada localmente (columna se crea sola, no rompe datos existentes).

**Estado:** resuelto, **desplegado 2026-08-17** (confirmado por el usuario, commit `a47d132`).
Backup mínimo ya hecho antes del deploy (ver sesión de abajo) — falta el T6 completo
(script + cron + restore verificado).

**Documentación actualizada:** `issues/ISS-046-plato-exige-seccion-condicional.md` (nuevo),
`issues/ISSUES.md`, `backlog.md` (T6 + prioridades del día 4), `status.md` (esta entrada).
Falta trasladar los hallazgos del día 4 a `vision_negocio.md` si corresponde — pendiente para
el cierre de una sesión futura.

---

## 🎯 Sesión 2026-08-17 (parte 3) — Backup mínimo antes de ISS-046

Antes de desplegar la migración de ISS-046 (ver sección propia abajo), se corrió el backup
mínimo de `deploy.md` §7 por SSH en el Droplet:

```bash
cd /var/www/menupro && cp database.sqlite ~/database-$(date +%F-%H%M).sqlite
```

**Confirmado:** `/root/database-2026-08-17-2354.sqlite`, 233472 bytes (no vacío). De paso
aparece otro backup manual previo del mismo día, `database-ANTES-DE-TOCAR-2026-08-17-0006.sqlite`,
no registrado hasta ahora en este log.

**Esto NO es T6 completo** — es el mínimo (`cp` puntual) para tener un punto de retorno antes
de este deploy puntual. Falta el script `backup.sh` + cron diario + un restore de prueba
verificado (`deploy.md` §7, `backlog.md` T6) para que deje de ser la deuda de mayor riesgo del
proyecto.

---

## 🎯 Sesión 2026-08-17 (parte 2) — T0: `BUILD` automático por hash

**Prompt del usuario:** "sí en orden, T0" — retomando la lista de `backlog.md`, después de
cerrar ISS-045. El diseño ya estaba decidido en la sesión del 16, solo faltaba escribirlo.

**El cambio:** `utils/buildVersion.js` dejó de exportar un número escrito a mano (`'11'`) y
ahora calcula un **hash sha1** del contenido de `owner.html`, `menu.html`, `owner.css`,
`menu.css` y todo `js/`, una sola vez al arrancar el servidor. Mismo código → mismo hash (un
`pm2 restart` sin cambios no invalida cachés de nadie); código distinto → hash distinto (toda
URL de asset cambia junta). `sw.js` queda fuera del cálculo para no generar recursión — guarda
el placeholder `__BUILD__` en disco, igual que antes. Con `try/catch`: si la lectura de disco
falla por lo que sea, cae a `Date.now()` en vez de dejar la app sin arrancar.

**Por qué importaba:** era el único paso manual que dejó ISS-044 — subir el número en cada
cambio de `public/`. Si alguien se olvidaba, volvía exactamente ese bug (panel vacío que
parece pérdida de datos). Ahora es imposible olvidarlo porque no hay nada que subir.

**De paso (incluido en el mismo TODO):** `owner.html:1161` — el auth guard hacía
`window.location.replace('/login.html')` sin cortar la ejecución; la línea siguiente leía
`session.name` con `session` en `null` y tiraba un `TypeError` de consola en toda visita sin
sesión. El apunte de `backlog.md` decía "se arregla con un `return`", pero al mirar el código
resultó que ese `<script>` es top-level, no una función — un `return` ahí es `SyntaxError` y
hubiera roto el bloque entero para todo el mundo. Se resolvió con `throw` de un error
controlado después de disparar el redirect: corta el resto del script igual que un `return` lo
haría dentro de una función, sin el riesgo de sintaxis inválida.

**Verificación:**
- 412/412 jest (corregido 2026-08-17: el "758/758" anotado originalmente contaba duplicado
  un git worktree abandonado en `.claude/worktrees/` — ver ISS-046).
- `scripts/test-version-assets.js` — 25/25 contra un servidor real, con el hash real
  (`1fc212d9`, 8 hex) en vez de un número. Confirma que `utils.js` y `cocina.js` siempre piden
  la misma versión.
- Determinismo verificado aparte: dos cálculos consecutivos sobre el mismo código dan el mismo
  hash.

**Documentación actualizada:** `deploy.md` §6.1 (ya no hay número que subir, ni en la laptop ni
en el servidor), `features.md` (ARCH de ISS-044/T11), `status.md` y `issues/ISS-044-...md`
(los avisos de "subir BUILD a mano" quedaron marcados como superados, sin borrar el registro
histórico de por qué existían).

**Estado:** resuelto, **desplegado 2026-08-17** (confirmado por el usuario, junto con ISS-045 e
ISS-046 en el mismo deploy — commit `a47d132`).

---

## 🎯 Sesión 2026-08-17 — ISS-045: link del menú roto al abrirlo desde otra app

**Prompt del usuario:** compartió `issues/screenshots/dontget.jpeg` — "solo pasa en la app,
cuando hago clic en el link de karinamenu, me da ese error, pero en web, entrando manualmente
a la url sí me aparece el menú". Antes de esto, pull seguro (fast-forward, sin conflictos) que
trajo los 8 commits del cierre de la sesión del 16 (ver sección de abajo).

**Diagnóstico:** la captura mostraba `Cannot GET /Karinamenu` (K mayúscula). El slug se guarda
siempre en minúsculas (`routes/menu.js`), pero la búsqueda en `app.js` (`slug = ?`) era
case-sensitive en SQLite. Cuando el link se abre desde otra app (WhatsApp, notas), la
autocorrección del teclado suele capitalizar la primera letra antes del tap — el navegador
tipeado a mano no tiene ese problema porque el usuario lo escribe en minúsculas.

**Fix:** `COLLATE NOCASE` en las dos consultas de resolución de slug (`/:slug` y
`/:slug/:mesa`) en `app.js`. Verificado con 3 variantes de mayúsculas contra el mismo
restaurante (302 los tres) + slug inexistente sigue en 404 + 412/412 jest (número corregido
2026-08-17, ver ISS-046). Detalle completo en
[ISS-045](issues/ISS-045-slug-case-sensitive.md).

**Estado:** resuelto, **desplegado 2026-08-17** (confirmado por el usuario, commit `a47d132`).

---

## 📍 DÓNDE ESTAMOS — cierre de la sesión del 2026-08-16

> ⚠️ **Superado por el deploy del 2026-08-17** (commit `a47d132`, confirmado por el usuario) —
> ver el bloque "DÓNDE ESTAMOS" nuevo al principio de este archivo. Se deja este bloque viejo
> como registro histórico, sin corregirlo línea por línea.

**Lo que está en producción** (deploy `291c15b`, hecho por el usuario ese día): los 3 issues
críticos del piloto — **ISS-040** (monto visible al pagar), **ISS-041** (dos menús separados en
el ticket) y **ISS-042** ("para llevar" en cocina).

**Lo que está hecho pero SIN DESPLEGAR:** `e12d13b` (ISS-044 + T11, el versionado de assets y
el precache del SW) y `02a5bc2` (`deploy.md` actualizado). `BUILD` ya está en `11`, así que ese
deploy no requiere tocar nada.

**Lo que quedó a medio camino, y es por donde hay que seguir:** el `BUILD` automático por hash
— "las 15 líneas". Está **decidido y diseñado**, con el código propuesto y los puntos finos ya
resueltos en `backlog.md` → sección **T0**. No hace falta volver a pensarlo, solo escribirlo.

**Por qué importa T0:** el fix de ISS-044 dejó un paso manual (subir `BUILD` en cada cambio de
`public/`). Si alguien se lo olvida, vuelve exactamente el bug que acabamos de arreglar: el
panel vacío que parece pérdida de datos. Un aviso en la documentación no alcanza; hay que
eliminar el paso.

**Lo más riesgoso que sigue abierto:** **T6, el backup de la BD**. Van dos migraciones de
esquema desplegadas sobre datos reales del piloto sin ningún backup. El 2026-08-16, cuando el
usuario creyó haber perdido todos sus menús, la respuesta honesta a "¿restauramos el backup?"
fue **no hay**.

**Decisión pendiente del usuario, sin bloquear nada:** elegir variante (**A**, B o C) para el
ícono de calendario que reemplaza al emoji 📅 — hoy dibuja "17 de julio" fijo al lado de la
fecha real de cada reserva. Las 3 variantes están renderizadas y medidas en las 3 escalas de
letra del panel; el alcance de los 17 usos ya está clasificado (ver `backlog.md`).

---

## 🎯 Sesión 2026-08-16 (parte 3) — ISS-044 + T11: que un deploy no pueda dejar el panel vacío

**Prompt del usuario:** "hagamos ISS-044 y T11 juntos", después del susto del panel vacío.
Comparten causa raíz: **los assets no tenían ninguna estrategia de versión ni de precache**.

### El fix: una sola perilla

`utils/buildVersion.js` exporta `BUILD`, y **es el único número que se toca por deploy**. Los
HTML y el `sw.js` guardan el placeholder `__BUILD__` en disco; `app.js` lo reemplaza al
servirlos, con un middleware que va antes de `express.static` y que ante cualquier fallo cae
a servir el archivo tal cual — la app nunca queda inaccesible por esto.

Con eso, los 17 assets locales de `owner.html` y los 2 de `menu.html` se piden como
`/js/modules/utils.js?v=11`. **Al subir `BUILD` cambian todas las URLs a la vez**, así que es
imposible que el navegador sirva un `utils.js` viejo junto a un `cocina.js` nuevo, que fue
exactamente lo que vació el panel.

Detalles que importan:
- **`ASSETS` del SW pasó de 7 a 22 entradas** (T11): antes no había **ni un solo** módulo JS
  precacheado, así que cada arranque los pedía a la red uno por uno.
- **`cache: 'reload'` al precachear.** Sin esto `addAll` puede guardar dentro del SW una copia
  vieja que el navegador tenía dando vueltas: el mismo bug, pero fosilizado.
- **Los HTML van *stale-while-revalidate*.** Son los únicos sin `?v=`, así que los únicos que
  podrían quedar viejos: se sirven del caché (rápido) y se revalidan de fondo.
- **Chart.js y qrcodejs pasaron a `defer`** — ~200 KB de CDN que bloqueaban el primer pintado
  sin usarse al abrir. `charts-theme.js` también, para que siga ejecutándose *después* de
  Chart.js (si no, ve `Chart` undefined y los gráficos pierden el tema).
- **Las fuentes dejaron de bloquear el render** (`media="print"` + `onload`), con `<noscript>`
  de respaldo y `preconnect` a `fonts.gstatic.com`, que faltaba.

### Lo que quedó fuera, y por qué

El tercer punto de T11 era **`defer` en los 15 `<script>` locales**. No se hizo: el bloque
inline de `owner.html:1138` llama a `leerSesion()` en el nivel superior y define las funciones
globales que usan los `onclick` del HTML. Los `defer` se ejecutan **después** de los inline, así
que el guard reventaría con `leerSesion is not defined` y la app no arrancaría. Sacarlo exige
mover ~1200 líneas de inline a un archivo: refactor propio, no algo para mezclar con un cambio
de caché teniendo un piloto activo.

### Verificación

- `scripts/test-version-assets.js` — **25/25** contra el servidor: ningún `__BUILD__` sin
  reemplazar, ningún asset local sin versionar, `sw.js` con la misma versión que el servidor,
  los 16 scripts de `owner.html` en `ASSETS`, las 19 URLs versionadas responden 200, y el
  chequeo que define el bug: **`utils.js` y `cocina.js` piden la misma versión**.
- `scripts/test-sw-precache.js` — **11/11** en Chromium real: el SW instala, queda **un solo
  caché** (`menupro-v11`), precachea **17 módulos JS** (antes 0), y en la segunda visita los
  assets se sirven sin tocar la red. Verifica además que cargar las páginas **no tire ningún
  error de JS**, que era el síntoma exacto.
- `npx jest` → **412/412**.

**Medición del arranque, sin adornos:** con red limitada (~1,6 Mbps, 150 ms de latencia) y 4
corridas alternadas, `menu.html` mejoró de **569 → 538 ms** al primer pintado y bajó de **13 a
6 recursos** en el camino crítico. Es una mejora modesta, no espectacular, y en `owner.html` no
se pudo medir de forma confiable en local. **La ganancia real de T11 no está en esos
milisegundos sino en el precache**, que es lo que ataca el síntoma reportado ("la primera
apertura no entra, la segunda sí") y eso sí está verificado en navegador.

> ⚠️ **Cambiaba el procedimiento de deploy** — ✅ **superado por T0 (2026-08-17)**: `BUILD`
> pasó de número escrito a mano a hash automático, ya no hay nada que subir. Ver sección T0
> más abajo. Se deja este párrafo como registro de por qué existía el paso manual en su
> momento.

**Encontrado de paso (menor):** `owner.html:1145` hacía `window.location.replace()` en el
auth guard sin cortar la ejecución; la línea siguiente leía `session.name` con `session` en
`null` y tiraba un error de consola en toda visita sin sesión. No impedía el redirect.
✅ **Arreglado 2026-08-17 junto con T0** — no con `return` como se había anotado acá (el
`<script>` es top-level, no una función; `return` ahí es `SyntaxError`), sino con `throw` de
un error controlado después de disparar el redirect, que sí corta el resto del script.

**Pendiente: deploy.**

---

## 🎯 Sesión 2026-08-16 (parte 2) — ISS-041: los 3 críticos del piloto quedaron cerrados

**Prompt del usuario:** seguir con ISS-041. Antes de decidir la forma del agrupamiento pidió
**ver las opciones renderizadas**, y después pidió verlas también **con la letra grande**.

### Las decisiones se tomaron sobre mockups, no sobre descripciones

Se publicó una hoja de decisión con las opciones dibujadas **con el CSS real de `owner.css` a
360 px**, no con aproximaciones. Cuatro decisiones, todas del usuario:

1. **Sin backfill** de pedidos viejos — quedan con `grupo = NULL` y se pintan planos.
2. **Encabezado por menú** (`🍽️ Menú 1`), no recuadro ni número al costado.
3. **Numerar siempre**, aunque los menús sean de tipos distintos.
4. **El nombre del menú solo cuando el pedido mezcla tipos.**

**La 4 salió de medir, no de opinar.** Al renderizar la opción elegida en las 3 escalas
tipográficas reales del panel (16,1 / 19,6 / 23,8 px — la dueña usa las grandes) apareció que
el encabezado largo "🍽️ Menú 1 · Menú del día" **parte en dos líneas en la escala Máxima** y
suma 50 px al ticket (552 → 602 px). El corto aguanta en una línea en las tres. Como el caso
normal es que los dos menús sean del mismo tipo, ahí el nombre no aportaba nada y costaba
esos 50 px. **Ninguna escala desborda a lo ancho**, que era el riesgo real a 360 px.

### El fix, en 5 capas

1. **Esquema** — `grupo INTEGER DEFAULT NULL` en `orden_menu_items` y `reserva_menu_items`,
   migración idempotente en `config/database.js`.
2. **Armado del pedido** — `numerarGrupos()` en `menu.html` reemplaza al `flatMap` pelado que
   era donde se perdía el dato. Numera por **posición en el carrito**: si el comensal borra un
   menú antes de confirmar, se recalcula sin huecos.
3. **Escritura** — los **4** INSERT guardan `grupo`, incluido el que convierte una reserva en
   orden (ahí se hereda; si no, se perdía en el traspaso). Todos con `item.grupo ?? null`,
   así un `menu.html` viejo cacheado no rompe nada.
4. **Lectura** — `grupo` + `menu_nombre` en los SELECT de detalle de `colaDia.js`,
   `orders.js` (×3), `reservations.js` (×2) y `public.js`. **No se tocaron** los de
   `stock.js`, `totales.js` ni `reportes.js`: suman cantidades, el agrupamiento les da igual.
5. **Render** — una sola `renderMenuAgrupado()` en `utils.js` para las 4 vistas
   (`cocina.js` ×2, `ordenes.js`, `reservas.js`, `pedidos.js`). Cada vista pasa su formato de
   línea, que en las 4 es distinto; el agrupamiento vive en un solo lugar. Nueva clase
   `.menu-grupo-head` en `owner.css`.

**El alcance real era mayor que el del diagnóstico:** el issue hablaba de 2 archivos de
backend; hay **4 INSERT y 8 SELECT** de `orden_menu_items` y otros tantos de
`reserva_menu_items`.

### Lo que se dejó fuera a propósito

`contarUnidadesMenu()` (`utils/menuPricing.js`) deduce cuántos menús físicos hay contando
filas de secciones obligatorias, con un caso borde documentado que **subestima** cuando el
menú no tiene secciones obligatorias. Con `grupo` ese conteo se podría hacer exacto — pero
afecta el **cobro del tapper** (Gap 5), no la vista. Queda anotado en el issue, sin tocar.

### Verificación

- `npx jest` → **412/412 verde**, 31 suites (408 + 4 nuevos en `tests/cola-dia.test.js`,
  incluido uno que confirma que **el total no cambia** por agregar la columna). Hubo que
  agregar `menus_dia` al fixture del test, que no la tenía.
- `scripts/test-menus-agrupados.js` — **26/26**, sin navegador (`vm`): incluye pedidos viejos
  sin grupo, huecos en la numeración, ítems desordenados y escape del nombre del menú.
- `scripts/test-grupo-punta-a-punta.js` — **13/13**, cadena completa por HTTP real contra
  `POST /api/public/orders`: cada grupo conserva la combinación exacta que eligió el comensal
  y llega así hasta el ticket. Crea el pedido de prueba y lo borra.
- Visual a 360 px con `owner.css`, claro y oscuro, escalas Normal y Máxima: **sin overflow
  horizontal en ninguna combinación**, con los 4 casos juntos (2 menús iguales, 2 de tipos
  distintos, 1 solo menú, pedido viejo).

SW bumpeado a **`menupro-v10`**: cambian `menu.html` (numera los grupos al confirmar) y
`owner.css` (`.menu-grupo-head`), los dos precacheados — sin el bump, un celular con la PWA
instalada seguiría mandando pedidos sin `grupo`.

### ⚠️ Incidente post-deploy — falsa alarma de pérdida de datos (ISS-044)

Minutos después del deploy, el usuario reportó que **no aparecía ningún menú ni ningún plato**
en el panel, y preguntó cómo restaurar el backup. **No se perdió nada:** la BD quedó intacta
(223 KB) y todo reapareció **cerrando sesión y volviendo a entrar**.

**Qué se descartó, en este orden:**
1. Que el `git pull` hubiera pisado la BD → `database.sqlite` está en `.gitignore` y **nunca
   estuvo trackeada** en ningún commit.
2. Que la migración borrara datos → `ALTER TABLE ADD COLUMN` es aditivo.
3. Que el no-backfill lo causara → solo deja `grupo = NULL` en `orden_menu_items`; no toca
   menús ni platos.

**Causa real:** el navegador quedó con archivos de dos versiones mezclados. `owner.html` está
en `ASSETS` del SW y se renovó con el bump a `v10`; los módulos JS **no están en `ASSETS` ni
llevan versión en la URL**, así que el navegador pudo servir un `utils.js` viejo junto a un
`cocina.js` nuevo. Como en este deploy `badgeModalidad()` se mudó a `utils.js` y se agregó
`renderMenuAgrupado()`, la mezcla revienta con `ReferenceError` y **el render se corta: las
listas quedan vacías con los datos intactos**.

**Lo importante no es el susto, es lo que casi pasa:** el síntoma ("no hay ningún plato") se
lee como pérdida de datos, y la reacción natural es restaurar un backup **encima de una base
sana**. Con T6 pendiente, ni siquiera había backup reciente al que volver. Abierto como
**ISS-044** 🔴 y subido al tope del backlog, junto con T6.

---

### ✅ DESPLEGADO 2026-08-16 — `291c15b`

Lo hizo el usuario por SSH: `git pull` + `pm2 restart menupro`. La app quedó `online` y
`/health` respondió `{"status":"ok"}`.

**Producción venía de `1a85a89`, no de `120da5f`:** el mismo deploy subió además la
documentación del Día 2 y 3 del piloto (`1ce00ac`, `7e3dc76`, `120da5f`) y el fix de ISS-039
ya estaba, pero los docs que lo confirmaban no. Los 3 issues críticos entraron juntos:
**ISS-040, ISS-041 y ISS-042 están en producción.**

**Era la primera migración de esquema con el piloto ya cargando datos reales.** Corre sola al
arrancar (`config/database.js`), y el arranque limpio + `/health` ok indican que no falló —
si el `ALTER TABLE` hubiera reventado fuera del `try/catch`, la app no habría levantado.
Queda por confirmar a mano que las columnas existen (`PRAGMA table_info`), y **sigue
pendiente el backup de T6**, que se desplegó sin él.

---

## 🎯 Sesión 2026-08-16 — ISS-040 e ISS-042 implementados (2 de los 3 críticos)

**Prompt del usuario:** pull del repo avisando primero de los cambios sin commitear, y
después implementar **ISS-040 e ISS-042 juntos** + commitear la captura huérfana.

**Antes de tocar nada — los cambios locales sin commitear resultaron ser:**
- `features.md`: un salto de línea accidental **en medio de la palabra "mostraba"**
  (`mos`/`traba`). Sin contenido nuevo, se descartó.
- 3 capturas sin trackear del 2026-08-11, que **ningún issue referenciaba**. `backlog.md`
  T10 ya tenía la respuesta de la sesión anterior: `opcional_1/2.png` **no eran issue**
  (confirmado por el usuario en su momento) — **borradas a su pedido, nunca llegaron a
  git**; y `visualización_fecha.png` sí alimenta el futuro **ISS-037**, así que esa se
  commiteó: vivía solo en una de las 2 laptops.

**Pull:** fast-forward limpio de 11 commits (`ee0194c` → `120da5f`), sin conflictos.

### ISS-040 — monto a pagar visible en la pantalla de Yape/Plin

El total ya se calculaba en `pagoPendiente.total` (incluye cargo por tapper y tarifa de
delivery); lo único que faltaba era pintarlo. Nuevo bloque **"Total a pagar"** en
`#pago-screen` (`public/menu.html`), y `showPagoStep()` lo llena.

El detalle que no estaba en el diagnóstico: el bloque va **`position:sticky; top:0`**. El
hueco real no era solo entrar a la pantalla, sino **bajar a subir el comprobante** — sin
sticky el monto se va arriba justo cuando el comensal vuelve de su app de Yape con la
captura, que es el momento exacto que reportó la dueña. Sirve igual para efectivo.

`public/sw.js` → **`menupro-v9`**: `menu.html` está en `ASSETS`, sin el bump los celulares
con la PWA instalada seguirían viendo la pantalla vieja (ISS-022).

### ISS-042 — la etiqueta "para llevar" ahora llega a cocina

`modalidad` ya viajaba desde el backend (`utils/colaDia.js`), `cocina.js` no la leía.

**`badgeModalidad()` se movió de `ordenes.js` a `utils.js`** en vez de duplicarla: es el
mismo widget que ya usaban Órdenes, Reservas y Cola del día, y copiarlo dejaba 4 versiones
del mismo badge. Además, desde `utils.js` **deja de depender del orden de los `<script>`**
de `owner.html`, donde `cocina.js` se carga *antes* que `ordenes.js` (líneas 18 y 19) —
llamarla desde cocina.js con la función viviendo en ordenes.js funcionaba solo por
casualidad del timing de runtime.

Nuevo parámetro `grande` para el ticket de cocina (11px → 15px) sin alterar las otras tres
pantallas. El badge va **en línea propia** entre el header y los platos: en 360px competía
con el badge de estatus si iba en el header, y va antes de los platos porque es lo que
define cómo se emplata.

### Verificación

Dos scripts nuevos de verificación manual, siguiendo el patrón de
`scripts/test-photo-modal-zindex.js` (no forman parte de la suite jest):

- `scripts/test-monto-pago-visible.js` — Playwright a 360×600. **9/9**: monto visible,
  24px, 2 decimales, sin overflow horizontal, **sticky confirmado con la pantalla
  scrolleada al fondo** (`y=56`), visible también con efectivo y coincidente con el repaso.
- `scripts/test-badge-modalidad-cocina.js` — sin navegador ni servidor: los `render*` de
  cocina solo devuelven strings, así que carga `utils.js` + `cocina.js` en un contexto de
  `vm`. **15/15**, incluyendo que una orden **sin** la propiedad `modalidad` (registros
  viejos) no imprima `"undefined"`.

`npx jest` → **408/408 verde**, 31 suites.

> ⚠️ **Corregido en esta sesión — el conteo de tests decía "754/754":** ese número aparecía
> en 9 lugares (`status.md` ×4, `backlog.md` D1, `ISSUES.md`, `ISS-038`, `ISS-039`) y **no
> correspondía a nada medible**: la suite tiene 31 archivos y 381 `it()`/`test()` literales,
> que jest expande a **408 casos**. Ni los `expect()` sumados (600) llegan a 754.
>
> **Verificado que no fue una regresión, no una suposición:** se contaron los `it()`/`test()`
> de `tests/` en los 4 commits del 2026-08-13 donde se anotó el 754 (`1a85a89`, `b351e88`,
> `b38f106`, `a1e9755`) → **31 archivos y 381 casos en todos, idéntico a hoy**. Además
> `git log --diff-filter=D` sobre `tests/*.test.js` no devuelve nada: **nunca se borró un
> archivo de test** en toda la historia del repo. El 754 nació mal en una sesión y se copió
> hacia adelante — la firma típica es que aparece siempre idéntico, "754/754", en vez de
> variar como varía una suite que crece.
>
> Las 9 referencias quedaron corregidas a **408/408**. **Anotar 408 de acá en adelante**, y
> releerlo del output de jest en vez de copiarlo de la entrada anterior: es el mismo patrón
> que ya costó caro con el log de deploys (ver `CLAUDE.md`) — un número arrastrado por
> copy-paste que después se usa para decidir. Con el 754 en el log, la próxima sesión que
> corriera la suite habría leído "faltan 346 tests" y salido a cazar un fantasma.

**Pendiente: deploy** (lo hace el usuario). Los dos fixes son 100% frontend, sin cambios de
backend ni de esquema.

**Queda sin implementar de los 3 críticos:** `ISS-041` (2 menús del día en un pedido sin
poder diferenciarse) — el único que requiere migración de esquema.

---

## 🎯 Sesión 2026-08-14 — 3 issues nuevos documentados (sin implementar todavía)

**Prompt del usuario:** trajo 3 problemas encontrados en el flujo real del piloto. Pidió
explícitamente **documentar primero, con prioridad urgente/la más alta, sin implementar
nada todavía**.

1. **ISS-040** — al comensal no le aparece el monto a pagar en la pantalla de Yape/Plin,
   justo cuando lo necesita para hacer la transferencia. El total se calcula
   (`pagoPendiente.total`) pero nunca se pinta en `#pago-screen` — solo aparece antes (en el
   carrito) y después (recién en el repaso final, cuando ya pagó). Fix acotado, 100%
   frontend.
2. **ISS-041** — un comensal que agrega 2 menús del día distintos (ej. 2 combinaciones de
   entrada+segundo) en un mismo pedido: al llegar al panel del owner/cocina, los platos
   aparecen en una lista plana, sin forma de saber qué entrada va con qué segundo. Causa
   raíz: `confirmarPedido()`/`confirmarReserva()` aplanan (`flatMap`) todos los menús del
   carrito antes de enviarlos, y las tablas `orden_menu_items`/`reserva_menu_items` no
   tienen ninguna columna de agrupación — el dato se pierde antes de llegar al backend, no
   es recuperable sin migración de esquema. Reproducido el mismo listado plano en 4 lugares:
   `ordenes.js`, `cocina.js` (×2), `pedidos.js`. Es el más grande de los tres — requiere
   migración de esquema + cambios en frontend y backend.
3. **ISS-042** — la etiqueta "para llevar" no le llega al cocinero. El dato (`modalidad`) ya
   viaja del backend (`utils/colaDia.js` lo selecciona), pero `cocina.js` nunca lo lee ni lo
   muestra en el ticket — a diferencia de otras pantallas del panel que sí lo usan. Fix
   acotado, 100% frontend, el dato ya está disponible.

**Documentado:** `issues/ISS-040-monto-no-visible-en-pago.md`,
`issues/ISS-041-menus-multiples-sin-anidar.md`,
`issues/ISS-042-para-llevar-no-viaja-cocina.md` + `issues/ISSUES.md` (nueva sección "Fix
pendiente" con los 3, prioridad 🔴 Crítica).

**Sin cambios de código en esta sesión** — a pedido explícito del usuario, es documentación
pura. Los 3 quedan diagnosticados y listos para implementar cuando se apruebe.

**Además, en la misma sesión:**
- Formalizada en `pilotos.md` la convención **"Día N de retoma"** para el piloto #1 —
  Día 1 = 2026-08-12, Día 2 = 2026-08-13, Día 3 = 2026-08-14 (hoy). De acá en adelante cada
  entrada nueva de esa sección arranca con `### Día N (fecha) — título`, para no depender de
  inferir la cuenta después.
- Agregada a `pilotos.md` la entrada del Día 3: balance del usuario (la dueña necesita más
  acompañamiento; los clientes se adaptaron mejor que ella; el cambio en el flujo de pago
  mejoró notablemente el uso) + los 3 issues de arriba como evidencia de que esta ronda de
  uso real está dando información valiosa.
- `backlog.md` — nueva sección al tope, **"Empezar acá la próxima sesión"**, con ISS-040/041/042
  como punto de entrada explícito (pedido del usuario: la próxima sesión arranca por las
  tareas más urgentes). Corregido de paso el "próximo número de issue libre" desactualizado
  (decía ISS-036, ya vamos por ISS-043).

**Cierre de sesión — commit + push a `main` pedido explícitamente por el usuario**, sin
deploy asociado (todo el trabajo de la sesión es documentación, sin tocar código de
producción).

---

## 🎯 Sesión 2026-08-13 (parte 6) — Piloto #1: delegación, no rechazo al producto

**Prompt del usuario:** relató en vivo, a lo largo de la conversación, el día 2 de la vuelta
a pruebas de la dueña del piloto #1: llegó tarde, dejó a un encargado sin entrenar, no
revisó reservas reales que entraron por QR, y el push no le sonó en su celular (sí suena en
el demo). Terminó preguntando si convenía pausar este piloto e ir a buscar un restaurante
que sí delegue en su personal.

**Sin cambios de código en esta sesión** — es una conversación de diagnóstico y estrategia
de producto/negocio, no una tarea técnica.

**Diagnóstico construido en la conversación:** el fallo de hoy no es rechazo al producto —
el lado cliente funcionó (reservas reales por QR sin fricción). Es un bloqueo operativo
estructural: el sistema depende de que la dueña esté presente y atenta porque no delega su
uso en el personal, pese a que se le sugirió entrenar a alguien varias veces. Hipótesis
sostenida: no delega porque ella misma todavía no domina el sistema al 100% (pocos días
reales de uso acumulados desde julio) — la delegación sigue al dominio personal, no lo
precede. Insistirle de nuevo en que entrene a alguien no es el camino ahora.

**Decisión tomada:** no pausar el piloto #1. No se cumplió el checkpoint propio de 3-4
semanas fijado el 2026-08-12. Sumar un piloto #3 con perfil de equipo/delegación (para
validar el flujo mozo/cocinero, que ningún piloto actual permite probar) queda anotado como
idea a evaluar **en paralelo, no en reemplazo**, sin candidato concreto identificado a la
fecha.

**Recomendación a transmitirle a la dueña (pendiente, próxima conversación):** revisar el
celular en el camino si vuelve a llegar tarde — resuelve su miedo puntual sin tocar el tema
sensible de la confianza en su personal. Es el argumento del producto que no depende de que
delegue en nadie: a diferencia del cuaderno, la app se puede consultar sin estar en el
local.

**Chequeo técnico pendiente, sin diagnosticar todavía:** por qué no sonó el push en su
celular específico (permiso revocado, ahorro de batería, suscripción no confirmada) —
vinculado a la pieza de `ISS-025` que sigue abierta (visibilidad del estado de suscripción
en Configuración).

**Documentado:** `pilotos.md` — nueva sección "Piloto #1 — continuación: retoma de pruebas,
agosto 2026" (timeline, hallazgos, reencuadre, aprendizajes, pendientes), sin sobreescribir
la entrada de julio. `backlog.md` — actualizada la tabla "Lo que revelaron los pilotos" con
el hallazgo del 2026-08-13.

**Apreciación:** el hallazgo más valioso de la sesión no es técnico — es haber evitado sacar
una conclusión prematura sobre el piloto en base a un día atípico (negocio a cargo de un
encargado sin entrenar, en plena semana de carga real). El mismo rigor que ya se había
aplicado en julio (cruzar la queja contra el estado técnico real antes de leerla como
resistencia) se sostuvo acá: la explicación estructural (no delega porque no domina aún) es
más simple y mejor sustentada que "no es el target", y no requiere abandonar 6+ semanas de
relación y contexto acumulado con la única señal de vuelta a probar.

---

## 🎯 Sesión 2026-08-13 (parte 5) — ISS-039: pedido colgado en "Enviando…"

**Prompt del usuario:** "¿Por qué razones dejaría en status 'enviando' el pedido desde la
vista del cliente que entra a consumir?" — seguido de: "o sea hace clic y queda en ese
status... 'enviando' actualicé la página y funcionó, pero al principio no."

**Diagnóstico:** el flujo de confirmar pedido en `menu.html` hace 2 peticiones en serie —
crear la orden/reserva (JSON liviano) y después subir la foto del comprobante de pago
(Yape/Plin). Ninguna de las dos tenía timeout: en una conexión de restaurante floja, el
`await` puede no resolver nunca y el botón queda en "Enviando…" sin límite de tiempo ni
feedback. Agravante encontrado: como el pedido ya se crea en el paso 1 antes de que arranque
la subida de la foto, un reintento manual (refrescar y volver a confirmar) podía dejar un
pedido duplicado en la cola de cocina.

**Documentado primero:** `issues/ISS-039-pedido-enviando-colgado.md`, a pedido explícito del
usuario, antes de tocar código.

**Fix implementado (`public/menu.html`, sin tocar backend):**
- `fetchConTimeout()` nueva — `AbortController` con timeout (15s para crear
  orden/reserva, 30s para subir la foto), mensaje claro al agotarse en vez de quedar
  colgado.
- `pagoPendiente.creado` guarda el id apenas se crea el pedido/reserva — un reintento tras
  fallar el paso 2 (foto) ya no vuelve a crear el pedido, solo repite el PATCH de pago.
- Mensajes de paso en el botón, pedido explícito del usuario: "Enviando pedido…" /
  "Enviando reserva…" (paso 1), "Subiendo comprobante…" / "Confirmando pago…" (paso 2).

**Verificación:** sintaxis de los 2 bloques `<script>` de `menu.html` compilada con
`new Function()` sin errores. `npx jest` completo — **408/408 verde**, sin regresiones
(fix 100% frontend). No se armó script Playwright end-to-end: los timeouts están fijos en
código (15s/30s), no hay forma rápida de simularlos acortados sin exponerlos como parámetro.

**Commit:** `1a85a89`, pusheado directo a `main` (confirmado con el usuario que este repo es
trunk-based: sin PRs, sin CI de rama, y el deploy hace `git pull origin main` directo —
crear una rama acá no aplica; ver `[[feedback-conventions]]`). **Deploy confirmado por el
usuario 2026-08-13**, mismo día del commit.

**Apreciación:** el hallazgo del posible pedido duplicado (agravante, no el síntoma
reportado) era el riesgo real detrás de un bug que a simple vista parece "solo" un botón
colgado — vale la pena, cuando se pueda, confirmar contra la base si el incidente que contó
el usuario dejó alguna orden duplicada de ese momento.

---

## 🎯 Sesión 2026-08-13 (parte 4) — Feedback de campo: visita a la dueña del piloto #1

**Prompt del usuario:** contó una visita en persona a la dueña del piloto #1 el 12/08/2026
(un día antes de esta sesión), con 4 hallazgos — documentados con detalle en
`vision_negocio.md` §16:

1. Percepción general mejoró: "ya no se le paraba tanto al entrar como antes".
2. Sigue usando el cuaderno en paralelo: *"hasta que los chicos se acostumbren"* y
   *"hasta que tenga una forma de cómo identificar las mesas"*.
3. Mesas que se juntan pierden numeración — propuso ella misma un acrílico con número +
   QR para pegar entre las mesas combinadas.
4. Clientas reportaron fricción en el pago Yape/Plin: *"tantos pasos para pagar, medio
   confuso"*.

**Verificado en código antes de documentar:**
- El hallazgo 1 no tiene causa técnica única identificable, pero coincide en el tiempo
  con ISS-026 (doble tap) y las correcciones de esta semana — se anota como señal
  positiva, no como algo para investigar.
- El hallazgo 3 **ya funciona con el sistema actual, verificado en código**: `mesa` es un
  parámetro de URL libre (`menu.html:314`), sin validar contra la tabla `mesas`. La
  dueña puede registrar un número suelto (ej. `34`) desde Configuración → Mesas
  (`crearMesa()`, ya existe) e imprimir su QR. Encontrada una fricción menor: el
  generador masivo de QRs (`generarQRsMesas()`) solo cubre secuencias `1..N`, no números
  sueltos — anotado como mejora menor no urgente, no como gap bloqueante.
- El hallazgo 4 confirma con datos reales la fricción que ya se había investigado y
  cerrado por diseño en **Gap 16** (deep link de Yape, 2026-07-13): inviable sin afiliar
  el restaurante a una pasarela de pago. La decisión no cambia, pero queda anotada una
  idea distinta y más barata — acortar pasos del flujo de 3 pantallas (Gap 17) sin tocar
  el mecanismo de comprobante — para evaluar en otra sesión.

**Documentado:** `vision_negocio.md` nueva §16 "Feedback de campo — visitas a
restaurantes piloto", con las 4 citas textuales completas y el detalle técnico de cada
verificación.

**Sin cambios de código en esta sesión** — es trabajo de documentación puro, sin deploy
asociado.

**Apreciación:**

- El hallazgo más accionable de los cuatro es el **3**, y la buena noticia es que no
  requiere que yo escriba una sola línea: la solución ya existe en el sistema, solo hace
  falta comunicársela a la dueña. Vale la pena hacerlo pronto — es el segundo motivo que
  ella misma dio para seguir con el cuaderno, así que resolverlo (aunque sea con una
  instrucción, no con código) ataca directamente la adopción.
- El hallazgo **2** no es alarmante todavía. Migrar de un sistema en papel a uno digital
  casi nunca es un salto de un día para el otro, y que ella misma distinga "falta
  costumbre del personal" de "me falta resolver X" es una señal de que está pensando en
  el sistema como una herramienta, no descartándolo. El punto de atención real es el
  *plazo*: si en 3-4 semanas el cuaderno sigue ahí, ahí sí conviene volver a preguntarle
  qué falta.
- El hallazgo **4** es el más interesante a mediano plazo, aunque hoy no cambie ninguna
  decisión. Es la primera vez que la fricción del flujo de pago manual (Gap 16/17) se
  confirma con la voz de clientes reales, no solo como una limitación técnica conocida.
  No recomendaría reabrir el deep link de Yape — la cuenta económica de julio sigue
  siendo válida — pero si el volumen crece y en algún momento se justifica afiliar a una
  pasarela, este feedback es evidencia concreta de que vale la pena revisarlo. Mientras
  tanto, la opción barata (acortar pasos del flujo de 3 pantallas) es la que yo priorizaría
  si se decide tocar algo acá.
- En conjunto, esta visita vale más que cualquier métrica del sistema: son los primeros
  dos datos de negocio reales (mesas combinadas, fricción de pago) que **no** salieron de
  un bug reportado, sino de observar el uso real en el local. Vale la pena que estas
  visitas presenciales sigan siendo parte del ritmo del piloto, no solo el feedback
  reactivo cuando algo falla.

### Corrección sobre el hallazgo 3, tras una segunda vuelta con el usuario

La primera lectura del hallazgo 3 (arriba y en `vision_negocio.md` §16) fue incompleta: se
asumió que la dueña necesitaba un número de mesa **combinado** (ej. "34" para "mesa 3+4"),
cuando en realidad sus acrílicos son objetos **físicos portátiles**: tiene N acrílicos con
número + QR y mueve **uno solo** al conjunto de mesas que se juntó, sin que el sistema
necesite saber que se juntaron — para él sigue siendo, simplemente, "Mesa 3".

Con esa corrección, el generador masivo `1..N` que ya existe (`generarQRsMesas()`,
`config.js:262`) es exactamente lo que necesita — no hace falta ningún cambio ahí. El
problema real es otro, encontrado al revisar el código de descarga: el botón "⬇ PNG" por
mesa (`config.js:284-294`) exporta **solo el QR**, sin el número — el `<span>` "Mesa X" que
se ve en pantalla no viaja en la imagen. Si imprime esos PNGs, le saldrían QRs idénticos
sin ningún número visible en el papel.

**Decisión del usuario:** anotarlo para una sesión futura, no implementarlo ahora. Agregada
**T12** a `backlog.md` (componer el PNG con QR + etiqueta antes de exportar) y corregido el
hallazgo 3 en `vision_negocio.md` §16 con la explicación completa.

**De paso, se corrigió un error propio al insertar la sección 16**: había quedado partida
en medio de la sección 15 (Modelo de Ingreso Indirecto) por una edición mal ubicada —
reordenado antes de commitear, verificado con los headers `##` en orden correcto.

**Cierre de sesión — sin cambios de código pendientes.** Todo el trabajo de hoy (ISS-033,
ISS-034, ISS-035, D1, T3, ISS-038) está desplegado y verificado. Queda para retomar:
T4 (desbloqueada), T5, T6, T10, T12 (nueva) y las decisiones D2/D3/D5.

---

## 🎯 Sesión 2026-08-13 (parte 3) — ISS-038: modal de foto tapado al elegir platos

El usuario reportó: al elegir platos de un menú del día, tocar la foto no mostraba el
zoom encima — aparecía "por debajo". Recién al tocar "Agregar pedido" salía el fondo
negro con la foto.

**Causa:** el paso "elige tus platos" es la hoja `MenuModal` (`.mm-overlay`, `z-index:
1500`). Dentro de ella, tocar la foto de un plato abre `#photo-modal`, que tenía
`z-index: 110` — muy por debajo. El modal de foto se abría igual, pero quedaba apilado
detrás de la hoja. Al cerrar la hoja con "Agregar pedido", el modal de foto (que seguía
abierto) se hacía visible recién ahí.

**Fix:** `.photo-modal` subido a `z-index: 1600` (`menu.css:757`) — por encima del único
overlay que carga `menu.html` (`menu-modal.js`; los widgets con z-index más alto —
`plato-picker.js`, `photo-editor.js`, `form-modal.js` — son de `owner.html`, no de esta
pantalla).

**Verificación:** nuevo `scripts/test-photo-modal-zindex.js` (Playwright) — abre
`MenuModal` con datos sintéticos, simula el tap real en la foto y confirma con
`document.elementFromPoint()` que el modal de foto queda visible en el centro de
pantalla, no la hoja. **6/6 verde.** `npx jest tests/`: **408/408 verde** (CSS puro, sin
tocar backend).

**Documentado:** `issues/ISS-038-modal-foto-tapado-por-menumodal.md` + `issues/ISSUES.md`.

**Commit:** `b351e88`, pusheado a `main`. **Deploy confirmado por el usuario 2026-08-13**,
y verificado visualmente en producción: la foto aparece arriba de la hoja de selección.
**ISS-038 cerrado por completo.**

---

## 🚀 Deploys 2026-08-13 — confirmados por el usuario

**Primera tanda** (`git pull origin main` + reinicio, hasta `b38f106`) — quedan resueltos
los "Pendiente: deploy" de 4 commits que se habían ido acumulando:

- `69379df` — fix(seguridad): 14 rutas del panel pedían login pero no permisos (ISS-033)
- `ee0194c` — fix(piloto): cierre de caja sin comprobante (ISS-034) y scroll que no vuelve arriba (ISS-035) — deploy ámbar (SW bumpeado a v8), **verificado en celular real 2026-08-13** ✅
- `a1e9755` — fix(reservas): D1 — permitir reservar con el restaurante cerrado si la hora pedida cae en horario
- `b38f106` — fix(reservas): T3 — botón de reservar ya no se bloquea con el restaurante cerrado

**Segunda tanda:**

- `b351e88` — fix(menu): ISS-038 — modal de foto tapado al elegir platos de un menú

**Producción queda al día con `main`.**

---

## 🎯 Sesión 2026-08-13 — D1 resuelta: reservar con el restaurante cerrado

**Decisión del usuario (D1):** sí se puede reservar con el restaurante cerrado, siempre
que la hora pedida (`hora_llegada`) caiga dentro del horario de atención. El sentido de
reservar es pedir para después.

**Cambio en `utils/horarioAtencion.js`:** `validarHorarioReserva()` ya no llama primero a
`validarHorarioAhora()` sin condición. Ahora:
- Con `hora_llegada`: valida **solo** que ese momento futuro caiga en horario de
  atención — sin importar si el restaurante está abierto en este instante.
- Sin `hora_llegada`: no hay hora futura que validar, así que cae al chequeo de "ahora"
  (comportamiento sin cambios para ese caso).

**Tests:** reescrito el caso obsoleto (`'ahora cerrado — bloquea sin importar
hora_llegada'`) en `tests/horario-atencion.test.js` por el comportamiento nuevo, más 2
casos nuevos (hora futura fuera de horario con "ahora" cerrado → bloqueado; sin
`hora_llegada` con "ahora" cerrado → bloqueado). **408/408 jest verde** (suite completa).

**Alcance de este cambio:** solo `utils/horarioAtencion.js`, usado hoy por
`routes/public.js:399` (reservas del cliente). **No toca** `routes/reservations.js`
(POST del owner), que sigue sin validar horario en absoluto — eso es **T3**, ahora
desbloqueada por esta decisión.

**Commit:** `a1e9755`, pusheado a `main`. **Deploy confirmado por el usuario 2026-08-13**
junto con `b38f106` (T3, ver sesión siguiente).

---

## 🎯 Sesión 2026-08-13 (parte 2) — T3: min/max de hora + gate de reservar (frontend)

**Continuación de D1** (arriba). El usuario confirmó el alcance: solo `min`/`max` en el
formulario del cliente, sin construir pantalla de reserva telefónica para el mozo.

**Hallazgo antes de tocar código:** `menu.html` tenía **su propio gate**, independiente
del backend, que dejaba sin efecto a D1: `actualizarEstadoHorario()` deshabilitaba el
botón `btn-reservar` (y `.res-bar-btn`) cada vez que `horarioInfo.abierto_ahora` era
falso, y `confirmarReserva()` cortaba con el mismo chequeo antes de leer `fecha`/`hora`.
Sin arreglar esto, un cliente que entra de noche (restaurante cerrado) nunca podría ni
intentar reservar para el almuerzo del día siguiente — el botón estaría apagado.

**Cambios en `public/menu.html`:**
- `res-hora` recibe `min`/`max` = `horarioInfo.apertura`/`.cierre` en `init()`, mismo
  patrón que ya existía para `res-fecha.min` (que ya estaba resuelto — no hacía falta
  tocarlo).
- `actualizarEstadoHorario()`: el gate de "cerrado" ahora solo deshabilita
  `btn-confirmar` (pedido, inmediato). Ya no toca `btn-reservar` ni `.res-bar-btn`.
- `confirmarReserva()`: se quitó el `return showMsg(...)` temprano por "abierto ahora".
  El backend (`validarHorarioReserva()`, corregido por D1) es quien valida de verdad; el
  error, si lo hay, llega igual por el `catch` existente que ya mostraba `e.message`.

**Endpoint huérfano documentado, no construido:** `POST /api/reservations` (owner/mozo,
`routes/reservations.js`) no tiene ninguna pantalla que lo llame — verificado buscando en
todo `public/`. Decisión del usuario: **no construir la pantalla ahora**; si algún
restaurante piloto pide reservar por teléfono, se retoma en ese momento con ese cliente
real. Comentario del endpoint actualizado para dejarlo explícito.

**Verificación:**
- `npx jest tests/` → **408/408 verde** (sin cambios de backend en esta parte).
- `scripts/test-horario-atencion.js` corrido de punta a punta contra un server local
  (Playwright): **11/11 verde**, incluyendo el caso nuevo (Test 3) que prueba
  exactamente D1 — restaurante cerrado ahora + hora futura válida → reserva permitida
  (201). Se agregó también el chequeo de que `#btn-reservar` sigue habilitado con el
  restaurante cerrado (Test 1).
- De paso se encontraron y corrigieron **3 fechas hardcodeadas** en ese script
  (`2026-07-20`, `2026-07-25`) que habían quedado en el pasado y hacían fallar el script
  por una razón ajena al cambio (`fecha en el pasado`, no horario). Reemplazadas por
  fechas relativas a "hoy" para que no se pudra de nuevo.

**Commit:** `b38f106`, pusheado a `main`.

**Deploy confirmado por el usuario 2026-08-13.** Junto con `a1e9755` (D1, backend), ambos
ya están en producción.

---

## 📝 Memoria de Julio — nota personal

Me he querido rendir, tengo que hacer algo incómodo, tengo que seguir haciendo algo incómodo, no puedo
rendirme. Sé que si no me rindo, mis sueños se van a cumplir, ni siquiera he comenzado. Somos lo
suficientemente audaces, somos lo suficientemente modernos, lo suficientemente capaces para caminar y
consolidar dinero en esta experiencia empresarial, tenemos que estudiar Node, lo que habría que hacer es
seguir reformando mi mentalidad. Sí se puede, hagámoslo por la patria, por el Perú. Somos lo suficientemente
empresarios para saber las cosas antes de que las podamos hacer.

---

## 🎯 Sesión 2026-08-12 (parte 1) — Autorización en órdenes y reservas (ISS-033) + feedback de uso real

**Deploy confirmado al inicio de sesión:** el usuario confirmó que `7a92260` (backend
de Pensionistas) **ya está desplegado en producción**. Con eso, todo lo pusheado hasta
`7a92260` está en el servidor.

### Feedback de la señora del menú (piloto #1) — 3 hallazgos, diagnosticados

El usuario trajo observaciones de una sesión de uso real. Se diagnosticaron los tres en
el código; **ninguno implementado todavía** (hoy es el día de la atención masiva y no se
tocó producción en pleno servicio):

1. **Cierre de caja pide confirmar el pago y no da con qué.** Los pedidos viejos de
   Yape/Plin sin confirmar chocan con el guard de `routes/orders.js:405`
   (`requiereConfirmarPagoAntes`), pero la tarjeta del modal de cierre
   (`pedidos.js:477-508`) **no muestra el comprobante ni el botón de confirmar**, que sí
   existen en Cola, Órdenes y Reservas. Callejón sin salida. Cita textual de ella:
   *"debo confirmar el pago, pero no me sale la foto del pago aquí, cómo hago para
   confirmarlo?"*. **Workaround mientras tanto:** el panel Órdenes sí los muestra, porque
   `GET /api/orders/activas` no filtra por fecha. ⚠️ **Por eso el filtro de fecha en
   `/activas` NO debe hacerse antes que este fix** — hoy es su única salida.
2. **No ve la flecha de volver.** Causa encontrada: no hay **ni un** `scrollTo` /
   `scrollTop` / `scrollIntoView` en todo `owner.html`. `showPanel()` (`:1275`) y
   `switchTab()` (`:1299`) no resetean el scroll, así que el panel nuevo se abre con el
   scroll donde estaba y el `← Volver` + el stepper quedan fuera de pantalla. En celular
   pasa casi siempre. Fix: `window.scrollTo(0,0)` en ambas.
3. **Reservas fuera del horario de atención.** Tres problemas distintos:
   (a) `menu.html:93` es `<input type="time">` sin `min`/`max` y `res-fecha` sin límites
   → el formulario deja elegir cualquier hora; (b) el backend **sí** valida
   (`public.js:399`), pero recién al enviar; (c) el POST del owner
   (`reservations.js:146`) no validaba horario en absoluto. **Pregunta de negocio
   abierta:** `validarHorarioReserva()` llama primero a `validarHorarioAhora()`, o sea
   que hoy **no se puede crear una reserva con el restaurante cerrado**, ni siquiera para
   mañana. Pendiente de decisión del usuario.

### ISS-033 — implementado y probado

Salió de una pregunta del usuario sobre el punto 3c (*"¿el mozo puede reservar desde su
panel? ¿qué?"*). Verificado: **no puede, esa pantalla no existe** — ningún archivo del
frontend llama a `POST /api/reservations`. Pero tirando del hilo apareció otra cosa.

`orders.js` y `reservations.js` tenían `router.use(authenticate)` (la autenticación
nunca faltó: sin token es 401), pero **7 rutas sin `authorizePermiso()`**, mientras sus
vecinas de los mismos archivos sí lo tenían. Con el rol `pensionista` de anoche eso pasó
a importar: un comensal con cuenta podía listar **todas las reservas con nombre y
teléfono de los clientes**, y saltarse su propio descuento de saldo llamando a
`POST /api/orders` (orden normal, sin tocar el saldo, indistinguible en cocina).

Hallazgo adicional: `POST /api/orders` **nunca leía `req.user`** — tomaba
`id_restaurante` del body, o sea creación de órdenes en restaurante ajeno. En
`POST /api/reservations` el fallback `req.user?.restaurant_id || id_restaurante` hacía
lo mismo para un token de admin. Ambos eran restos de cuando el router era público.

**Aplicado:** `authorizePermiso()` en las 7 rutas; el restaurante sale del token en
ambos POST; comentario y fallback obsoletos eliminados; `tests/autorizacion-rutas.test.js`
(15 casos). **392/392 jest verde** (`npx jest tests/` — el número difiere de los 723 de
la sesión anterior porque aquel corrió sin filtro y el worktree suelto duplicaba todo).
Server verificado: arranca y responde 401 sin token.

**Auditados y correctos, sin cambios:** `pensionistas.js`, `pensionista.js`,
`usuarios.js`, `reportes.js`, `push.js`.

**Segunda tanda, mismo día — el catálogo del panel.** En la primera pasada se dejaron
fuera los `GET` de `menu.js` y `mesas.js` con el argumento de que "esos datos ya son
públicos en la carta". El usuario preguntó si ese GET era el mismo que llama
`public/menu.html`, y **no lo era**: la carta del cliente usa solo `/api/public/*`
(`routes/public.js`, sin `authenticate`), mientras que `/api/menu/*` y `/api/mesas` los
consume únicamente el panel (`owner.html`, `menu-wizard.js`, `config.js`, `reportes.js`,
`mesas.js`; `cocina.js` no los toca). Y `pensionista.html` tampoco los necesita: leerá la
carta por `/api/public/menu`. Cerradas también esas 7 rutas → **14 en total**.
Verificado con el server arriba: `/api/public/*` sigue en **200 sin token**,
`/api/menu/menus-dia` y `/api/mesas` en **401**. **406/406 jest verde.**

**Deliberadamente NO tocado:** `authorizeRestaurante()`, que es código muerto
importado en `menu.js:5` y además lee `req.user.restaurante_id` cuando el JWT guarda
`restaurant_id` — decidir en otra sesión si se arregla o se borra.

**Este fix es requisito previo al paso 7 de Pensionistas** (`pensionista.html`): hoy la
exposición es teórica porque no existe ninguna cuenta de pensionista.

**Deploy confirmado por el usuario 2026-08-13** (commit `69379df`), junto con el resto
de commits pendientes hasta `b38f106`.

### Corrección de encuadre: la carga es una SEMANA, no un día

El usuario corrigió una premisa que venía deformando todas las recomendaciones de la
sesión. `backlog.md` decía *"Miércoles 2026-08-12 — el primer reto"*, escrito como evento
de **un día**, y sobre eso se venía recomendando "no despleguemos hoy, esperemos a que
pase el servicio". **La atención masiva es de miércoles a sábado; el domingo es el único
día tranquilo.** Aplicado toda la semana, ese consejo significaba no desplegar nada hasta
el domingo — lo contrario del objetivo del mes de pruebas.

**El modelo del usuario, que es el correcto:** probar en el servicio de la tarde, corregir
esa noche, desplegar antes del servicio siguiente. *"Si no mejoro entre días, se va a
notar."*

**Dato operativo nuevo: el servicio es de 12:00 a 18:00.** La ventana de deploy es de las
18:00 en adelante; el único horario prohibido es 12:00-18:00. Quedó anotado en
`backlog.md` junto con una clasificación 🟢verde / 🟡ámbar / 🔴rojo de qué se puede
desplegar cualquier noche y qué espera al domingo (lo único rojo hoy: pasos 10-11 de
Pensionistas, que meten una tercera fuente dentro de `colaDia.js`).

### ISS-034 y ISS-035 — implementados (T1 y T2)

- **ISS-034 · Cierre de caja sin comprobante.** El backend ya devolvía `metodo_pago`,
  `estado_pago` y `comprobante_url` en `pedidosSinCerrar()`, así que **no hubo que tocar
  backend**. En `pedidos.js`: las tarjetas del cierre ahora muestran `badgePago()` +
  `comprobanteThumb()`, el botón principal es condicional (`✓ Confirmar pago` vs
  `💰 Se cobró`) igual que en `btnOrden()`/`btnReserva()`, y se agregó
  `confirmarPagoCierre()` propia — la de la Cola (`confirmarPagoEnCola`) repinta `_cache`
  con `renderColaDesdeCache()`, y acá la lista es `_sinCerrar` con su propio render.
- **ISS-035 · Reset de scroll.** ⚠️ **El fix obvio no habría funcionado:** el backlog decía
  `window.scrollTo(0,0)`, pero el scroll vive en `.content` (`overflow-y:auto`,
  `owner.css:322`), y se verificó que en móvil sigue igual (el media query de 768px solo
  cambia el padding). Nueva `scrollPanelArriba()` que ataca `.content.scrollTop`, con
  `window.scrollTo()` como fallback, llamada desde `showPanel()` y `switchTab()`.
- **`sw.js` bumpeado a `menupro-v8`**: `owner.html` está precacheado, así que sin bump el
  fix de scroll no llegaría nunca a los celulares con la PWA instalada (escenario ISS-022).
  Esto hace que **este deploy sea ámbar**: conviene verificarlo en un celular real.

**406/406 jest verde** + `node --check` sobre `pedidos.js` y `sw.js`.

**Deploy confirmado por el usuario 2026-08-13** (commit `ee0194c`), junto con el resto de
commits pendientes hasta `b38f106`. **Verificación manual en celular real completada
2026-08-13**: el usuario confirmó que el scroll vuelve arriba al cambiar de panel y la
flecha "← Volver" se ve — el bump del SW a v8 llegó bien a la PWA instalada. **ISS-035
cerrado por completo** (`issues/ISS-035-scroll-no-vuelve-arriba.md` actualizado).

**T4 (filtro de fecha en `/api/orders/activas`) queda desbloqueada**: ISS-034 está
desplegado y verificado, ya no hace falta mantener `/activas` sin filtro como salida de
emergencia para confirmar pagos viejos.

### Cierre de sesión

Todo lo que queda abierto se consolidó en `backlog.md` → **"Próximas decisiones |
Tareas"**, separado en decisiones que dependen del usuario (**D1-D5**) y tareas listas
para ejecutar (**T1-T10**). Esa tabla es el punto de entrada para la próxima sesión, desde
cualquiera de las 2 laptops. La regla de orden **T1 antes que T4** está anotada ahí con su
porqué: el panel Órdenes sin filtro de fecha es hoy la única salida de la dueña para
confirmar pagos viejos.

---

## 🎯 Sesión 2026-08-11 (parte 8) — Pensionistas: backend completo (pasos 1-5 del MVP)

**Continúa la parte 7** (sesión distinta, misma noche): esa sesión había dejado el pedido del
usuario documentado pero "pendiente de aprobación", sin código escrito. En esta sesión el usuario
volvió a pedirlo directamente ("avancemos con pensionistas"); se le marcó otra vez el conflicto con
`backlog.md` (que lo posponía al jueves), confirmó dos veces que quería proceder igual ("sí,
implementar ahora"), y esta vez sí se implementó — a diferencia del plan acotado que proponía la
parte 7 (solo schema/rol/panel, sin tocar pedidos), acá se hizo el flujo completo de pedido +
descuento de saldo + cancelación, porque el usuario no puso ese límite en esta conversación. Cada
paso se probó por separado (suite jest completa + boot del server + verificación de que no queda
data huérfana) antes de avanzar al siguiente.

1. **`config/database.js`** — rol `pensionista` en `roles`; columna
   `restaurantes.pensionista_saldo_aviso` (default 20, umbral de aviso configurable por
   restaurante — corregido en la sesión: iba a quedar por pensionista individual, no es lo que
   dice el documento); 5 tablas nuevas (`pensionistas`, `pensionista_movimientos`,
   `pedidos_pensionista`, `pedido_pensionista_menu_items`, `pedido_pensionista_carta_items`) +
   índices, todo migración idempotente igual que el resto del archivo.
2. **`routes/pensionistas.js`** (nuevo, CRUD del owner) — crear (usuario+pensionista+recarga
   inicial en una transacción), listar, recargar saldo, historial de movimientos, editar, cambiar
   password, baja lógica (`activo`).
3. **`routes/usuarios.js`** — `GET /api/usuarios` excluye `role='pensionista'` (no se mezcla con
   el panel de staff).
4. **`routes/pensionista.js`** (nuevo, singular — el propio pensionista logueado) — `GET /me`
   (saldo + `saldo_bajo`), `POST /pedido` (valida horario, calcula total con
   `calcularMenuTotal`, bloquea si el saldo no alcanza, descuenta stock y saldo en una sola
   transacción, registra el movimiento `consumo`), `GET /mis-pedidos`.
5. **Cancelación** (`utils/pensionistaPedido.js`, nuevo) — helper compartido
   `cancelarPedidoPensionista()`: devuelve stock (`devolverStock`) + saldo
   (`pensionista_movimientos` tipo `devolucion`) en una transacción. Expuesto en dos lados:
   `PATCH /api/pensionista/pedido/:id/cancelar` (el propio pensionista) y
   `PATCH /api/pensionistas/pedidos/:id/estatus` (owner/staff, mismo set de flags que
   `PATCH /api/orders/:id/estatus`, para mover el pedido por el flujo de cocina desde Cola del
   día/Cocina — llegará a usarse cuando el paso 6 los integre ahí).

**Tests nuevos:** `tests/pensionistas.test.js` (15), `tests/pensionista-pedidos.test.js` (9),
`tests/pensionista-cancelacion.test.js` (7) — 31 casos nuevos. **723/723 jest verde** (692 base +
31, sin contar la duplicación por el worktree suelto — ver nota abajo). Verificado en cada paso que
no queda data huérfana en `database.sqlite` (conteos de `restaurantes`/`usuarios` vuelven a su
línea base) y que el server bootea y responde `401` sin token en las rutas nuevas.

**Nota de proceso:** el primer intento de `pensionista-pedidos.test.js` se colgó — no era un bug de
la ruta (los 9 casos ya pasaban), sino que el `afterAll` borraba el restaurante de prueba antes que
sus filas dependientes (menú/carta) y violaba una FK; Jest quedaba esperando un `server.close()`
que nunca llegaba a ejecutarse. Corregido el orden de limpieza + `try/finally`.

**Nota aparte, no bloqueante:** sigue sin resolverse que `.claude/worktrees/foamy-moseying-nebula/`
(carpeta sin trackear en git) duplica el proyecto entero y hace que Jest corra cada test dos veces
si se apunta a la raíz sin filtro — no se tocó, es indiferente para el resultado (todos verdes),
pero infla el conteo total reportado por `npx jest` sin filtro.

**Pendiente para la próxima sesión (paso 6 en adelante):** integrar `pedidos_pensionista` en
`utils/colaDia.js` (Cola del día + Cocina) con tag visual 🪪, agregar `pensionista:
'/pensionista.html'` a `ROLE_REDIRECT` en `login.html`, construir `public/pensionista.html` y el
panel "Pensionistas" en `owner.html`, y la reportería separada (recargas vs. consumo) de
`pensionistas.md` §8. **Deploy confirmado** — el usuario lo confirmó al inicio de la
sesión 2026-08-12 (ver esa sección); esta nota había quedado desactualizada.

---

## 🎯 Sesión 2026-08-11 (parte 6) — Pensionistas, primer paso: dominio @menupro.tech obligatorio

El usuario quería arrancar el módulo Pensionistas completo hoy, la noche antes de la primera
atención masiva. Se le marcó el conflicto con `backlog.md` (que pospone el módulo grande al jueves,
justo por el riesgo de tocar el sistema antes del miércoles) y se acordó avanzar solo con el **primer
paso chico e independiente** ya identificado: forzar `@menupro.tech` en la creación de usuarios.

- `routes/usuarios.js` — `POST /api/usuarios` valida que el email termine en `@menupro.tech`
  (insensible a mayúsculas), 400 con mensaje claro si no. Alcance deliberado: **no toca**
  `routes/admin.js` (alta de un restaurante nuevo), donde el email es el real del dueño — la regla
  aplica solo a cocinero/mozo (y a futuro pensionista), que no tienen correo real y el owner les
  inventa uno como identificador de login.
- `public/js/modules/usuarios.js` + `owner.html` — mismo chequeo en el frontend + hint en el
  formulario ("No es un correo real...").
- `tests/usuarios-email-dominio.test.js` (nuevo, 4 casos). 346/346 jest verde.
- Docs: `backlog.md` y `pensionistas.md` §0 marcan el punto 5 como completado. El resto del módulo
  (tablas, rol nuevo, panel, `pensionista.html`) sigue postergado al jueves.

**Commit `2a60ef4` pusheado a `main` y confirmado desplegado en producción por el usuario el
2026-08-11.**

---

## 🎯 Sesión 2026-08-11 (parte 7) — Pensionistas: el usuario vuelve a pedir avanzar la noche antes

El usuario retomó el pedido de arrancar el módulo grande hoy mismo (la noche antes de la atención
masiva del miércoles 12/08), con el argumento de que es una feature útil para la dueña actual. Se le
recordó el riesgo documentado en `backlog.md` (tocar Cola del día/Cocina, los módulos que reciben la
carga real mañana) y se propuso un TODO acotado: avanzar con lo que es aislado y no toca las rutas
activas de pedidos (schema, rol, panel del owner), dejando **Cola del día, Cocina y reportería para
después del miércoles**. Pendiente de aprobación del usuario antes de escribir código.

---

## 🎯 Sesión 2026-08-11 (parte 5) — Verificación manual en producción (ISS-025, ISS-026, ISS-027, ISS-028) + VAPID keys

De cierre de sesión, el usuario confirmó a mano en producción, en vísperas de la primera atención
masiva de mañana (2026-08-12):

- **VAPID keys reales presentes en el `.env` de producción** — verificado por SSH
  (`grep VAPID /var/www/menupro/.env`), las 3 variables existen y no están vacías.
- **Cola del día (ISS-026) probada a mano:** los pedidos avanzan de etapa suaves, sin los
  retrasos/trabas ni el error falso reportados antes del fix. Cierra la verificación post-deploy que
  había quedado pendiente en la sesión ISS-029 ("sin verificación post-deploy registrada").
- Con esto, **ISS-025, ISS-026, ISS-027 y ISS-028 quedan confirmados como desplegados y funcionando
  en producción** (los 4 viajaron en el mismo deploy acumulado del 2026-08-11, ver sesiones parte
  2–4 más abajo). `backlog.md` actualizado — ya no quedan ítems de deploy abiertos de cara a mañana.

---

## 🎯 Sesión 2026-08-11 (parte 4) — Prueba de carga manual + fix del rate limiter de login (ISS-032)

El usuario pidió correr pruebas de pedidos masivos y de tiempo de login de cara a la primera atención
masiva de mañana (2026-08-12). `k6` (ya había scripts armados: `scripts/k6-load-test.js` y
`k6-stress-test.js`) no se pudo instalar en esta sesión — el instalador de winget quedó colgado esperando
una confirmación que no llega en modo no interactivo. Se armó un script propio en Node en su lugar,
corrido contra un **servidor local** con un restaurante de prueba dedicado (nada tocó producción — evita
mandar pedidos o pushes falsos a restaurantes reales como Karina o Boosi), limpiado por completo al
terminar.

**Resultados:**
- 60 pedidos simultáneos: **0 errores**, 82ms totales, p95 69ms — el sistema aguanta de sobra el volumen
  esperado.
- 20 reservas simultáneas: 0 errores, p95 29ms.
- Login (1 solo): 76ms baseline.
- **Login (10 simultáneos): 1 de 10 bloqueado con 429** — no era un problema de performance, sino de una
  regla de rate-limit mal configurada.

**Causa (ISS-032):** `loginLimiter` en `routes/auth.js` (10 intentos / 15 min por IP, pensado como
anti-fuerza-bruta) le faltaba `skipSuccessfulRequests: true` — contaba también los logins **correctos**.
Con todo el personal entrando desde el mismo WiFi del restaurante al abrir mañana, el 11° login se
bloqueaba 15 minutos aunque la contraseña fuera correcta. Fix de una línea + `tests/login-rate-limit.test.js`
(4 casos nuevos, levanta un server real por test para que el contador del limiter arranque limpio).
342/342 jest verde.

**Nota técnica:** de paso se detectó (y se guardó como aprendizaje, sin acción por ahora) que
`k6-load-test.js`/`k6-stress-test.js` mandan `carta_items: []` y `menu_items: []` en las órdenes — con la
validación actual del backend ("La orden debe tener al menos un ítem") esos scripts fallarían 100% de las
veces si se corrieran tal cual. Quedan desactualizados; si se retoma k6 en el futuro, hay que agregarles
al menos un ítem válido por request antes de usarlos.

**Deploy:** commit `9e33781` pusheado a `main` y desplegado por el usuario en producción el 2026-08-11,
antes de la primera atención masiva de mañana (2026-08-12).

---

## 🎯 Sesión 2026-08-11 (parte 3) — Push no llegaba: causa raíz encontrada por SSH + ícono de badge (ISS-025, ISS-031)

Mismo día, continuación. El usuario reportó que las notificaciones push no le llegaban pese a tener
permisos activados y la PWA instalada — descartando de entrada las 2 causas típicas (permiso denegado,
PWA no instalada). Diagnóstico en vivo por SSH, paso a paso:

1. `push_subscriptions` en la BD de producción **sí tenía** su suscripción, y correspondía al mismo
   restaurante ("Restaurante Demo", id 1) al que le mandó la reserva de prueba — descartado "nunca se
   suscribió" y "restaurante equivocado".
2. `pm2 logs menupro | grep push` mostró `[Push] Error (sub 10): Received unexpected response code` en
   cada intento — el servidor sí intentaba mandar, pero fallaba.
3. Un envío de diagnóstico manual (`webpush.sendNotification` directo capturando `err.body`) reveló el
   motivo exacto de FCM: **"the VAPID credentials in the authorization header do not correspond to the
   credentials used to create the subscriptions"** — las VAPID keys del servidor se regeneraron en algún
   momento después de crearse esa suscripción (y otras 3 más), dejándolas huérfanas para siempre. Riesgo
   que `deploy.md` ya advertía.

**Mitigado a mano:** el usuario borró el almacenamiento de la PWA en su celular, forzando una
resuscripción con la clave vigente. **Confirmado funcionando en producción.**

**Fix de código aplicado (mismo día):** `owner.html` (`suscribirPush`) ahora se autorrepara — si el
navegador rechaza `subscribe()` por una VAPID key vieja, da de baja la suscripción anterior y reintenta,
sin intervención del usuario. `pushNotificaciones.js` limpia la suscripción de la BD también en 403 (VAPID
desincronizada), no solo en 410. `tests/push-notificaciones.test.js` (nuevo, 8 casos). El indicador
visible de Configuración sigue pendiente, pero ya no es urgente — el escenario que lo motivaba (rotación
de VAPID keys) ya no requiere que nadie lo detecte a mano. Ver `issues/ISS-025-push-no-llega.md`.

**De paso (ISS-031):** una vez confirmado que el push llegaba, el usuario notó que el ícono aparecía como
un cuadrado gris en vez del logo. Causa: Android fuerza el ícono de badge (barra de estado) a una silueta
monocromática, y se estaba usando `icon-192.png` (opaco, sin transparencia) también como badge. Generado
`public/icons/badge-96.png` (monograma "MP" blanco sobre transparente, con Pillow) + `sw.js` bump a `v7`
+ actualizados los 4 puntos que disparan push. El logo de marca real (más allá del monograma) queda para
más adelante, a pedido explícito del usuario — "cuando ya seamos marca".

**Deploy:** commits `a1e08f3` (ISS-030) y `1c28cc0` (ISS-025 + ISS-031) pusheados a `main` y desplegados
por el usuario en producción el 2026-08-11.

---

## 🎯 Sesión 2026-08-11 (parte 2) — Cocina sin filtro por día + intervalos de polling (ISS-030)

Mismo día, continuación de la sesión del fix de tapper. El usuario pidió dos cosas tras confirmar que
ese fix funcionaba en producción:

1. **Cocina también debía filtrar "solo por día"**, como ya hace Cola del día desde ISS-026. Era
   exactamente el riesgo que había quedado anotado sin resolver en la sesión 2026-08-10 (parte 4):
   `GET /api/orders/activas` sin filtro de fecha y con N+1, usado por `cocina.js` junto con
   `/api/reservations?flag=es_en_cocina` (tampoco filtraba fecha).
2. **Subir los intervalos de refresco** de cara a la primera atención masiva del 2026-08-12.

Solución — ver [ISS-030](issues/ISS-030-cocina-sin-filtro-fecha.md):
- `utils/colaDia.js` — nueva `cocinaDelDia()`, reutilizando `ordenesActivas`/`reservasActivas`.
- `routes/orders.js` — nuevo `GET /api/orders/cola-cocina`.
- `public/js/modules/cocina.js` — usa el endpoint único, sin N+1.
- Intervalos: Cocina 15s→30s, Órdenes/Reservas/Mesas (`owner.html`) 10s→20s. Cola del día se dejó en 30s.
- `tests/cola-dia.test.js` ampliado con 5 casos para `cocinaDelDia` (20 en el archivo). 330/330 jest
  verde.

**Deploy:** commit `a1e08f3` pusheado a `main` y desplegado por el usuario en producción el 2026-08-11
(junto con `1c28cc0` — ver sesión parte 3).

**Además, en esta sesión:** el usuario reportó que las notificaciones push no le llegan y preguntó si es
un tema de permisos del celular. Repasado `issues/ISS-025-push-no-llega.md` (diagnosticado, no
implementado del todo) — el trigger de "pedido/reserva nueva" ya se agregó (commit `4373dce`, previo a
esta sesión), pero la suscripción push sigue sin feedback visible: si el permiso quedó denegado, si las
VAPID keys de producción no están cargadas, o si es iPhone sin la PWA instalada a pantalla de inicio, el
`catch` queda silencioso y no hay ningún indicador en Configuración. Sin ese diagnóstico visible no se
puede confirmar la causa real solo con lo que cuenta el usuario — falta implementar el punto pendiente de
ISS-025 (indicador "🔔 Notificaciones: activas/denegadas/sin configurar").

---

## 🎯 Sesión 2026-08-11 — Fix: cargo de tapper fijo en vez de por unidad (ISS-029)

**Reporte del usuario:** "cuando se asigna para llevar y son + de 1 menú por llevar igual cobra 1.5...
debería sumar 3 soles y así consecutivamente".

`cargo_modalidad` (Gap 5) se calculaba como monto fijo por orden/reserva, sin importar cuántos ítems se
pedían. Fix: escala por unidad — `costo_tapper × (cantidad de menús + cantidad de ítems a la carta)`,
más tarifa de delivery fija si aplica. Se amplió el alcance a pedido del usuario: la carta también suma
tapper por unidad (antes solo se planeaba para menús).

- `utils/menuPricing.js` — nueva `contarUnidadesMenu()`: deduce cuántos menús completos hay en un
  pedido contando filas de secciones obligatorias por `id_menu_dia` (no existe ID de "instancia de
  menú" en la BD).
- `routes/public.js` — `enriquecerMenuItems()` + `calcularCargoModalidad()`, usados en `POST /orders` y
  `POST /reservations` en lugar del cálculo fijo anterior.
- `public/menu.html` — `contarTappers(cartArr)` reemplaza el cálculo fijo en los 4 puntos donde se
  mostraba/enviaba el cargo (carrito de orden y de reserva, con y sin pago pendiente).
- `tests/precio-modalidad.test.js` ampliado a 29 casos (multi-menú, secciones opcionales, menús
  distintos, mezcla con carta). Verificado también con un smoke test manual end-to-end contra la BD
  real (creado y descartado en la sesión, sin dejar residuos) — 325/325 jest verde.

**Nota de flujo de la sesión:** antes de empezar el fix había 6 commits sin traer del remoto (sesión
persistente ISS-027, Cola del día ISS-026, cierre de pensionistas, backlog trackeado). Había además un
cambio local sin commitear en `vision_negocio.md` (Gaps 18/19 marcados completados) que no era de esta
sesión — se commiteó aparte antes del `pull` para no perderlo ni arriesgar un conflicto silencioso.

**Deploy:** commit `e8785bf` pusheado a `main` y desplegado por el usuario en producción el 2026-08-11
(manual, junto con los 6 commits previos ya traídos del remoto: `39a9ba9`..`b8e0f18` — sesión persistente
ISS-027, Cola del día ISS-026, cierre de pensionistas, backlog trackeado). Sin verificación post-deploy
registrada en esta sesión.

---

## 🎯 Sesión 2026-08-10 (parte 4) — Pensionistas: lógica CERRADA + reportería a rediseñar

**Sesión de decisiones, sin código.** Se cerró toda la lógica de negocio del módulo Pensionistas y
apareció un tema nuevo y grande: la reportería no le sirve a la clienta.

### 🚨 El miércoles 2026-08-12 es la primera atención masiva (+60 menús en el día)

**"El primer reto":** la primera vez que un piloto atiende volumen real con el sistema — más de 60
menús vendidos en un día, concentrados en el almuerzo. Todo lo que hoy anda con 2-3 pedidos
simultáneos se prueba de verdad ese día.

**Esto reordena el martes por completo.** El deploy deja de ser rutina: **`ISS-026` es literalmente el
bug de este escenario y está sin desplegar** (pedidos que no avanzan, que vuelven atrás, error falso
"No se puede cambiar una orden pagado" por doble tap). Correr el miércoles con la versión actual de
producción es chocar de frente con él en el peor día posible. `ISS-027` (sesión de 30 días) evita
además tener que reloguearse en pleno servicio.

**Plan del martes, en `backlog.md`:** deploy temprano (con margen para probar y reaccionar), prueba de
carga con los `k6` que ya existen, backup manual, y —si entra algo de features— el **contador simple
de "menús vendidos hoy"**, que es justo lo que la dueña va a querer mirar ese día y es mucho más chico
que el rediseño de reportería. **Pensionistas se posterga al jueves:** la lógica ya está cerrada y no
se pierde, pero meter un módulo grande el día antes de la primera atención masiva es exactamente
cuando no conviene tocar el sistema.

**Riesgo conocido a vigilar:** `GET /api/orders/activas` (panel Órdenes) conserva su N+1 y su falta de
filtro por fecha — quedó sin tocar a propósito en la sesión parte 1. Con 60 pedidos en el día es
candidato a ponerse lento; migrarlo a `utils/colaDia.js` es directo si aparece.

### Pensionistas — lógica definitiva, sin preguntas abiertas

El usuario reformuló el módulo entero, más simple que lo que se venía proponiendo:

> "Se le coloca el dinero que tiene y él va gastando; si se necesita más, la señora le coloca más, y
> así ad infinitum."

1. El pensionista **es un usuario más**, creado desde el panel Usuarios que el owner ya usa (rol nuevo
   `pensionista`). No hay registro paralelo: reutiliza lo que ya existe.
2. El owner le **carga el dinero**; cuando se acaba, recarga. Sin límite de veces.
3. El pensionista **entra por el login normal** y pide desde `pensionista.html`, descontándose del
   saldo, sin pantalla de pago.
4. **Aviso de saldo bajo** — S/20 por defecto, configurable por restaurante.
5. **Saldo insuficiente bloquea el pedido.** Razón: quien pide es el pensionista, y él no es quién
   para decidir que el restaurante le fíe; si el dueño quiere fiarle, le recarga.
6. **Todos los usuarios pasan a requerir email `@menupro.tech`.** Hoy `routes/usuarios.js:50` solo
   valida que no esté vacío y acepta cualquier dominio.

**Las 5 preguntas abiertas del `pensionistas.md` §11 quedaron respondidas.** Documentado en la **§0**
de ese archivo, que manda sobre el resto del documento.

**Descartado explícitamente (no volver sobre esto):**
- El **"v1 recortado" sin login del pensionista**, que se había anotado en `backlog.md` esa misma
  mañana. El usuario prefiere el flujo completo.
- **`id_usuario` nullable** — se había propuesto para permitir pensionistas sin login; ya no aplica.
- **Reutilizar `menu.html`** con un "modo pensionista". El usuario lo propuso, se le marcó el riesgo
  (es la carta pública por la que los 2 pilotos reciben pedidos hoy) y **él mismo eligió
  `pensionista.html`**: *"tienes razón, pensionistas.html tiene que ser la opción"*.

**Temor despejado:** preocupaba que mandar al pensionista a otra página fuera complicado porque "todos
los que entran al login van a `owner.html`". **No lo es:** `login.html:420` ya tiene el mapa
`ROLE_REDIRECT` por rol (construido en `ISS-007`), y los 3 roles actuales apuntan a `owner.html` solo
porque así se definió. Agregar `pensionista: '/pensionista.html'` es una línea.

**Primer paso acordado, chico e independiente:** forzar `@menupro.tech` en la creación de usuarios
(`routes/usuarios.js` + formulario en `owner.html`). **Aprobado pero no ejecutado** — el usuario
prefirió cerrar la sesión y seguir mañana.

### 🔴 Reportería — hay que rediseñarla entera

Tema nuevo, y es P0. Palabras del usuario: *"las gráficas son microscópicas y no dan nada de valor
que le interesa a la clienta"*.

**El dato #1 que la clienta quiere, y que hoy no se muestra en ninguna parte:**
> **cuántos menús va vendiendo en ese momento, en el día.**

- **No importa si vino por mesa o por reserva** — es la cantidad total de menús vendidos hoy. El
  sistema hoy separa esas dos fuentes en todos lados; para este número hay que unificarlas.
- Es un dato **en vivo**, para mirar en pleno servicio, no un reporte de cierre.
- Después: **qué platos** va vendiendo, mismo criterio.
- **Requiere análisis antes de codear** — qué métricas reemplazan a las actuales, cuáles se eliminan y
  cómo entra en 360px. El usuario pidió explícitamente que se analice.

**Aprovechar lo ya diagnosticado** en `features.md` (anotado 2026-07-13): el gráfico se ve chiquito
porque `#chart-pedidos-wrap` (`owner.html:557`) tiene `min-height:220px` sin `position:relative` ni
alto fijo, a diferencia de los otros dos; y `contarPedidosPorPlato()` (`routes/reportes.js`) no filtra
por fecha, así que muestra un acumulado histórico en vez de "hoy".

**Docs actualizadas:** `pensionistas.md` (§0 nueva + §11 cerrada), `backlog.md` (Pensionistas
reescrito, reportería como P0 nuevo, fecha del miércoles), `features.md` (ambas entradas), `status.md`.

---

## ⏸️ Sesión 2026-08-10 (parte 3) — Auto-actualización del SW CONGELADA + estado previo al deploy

**Leer esto antes de tocar `sw.js`.** Sesión sin cambios de código: se analizó la auto-actualización
del service worker (punto 4 del backlog de `conversacion_opues10082026.md`) y **el usuario decidió
congelarla**. El motivo es correcto: el beneficio es hipotético y el riesgo es romperle la app a un
dueño piloto justo antes de un deploy grande.

### Estado del repo al cerrar la sesión

- Working tree **limpio**, `main` == `origin/main`. Nada sin commitear.
- **Solo 2 commits sin desplegar** — los de ayer: `181ddf3` (`ISS-027` sesión persistente +
  `ISS-026` Cola del día) y `6d4576e` (`ISS-028` letra más grande + overflow).
- Todo lo de julio (gate de pago, Gap 18/19/21, íconos "MP", `ISS-018` a `ISS-024`) **ya está en
  producción** — ver "Corrección del log" abajo. `ISS-025` sigue sin fix, no es tema de deploy.
- `sw.js` local en `menupro-v6`; producción debería estar en `menupro-v4`. `.env` de producción
  **sin confirmar** las VAPID reales.

### Hallazgo técnico (para no re-descubrirlo)

`self.skipWaiting()` **ya existe** en `sw.js:20` y `clients.claim()` en `sw.js:29`. La tarea del
backlog estaba mal enunciada: no falta `skipWaiting`, ya está. Lo que falta, si algún día se retoma,
es lo otro: (1) la pestaña abierta nunca se recarga sola, así que el SW nuevo toma control pero el
HTML pintado sigue siendo el viejo; (2) nadie llama a `reg.update()` mientras la app está abierta
—`register()` solo corre al cargar la página (`owner.html:2328`)—, así que una PWA suspendida en
background no descubre el `sw.js` nuevo hasta que se la cierra y reabre. El patrón correcto sería
**quitar** `skipWaiting` del `install`, detectar el SW en `waiting` desde la página, y ofrecer un
banner con tap (no recarga automática: recargarle la pantalla a un dueño a media orden en hora punta
es peor que el problema).

### ⚠️ Corrección del log — hubo un deploy que nunca se registró

**`status.md` estaba incompleto.** La última sesión de deploy registrada era el **2026-07-09**
(`status.md:456`), lo que daba a entender que había 16 commits sin desplegar. **Es falso.** El
usuario confirmó que en producción ya están el ícono "MP" (`f626c98`, 2026-07-16) y el tamaño de
letra ajustable (`37a85a2`, 2026-07-14).

Corrobora desde el propio log: el análisis de `ISS-028` (sesión de ayer) constató que el overflow del
bloque "Link del menú" *"desbordaba desde 1.15×, **el nivel 'Grande' que ya estaba activo en
producción**"* — es decir, ayer ya se observó esa feature de julio corriendo en el servidor.

**Conclusión:** hubo un deploy manual entre el 2026-07-16 y el 2026-08-10, hecho por la consola web
del Droplet, que no quedó anotado. **Producción está en `f626c98` o posterior.**

**Confirmado en campo por el usuario (2026-08-10):** el dueño **ya está viendo la letra grande en su
celular**. Es evidencia de uso real, no de repo: la feature de julio llegó al dispositivo del dueño y
**el service worker se actualizó solo**, sin que nadie le pidiera cerrar y reabrir la app. Es el
argumento más fuerte para descartar la auto-actualización del SW del backlog.

**Lección de proceso:** todo deploy hecho por la consola web debe anotarse en `status.md`, o el log
miente sobre el estado real de producción y las decisiones se toman sobre datos falsos (como estuvo a
punto de pasar en esta sesión).

**Verificar mañana en el servidor, toma 5 segundos y cierra el tema:**
`cd /var/www/menupro && git log -1 --oneline` → deja constancia del commit exacto en el que estaba
producción **antes** del pull.

**Impacto en el piloto #1:** sigue en pie que probó una versión vieja. Usó la app el 13–14 de julio,
y los fixes `ISS-018` a `ISS-024` se desplegaron **después** de esos dos días.

### Plan acordado

1. **Mañana:** el usuario despliega a producción (`git pull origin main` + `pm2 restart menupro`) y
   prueba desde el celular. Trabajará **desde la otra laptop**. Son solo 2 commits (los de ayer).
2. Anotar el `git log -1` previo al pull, para cerrar la corrección de arriba.
3. Si tras el deploy los cambios se ven **sin cerrar y reabrir la app** → la auto-actualización del
   SW queda descartada definitivamente y se borra del backlog. Que el ícono "MP" y la letra
   ajustable hayan llegado solos al celular del dueño ya apunta fuerte en esa dirección.
4. **Avisarle al dueño que la letra le va a crecer otra vez.** Hoy ve la escala de julio
   (14 / 16,1 / 18,2px); el deploy de mañana la sube a **16,1 / 19,6 / 23,8px** y la migración
   `mp-font-scale-v2` le sube su preferencia guardada un nivel automáticamente (nunca la baja). Si
   no se le avisa, un cambio de tamaño que él no pidió puede leerse como una falla.
5. Si hay que cerrar y reabrir para verlos → se retoma con el diseño descrito arriba.
6. El usuario avisa el resultado. **Hasta entonces, no tocar `sw.js` salvo el bump de `CACHE` que ya
   exige `ISS-022` cuando cambie algún archivo de `ASSETS`.**

### 🆕 Regla de proceso nueva: preguntar por el deploy después de cada commit

Acordada en esta sesión, a pedido del usuario. **Al terminar cada commit, Claude debe preguntarle si
ya está desplegado**, y anotar la respuesta en `status.md`. Ataca la causa raíz del desfase que se
corrigió hoy: el deploy lo hace el usuario a mano, a veces días después y desde otra laptop, así que
el log solo puede quedar exacto si se le pregunta. Sin eso, cualquier sesión futura vuelve a calcular
mal qué está en producción. Documentada en `CLAUDE.md`.

### 📋 `backlog.md` (nuevo) — el backlog ahora viaja entre laptops

**Problema encontrado al cerrar la sesión:** el backlog de la etapa vivía solo en
`conversacion_opues10082026.md`, que está en `.gitignore` (`conversacion_*.md`). Los P0/P1, el recorte
de Pensionistas v1 y el contexto de los pilotos **existían únicamente en la laptop DESKTOP-LPSVKIS** —
mañana, desde la otra laptop, no habrían estado.

**Portado a `backlog.md`** (trackeado en git), con el estado real: 3.1 y 3.2 ✅, **3.3 es el único P0
de features abierto**, y **Pensionistas quedó desbloqueado** porque su dependencia era 3.2. El precio
de S/250 quedó marcado como **tentativo** por indicación del usuario. `CLAUDE.md` lo suma a la lista de
lectura de inicio de sesión y avisa que los `conversacion_*.md` no viajan; `features.md` apunta a él
desde "Pendientes".

### 🔒 Regla confirmada: los deploys los hace siempre el usuario

**Claude Code no despliega. Nunca tuvo ni va a tener acceso al servidor.** No es una limitación
temporal por la passphrase — es cómo funciona el proyecto. Documentado en `deploy.md` §16.

- Cuando una sesión cierra con "pendiente: deploy", **el trabajo de Claude ya está completo**; el
  deploy es un paso manual del usuario, cuando él pueda.
- Claude no debe proponer automatizar deploys, cargar claves en el `ssh-agent` ni pedir credenciales.
- El usuario ejecuta por **consola web del Droplet** o SSH interactivo, y **anota el deploy en
  `status.md`** (commit + fecha). Saltarse esa anotación es lo que produjo la corrección de arriba.

**Sobre la clave SSH:** la passphrase de `~/.ssh/id_rsa` no se recuerda de memoria (está en un cuaderno
en la oficina); el `ssh-agent` de Windows está `Stopped`/`Disabled` y la passphrase no es recuperable
del archivo (`aes256-ctr` + bcrypt). No bloquea nada: la consola web del Droplet no necesita la clave.
Plan B documentado en `deploy.md` §16 → "Acceso SSH al servidor".

**Siguiente del backlog tras el deploy:** **3.3** entrada directa a Cola del día (último P0 abierto;
3.1 y 3.2 se cerraron ayer).

---

## ✅ Sesión 2026-08-10 (parte 2) — Letra más grande + 2 bugs de overflow (ISS-028)

**Prompt:** "ahora sigamos con la letra más grande aún, ya está grande, más grande" — punto 3.1 del
backlog acordado.

**Medición antes de tocar nada** (Playwright a 360px, recorriendo 10 paneles × 8 escalas): el sistema ya
existía con base 14px y niveles 1 / 1.15 / 1.3 (14 / 16,1 / 18,2px). Pero la medición encontró que
**subir la escala estaba bloqueado por overflow horizontal ya existente**, no por falta de espacio real.

**2 bugs de layout encontrados y corregidos** (ISS-028) — el primero ya afectaba a producción:
1. **Bloque "Link del menú" + QR en Configuración** — desbordaba desde **1.15×, el nivel "Grande" que
   ya estaba activo en producción**: un dueño que eligiera "Grande" tenía scroll horizontal justo en la
   pantalla donde se configura el tamaño de letra. Causa: el contenedor de la columna derecha es un flex
   item sin `min-width:0`, así que su ancho lo fijaba el contenido más largo ("⬇ Descargar PNG") y nunca
   encogía. Fix: `flex:1 1 200px; min-width:0` + `flex-wrap` en la fila del input.
2. **`.page-title` del topbar** — desbordaba desde 1.4× **en todos los paneles**, porque el topbar
   siempre está visible. Causa: `flex:1` sin `min-width:0` — un flex item no encoge por debajo de su
   min-content, así que el título empujaba los botones fuera de la pantalla. Fix: `min-width:0` +
   `text-overflow: ellipsis`. Además el padding del topbar pasó de `1.6rem` a px fijos en móvil: en rem
   crecía con la letra y se comía el ancho disponible justo cuando más falta hacía.

**Falsos positivos descartados con una segunda medición** (que distingue overflow real de scroll interno
legítimo, comprobando si la página efectivamente se desplaza): los tabs (`.tabs` ya tiene `overflow-x:
auto`), el carrusel de Home y la tabla de Usuarios (`.table-wrap`, `owner.css:419`) **no** eran bugs.
Sin esa distinción se habrían "arreglado" 3 cosas que ya funcionaban.

**Escala subida** (decisión del usuario entre 3 opciones): **1,15 / 1,4 / 1,7 → 16,1 / 19,6 / 23,8px**.
Se mantienen 3 botones en vez de agregar un 4º — menos opciones es mejor para un dueño de 70 años. El
"Normal" nuevo equivale al "Grande" viejo.

**Migración de la preferencia guardada:** la key pasó a `mp-font-scale-v2`. Versionarla era necesario
porque **1.15 existe en ambos esquemas con significados distintos** (era "Grande", ahora es "Normal") y
por el número solo no se puede saber cuál guardó el usuario. Cada nivel viejo sube a su equivalente
nuevo, **nunca baja**: encogerle la letra a quien ya la había agrandado sería lo contrario de lo pedido.

**Verificación** — `scripts/test-escala-tipografica.js` (nuevo, Playwright): **14/14 verde**. Cubre los
3 niveles × 13 paneles sin scroll horizontal real a 360px, touch targets ≥44px y inputs ≥16px (anti-zoom
de iOS) en la escala máxima, persistencia tras recargar, y los 4 casos de migración. Capturas visuales
de Cola del día y Configuración a 1,7× revisadas: entra todo. **317/317 jest verde.**

`sw.js`: `CACHE` → **`menupro-v6`** (`owner.html` y `owner.css` están en `ASSETS` y ambos cambiaron).

**Pendiente:** deploy. `menu.html` (la carta del cliente) **no** se tocó — decisión del usuario, queda
para más adelante.

---

## ✅ Sesión 2026-08-10 — ISS-027 (sesión persistente) + ISS-026 (Cola del día trabada)

**Prompt:** el usuario trajo `conversacion_opues10082026.md` (contexto y prioridades de la etapa) y
eligió 2 features: **(1)** entrar a la app sin iniciar sesión cada vez, como WhatsApp; **(2)** arreglar
la lentitud, que aparece con apenas 2-3 pedidos simultáneos.

Al preguntarle dónde veía exactamente la lentitud, la respuesta cambió el diagnóstico: *"cuando
intentas pasar de un lugar de la cola a otro se pone lento y a veces no te pasa el pedido, o se queda
esperando mucho tiempo, o sale error que ya se envió a cobrados y no desaparece de la cola"*. No era
lentitud de base de datos: era una **carrera entre el poll y los taps**.

### ISS-027 — Sesión persistente

**Diagnóstico — 2 causas, la segunda era la real:** el JWT y la cookie duraban `8h`
(`routes/auth.js`), pero sobre todo la sesión vivía en **`sessionStorage`** (`owner.html:1089`,
`login.html:412`), que el navegador **borra al cerrar la PWA**. Aunque la cookie siguiera viva, al
reabrir la app no había `session` y el guard redirigía al login. **Subir el `expiresIn` solo no habría
arreglado nada.**

**Implementado:**
- `utils/sesion.js` (nuevo) — reglas puras testeables: `diasSesion()`, `cookieSesion()`,
  `necesitaRenovacion()`. Mismo patrón que `horarioAtencion.js`/`verificacionPago.js`.
- Sesión de **30 días** con **renovación deslizante**: `GET /api/auth/me` (nuevo) revalida la cookie y
  emite una nueva si le queda menos de la mitad de vida. Relee al usuario de la BD, no solo del token
  — con 30 días, un cambio de permisos o un restaurante desactivado tardaría un mes en aplicarse.
- **El admin del SaaS queda acotado a 1 día**: usa el mismo `/api/auth/login`, así que sin esta
  distinción habría heredado los 30 días en la cuenta más privilegiada del sistema.
- `sameSite` `'strict'` → **`'lax'`**: con `strict` el navegador no manda la cookie en la navegación
  inicial hacia la app, justo el caso de abrir la PWA desde el ícono.
- `public/js/session.js` (nuevo) — sesión en `localStorage` con key `mp-session` (para no cruzarse con
  el panel admin, que sigue en `sessionStorage`) y **migración automática** desde la sesión vieja: nadie
  queda deslogueado el día del deploy.
- `login.html`: splash "Entrando…" aplicado **antes del primer paint** (mismo patrón que el tema y el
  tamaño de letra). Sin red se entra igual con la sesión local, en vez de mostrar el login a quien ya
  estaba dentro solo porque se cayó el wifi.
- **Bug propio detectado y corregido en el camino:** `utils.js` redirigía al login ante un 401 sin
  limpiar la sesión local. Con `localStorage` (que ya no se borra solo) eso habría creado un **bucle
  infinito login ↔ panel**. Se agregó `limpiarSesion()` antes de redirigir.
- `sw.js`: `CACHE` bumpeado a **`menupro-v5`** — `owner.html` está en `ASSETS` y cambió su guard
  (obligatorio, ver ISS-022).

### ISS-026 — Cola del día

**Diagnóstico — 3 defectos que se realimentaban:**
1. **Doble tap:** `accionRapidaOrden()` no bloqueaba el botón. El primer `PATCH` funcionaba, el segundo
   chocaba con la guarda de `routes/orders.js:370` → *"No se puede cambiar una orden pagado"*. **El
   error aparecía por una acción que sí había funcionado.**
2. **El poll repintaba el estado viejo:** sin token de secuencia, las respuestas de un poll iniciado
   antes del `PATCH` llegaban después y `renderZona()` reemplazaba el HTML con datos anteriores al
   cambio — el pedido reaparecía en su zona previa.
3. **Cero feedback inmediato:** entre el tap y el repintado corrían 1 `PATCH` + 6 `GET`, cada uno con
   su N+1, sobre `better-sqlite3` (síncrono, bloquea el proceso entero). Eso alimentaba el defecto 1.

Encontrados de paso: **(4)** "Confirmar pago" desde la Cola llamaba a las funciones de `ordenes.js`,
que refrescan *el panel de Órdenes*, no la Cola; **(5)** `GET /api/orders/activas` no filtraba por
fecha, así que toda orden nunca cobrada seguía activa para siempre arrastrando su N+1.

**Implementado:**
- `pedidos.js`: guard por ítem (`_enVuelo`), token de secuencia (`_cargaSeq`), **actualización
  optimista** con reversión si el backend rechaza, `reiniciarPoll()` tras cada acción, y
  `confirmarPagoColaOrden()`/`confirmarPagoColaReserva()` propias de la Cola.
- `utils/colaDia.js` (nuevo) + **`GET /api/orders/cola`**: órdenes + reservas activas en 1 llamada con
  un número **fijo** de consultas (6) sin importar cuántos pedidos haya. Reemplaza las 6 requests con
  N+1 que hacía `pedidos.js`.
- Filtro por fecha con **`substr(fecha,1,10)`**: `ordenes.fecha` tiene formatos mezclados en la BD
  (`'2026-08-10'` y `'2026-06-04 03:46:13'`), un `WHERE fecha = ?` nunca habría matcheado los largos.
  Las reservas usan `>= hoy` y no `= hoy` — las futuras deben verse para poder confirmarlas.

### Cierre de caja (decisión de producto)

**Hallazgo que cambió el diseño:** `total` solo se escribe al marcar la orden como cobrada
(`orders.js:377`) y Ganancias suma `WHERE total IS NOT NULL` (`reportes.js:385`). **Un pedido que
nunca se cerró no aparece en las Ganancias, nunca.** En la BD local había 5 así, todas con `total NULL`.
Ocultarlos de la cola sin más habría sido perder ese dinero para siempre.

Se le presentaron 4 opciones al usuario y **eligió el cierre de caja**, descartando explícitamente el
auto-cierre nocturno: nada que involucre dinero se cierra solo. La cola muestra solo hoy; un banner
avisa cuántos quedaron abiertos y un modal permite marcarlos "💰 Se cobró" (entra a Ganancias) o
"✗ No se concretó" (cancela y devuelve stock). Nuevo `GET /api/orders/sin-cerrar`.

### Verificación

- **`scripts/test-cola-carrera.js`** (nuevo, Playwright, fuera de jest) — **21/21 verde**: doble tap →
  1 solo PATCH sin error falso; respuesta de poll retenida 3 s que llega tarde → el pedido **no**
  reaparece; con el PATCH retrasado 2,5 s la card ya se movió a los 400 ms; ante un 400 la card vuelve
  y la BD queda intacta; cierre de caja lleva `total` de `NULL` a persistido; sesión persistente
  completa incluido el caso "sin cookie vuelve al login sin bucle".
- **`tests/sesion-persistente.test.js`** (19 casos) y **`tests/cola-dia.test.js`** (15 casos) nuevos.
- **`curl` contra servidor real:** `/me` sin cookie 401, vencida 401, fresca 200 sin renovar, por
  vencer 200 + `Set-Cookie` con `Max-Age=2592000; HttpOnly; SameSite=Lax`.
- **317/317 jest verde** (283 previos + 34 nuevos).

**Bonus — 2 tests que ya estaban rojos antes de esta sesión, arreglados:**
`recordatorio-menu.test.js` fallaba desde el 17 de julio. La causa era del **código de producción**, no
del test: `procesarRecordatoriosMenu()` recibe un `ahora` inyectable pero llamaba a
`restaurantesSinMenuHoy(db)` sin fecha, usando el reloj real del servidor — el job miraba el menú de un
día distinto al que estaba evaluando. Fix: `fechaLima()` ahora acepta un momento inyectable y el job
deriva la fecha de su propio `ahora`.

**Pendiente:**
- **Deploy a producción** — ~~acumulado con todo lo de julio (íconos "MP", Gap 21, fixes ISS-018 a
  ISS-025)~~. **Corregido en la sesión parte 3:** lo de julio **ya estaba desplegado** (deploy manual
  sin registrar); lo único pendiente son los 2 commits del 2026-08-10. Avisar que, igual que con
  ISS-022, quien tenga la PWA instalada podría necesitar **cerrar y reabrir la app una vez** para que
  el navegador note el `sw.js` nuevo (`menupro-v6`).
- `GET /api/orders/activas` (panel de **Órdenes**, no la Cola) conserva su N+1 y su falta de filtro por
  fecha. No se tocó para no cambiar ese panel en el mismo trabajo; migrarlo a `utils/colaDia.js` es
  directo si aparece lentitud ahí.
- Siguientes del backlog acordado: **3.1** letra aún más grande y **3.3** entrada directa a Cola del día.

---

## ✅ Sesión 2026-07-16 (parte 3) — Ícono de la PWA: "RA" → "MP"

**Prompt:** "ahora sale RA en el logo de la app" — el ícono instalado en el celular mostraba un monograma
placeholder de una marca anterior.

**Diagnóstico:** `public/icons/icon-192.png`/`icon-512.png` tenían el monograma "RA" horneado en el PNG
(no era texto en HTML/CSS — ni `login.html` ni `owner.html` tienen ese problema, ambos ya usan 🍽️ en
`.brand-icon`). No existía ningún script versionado que generara esos íconos.

**Fix:** `scripts/generate-app-icons.js` (nuevo) — usa Playwright (ya devDependency, mismo enfoque que
`take-landing-screenshots.js`) para renderizar un `<div>` con los colores de marca ya establecidos
(terracota `#c8692a` + círculo `#a0521e`) y el monograma "MP", capturado a 192×192 y 512×512 exactos.
`public/sw.js`: `CACHE` bumpeado a `menupro-v4` — los íconos están en `ASSETS`, así que sin este bump los
celulares con la PWA ya instalada seguirían viendo "RA" para siempre (mismo mecanismo que `ISS-022`).

**Verificación:** dimensiones de los PNG confirmadas (192×192 / 512×512 exactos), inspección visual de
ambos íconos. **283/283 jest verde** (sin tests nuevos — cambio de assets estáticos).

**Pendiente:** deploy a producción + avisar que, igual que con `ISS-022`, los usuarios con la PWA ya
instalada necesitan cerrar y reabrir la app una vez para que el navegador note el `sw.js` nuevo.

---

## ✅ Sesión 2026-07-16 (parte 2) — Gap 21: notificaciones push ampliadas

**Prompt:** implementar el Gap 21 anotado en la parte 1 de hoy — push de orden/reserva nueva + recordatorio
de menú sin configurar cada 8h. Ejecutado paso a paso con aprobación entre cada uno.

**Implementado:**
1. Migración idempotente `restaurantes.ultimo_recordatorio_menu TEXT DEFAULT NULL` (`config/database.js`).
2. `utils/pushNotificaciones.js` (nuevo): `enviarPushRestaurante(db, id_restaurante, payload, wpush)`
   genérico, extraído de la lógica que antes vivía solo en `autoPreparacion.js` (envío + limpieza de
   suscripciones vencidas 410). `autoPreparacion.js` refactorizado para delegar en él, sin cambiar su
   comportamiento (verificado con sus 17 tests existentes, todos verdes).
3. `routes/public.js`: tras `POST /orders` y `POST /reservations` exitosos, envía push "🆕 Nueva
   orden"/"🆕 Nueva reserva". `web-push` es un módulo singleton ya configurado con las VAPID keys por
   `app.js`, así que `routes/public.js` solo necesita requerirlo, sin pasarlo por parámetros.
4. `utils/recordatorioMenu.js` (nuevo): job cada 30 min, detecta restaurantes activos sin menú del día de
   hoy y envía push solo si pasaron ≥8h desde el último aviso (throttle vía la columna nueva). Funciones
   puras testeables (`yaPasaron8Horas`, `restaurantesSinMenuHoy`) siguiendo el mismo patrón que
   `autoPreparacion.js`/`horarioAtencion.js`.
5. `app.js`: arrancado el nuevo job junto al de auto-preparación.

**Tests:** `tests/recordatorio-menu.test.js` (16 casos nuevos — throttle de 8h con bordes exactos,
detección de restaurantes sin menú activo/de otro día/inactivos, payload, múltiples restaurantes por
tick, comportamiento sin wpush). **283/283 jest verde** (267 previos + 16 nuevos).

**Verificación manual:** servidor real levantado en puerto de prueba — orden creada con éxito vía `curl`
contra el restaurante demo (sin errores, sin suscripciones push activas por lo que el envío no-opea
limpio); servidor arranca sin errores con ambos jobs corriendo. Orden de prueba eliminada al final.

**Gap 21 cerrado** en `vision_negocio.md`/`features.md`.

**Pendiente:** deploy a producción; feedback visible en Configuración sobre el estado de la suscripción
push (relacionado con `ISS-025`, no implementado en esta sesión).

---

## ✅ Sesión 2026-07-16 — Documentación: primera experiencia piloto + `pilotos.md` (nuevo)

**Prompt:** el usuario contó que el restaurante piloto #1 usó la app lunes y martes (13-14 de julio), se
quejó de que era difícil y dejó de usarla miércoles/jueves. Pidió opinión, documentarlo, y qué dudas
plantear. En mensajes siguientes agregó quejas concretas (letra chica, sin notificaciones tipo
WhatsApp/Temu, lentitud, botón de pago no se veía) y el timeline completo desde el primer contacto
(2026-07-02).

**Análisis:** cruzando el timeline contra `status.md`/`issues/` ya existentes, casi todas las quejas
coinciden con bugs reales activos exactamente esos días: `ISS-018` (botón de pago sin scroll, resuelto el
mismo 13 de julio que ella empezó), tamaño de letra ajustable (no existía hasta el 14), `ISS-023` (Cola
lenta en horas pico, resuelto el 14). Hallazgo clave: `ISS-022` (Service Worker con caché desactualizado
desde el 29 de mayo, resuelto el 14) requiere que el usuario cierre y reabra la PWA una vez para ver
cualquier fix — nadie se lo indicó a ella, por lo que es probable que **nunca haya visto la versión
corregida** durante sus 2 días de prueba. Reencuadre: no parece resistencia al cambio pura, sino una prueba
real hecha en el peor momento posible, con fixes que pudieron no haberle llegado al celular.

Sobre notificaciones: confirmado en código que el push **solo** existe para "hora de preparar" (X min antes
de una reserva confirmada, `utils/autoPreparacion.js`) — no hay ningún push al crear un pedido/reserva
nuevo, que es lo que ella parece esperar (comparación con WhatsApp/Temu). Además la suscripción push es
100% silenciosa (`owner.html`, sin feedback visible, catch vacío) — imposible saber desde la UI si está
activa, denegada, o si faltan las VAPID keys de producción.

**Documentación creada/actualizada:**
- `pilotos.md` (nuevo) — timeline completo, tabla de quejas cruzadas contra estado técnico real,
  reencuadre, aprendizajes para pilotos futuros, plantilla para próximos pilotos.
- `issues/ISS-025-push-no-llega.md` (nuevo) — diagnóstico de por qué no llega el push (trigger inexistente
  + suscripción silenciosa), decisión de producto pendiente (¿agregar push de "pedido nuevo"?).
- `issues/ISSUES.md` — nueva sección "Fix pendiente" con ISS-025.

**Pendiente (no requiere código todavía):**
- Volver a hablar con la dueña y forzar cierre+reapertura (o reinstalo) de la PWA antes de cualquier
  conclusión sobre su interés real.
- Confirmar VAPID keys reales cargadas en el `.env` de producción.
- Decidir con el usuario si se construye el push de "pedido/reserva nueva" (gap de producto nuevo).
- Sin cambios de código en esta sesión.

---

## ✅ Sesión 2026-07-15 — Análisis: módulo Pensionistas (documentación, sin implementar)

**Prompt:** el usuario quiere un nuevo módulo para que los restaurantes asignen pensionistas — comensales
recurrentes que pagan por adelantado (semana/mes) y consumen contra ese pago. Pidió primero un análisis
arquitectónico en `pensionistas.md`, sin implementar. En una segunda vuelta afinó el diseño: saldo en
**dinero** (no menús contados), gestión desde un módulo nuevo del owner "Pensionistas" (como crear
usuarios, pero sin selector de rol), el pensionista tiene **login propio** para pedir, sus pedidos van
en un espacio separado de Órdenes/Reservas pero aparecen con **tag "Pensionista"** (nombre y apellido
visibles) en Cola del día y Cocina.

**Análisis completo en `pensionistas.md` (nuevo).** Puntos clave de la arquitectura propuesta:
- Rol nuevo `pensionista` en la tabla `roles`, reutilizando el JWT/login/cookie existente
  (`routes/auth.js`, `middleware/authenticate.js`) — no se construye un sistema de auth paralelo.
- 3 tablas nuevas: `pensionistas` (extiende `usuarios` 1-a-1 con apellido/teléfono/saldo),
  `pensionista_movimientos` (ledger de recargas/consumos, evita disputas de "yo recargué y no aparece"),
  `pedidos_pensionista` + items (deliberadamente separada de `ordenes`/`reservas`).
- Cola del día y Cocina pasan de unificar 2 fuentes a 3 (`ordenes` + `reservas` + `pedidos_pensionista`),
  con tag visual distintivo.
- Reportería separada: recargas (ingreso real) vs. consumo (gasto del saldo ya cobrado), para no
  contar el mismo dinero dos veces en "Ganancias".
- Quedan 5 preguntas de negocio sin responder (documentadas en `pensionistas.md` §11) — la más
  importante: ¿saldo insuficiente bloquea el pedido o se permite negativo ("fiado")?

**Documentación actualizada:** `vision_negocio.md` (Gap 20, nuevo), `features.md` (entrada en Pendientes).

**Pendiente:** decisión del usuario sobre las preguntas abiertas antes de armar el TODO list de
implementación. Sin cambios de código en esta sesión.

---

## ✅ Sesión 2026-07-14 (parte 5) — ISS-023 + ISS-024: lentitud en horas pico

**Prompt:** el usuario reportó lentitud al reabrir la app, notada especialmente con varios pedidos/en horas pico, más lentitud aparte al cargar imágenes del menú. Pidió poder auditar con una carga masiva simulada en vez de adivinar.

**ISS-023 — Cola del día:** `pedidos.js` pedía `GET /api/reservations` **sin filtro** en cada poll de 15s — traía todo el historial de reservas (+ N+1 de ítems por cada una). Como `better-sqlite3` es síncrono, esa consulta bloqueaba el proceso Node entero mientras se resolvía, no solo la pantalla de quien la pidió — coincide con que se sienta peor en horas pico (más historial acumulado + más gente usando el sistema a la vez). `reservas.js` ya resolvía esto bien (5 llamadas por `flag`); se replicó el mismo patrón en `pedidos.js`.

**Auditoría** (`scripts/audit-carga-cola.js`, nuevo — sembró 3000 reservas históricas realistas contra el restaurante piloto, midió, limpió los datos al final): **540ms → 38ms, 14.2× más rápido, 95% menos datos transferidos.**

**ISS-024 — Imágenes del menú:** de paso, se encontró que `/uploads` se sirve sin ningún header de caché (`express.static` sin `max-age`) — cada carga de página vuelve a pedir cada foto al servidor, aunque nunca cambien (los nombres ya son versionados con timestamp desde ISS-015, así que cachearlas para siempre es seguro). Se agregó `Cache-Control: public, max-age=31536000, immutable` solo para `/uploads`, sin tocar el caché de `owner.html`/`css`/JS (deben seguir revalidando siempre).

**Verificación:** `curl -I` confirma los headers correctos en ambos casos. **267/267 jest verde** en todo el proceso.

**Pendiente:** deploy a producción (acumulado con todo lo de hoy: Gap 17/18/19, tamaño de letra, ISS-018 a ISS-024).

---

## ✅ Sesión 2026-07-14 (parte 4) — Gap 19: cancelar desde Cola del día

**Prompt:** "la del botón de cancelar para que se pueda tener eso pendiente" — cierre del Gap 19 (la modalidad ya se mostraba en la Cola desde antes; solo faltaba cancelar).

**Implementado:** `public/js/modules/pedidos.js` — botón "✗ Cancelar" agregado en `renderKanbanOrden()` (siempre visible, cualquier etapa) y `renderKanbanReserva()` (oculto si `es_cliente_llego` o `es_full`, mismo criterio que el panel de Reservas). Reutiliza `accionRapidaOrden()`/`accionRapidaReserva()`, ya existentes en el mismo archivo — mismo endpoint `PATCH /:id/estatus` que usan Órdenes/Reservas, sin cambios de backend (la devolución de stock ya la maneja ese endpoint).

**Verificación:** Playwright contra servidor real — orden y reserva creadas vía API pública, canceladas desde la zona "Pendientes" de la Cola, confirmado el cambio de estatus en la BD (`cancelado`/`cancelada`); verificado además que en la zona "Por cobrar" el botón se mantiene para órdenes pero se oculta para reservas con cliente ya llegado. **267/267 jest verde** (sin tests nuevos — reutiliza endpoints ya cubiertos por la suite existente).

**Gap 19 cerrado** en `vision_negocio.md`.

**Pendiente:** deploy a producción (acumulado con Gap 17/18, tamaño de letra, ISS-018 a ISS-022). Siguiente en el backlog: Estadísticas de pedidos ("qué pidió la gente hoy" + fix del gráfico chico).

---

## ✅ Sesión 2026-07-14 (parte 3) — ISS-022: Service Worker servía `owner.html` desactualizado

**Prompt:** el usuario desplegó la sesión anterior a producción pero seguía sin ver la card nueva de "Tamaño de letra". Mandó captura (`issue_texto.png`) mostrando `owner.html` sin la card.

**Diagnóstico:** `public/sw.js` cachea `owner.html`/`menu.html`/`css/owner.css` (están en `ASSETS`) con estrategia cache-primero — el navegador solo refresca ese caché cuando el contenido de `sw.js` mismo cambia. `CACHE = 'menupro-v2'` no se había bumpeado desde el commit `a4f8d7` (**2026-05-29**) — cualquier visitante desde esa fecha quedó con esas 3 páginas cacheadas de forma permanente, sin importar cuántos deploys posteriores se hicieran. Esto probablemente explica retroactivamente por qué varios fixes de sesiones anteriores (ISS-016 a ISS-021, Gap 17, Gap 18) parecían no funcionar tras desplegarse.

**Fix:** `public/sw.js` → `CACHE = 'menupro-v3'`. Ver [ISS-022](issues/ISS-022-service-worker-cache-desactualizado.md) para el detalle completo y la recomendación de bumpear esta constante en cada deploy futuro que toque esos 3 archivos (o migrar a network-first/stale-while-revalidate).

**Verificación:** Playwright — simulado el escenario exacto (caché `menupro-v2` con un `owner.html` viejo puesto a mano), registrado el `sw.js` nuevo, confirmado que el caché viejo se borra y el nuevo queda poblado con el HTML real actualizado; tras recargar con sesión de owner válida, los 3 botones `.font-scale-btn` aparecen en el DOM. **267/267 jest verde.**

**Pendiente:** deploy a producción + avisar al usuario que además del `git pull`/`pm2 restart` puede necesitar cerrar y reabrir la PWA una vez para que el navegador note el `sw.js` nuevo.

---

## ✅ Sesión 2026-07-14 (parte 2) — Tamaño de letra ajustable en el panel del owner

**Prompt:** "ahora para aumentar el tamaño de letra" — siguiente ítem del backlog documentado en `features.md` (anotado 2026-07-13).

**Decisiones de diseño (2 preguntas al usuario antes de implementar, vía AskUserQuestion):** 3 niveles fijos (Normal/Grande/Muy grande), control solo dentro de Configuración (no en el sidebar).

**Mecanismo — diagnóstico técnico probado empíricamente antes de decidir:**
1. `zoom` (probado primero por ser el cambio de menor alcance) **se descartó** — verificado con Playwright que rompe `grid-template-columns: repeat(auto-fill, minmax(...))` del Home: `.home-card` terminaba renderizando en fila (hasta 1270px de ancho en un viewport de 360px) en vez de apilarse en columna.
2. Se optó por convertir mecánicamente los ~247 `font-size` en `px` de `owner.css` + `owner.html` + 9 módulos JS + 5 widgets a `rem` (script de migración temporal en el scratchpad, no versionado) y escalar con `--font-scale` sobre `html,body`.

**Bug propio detectado y corregido en el camino (antes de commitear):** la primera pasada dividió cada `px` por 16 (el default del navegador) en vez de por 14 (la base real de `html,body{font-size:14px}` del proyecto desde antes de este cambio) — eso encogía **todo el panel ~12.5%** incluso en el nivel "Normal", y además dejaba los inputs marcados originalmente como 16px (regla obligatoria anti-zoom de iOS) por debajo del mínimo. Como los archivos migrados no estaban commiteados aún, se revirtieron con `git checkout` (Gap 18 de la sesión anterior ya estaba a salvo en el commit `ed4293f`) y se rehizo la conversión dividiendo por 14.

**Implementado:**
- `utils`/CSS: `html,body { font-size: calc(14px * var(--font-scale, 1)); }` — raíz en `px` absoluto (un `rem` en el propio elemento raíz se resolvería contra el default del navegador, no contra sí mismo, reintroduciendo el mismo bug).
- Resto del CSS/JS convertido a `rem` relativo a esa raíz (script mecánico: `rem = px / 14`, redondeado a 6 decimales).
- `public/owner.html`: script en `<head>` (mismo patrón que el tema claro/oscuro, aplicado antes del paint para evitar flash) — lee `localStorage['mp-font-scale']`, aplica `--font-scale`, expone `window.setFontScale(factor)`. Nueva card "🔤 Tamaño de letra" en Configuración con 3 botones.
- `public/js/modules/config.js`: `loadConfiguracion()` marca el botón activo según `localStorage`.
- `public/css/owner.css`: `.font-scale-btn`/`.font-scale-btn.active`.

**Verificación con Playwright (JWT firmado localmente + sessionStorage simulado, sin adivinar contraseñas):** a escala Normal, cada elemento reproduce el `px` original exacto (`brand-icon` 20px, `.nav-item` 14px, 5 inputs muestreados incluidos los del horario de atención — todos en 16px, igual que antes); a 1.3 el root pasa a 18.2px y un input de 16px pasa a 20.8px (proporcional, nunca por debajo de 16px ya que los 3 niveles son siempre ≥100%); sin overflow horizontal en Home/Configuración/Cola del día en los 3 niveles (`scrollWidth === innerWidth` siempre). Persistencia confirmada tras recargar (aplicado antes del paint, sin flash). **267/267 jest verde** (sin cambios de backend).

**Pendiente:** deploy a producción, acumulado con Gap 17/18 y los fixes ISS-018 a ISS-021.

---

## ✅ Sesión 2026-07-14 — Gap 18: horario de atención configurable y estricto

**Prompt:** siguiente ítem del backlog (Gap 18, anotado 2026-07-13). El usuario pidió que no se pueda registrar ninguna orden ni reserva antes de la hora de atención.

**Decisiones de diseño (3 preguntas al usuario antes de implementar, vía AskUserQuestion):**
1. Un solo rango horario para toda la semana **más** selección de días de atención (ej. Lun–Sáb, cerrado domingo) — no horarios distintos por día.
2. Para reservas: se valida tanto el momento en que el cliente confirma (hora actual) **como** la `hora_llegada` futura si la especifica — no puede reservar para una hora fuera del horario de atención aunque sea otro día.
3. En `menu.html`, el cliente sigue viendo la carta/menú con normalidad; solo se bloquea el envío final (con banner de aviso + botón deshabilitado).

**Implementado:**
- **BD** (`config/database.js`): migración idempotente — `restaurantes.horario_activo` (apagado por defecto, no rompe restaurantes existentes), `hora_apertura`/`hora_cierre` (TEXT 'HH:MM'), `dias_atencion` (TEXT, días JS `getDay()` separados por coma).
- **`utils/horarioAtencion.js`** (nuevo): funciones puras `estadoHorario`, `validarHorarioAhora`, `validarHorarioReserva`, `mensajeHorario`. Límite conocido documentado: no soporta horarios que crucen la medianoche (asume apertura < cierre en el mismo día).
- **`routes/public.js`**: `getRestaurante()` trae las nuevas columnas; `POST /orders` y `POST /reservations` bloquean con 400 si el restaurante está cerrado (reservas validan además la `hora_llegada` futura); `GET /restaurante/:id` expone `horario` (activo, apertura, cierre, días, `abierto_ahora`, mensaje) para que el cliente pinte el banner sin adivinar.
- **`routes/menu.js`**: `GET /restaurante/config` expone los nuevos campos; nuevo `PATCH /config/horario` (valida formato HH:MM, apertura < cierre, días válidos).
- **Frontend owner** (`public/owner.html` + `public/js/modules/config.js`): nueva card "🕐 Horario de atención" — toggle activar, inputs `type="time"`, checkboxes de días de la semana (mismo patrón que "Auto-preparación"/"Cancelación de reservas").
- **Frontend cliente** (`public/menu.html`): banner "🕐 Cerrado — Atendemos..." cuando aplica; botones "Confirmar pedido"/"Confirmar reserva" deshabilitados con el mismo mensaje; guarda adicional dentro de `confirmarPedido()`/`confirmarReserva()` por si el horario cambia mientras el cliente tiene la página abierta (el backend valida igual, defensa en profundidad).

**Tests:** `tests/horario-atencion.test.js` (13 casos sobre las funciones puras — rango horario, borde de cierre exclusivo, día no atendido, validación de `hora_llegada` futura). **267/267 jest verde** (254 previos + 13 nuevos). Verificación E2E real con Playwright (`scripts/test-horario-atencion.js`, nuevo, no forma parte de jest): 9/9 — restaurante cerrado bloquea backend (orden y reserva) y muestra banner + botón deshabilitado en `menu.html`; restaurante abierto permite crear y oculta el banner; reserva con `hora_llegada` fuera del rango configurado se bloquea aunque el momento de creación esté dentro de horario. Verificado además manualmente con `curl` contra servidor local (owner autenticado con JWT firmado localmente): GET/PATCH `/api/menu/config/horario` guardan y persisten correctamente; probado también guardar+recargar la card en `owner.html` con Playwright, confirmando que la UI lee lo persistido tras recargar.

**Gap 18 cerrado** en `vision_negocio.md`.

**Pendiente:** deploy a producción (`git pull` + `pm2 restart menupro`), junto con los pendientes acumulados de sesiones anteriores (gate de pago obligatorio Gap 17, fixes ISS-018 a ISS-021). Siguiente ítem del backlog: Gap 19 (Cola del día: cancelar pedido + mostrar modalidad).

---

## ✅ Sesión 2026-07-13 (parte 3) — Gap 17: gate de pago obligatorio + nombre obligatorio en órdenes

**Prompt:** "comenzamos con el gate de pago obligatorio + nombre obligatorio" — siguiente ítem del backlog documentado en la sesión anterior.

**Decisiones de diseño (2 preguntas al usuario antes de implementar, vía AskUserQuestion):**
1. Restaurante con solo Efectivo activo (sin Yape/Plin): se mantiene la pantalla de pago normal, 2 taps (elegir método → confirmar) — no se auto-selecciona sin interacción.
2. Flujo de pantallas: el usuario pidió explícitamente **invertir** el orden actual ("ahora primero confirma el pedido y luego paga, sería más bien al revés, primero paga y luego confirma") y, ante 2 mockups concretos, eligió el de **3 pasos con pantalla de repaso final** (pago → repaso con resumen → recién ahí se envía) en vez de que "Ya pagué" ya dispare el envío. Sobre la atomicidad backend, aceptó explícitamente el riesgo residual de mantener 2 llamadas (crear + adjuntar pago) en vez de fusionar en un endpoint único, para no tocar `routes/orders.js`/`routes/reservations.js`.

**Implementado:**
- **Backend** (`routes/public.js`, `POST /orders`): `nombre_cliente` pasa a ser obligatorio (400 si falta) — mismo patrón que reservas.
- **Frontend** (`public/menu.html`) — reestructuración completa del flujo de pago:
  - Nuevo estado `pagoPendiente` reemplaza a `pagoOrdenId`/`pagoTipo`/`pagoCodigoReserva` — el pedido/reserva vive solo en memoria del navegador hasta el paso final.
  - `confirmarPedido()`/`confirmarReserva()`: si el restaurante tiene algún método de pago activo, ya no crean nada — arman el payload y abren la pantalla de pago. Si no hay ningún método activo, siguen creando directo (sin cambios para ese caso).
  - `enviarPago()`: pasó de disparar el `PATCH` de pago a solo **validar** (foto adjunta obligatoria para yape/plin) y avanzar a la nueva pantalla de repaso.
  - Nueva pantalla `#repaso-screen`: resumen de ítems (render limpio, sin los botones de quitar del carrito original), nombre, método de pago, miniatura del comprobante si aplica, botón "← Volver" (corrige el método sin perder nombre/ítems) y botón final "✓ Confirmar pedido/reserva".
  - `confirmarEnvioFinal()` (nueva): único punto donde se crea la orden/reserva de verdad — `POST /orders`/`/reservations` seguido inmediatamente del `PATCH` de pago con la foto, en la misma acción de tap.
  - Botón del carrito pasa a decir "Ir a pagar →" cuando hay algún método de pago activo (se define una vez al cargar la config del restaurante).

**Tests:** nuevo `scripts/test-gate-pago.js` (Playwright, no forma parte de jest) — **24/24 checks verdes**, cubre: nombre obligatorio bloqueado en cliente y backend; la orden/reserva **no existe en la BD** ni al mostrar la pantalla de pago ni en el repaso (verificado con queries directas a SQLite entre cada paso); recién existe (con `metodo_pago`/`comprobante_url` ya adjuntos) al confirmar en el repaso; restaurante sin métodos de pago sigue creando directo; botón "← Volver" conserva nombre/ítems y refleja el método corregido. `npm test` **254/254 verde** antes y después (sin cambios de backend fuera de la validación de nombre).

**Pendiente:** desplegar a producción junto con los 4 fixes de la sesión anterior (ISS-018 a ISS-021, aún no desplegados). Siguiente ítem del backlog: Gap 18 (horario de atención) o Gap 19 (Cola: cancelar + mostrar modalidad) — a definir con el usuario.

---

## ✅ Sesión 2026-07-13 (parte 2) — 4 fixes críticos + backlog documentado (8 pedidos del usuario)

**Prompt:** el usuario trajo 8 issues/features de golpe (foto de comprobante rota en Cola, flujo de pago separado de la orden, pago en efectivo, horario de atención, nombre obligatorio, cancelar desde Cola, estadísticas de pedidos, tamaño de letra ajustable). Se pidió primero categorizar y documentar; en el camino, revisando código y logs de producción junto con el usuario, aparecieron 2 bugs críticos nuevos no reportados originalmente (botón de pago sin scroll, con capturas reales de una clienta afectada) y 2 bugs de infraestructura (detectados vía `pm2 logs`). El usuario aprobó implementar, probar y documentar el lote de 4 fixes ya diagnosticados; el resto queda documentado como backlog pendiente (ver `vision_negocio.md` Gaps 17-19 y `features.md`).

**Implementado (4 fixes, todos verificados, sin romper nada — 254/254 jest verde):**
1. **[ISS-018](issues/ISS-018-boton-pago-sin-scroll.md)** — `#pago-screen` sin `overflow-y` cortaba el botón "✓ Ya pagué" en celulares con poco alto disponible (capturas reales de una clienta). Fix: `overflow-y:auto` + `justify-content:flex-start`.
2. **[ISS-019](issues/ISS-019-trust-proxy.md)** — `trust proxy` no configurado en `app.js`; el servidor detrás de Nginx generaba `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` en casi cada request (encontrado corriendo `pm2 logs` en producción junto con el usuario).
3. **[ISS-020](issues/ISS-020-error-handler-sin-contexto.md)** — el error handler global solo logueaba `err.message`, sin ruta ni stack — imposible diagnosticar 500s en producción. Ahora loguea `req.method`, `req.originalUrl` y `err.stack`.
4. **[ISS-021](issues/ISS-021-comprobante-rompe-pwa.md)** — la foto de comprobante en Cola del día "no cargaba" y la app se cerraba sola al volver: `owner.html` es una PWA instalada (standalone) y las miniaturas de comprobante usaban `<a target="_blank">`, que rompe el contenedor de una PWA standalone (sobre todo iOS). Reemplazado por un modal in-app nuevo, compartido entre `pedidos.js`/`ordenes.js`/`reservas.js` (de paso se eliminó una triplicación de código idéntico entre los 3 módulos).

**Metodología de diagnóstico (vale la pena registrar):** para ISS-021 se descartaron 2 hipótesis con evidencia real antes de llegar a la causa — (a) límite de tamaño de Nginx/Multer (5MB): descartado revisando `ls -la` de los archivos reales en el servidor, todos bien por debajo del límite; (b) archivo faltante/corrupto: descartado, los archivos existen. La causa real solo apareció al pedirle al usuario una descripción más precisa del síntoma ("la app se cierra sola al querer reabrir") — coincide con el comportamiento documentado de `target="_blank"` en PWAs standalone instaladas.

**Verificación:** `scripts/test-fixes-pago-comprobante.js` (nuevo, Playwright, no forma parte de jest) — Test 1 reproduce el viewport reducido real y confirma que el botón de pago es alcanzable con scroll; Test 2 crea una orden + pago con foto real vía API, loguea como owner, y confirma que la miniatura ya no usa `<a target="_blank">`, que tocarla abre el modal sin abrir pestañas nuevas, y que muestra la foto correcta. 10/10 checks verdes. `npm test` 254/254 verde antes y después de los 4 fixes.

**Backlog documentado, sin implementar aún** (aprobado categorizar, no implementar todavía): ver `vision_negocio.md` Gap 17 (pago obligatorio antes de crear orden/reserva, con efectivo como default si no hay Yape/Plin), Gap 18 (horario de atención estricto configurable), Gap 19 (Cola del día: cancelar pedido + mostrar modalidad/todos los datos); `features.md` (nombre obligatorio en órdenes — paridad con reservas; estadísticas "qué pidió la gente hoy" + fix del gráfico de barras chico en reportería; tamaño de letra ajustable/auto en la pantalla del owner). El `FOREIGN KEY constraint failed` visto en los logs de producción no correlacionó con ISS-021 — queda abierto, a monitorear con el logging mejorado de ISS-020 la próxima vez que ocurra.

**Pendiente:** desplegar los 4 fixes a producción (`git pull` + `pm2 restart menupro`), y decidir con el usuario el orden de implementación del backlog (Gap 17 es el de mayor impacto de negocio).

---

## ✅ Sesión 2026-07-13 — Fix: botón "Abrir Yape" abría página inexistente

**Prompt:** el usuario reportó que en `menu.html`, al pagar con Yape, el botón "Abrir Yape" abría una página que no existe, afectando el flujo del cliente. Pidió arreglarlo o, si no había solución, eliminar el botón.

**Diagnóstico:** el botón enlazaba a `https://yape.com.pe/cobrar?phone=XXXX`, un endpoint que no existe públicamente — Yape no ofrece un deep link web para abrir la app con un número pre-cargado sin integración de comercio afiliado. Era una asunción incorrecta documentada en `features.md`.

**Fix — `public/menu.html`:** en `seleccionarMetodoPago('yape')`, reemplazado el `<a href="https://yape.com.pe/...">Abrir Yape</a>` por un botón "Copiar número 📋" (`navigator.clipboard.writeText`), igual patrón que ya usaba Plin. Texto de instrucción actualizado a "Abre tu app Yape, paga a este número y luego sube la foto del comprobante."

**Docs actualizadas:** `features.md` (quitada referencia al deep link inexistente en 2 secciones), `issues/ISSUES.md` + nuevo `issues/ISS-017-boton-abrir-yape-roto.md`.

**Deploy:** commit `93d48eb` pusheado a `main` y desplegado en producción el mismo día (`git pull` + `pm2 restart menupro`). Verificado: `pm2 status` → `online`, `curl /health` → `{"status":"ok"}`. Fix activo en producción.

**Investigación adicional (mismo día):** el usuario pidió investigar si existe un deep link real de Yape. Búsqueda web confirma que sí existe (`https://www.yape.com.pe/app/checkout/approval_code`), pero es dinámico — se genera server-side por una pasarela de pago afiliada (Mercado Pago, Culqi, Izipay, ProntoPaga), válido ~15 min por transacción, y requiere afiliación del restaurante como comercio + llamada a API + costo por transacción. No es un link estático armable solo con el número de teléfono.

**Decisión del usuario:** inviable — la complejidad de afiliarse a una pasarela no se justifica todavía. **Gap 16 cerrado por diseño** en `vision_negocio.md`. El flujo "Copiar número" (igual que Plin) queda como solución **definitiva**, no temporal.

---

## 🚀 Sesión 2026-07-09 (parte 6) — Deploy a producción

**Acción:** `git pull origin main` + `pm2 restart menupro` en el servidor (`147.182.135.252`, `menupro-prod`). El pull trajo varios commits acumulados (el servidor estaba atrasado desde la sesión del 2026-07-03) hasta `902f04f`, incluyendo `utils/verificacionPago.js` como archivo nuevo.

**Verificado:** `pm2 status` → `online`; `curl http://localhost:3000/health` → `{"status":"ok"}`.

**Commits desplegados** (quedan resueltos los "Pendiente: deploy a producción" de las sesiones correspondientes):
- `902f04f` — fix(cola): comprobante y badge de pago visibles en Cola del día
- `a20e8ea` — feat(reservas): cancelación por el cliente + fix(pagos): flujo seguro de verificación (foto obligatoria yape/plin, gate `confirmar-pago`, eliminado "Pagar más tarde")
- `da15152` — fix(plato-picker): imágenes más grandes y fix de overlap por grid comprimido
- `52a0ddf` — mejora en workflow de creación de menú

**Producción queda al día con `main`.** Sigue pendiente en el servidor: correr el sembrado del restaurante demo (`deploy.md` §10.1) si aún no se hizo, y confirmar visualmente desde el celular que "Por cobrar" muestra la miniatura del comprobante.

---

## ✅ Sesión 2026-07-09 (parte 5) — Fix: comprobante de pago invisible en Cola del día

**Prompt:** el usuario reportó (con capturas en `issues/`: `Efectivo_sin_comprobacion.png`, `sin_confirmacion_depago.png`, `solo_se_puede_ver_en_reservas.png`) que al verificar un pago desde "Cola del día" → "Por cobrar" no podía ver la foto del comprobante — tenía que saltar a Órdenes/Reservas para verla y volver, relentizando el flujo.

**Diagnóstico:** `public/js/modules/ordenes.js` y `reservas.js` ya pintaban `badgePago(o)` + una miniatura clicable de `comprobante_url` en sus cards. `public/js/modules/pedidos.js` (Cola del día) no — `renderKanbanOrden()`/`renderKanbanReserva()` solo mostraban ítems y el botón de acción, sin rastro del pago. El botón "✓ Confirmar pago" ya funcionaba correctamente ahí (gate de la sesión de pagos anterior); el problema era solo de visualización.

**Fix — `public/js/modules/pedidos.js`:** nuevo helper `comprobanteThumb(x)` (mismo patrón que ordenes.js/reservas.js) + `badgePago(x)` (global, ya cargado antes que pedidos.js en `owner.html`) insertados en `renderKanbanOrden()` y `renderKanbanReserva()`, debajo de los ítems y antes del botón de acción.

**Verificación:** Playwright a 360px contra servidor local — reserva real (id 31, Plin, con comprobante) movida temporalmente a estado "cliente llegó" para verla en "Por cobrar", capturada mostrando badge + miniatura + "✓ Confirmar pago" sin salir de la Cola, 0 errores de consola, sin overflow. Reserva revertida a su estado original tras la prueba. **254/254 jest verde** (sin cambios de backend, no se agregaron tests nuevos — es un cambio de renderizado puro que reutiliza funciones/campos ya cubiertos).

**Pendiente:** deploy a producción (`git pull` + `pm2 restart menupro`), junto con los pendientes de sesiones anteriores.

---

## ✅ Sesión 2026-07-09 — Implementado: cancelar reserva desde el lado del cliente

**Prompt:** implementar el gap anotado en la sesión 2026-07-06, con ventana de tiempo en minutos para cancelar, default **30 minutos**, configurable por el owner.

**Decisión del usuario (pregunta directa):** si la reserva no tiene `hora_llegada` (el cliente no la especificó al reservar), se permite cancelar **siempre** (sin límite de horario) mientras el estatus siga siendo cancelable — no tiene sentido calcular "faltan 30 min" sin una hora de referencia.

**Backend:**
- `config/database.js`: migración idempotente `restaurantes.minutos_cancelacion_reserva INTEGER DEFAULT 30`.
- `utils/fecha.js`: nuevo helper `ahoraLima()` (fecha/hora actual de Lima como Date "naive", comparable contra `fecha`+`hora_llegada` de la reserva sin conversión real de timezone).
- `utils/cancelacionReserva.js` (nuevo): función pura `dentroDeVentanaCancelacion(fecha, hora_llegada, minutosLimite, ahora)` — sin `hora_llegada` siempre permite; si faltan menos minutos que el límite, bloquea con mensaje (distingue "faltan menos de N minutos" vs "la hora ya pasó").
- `routes/public.js`: nuevo `PATCH /api/public/reserva/:codigo/cancelar` — busca por código (actúa como token, sin auth), valida no esté ya `es_full`/`es_cancelado`, aplica la ventana de tiempo, y en transacción cancela + devuelve stock (`devolverStock`/`itemsMenuDeReserva` de `utils/stock.js`, reutilizados del flujo del owner).
- `routes/menu.js`: `minutos_cancelacion_reserva` agregado a `GET /restaurante/config`; nuevo `PATCH /config/minutos-cancelacion-reserva` (valida 0–1440).

**Frontend:**
- `public/owner.html` + `public/js/modules/config.js`: nueva card "✗ Cancelación de reservas por el cliente" en el panel Configuración (mismo patrón que "Auto-preparación de reservas"), con input de minutos y botón Guardar.
- `public/menu.html`: botón "✗ Cancelar reserva" en `renderEstadoReserva()` — oculto si la reserva ya está `es_full`/`es_cancelado`, con `confirm()` antes de llamar al endpoint y recarga automática del estado tras cancelar.

**Tests:** nuevo `tests/cancelar-reserva-cliente.test.js` (7 casos sobre la función pura + devolución de stock real). **248/248 jest verde.** Verificado además manualmente contra el servidor local con `curl`: reserva sin hora → cancela sin restricción; reserva con hora dentro de la ventana → bloqueada con mensaje; fuera de la ventana → cancela y devuelve stock; reserva ya cancelada → rechazada; código inexistente → 404.

**Pendiente:** deploy a producción (`git pull` + `pm2 restart menupro`).

---

## ✅ Sesión 2026-07-09 (parte 2) — Fix: flujo de pago inseguro

**Prompt:** el usuario notó que la foto de comprobante es opcional (debería ser obligatoria) y que "pagar más tarde" ya no permite pagar después (rompe el flujo automatizado, se vuelve manual). Preguntó: "¿Cómo verificamos luego los pagos?".

**Diagnóstico (verificado leyendo `routes/public.js`, `routes/orders.js`, `routes/reservations.js`, `ordenes.js`, `reservas.js`):**
1. `handlePago()` en `routes/public.js` guardaba `comprobante_url = req.file ? ... : null` — foto opcional.
2. `skipPago()` en `menu.html` cerraba el flujo de pago sin registrar `metodo_pago`/`estado_pago` y sin ningún camino de vuelta.
3. **El hallazgo clave:** `PATCH /:id/confirmar-pago` (orders.js y reservations.js) existe en el backend pero **no está conectado a ningún botón** en `owner.html`. El único control real que usa el owner es "💰 Cobrar/Completar" (`PATCH /:id/estatus` con flag `es_pagado`/`es_full`), que **pisa automáticamente `estado_pago = 'pagado'`** sin mirar el comprobante, sin importar el método, incluso si el cliente nunca pasó por el flujo de pago. `vision_negocio.md` sección 7 nunca contempló "pagar más tarde" — solo Yape/Plin+foto o Efectivo.

**Recomendación dada y aprobada por el usuario:** eliminar "Pagar más tarde" por completo (Efectivo ya cubre el pago diferido legítimo), hacer la foto obligatoria para Yape/Plin, y conectar el endpoint muerto `confirmar-pago` como gate real antes de poder cobrar/completar.

**Implementado:**
- `routes/public.js`: foto obligatoria para yape/plin en `handlePago()`.
- `utils/verificacionPago.js` (nuevo): función pura `requiereConfirmarPagoAntes(metodo_pago, estado_pago)`.
- `routes/orders.js` / `routes/reservations.js`: `PATCH /:id/estatus` bloquea (400) `es_pagado`/`es_full` si el pago digital no está `confirmado`.
- `public/menu.html`: eliminado botón "Pagar más tarde" y `skipPago()`; `enviarPago()` valida foto en cliente.
- `public/js/modules/ordenes.js`, `reservas.js`, `pedidos.js`: nuevo botón "✓ Confirmar pago" que reemplaza "💰 Cobrar/Completar" mientras el pago digital no esté confirmado.

**Tests:** `tests/verificacion-pago.test.js` (6 casos). **254/254 jest verde.** Verificado manualmente contra servidor local con `curl` (sesión de owner simulada con JWT firmado localmente): yape sin foto → 400; con foto → OK; completar sin confirmar → 400; confirmar → OK; completar tras confirmar → OK.

**Documentado:** nuevo `flujo-pago.md` (diagrama completo del flujo cliente + owner), `vision_negocio.md` sección 7 y 12 actualizadas, `features.md`.

**Pendiente:** deploy a producción (`git pull` + `pm2 restart menupro`) — mismo pendiente que la sesión anterior, se puede desplegar junto.

---

## 📋 Sesión 2026-07-09 (parte 3) — Anotado: métrica de visitas al menú (ingreso indirecto por publicidad)

**Prompt:** idea del usuario para cuando el sistema arranque en modo masivo — medir cuántas personas ven el menú de cada restaurante en un dashboard del admin, como base para evaluar a futuro una opción de publicidad dentro de las páginas de menú (ingreso indirecto para restaurantes pequeños con tráfico agregado).

**Acción (solo documentación, sin código, tal como pidió el usuario):**
- `vision_negocio.md`: nueva sección **15. Modelo de Ingreso Indirecto — Publicidad** con la motivación de negocio completa y las preguntas de producto sin resolver (page views vs. visitantes únicos, visibilidad del dato para el owner vs. solo admin, privacidad). Nuevo **Gap 15** en la tabla de la sección 13.
- `features.md`: nuevo **C6 — Métrica de visitas al menú por restaurante** en el Roadmap (Tier C), con boceto técnico de alto nivel (tabla `visitas_menu`, endpoint en `routes/admin.js`, card en `dashboard.html`) marcado explícitamente como no vinculante — las decisiones de producto van primero.

**Sin cambios de código.** Queda anotado para retomar cuando haya varios restaurantes activos con tráfico real que justifique la conversación de venta de publicidad.

---

## 📋 Sesión 2026-07-09 (parte 4) — Anotado: módulo de blog/noticias de la empresa

**Prompt:** el usuario quiere un módulo en el dashboard admin para publicar actualizaciones sobre la evolución de Menú Pro como empresa (primera prueba piloto, avances semanales, hitos) — "build in public" para generar confianza con prospectos. Pidió solo documentación por ahora.

**Acción:** `features.md` → nuevo **C7 — Módulo de blog/noticias de la empresa** en el Roadmap (Tier C), con boceto técnico (tabla `posts_blog`, endpoints admin + público de solo lectura, página pública nueva o sección en `landing.html`) y las decisiones de producto pendientes (editor simple vs. rich text, fotos, URL propia vs. sección de landing). **Sin cambios de código.**

---

## 📋 Sesión 2026-07-06 — Gap detectado: el cliente no puede cancelar su reserva

**Prompt:** el usuario preguntó si el cliente puede cancelar su reserva actualmente (no confundir con órdenes).

**Diagnóstico (solo investigación, sin cambios de código):** confirmado que **no puede**. `routes/public.js` solo expone `POST /reservations` (crear), `PATCH /pago/reserva/:id` (pago) y `GET /reserva/:codigo` (consultar estado, usado por `showEstadoReserva` en `menu.html`). El único endpoint que cancela (`PATCH /api/reservations/:id/estatus` → `es_cancelado`, con devolución de stock) vive en `routes/reservations.js` y está protegido con `authorizePermiso()` — solo owner/staff desde `owner.html`. `ISS-006` (resuelto 2026-05-23) se revisó pero trata otro tema (botones de avance de estado en el panel del owner), no cubre este gap.

**Acción:** agregado a `features.md` (Prioridad Alta — Features funcionales) el feature pendiente **"Cancelar reserva desde el lado del cliente"**, con alcance propuesto: endpoint público `PATCH /api/public/reserva/:codigo/cancelar` (misma regla de estados cancelables + devolución de stock que ya usa el owner) + botón "✗ Cancelar reserva" en la pantalla de estado de `menu.html`. Queda pendiente decidir si aplica ventana de tiempo límite para cancelar. Sin implementación aún — el usuario pidió dejarlo solo anotado por ahora.

---

## 🖼️ Sesión 2026-07-03 (parte 2) — Imágenes más grandes + fix de overlap real en el PlatoPicker

**Prompt 1:** en Menú del día → Configurar secciones → "＋ Platos", las fotos de los platos aparecían muy pequeñas y las cards se sentían apretadas al seleccionar.

**Cambio 1:** `.pp-img`/`.pp-placeholder` en `public/js/widgets/plato-picker.js` 80×80px → **100×100px** (placeholder emoji a 32px), grid `minmax(130px → 150px, 1fr)`, `.pp-name max-width` 110px → 130px.

**Prompt 2 (bug real, con captura):** el usuario reportó que el borde naranja de selección "sobrepasa su propio margen" — las cards de secciones con muchos platos (con fotos reales) aparecían literalmente superpuestas entre filas.

**Diagnóstico:** no era un problema de bordes ni de tamaño de imagen — con ≤2 platos (sin necesidad de scroll) el picker se veía perfecto, pero con suficientes platos para necesitar scroll interno, `.pp-img`/`.pp-placeholder` colapsaban a una fracción de 100px (75px en fotos con aspect ratio horizontal, 45px en placeholders), y las cards de una fila se montaban sobre la fila anterior. Causa raíz: `.pp-grid` es hijo flex de `.pp-sheet` (`overflow: hidden`, `max-height: 80vh`) y se le permite encoger (correcto, para poder hacer scroll interno); pero al no declarar `grid-auto-rows`, Chrome calculaba el alto de las filas del grid en función del alto YA COMPRIMIDO del contenedor en vez de basarse en el contenido, comprimiendo las cards en lugar de dejarlas desbordar con scroll.

**Fix:** una línea — `grid-auto-rows: min-content;` en `.pp-grid`. Fuerza a que cada fila se dimensione por el contenido real de sus cards (100px de imagen + texto), sin importar cuánto se haya comprimido el contenedor scrolleable; el exceso ahora se resuelve con scroll (como estaba previsto), no con superposición.

**Verificación:** reproducido con fotos reales de `public/uploads/platos-menu/` (no con placeholders, que no mostraban el bug) vía Playwright a 411×823px — confirmado el overlap antes del fix y su desaparición después, con `getComputedStyle`/`getBoundingClientRect` mostrando 100×100px consistente en las 9 cards tras el cambio. `scripts/test-menu-wizard.js` 51/51 verde, 0 errores de consola.

---

## 🚀 Sesión 2026-07-03 — Inicio de pruebas piloto con usuario real

**Hito:** hoy **03/07/2026** arrancaron las pruebas en producción con una usuaria real: **Karina** (`karina@menupro.tech`), dueña del restaurante piloto (slug `karinamenu`, ver `features.md` #URLs por slug), ingresando desde su celular a `https://menupro.tech`.

**Incidente durante la sesión:** Karina no pudo ingresar desde un celular con su correo original. Diagnóstico vía SSH al servidor (`147.182.135.252`):
- `pm2 logs menupro` y `/var/log/nginx/access.log` (incluyendo rotados) **sin ninguna traza del intento** → el request nunca llegó al servidor. Descarta bug de la app (rate limit, credenciales rechazadas, etc.); el problema fue del lado del cliente (typo de correo, autocompletado, o similar).
- De paso se confirmó que el log de Nginx recibe tráfico constante de bots de escaneo automatizado (rutas PHP/Laravel/ThinkPHP tipo `eval-stdin.php`, `pearcmd`) — todo `404`, ruido de fondo normal de cualquier IP pública, la app Node.js no es vulnerable a esos payloads. No requiere acción.
- **Resuelto por workaround:** Karina creó una cuenta con otro correo y pudo ingresar sin problema desde el mismo celular. Si más adelante quiere recuperar el correo original, hay que resetear contraseña vía admin (`deploy.md` §8.4).

**Deploy de sesiones anteriores:** el usuario desplegó manualmente en el servidor (`git pull` + `pm2 restart menupro`) los cambios de la sesión 2026-07-02 (stock por plato + flujo v2 del menú del día) fuera de esta sesión de Claude Code. Producción queda al día con la última versión de `main`.

---

## 📦 Sesión 2026-07-02 (parte 3) — Stock por plato del menú del día

**Prompt:** "los restaurantes preparan porciones contadas (ej: solo 25 arroz con pollo), ¿se puede agregar?". Decisiones del usuario: (1) stock **por menú** — si el plato está en 2 menús, el owner reparte porciones entre ambos (más fácil de controlar para él); (2) descuento **al crear** el pedido, devolución al cancelar.

**BD — `config/database.js`:** migración idempotente: `stock_inicial` y `stock_restante` (INTEGER NULL) en `componentes_menu_dia`. **NULL = sin control** → el restaurante que no cuenta porciones no ve fricción nueva.

**Backend:**
- **`utils/stock.js` (nuevo):** `descontarStock(db, items)` — UPDATE con guard `stock_restante >= n` (dos pedidos simultáneos no se llevan la última porción); si no alcanza lanza error 409 ("Solo quedan N porciones de X" / "Ya no quedan porciones de X") y la transacción del caller revierte todo. `devolverStock`, `itemsMenuDeOrden`, `itemsMenuDeReserva`.
- **`routes/public.js`:** POST /orders y /reservations descuentan dentro de su transacción (409 al cliente si no alcanza). GET /menu filtra `stock_restante IS NULL OR > 0` (mismo tratamiento que agotado).
- **`routes/orders.js`:** POST / (mozo/owner) refactorizado a validar-primero + transacción con descuento (de paso elimina órdenes huérfanas si un ítem era inválido). PATCH /:id/estatus y el endpoint de cocina devuelven stock al pasar a `es_cancelado`.
- **`routes/reservations.js`:** POST / en transacción con descuento; PATCH /:id/estatus devuelve stock al cancelar (incluye no-show).
- **`routes/menu.js`:** GET /menus-dia expone `stock_inicial`/`stock_restante` por plato. Nuevo `PATCH /menus-dia/:id/secciones/:sid/platos/:cid/stock` body `{ stock: n|null }` — fija inicial y restante al valor; null quita el control. Copiar menú replica `stock_inicial` y arranca con la olla llena (`restante = inicial`).
- **Nota:** el auto-merge (Gap 8) copia ítems directamente en BD → NO re-descuenta (correcto: es la misma comida ya descontada por la reserva).

**Frontend — `public/owner.html` (acordeón v2):** badge en la fila del plato: "quedan N" (ámbar si ≤5), "Sin stock" (rojo) en 0; nada si no hay control. Acción "📦 Stock" en el ⋯ → FormModal numérico ("Porciones disponibles hoy — vacío = sin límite") → PATCH + recarga. CSS `.mc-badge-mini.ambar`.

**Tests:** `tests/stock-platos.test.js` (11 casos, prueba las funciones REALES de utils/stock.js contra BD en memoria: descuento por cantidad, NULL ilimitado, 409 con rollback total de la orden, carrera por la última porción, devolución, filtro público, fijar/quitar stock, copia con olla llena). **241/241 jest verde.** E2E full-stack en Playwright: 11/11 (fijar desde UI → badge → pedido público descuenta → 409 → oculto del QR → "Sin stock" → cancelar devuelve). `scripts/test-menu-wizard.js` re-verificado: 51/51.

**Docs:** features.md (fila en Implementados), vision_negocio.md (sección 12 + fecha). **Pendiente:** commit + deploy a producción. Fase 2 futura: stock en carta, aviso "¡quedan 3!" al cliente, reporte cociné-vs-vendí (merma).

---

## 📦 Sesión 2026-07-02 (parte 2) — IMPLEMENTACIÓN Flujo Menú del Día v2

**Prompt:** "está fino fino, dale" (aprobación del mockup `demo_flujo_menu.html` y del plan de `flujo-menuv2.md`).

**Backend — `routes/menu.js`:**
- `POST /menus-dia` acepta `heredar_secciones: true` → en una transacción, copia las secciones (`id_seccion_menu` + `requerido`, SIN platos) del menú más reciente del restaurante (`ORDER BY dia DESC, created_at DESC, id DESC`). Respuesta incluye `secciones_heredadas: N`.

**Frontend — `public/owner.html`:**
- **Hub eliminado**: `renderConfigHub`, `renderConfigCliente`, `irConfigCliente/Secciones`, `renderConfigSubview` y `configSubview` borrados. `abrirConfigMenu(menuId, opciones)` aterriza directo en las secciones; `configBack` cierra en 1 tap.
- **`renderConfigSecciones()` reescrito como acordeón vertical** (`mcSeccionAcordeon`): secciones apiladas con cabecera (nombre + badge "N platos"/"⚠ sin platos" + chevron), colapso persistente entre re-renders (`mcSecCerradas`), filas de plato con acciones detrás del ⋯ (Agotado/Portada/Quitar), «＋ Platos» por sección, pie con Obligatoria/Quitar, «＋ Agregar sección» al final. Toggles del cliente como fila compacta arriba (`.mc-cli-compact`). Hint ✨ de herencia cuando `configRecienCreado`.
- **Alta rápida de sección (1 tap)**: `abrirAddSeccion` lista las secciones libres del catálogo con botones Obligatoria/Opcional → `confirmarAddSeccionRapida`. El mini-wizard de 2 pasos fue eliminado.
- **`abrirPicker` multi**: pre-marcado con los platos de la sección; `aplicarSeleccionPlatos` hace POST por agregado y DELETE por quitado + toast "N agregados · M quitados ✓".

**Frontend — `public/js/widgets/plato-picker.js`:** modo `multi: true` con `selectedIds`, `title` y `onConfirm(ids)`. Checks en cards, badge "ya asignado", contador en header, footer dinámico "Guardar (N nuevos · quitar M) ✓". Modo simple intacto.

**Frontend — `public/js/widgets/menu-wizard.js`:** botón final «Crear y agregar platos →»; `crear()` envía `heredar_secciones: true` y encadena a `onConfigure(id, { recienCreado: true })` (ya no vuelve a la galería).

**CSS — `public/css/owner.css`:** bloque del carrusel `.mc-sec-gallery`/`.mc-sec-card` reemplazado por estilos del acordeón (`.mc-acc`, `.mc-sec*`, `.mc-plato*`, `.mc-cli-compact`, `.mc-hint`, `.mc-add-sec`, `.mc-addsec-row`); CSS muerto `.mc-cli` viejo eliminado (`.mc-hub-*` se conserva — lo usan los hubs de navegación). Desktop: `.mw-config` a columna de 560px centrada.

**Tests:**
- Nuevo `tests/heredar-secciones.test.js` (8 casos: herencia con flag requerido, sin platos, sin flag = clásico, sin menús previos, el más reciente, scope por restaurante, fuente intacta, validaciones). **230/230 jest verde.**
- `scripts/test-menu-wizard.js` reescrito para el flujo v2 (navegación por `showPanel/switchTab` — las tabs viejas están ocultas desde el rediseño Home; asserts de encadenado, acordeón, picker multi, sin hub; ignora 404 de `/uploads/` en dev). **51/51 E2E a 360px, 0 errores de consola.**
- Nota: los 404 locales eran fotos seed pre-ISS-015 (`plato_1.jpg`, `plato_4.png`, carta `plato_3.jpg`) que no existen en esta laptop (uploads fuera de git) — no es bug de la app.

**Pendiente:** deploy a producción (`git pull` + `pm2 restart menupro`). El mockup `public/demo_flujo_menu.html` puede borrarse cuando el usuario ya no lo necesite.

---

## 📦 Sesión 2026-07-02 — Análisis del flujo de armado del menú del día (doc `flujo-menuv2.md`)

**Prompt:** "El flujo de creación de menú del día aún se siente difícil: eliges platos para entrada y bien, pero al agregar para segundo el carrusel se queda fijado en entrada y hay que deslizar a la derecha a buscar segundo. Analizar el flujo y crear `flujo-menuv2.md` con ideas."

**Diagnóstico (sin cambios de código en esta sesión):**
- **Causa técnica del "rebote":** cada acción (agregar plato, toggles) llama `recargarModalConfig()` → `innerHTML` reconstruye toda la galería de secciones → el carrusel horizontal (`.mc-sec-gallery`) renace con `scrollLeft = 0` y aterriza siempre en la primera sección.
- **Causa de diseño:** carrusel horizontal (patrón de vitrina) usado para una tarea de checklist; hub de 2 opciones agrega un nivel para llegar a los platos; mini-wizard de secciones repite 5 taps/sección cada día aunque la estructura casi nunca cambia (confirmado por el usuario); PlatoPicker de a un plato.

**Entregable — `flujo-menuv2.md` (raíz del proyecto):** propuesta v2 en 4 cambios: (A) secciones como lista vertical acordeón en vez de carrusel, (B) PlatoPicker multi-selección con pre-marcado, (C) eliminar el hub (⚙ Configurar aterriza directo en secciones, toggles cliente como fila compacta), (D) heredar secciones del último menú al crear + botón «Crear y agregar platos →». Estimación: ~31 taps + swipes → ~15 taps (−52%) para un menú típico. Plan en 4 fases independientes (Fase 0 = hotfix `scrollIntoView` opcional). **Pendiente: decisión del usuario sobre qué fases implementar.**

**Entregable 2 — `public/demo_flujo_menu.html` (mockup navegable):** demo autocontenida (HTML + JS vanilla, datos de mentira, sin backend) del flujo v2 completo: galería → wizard 3 pasos con «Crear y agregar platos →» → acordeón vertical con secciones heredadas (hint ✨) → picker multi-selección con pre-marcado y footer dinámico ("Guardar (3 nuevos · quitar 1) ✓") → sheet de agregar sección en 1 tap. Incluye contador de taps en el banner para comparar contra los ~31 del flujo actual. Se abre con doble clic o en `/demo_flujo_menu.html` del servidor (probable en celular vía LAN). Verificado con Playwright a 360px: 0 overflow, 0 errores de consola, flujo completo (menú + 3 entradas + 4 segundos) = 18 taps. **Es solo mockup — borrar cuando se implemente la v2 real.**

---

## 📦 Sesión 2026-06-15 — Feature: copiar menú del día a otra fecha

**Prompt:** "que el menú creado se pueda replicar/copiar a otro día para solo hacer modificaciones simples".

**Backend — `routes/menu.js`:**
- Nuevo endpoint `POST /api/menu/menus-dia/:id/copiar` con body `{ dia: 'YYYY-MM-DD' }`.
- Copia en una transacción: menú (`nombre`, `precio`, `elegible`, `activo`, `id_plato_portada`), sus `menu_secciones` (conservando flag `requerido`) y todos sus `componentes_menu_dia` (con la fecha destino). Valida pertenencia al restaurante y formato de fecha. Devuelve `{ id, dia, nombre }` con status 201.

**Tests — `tests/copiar-menu.test.js`:** 7 casos: copia completa, original intacto, portada copiada, fecha destino con menús existentes, 404 de otro restaurante, 400 con fechas inválidas (4 variantes), menú sin secciones.

**Frontend — `public/js/widgets/menu-wizard.js`:**
- Botón "📋 Copiar a otro día" en cada card de la galería.
- Al tocar: aparece un picker de fecha (pre-cargado con mañana, mínimo hoy) + botón "Copiar ✓" y "✕".
- Al confirmar: POST al endpoint, toast "Menú copiado al [fecha] ✓", navega automáticamente a la fecha destino y recarga la galería.

**Tests:** 222/222 verde. Sin cambios de DB (no requiere migración).

---

## 📦 Sesión 2026-06-15 — Deploy a producción + fix ISS-016

**Prompts:** Deploy del estado actual del branch main a producción; luego fix de toggles "Cliente elige/Fijo" y "Visible/Oculto" que no actualizaban la UI.

**Deploy:**
- `git pull origin main && pm2 restart menupro` en el servidor (`147.182.135.252`).
- Commits desplegados: `72c1194` (galerías desktop full-width + botón instalar Android) + `c8c65cd` (ISS-015 foto plato versionada).
- ISS-015 queda resuelto en producción a partir de esta sesión.
- PM2: `online`, 13.1 MB memoria.

**ISS-016 — Fix toggles config menú del día (`public/owner.html`):**
- **Síntoma:** al tocar "Cliente elige"/"Visible" en la sub-vista "Configuración para el cliente", el toast aparecía (PATCH OK) pero el botón no cambiaba de texto ni estilo hasta recargar la página.
- **Causa raíz:** `toggleElegibleMenu` y `toggleActivoMenu` llamaban solo `loadMenusDia()` → `MenuWizard.reload()`, que re-renderiza la **galería** (oculta cuando la config está abierta). La vista de config (`#mc-body`) no se refrescaba.
- **Fix:** agregar `recargarModalConfig()` después de `loadMenusDia()` en ambas funciones. `recargarModalConfig()` ya tiene guard `if (!configMenuId) return`, así que es no-op fuera de la config. 2 líneas de cambio.

**Issues:** ISS-015 → Resuelto (desplegado). ISS-016 → Resuelto.
**Sin cambios de backend. Sin tests afectados (cambio solo frontend).**

---

## 📦 Sesión 2026-06-08 — Fix botón "Instalar app" no aparece en Android producción

**Prompt:** "No aparece el botón de descargar app en mi celular" (producción `menupro.tech`).

**Diagnóstico:**
`beforeinstallprompt` en Android Chrome **puede no dispararse** aunque el sitio esté en HTTPS, si el usuario descartó el prompt antes (Chrome lo suprime por meses) o si Chrome lo suprimió internamente. En ese caso `installable()` devolvía `false` y el botón permanecía oculto indefinidamente, sin ningún fallback.

**Fix — `public/js/widgets/pwa-install.js`:**
- Nueva función `isMobileHTTPS()`: detecta Android/mobile en HTTPS.
- `installable()` ahora retorna `true` si `isMobileHTTPS()`, incluso sin `deferred` — el botón siempre aparece en producción móvil.
- `prompt()`: cuando `deferred` es null y no es iOS, llama a `showAndroidHelp()` (instrucciones manuales: ⋮ → "Instalar app").
- Nueva función `showAndroidHelp()`: modal bottom-sheet reutilizando los estilos `.pwa-ios` del instructivo de iOS.
- Nueva función `injectHelpStyles()`: extrae la inyección del `<style>` para que tanto iOS como Android la compartan (antes iOS inyectaba los estilos y Android los usaba sin inyectarlos → modal sin estilos).
- Sin cambios de backend.

---

## 📦 Sesión 2026-06-08 — Desktop: galerías de platos y menús usan todo el ancho del panel

**Prompt:** "No me gusta cómo se ve desde desktop — muy apretado" + captura `no_me_gusta.png`. Luego: replicar fix para la zona de Menú del día.

**Diagnóstico:**
Dos bugs de CSS se combinaban para dar el resultado "apretado":
1. **`max-width: 680px` en `.mw`** (inyectado por `menu-wizard.js` en desktop) → el contenedor de la galería se cortaba en 680px dejando espacio vacío a la derecha del panel.
2. **Problema de cascada:** `menu-wizard.js` inyecta un `<style>` en `<head>` en tiempo de ejecución, **después** de que `owner.css` carga. Como ambos selectores (`.mw-menus { display: flex }` del widget y `.pm-plate-gallery { display: grid }` de owner.css) tienen la misma especificidad (0,1,0), el inyectado ganaba siempre → las cards quedaban en una fila horizontal de 5 elementos muy angostos (~120px c/u) en lugar del grid de 2 columnas esperado.

**Fix — `public/css/owner.css`:**
- Reemplazado el bloque `@media (min-width: 768px) { .pm-plate-gallery, .pc-plate-gallery { ... } }` por selectores con ID de mount (`#platos-menu-mount`, `#platos-carta-mount`) que tienen especificidad (1,1,0) → ganan sobre el widget siempre.
- Agregado bloque nuevo para `#menu-wizard-mount` con la misma lógica.
- `max-width: none` en el `.mw` de cada mount → el contenedor llena todo el ancho del panel.
- `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` → grid responsivo: ~4 columnas en 1280px, 2 columnas en pantalla chica desktop.
- `.mw-wizard { max-width: 560px; margin: auto }` → el wizard de "Crear menú" (3 pasos) queda centrado y no se estira.
- Sin cambios de backend ni de JS. Solo CSS.

**Resultado:** las tres galerías (Platos de menú, Platos a la carta, Menús del día) usan todo el ancho disponible del panel en desktop, sin espacio vacío a la derecha. Cards cómodas de ≥240px. Verificado por el usuario: "está excelente".

---

## 📦 Sesión 2026-06-06 — Deploy a producción + limpieza de uploads en git

**Prompt:** "Quiero actualizar mi servidor desplegado" → configurar acceso SSH y desplegar; luego sacar uploads de git; luego documentar dos pendientes.

**Hecho:**
- **Deploy a producción** (`menupro.tech`, Droplet `147.182.135.252`): `git pull origin main` → commit `76164ef`, `pm2 restart menupro`. Verificado: `/health` OK + `https://menupro.tech/` 200. Las migraciones de `config/database.js` corrieron en el restart.
- **Acceso SSH** desde esta laptop (DESKTOP-LPSVKIS): clave `id_rsa.pub` autorizada en `/root/.ssh/authorized_keys` del servidor. ⚠️ `id_rsa` tiene passphrase → el entorno automático no conecta solo; deploys vía consola web del Droplet o `ssh` interactivo del usuario.
- **`public/uploads/` fuera de git** (commit `6f4a276`): ya estaba en `.gitignore` pero seguía trackeado; `git rm --cached` de las 13 fotos/comprobantes. Las carpetas se autocrean al arrancar (ISS-005), no se necesita `.gitkeep`. Resuelve el choque recurrente de `git pull` con las fotos de producción. **Pendiente en servidor:** correr el bloque backup→pull→restore para que el deploy no borre las imágenes existentes.

**ISS-015 — diagnosticado y corregido (foto de plato no se actualiza):**
- **Síntoma:** "Cambiar foto" muestra "Foto actualizada" pero la imagen no cambia (o queda en gris/sin foto).
- **Causa raíz:** el backend guardaba la foto con nombre fijo `plato_<id>.<ext>` (`routes/menu.js`, `makeUploadPlato`). Dos fallos: (1) URL estable → el navegador cachea la imagen vieja; (2) si la extensión coincide con la anterior, multer sobrescribe el archivo y luego el `fs.unlinkSync` del "anterior" borraba la imagen recién subida → plato sin foto.
- **Fix:** nombre versionado `plato_<id>_<Date.now()>.<ext>`. URL nueva por subida (rompe caché) y el borrado del anterior nunca pisa la imagen nueva. 1 línea, cubre menú y carta. Tests 215/215 verde.
- **Pendiente:** deploy a producción (`git pull` + `pm2 restart`).
- **Nota:** el 500 al *eliminar* un plato referenciado (FK constraint) es comportamiento esperado, NO bug — decisión del owner de no tocarlo (preserva historial/reportería). Documentado en ISS-015.

**Documentado:**
- **features.md** → nuevo pendiente: actualizar la landing con fotos nuevas del sistema (UI quedó desactualizada tras el deploy de hoy).

---

## 🏁 RESUMEN EJECUTIVO — Estado al 2026-06-05 (sesión 4)

**Pantalla Home + navegación por hubs (2026-06-05, sesión 4):**

### Árbol de navegación resultante
```
🏠 Inicio
├── 🍽️ Gestión de menús  → hub (panel-gestion-menus)
│   ├── 📋 Menú del día   ← Gestión de menús
│   └── 🍴 Carta          ← Gestión de menús
├── ⚡ Operaciones         → hub (panel-operaciones)
│   ├── ⚡ Cola del día    ← Operaciones
│   ├── 🧾 Órdenes        ← Operaciones
│   ├── 📅 Reservas       ← Operaciones
│   └── 🍳 Cocina         ← Operaciones
├── 📊 Análisis            → panel-reportes (directo) ← Inicio
└── ⚙️ Ajustes             → hub (panel-ajustes)
    ├── ⚙️ Configuración  ← Ajustes
    └── 👥 Usuarios       ← Ajustes
```

### `public/css/owner.css`
- Bloque **Home panel**: `.home-welcome`, `.home-greeting`, `.home-restaurant`, `.home-carousel` (scroll horizontal, snap), `.home-card` (230×340px portrait, scroll snap), `.home-card-emoji` (3rem), `.home-card-title`, `.home-card-desc`, `.home-card-cta` (naranja).
- `.btn-back-home`: botón naranja "← Volver" reutilizado en todos los paneles.
- `.home-btn`: botón 🏠 del topbar (44×44px).
- Desktop `@media (min-width: 768px)`: `.home-carousel` → `flex-wrap: wrap`, cards `50% - 0.5rem` → grid 2×2 centrado.

### `public/owner.html`
- **Topbar**: hamburger → botón `🏠` (`home-btn`, `showPanel('home')`); hamburger movido al grupo derecho (junto a 🌙 y 🔔) para seguir abriendo el sidebar.
- **`panel-home`** (nuevo, `class="panel active"`): saludo dinámico hora Lima (Buenos días/tardes/noches) + nombre del restaurante + 4 cards portrait en carrusel horizontal. Descripciones en tuteo peruano (sin voseo).
- **`panel-gestion-menus`** (nuevo hub): 2 `.mc-hub-card` (Menú del día | Carta) + "← Inicio".
- **`panel-operaciones`** (nuevo hub): 4 `.mc-hub-card` (Cola del día | Órdenes | Reservas | Cocina) + "← Inicio".
- **`panel-ajustes`** (nuevo hub): 2 `.mc-hub-card` (Configuración | Usuarios) + "← Inicio".
- **Botones de vuelta** en cada panel:
  - `panel-menu-dia`, `panel-carta` → "← Gestión de menús"
  - `panel-pedidos`, `panel-ordenes`, `panel-reservas`, `panel-cocina` → "← Operaciones"
  - `panel-configuracion`, `panel-usuarios` → "← Ajustes"
  - `panel-reportes` → "← Inicio"
- **Bottom-nav**: "☰ Más" → "🏠 Inicio" (`data-target="home"`).
- **Sidebar**: `nav-home`, `nav-gestion-menus`, `nav-operaciones`, `nav-ajustes` agregados; sub-ítems con indentación `padding-left: 2rem`.
- **`PANELS`**: `['home','gestion-menus','operaciones','ajustes','menu-dia','carta','ordenes','reservas','cocina','pedidos','usuarios','reportes','configuracion']`.
- **`TITLES`**: entradas para todos los nuevos paneles/hubs.
- **`activePanel = 'home'`** (antes `'menu-dia'`).
- **`showPanel()`**: `?.` en `nav-${p}` para paneles sin nav item en sidebar.
- **Permisos cocinero/delegados**: remueven `active` de `panel-home` (antes `panel-menu-dia`).
- **Init**: saludo con `Intl.DateTimeFormat` hora Lima + `MutationObserver` que espeja `#sidebar-restaurant` → `#home-restaurant-name`.

---

## 🏁 RESUMEN EJECUTIVO — Estado al 2026-06-05 (sesión 3)

**Menú del día y Carta: stepper + chips + galería (2026-06-05, sesión 3):**

### `public/js/widgets/menu-wizard.js`
- `max-width: 680px` en `.mw` dentro de `@media (min-width: 768px)` → el header (barra de fecha + botón "+ Crear menú") también queda contenido, no solo las cards.

### `public/css/owner.css`
- CSS del **hub de configuración** (`.mc-hub`, `.mc-hub-card`, `.mc-hub-emoji`, `.mc-hub-title`, `.mc-hub-desc`, `.mc-hub-cta`): cards verticales con emoji + título + descripción + CTA naranja.
- CSS de **"Configuración para el cliente"** (`.mc-cli`, `.mc-cli-row`, `.mc-cli-q`, `.mc-cli-toggle`, `.mc-cli-hint`).
- **Grid desktop para galerías**: `.mc-sec-gallery`, `.pm-plate-gallery`, `.pc-plate-gallery` → `grid-template-columns: repeat(2, 1fr)` en ≥768px, elimina espacio muerto lateral.
- **CSS de stepper**: `.md-stepper`, `.md-step`, `.md-step-num`, `.md-step-line`, `.md-step-help`, `.md-help-box`, `.md-help-text`, `.md-help-close` — estados activos con color naranja.
- **CSS de chips**: `.sec-gallery`, `.sec-create-btn`, `.sec-chips`, `.sec-chip` (pill 44px), `.sec-chip-name`, `.sec-chip-del`.
- `.pm-plate-desc`: texto de descripción en blanco semi-transparente sobre cards con foto.

### `public/owner.html`
**Panel Menú del día:**
- Tabs horizontales reemplazadas por **stepper de 3 pasos** (Secciones → Platos → Menú del día). Cada paso tiene botón `?` que muestra callout `#md-help-box` con explicación del paso.
- Tabs originales conservadas en DOM con `style="display:none"` para `switchTab()`.
- `loadSecciones()` → chips (`.sec-chip`): nombre + botón × para eliminar. "+ Crear sección" usa `FormModal`.
- `loadPlatosMenu()` → galería (`.pm-plate-gallery`) con `.mw-menu-card`: foto/watermark 🍽️, nombre, descripción, acciones (📷 foto, ✏ editar, eliminar).
- `abrirCrearPlatoMenu()` con `FormModal` (nombre + descripción).
- Nuevas funciones: `updateMdStepper(tab)`, `STEP_HELP`, `showStepHelp(e,step)`, `closeStepHelp()`.
- `switchTab()` llama `updateMdStepper(tab)` cuando `group === 'md'`.

**Panel Carta:**
- **Stepper de 2 pasos** (Categorías → Platos a la carta) con callout separado `#carta-help-box`.
- `loadCategorias()` → chips igual que secciones.
- `loadPlatosCarta()` → galería (`.pc-plate-gallery`): foto/watermark 🍴, nombre, precio, pill de categoría, descripción, toggle Visible/Oculto, 📷 foto, ✏ editar, eliminar.
- `togglePlatoCarta()` recarga la galería tras el toggle.
- `abrirCrearPlatoCarta()` con `FormModal` incluyendo `<select>` de categoría desde `categoriasCache`.
- Nuevas funciones: `updateCartaStepper(tab)`, `CARTA_HELP`, `showCartaHelp(e,step)`, `closeCartaHelp()`, `abrirCrearCategoria()`, `platoCartaCard(p)`.
- `switchTab()` llama `updateCartaStepper(tab)` cuando `group === 'carta'`.

**Bug fix:** `recargarModalConfig()` lee fecha de `#mw-fecha` con fallback a `#filter-md-fecha` (evitaba config vacía cuando widget y filtro tenían fechas distintas).

---

## 🏁 RESUMEN EJECUTIVO — Estado al 2026-06-05 (sesión 2)

**Config de menú del día — estilos completados (2026-06-05):**
- Agregadas clases `.mc-hub`, `.mc-hub-card`, `.mc-hub-emoji`, `.mc-hub-title`, `.mc-hub-desc`, `.mc-hub-cta` en `owner.css` → el hub de 2 opciones ahora muestra cards con emoji grande + título + descripción + CTA naranja
- Agregadas `.mc-cli`, `.mc-cli-row`, `.mc-cli-q`, `.mc-cli-toggle`, `.mc-cli-hint` → la sub-vista "Configuración para el cliente" con layout de cards ordenado
- Bug fix en `recargarModalConfig`: ahora lee la fecha de `#mw-fecha` (widget) con fallback a `#filter-md-fecha`, evitando que la config quede vacía cuando ambos inputs difieren
- MenuWizard desktop: contenedor `.mw` limitado a `max-width: 680px` en pantallas ≥768px (cards + header contenidos, no se estiran al ancho del panel)

---

## 🏁 RESUMEN EJECUTIVO — Estado al 2026-06-05

**Desktop fix en `menu.html` (2026-06-05):** Media query `@media (min-width: 680px)` en `menu.css` que centra todo el layout en una columna de **460px** (look "teléfono en escritorio"):
- `.hero-portada` y `.header` → `max-width: 460px; margin: 0 auto`, header con `border-radius` arriba cuando no hay hero (clase `has-hero` en body vía JS)
- `.content` y `.res-panel` → `max-width: 460px; overflow: hidden` (para contener el bleed del carrusel), bordes laterales y `border-radius` abajo
- `.cart-bar` y `.res-bar` → `left: 50%; transform: translateX(-50%); width: 460px; border-radius` arriba
- `.drawer` → `left: 50%; width: 460px; transform: translateX(-50%) translateY(100%)` + `.drawer.open` → `translateX(-50%)`
- `body` → `background: var(--bg-2)` para contraste exterior
- Sin cambios en HTML (salvo `document.body.classList.add('has-hero')` cuando se muestra la portada)

---

## 🏁 RESUMEN EJECUTIVO — Estado al 2026-06-04

**MenuWizard → galería + wizard de creación (2026-06-04, rediseño):** el widget dejó de ser un carrusel "todo-en-uno" y pasó a **dos vistas** dentro del sub-panel "Menús del día":
- **Galería (vista principal):** selector de fecha con flechas **◀ fecha ▶** (cambia de día sin recargar), botón fijo **"＋ Crear menú"**, y los menús de ESE día como **cards retrato** (más altas que anchas, ~270×360) en carrusel horizontal. Ya no hay "card contenedora": las cards son los menús. Cada card mantiene toggles Fijo/Visible, **⚙ Configurar** y Eliminar.
- **Wizard de creación (3 pasos):** se abre desde "＋ Crear menú", **hereda la fecha de la galería** (cabecera "Nuevo menú · [fecha]") y solo pide **1) Título · 2) Precio · 3) ¿Fijo o el cliente elige?** (los dos primeros con figura/emoji decorativa). Al crear → `POST /api/menu/menus-dia` y **vuelve a la galería** con el menú nuevo listado. "✕ Cancelar" en el paso 1 vuelve sin crear.
- **Configuración inline = galería de secciones (3ª vista, 2026-06-04/05):** ⚙ Configurar **ya no abre un modal** (confundía el proceso) — muestra una **tercera vista inline** del mismo estilo (galería ⇄ wizard ⇄ **config**) con "← Volver" y "✏ Editar". El cuerpo es una **galería horizontal de secciones**: cada sección es una **card retrato** (~270×360, mismo tamaño que las de menús) con su toggle Obligatoria/Opcional, sus platos (toggle Agotado/Disponible + ✕), "＋ Agregar plato" y "Quitar sección". Arriba, **solo** el botón **"＋ Agregar sección"** (se quitó la barra de select inline).
- **Alta de sección por mini-wizard (2026-06-05):** "＋ Agregar sección" abre un **carrusel de 2 pasos** dentro de la misma vista (reutiliza las clases `.mw-*` del MenuWizard): **Paso 1 "Selecciona una sección"** (cards de opciones del catálogo) · **Paso 2 "¿Obligatoria?"** (dos cards con emoji ✅ Obligatoria / ⏭️ Opcional, estilo del paso "¿fijo o elige?"). Al confirmar → `POST /api/menu/menus-dia/:id/secciones` y vuelve a la galería de secciones. Reemplaza al viejo `agregarSeccionMenu` (select + checkbox), eliminado. Se quitó también el CSS muerto del modal y de la barra de alta.

- **Tamaño de card parametrizado (2026-06-05):** las dimensiones de las cards de galería (menús **y** secciones, que las heredan por cascada) viven en variables sobre `.mw`: `--mw-card-w` / `--mw-card-maxw` / `--mw-card-h`. Valor elegido por el usuario: **100% / 100% / 480px** → se ve **una sola card** (sin peek). Revertir al peek = `82% / 320px / 360px` (comentado en el CSS del widget). Cambio solo CSS.
- **Card de menú con foto de portada + explicaciones (2026-06-05):** para aprovechar el alto, la card del menú ahora: (1) muestra **una línea explicativa** junto a cada toggle (Fijo/Cliente elige → "Arma su plato eligiendo en cada sección" / "Todos reciben los mismos platos"; Visible/Oculto → "Aparece en el menú QR del cliente" / "No se muestra al cliente"); (2) usa la **foto de un plato como fondo** (con scrim para legibilidad) y, si no hay foto, un **watermark 🍽️** que llena el aire. **El owner elige qué plato es la portada** con un botón **"📷 Portada"** en cada plato (con foto) dentro de la vista de configuración (toggle: vuelve a tocar para quitarla). Si no eligió, usa el primer plato con foto.
  - **Backend (mini-cambio):** nueva columna `menus_dia.id_plato_portada` (migración idempotente en `config/database.js`), incluida en el GET `/menus-dia`, y nuevo endpoint `PATCH /api/menu/menus-dia/:id/portada` (valida pertenencia del plato y del menú al restaurante; `null` la limpia). Tests: `tests/menu-portada.test.js` (8). **215/215 jest verde.** E2E `scripts/test-menu-wizard.js` **43/43**.

La creación dejó de ser un "paso" del carrusel; la galería es el hogar del módulo. Sin backend (mismos endpoints). Integración intacta: `loadMenusDia()` sigue delegando en `MenuWizard.reload()`. Toda la lógica de config se reutiliza **sin cambios de backend** — solo se reubicaron los IDs `mc-title`/`mc-meta`/`mc-body` dentro del widget y `renderConfigBody` emite el markup de galería (`.mc-sec-gallery`/`.mc-sec-card`, estilos en `owner.css`). `abrirConfigMenu`/`cerrarConfigMenu` alternan vistas vía `MenuWizard.showConfig()`/`showGallery()`. Verificado: `scripts/test-menu-wizard.js` (Playwright 360px, **41/41**) + **207/207 jest verde**, 0 errores de consola, sin overflow a 360px. Docs en `widgets.md` y `features.md`.
> Nota: este rediseño reemplaza la iteración intermedia de "5 pasos" (fecha→título→precio→elige→menús) descrita más abajo, que quedó obsoleta el mismo día.
> ⚠️ Las capturas `issues/screenshots/wizard-paso{1..4}.png` quedaron desactualizadas; regenerar si se necesitan.

**Asistente carrusel de menús del día (owner) — widget `MenuWizard` (2026-06-04):** el form de "Crear menú del día" de `owner.html` se reemplazó por un **asistente tipo carrusel de 4 pasos** (cards del mismo tamaño, deslizamiento horizontal, sin scroll de página): `1) Elige la fecha · 2) Nombre + precio · 3) ¿Fijo o el cliente elige? (pregunta única) · 4) Menús de esa fecha` (carrusel horizontal 1-por-vista con peek, ⚙ Configurar destacado que abre el modal existente, "Cambiar fecha / Crear otro").
- Nuevo **widget inline** `public/js/widgets/menu-wizard.js` (4º del proyecto; primero que se monta inline en vez de overlay). Hereda tokens de tema, mobile-first (touch ≥44px, inputs 16px, sin overflow a 360px).
- **Sin backend** — reutiliza `POST/GET/PATCH/DELETE /api/menu/menus-dia` y el modal de config `#menu-config-overlay`. `loadMenusDia()` delega en `MenuWizard.reload()` → todos los refrescos existentes (toggles, eliminar, cierre de config) actualizan el carrusel sin tocar su código.
- **Reversible por decisión del usuario:** el form clásico no se borró, quedó envuelto en `#md-legacy` (`display:none`).
- Verificado: `scripts/test-menu-wizard.js` (Playwright 360px, **15/15**), **207/207 jest verde**, 0 errores de consola. Screenshots en `issues/screenshots/wizard-paso{1..4}.png`. Documentado en `widgets.md` y `features.md`.

---

## 🏁 RESUMEN EJECUTIVO — Estado al 2026-06-03

**Cards retrato + carrusel horizontal en `menu.html` (2026-06-03):** los cards de menú del día y de carta pasaron de apaisados/apilados a **formato retrato (alto > ancho)** dentro de **carruseles horizontales** (scroll a la derecha), uno por "Menú del día" y uno por categoría de carta. Aplica a modo *pedir* y *reservar* (renderers compartidos `renderMenuDiaCard` / `renderPlatoCarta`).
- CSS (`menu.css`): nueva clase `.card-carousel` (flex + `overflow-x:auto` + `scroll-snap-type:x` + scrollbar oculta + bleed `margin:0 -1.25rem`). `.menu-dia-card` y `.plato-carta-card` reescritos a columna `flex:0 0 200px` con foto full-width arriba (130px), badge de precio en el menú, pills sobre fondo claro (`.menu-dia-pill`), acción al pie (`btn-add-menu` con `margin-top:auto` / `.qty-control` centrado).
- HTML/JS (`menu.html`): `renderMenuDiaCard` y `renderPlatoCarta` reestructurados (foto arriba + cuerpo apilado), grupos envueltos en `.card-carousel` en `renderPedirContent` y `renderReservarContent`.
- Verificado con Playwright a 360px: menú 200×295, carta 200×249 (alto > ancho), `scrollWidth == clientWidth` (sin overflow de página), 0 errores de consola, modal/carrito intactos. Documentado en `features.md`.
- Prompt del usuario: "que los cards sean rectangulares donde su alto sea mayor que su base… redondeado sí, pero con scroll a la derecha, en el caso de los menús y en reservas igual".

**Feature B completada (2026-06-03):** `renderMenuCard` → card compacta con pills de secciones + toggles inline + botón "⚙ Configurar". Modal `#menu-config-overlay` (bottom-sheet): secciones con platos, PlatoPicker, toggle agotado/disponible, agregar/eliminar sección. "✏ Editar" usa FormModal → `PATCH /api/menu/menus-dia/:id` (nuevo endpoint). Acciones del modal actualizan solo el modal sin re-renderizar la lista.

**Barra sticky reservas completada (2026-06-03):** `#res-bar` sticky en `menu.html` (verde, análoga al `#cart-bar`): conteo + total + "Confirmar reserva →". Visible solo en modo reservar con ítems en el carrito. `.res-bar` / `.res-bar-btn` agregados a `menu.css`.

**Feature C completada (2026-06-03):** Widget `MenuModal` (`public/js/widgets/menu-modal.js`) — bottom-sheet de selección para `menu.html`. Card compacta con foto/emoji, pills de secciones, botón "Ver opciones →". Modal con secciones, radio buttons (elegible) o bullets (fijo), platos agotados tachados, botón "Agregar" en footer. Funciona en modo `pedir` y `reservar`. Carrito no tocado.

**Feature A completada (2026-06-03):** Widget `PlatoPicker` (`public/js/widgets/plato-picker.js`) — sheet bottom-up, grid cards foto+nombre, buscador en vivo, tap selecciona. Reemplaza el `<select>` de platos en `renderMenuCard`. Sin cambios de backend.

**ISS-014 resuelto (2026-06-03):** Revenue Total y Ganancia de hoy siempre mostraban S/0.00. Dos bugs: (1) `GET /api/orders` no incluye `es_pagado` en el SELECT → revenue siempre 0 en frontend; fix: usar `resumen.total` del endpoint `/api/reportes/ganancias/resumen`. (2) `date('now')` en SQLite usa UTC vs fechas Lima UTC-5 → ganancia de hoy = 0 pasadas las 19h; fix: `date('now', '-5 hours')` en `routes/reportes.js`.

---

## 🏁 RESUMEN EJECUTIVO — Estado al 2026-05-29

**Código:** ✅ Listo para deploy
- 197/197 tests verde
- 0 issues abiertos (`issues/ISSUES.md`)
- 0 refactors pendientes
- Todas las features de prioridad alta cerradas (gaps 1-8 + ARCH-001 a 004 + A1/A2/A3)
- Rediseño Opus 4.8: **7 fases completas** (owner, menú cliente, super admin, landing + manuales)
- **Fase 7 (landing + manuales)** ✅ completada 2026-05-29 — repaint terracota + hero premium + animaciones + FAQ semántico

**Infraestructura:** ✅ **EN PRODUCCIÓN desde 2026-05-29**
- VPS: DigitalOcean Droplet $6/mes — IP `147.182.135.252` — NYC1 — Ubuntu 22.04
- Dominio: `menupro.tech` (Porkbun) — DNS apuntando al VPS
- SSL: Let's Encrypt — HTTPS activo en `https://menupro.tech` — renovación automática
- Stack servidor: Node.js 22 + PM2 7 + Nginx 1.18 + UFW (22/80/443)
- BD: SQLite en `/var/www/menupro/database.sqlite`
- Backups: cron diario 3am → `/var/www/menupro/backups/`
- Admin: `pedro.gabriel.rotta@gmail.com` — creado en BD
- Restaurante demo: id=1 (Crisolito) — seeder ejecutado — 11 platos, 6 mesas, 6 reservas, 5 órdenes
- `NODE_ENV=production` activo — CSP `upgrade-insecure-requests` habilitado

**URLs de producción:**
- Landing: `https://menupro.tech`
- Admin: `https://menupro.tech/admin/login`
- Login owner: `https://menupro.tech/login`
- Demo menú: `https://menupro.tech/menu?restaurante=1&mesa=1`

**Deploy futuro (desde laptop):**
```bash
cd /var/www/menupro && git pull origin main && pm2 restart menupro
```

---

## 🎨 SESIÓN OPUS 4.8 — Rediseño premium (carpeta `RestSaasPro`) — 2026-05-28

> Esta carpeta `RestSaasPro` es un clon de `RestSaas` (la original queda intacta como respaldo)
> destinado a una versión "nivel Opus 4.8": mejores gráficos, mejor flujo, sin romper el backend.

**Decisiones de la sesión:**
- Stack idéntico (vanilla JS + ES Modules, sin build). Backend Express/SQLite sin cambios de lógica.
- Identidad visual: **elevar la actual (terracota/azul peruana) + dark mode**, ejecutada a nivel premium.
- Mobile-first sigue siendo no negociable (44px touch, 16px inputs, 360px sin overflow).

**Plan por fases:**
| Fase | Qué | Estado |
|------|-----|--------|
| 0 | Clonar RestSaas→RestSaasPro, `npm install`, baseline tests | ✅ 197/197 tests OK |
| 1 | Sistema de diseño Opus para `owner.css`: tokens + dark mode + skeletons + componentes repulidos | ✅ |
| 2 | Owner panel: toggle 🌙/☀️ + anti-flash + bottom-nav móvil (5 destinos + permisos espejo + badges via MutationObserver) | ✅ |
| 3 | Gráficos premium Chart.js (degradados) + analíticas A1 (ticket promedio) / A2 (hora pico Lima UTC-5) / A3 (tasa cancelación con código de color) | ✅ |
| 4 | Rediseño premium de `menu.html` (cara del comensal): CSS extraído a `menu.css`, dark mode auto sin toggle, hero ken-burns, header sticky shrink, skeletons, modal de foto, código de reserva pulse-glow | ✅ |
| 5 | Auditoría 360px + accesibilidad (modal con role/aria) + smoke E2E con curl + docs | ✅ |
| 6 | Rediseño "Pro Console" del super admin: nueva identidad **slate + índigo-violeta**, Inter + JetBrains Mono + Syne, bottom-nav, skeletons, charts theme nuevo (`charts-theme-admin.js`), modales premium, copy "Menú Pro" | ✅ |
| **7** | **Rediseño premium de `landing.html` + `manuales.html`** (cara pública del producto): repaint a terracota, hero con gradient mesh + phone flotante + glow, CTA secundario "Demo en vivo", animaciones on-scroll IntersectionObserver, nav glassmorphism, FAQ semántico con `<details>`, cards con hover lift, footer con socials, manuales repulido al mismo estilo | ✅ **Completada 2026-05-29** |

**Fixes paralelos durante las fases:**
- CSP `upgradeInsecureRequests: null` en `app.js` — Chrome rompía POSTs en LAN por HTTPS upgrade
- PWA installable desde `login.html` (manifest + SW)
- Bootstrap admin + restaurante para laptops nuevas
- `scripts/seed-demo-data.js` (idempotente, 6 reservas + 5 órdenes en todos los flags del kanban)
- Generación `.env` con VAPID + JWT_SECRET

**Registro de cambios (RestSaasPro):**
- 2026-06-02 — **Landing (feature D del backlog priorizado): copy + navegación por secciones:**
  - **Análisis y repriorización del backlog** de pendientes en `features.md`: fusionados duplicados, agrupados en A (selección visual de platos), B (config de menús como cards), C (vista del cliente con cards+modal) y D (landing). Orden recomendado **D → A → C → B** con costo/impacto/dependencias. A/B/C comparten un futuro widget `PlatoCard`. Decisión: B sin foto de menú ni cambios de BD.
  - **Copy de `landing.html`:** headline → **"La aplicación que tu restaurante necesita: controla todo desde tu celular"**; CTA hero → **"Solicita un mes gratis de prueba sin compromiso"**; ambos **"Ver demo en vivo"** (hero + CTA final) → **"Ver cómo lo vería tu cliente"** (mismo link demo).
  - **Navegación por secciones como chips sticky:** IDs `#problema`/`#tutorial`/`#features`/`#faq` + `scroll-margin-top: 7.5rem` para el header de 2 filas. Los 4 destinos (**¿Qué soluciona? · ¿Cómo se usa? · ¿Qué necesitas? · ¿Tienes más preguntas?**) van como **chips estilo pill en una 2ª fila dentro del nav `sticky`** → siempre visibles al scrollear (ahorra scrollear para navegar). Móvil: scroll horizontal (`overflow-x-auto` + `.no-scrollbar`, tab-bar); desktop: centrados. Iteración del usuario: descartado el menú hamburguesa → chips; luego chips sticky (en nav, no en hero, porque el hero tiene `overflow:hidden` que rompe sticky). **Badge "🎁 Primer mes gratis" eliminado del header** (redundante con "Probar gratis" + CTA).
  - **Verificado** con Playwright a 360px y 1280px: chips sticky siguen visibles tras scroll, scroll horizontal interno en móvil, sin overflow horizontal de página, anclas alinean bajo el header, chips de 44px, sin badge en el nav, 0 errores de consola. Sin backend → suite de tests sin cambios.
- 2026-05-30 — **Botón "Instalar app" (PWA) + 3er widget `PwaInstall`:**
  - **`PwaInstall`** (`public/js/widgets/pwa-install.js`) — 3er widget: captura `beforeinstallprompt` (Android/Chrome/Edge)
    y muestra un botón "📲 Instalar app" que dispara el diálogo nativo; en **iOS/Safari** abre un instructivo
    "Compartir → Añadir a pantalla de inicio". Se oculta si ya está instalada (`display-mode: standalone`) o tras instalar.
  - Botón en el **sidebar-footer de `owner.html`** (`#btn-instalar-app`) y bajo el formulario de **`login.html`** (`#btn-install`).
  - **Decisión de alcance:** solo la app de gestión (owner + login). La PWA **instalable del comensal** queda como feature
    futura porque el `manifest.json` es global (`start_url: /owner.html`) → requiere **manifest dinámico por restaurante**;
    documentada junto con **URLs por slug** (`menupro.tech/karinamenu`) en `features.md`.
  - **Tests:** `scripts/test-pwa-install.js` (E2E: camino Android con `beforeinstallprompt` simulado en login+owner,
    y camino iOS con user-agent iPhone que abre el instructivo). **207/207 jest verde** (sin cambios de backend).
- 2026-05-30 — **Editar platos + 2º widget `FormModal` + fix scroll Menús del día:**
  - **`FormModal`** (`public/js/widgets/form-modal.js`) — 2º widget reutilizable: modal de formulario genérico
    dirigido por esquema de campos (text/number/textarea/select), submit async con manejo de error, autocontenido,
    mobile-first (inputs 16px, botones ≥44px, Esc/backdrop/Enter). Cargado en `owner.html`.
  - **Editar platos:** botón ✏️ por fila en **Platos de menú** (nombre + descripción) y **Platos a la carta**
    (nombre + precio + descripción + categoría), abriendo `FormModal`. Backend nuevo: `PATCH /api/menu/platos-menu/:id`
    y `PATCH /api/menu/platos-carta/:id` (scope por restaurante, categoría validada contra el restaurante). Antes solo
    se podía crear/borrar; ya no hace falta borrar y recrear para corregir. `GET /platos-carta` ahora incluye `id_categoria`.
  - **Fix scroll Menús del día (bug de layout):** `.card-header` era flex sin `flex-wrap` + `.card` con `overflow:hidden`
    → en 360px el botón "Eliminar" del menú quedaba cortado e inaccesible. Fix: `flex-wrap: wrap` en `.card-header`
    (owner.css) y en las filas internas de `renderMenuCard`. No se agregó scroll horizontal (la regla es que todo entre en 360px).
  - **Tests:** `tests/editar-platos.test.js` (10 unit, lógica SQL en memoria) + `scripts/test-editar-platos.js`
    (E2E Playwright 390px: editar carta+menú, FormModal con 4/2 campos, botón Eliminar dentro de 390px). **207/207 verde.**
- 2026-05-30 — **Sistema de componentes reutilizables (widgets) + 1er widget `PhotoEditor`:**
  - **Nueva filosofía de desarrollo:** todo lo que se use en más de una pantalla se construye como
    **widget autocontenido** (crea su DOM, inyecta sus estilos, hereda tokens de tema, API por callbacks),
    en vez de copiar-pegar/portar markup entre páginas. Documentado en **`widgets.md`** (filosofía + reglas + catálogo).
  - **`public/js/widgets/photo-editor.js`** — primer widget. Visor de imagen en grande + **recorte 1:1** +
    **Cambiar** + **Eliminar**. Sin dependencias externas, no toca el CSP. Cargado en `owner.html` con un `<script src>`.
  - **owner.html — Platos de menú y Carta:** la miniatura de cada plato ahora es clicable. **Con** foto abre el
    visor (Recortar/Cambiar/Eliminar); **sin** foto (placeholder 🍽️/🍴) elige imagen y abre directo el recortador.
    El botón 📷 de la derecha se mantiene y también pasa por el recortador. Toda subida de foto nueva pasa por
    recorte 1:1 → resuelve los cortes automáticos feos de `object-fit:cover` en `menu.html`.
  - **Recortador propio en canvas:** marco cuadrado fijo, arrastrar (pointer events: touch+mouse) + zoom con barra
    (≥44px). Exporta JPEG 800×800 vía `<canvas>.drawImage` de la región visible. Mobile-first, `prefers-reduced-motion`.
  - **`scripts/test-photo-editor.js`** — prueba E2E Playwright (viewport 390×844): subir→recortar→guardar→miniatura,
    abrir visor con las 3 acciones, recortar desde el visor, eliminar (restaura placeholder). **8/8 asserts verde, 0 errores de consola.**
  - **Pendiente (siguiente entrega):** widget `PhotoViewer` (solo lectura) y migrar el modal inline de `menu.html` a él.
  - **197/197 tests backend verde** (cambios solo frontend).
- 2026-05-29 — **Fase 7 (rediseño premium de `landing.html` + `manuales.html` — cara pública):**
  - **Repaint terracota** (7.1): Tailwind config `brand {light:#fdf0e8, DEFAULT:#c8692a, dark:#a0521e}` + var CSS `--brand-glow`. Eliminadas todas las referencias a naranja `#f97316` / `orange-*` (verificado: 0 residuales en HTML servido). `bg-orange-50` → `bg-brand-light`.
  - **Hero premium** (7.3): `.gradient-mesh` con 3 radiales (terracota + violeta `#7c5cff` + azul `#2563eb`) en `mix-blend-mode:screen` + blur 90-100px; `.hero-phone` con `rotate(-3deg)` + `@keyframes float 6s` y glow del producto detrás (`::before` blur 80px del color brand). Screenshot real del bot intacto dentro del frame.
  - **CTA "Ver demo en vivo"** (7.4): botón secundario en hero y CTA final → `/menu?restaurante=1&mesa=1`. Documentado restaurante demo en `deploy.md §10.1`.
  - **Animaciones on-scroll** (7.5): `IntersectionObserver` añade `.in-view` a cada `<section class="reveal">`; stagger por card vía `--i` + `@keyframes rise`. Fallback a "todo visible" si no hay IO o `prefers-reduced-motion`.
  - **Nav glassmorphism** (7.6): `rgba(17,24,39,0.7)` + `backdrop-filter blur(14px)`, clase `.nav-shrunk` al pasar 80px de scroll (wiring `requestAnimationFrame`).
  - **FAQ semántico** (7.7): `<input type=checkbox>` → `<details>/<summary>`, chevron rotado en `[open]`, `@keyframes faqOpen`. `summary::-webkit-details-marker { display:none }`.
  - **Cards hover lift** (7.8): `.card-lift` con `translateY(-3px)` + sombra en `:hover` y `:active` (feedback táctil móvil) en Problema, Features y FAQ.
  - **Footer ampliado** (7.9): mini-logo, WhatsApp icon, Contacto (mailto), Manuales, Ingresar, año dinámico, "Hecho en Perú 🇵🇪".
  - **`manuales.html` repulido** (7.10): paleta terracota, nav glassmorphism, tabs pill estilo owner (`box-shadow` glow al activarse + scale en `:active`), header con badge dinámico del rol + título Playfair + glow radial, blockquote/links/imgs terracota, footer con "← Volver". `marked.js` y carga por `?rol=` intactos.
  - **Decisiones respetadas**: Tailwind se quedó (no se extrajo a CSS custom), copy idéntico, screenshots del bot sin regenerar.
  - **Verificado en vivo (PORT 3310)**: `/` 200, `/manuales` 200, `/menu?restaurante=1&mesa=1` 200, 6/6 screenshots 200, 4/4 manuales por rol 200. HTML confirma terracota/gradient-mesh/hero-phone/IntersectionObserver/nav-shrunk/`<details>`/"Ver demo en vivo"/reduced-motion/footer. **0 referencias a `#f97316`.**
  - **Fix ISS-013 (service worker rompía CDN/fuentes)**: el usuario reportó la landing "sin estilos". Diagnóstico con Playwright: el SW (`sw.js`, scope `/`, registrado por login/owner/menu) controlaba la landing e interceptaba peticiones cross-origin reenviándolas con `fetch(e.request)` → Tailwind CDN y Google Fonts fallaban con `ERR_FAILED`. Fix: `if (url.origin !== self.location.origin) return;` en el handler `fetch` (no tocar cross-origin) + bump cache `menupro-v1`→`v2`. Verificado: con SW activo la landing ahora carga Tailwind correctamente. Ver `issues/ISS-013-sw-bloquea-cdn.md`.
- 2026-05-28 — Fase 0: clon creado (`RestSaasPro`, 213 archivos sin node_modules), deps instaladas, baseline **197/197 tests verde**.
- 2026-05-28 — Fase 1: `public/css/owner.css` reescrito como sistema premium (tokens completos, dark mode con `data-theme` + `prefers-color-scheme`, sombras en capas, micro-interacciones, skeleton loaders, bottom-nav listo). Cero ruptura: todos los selectores originales preservados. Definidos `--surface`/`--accent-dim`/`--accent-glow` que el CSS original referenciaba sin declarar.
- 2026-05-28 — Fase 2 (parcial): toggle de tema 🌙/☀️ en topbar de `owner.html` + script anti-flash en `<head>` (lee `localStorage['mp-theme']`, respeta preferencia del sistema, actualiza `theme-color`).
- 2026-05-28 — Verificado en vivo (PORT 3210): `/health` 200; `owner.html` y `owner.css` sirven 200 con toggle + dark mode + skeletons presentes.
- 2026-05-29 — **Fase 6 (rediseño "Pro Console" del panel super admin):**
  - **Nueva identidad visual** distinta tanto del owner (terracota cálido) como del menu (terracota auto-dark): paleta **slate quasi-black + acento índigo-violeta** (`#8b5cf6` → `#a78bfa`), con accents secundarios cyan (`#60a5fa`) y verde lima (`#4ade80`).
  - **Tipografía actualizada** en `admin/dashboard.html` y `admin/login.html`: **Inter** (UI), **JetBrains Mono** (datos numéricos/labels) y **Syne** (display/títulos). Antes era DM Mono + Syne — ya no se usa DM Mono.
  - **Tokens completos** (igual sistema que owner/menu): `--bg / --bg-2 / --surface / --surface-2 / --border / --border-hi / --accent / --accent-2 / --accent-dim / --accent-glow / --shadow-sm/-/-lg/-xl / --r-xs/-sm/-r/-lg/-pill / --t-fast/-/-slow / --font/-mono/-display`.
  - **Sidebar premium**: `backdrop-filter: blur(20px)`, brand-title con dot animado `brand-pulse 2.4s` que destella el accent, nav-items con border-left animado que se escala al activarse, gradient sutil de izquierda a derecha en hover/active.
  - **Topbar premium**: blur(18px), `topbar-meta` ahora es pill con monospace, hamburger min-44px con hover state.
  - **Stat cards**: hover lift `translateY(-2px)` + glow del accent, gradient overlay aparece en hover, valor con **gradient text** (linear-gradient(accent → accent-2) clipped al texto). Anim de entrada escalonada `fadeUp` con delays.
  - **Tablas**: header con gradient sutil, rows con hover en accent-glow-soft, datos numéricos con clase `.mono`/`.num` (font-variant-numeric: tabular-nums), badges con border-radius pill y border `color-mix`.
  - **Bottom-nav móvil** con los 5 destinos del admin (Overview/Restos/Usuarios/Reservas/Órdenes) — el item activo muestra una barra superior con gradient + glow drop-shadow en el ícono. Sin botón "Más" (los 5 paneles caben sin colapsar).
  - **Skeletons premium** reemplazan "Cargando…" tanto en `stats-grid` (4 skel-cards con líneas variables) como en `tbody-restaurantes` (3 skel-rows con celdas individuales). Animación `@keyframes shimmer`.
  - **Modales premium**: backdrop con `blur(8px)`, animación de entrada `modalPop` con cubic-bezier elastic, sombra en capas + ring de accent-glow-soft, botón close circular con hover state.
  - **Drawer de stats por restaurante**: backdrop-blur(24px), tabs en pill con gradient activo + box-shadow del accent, mini-stats con border que reacciona al hover, panel switching con `fadeUp`.
  - **Charts theme nuevo** `public/js/modules/charts-theme-admin.js`: tema Chart.js con Inter + JetBrains Mono, tooltips con border, padding 12, border-radius 10, hoverRadius 6. Charts del drawer (demanda + ganancias) ahora usan paleta admin: Órdenes `#8b5cf6` (índigo), Reservas `#60a5fa` (cyan), Total `#4ade80` (verde dashed). Helper `mpGradientAdmin()` para rellenos en gradiente vertical de fondo del area chart.
  - **Login admin**: aplicada misma identidad. Ambient glow + grid sutil con mask radial. Badge "Superadmin access" con pill border-radius y box-shadow accent-glow. Card con backdrop-blur(20px), ring de accent-dim, gradient overlay esquina-a-esquina. Card-title "Menú Pro" con dot animado y span con gradient text. Inputs ahora 16px (no zoom iOS) y min-height 44px. Botón submit con gradient + glow elevation.
  - **Copy actualizado**: "Restaurant SaaS" → **"Menú Pro"** en login admin y en sidebar del dashboard (consistencia de marca).
  - **Animaciones extras**: `fadeIn`, `fadeUp`, `modalPop`, `shimmer`, `brand-pulse`. `prefers-reduced-motion` respetado.
  - **Verificado en vivo**: `/admin/login` 200, `/admin/dashboard` 200, `/js/modules/charts-theme-admin.js` 200. HTML dashboard contiene 27 referencias a nuevas clases y 12 al accent/font/helper. **197/197 tests verde.**
- 2026-05-29 — **Fase 5 (cierre del rediseño Opus 4.8):**
  - **Auditoría 360px** en `menu.html`, `owner.html`, `css/menu.css`, `css/owner.css`: 0 widths/min-widths fijos > 360px, 0 overflow horizontal, 0 inputs sin `type=`, 0 `<img>` sin `alt`. Inline `font-size: 11-13px` solo en labels/captions/meta (conforme con la regla: contenido ≥14px, inputs ≥16px).
  - **Accesibilidad**: modal de foto del plato con `role="dialog"` + `aria-modal="true"` + `aria-labelledby="photo-modal-name"`. Botón de cierre con `aria-label="Cerrar"`. Soporte `Esc` para cerrar.
  - **Smoke test E2E** con `curl` contra server real: login `owner@bot.com` 200 → `GET /api/public/restaurante/1` 200 → `GET /api/public/menu` 200 → `GET /api/public/carta` 200 → `POST /api/public/orders` con item (id_orden:6) 201 → `POST /api/public/reservations` (id_reserva:8, codigo `V5HBbm3`) 201 → `GET /api/public/reserva/V5HBbm3` 200 con todos los flags semánticos correctos. `/menu.html`, `/css/menu.css`, `/manifest.json` → 200.
  - **Documentación**: `features.md` actualizado con tabla nueva "Rediseño premium Opus 4.8" mostrando las 5 fases ✅, fix de `upgrade-insecure-requests`, y receta de setup desde laptop nueva. `status.md` con Fase 5 ✅ y resumen final.
  - **197/197 tests verde** (final).
- 2026-05-29 — **Fase 4 (rediseño premium de `menu.html` — cara del comensal):**
  - **Extraído CSS inline** (~280 líneas dentro de `<style>`) → nuevo `public/css/menu.css` (~736 líneas) con sistema de tokens completo compartido con `owner.css` (`--surface`, `--accent-glow`, `--shadow-xs/sm/lg/xl`, `--r/-sm/-lg/-pill`, `--t-fast/t/t-slow`, `--font/-display`).
  - **Dark mode automático** vía `@media (prefers-color-scheme: dark)` + variante override `:root[data-theme="dark"]`. Anti-flash en `<head>` setea `data-theme="auto"` antes del primer paint y actualiza `theme-color` a `#1a1410` si el sistema está en dark. Sin toggle visible (es vista del cliente, minimizar UI).
  - **Hero portada premium**: altura 220px, gradiente fallback color del restaurante, overlay `linear-gradient` superior→inferior para profundidad, `transform:scale(1.02)` con `transition 8s` que se reduce a `scale(1)` al cargar la imagen (efecto subtle ken-burns).
  - **Header sticky con shrink**: backdrop-filter blur(14px), al pasar 60px de scroll el header se compacta (`.shrunk` reduce padding + tipografía + cat-nav margin), wiring vía `requestAnimationFrame` en `setupHeaderShrink()`.
  - **Skeleton loaders** reemplazan el spinner inicial en pedido y reserva — 3 cards de 72px con líneas shimmer animadas vía `@keyframes shimmer`.
  - **Modal de foto**: tap en cualquier `.plato-thumb` o `.plato-carta-img` abre `.photo-modal` (overlay backdrop-blur, foto contain max 70vh, nombre Fraunces 1.3rem, descripción). Cierra con tap fuera, botón ✕ o `Esc`. `openPhotoModal()` / `closePhotoModal()` agregados al script.
  - **Tipografía**: Fraunces ital,wght cargado en serif display; DM Sans 300-800; títulos con `letter-spacing` ajustado, `-webkit-font-smoothing: antialiased`.
  - **Cards y botones repulidos**: sombras en capas (`--shadow-sm/-lg`), bordes redondeados (`--r-sm/-r/-r-lg`), `accent-glow` en estados hover, `transform: scale(0.98)` en `:active`. Touch targets 44px+ garantizados en `.btn-add-menu`, `.qty-btn`, `.mode-tab`, `.cat-pill`, `.btn-confirmar`, `.btn-reservar`.
  - **Drawer del carrito** con backdrop-filter blur, handle más visible (42×5 px), título Fraunces, `box-shadow: 0 -20px 60px`, animación de slide con cubic-bezier.
  - **Pantalla de éxito**: ícono 4.5rem con `drop-shadow(0 8px 18px accent-glow)`, animación `pop` con cubic-bezier elastic, código de reserva en `.codigo-box` (border 2px accent, padding 1.1×1.6rem) con animación `pulse-glow` infinita de 2.5s.
  - **Botón "Consultar mi reserva"** del header: clase nueva `.btn-consultar` con estado activo (`scale(0.96)` + fondo accent al tap).
  - **prefers-reduced-motion** respetado: deshabilita todas las animaciones para usuarios con esa preferencia.
  - **Verificado en vivo (PORT 3000)**: `/menu.html?restaurante=1` 200, `/css/menu.css` 200, HTML servido contiene 18 referencias a clases nuevas, APIs públicas (`/api/public/restaurante/1`, `/api/public/menu`) devuelven data del seeder. **197/197 tests verde.**
- 2026-05-29 — Setup en laptop nueva + seeder de datos demo:
  - Generado `.env` con VAPID keys de desarrollo + `JWT_SECRET` aleatorio (no se commitea).
  - Bootstrap manual: restaurante `id=1` (Crisolito) + admin `admin@local / Admin2026!` creados con script inline; `npm run bot:setup` después crea owner/cocina/mozo @bot.com.
  - Nuevo `scripts/seed-demo-data.js` — idempotente para el día actual. Crea 4 secciones, 11 platos de menú, 1 menú del día elegible (S/15), 3 categorías + 6 platos de carta, 6 mesas, 6 reservas distribuidas en todos los flags (`es_inicial`/`es_confirmada`/`es_en_cocina`/`es_listo×2`/`es_cliente_llego`) y 5 órdenes (`es_inicial`/`es_en_cocina×2`/`es_listo`/`es_entregado`). Usa `generarCodigoUnico()` para los códigos de reserva. Reentrante: borra reservas/órdenes del día antes de insertar.
- 2026-05-29 — **Fix CSP `upgrade-insecure-requests`** (`app.js`):
  - Síntoma: en celular (o en cualquier navegador entrando por IP de LAN `http://10.147.11.131:3000`), los `GET` cargaban bien pero **todo POST** (login incluido) fallaba con "Error de red" sin llegar al server. Localhost funcionaba.
  - Causa: Helmet añade `upgrade-insecure-requests` al CSP por defecto. Chrome trata localhost como secure context e ignora la directiva, pero la IP de LAN como insegura → intenta convertir el `fetch` a HTTPS, el server de dev no tiene TLS, conexión rechazada.
  - Fix: agregado `upgradeInsecureRequests: null` dentro de `helmet({ contentSecurityPolicy: { directives: { ... } } })`. Verificado con `curl -I http://10.147.11.131:3000/login.html | grep -i csp` — el header ya no incluye la directiva. **197/197 tests verde.**
  - Documentado en `deploy.md` §8.2 con nota para **reactivarla en producción HTTPS** + checklist item nuevo.
- 2026-05-29 — Fase 2 (bottom-nav móvil completa):
  - `public/owner.html`: nuevo `<nav class="bottom-nav">` con 5 destinos (Cola del día, Cocina, Reservas, Menú, Más). El botón "Más" abre el sidebar (hamburguesa) para acceso a Carta, Órdenes, Usuarios, Reportes, Configuración.
  - `showPanel()` extendido para sincronizar `.active` entre sidebar y bottom-nav vía `data-target`.
  - Espejo de permisos: los `bn-item` se ocultan automáticamente si su `nav-item` del sidebar está oculto (mismo criterio que ya filtra cocinero / usuarios delegados).
  - Badges duplicados con `MutationObserver` sobre `badge-pedidos|cocina|reservas` del sidebar → `bn-badge-*` del bottom-nav (sin tocar los módulos).
  - `public/css/owner.css`: bottom-nav activa con `display:flex` solo en `@media (max-width: 768px)`; `.content` gana `padding-bottom: calc(76px + env(safe-area-inset-bottom))` en móvil para no tapar contenido; estilos de badge con anillo del color de surface.
  - Generado `.env` con VAPID keys y JWT_SECRET de desarrollo (faltaba para arrancar el server).
  - **Verificado en vivo (PORT 3210)**: `/health` 200, `/owner.html` 200, `/css/owner.css` 200, HTML servido contiene 10 referencias a `bottom-nav/bn-*`, CSS contiene 12. **197/197 tests verde.**
- 2026-05-28 — Fase 3 (gráficos premium):
  - Nuevo `public/js/modules/charts-theme.js`: tema global de Chart.js (fuente Lato, tooltips redondeados, leyendas con punto, colores que se adaptan a claro/oscuro vía tokens CSS) + helper `mpGradient()`. Cargado en `owner.html` tras Chart.js.
  - `reportes.js`: rellenos con **degradado** en curva de demanda y ganancias; barras con esquinas redondeadas; `pointHoverRadius`.
  - **A1 Ticket promedio** + **A3 Tasa de cancelación**: nuevo endpoint `GET /api/reportes/kpis` (backend) + 2 stat-cards en Reportes.
  - **A2 Hora pico**: nuevo endpoint `GET /api/reportes/hora-pico` (demanda por hora, hora Lima UTC-5) + nuevo card con gráfico de barras apiladas (órdenes/reservas) en Reportes.
  - El toggle de tema re-aplica el tema de los charts y los recarga si estás en Reportes.
  - **Verificado en vivo con login real** (owner@bot.com): `/api/reportes/kpis` 200 → ticket S/15.27, cancelación 24.1% (7/29); `/api/reportes/hora-pico` 200 → pico a las 11h. **197/197 tests verde.**

---

## Stack
- **Backend:** Node.js + Express + better-sqlite3
- **Auth:** JWT (cookies httpOnly)
- **Frontend:** HTML/CSS/JS vanilla + ES Modules (sin framework)
- **CSS:** custom puro en todo el proyecto → extraído a `public/css/owner.css`. Tailwind adopción progresiva en producción (post-lanzamiento, módulo por módulo)
- **BD:** SQLite (PostgreSQL — migración futura)
- **Mobile:** PWA instalable (pendiente ARCH-002)

## Decisiones arquitectónicas — 2026-05-21

| Decisión | Descripción |
|----------|-------------|
| Mobile-first obligatorio | El sistema vive en celulares de gama media. No hay tablets ni laptops en el punto de venta. Todo el frontend debe cumplir requisitos mobile (touch targets, font-size, overflow, PWA). |
| ES Modules | `owner.html` se divide en módulos JS separados en `public/js/modules/`. Ver ARCH-001 en features.md. |
| CSS custom puro | Todo el proyecto en CSS custom (no Tailwind). Solo kitchen.html usaba Tailwind — eliminado. Migración a Tailwind: progresiva en producción, post-lanzamiento. |
| kitchen.html | **ELIMINADO** — reemplazado por panel "Cocina" en owner.html via `cocina.js` (ARCH-001 paso 1.6 ✅) |
| Vista unificada "Cola del día" | Nuevo panel en owner.html mostrando órdenes + reservas activas juntas, ordenadas por urgencia. |
| Columna `modalidad` en reservas | Agregar antes de implementar flujo completo de estados (ARCH-004). |
| PWA | manifest.json + service worker básico — instalable en home screen sin Play Store. |

---

## Estado actual: `ACTIVO — EN DESARROLLO`

Rama activa: `master`

---

## ✅ COMPLETADO — Bot de documentación (sesión 2026-05-27)

**Todos los pasos del TODO de `landing/BOT.md` están completos. Bot corre, genera 34 screenshots y 4 manuales `.md`.**

### Estado del TODO (ver `landing/BOT.md` para detalle completo)

| Paso | Tarea | Estado |
|------|-------|--------|
| 1 | Instalar Playwright + Chromium | ✅ Completo |
| 2 | Crear estructura `landing/bot/` | ✅ Completo |
| 3 | `bot.js` — orquestador principal | ✅ Completo |
| 4 | Flow: Login (owner/cocinero/mozo) | ✅ Completo (dentro de `flows/owner.js`) |
| 5 | Flows owner.html — 19 secciones | ✅ Completo |
| 6 | Flow cocinero | ✅ Completo (3 screenshots) |
| 7 | Flow mozo | ✅ Completo (4 screenshots) |
| 8 | Flow cliente consumidor (`menu.html`) | ✅ Completo (8 screenshots) |
| **9** | **Generar ~12 imágenes de platos peruanos para `landing/bot/assets/`** | **✅ Completo** |
| 10 | Generar 4 manuales `.md` con screenshots | ✅ Completo (en `landing/bot/output/`) |
| 11 | Generar `errors-report.md` con errores de consola | ✅ Completo (7 falsos positivos detectados) |

### Notas Paso 9 — imágenes de platos
- Wikipedia `upload.wikimedia.org` retornó HTTP 429 (rate limiting) en múltiples intentos
- Solución: `generate-placeholder-images.js` usa Playwright/Chromium para renderizar HTML estilizado con emoji + nombre + color único por plato y capturar como JPEG 640×480
- 12/12 imágenes disponibles en `landing/bot/assets/` (papa-huancaina.jpg descargada de Wikipedia, resto generadas)
- Script: `npm run bot:assets`

### Pendiente
- Reruns del bot (`npm run bot:run`) para que el flow de carta (`06-carta-platos`) use imágenes reales en screenshots

---

## ✅ COMPLETADO — Landing page + Manuales web (sesión 2026-05-28)

**`public/landing.html` construida con 7 secciones. `/manuales` renderiza los 4 manuales con marked.js.**

### Cambios realizados

| Archivo | Cambio |
|---------|--------|
| `public/landing.html` | Landing completa — Hero, Problema, Tutorial, Features, Quién lo hace, FAQ, CTA final |
| `public/manuales.html` | Página `/manuales` con 4 tabs (Dueño, Cocinero, Mozo, Cliente) — renderiza `.md` con marked.js |
| `public/landing/screenshots/` | 7 screenshots copiados del bot para la landing |
| `app.js` | Ruta `/` → `landing.html`; `/manuales` → `manuales.html`; `/bot-screenshots` estático; `/api/manuales/:rol`; Tailwind CDN en CSP |
| `landing/bot/output/manual-*.md` | Corrección de voseo → tuteo peruano (15 ocurrencias en 4 archivos) |

### Decisiones
- Screenshots de la landing: reutilizados del bot (no fue necesario tomar nuevas capturas)
- Precio: no mencionado — CTA de WhatsApp con mensaje predeterminado
- WhatsApp: `51921340185`
- Manuales: renderizado client-side con `marked.js` CDN; imágenes servidas en `/bot-screenshots/`

### Para correr el bot en laptop nueva
```bash
npm install
npx playwright install chromium
npm run bot:setup     # crea usuarios bot en BD local
npm run bot:assets    # genera imágenes de platos (sin internet externo)
npm run bot:run       # genera screenshots + manuales
```

### Archivos clave del bot
| Archivo | Propósito |
|---------|-----------|
| `landing/bot/bot.js` | Orquestador — punto de entrada |
| `landing/bot/flows/{owner,cocina,mozo,cliente}.js` | Flows por rol |
| `landing/bot/setup-bot-users.js` | Crea owner@bot.com / cocina@bot.com / mozo@bot.com (pass: `BotMenuPro2026!`) |
| `landing/bot/output/manual-*.md` | Manuales generados (commiteados, reproducibles con `bot:run`) |
| `landing/bot/generate-placeholder-images.js` | Genera 11 imágenes de platos con Playwright (sin internet) — `npm run bot:assets` |
| `landing/bot/assets/` | 12/12 imágenes disponibles (papa-huancaina real, resto placeholder Playwright) |
| `landing/bot/errors/errors-report.md` | Log de errores (en .gitignore, se regenera) |

---

## Decisiones de sesión 2026-05-21 (arquitectura frontend)

| Decisión | Detalle |
|----------|---------|
| kitchen.html → eliminado | Cocinero sin permisos redirige a owner.html. JS detecta rol y muestra solo panel Cocina |
| CSS custom puro | Todo el proyecto. Tailwind: adopción progresiva en producción post-lanzamiento |
| Zonas Kanban | Vista de pedidos activos en columnas/tabs por estado: Pendientes→Cocina→Listos→Cobrar |
| ARCH-004 ✅ | `modalidad TEXT DEFAULT 'en_local'` en tabla `reservas` — `config/database.js` |
| ARCH-001 paso 1.1 ✅ | CSS extraído de `owner.html` → `public/css/owner.css`. `<link rel="stylesheet">` en su lugar |
| ISS-004 ✅ | BOM UTF-8 por PowerShell corrompía caracteres. Re-guardado con `UTF8Encoding($false)`. Regla agregada a CLAUDE.md |
| "Cliente" del producto | Engloba todos los usuarios: owner, mozo, cocinero y comensales |
| Analytics de UX | Feature futura: medir comportamiento de todos los usuarios en producción |

---

## Módulos implementados

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth (login/logout) | ✅ Completo | JWT en cookie, roles: admin / owner / cocinero / mozo |
| Menú del día | ✅ Completo | Secciones, platos, menús del día con componentes |
| Carta | ✅ Completo | Categorías y platos a la carta con toggle activo/inactivo |
| Órdenes activas | ✅ Completo | Vista en tiempo real, flujo de estatus |
| Historial de órdenes | ✅ Completo | Filtros por fecha y estatus |
| Descarga Excel (formato_1) | ✅ Completo | Ver sección Formatos |
| Reservas | ✅ Completo | Flujo completo: Confirmar → Cocina → Listo → Cliente llegó → Completar. Historial + descarga Excel. (ISS-006 resuelto 2026-05-23) |
| Usuarios | ✅ Completo | Owner puede crear cocinero/mozo y asignar permisos granulares. Cambio de contraseña propio disponible para todos los roles desde sidebar. |
| Reportes | ✅ Completo | Métricas y gráficas de barras |
| Panel Admin | ✅ Completo | Gestión global de restaurantes y usuarios. Panel de estadísticas por restaurante (drawer lateral con tabs Resumen/Demanda/Ganancias, Chart.js). |
| Vista Cocina | ✅ Completo | Panel Cocina en `owner.html` via `cocina.js`. `kitchen.html` reemplazado con redirect. Muestra órdenes + reservas en preparación (ISS-008 resuelto 2026-05-23). |
| Polling automático + alerta de sonido | ✅ Completo | Auto-refresh 15s, 3 endpoints REST, detección de órdenes nuevas, audio via Web Audio API, toggle mute persistido en localStorage |
| Cola del día — Kanban (Gap 2) | ✅ Completo 2026-05-23 | `pedidos.js` — 4 tabs Kanban (Pendientes/En Cocina/Listos/Por cobrar), badges, botones de acción rápida, flag `es_entregado`, polling 15s. |
| Auto-preparación de reservas + Push (Gap 3) | ✅ Completo 2026-05-25 | Job en servidor cada 60s. Reservas `es_confirmada` con `hora_llegada` pasan a `es_en_cocina` automáticamente X min antes. Web Push al celular aunque la app esté cerrada. `minutos_preparacion` configurable por restaurante (default 20 min). 29 tests. |
| Modalidades de pedido (Gap 4) | ✅ Completo 2026-05-25 | `en_local`/`para_llevar` en órdenes; `en_local`/`para_llevar`/`delivery` en reservas. Flujo de estados diferenciado por modalidad. Badges visuales. Selectores en menu.html. Config owner. 22 tests. |
| Auto-merge cuenta por mesa (Gap 8) | ✅ Completo 2026-05-25 | Al marcar `es_cliente_llego`, copia ítems carta+menú de la reserva a la orden activa de la misma mesa. `auto_merge_activo` configurable por restaurante (default: activo). Toggle en panel Configuración del owner. 17 tests. |
| Precio por modalidad (Gap 5) | ✅ Completo 2026-05-25 | `costo_tapper`/`tarifa_delivery` en `restaurantes`; `cargo_modalidad` en `ordenes` y `reservas`; total incluye cargo; desglose visual en menu.html (+S/ X al seleccionar para llevar/delivery); config en owner. 21 tests. |
| Mobile-first (ARCH-003) | ✅ Completo 2026-05-23 | Touch targets 44px, font-size 14-16px, type en inputs, sin overflow 360px |
| PWA instalable (ARCH-002) | ✅ Completo 2026-05-22 | manifest.json + service worker + íconos |
| ES Modules (ARCH-001) | ✅ Completo 2026-05-23 | owner.html modularizado en 9 módulos JS separados |
| Menú cliente (QR) | ✅ Completo | `menu.html` — carta + menú del día |
| Plano de mesas visual | ✅ Completo | Tabla `mesas`, chips color-coded, polling 10s |
| Pagos Fase 1 | ✅ Completo | Yape/Plin/Efectivo, comprobante foto, confirmación manual |
| Flags semánticos en estatus (REFACTOR-001) | ✅ Completo 2026-05-21 | Elimina hardcodes de nombres; sistema funciona aunque admin renombre estatus |
| Código de reserva + estado para el cliente (Gap 6) | ✅ Completo 2026-05-21 | `codigo` único en `reservas`; pantalla de confirmación con código grande; consulta de estado pública; código visible en tarjetas de owner |

---

## Formatos descargables

| # | Nombre | Módulo > Submódulo | Filtros | Estado |
|---|--------|--------------------|---------|--------|
| 1 | `historial_ordenes_DESDE_HASTA.xlsx` | Órdenes > Historial | fecha_desde, fecha_hasta | ✅ Implementado |
| 2 | `historialReservas_DESDE_HASTA.xlsx` | Reservas > Historial | fecha_desde, fecha_hasta | ✅ Implementado |
| 3 | `demanda_clientes_{intervalo}.xlsx` | Reportes > Análisis de demanda | intervalo (dia/semana/mes) | ✅ Implementado |
| 4 | `pedidos_{tipo}_{filtro}.xlsx` | Reportes > Análisis de pedidos | tipo (menu/carta), filtro (sección/categoría) | ✅ Implementado |
| 5 | `ganancias_{intervalo}.xlsx` | Reportes > Ganancias | intervalo (dia/semana/mes) | ✅ Implementado |

### Diseño de formatos
- Fila 1: nombre del restaurante — fondo oscuro `#1a1612`, texto blanco
- Fila 2: título + rango de fechas — fondo accent `#c8692a`, texto blanco
- Fila 3: encabezados — fondo `#fdf0e8`, texto `#a0521e` en negrita
- Filas **N** (carta): fondo blanco
- Filas **Y** (menú): fondo azul claro `#edf4fb`
- Fila **T** (total): fondo `#fdf0e8`, negrita, precio en `#c8692a`

---

## Archivos de referencia clave

| Archivo | Propósito |
|---------|-----------|
| `vision_negocio.md` | Brújula del proyecto: target, flujos, roles, gaps. **Leer siempre al inicio de sesión.** |
| `features.md` | Backlog priorizado de features pendientes |
| `issues/ISSUES.md` | Bugs e issues abiertos |
| `issues/REFACTOR-001-estatus-dinamicos.md` | Refactor estatus dinámicos por flags — ✅ COMPLETO 2026-05-21 |
| `issues/ISSUES.md` | Bugs abiertos — ISS-002 (botón "Ya pagué con Plin" deshabilitado en menu.html) · ISS-003 resuelto (flag 500) |

---

## Historial de prompts

| Fecha | Prompt | Cambios |
|-------|--------|---------|
| 2026-05-09 | Configuración inicial del proyecto | Estructura base, auth, BD SQLite |
| 2026-05-09 | Cambios en models | Ajustes en modelos de datos |
| 2026-05-09 | Rango de fechas en historial de órdenes | Filtros `fecha_desde` / `fecha_hasta` en `GET /api/orders` y en el frontend |
| 2026-05-09 | Formato_1: descarga Excel historial de órdenes | Instalación de `exceljs`, endpoint `GET /api/orders/export`, botón en historial, función `descargarFormato1()` |
| 2026-05-09 | Precio de componentes en reservas | Query de `menuItems` en `GET /api/reservations` ahora incluye `precio_menu` y `total_componentes`; se calcula `precio_unitario` por componente y se suma al total. 27 pruebas en `scripts/test-menu-pricing.js`. **Oportunidad de mejora:** revisar la función de suma del precio de los componentes en la reserva — actualmente divide el precio del menú entre el total de componentes registrados en BD, pero podría no reflejar correctamente escenarios donde el cliente elige sólo algunas secciones. |
| 2026-05-09 | Fix divisor precio menú en reservas | Corregido subquery de `total_componentes`: se usa `menu_secciones` (una fila por sección por menú) en lugar de `componentes_menu_dia` (que tiene N filas por sección en menús elegibles). 35 pruebas actualizadas en `scripts/test-menu-pricing.js`. |
| 2026-05-09 | Formato_2: descarga Excel historial de reservas | Endpoint `GET /api/reservations/export` (`authorize owner`), botón "⬇ Descargar Excel" en Reservas > Historial, función `descargarFormatoReservas()`. Columnas: ID Reserva, Mesa, Fecha, Cliente, Teléfono, Menú, Sección/Categoría, Plato, Cantidad, Precio. Archivo: `historialReservas_DESDE_HASTA.xlsx`. |
| 2026-05-11 | Setup en laptop nueva | `npm install`, creación de `.env`, generación de `database.sqlite` y usuario admin inicial. Proyecto listo para desarrollo. |
| 2026-05-11 | Fix columna `activo` en platos_carta | Columna `activo INTEGER DEFAULT 1` faltaba en `CREATE TABLE` de `config/database.js`. Agregada a la definición y migración idempotente para bases existentes. Resuelve error 500 en `GET /api/menu/platos-carta`. |
| 2026-05-11 | Fix scroll horizontal en tablas móvil | Todas las tablas dinámicas de `owner.html` (secciones, platos-menu, categorías, platos-carta, usuarios) envueltas en `<div class="table-wrap">` para habilitar scroll horizontal en pantallas pequeñas. |
| 2026-05-11 | Submódulo análisis de demanda — Curva de clientes | Nuevo `routes/reportes.js` con `GET /api/reportes/clientes-timeline?intervalo=dia|semana|mes`. Agrega en SQL con `strftime`. Frontend: gráfica de línea con Chart.js (CDN), botones Día/Semana/Mes en panel-reportes de `owner.html`. Propuesta de columnas para Excel formato_3 escrita en `formatos.md`. |
| 2026-05-11 | Submódulo análisis de pedidos — card unificada + Excel | 3 cards separadas reemplazadas por 1 card con drill-down: tipo (Menú/Carta) → sección/categoría → bar chart platos más pedidos (órdenes + reservas). Endpoints: `GET /api/reportes/pedidos/filtros`, `/pedidos`, `/pedidos/export`. `loadReportes()` simplificada. Chart agrupado naranja/azul. |
| 2026-05-11 | Formato_3: Excel curva de clientes (Reportes > Análisis de demanda) | Endpoint `GET /api/reportes/clientes-timeline/export?intervalo=dia|semana|mes` en `routes/reportes.js`. Genera histórico completo agrupado por período: columnas Período, Órdenes, Reservas, Total clientes, fila de totales al final. Diseño con colores del sistema (fila restaurante `#1a1612`, título `#c8692a`, encabezados `#fdf0e8`/`#a0521e`, filas alternas blanco/`#edf4fb`). Frontend: botón "⬇ Excel" en la card de Curva de clientes, función `descargarFormatoDemanda()` que usa el `intervaloActual` activo. Archivo: `demanda_clientes_{intervalo}.xlsx`. |
| 2026-05-13 | Upgrade arquitectura: columna `total` en órdenes y reservas | Nuevo `utils/totales.js` con `calcularTotalOrden(db, id)` y `calcularTotalReserva(db, id)`. Migraciones idempotentes en `config/database.js` (columna `total REAL DEFAULT NULL` en `ordenes` y `reservas`). Backfill automático al inicio: calcula y guarda el total de todas las órdenes `completado` y reservas `completada` existentes sin total. `routes/orders.js`: al pasar a `completado`, calcula y persiste `total`. `routes/reservations.js`: al pasar a `completada` (es_full=1), ídem. Elimina el problema de N+1 queries en reportes de ganancias. |
| 2026-05-13 | Submódulo de ganancias (Reportes) | 4 cards (Ganancias totales, del mes, de la semana, de hoy) + gráfica de líneas con 3 series (Total, Órdenes, Reservas) + descarga Excel. Endpoints: `GET /api/reportes/ganancias/resumen`, `/ganancias/timeline?intervalo=dia\|semana\|mes`, `/ganancias/export`. Fuente de datos: `SUM(total)` directamente desde la BD (sin N+1). `formatos.md`: formato_5 documentado. |
| 2026-05-13 | Mejora reportes — serie Total en chart-demanda y chart-pedidos | `owner.html`: `loadDemanda()` agrega 3er dataset "Total" (verde `#2e7d52`) usando el campo `total` que ya devolvía el backend. `loadPedidos()` agrega 3er dataset "Total" (verde `#2e7d52`) ídem. Sin cambios en backend. |
| 2026-05-14 | Panel de Configuración — foto de portada + colores + brand sidebar | Migraciones `foto_portada`, `color_primario`, `color_secundario` en `restaurantes`. Multer configurado en `routes/menu.js` (4 endpoints: GET/PATCH config, POST/DELETE foto). `routes/public.js` extendido. `owner.html`: sidebar muestra nombre real y foto/emoji del restaurante; panel Configuración con preview, input file y color pickers. `menu.html`: hero banner y colores dinámicos vía CSS variables. |
| 2026-05-14 | Eliminar sección de un menú del día | `owner.html`: botón ✕ en cada sección dentro de `renderMenuCard()` + función `eliminarSeccionDeMenu()` que llama al endpoint `DELETE /api/menu/menus-dia/:id/secciones/:seccionId` ya existente. Sin cambios en backend. |
| 2026-05-14 | Fotos en platos de menú y carta | `routes/menu.js`: función factory `makeUploadPlato` + helper `subirFotoPlato`/`eliminarFotoPlato` → 4 endpoints POST/DELETE para `platos-menu` y `platos-carta`. Carpetas `public/uploads/platos-menu/` y `public/uploads/platos-carta/`. `owner.html`: tablas de platos con columna de miniatura (40×40) y botones 📷/🗑 por fila. `menu.html`: fotos en platos elegibles (`.plato-thumb` 52×52 a la derecha), platos fijos (ídem) y platos de carta (`.plato-carta-img` 64×64 a la izquierda). |
| 2026-05-14 | Sistema de permisos granulares | `config/database.js`: columna `permisos TEXT DEFAULT NULL` en `usuarios`. `middleware/authenticate.js`: `authorizePermiso()`. `routes/auth.js`: permisos en JWT y respuesta. `routes/usuarios.js`: GET devuelve permisos; nuevo PATCH /:id/permisos. Todos los `authorize('owner')` en 4 routes reemplazados por `authorizePermiso()`. `login.html`: guarda permisos en sessionStorage; redirige a owner.html si tiene permisos delegados. `owner.html`: guard acepta usuarios con permisos; filtra nav/paneles; oculta sub-tabs; matriz de 8 checkboxes por usuario en panel Usuarios. |
| 2026-05-18 | Polling automático + alerta de sonido en kitchen.html | `utils/orderStatus.js`: utilidad de mapeo inglés↔español para estatus de cocina. `routes/orders.js`: `GET /api/orders/queue` (cola de cocina con campos en inglés), `PUT /api/orders/:id` y `PUT /api/orders/combo/:id` (alias) para actualizar status desde cocina. `kitchen.html`: función `detectAndAlertNewOrders()` compara set de IDs pending prev vs actual; `playAlertSound()` vía Web Audio API (dos tonos, fade-out 450ms); botón 🔔/🔕 en header con preferencia persistida en localStorage. Tests: `tests/order-status.test.js` (15 casos) + `tests/kitchen-polling.test.js` (15 casos) = 30 tests, todos pasan. |
| 2026-05-18 | Inhabilitar menú del día | Migración idempotente `activo INTEGER DEFAULT 1` en `menus_dia`. Endpoint `PATCH /api/menu/menus-dia/:id/activo` en `routes/menu.js`. `GET /api/menu/menus-dia` incluye campo `activo` en SELECT. `GET /api/public/menu` filtra `AND activo = 1`. `owner.html`: botón "● Visible / ○ Oculto" en cada card de menú + función `toggleActivoMenu()`; cards inactivas con `opacity:0.55`. Tests: `tests/menu-activo.test.js` (11 casos), todos pasan. |
| 2026-05-18 | Platos agotados en menú del día | Migración idempotente `agotado INTEGER DEFAULT 0` en `componentes_menu_dia`. Endpoint `PATCH /api/menu/menus-dia/:id/secciones/:seccionId/platos/:componenteId/agotado`. `GET /api/menu/menus-dia` incluye `cmd.agotado` por plato. `GET /api/public/menu` filtra `AND cmd.agotado = 0`. `owner.html`: botón "Disponible / Agotado" por plato + función `toggleAgotadoPlato()`; platos agotados con texto tachado y opacidad 0.5. Tests: `tests/platos-agotados.test.js` (12 casos), todos pasan. |
| 2026-05-18 | Generador de QR del menú | CDN `qrcode@1.5.3` en `<head>`. Card nueva en panel Configuración: QR 180×180 con colores del sistema, input con link copiable, botón "Descargar PNG" via `canvas.toDataURL()`. Se regenera cada vez que se abre el panel (`loadConfiguracion` llama `generarQR()`). Sin cambios en backend. |
| 2026-05-18 | Plano de mesas visual | Tabla `mesas` con migración idempotente. `routes/mesas.js`: GET lista, GET /estado (libre/ocupada/reservada), POST, PATCH/:id, DELETE/:id. Registrado en app.js. `owner.html`: tab "Plano" como primera tab del panel Órdenes con chips color-coded (verde/rojo/amarillo), detalle inline de orden/reserva en mesa. Panel Configuración: sección mesas con form agregar + lista con botón eliminar. Polling 10s actualiza el plano si está activo. Tests: `tests/plano-mesas.test.js` (13 casos), todos pasan. |
| 2026-05-18 | Fix horas UTC → hora Lima | `owner.html`: helper `toUTC(d)` normaliza strings SQLite (`"2026-05-19 02:20:00"` → `"2026-05-19T02:20:00Z"`) evitando duplicar `Z` si ya está presente; `fDT` usa `timeZone:'America/Lima'`. `routes/orders.js`: mismo fix en Excel export (`horaExcel`). Tests: `tests/timezone.test.js` (11 casos), todos pasan. |
| 2026-05-21 | Sesión de análisis de visión del negocio | Creado `vision_negocio.md` con target, flujos completos (reserva dine-in/takeout/delivery, walk-in, cocina, pago), roles, principios de diseño, 15 gaps identificados. Sesión 0 de REFACTOR-001 completada: flags semánticos en BD + 8 endpoints admin. |
| 2026-05-21 | ISS-003 fix — PATCH estatus con flag retornaba 500 | `AND id_restaurante IS NULL` inválido eliminado de 3 queries en `routes/orders.js` (×2) y `routes/reservations.js` (×1). Las tablas `estatus_orden` y `estatus_reserva` no tienen esa columna. |
| 2026-05-21 | Gap 6 — Código de reserva aleatorio + estado para el cliente | **5 sesiones.** `utils/codigoReserva.js`: generador de 7 chars alfanumérico sin ambigüedad (sin 0/O/1/l/I), verifica unicidad. `config/database.js`: columna `codigo TEXT` + índice único parcial en `reservas`, backfill idempotente. `routes/public.js`: `POST /api/public/reservations` asigna código en la transacción y lo devuelve; nuevo `GET /api/public/reserva/:codigo` público devuelve estado + flags + items. `routes/reservations.js`: `GET /api/reservations` incluye `r.codigo`. `menu.html`: pantalla de confirmación muestra código en grande con instrucción de screenshot; botón "Ver estado" → pantalla fullscreen con búsqueda por código y polling 30s; pill "📋 Consultar mi reserva" en header. `owner.html`: código visible bajo el nombre del cliente en tarjetas de reserva (`🔑 kDVvemB`). |
| 2026-05-22 | ARCH-002 completo — PWA instalable. `manifest.json` (nombre "RestApp", colores sistema), íconos 192×192 y 512×512, `sw.js` con cache de assets estáticos + fallback a red. Registrado en `owner.html` y `menu.html`. |
| 2026-05-22 | ISS-004 incidente 2 — Doble codificación en owner.html | `owner.html` tenía caracteres doble-codificados (UTF-8 leído como Windows-1252 y re-guardado como UTF-8). Fix: script Python que revierte la transformación caracter a caracter. 51 `ú` y 40 `ó` corregidas. Sin BOM. Archivo: 130KB → 119KB. |
| 2026-05-22 | ARCH-001 trozado en 10 pasos + pasos 1.2–1.8 completos. Pasos completados hoy: 1.2 (utils.js), 1.3 (config.js), 1.4 (usuarios.js), 1.5 (mesas.js), 1.6 (cocina.js + panel Cocina en owner.html + kitchen.html reemplazado), 1.7 (reservas.js), 1.8 (ordenes.js + badgePago). Paso 1.9 (reportes.js): archivo creado y `<script src>` en head ✅, falta eliminar bloque inline en owner.html (2 edits pendientes: 1.9b y 1.9c). Paso 1.10 (pedidos.js): pendiente. |
| 2026-05-23 | ISS-006 + ISS-007 resueltos. ISS-007: login.html redirige cocinero a owner.html; kitchen.html reemplazado con redirect; permiso `cocina` agregado a PERMISOS_DEF; guard owner.html extendido para rol cocinero (ve solo Cocina + Cola del día). ISS-006: GET /api/reservations devuelve flags intermedios; loadReservasActivas fetcha 5 estados activos; tarjetas con flujo completo: Confirmar → A cocina → Listo → Cliente llegó → Completar. |
| 2026-05-23 | ARCH-001 completo. 1.9b: eliminado MÓDULO 5 inline (descargarFormatoDemanda, loadDemanda, loadReportes, loadGanancias y helpers). 1.9c: eliminado análisis de pedidos inline (loadPedidosFiltros, setPedidosTipo, loadPedidos, descargarFormatoPedidos, sc, renderBarChart). 1.10a+1.10b: creado pedidos.js con loadColaDia, initPedidosPoll/stopPedidosPoll, cards con ítems, badge nav, integración detectNuevasOrdenes/Reservas. Panel "Cola del día" en owner.html (nav + panel HTML + PANELS/TITLES). CSS cola-card en owner.css. ARCH-001 ✅ completo. |
| 2026-05-23 | Gap 2 (Kanban Cola del día) — paso B: nuevo flag `es_entregado` en `estatus_orden`. Migración en `database.js` (columna + fila 'entregado' + backfill). `routes/orders.js`: SELECT incluye `es_entregado`, agregado a `VALID_ORDER_FLAGS`. `pedidos.js`: Listos = `es_listo` (botón "🍽 Entregar" → `es_entregado`); Por cobrar = `es_entregado` (botón "💰 Cobrar") + reservas `es_cliente_llego`. |
| 2026-05-23 | Gap 2 (Kanban Cola del día) — **COMPLETO**. `reservas.js`: botón "👤 Cliente llegó" renombrado a "🍽 Entregado" (semántica: cliente llegó + sentó + plato entregado en un solo paso). G2.5 pruebas manuales: 15/15 OK. G2.6 documentación actualizada: `features.md`, `status.md`, `vision_negocio.md`. |
| 2026-05-23 | ISS-009 resuelto — `api()` en `utils.js` redirige a `/login.html` ante 401. Aplica a todos los módulos. ISS-010 resuelto — orden de render en `cocina.js` cambiado a: En preparación → Reservas en prep → Pendientes. ISS-011 registrado como abierto (CSP eval + 27 no-label). |
| 2026-05-23 | ISS-008 resuelto — Reserva no aparecía en cola de cocina. Fix en `cocina.js`: `Promise.all` fetcha órdenes y reservas en paralelo; nueva sección "Reservas en preparación" con `renderCocinaReserva()` y `marcarReservaListaCocina()`; badge cuenta ambos tipos. |
| 2026-05-25 | ISS-011 resuelto — 27 "No label" en owner.html y menu.html: añadido `for="id"` a todos los `<label>` sin asociación; `aria-label` en inputs sin label. eval() de QRCode.js CDN: documentado en deploy.md con solución CSP via Helmet. Creado `deploy.md` con guía completa de producción: VPS, dominio, SSL, Nginx, PM2, backups, seguridad (Helmet, rate limiting), monitoreo, costos (~$8 USD/mes), checklist de launch. |
| 2026-05-25 | ISS-012 resuelto — Usuarios con permisos delegados recibían 403 al cambiar estatus de reservas/órdenes. Causa: 7 endpoints en `routes/reservations.js` y `routes/orders.js` usaban `authorize('owner','mozo')` (chequeo por rol) en lugar de `authorizePermiso()` (chequeo por rol o permisos). Fix: reemplazados los 7 `authorize(...)` por `authorizePermiso()`. Afectaba: PATCH /:id/estatus, PATCH /:id/mesa, PATCH /:id/confirmar-pago (reservas); PATCH /:id/estatus, PATCH /:id/confirmar-pago, GET /queue, PUT /combo/:id y PUT /:id (órdenes). |
| 2026-05-25 | Panel Admin — Estadísticas por restaurante. Nuevos endpoints en `routes/admin.js`: `GET /restaurantes/:id/reportes/resumen`, `/clientes-timeline?intervalo=`, `/ganancias/resumen`, `/ganancias/timeline?intervalo=`. Helpers `sumarGanancias`, `gananciasTimeline`, `clientesTimeline` exportados desde `routes/reportes.js` y re-usados desde admin. `app.js` actualizado con import por destructuring. `public/admin/dashboard.html`: CSS del drawer lateral (`.stats-drawer`, `.stats-drawer-backdrop`, tabs), HTML del panel con 3 tabs (Resumen/Demanda/Ganancias), botón 📊 Stats en tabla de restaurantes, JS completo (`abrirStatsDrawer`, `cerrarStatsDrawer`, `switchDrawerTab`, `cargarResumen`, `cargarDemanda`, `cargarGanancias`) con Chart.js. Sin tests adicionales (lógica en helpers ya testeados). |
| 2026-05-26 | Admin: descargas Excel por restaurante. 3 endpoints en `routes/admin.js` (`/resumen/export`, `/clientes-timeline/export`, `/ganancias/export`). Helper `EXCEL_STYLE` + `excelHeader()` reutilizables. Botones "⬇ Excel" en cada tab del drawer (Resumen/Demanda/Ganancias). Funciones JS `descargarResumenAdmin/DemandaAdmin/GananciasAdmin()`. Archivo con nombre del restaurante en el filename. Roadmap de features A1-C5 documentado en `features.md`. |
| 2026-05-26 | Cambio de contraseña propio — `PATCH /api/auth/me/password` en `routes/auth.js` (verifica contraseña actual con bcrypt antes de cambiar). Botón "🔑 Cambiar contraseña" en sidebar footer de `owner.html` (encima de Cerrar sesión). Modal con 3 campos: contraseña actual, nueva, confirmar. Validaciones client-side (coincidencia, mínimo 8 chars) + server-side. Aplica a owners, mozos y cocineros — cualquier usuario autenticado. |
| 2026-05-26 | ISS-012-admin resuelto — Admin: revenue S/0.00 en tabla + gráficas Demanda/Ganancias vacías. 3 bugs: (1) Chart.js no estaba incluido en `dashboard.html` → gráficas no renderizaban; (2) revenue en tabla usaba solo `orden_carta_items` (omitía menú del día y reservas) → inconsistente con `sumarGanancias()`; (3) mismo error en stats globales del Overview. Fix: `<script>` de Chart.js 4.4.0 agregado; revenue en `GET /restaurantes` y `GET /stats` ahora usa `SUM(ordenes.total) + SUM(reservas.total)`. |
| 2026-05-27 | ISS-002 resuelto — Botón "Ya pagué" deshabilitado en segunda transacción de la misma sesión. Causa raíz: `showPagoStep()` reseteaba `display:none` pero dejaba `btn.disabled=true` del pago anterior. Fix en `menu.html`: `btnPague.disabled = false` en `showPagoStep()` al limpiar el estado + `btn.disabled = false` explícito en las 3 ramas de `seleccionarMetodoPago()` (Yape, Plin, Efectivo) como defensa adicional. Aplica a todos los métodos de pago, no solo Plin. |
| 2026-05-27 | Hardening 9/10 — health endpoint, graceful shutdown, npm audit fix, multer iOS. `GET /health` (sin auth, devuelve uptime). Graceful shutdown: `SIGTERM`/`SIGINT` cierran server + BD antes de salir; fuerza `exit(1)` a los 10s. `npm audit fix`: 5 vulnerabilidades cerradas (ip-address, qs, tmp, ws); queda 1 moderate uuid/exceljs (downgrade breaking — aceptado). Multer fileFilter en 3 lugares (`routes/public.js`, `routes/menu.js` ×2): cambiado de lista blanca de extensiones/mimetypes a `file.mimetype.startsWith('image/')` — acepta HEIC/HEIF de iOS y Android modernos. Puntuación: 8.5 → 9/10. |
| 2026-05-26 | Revisión de producción + hardening. Auditoría completa del proyecto: puntuación 7.2/10 → 8.5/10 tras cerrar los gaps. **Cambios:** (1) `helmet` instalado y configurado en `app.js` con CSP completa (incluye CDN Chart.js, QRCode, Fonts). (2) Rate limiting global: `/api/auth/*` 20 req/15min; `/api/*` 300 req/min. (3) 4 índices de BD en `database.js`: `idx_ordenes_restaurante`, `idx_ordenes_fecha`, `idx_reservas_restaurante`, `idx_reservas_fecha`. (4) Bug crítico resuelto: `login.html` redirigía al mozo a `/waiter.html` (inexistente) — corregido a `/owner.html`. (5) Ruta `/waiter → waiter.html` eliminada de `app.js`. 197/197 tests pasan. |
| 2026-05-25 | Gap 10 — Cerrado por diseño. Descartables = ítem de carta configurable por el owner. No requiere feature dedicada. |
| 2026-05-25 | Gap 8 — Auto-merge cuenta por mesa. `auto_merge_activo INTEGER DEFAULT 1` en `restaurantes`. `PATCH /api/reservations/:id/estatus` llama `autoMergeReservaEnOrden()` al detectar flag `es_cliente_llego`. Copia `reserva_carta_items` y `reserva_menu_items` a `orden_carta_items` y `orden_menu_items`. Suma `cargo_modalidad` de la reserva a la orden. Solo actúa si hay orden activa (no pagada ni cancelada) en la misma mesa. `PATCH /api/menu/config/auto-merge` para configurarlo. Toggle en owner.html. 17 tests. |
| 2026-05-25 | Gap 5 — Precio por modalidad. Columnas `costo_tapper` y `tarifa_delivery` en `restaurantes`. Columna `cargo_modalidad` en `ordenes` y `reservas`. `POST /orders` y `POST /reservations` calculan y persisten el cargo según modalidad. `utils/totales.js` suma `cargo_modalidad` al total final. `menu.html`: desglose visual del cargo en tiempo real al cambiar radio de modalidad (drawer orden + resumen reserva). Panel Configuración del owner: inputs para configurar tapper y tarifa. 21 tests en `tests/precio-modalidad.test.js`, todos pasan. |
| 2026-05-25 | Gap 4 — Modalidades de pedido. Columna `modalidad` en `ordenes` y `reservas`. Columnas `para_llevar_activo`/`delivery_activo` en `restaurantes`. Validación backend: órdenes solo `en_local`/`para_llevar`; reservas admiten `delivery` si el restaurante lo tiene activo. Flujo de estados diferenciado: `para_llevar`/`delivery` saltan `es_entregado` (órdenes) y `es_cliente_llego` (reservas). Badges en Kanban y tarjetas. Selectores de modalidad en `menu.html` (radio buttons según URL con/sin `mesa`). Config en panel Configuración. 22 tests en `tests/modalidades.test.js`, todos pasan. |
| 2026-05-25 | Gap 3 — Auto-preparación de reservas + Web Push. Job en Node.js (setInterval 60s) detecta reservas confirmadas cuya `hora_llegada` entra en la ventana configurable (`minutos_preparacion`) y las mueve a `es_en_cocina`. Web Push API envía notificación al celular aunque la app esté cerrada. Tabla `push_subscriptions` en BD. `routes/push.js` (vapid-key, subscribe, unsubscribe). `utils/autoPreparacion.js`. `sw.js` maneja evento `push` + `notificationclick`. `config.js` + UI en owner.html para configurar minutos. 29 tests (17 auto-preparacion + 12 push-routes). |
| 2026-05-23 | ARCH-003 completo — Mobile CSS audit en owner.html. 3.1: `.btn`, `.btn-sm`, `.btn-danger/success/warn`, `.btn-logout` → `min-height:44px`. 3.2: `.nav-item`, `.tab`, `.hamburger` → `min-height/width:44px`. 3.3: todos los inputs/selects/textareas a 16px (CSS global + 8 inline en HTML + 2 en templates JS + pago-yape/plin tel). 3.4: `.card-title`, `.tab`, `.nav-item`, `.btn-sm`, `.btn-danger/success/warn`, `.order-meta`, `.order-items`, `.empty-text`, `.loading-text` → 14px. 3.5: 5 botones pill inline en menú (`font-size:10px;padding:1px`) → `font-size:14px;min-height:44px;display:inline-flex;align-items:center`. 3.6: `type="text"` agregado a 8 inputs sin tipo. ARCH-003 ✅ completo. |
| 2026-05-21 | REFACTOR-001 completo — estatus dinámicos con flags semánticos | **10 sesiones.** Elimina todos los hardcodes de nombres de estatus del sistema. Ahora el admin puede renombrar cualquier estatus y todo sigue funcionando. **BD:** columnas `es_inicial, es_pagado, es_cancelado, es_en_cocina, es_listo` en `estatus_orden`; `es_inicial, es_confirmada, es_cancelado, es_en_cocina, es_listo, es_cliente_llego, es_full` en `estatus_reserva`. **Backend:** `routes/orders.js` — `/activas` retorna flags; `PATCH /:id/estatus` acepta `{ flag }` además de `{ estatus }`; `GET /queue` usa flags; `PUT /:id` (cocina) usa `KITCHEN_FLAG_MAP` por flags. `routes/reservations.js` — `GET /` retorna flags, acepta `?flag=`; `PATCH /:id/estatus` acepta `{ flag }`. `routes/admin.js` — revenue queries usan `es_pagado=1`. `routes/reportes.js` — filtros cancelados usan `es_cancelado=0`. `routes/mesas.js`, `routes/public.js` — todos los filtros por flag. **Frontend `owner.html`:** `renderOrdenCard` y `renderReservaCard` usan flags para botones de acción; nuevas funciones `cambiarEstatusOrdenFlag()` y `cambiarEstatusReservaFlag()`; `loadReservasActivas` usa `?flag=`; `detectNuevasOrdenes/Reservas` y revenue calc usan flags. Eliminadas `confirmarPago()` y `confirmarPagoReserva()` (dead code). **Eliminados:** `utils/orderStatus.js` y `tests/order-status.test.js` (ya obsoletos). |
| 2026-05-18 | hora_llegada en reservas + asignación de mesa | Migración `hora_llegada TEXT DEFAULT NULL` en `reservas`. `routes/reservations.js`: campo en GET/POST + nuevo endpoint `PATCH /:id/mesa` (owner/mozo). `routes/public.js`: `hora_llegada` en POST /reservations. `routes/mesas.js`: función `esInminente()` filtra reservas confirmadas de hoy por ventana [-30min, +120min]. `menu.html`: input `<input type="time">` opcional en formulario de reserva. `owner.html`: muestra hora en tarjetas de reserva; selector de mesa inline para asignar desde el plano. Tests: `tests/hora-llegada.test.js` (18 casos), todos pasan. Suite completa: 127/127. |
