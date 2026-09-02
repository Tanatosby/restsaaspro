# Features — Menú Pro

## Cobrar desde "Listos" + buscador en "Por cobrar" ✅ Completado 2026-09-02 · ISS-085
*Día 15 del piloto: la dueña acumulaba ~39 pedidos en "Por cobrar" sin cerrarlos — verifica el
Yape en "Listos" pero deja el cobro "para cuando el cliente se va", y en hora pico nunca llega.*

**Qué hace:**
- **"✅ Ya pagó" en la zona "Listos"** de la Cola del día, para órdenes con `metodo_pago` Yape o
  Plin — un toque cierra el pago (reusa `cobrarColaOrden()` de ISS-072: `confirmar-pago` +
  `es_pagado`) sin que el pedido tenga que pasar por "Por cobrar". Efectivo NO lo muestra: sigue
  por "Por cobrar", que necesita a la dueña presente para el vuelto. En **reservas** solo aparece
  sin mesa (para llevar/delivery) — con mesa, saltar `es_cliente_llego` se saltaría
  `autoMergeReservaEnOrden()`.
- **Buscador en "Por cobrar"** (`#cobrar-buscador`, solo visible en esa pestaña) — filtra la
  lista por número de mesa, "mesa N", nombre del cliente o `#orden`, sin tocar el servidor. El
  badge de la pestaña sigue mostrando el total real de la cola.

**ARCH:** `pedidos.js` — `btnOrden()`/`btnReserva()` (zona `listos`), `filtrarColaCobrar()` +
`coincideFiltroCobrar()` nuevas, `renderColaDesdeCache()` filtra los ítems de `cobrar`,
`renderZona()` mete el filtro en la firma anti-parpadeo (ISS-067) y usa un empty-state propio,
`switchZona()` togglea el buscador. `owner.html` — `<div class="field" id="cobrar-buscador">`.
Sin backend (el salto `es_listo → es_pagado`/`es_full` ya lo permitían `routes/orders.js` /
`routes/reservations.js`).

**Verificación:** `scripts/test-ya-pago-foto-buscador.js` (nuevo, Playwright, 25 checks — partes
A y B). `scripts/test-cobrar-homologado.js` 14/14, `test-menus-agrupados.js` 26/26,
`test-numero-dia-pedido.js` 10/10 sin regresiones. 478/478 jest.

---

## Tocar la foto del menú suma 1 + botón "🔤 Aumentar letra" ✅ Completado 2026-09-02 · ISS-084
*Día 15 del piloto: los comensales tocan la foto del menú esperando que agregue (no hacía nada);
y la "A" del botón de tamaño de letra no se entendía.*

**Qué hace:**
- En **"Pedir"** (flujo de cantidad primero, ISS-080), tocar la foto del menú **suma 1** —
  igual que el botón `+` (`agregarMenuDesdeFoto()` → `cambiarCantidadMenuPedir(+1)`), con un
  "+1" flotante. El zoom de la foto pasa a un botón `🔍`. El primer `+1` (sin nada configurado
  aún) hace latir el botón "Elegir opciones (n)". **No abre el picker** — eso reacoplaría lo que
  ISS-080 separó, y ISS-080 aún no está validado en servicio real. Rama "Reservar" sin cambios.
- El botón de tamaño de letra de `menu.html` ahora dice **"🔤 Aumentar letra"**, y **"🔤 Volver a
  normal"** en el nivel máximo (antes era una `A` muda que solo crecía).

**ARCH:** `menu.html` — `renderMenuDiaCard()` rama `'pedir'`, `agregarMenuDesdeFoto()` +
`mostrarMasUnoMenu()` nuevas (el "+1" es `position:fixed` porque `renderPedirContent()` destruye
la card), `pintarBotonFontScale()`. `menu.css` — `.btn-font-scale` pasa a pill de ancho auto
(alto mín. 44); `.menu-dia-photo--add`, `.menu-dia-zoom`, `.menu-dia-add-hint`,
`.menu-dia-plusone`, `.btn-add-menu--pulse` nuevas, todas con bloque `prefers-reduced-motion`.
Sin backend; el versionado por hash (T0) recoge los 2 archivos.

**Verificación:** `scripts/test-ya-pago-foto-buscador.js` (25 checks — partes C y D). 478/478
jest. `test-pedir-cantidad-primero.js` no corre en la BD local (sin menú del día "usable" para
hoy) — cubierto por el test nuevo.

---

## Reducción de fotos en el cliente ✅ Completado 2026-08-31 · ISS-083
*El piloto reportó que subir fotos "cuelga" o "no deja" en celulares de gama baja — primero
las fotos de plato, después la del comprobante Yape/Plin.*

Ningún camino de subida reducía la imagen en el navegador. Una foto de cámara de ~12 MP ocupa
**~48 MB** al descomprimir en RAM: decodificarla para recortarla o previsualizarla congela la
pestaña o la mata. La portada del restaurante y el comprobante además se subían **crudos** (la
portada chocaba con el límite de 2 MB del servidor; el comprobante se pasaba del timeout).

**Qué hace:** nueva utilidad global `window.downscaleImage(file, { maxDim, quality })` —
`createImageBitmap` con opciones de resize (decodifica ya reducido, sin explotar la RAM), con
fallback a `<canvas>` y a `<img>`+canvas para navegadores viejos. Devuelve un `File` JPEG de
máx. 1600 px; ante cualquier error, GIF, o imagen ya chica, devuelve el original — nunca bloquea
la subida. Integrada en los 3 flujos: recortador de platos (`PhotoEditor`, con estado
"Procesando foto…"), comprobante en `menu.html` (preview con `createObjectURL`, no
`readAsDataURL`) y portada en Configuración. Límite de `multer` subido a 8 MB en los 3 endpoints
como red de seguridad para cuando la reducción falla en un navegador antiguo.

**ARCH:** `public/js/widgets/image-downscale.js` (nuevo, 6º widget — es una utilidad, no un
componente con DOM), `public/js/widgets/photo-editor.js`, `public/menu.html`,
`public/js/modules/config.js`, `routes/menu.js` (×2), `routes/public.js`, `public/sw.js`
(precache), `public/owner.html` + `public/menu.html` (`<script>`).

**Verificación:** `scripts/test-fotos-downscale.js` (nuevo, Playwright, 14 checks) + 478/478 jest
(36 suites), sin regresiones por el cambio de límite.

---

## Cambio de nombre del restaurante ✅ Completado 2026-08-26
*Pedido directo de la dueña el mismo día — quiso renombrar su restaurante y no había forma.*

Hasta hoy el nombre se fijaba una sola vez al crear el restaurante (alta desde el admin) y no
se podía editar desde ningún lado.

**Qué hace:** la dueña puede cambiar el nombre ella misma desde Configuración (self-service,
`PATCH /api/menu/config/nombre`); también se puede editar desde el dashboard admin
(`PATCH /api/admin/restaurantes/:id/nombre`, botón "✏️ Editar" por fila) para los casos en que
el usuario necesite corregirlo directamente. Ambos validan 2–60 caracteres, con trim.

**ARCH:** `routes/menu.js`, `routes/admin.js`, `public/owner.html` + `config.js` (card "Nombre
del restaurante", refresca el sidebar al guardar), `public/admin/dashboard.html` (modal nuevo,
mismo patrón visual que "Reset contraseña").

**Verificación:** `tests/nombre-restaurante.test.js` (nuevo, 11 casos) + 35/35 test suites,
469/469 tests.

---

## Pensionistas — Fase 2: `pensionista.html` ✅ Completado 2026-08-19
*Ver `pensionistas.md` §9. Backend y panel del owner (Fase 1) ya existían — esta fase construye
la pantalla que le faltaba al propio pensionista.*

Pantalla mobile-first propia (no un modo dentro de `menu.html` — decisión cerrada en
`pensionistas.md` §0) donde el pensionista pide con su saldo, sin pasar por Yape/Plin/Efectivo.

**Qué hace:** saldo siempre visible arriba (con aviso ámbar automático bajo el umbral del
restaurante) · menú del día + carta, mismo componente que `menu.html` (`MenuModal`, secciones
obligatorias, validación condicional ISS-046) · confirmar descuenta del saldo en el mismo paso,
**sin pantalla de pago** · bloqueo con mensaje claro si el saldo no alcanza · pestaña "Mis
pedidos" con estado en vivo (pendiente → en cocina → listo → entregado) y cancelar mientras no
esté listo (devuelve saldo y stock) · pantalla de bloqueo si el owner dio de baja la cuenta.

**Decisiones cerradas sobre el mockup** (<https://claude.ai/code/artifact/10d9848f-0a00-4ff6-a5f6-44aa50452038>):
- El toggle "Aquí / Para llevar" es **a nivel de todo el pedido**, no por ítem como en ISS-047 —
  `pedidos_pensionista.modalidad` es una sola columna, no hay tabla de líneas que la lleve
  separada. A diferencia de `menu.html`, el pedido de pensionista **no cobra tapper** (el backend
  de `POST /api/pensionista/pedido` nunca calculó ese cargo).
- Sin campo "Tu nombre" en el carrito: el pensionista ya está logueado.
- "Cancelar" no tiene ventana de tiempo (a diferencia de las reservas, 30 min antes de la hora de
  llegada) — el pedido de pensionista no depende de una hora que la justifique. Se puede cancelar
  mientras no esté listo/entregado/cancelado.

**ARCH:** `public/pensionista.html` (página propia, mismo patrón que `menu.html`: script inline,
sin depender de `public/js/modules/`) + `public/css/pensionista.css` (nuevo, capa sobre los
tokens y componentes de `menu.css` — header, `card-carousel`, `drawer`, `confirm-screen`,
`mod-seg` se reusan tal cual). Reusa `GET /api/public/menu` y `GET /api/public/carta` (los mismos
que `menu.html`) en vez de endpoints nuevos, pasando el `id_restaurante` que ya viene en
`GET /api/pensionista/me`. Sumado a `PLANTILLAS`/`RUTAS` (`app.js`, `utils/buildVersion.js`) y al
precache del SW — sin esto, el archivo no habría recibido el `?v=<BUILD>` de cache-busting y
habría quedado expuesto al mismo bug de fondo que motivó ISS-044.

**Verificación:** `scripts/test-pensionista-cliente.js` nuevo — **29/29** (flujo feliz completo:
pedir, confirmar sin pago, ver en "Mis pedidos", cancelar y que el saldo se devuelva; saldo
insuficiente bloquea con mensaje claro; cuenta dada de baja muestra la pantalla de bloqueo; sin
sesión redirige a login; sin overflow a 360px; touch targets ≥44px) + 449/449 jest +
`test-panel-pensionistas` 30/30 y `test-modalidad-mixta` 19/19 sin regresiones.

---

## Pensionistas — Fase 1: panel del owner ✅ Completado 2026-08-19
*Ver `pensionistas.md` §6.*

El backend del módulo estaba **entero y montado desde el 2026-08-11** (12 endpoints con 3
archivos de tests), pero no tenía **ni una sola pantalla**: `owner.html` no mencionaba la
palabra "pensionista", no existía `pensionista.html` y no había módulo JS. Esta fase construye
el lado del owner sobre esa API, sin tocarla.

**Dónde:** Ajustes → **Pensionistas** (tarjeta nueva en el hub, junto a Usuarios).

**Qué hace:** alta con saldo inicial · recarga con nota · historial de movimientos desplegable
dentro de la card · editar datos · cambiar contraseña · baja lógica reversible.

**ARCH:** `public/js/modules/pensionistas.js` + panel en `owner.html` + CSS en `owner.css`.
Reusa `FormModal` para recargar/editar/contraseña. Se listan como **cards y no como tabla**
(a diferencia de `usuarios.js`): el saldo es el dato que la dueña mira de reojo y en 360px una
tabla lo esconde detrás de scroll horizontal. Arriba de la lista aparece un aviso ámbar
—«N pensionistas están por quedarse sin saldo»— y los que están por debajo del umbral llevan el
saldo en naranja.

**Permisos:** el panel es **solo del owner**. Los usuarios delegados no lo ven (mismo criterio
que Usuarios) porque mueve dinero: altas y recargas de saldo. Si hace falta delegarlo, el camino
es un permiso granular nuevo, no abrirlo.

**Dos cosas que faltaban para que esto funcionara:**
- `login.html:420` no tenía `pensionista` en `ROLE_REDIRECT`: un pensionista que iniciaba sesión
  **iba a `undefined`**. Ahora va a `/pensionista.html`.
- `GET /api/menu/restaurante/config` no devolvía `pensionista_saldo_aviso`, así que el panel no
  podía saber a partir de qué saldo avisar. Se agregó al response.

**Verificación:** `scripts/test-panel-pensionistas.js` — **30/30**, el ciclo completo que va a
usar la dueña (crear, recargar, ver movimientos, editar, dar de baja, reactivar) más las
validaciones de alta, el redirect del login, ausencia de overflow a 360px y touch targets ≥44px.
449/449 jest y los E2E de `owner.html` sin regresiones. Panel revisado por captura.

**Un bug que encontró el test:** `.pen-movs` definía `display:flex`, que **pisa** el
`display:none` que el navegador aplica a `[hidden]` — cerrar el historial no lo ocultaba. Se
resolvió con una regla `[hidden]` explícita.

## ~~Un menú para llevar y otro para comer acá~~ ✅ Completado 2026-08-19
*Ver [ISS-047](issues/ISS-047-modalidad-por-menu.md).*

Día 5 del piloto: alguien pidió 2 menús, uno para llevar y otro para comer en el local. **No se
podía separar** — `modalidad` era una columna del pedido, una sola.

**ARCH:** la modalidad baja a las líneas. Cada instancia de menú comparte la de su `grupo`
(la columna que dejó ISS-041) y cada plato de carta lleva la suya; `ordenes.modalidad` se
conserva como **resumen derivado** (`en_local` | `para_llevar` | `mixto` | `delivery`), así que
todo lo que hoy lo lee —cocina, `colaDia.js`, `pedidos.js`— sigue andando sin tocarse. Lógica
compartida en `utils/modalidadPedido.js`. **Se mezcla comer aquí / para llevar**; el delivery
queda del pedido entero porque es un solo viaje.

**Comensal** (variante A2, elegida sobre mockup): arriba del carrito, «🪑 Todo aquí / 🥡 Todo
para llevar» — un tap marca todos los menús, que es el caso común. Cada ítem lleva además un
chip para el caso mixto. El toggle también **refleja** el estado: si están mezclados no queda
ninguno marcado y aparece «Mezclado — 1 de 2 para llevar». Nunca hay nada sin marcar: el
default de cada línea es «comer aquí».

**Cocina y Cola del día** (variante B2): el badge grande de ISS-042 ahora dice *cuántos*
(«🥡 1 de 2 para llevar») y cada menú lleva un badge chico que dice *cuál*. Se descartó partir
el ticket en bloques por modalidad: se ve mejor, pero reordenar el ticket dos semanas después
de que ISS-041 enseñó a leer «Menú 1 / Menú 2» tiene un costo real en una cocina que está
aprendiendo el sistema en pleno servicio.

**Arregla un cobro de más que existía hoy:** el envase se cobraba por el pedido entero, así que
1 menú para llevar + 1 para comer ahí cobraba **2 tappers en vez de 1**. Ahora se cobra por
unidad realmente llevada.

**Dos huecos de seguridad cerrados de paso:** con la modalidad en las líneas, el whitelist del
resumen dejó de alcanzar — un cliente manipulado podía mandar líneas `para_llevar` a un
restaurante que no lo ofrece. Se valida sobre las líneas normalizadas; **las órdenes nunca
habían validado `para_llevar_activo`**.

**Verificación:** `tests/modalidad-por-menu.test.js` 19/19 + `scripts/test-modalidad-mixta.js`
19/19 punta a punta (carrito, los 3 estados del toggle, lo guardado en BD incluido el cargo, y
el ticket de cocina) + **449/449 jest**, con `test-grupo-punta-a-punta` 13/13 y
`test-menu-wizard` 51/51 sin regresiones.

## ~~Fix conteo de menús + tarjeta "Menús de hoy"~~ ✅ Completado 2026-08-18

Segundo pendiente del día 4 del piloto #1 (2026-08-17, ver `backlog.md`): "Menús pedidos"/"Menús
reservados" en Análisis (Reportes) subcontaban.

**El bug:** el conteo vivía en `public/js/modules/reportes.js`, dividiendo `filas / total de
secciones del menú` (`/api/menu/menus-dia` trae obligatorias **y** opcionales). Un menú con
secciones opcionales sin pedir por el cliente subcontaba — el divisor correcto es solo las
**obligatorias**. Esa lógica ya existía y estaba probada: `contarUnidadesMenu()`
(`utils/menuPricing.js`), que ya usan `calcularTotalOrden`/`calcularTotalReserva` para cobrar
bien, pero nunca se reusaba para este conteo.

**El fix:** el cálculo se movió al backend. `GET /api/reportes/kpis` arma las filas de
`menu_items` (mismo JOIN que `utils/totales.js`, con `requerido` + `total_obligatorias`) y llama
`contarUnidadesMenu()` directamente. Como `total_obligatorias` es constante por `id_menu_dia`,
sumar las filas de **todas** las órdenes/reservas del restaurante antes de dividir da el mismo
resultado que sumar los conteos de cada una por separado — un solo cálculo agregado por SQL, sin
iterar orden por orden. `reportes.js` (frontend) ya no pide `/api/menu/menus-dia` para esto.

**Tarjeta nueva "Menús de hoy":** primera en la grilla de Análisis (junto a "Menús
pedidos"/"Menús reservados"). Suma órdenes + reservas de **hoy** que ya están cobradas o
entregadas (`es_pagado`/`es_entregado` en órdenes, `es_full`/`es_cliente_llego` en reservas —
mismo criterio que la zona "Por cobrar" de la Cola del día).

**Verificación:** `tests/menu-pricing.test.js` sumó 8 tests para `contarUnidadesMenu()` (no
tenía tests directos); `scripts/test-menus-vendidos.js` nuevo, 9/9 — reproduce el bug real (menú
con 2 obligatorias + 1 opcional sin pedir) y confirma que el conteo nuevo da el número correcto
donde la fórmula vieja subcontaba. 430/430 jest sin regresiones.

## ~~Botón "Agregar manual" en la Cola del día~~ ✅ Completado 2026-08-18

Pedido pendiente del día 4 del piloto #1 (2026-08-17, ver `backlog.md`): ese día **4 comensales
no pudieron usar la app** (2 se rehusaron, 1 sin internet, 1 sin celular) y la dueña no tenía
forma de anotar su pedido en el sistema — se quedaba fuera de cocina y de las métricas.

**Dónde:** Cola del día → botón **"+ Agregar manual"** junto a "↻ Actualizar".

**ARCH:** Modal en `owner.html` + lógica en `public/js/modules/pedidos.js`. Reutiliza
`GET /api/mesas/estado` (mesa) y `GET /api/menu/menus-dia` (misma fuente que `menu-wizard.js`)
para el selector de menú(s) del día por sección, con stepper de cantidad. Reutiliza
`POST /api/orders/` (`routes/orders.js`) — ya existía autenticado, ya hacía
`validarSeccionesMenu()` (ISS-046) y `descontarStock()`, y ningún frontend lo llamaba todavía; se
le agregó un solo parámetro (`manual: true`).

**Diseño de pago — decisión del usuario:** el pedido entra **directo a "En cocina"** (sin el tap
extra de "→ Preparando"). `metodo_pago = 'efectivo'` solo si el restaurante tiene
`efectivo_activo=1` en Configuración; si no, queda `NULL` — el cobro se comporta igual en ambos
casos (ni efectivo ni `NULL` piden confirmación previa, a diferencia de yape/plin), pero nunca se
etiqueta el pedido con un método que el restaurante dice no aceptar. `estado_pago` queda `NULL`
siempre, para no mostrar el badge "Pendiente confirmación" (pensado para comprobantes de
yape/plin) — sería falso para un cobro en mano. En su lugar, columna nueva `es_manual` en
`ordenes` pinta un badge propio y siempre visible: **"🧾 Pedido manual · Confirmar pago al
cobrar"** (`badgeManual()` en `ordenes.js`, usado también en `pedidos.js`) — deja claro que ese
paso sigue pendiente sin bloquear el flujo de cobro normal.

**Verificación:** `scripts/test-agregar-manual.js` nuevo, 19/19 — cubre ambas ramas de
`efectivo_activo` (con y sin), que el pedido entra directo a cocina, que nunca aparece un badge
"💵 Efectivo" contradictorio, y que la sección obligatoria del menú sigue bloqueando el envío si
falta elegirla. 423/423 jest sin regresiones (`tests/cola-dia.test.js` sumó `es_manual` a su
schema in-memory).

**Actualizado 2026-08-19 — con fotos + carta ([`ISS-053`](issues/ISS-053-agregar-manual-con-fotos.md)):**
el `<select>` de texto plano por sección se reemplazó por un chip que abre `PlatoPicker` (grid de
fotos ya existente, reusado de Configuración) y se sumó una sección "Carta" con el mismo patrón
card+stepper — `POST /api/orders` ya aceptaba `carta_items`, cero cambios de backend. 28/28.

## ~~Descargar el menú del día como foto~~ ✅ Completado 2026-08-17

Pedido de la dueña el día 4 del piloto #1 (2026-08-17). Ese día **4 comensales no pudieron usar la
app**: 2 se rehusaron, 1 no tenía internet y 1 no tenía celular. El link del menú no les sirve a
ellos; una foto sí — se ve sin abrir nada, se reenvía sola por WhatsApp y no gasta datos. Es
**complementaria** al link y al QR, no los reemplaza.

**Dónde:** Configuración de menús → card de cada menú → **«⬇ Descargar menú»**, entre «Copiar a otro
día» y «Eliminar».

**ARCH:** `public/js/widgets/menu-export.js` — widget autocontenido que compone un canvas en el
propio celular y lo baja como JPEG (`menu-<fecha>.jpg`). **Sin backend, sin endpoints nuevos, sin
migraciones y sin dependencias:** los datos del menú y las URLs de las fotos ya están en memoria
porque la galería los está dibujando. Solo pide `GET /api/menu/restaurante/config` (cacheado) para
el nombre, el color y el slug.

**El diseño** (variante B+C, elegida sobre mockup renderizado con el CSS real):

- Banda superior con el nombre del restaurante y la fecha, en el color del restaurante.
- Portada del menú a lo ancho con scrim, y encima el nombre y el precio. La portada es la que el
  owner ya eligió con «📷 Portada»; reusa la lógica de `portadaUrl()` de `menu-wizard.js`.
- Una sección por bloque, con la foto de cada plato. **La grilla se adapta a cuántos platos hay:**
  1-3 ocupan la fila entera (1 plato va centrado, con tope de 600px), 4 se parten 2+2, de 5 en
  adelante van de a 3. Una grilla fija de 3 dejaba un hueco muerto que solo se vio al mirar la
  imagen generada — los tests de medidas no lo detectaban.
- Las secciones opcionales llevan «OPCIONAL» al costado; los platos agotados van en gris, tachados
  y con chip «Agotado».
- Pie con «Reserva ahora» + el link del menú, para que quien reciba la foto pueda entrar.

**Degradación:** si ningún plato tiene foto de portada, el hero se apaga y queda el nombre y el
precio sobre el fondo — o sea, la variante «solo texto», sin código aparte. Un plato suelto sin foto
cae en el watermark 🍽️, igual que hace hoy la card del panel. El ancho es siempre 1080px; **el alto
es dinámico** según cuántos platos hay.

**Detalles mobile:** `roundRect()` de canvas no existe en WebViews viejos de Android, así que los
redondeados van a mano; `ctx.letterSpacing` se ignora solo si no está. Mientras compone, el botón
dice «Generando…» y queda deshabilitado para que nadie lo toque dos veces.

**Verificación:** `scripts/test-menu-export.js` (25/25) — medidas del lienzo, color de la banda
tomado por píxel, alto dinámico contra la fórmula del diseño para secciones de 1 a 7 platos, la
descarga real con su nombre de archivo, el aviso cuando el menú no tiene platos, y 0 errores de
consola. Además se revisó **la imagen generada a ojo**, que es lo que destapó el bug de la grilla.
423/423 jest y 51/51 de `test-menu-wizard.js` sin regresiones.

## ~~Descargar la carta (à la carta) como foto~~ ✅ Completado 2026-08-27

Pedido real de la dueña del piloto #1, día 13 (2026-08-27) — ya empezó a usar "Carta" de verdad y
quiso el mismo botón que ya tiene "Descargar menú", pero para los platos a la carta, con el precio
de cada uno (la carta no tiene un precio único como el menú del día).

**Dónde:** Carta → Platos a la carta → **«⬇ Descargar carta»**, junto a «＋ Crear plato».

**ARCH:** `public/js/widgets/carta-export.js` — hermano autocontenido de `menu-export.js`, mismo
mecanismo (canvas compuesto en el celular → JPEG, `carta.jpg`). Sin backend nuevo: reusa
`GET /api/menu/platos-carta` (ya existía) y `GET /api/menu/restaurante/config` (mismo caché que
`MenuExport`). Los platos ocultos (`activo = 0`) no entran, igual criterio que la vista pública.

**El diseño:** banda superior con el nombre del restaurante + "CARTA", título "Nuestra carta", y
cada categoría en una fila de cards (foto + nombre + precio) — misma grilla adaptable de
`MenuExport` (1-3 platos ocupan la fila entera, 4 se parten 2+2, de 5 en adelante van de a 3), pero
cada card suma su propia línea de precio, que el menú del día no necesita.

**Decisión de alcance, tomada con el usuario:** por ahora **solo imagen única**, sin PDF ni
paginado. La carta real de la dueña tiene 3 categorías y 10 platos — de sobra para una sola foto.
Se decidió no sumar una librería de PDF (primera dependencia de ese tipo en el proyecto) para un
caso que todavía no existe; si alguna carta real resulta demasiado larga para una imagen, se revisa
con ese caso concreto en mano.

**Verificación:** `scripts/test-carta-export.js` nuevo, 16/16 — botón presente y con touch target
≥44px, medidas del lienzo contra la fórmula del diseño, color de la banda por píxel, descarga real
como `carta.jpg`, sin overflow horizontal, 0 errores de consola. 469/469 jest sin regresiones.

**Hallazgo colateral, corregido de paso:** `scripts/test-menu-export.js` estaba roto desde
ISS-076 (25/08) — el modal "Qué hay de nuevo" tapa los botones en un navegador de test nuevo
(sin nada en `localStorage`) y nadie lo había vuelto a correr desde entonces. Se agregó el mismo
cierre del modal que ya lleva el test nuevo; vuelve a dar 25/25.

## ~~Pedir: cantidad primero, configurar después~~ ✅ Completado 2026-08-27

Rediseño completo del flujo de "Pedir" en `menu.html` (Reservar no cambió). Resuelve 3 hallazgos
del Día 12 del piloto — stock a mitad de pedido obligaba a rehacer todo, no se podía editar un
menú puntual, carrito poco descubrible — más 2 problemas de flujo encontrados al probar un
prototipo interactivo el día 13, antes de aprobar el diseño final.

**Antes:** tocar la card de un menú abría el picker directo, de a una unidad. Sin cantidad previa,
sin editar una unidad ya agregada (solo borrar la fila entera), sin freno si el carrito quedaba
con algo a medio pedir.

**Ahora:**
- **Cantidad primero:** stepper en la card del menú (igual al que ya tenía la carta) — elegir
  cuántos no abre nada todavía.
- **Configurar después:** botón "Elegir opciones (N)" arranca el picker, que encadena solo unidad
  tras unidad ("1/2", "2/2"…) y, si se pidieron 2+ tipos de menú, sigue directo con el próximo
  pendiente al terminar uno — sin volver a la lista entre medio.
- **El carrito nunca se abre incompleto:** si queda algún menú con cantidad marcada sin
  configurar, tocar el carrito arranca el wizard ahí primero.
- **"✏️ Editar" por unidad del carrito:** reabre el picker con la selección real de esa unidad
  puntual y la reemplaza al guardar — sin tocar las demás ni perder nada del resto del pedido.
- Cada unidad de menú es su propia fila en el carrito (antes se agrupaban las idénticas con un
  stepper — decisión tomada con el usuario: con el flujo nuevo cada una ya pasó por su propio
  picker, tiene sentido que se edite por separado).

**ARCH:** `renderMenuDiaCard()` bifurca por modo (Pedir cambia, Reservar intacto).
`elegirOpcionesPedir()`/`continuarWizardPedir()`/`abrirCarritoPedir()` nuevas en `menu.html`.
`validarSeleccionMenu()`/`armarItemMenu()` extraídas de `agregarMenu()` para compartir la misma
validación (ISS-046/ISS-066) entre agregar y editar. `menu-modal.js` extendido con `posicion`/
`total`/`onAdded`/`onSave` opcionales — sin ellas se comporta exactamente igual que siempre, así
Reservar queda intacto. El atajo "+1 mismo menú" (ISS-064) se retiró solo para Pedir (ya no hace
falta con la cantidad decidida antes); sigue existiendo para Reservar.

**Proceso:** antes de tocar código real, se armó un prototipo interactivo (JS puro, sin backend)
publicado como artifact — el usuario lo probó, encontró 2 problemas de flujo reales (un bug del
contador de stock, y el freno del carrito con pendientes) y solo tras 4 iteraciones sobre el
prototipo aprobó migrar el diseño a `menu.html`.

**Verificación:** `scripts/test-pedir-cantidad-primero.js` nuevo, 24/24. `test-repetir-menu.js`
recortado a solo Reservar (el atajo de Pedir que probaba ya no existe), 11/11. Sin regresiones en
`test-modalidad-mixta.js`, `test-pago-mixto.js`, `test-iss048-volver-pago.js`,
`test-iss049-recuperar-pago.js`, `test-gate-pago.js`, `test-comprobante-duplicado.js`,
`test-numero-dia-pedido.js`, `test-pensionista-cliente.js`. 469/469 jest.

## ~~Pago en un solo paso + banner + encuesta de producto~~ ✅ Completado 2026-08-28

Día 14 del piloto: 3 pedidos tras probar ISS-080 en producción, validados primero con el mismo
prototipo interactivo del día anterior.

- **Letra del picker más grande** (`.mm-progreso`, 13px → 15.5px).
- **Se eliminó "Revisa tu pedido":** la garantía de Gap 17 (nunca crear sin método + comprobante
  resueltos) se conserva — solo se acortó de 2 pantallas a 1. `#pago-screen` ahora también
  muestra el resumen del pedido, y "📎 Foto del comprobante" subió a 14.5px (estaba por debajo
  del mínimo mobile-first de 14px). `enviarPago()` hace directo lo que antes hacía "Confirmar" en
  el repaso.
- **Aviso temporal** (3 días, 1 vez por celular vía localStorage) explicando el cambio del flujo
  de Pedir a los comensales.
- **Encuesta de producto** al terminar un pedido: 2 preguntas con botones (nunca texto libre
  obligatorio) + comentario opcional. Solo dura los mismos 3 días.

**ARCH:** tabla nueva `feedback_producto` (con `tipo`, reusable para futuras encuestas sin
migrar de nuevo), `POST /api/public/feedback` (sin sesión) y `GET /api/admin/feedback` (rol
admin). Panel nuevo "Feedback de producto" en `public/admin/dashboard.html` — **la dueña nunca
ve esto**, es feedback de producto para decidir si un cambio funcionó, no información operativa
del restaurante.

**Verificación:** `scripts/test-gate-pago.js` reescrito para 1 sola pantalla (21/21).
`scripts/test-feedback-flujo.js` nuevo (16/16). Ajustados sin cambiar el fondo:
`test-iss049-recuperar-pago.js`, `test-comprobante-duplicado.js`, `test-numero-dia-pedido.js`,
`test-monto-pago-visible.js`. Sin cambios necesarios en 7 scripts más. 469/469 jest.

## ~~Un deploy ya no puede dejar el panel vacío~~ ✅ Completado 2026-08-16
*Ver [ISS-044](issues/ISS-044-panel-vacio-tras-deploy.md) y **T11** del backlog, que compartían causa.*

Los assets no tenían **ninguna** estrategia de versión: `owner.html` pedía siempre
`/js/modules/utils.js`, sin nada que distinguiera una versión de otra. Un deploy podía dejar un
`utils.js` viejo junto a un `cocina.js` nuevo, el módulo nuevo llamaba a una función que el viejo no
tenía, y **el panel aparecía vacío con los datos intactos** — que el owner lee como "se borraron mis
platos". Pasó en producción el 2026-08-16.

**ARCH:** `utils/buildVersion.js` exporta `BUILD`. Los HTML y el `sw.js` guardan `__BUILD__` en disco
y `app.js` lo reemplaza al servirlos (middleware antes de `express.static`, con fallback a servir el
archivo tal cual si algo falla). Cada asset se pide como `?v=BUILD`, así que **todas las URLs cambian
juntas** y la mezcla de versiones deja de ser posible. Al principio `BUILD` era un número escrito a
mano por deploy; desde **T0 (2026-08-17)** es un hash sha1 automático del contenido de los assets,
calculado al arrancar — ya no depende de que nadie se acuerde de subirlo.

De paso, el arranque (**T11**): `ASSETS` del service worker pasó de 7 a 22 entradas — antes no
precacheaba **ni un solo** módulo JS, así que cada apertura los pedía a la red uno por uno. El precache
usa `cache:'reload'` para no fosilizar copias viejas, los HTML se sirven *stale-while-revalidate*, y los
CDN pesados (Chart.js, qrcodejs) y las fuentes dejaron de bloquear el primer pintado.

Quedó fuera el `defer` de los 15 scripts locales de `owner.html`: su bloque inline llama a
`leerSesion()` en top-level y define las globales de los `onclick`, así que `defer` rompería el
arranque. Requiere mover ~1200 líneas de inline a un archivo — refactor aparte. Verificación:
`scripts/test-version-assets.js` 25/25 y `scripts/test-sw-precache.js` 11/11 en navegador real.

## ~~Dos menús en un pedido: el cocinero ve qué entrada va con qué segundo~~ ✅ Completado 2026-08-16
*Ver [ISS-041](issues/ISS-041-menus-multiples-sin-anidar.md). Salió del uso real del piloto #1.*

Un comensal que pedía 2 menús del día con combinaciones distintas llegaba a cocina como una lista plana
de 4 platos. No era un problema de vista: el dato se perdía **antes** del backend, en el `flatMap` que
aplanaba el carrito, y las tablas no tenían dónde guardarlo.

Nueva columna **`grupo`** en `orden_menu_items` y `reserva_menu_items` (migración idempotente), numerada
por posición en el carrito. Viaja por los 4 INSERT —incluido el que convierte una reserva en orden, que
la hereda— y vuelve en los SELECT de detalle junto con el nombre del menú.

**ARCH:** el agrupamiento se renderiza con una sola **`renderMenuAgrupado()`** en `utils.js`, usada por
las 4 vistas que pintan el detalle (Cocina ×2, Órdenes, Reservas, Cola). Cada vista pasa su propio
formato de línea —los 4 son distintos— pero la lógica de agrupar vive en un lugar. No agrupa si hay un
solo menú, ni si algún ítem viene sin `grupo` (pedidos anteriores a la migración: se pintan planos, sin
inventar combinaciones).

**Decidido sobre mockups renderizados a 360 px, no sobre descripciones:** encabezado por menú (el
recuadro empujaba el botón "Preparando" fuera de pantalla con 3 menús), numerar siempre, y el nombre del
menú **solo cuando el pedido mezcla tipos** — medido: con la letra en escala Máxima el encabezado largo
parte en dos líneas y suma 50 px. Verificación: `scripts/test-menus-agrupados.js` 26/26,
`scripts/test-grupo-punta-a-punta.js` 13/13 (HTTP real), 412/412 jest.

## ~~El monto a pagar, visible cuando el comensal abre Yape~~ ✅ Completado 2026-08-16
*Ver [ISS-040](issues/ISS-040-monto-no-visible-en-pago.md). Salió del uso real del piloto #1.*

La pantalla de pago mostraba el número al que transferir y el campo del comprobante, pero **no cuánto
pagar**: el monto aparecía antes (en el carrito, ya cerrado) y después (en el repaso final, cuando ya
había transferido). El comensal se olvidaba justo al abrir su app.

Nuevo bloque **"Total a pagar"** en `#pago-screen`, alimentado por `pagoPendiente.total` — que ya se
calculaba e incluye el cargo por tapper y la tarifa de delivery. Va **sticky**: el hueco real no era
entrar a la pantalla sino *bajar a subir el comprobante*, cuando el monto se iba arriba. Sirve igual
para efectivo (cuánto preparar). SW → `menupro-v9`. Verificación:
`scripts/test-monto-pago-visible.js`, 9/9 a 360×600.

## ~~"Para llevar" ahora se ve en el ticket de cocina~~ ✅ Completado 2026-08-16
*Ver [ISS-042](issues/ISS-042-para-llevar-no-viaja-cocina.md).*

El cocinero veía el mismo ticket para comer en el local que para llevar, y emplataba sin saber si
había que envasar. El dato (`modalidad`) ya viajaba desde el backend; `cocina.js` nunca lo leía.
Badge 🥡/🛵 en órdenes y reservas, en línea propia entre el header y los platos (en 360px competía
con el badge de estatus, y va antes de los platos porque define cómo se emplata).

**ARCH:** `badgeModalidad()` **se movió de `ordenes.js` a `utils.js`** en vez de duplicarse — es el
mismo widget que ya usaban Órdenes, Reservas y Cola del día, y desde `utils.js` deja de depender del
orden de carga de los `<script>` de `owner.html` (`cocina.js` se carga *antes* que `ordenes.js`).
Parámetro `grande` para el tamaño del ticket de cocina, sin alterar las otras tres pantallas.
Verificación: `scripts/test-badge-modalidad-cocina.js`, 15/15.

## ~~Letra más grande en el panel del owner~~ ✅ Completado 2026-08-10
*Punto 3.1 del backlog. Ver [ISS-028](issues/ISS-028-overflow-letra-grande.md).*

El sistema de tamaño ajustable ya existía (3 niveles sobre `--font-scale`, desde 2026-07-14), pero se
quedaba corto: 14 / 16,1 / 18,2px. Subido a **16,1 / 19,6 / 23,8px** (escalas 1,15 / 1,4 / 1,7). Se
mantienen 3 botones en vez de agregar un cuarto — menos opciones es mejor para un dueño mayor. El
"Normal" nuevo equivale al "Grande" anterior.

**La preferencia guardada migra hacia arriba, nunca hacia abajo**, con key versionada
(`mp-font-scale-v2`): 1.15 significaba "Grande" en el esquema viejo y "Normal" en el nuevo, así que por
el número solo no se puede saber cuál eligió el usuario.

Antes hubo que corregir 2 bugs de overflow que bloqueaban la subida — uno de ellos **ya activo en
producción** (ver ISS-028). Verificación: `scripts/test-escala-tipografica.js`, 14/14, incluyendo touch
targets ≥44px e inputs ≥16px en la escala máxima. `menu.html` (carta del cliente) no se tocó.

## ~~Sesión persistente — entrar sin iniciar sesión, como WhatsApp~~ ✅ Completado 2026-08-10
*Ver [ISS-027](issues/ISS-027-sesion-se-pierde.md) y §3.2 de `conversacion_opues10082026.md`.*

La barrera de adopción más cara del proyecto: el piloto #2 no lograba ni iniciar sesión. Eran **dos**
causas, y la segunda era la real — la sesión vivía en `sessionStorage`, que el navegador borra al cerrar
la PWA, así que subir el `expiresIn` solo no habría arreglado nada.

Sesión de **30 días** con renovación deslizante vía `GET /api/auth/me` (nuevo), sesión movida a
`localStorage` con migración automática desde la anterior, `sameSite: 'lax'` (con `strict` la PWA no
manda la cookie al abrir desde el ícono) y splash antes del primer paint en `login.html`. **El admin del
SaaS queda acotado a 1 día** — usa el mismo endpoint de login y no debe heredar los 30 días.
`utils/sesion.js` (nuevo) concentra las reglas como funciones puras. Tests:
`tests/sesion-persistente.test.js` (19 casos). **317/317 jest verde.**

## ~~Cola del día trabada: pedidos que no avanzan de etapa~~ ✅ Completado 2026-08-10
*Ver [ISS-026](issues/ISS-026-cola-carrera-doble-tap.md).*

Reportado como "lentitud con 2-3 pedidos", pero era una **carrera entre el poll y los taps**: sin guard
de botón (el doble tap producía el error falso *"No se puede cambiar una orden pagado"* sobre una acción
que sí había funcionado), sin token de secuencia (las respuestas de polls viejos repintaban el estado
anterior y el pedido reaparecía) y sin feedback inmediato.

Fix en `pedidos.js`: guard por ítem, token de secuencia, actualización optimista con reversión.
`utils/colaDia.js` (nuevo) + **`GET /api/orders/cola`** reemplazan las 6 requests con N+1 por 1 llamada
con consultas fijas. Tests: `tests/cola-dia.test.js` (15 casos) + `scripts/test-cola-carrera.js`
(Playwright, 21/21).

## ~~Cierre de caja — pedidos de días anteriores sin cerrar~~ ✅ Completado 2026-08-10

Salió de ISS-026: `total` solo se escribe al cobrar y Ganancias suma `WHERE total IS NOT NULL`, así que
**un pedido que nunca se cerró no aparece en las Ganancias, nunca**. La Cola ahora muestra solo hoy, pero
lo viejo no se oculta: un banner avisa cuántos quedaron abiertos y un modal permite marcarlos "💰 Se
cobró" (entra a Ganancias) o "✗ No se concretó" (cancela y devuelve stock). Nuevo
`GET /api/orders/sin-cerrar`. Decisión del usuario entre 4 opciones; se descartó el auto-cierre nocturno
— nada que involucre dinero se cierra solo.

## ~~Ícono de la PWA mostraba "RA" en vez de la marca~~ ✅ Completado 2026-07-16

El usuario notó que el ícono instalado en el celular mostraba el monograma "RA" (placeholder de una marca
anterior). `scripts/generate-app-icons.js` (nuevo, reutiliza Playwright como `take-landing-screenshots.js`)
regenera `public/icons/icon-192.png`/`icon-512.png` con el monograma **"MP"** sobre los colores de marca ya
establecidos (terracota `#c8692a` + círculo `#a0521e`). Bumpeado `sw.js` `CACHE` a `menupro-v4` — sin esto,
los celulares con la PWA ya instalada seguirían viendo el ícono viejo indefinidamente (mismo problema que
`ISS-022`). **283/283 jest verde** (sin tests nuevos, cambio de assets estáticos).

## Pendientes

> **¿Qué sigue?** → `backlog.md`. Este archivo es el registro por feature (qué es, cómo se
> implementó); `backlog.md` es el plan priorizado de la etapa (P0/P1/P2) con el porqué de cada
> prioridad y el contexto de los pilotos.

### ~~Notificaciones push ampliadas (Gap 21)~~ ✅ Completado 2026-07-16
*Ver Gap 21 en `vision_negocio.md`, `pilotos.md` y `issues/ISS-025-push-no-llega.md`.*

Confirmado por el piloto #1: hasta ahora el push solo existía para "hora de preparar"
(`utils/autoPreparacion.js`). 2 notificaciones nuevas:
1. Push al crearse una orden walk-in o una reserva nueva (tiempo real, tipo WhatsApp) — `routes/public.js`.
2. Recordatorio cada 8 horas si el menú del día de hoy no está configurado — nuevo job
   `utils/recordatorioMenu.js` (tick cada 30 min, throttle de 8h vía `restaurantes.ultimo_recordatorio_menu`).

Ambas condicionadas al permiso de notificaciones del dispositivo (si no se otorgó, no se envía nada, igual
que antes). Se extrajo `utils/pushNotificaciones.js` como helper genérico de envío, reutilizado por
`autoPreparacion.js` (refactor sin cambio de comportamiento), `routes/public.js` y el job nuevo.
Tests: `tests/recordatorio-menu.test.js` (16 casos). **283/283 jest verde.**

### Landing — disclosure de transparencia sobre IA
*Anotado 2026-07-16, pendiente de implementar.*

`public/landing.html` debe decir en algún lugar visible que la aplicación fue desarrollada con
Inteligencia Artificial, pero diseñada y monitoreada por una persona. Ver principio 9 en
`vision_negocio.md` sección 11. Copy concreto y ubicación (¿footer? ¿sección "Quién lo hace"?) pendientes
de definir.

### Aceptación de Términos de uso (consentimiento de datos + disclosure de IA)
*Anotado 2026-07-16. **Implementado 2026-08-28 (ISS-082).** Ver Gap 22 en `vision_negocio.md`.*

Distinto de la disclosure pasiva de la landing: el **owner** acepta activamente, en una pantalla
bloqueante en su primer ingreso a `owner.html`, unos Términos de uso que cubren (1) consentimiento
para registrar y usar los **datos de venta** con fines de **métricas de uso**, estrictamente para
eso y de forma confidencial; (2) tratamiento de los datos personales de los clientes conforme a la
**Ley N.° 29733**; (3) aviso de que la app fue desarrollada con IA supervisada por una persona.

- **Solo el owner** pasa por esto — mozo/cocinero/admin no ven nada.
- **Versionado**: `utils/terminos.js::TERMINOS_VERSION`. Subir esa fecha fuerza re-aceptación a
  todos los owners en su próximo ingreso.
- BD: `terminos_aceptados_at` / `terminos_version` / `terminos_aceptado_por` en `restaurantes`.
- Endpoints: `GET /api/auth/terminos` (`{ version, pendiente, aceptados_at }`) y
  `POST /api/auth/terminos/aceptar` (`authorize('owner')`).
- Texto completo en `public/terminos.html` (8 secciones). Columna "T&C" en el panel admin con la
  fecha/versión de aceptación por restaurante.
- Tests: `tests/terminos-aceptacion.test.js` (9 casos). **478/478 jest verde.**
- Pendiente: revisión legal formal del texto (borrador) y el copy pasivo en la landing (entrada
  anterior, sin implementar).

### Módulo Pensionistas — lo que falta tras las Fases 1 y 2
*Anotado 2026-07-15, decisiones cerradas el 2026-08-10. **El núcleo ya está implementado** — ver
las entradas "Pensionistas — Fase 1" y "Pensionistas — Fase 2" arriba (backend, panel del owner,
`pensionista.html`, login). Ver `pensionistas.md` §0, `backlog.md` y Gap 20 en `vision_negocio.md`.*

Lo que queda de la spec original, sin construir todavía:

- **Integración en Cola del día y Cocina** (`pensionistas.md` §5): los pedidos de
  `pedidos_pensionista` hoy solo se ven desde "Mis pedidos" del propio pensionista y desde el
  panel del owner. No aparecen unificados con órdenes/reservas en `pedidos.js`/`cocina.js` con el
  tag "🪪 Pensionista" que la spec original preveía — el cocinero no los ve en la cola del día.
- **Reportería separada** (`pensionistas.md` §8): recargas del período, consumo del período y
  saldo total pendiente en el sistema (que es un pasivo: plata ya cobrada que "debe" en comida).
  Sin esto, "Ganancias" en `reportes.js` sigue sin contar nada de pensionistas — ninguna
  contabilidad rota, pero tampoco hay visibilidad de ese dinero.

Ninguno de los dos bloquea el uso real: la dueña ya puede dar de alta pensionistas, recargarles,
y ellos ya pueden pedir con su saldo. Quedan para cuando aparezca un caso real que los pida.

### ~~Nombre obligatorio en órdenes (paridad con reservas)~~ ✅ Completado 2026-07-13

~~En reservas el nombre ya es obligatorio (`routes/public.js:307`, validado también en `confirmarReserva()` de `menu.html`). En órdenes es opcional...~~

Backend (`routes/public.js`, `POST /orders`): agregado `if (!nombre_cliente?.trim()) return res.status(400)...`, mismo patrón que reservas. Frontend (`menu.html`): quitado "(opcional)" del label; `confirmarPedido()` valida el nombre antes de continuar (mismo patrón que `confirmarReserva()`). Verificado con `scripts/test-gate-pago.js` (Test 1): sin nombre no se crea la orden ni por UI ni pegándole directo a la API (400).

### Estadísticas: "qué pidió la gente hoy" + fix del gráfico de barras chico
*Anotado 2026-07-13. **Escalado el 2026-08-10 a rediseño completo de la reportería — ver `backlog.md`.** El usuario fue tajante: "las gráficas son microscópicas y no dan nada de valor que le interesa a la clienta". Toda la reportería va a cambiar, y **requiere análisis antes de codear**.*

**El dato #1 que la clienta quiere, y que hoy no existe:** **cuántos menús va vendiendo en el día, en ese momento** — sin importar si el menú vino por mesa o por reserva. Es la cantidad total, en vivo, para mirar en pleno servicio. Después de eso, qué platos va vendiendo. El diagnóstico técnico de abajo sigue siendo válido y hay que aprovecharlo, pero el alcance ya no es "arreglar el gráfico": es replantear qué se muestra.

El usuario preguntó puntualmente: "¿cuántos platos voy hasta ahora?", "¿qué ha pedido la gente hoy?". Ya existe "Análisis de pedidos" en reportería (`reportes.js` → `loadPedidos()`, endpoint `GET /api/reportes/pedidos?tipo=&filtro=`) — un gráfico de barras por plato con Chart.js. Pero: (a) es un **acumulado histórico total**, sin filtro de fecha/"hoy" (confirmado en `contarPedidosPorPlato()`, `routes/reportes.js` — las queries SQL no tienen `WHERE fecha = ?`); (b) filtra de a una sección/categoría del menú a la vez, no da un resumen "todo lo pedido hoy" de un vistazo.

**Gráfico chiquito — causa confirmada:** su contenedor (`#chart-pedidos-wrap`, `owner.html:557`) solo tiene `min-height:220px` sin `position:relative` ni alto fijo — a diferencia de `#chart-ganancias-wrap`/`#chart-demanda-wrap` que sí tienen `position:relative;height:260px`/`280px`. Chart.js en modo `responsive:true` necesita que el contenedor inmediato tenga `position:relative` + una altura explícita para dimensionarse bien; sin eso el canvas queda con el tamaño intrínseco por defecto, mucho más chico de lo esperado.

**Alcance propuesto:** (1) fix rápido del contenedor (`position:relative;height:280px` en `#chart-pedidos-wrap`, igual que los otros 2 gráficos); (2) nuevo filtro de fecha (día actual por default, con opción de rango) en `GET /api/reportes/pedidos`; (3) evaluar una vista resumen "Hoy" que no requiera elegir sección/categoría manualmente — posible pestaña nueva o vista por defecto al abrir el panel Reportes.

### ~~Tamaño de letra ajustable en el panel del owner~~ ✅ Completado 2026-07-14

~~No existe hoy ningún control de tamaño de fuente en `owner.html`...~~

**Decisión de alcance:** 3 niveles fijos (Normal/Grande/Muy grande), control manual dentro de Configuración (no en el sidebar), sin auto-detección.

**Diagnóstico técnico previo:** `zoom` (probado primero por ser el cambio de menor alcance) se descartó — rompe `grid-template-columns: repeat(auto-fill, minmax(...))` del Home (`.home-card` terminaba render como fila de 3-4 cards muy por fuera del viewport en vez de apilarse). Se optó por convertir mecánicamente los ~247 `font-size` en `px` de `owner.css` + `owner.html` + 9 módulos JS + 5 widgets a `rem` (script de migración temporal, no versionado), y escalar con la variable `--font-scale` sobre `html,body`.

**Bug propio detectado y corregido en el camino:** la primera pasada dividió cada `px` por 16 (el default del navegador) en vez de por 14 (la base real declarada en `html,body{font-size:14px}` desde antes de este cambio) — eso encogía **todo el panel ~12.5%** incluso en el nivel "Normal". Se revirtió (los archivos no estaban commiteados aún) y se rehizo dividiendo por 14; verificado con Playwright que a escala Normal cada elemento reproduce el px original exacto (`brand-icon` 20px, `.nav-item` 14px, inputs a 16px — igual que antes del cambio), y que a 1.15/1.3 escala proporcionalmente sin overflow horizontal en Home/Configuración/Cola del día (`scrollWidth === innerWidth` en los 3 niveles). Como los 3 niveles son siempre ≥100%, ningún input cae nunca por debajo de los 16px obligatorios contra el zoom automático de iOS.

**Implementado:** `--font-scale` (1/1.15/1.3) en `html,body` vía `calc(14px * var(--font-scale,1))` (raíz en `px` absoluto — un `rem` en el propio elemento raíz se resolvería contra el default del navegador, no contra sí mismo). Persistencia en `localStorage` (`mp-font-scale`, por dispositivo, no viaja al backend), aplicado antes del paint (mismo patrón que el tema claro/oscuro) para evitar flash. Card "🔤 Tamaño de letra" en Configuración con 3 botones.

### ~~Galerías de platos y menús — desktop apretado~~ ✅ Completado 2026-06-08

~~En desktop las galerías de Platos de menú, Platos a la carta y Menús del día se ven muy apretadas (cards de ~120px en fila) y dejan espacio vacío a la derecha del panel.~~

**Causa raíz (doble bug de CSS):**
1. `.mw { max-width: 680px }` inyectado por `menu-wizard.js` → cortaba el contenedor dejando vacío a la derecha.
2. Problema de cascada: el `<style>` inyectado por el widget carga después de `owner.css` → `.mw-menus { display: flex }` del widget pisaba el `display: grid` de `owner.css` (misma especificidad 0,1,0).

**Fix en `public/css/owner.css`:** selectores con ID de mount (`#platos-menu-mount`, `#platos-carta-mount`, `#menu-wizard-mount`) con especificidad (1,1,0) que siempre ganan sobre el widget. `max-width: none` elimina el límite de 680px. `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` da grid responsivo (~4 col en 1280px). `.mw-wizard` centrado con `max-width: 560px`. Solo CSS, sin cambios de backend.

### ~~Cambios en desktop (menu.html)~~ ✅ Completado 2026-06-05

~~En desktop la parte de menú se ve mal, se debe crear una tarjeta para desktop que no sea tan ancha.~~

Media query `@media (min-width: 680px)` en `menu.css` → columna centrada de 460px. Hero, header, content, res-panel, cart-bar, res-bar y drawer quedan contenidos en esa columna. Solo CSS + una línea JS (`body.classList.add('has-hero')`). Sin cambios de backend.


### ~~Actualizar landing con nuevas fotos del sistema~~ ✅ Completado 2026-06-15

Script `scripts/take-landing-screenshots.js`: arranca el servidor local, seedea datos demo, sube fotos de platos reales (de `landing/bot/assets/`) vía API, y toma las 7 capturas con Playwright a 390×844px (2× pixel ratio) — guardadas en `public/landing/screenshots/`. Sin intervención manual. Las imágenes reflejan la UI actual: Home con hubs, menú QR con fotos de platos, cocina, cola del día, plano de mesas y reportes.


### Cambio en Flujo total : 

> **✅ Completado 2026-06-05 (sesiones 3 + 4)**
>
> **Sesión 3 — UX dentro de paneles:**
> - ✅ Secciones → chips (pill + ×) con `FormModal`
> - ✅ Platos de menú → galería de cards retrato con foto, nombre, descripción, acciones
> - ✅ Categorías (Carta) → chips igual que secciones
> - ✅ Platos a la carta → galería con foto, precio, categoría, toggle Visible/Oculto
> - ✅ Stepper explicativo en Menú del día (3 pasos) y Carta (2 pasos), con botones `?`
> - ✅ Grid desktop 2 columnas para todas las galerías
>
> **Sesión 4 — Navegación por hubs:**
> - ✅ `panel-home`: 4 cards portrait en carrusel horizontal (230×340px), saludo dinámico hora Lima, nombre del restaurante, descripciones en tuteo peruano
> - ✅ `panel-gestion-menus`: hub con 2 cards (Menú del día | Carta)
> - ✅ `panel-operaciones`: hub con 4 cards (Cola del día | Órdenes | Reservas | Cocina)
> - ✅ `panel-ajustes`: hub con 2 cards (Configuración | Usuarios)
> - ✅ Botón 🏠 en topbar; hamburger movido al grupo derecho; bottom-nav "Más ☰" → "🏠 Inicio"
> - ✅ Botones de vuelta contextuales en todos los paneles (← Gestión de menús / ← Operaciones / ← Ajustes / ← Inicio)
> - ✅ Desktop: home cards en grid 2×2 centrado

#### Introducción

En ves del menu galleta o hamburguesa vaya una opción de "Home" o casa para permitir el siguiente flujo: 

Pantalla de inicio: Pantalla con 4 cards principales (Medianos de tamaño) la card debería tener un emoji representativo y el nombre y cuando se hace clic en el nombre se ingresa. Estos cards deberían aparecer para hacerles scroll a la derecha. Gestión de menús y platos a la carta| Operaciones diarias| Análisis de datos| Configuración

#### Gestión de menús y platos a la carta

Al entrar deben aparecer 2 Cards similares: Configurar menú del día, Configurar platos a la carta. 

##### Menú del día 

Si hace clic en configurar menú del día 3 cards: mismo estilo carrusel a la derecha, con botones de volver y el botón a home que envía al menú principal.  Los 3 cards deben decir: Crear o administrar secciones, la segunda : Administrar platos de menú, la tercera: Administrar menú del día. 

Secciones se mantiene igual. con botón de volver

###### Platos de menú

~~Debe abrirse cards del estilo de Menú del día, grande 400px creo que era, estilo galería carrusel, con foto dentro del card (mismo estilo que si se hace clic en la foto te aparezca para elegir la foto) el nombre y la descripción. Con el botón de agregar plato arriba que envíe a dos pasos con cards del mismo tamaño que los pasos: Nombre y la segunda card Descripción para crear. Y con botones para editar el nombre y la descripción. Con botón de volver.~~

✅ **Implementado 2026-06-05:** galería de cards retrato (`.pm-plate-gallery`) con foto, watermark 🍽️ si no hay foto, nombre, descripción, botones "📷 Subir foto", "✏ Editar", "Eliminar". Crear plato usa `FormModal` (nombre + descripción). Pendiente: wizard de 2 pasos (Nombre → Descripción) y botón "Volver" de la visión original del flujo total.

###### Menú del día

Se mantiene igual con el widget `MenuWizard` (galería + wizard de creación + config inline). ✅

##### Carta

Para carta mismo estilo que menú del día. Dos cards, configurar categorías | Administrar platos a la carta. Al entrar a categorías, deberían aparecer cards con nombre y botón de crear con un único caso de elegir nombre

###### Platos a la carta

~~Similar situación que platos de menú. Una galería bonita con imagen para elegir y con herramienta recorte. Con botón para agregar plato.~~

✅ **Implementado 2026-06-05:** galería (`.pc-plate-gallery`) con foto/watermark 🍴, nombre, precio, pill de categoría, descripción, toggle Visible/Oculto, "📷 Subir foto", "✏ Editar", "Eliminar". Crear plato usa `FormModal` con select de categoría. Herramienta de recorte ya existía en `recortarYSubirPlato()`.  



#### ~~Menú del día del lado de owner: asistente carrusel~~ ✅ Completado 2026-06-04 · sin backend · widget `MenuWizard`

~~Me gusta la forma del primer form: Nombre + Precio + Fecha, pero quisiera mejorarlo: cards del mismo tamaño en modo carrusel (no scroll vertical), un paso por card; tras crear, una card que muestre los menús de la fecha elegida, 1 por vista con scroll a la derecha y botón de configurar más visible.~~

Implementado como **widget inline `MenuWizard`** (`public/js/widgets/menu-wizard.js`) montado en el sub-panel "Menús del día" de `owner.html`. Tras varias iteraciones del 2026-06-04, el modelo definitivo son **dos vistas** (no un carrusel todo-en-uno):

**Galería (vista principal):** selector de fecha con flechas **◀ fecha ▶**, botón fijo **"＋ Crear menú"**, y los menús de ese día como **cards retrato** (más altas que anchas) en carrusel horizontal — **una sola card visible** (tamaño parametrizado por variables CSS `--mw-card-*` sobre `.mw`: 100%/100%/480px; revertir al peek = 82%/320px/360px). No hay card contenedora: las cards *son* los menús. Cada una con: **foto de portada de fondo** (con scrim; watermark 🍽️ si no hay foto), toggles Fijo/Visible **con una línea explicativa cada uno**, **⚙ Configurar** (abre la 3ª vista inline ↓) y Eliminar. Estado vacío con CTA a crear.

**Foto de portada elegible (mini-backend):** el owner elige qué plato aporta la foto de fondo con un botón **"📷 Portada"** por plato (con foto) en la vista de configuración; si no elige, se usa el primer plato con foto. Backend: columna `menus_dia.id_plato_portada` (migración idempotente), incluida en el GET, + `PATCH /api/menu/menus-dia/:id/portada` (valida pertenencia; `null` la limpia). Tests `tests/menu-portada.test.js` (8).

**Configuración inline = galería de secciones (3ª vista):** ⚙ Configurar **dejó de ser un modal** (`#menu-config-overlay` eliminado de `owner.html`) y pasó a ser una **tercera vista del widget**, del mismo estilo (galería ⇄ wizard ⇄ config), con "← Volver" y "✏ Editar". El cuerpo es una **galería horizontal de secciones**: cada sección es una **card retrato** (~270×360, igual que las de menús) con toggle Obligatoria/Opcional, sus platos (toggle Agotado/Disponible + ✕), "＋ Agregar plato" y "Quitar sección". Arriba, **solo** el botón **"＋ Agregar sección"** (sin barra de select inline).

**Alta de sección por mini-wizard:** "＋ Agregar sección" abre un **carrusel de 2 pasos** dentro de la misma vista (reutiliza las clases `.mw-*` del MenuWizard): **Paso 1 "Selecciona una sección"** (cards de opciones del catálogo) · **Paso 2 "¿Obligatoria?"** (dos cards con emoji ✅ Obligatoria / ⏭️ Opcional). Confirmar → `POST /api/menu/menus-dia/:id/secciones` y vuelve a la galería de secciones. Reemplaza el viejo `agregarSeccionMenu` (select + checkbox), eliminado.

Toda la lógica (secciones, `PlatoPicker`, toggles, quitar, editar nombre+precio) se **reutiliza sin cambios de backend** desde `owner.html`; `renderConfigBody` emite el markup de galería (`.mc-sec-gallery`/`.mc-sec-card` en `owner.css`), los IDs `mc-title`/`mc-meta`/`mc-body` se reubicaron dentro del widget y `abrirConfigMenu`/`cerrarConfigMenu` alternan vistas vía `MenuWizard.showConfig()`/`showGallery()`. Motivo (usuario): "el modal confunde un poco el proceso", "cada sección debe ser una card de igual tamaño que los menús", "al hacer clic en Agregar debería abrirse un wizard de pasos".

**Wizard de creación (3 pasos):** se abre con "＋ Crear menú", **hereda la fecha de la galería** y pide:
1. **Título** del menú, con figura/emoji decorativa (título opcional, default "Menú del día"). "✕ Cancelar" vuelve a la galería sin crear.
2. **Precio** (valida > 0), con su propia figura/emoji.
3. **¿Este menú es fijo o el cliente elige sus platos?** — una sola pregunta con dos cards grandes; habilita "Crear menú ✓" → `POST /api/menu/menus-dia` y **vuelve a la galería** con el menú nuevo listado.

**Decisiones del usuario:** (1) la creación dejó de ser un "paso" del carrusel — la galería es el hogar del módulo y el wizard se lanza desde ella; (2) la fecha se elige/cambia en la galería y la hereda la creación (wizard de solo 3 pasos); (3) no borrar lo anterior — el form clásico quedó oculto en `#md-legacy` (`display:none`) para revertir fácil. **Integración limpia:** `loadMenusDia()` delega en `MenuWizard.reload()` (refresca la galería) sin tocar más código. Verificado E2E a 360px (`scripts/test-menu-wizard.js`, **43/43**) + **215/215** jest verde, sin overflow. Detalle del widget en `widgets.md`.

> Iteraciones del día (archivadas): primero 4 pasos (fecha → nombre+precio → ¿fijo o elige? → menús), luego 5 (separando título/precio + botón "Ver menús"), y finalmente este rediseño a **galería + wizard de 3 pasos**.

#### Cards verticales con scroll horizontal en menú del día y carta (cliente) — pendiente
En `menu.html`, los cards de **menú del día** y de **carta** se ven apaisados (más anchos que altos) y apilados a lo alto. Rediseñarlos a **formato retrato (alto > ancho)**, redondeados, en **carruseles horizontales** (scroll a la derecha): uno para "Menú del día" y uno por cada categoría de la carta. Aplica a modo *pedir* y *reservar* (comparten `renderMenuDiaCard` / `renderPlatoCarta`).
- Card retrato (~200px ancho, *peek* de la siguiente): foto arriba full-width; debajo nombre + datos + precio + acción (botón "Ver opciones →" en menú; control de cantidad en carta) al pie.
- Contenedor carrusel: flex row con `overflow-x:auto`, `scroll-snap-type:x mandatory`, scrollbar oculta (mismo patrón que los chips de la landing).
- Mobile-first respetado: touch targets ≥44px; el scroll-x es contenido e intencional, no overflow de página.

#### ~~Barra sticky de confirmación en reservas~~ ✅ Completado 2026-06-03 · sin backend
~~En modo reservar, el usuario tenía que scrollear hasta el fondo de la página para llegar al botón "Confirmar reserva".~~

Barra `#res-bar` sticky (verde, análoga al `#cart-bar` de órdenes): muestra conteo de ítems + total + botón "Confirmar reserva →". Visible solo en modo reservar cuando `resCart.length > 0`. `updateResCartSummary()` la actualiza en cada cambio; `switchMode()` la oculta al cambiar de modo. Sin cambios en backend ni en el flujo de confirmación existente.

> **Priorizado por costo / impacto / dependencias (análisis 2026-06-02).** Orden recomendado: **D → A → C → B**.
> A, B y C comparten el concepto "tarjeta de plato con foto": se construye **un solo widget `PlatoCard`** en A y se reutiliza en C y B (filosofía de widgets, ver `widgets.md`). Los puntos 1 y 2 originales pedían lo mismo → fusionados en **A**.

#### ~~D — Landing: copy + navegación por secciones~~ ✅ Completado 2026-06-02 · 🟢 costo bajo · impacto alto · sin backend
Cambios de marketing en `landing.html`, cero riesgo, alto retorno de conversión:
- **Headline:** ~~"Tu restaurante en el siglo XXI, sin volverte loco"~~ → **"La aplicación que tu restaurante necesita: controla todo desde tu celular"** (2ª parte en terracota).
- **CTA "Ver demo en vivo"** (hero + CTA final) → **"Ver cómo lo vería tu cliente"**, mismo link `/menu?restaurante=1&mesa=1`.
- **CTA "Quiero probarlo gratis"** (hero) → **"Solicita un mes gratis de prueba sin compromiso"**.
- **Navegación por secciones como chips sticky** (estilo pill, en una 2ª fila dentro del nav `sticky`): **¿Qué soluciona?** → `#problema` · **¿Cómo se usa?** → `#tutorial` · **¿Qué necesitas?** → `#features` · **¿Tienes más preguntas?** → `#faq`. Siempre visibles al hacer scroll (ahorra scrollear para navegar). En móvil la fila hace scroll horizontal (tab-bar, `overflow-x-auto` + `.no-scrollbar`); en desktop se centran. Anclas con scroll suave + `scroll-margin-top: 7.5rem` para el header de 2 filas; chips ≥44px (mobile-first). Los chips se pusieron en el nav (no en el hero) porque el `<section>` del hero tiene `overflow:hidden`, que rompe `position:sticky` en sus hijos.
- **Badge "🎁 Primer mes gratis" eliminado del header** (redundante con "Probar gratis" y el CTA "Solicita un mes gratis…"); el gancho del mes gratis sigue en el badge del CTA final.
- **Verificado** con Playwright a 360px y 1280px: chips sticky siguen visibles tras scroll, scroll horizontal interno en móvil, sin overflow horizontal de página, anclas alinean bajo el header, chips de 44px, 0 errores de consola.

#### ~~A — Selección visual de platos en el menú del día~~ ✅ Completado 2026-06-03 · sin backend
~~En `owner.html`, elegir un plato para una sección del menú del día era un `<select>` de nombres. Reemplazado por picker visual.~~

Widget `PlatoPicker` (`public/js/widgets/plato-picker.js`): sheet bottom-up con grid de cards foto+nombre, buscador en vivo, tap selecciona. En `owner.html`, el `<select>` + botón "Agregar" de cada sección fue reemplazado por un botón único "＋ Agregar plato" → `abrirPicker(menuId, seccionId)` → `PlatoPicker.open({ platos: platoMenuCache, onSelect })` → `agregarComponente(menuId, seccionId, platoId)`. Sin cambios de backend.

#### ~~C — Vista del cliente: cards + modal de selección~~ ✅ Completado 2026-06-03 · sin backend
~~En `menu.html`, mostrar cada menú del día como card compacta y abrir modal de selección al tap.~~

Widget `MenuModal` (`public/js/widgets/menu-modal.js`): bottom-sheet con handle, header (nombre + tipo + precio), body con secciones (radio buttons para elegibles, bullets para fijos, platos agotados tachados), footer con botón "Agregar". Cierra automáticamente al agregar con éxito (`agregarMenu` retorna `true`). `renderMenuDiaCard` rediseñada: card compacta con foto del primer plato (o emoji 🍽️), pills de secciones como preview, botón "Ver opciones →". Función `abrirMenuModal(menuId, mode)` limpia selecciones previas y abre el modal. Funciona en modo `pedir` y `reservar`. No se tocó el flujo del carrito existente.

#### ~~B — Panel de configuración de menús: cards + modal de secciones~~ ✅ Completado 2026-06-03
~~Rediseñar `renderMenuCard` para que sea más fácil de usar.~~

`renderMenuCard` rediseñado: card compacta con nombre, fecha, precio, pills de secciones como preview, toggles Elegible/Visible inline, botones "⚙ Configurar" y "Eliminar". Modal `#menu-config-overlay` (bottom-sheet) con `renderConfigBody`: secciones como cards (nombre, toggle Obligatoria/Opcional, platos con toggle Disponible/Agotado, ✕ eliminar), `PlatoPicker` integrado via "＋ Agregar plato", sección "Agregar sección" con select + checkbox. Botón "✏ Editar" en header abre `FormModal` para nombre+precio → `PATCH /api/menu/menus-dia/:id` (nuevo endpoint). Acciones del modal actualizan solo el modal (`recargarModalConfig()`); la lista se refresca al cerrar. `configMenuId` / `configMenuData` como estado global del modal.












#### ~~Botón para descarga de PWA~~ ✅ Completado 2026-05-30 (owner + login)
~~Debería haber un botón dentro de la APP reconocible facilmente para descargar APP para la versión de navegador (¿Se puede?)~~

Sí se puede. Botón **"📲 Instalar app"** en el sidebar-footer de `owner.html` y bajo el formulario de `login.html`, vía el widget reutilizable `PwaInstall` (`public/js/widgets/pwa-install.js`): captura `beforeinstallprompt` (Android/Chrome/Edge) → diálogo nativo; en iOS/Safari abre instructivo "Añadir a pantalla de inicio"; se oculta si ya está instalada. Tests: `scripts/test-pwa-install.js` (E2E, ambos caminos). **La versión instalable del comensal queda como feature futura ↓.**

#### Menú instalable por restaurante (comensal) — futura
Que el comensal pueda instalar como app **el menú de su restaurante** y se actualice solo a diario (los datos se piden en vivo en cada apertura, así que el menú del día siempre está fresco). **Bloqueante:** el `manifest.json` es único y global con `start_url: /owner.html`; instalar desde `menu.html` abriría el panel del owner. Requiere un **manifest dinámico por restaurante** (endpoint que genere `start_url` al menú del local, `name: "Menú de [Restaurante]"`, colores del local) + botón "Instalar" en `menu.html`. Idealmente combinado con las URLs por slug ↓.

#### URLs por slug del restaurante (`menupro.tech/karinamenu`) — futura
Reemplazar `?restaurante=1&mesa=1` por una ruta bonita por restaurante. Alcance: columna `slug TEXT UNIQUE` en `restaurantes` (autogenerada del nombre, editable); ruta Express `GET /:slug` (registrada al final + lista de palabras reservadas: `login`/`admin`/`owner`/`menu`/`api`/`manuales`/`health`/`icons`/`css`/`js`/`uploads`…) que sirve `menu.html`; mesa en el path (`/karinamenu/5`); `menu.html` resuelve el restaurante con `/api/public/by-slug/:slug`. **Mantener compatibilidad** con los QR viejos (`?restaurante=ID`). Actualizar el generador de QR del owner, el link "Ver demo en vivo" de la landing y el seeder. Habilita el manifest dinámico del comensal ↑.


#### ~~Editar platos~~ ✅ Completado 2026-05-30
~~en owner.html, en platos de menú (verficar platos a la carta) que los nombres de los platos se puedan editar~~

Botón ✏️ por fila en **Platos de menú** (edita nombre + descripción) y **Platos a la carta** (edita nombre + precio + descripción + categoría), usando el widget reutilizable `FormModal`. Backend: `PATCH /api/menu/platos-menu/:id` y `PATCH /api/menu/platos-carta/:id` (scope por restaurante, categoría validada). Tests: `tests/editar-platos.test.js` (10) + E2E `scripts/test-editar-platos.js`.

#### ~~Scrolling en Menús del día~~ ✅ Resuelto 2026-05-30 (bug de layout, no de scroll)
~~El scrolling en Menús configurados no funciona o no existe. No se puede hacer scroll a la derecha en Menús configurados y aparece vista parcial (no aparece el botón de eliminar completo, por ejemplo)~~

Causa: `.card-header` era `display:flex` sin `flex-wrap` y `.card` tiene `overflow:hidden` → en 360px el grupo "Configurar secciones / Eliminar" se cortaba fuera de la card e inaccesible. Fix mobile-first: `flex-wrap: wrap` en `.card-header` (owner.css) + en las filas internas de sección/plato de `renderMenuCard`. Ahora los botones bajan de línea y quedan dentro de 360px (no se agrega scroll horizontal: la regla del proyecto es que todo entre sin overflow). Verificado a 390px en el E2E.



### Prioridad Alta — Arquitectura base (hacer ANTES de nuevas features)

#### ARCH-001 — Modularizar owner.html en ES Modules

El monolito `owner.html` (~2400 líneas) debe dividirse en módulos JS separados antes de agregar más features. Sin esto, cada feature nueva incrementa la deuda técnica. Cada paso deja la app funcionando igual — refactor puro, sin cambios de lógica ni UI.

**CSS:** todo el proyecto usa CSS custom (no Tailwind). Migración a Tailwind: progresiva en producción, módulo por módulo, después del lanzamiento.

| Paso | Módulo | Descripción | Estado |
|------|--------|-------------|--------|
| 1.1 | `public/css/owner.css` | Extraer `<style>` de owner.html → archivo CSS separado. `owner.html` usa `<link rel="stylesheet">` | ✅ Completo |
| 1.2 | `public/js/modules/utils.js` | Extraer funciones compartidas: `api()`, `toast()`, `esc()`, `fDate()`, `fDT()`, `badgeEst()`. Base de la que dependen todos los demás módulos. ~80 líneas | ✅ Completo 2026-05-22 |
| 1.3 | `public/js/modules/config.js` | Panel Configuración: foto portada, colores, QR, mesas, métodos de pago. Panel aislado, buen primer módulo de dominio. ~200 líneas | ✅ Completo 2026-05-22 |
| 1.4 | `public/js/modules/usuarios.js` | Panel Usuarios y permisos granulares. Sin dependencias de otros paneles. ~150 líneas | ✅ Completo 2026-05-22 |
| 1.5 | `public/js/modules/mesas.js` | Plano de mesas visual + polling 10s. Va antes que órdenes/reservas porque ambos lo usan. ~150 líneas | ✅ Completo 2026-05-22 |
| 1.6 | `public/js/modules/cocina.js` | Cola de cocina. `kitchen.html` se elimina — toda la lógica vive en `owner.html` via `cocina.js`. ~150 líneas | ✅ Completo 2026-05-22 |
| 1.7 | `public/js/modules/reservas.js` | Reservas activas e historial. ~350 líneas | ✅ Completo 2026-05-22 |
| 1.8 | `public/js/modules/ordenes.js` | Órdenes activas, historial, tab plano. El módulo más grande. ~450 líneas | ✅ Completo 2026-05-22 |
| 1.9 | `public/js/modules/reportes.js` | Métricas, gráficas Chart.js, descargas Excel. ~250 líneas | ✅ Completo 2026-05-23 |
| 1.10 | `public/js/modules/pedidos.js` | Vista unificada Cola del día (órdenes + reservas juntas). Depende de 1.7 y 1.8. | ✅ Completo 2026-05-23 |

Al completar 1.6: `kitchen.html` ya puede eliminarse — toda la funcionalidad del cocinero vive en `owner.html` panel "Cocina".

**Sub-pasos pendientes de 1.9:**

| Sub-paso | Qué | Estado |
|----------|-----|--------|
| 1.9a | `reportes.js` creado + `<script src>` en head | ✅ Completo 2026-05-22 |
| 1.9b | Eliminar del inline: `descargarFormatoDemanda` + MÓDULO 5 (demanda, loadReportes, ganancias) | ✅ Completo 2026-05-23 |
| 1.9c | Eliminar del inline: análisis de pedidos + `sc()` + `renderBarChart()` | ✅ Completo 2026-05-23 |

#### ARCH-002 — PWA: sistema instalable en celular

Los usuarios (owner, mozo, cocinero, cliente) deben poder instalar el sistema desde el navegador del celular como si fuera una app, sin Play Store ni App Store. Scope: `owner.html` y `menu.html` (`kitchen.html` se elimina en ARCH-001 paso 1.6).

**Beneficio inmediato:** owner y mozo instalan la app en su celular, acceden sin recordar la URL, sin barra del navegador.

| Paso | Qué | Descripción | Estado |
|------|-----|-------------|--------|
| 2.1 | `public/manifest.json` + links | Crear manifest con nombre, colores, `display: standalone`. Agregar `<link rel="manifest">` en `owner.html` y `menu.html`. Con esto Chrome ya muestra el botón "Instalar". ~25 líneas | ✅ Completo 2026-05-22 |
| 2.2 | `public/icons/` | Íconos 192×192 y 512×512 PNG. Sin ellos el manifest funciona pero Chrome muestra advertencia. Placeholders con emoji si no hay logo. | ✅ Completo 2026-05-22 |
| 2.3 | `public/sw.js` + registro | Service Worker básico que cachea assets estáticos (HTML, CSS, JS). Registrar en `owner.html` y `menu.html`. Sin este paso la app instala pero no funciona offline — aceptable para MVP. ~50 líneas | ✅ Completo 2026-05-22 |

#### ARCH-003 — Mobile CSS audit en owner.html

El sistema vive en celulares de gama media. Auditoría realizada 2026-05-23 — hallazgos documentados abajo.

**Criterios de cumplimiento:**
- Touch targets mínimo 44×44px (botones, tabs, nav items, hamburger)
- Font-size mínimo 16px en inputs/selects/textareas (evita zoom automático en iOS)
- Font-size mínimo 14px en texto de contenido interactivo (botones, nav, tabs, cards)
- Sin overflow horizontal en 360px de ancho mínimo
- `type` explícito en todos los inputs de texto

| Paso | Archivo(s) | Qué | Estado |
|------|-----------|-----|--------|
| 3.1 | `owner.css` | Touch targets — botones de acción: `.btn`, `.btn-sm`, `.btn-danger`, `.btn-success`, `.btn-warn`, `.btn-logout` → `min-height: 44px`. Son los botones usados en campo (tarjetas de orden/reserva). | ✅ Completo 2026-05-23 |
| 3.2 | `owner.css` | Touch targets — navegación: `.nav-item` → `min-height: 44px`; `.tab` → `min-height: 44px`; `.hamburger` → `min-width/height: 44px` | ✅ Completo 2026-05-23 |
| 3.3 | `owner.css` + `owner.html` | Font-size inputs 16px: `.field input/select/textarea` → 16px globalmente. Inputs/selects inline en HTML (configuración, menú) → 16px. Evita zoom automático iOS al hacer focus. | ✅ Completo 2026-05-23 |
| 3.4 | `owner.css` | Font-size contenido 14px: `.btn`, `.btn-sm`, `.nav-item`, `.tab`, `.card-title`, `.order-meta`, `.order-items`, `.loading-text`, `.empty-text` → 14px mínimo | ✅ Completo 2026-05-23 |
| 3.5 | `owner.html` (templates JS) | Botones inline en gestión de menú (`font-size:10px; padding:1px`): toggle activo/agotado/elegible/requerido. Agregar `min-height:44px` y padding correcto. Son los más críticos en tamaño actual (~12px de alto). | ✅ Completo 2026-05-23 |
| 3.6 | `owner.html` | Inputs sin `type="text"` explícito: `sec-nombre`, `cat-nombre`, `pm-nombre`, `pm-desc`, `pc-nombre`, `pc-desc`, `md-nombre`, `u-nombre`. Agregar `type="text"` y `autocomplete` apropiado. | ✅ Completo 2026-05-23 |

**Hallazgos por criterio:**

*Touch targets (< 44px):*
- `.btn` base: ~35px → falla
- `.btn-sm`, `.btn-danger`, `.btn-success`, `.btn-warn`: ~27px → falla grave
- `.tab`: ~35px → falla
- `.nav-item`: ~35px → falla
- `.hamburger`: ~26px → falla
- Botones inline en templates JS del menú (`font-size:10px; padding:1px`): < 14px → falla muy grave

*Font-size inputs (< 16px, dispara zoom iOS):*
- `.field input/select/textarea`: 13px
- Inputs inline en configuración/menú: 12–13px

*Font-size contenido (< 14px):*
- `.nav-item`, `.tab`, `.btn`: 13px
- `.btn-sm`, `.btn-danger/success/warn`: 12px
- `.card-title`, `.order-meta`, `.order-items`: 12–13px

*Overflow horizontal:* bajo riesgo — tablas tienen `table-wrap`. Solo `.inline-form .field { min-width: 140px }` puede romper en 360px → se revisa en 3.3.

*Inputs sin type:* `sec-nombre`, `cat-nombre`, `pm-nombre`, `pm-desc`, `pc-nombre`, `pc-desc`, `md-nombre`, `u-nombre` — sin `type="text"` explícito.

#### ~~ARCH-004 — Columna `modalidad` en reservas~~ ✅ Completado 2026-05-21
~~Agregar `modalidad TEXT DEFAULT 'en_local'`~~ — aplicado en `config/database.js`. Las reservas existentes quedan con `modalidad = 'en_local'`. Afecta la máquina de estados: para_llevar no tiene `es_cliente_llego`, va directo a `es_full` tras `es_listo`.

---

### Prioridad Alta — Features funcionales

#### ~~Flujo completo de estados: órdenes y reservas (Gap 1 + Gap 2)~~ ✅ Completado 2026-05-23
~~Ver `vision_negocio.md` sección 13 — Gaps 1 y 2.~~

#### ~~Auto-preparación X min antes (Gap 3)~~ ✅ Completado 2026-05-25
~~Ver `vision_negocio.md` sección 13 — Gap 3.~~

Job en servidor (`utils/autoPreparacion.js`) corre cada 60s. Detecta reservas `es_confirmada=1` con `hora_llegada` dentro de `minutos_preparacion` del restaurante y las mueve a `es_en_cocina`. Web Push notifica al celular aunque la app esté cerrada. `minutos_preparacion` configurable por restaurante (default 20 min) desde panel Configuración. Tabla `push_subscriptions`. Service worker maneja `push` + `notificationclick`. 29 tests (17 lógica + 12 suscripciones).

#### ~~Modalidad de pedido en reservas y órdenes (Gap 4)~~ ✅ Completado 2026-05-25
~~Agregar para_llevar / delivery / en_local.~~

Columnas `modalidad TEXT DEFAULT 'en_local'` en `ordenes` y `reservas`. Columnas `para_llevar_activo` y `delivery_activo` en `restaurantes`. Órdenes solo admiten `en_local`/`para_llevar` (delivery no aplica — el cliente está físicamente presente). Reservas admiten las 3 modalidades según configuración del restaurante. Flujo de estados diferenciado: `para_llevar`/`delivery` saltan `es_entregado` (órdenes) y `es_cliente_llego` (reservas). Badges visuales en Kanban, tarjetas de órdenes y reservas. Selectores de modalidad en `menu.html` (radio buttons según URL). Configuración activar/desactivar modalidades desde panel Configuración del owner. 22 tests en `tests/modalidades.test.js`.

#### ~~Vista unificada "Cola del día" — órdenes + reservas juntas (Gap 2)~~ ✅ Completado 2026-05-23

Panel Kanban en `owner.html` con 4 tabs: **Pendientes / En Cocina / Listos / Por cobrar**.
- Órdenes y reservas clasificadas por flag semántico en cada zona
- Badge con conteo por tab + badge total en nav
- Botones de acción rápida por tarjeta y zona (sin cambiar de panel)
- Polling automático cada 15 s
- Flag `es_entregado` agregado a órdenes: Listos → "🍽 Entregar" → Por cobrar → "💰 Cobrar"
- Reservas: "🍽 Entregado" = cliente llegó + sentó + plato entregado (un solo paso, evita olvido en hora pico)
- 15/15 casos de prueba manual aprobados

#### ~~Agregar para delivery / recoger / comer ahí en reservas~~ ✅ Cubierto por Gap 4 (modalidades) — 2026-05-25

#### ~~Bug: reservas con roles de usuario~~ ✅ Resuelto 2026-05-25
7 endpoints usaban `authorize('owner','mozo')` en vez de `authorizePermiso()`. Un cocinero con permiso `reservas_activas` recibía 403 al intentar confirmar/cambiar estatus. Ver ISS-012.

#### ~~Cancelar reserva desde el lado del cliente~~ ✅ Completado 2026-07-09
El cliente ahora puede cancelar su propia reserva desde `menu.html` con su código, sin necesidad de llamar al restaurante.

- **Backend:** `PATCH /api/public/reserva/:codigo/cancelar` (`routes/public.js`) — valida que la reserva no esté ya `es_full`/`es_cancelado` (misma regla que el endpoint del owner), reutiliza `devolverStock`/`itemsMenuDeReserva` de `utils/stock.js` para devolver el stock reservado.
- **Ventana de tiempo:** nueva columna `restaurantes.minutos_cancelacion_reserva` (default **30**, migración idempotente en `config/database.js`), configurable por el owner. Función pura `dentroDeVentanaCancelacion(fecha, hora_llegada, minutosLimite, ahora)` en `utils/cancelacionReserva.js` — bloquea la cancelación si faltan menos minutos que el límite para la `hora_llegada`. **Si la reserva no tiene hora_llegada** (el cliente no la especificó), se permite cancelar en cualquier momento — decisión del usuario, ya que sin hora exacta no se puede calcular "faltan N minutos".
- **Config del owner:** nueva card "✗ Cancelación de reservas por el cliente" en el panel Configuración (`owner.html` + `public/js/modules/config.js`), mismo patrón que "Auto-preparación de reservas". Nuevo endpoint `PATCH /api/menu/config/minutos-cancelacion-reserva` (0–1440 min) + incluido en `GET /api/menu/restaurante/config`.
- **Frontend cliente:** botón "✗ Cancelar reserva" en `renderEstadoReserva()` de `menu.html`, oculto cuando el estado ya es `es_full`/`es_cancelado`, con `confirm()` antes de enviar.
- **Tests:** `tests/cancelar-reserva-cliente.test.js` (7 casos: sin hora → siempre permitido, dentro/fuera de ventana, borde exacto, hora ya pasada, límite 0, devolución de stock real). **248/248 jest verde.**
- Verificado manualmente contra el servidor local (curl): crear reserva → cancelar sin hora (OK) → cancelar ya cancelada (bloqueado) → hora dentro de la ventana (bloqueado con mensaje) → hora fuera de la ventana (OK) → código inexistente (404).

#### ~~Fix: flujo de pago inseguro (foto opcional + "pagar más tarde" sin retorno + confirmación manual muerta)~~ ✅ Completado 2026-07-09
Diagnóstico completo y flujo real documentado en `flujo-pago.md`. Tres problemas encontrados en la misma sesión, los dos primeros reportados por el usuario y el tercero detectado al investigar:
1. La foto del comprobante era opcional en `handlePago()` (`routes/public.js`) — el cliente podía marcar "Ya pagué con Yape" sin adjuntar nada.
2. El botón "Pagar más tarde" (`skipPago()` en `menu.html`) cerraba el flujo sin registrar ningún dato y sin dejar forma de volver a pagar — no estaba contemplado en `vision_negocio.md`.
3. El endpoint `PATCH /:id/confirmar-pago` (orders.js y reservations.js) existía en el backend pero **no estaba conectado a ningún botón** — el único control real del owner era "💰 Cobrar/Completar", que pisaba `estado_pago = 'pagado'` sin mirar nunca el comprobante.

**Decisión del usuario:** eliminar "Pagar más tarde" por completo — Efectivo ya cubre el caso legítimo de pago diferido.

**Fix:**
- `routes/public.js`: `handlePago()` rechaza (400) pagos yape/plin sin foto.
- `utils/verificacionPago.js` (nuevo): `requiereConfirmarPagoAntes(metodo_pago, estado_pago)` — true solo para yape/plin no confirmados.
- `routes/orders.js` / `routes/reservations.js`: `PATCH /:id/estatus` bloquea (400) la transición a `es_pagado`/`es_full` si el pago digital no fue confirmado.
- `public/menu.html`: botón "Pagar más tarde" y `skipPago()` eliminados; `enviarPago()` valida la foto en cliente antes de enviar.
- `public/js/modules/ordenes.js`, `reservas.js`, `pedidos.js`: nuevo botón "✓ Confirmar pago" (llama al endpoint ya existente `confirmar-pago`) que reemplaza a "💰 Cobrar/Completar" mientras el pago digital no esté confirmado.
- **Tests:** `tests/verificacion-pago.test.js` (6 casos sobre la función pura). **254/254 jest verde.**
- Verificado manualmente contra el servidor local con `curl` (JWT firmado localmente para simular sesión de owner): yape sin foto → 400; yape con foto → OK; completar sin confirmar → 400 con mensaje claro; confirmar pago → OK; completar tras confirmar → OK.

---

### ~~Prioridad Alta~~

#### ~~Landing page pública — menupro.tech~~ ✅ Completado 2026-05-28

`public/landing.html` — 7 secciones (Hero, Problema, Tutorial, Features, Quién lo hace, FAQ, CTA final).
Tailwind CDN + mobile-first. Ruta `/` en Express. Screenshots reutilizados del bot (sin capturas manuales).
CTA de WhatsApp con número `51921340185` y mensaje predeterminado. Sin precio en la página.

#### ~~Pruebas de carga (k6)~~ ✅ Completado 2026-05-27

Scripts en `scripts/k6-load-test.js` (30 VUs, rampa gradual) y `scripts/k6-stress-test.js` (hasta 500 VUs, punto de quiebre).
Análisis documentado en `deploy.md` sección 13. Resultado: degradación comienza ~150 VUs en laptop de desarrollo, ~80 VUs en VPS $6.

#### ~~Panel Admin — Descargas Excel por restaurante~~ ✅ Completado 2026-05-26

3 endpoints export en `routes/admin.js` (reutilizan `sumarGanancias`, `gananciasTimeline`, `clientesTimeline`):
- `GET /api/admin/restaurantes/:id/reportes/resumen/export` → Excel con 8 métricas (órdenes, reservas, ganancias total/mes/semana/hoy)
- `GET /api/admin/restaurantes/:id/reportes/clientes-timeline/export?intervalo=` → Excel curva de demanda
- `GET /api/admin/restaurantes/:id/reportes/ganancias/export?intervalo=` → Excel ganancias por período

Botones "⬇ Excel" en cada tab del drawer de stats. Mismo sistema de diseño que reportes.js (fila restaurante oscura, título naranja, encabezados crema, filas alternas blanco/azul, totales en pie). Archivo con nombre del restaurante incluido (`resumen_kacina_menu_2026-05-26.xlsx`).

#### ~~Panel Admin — Estadísticas por restaurante~~ ✅ Completado 2026-05-25

Panel lateral deslizable en `admin/dashboard.html` con 3 tabs: **Resumen / Demanda / Ganancias**.
- Botón 📊 Stats en cada fila de la tabla de restaurantes
- **Resumen:** stat cards (órdenes totales/hoy, reservas totales/hoy, ganancias total/mes/semana/hoy)
- **Demanda:** gráfica de línea Chart.js (órdenes + reservas por período), selector Día/Semana/Mes
- **Ganancias:** gráfica de línea Chart.js (ganancias en el tiempo), selector Día/Semana/Mes
- Helpers `sumarGanancias`, `gananciasTimeline`, `clientesTimeline` exportados desde `routes/reportes.js` y reutilizados en `routes/admin.js`
- 4 nuevos endpoints: `/restaurantes/:id/reportes/resumen`, `/clientes-timeline`, `/ganancias/resumen`, `/ganancias/timeline`

---

#### ~~Rediseño premium Opus 4.8 (carpeta `RestSaasPro`)~~ ✅ Completado 2026-05-29

Clon de `RestSaas` elevado a nivel "Opus 4.8": mejores gráficos, dark mode, micro-interacciones, sin cambios en backend.

| Fase | Qué | Resultado |
|------|-----|-----------|
| 0 | Clonar repo + `npm install` + baseline tests | 197/197 verde |
| 1 | Sistema de diseño en `public/css/owner.css`: tokens completos, dark mode `data-theme` + `prefers-color-scheme`, sombras en capas, skeletons, bottom-nav CSS listo | ✅ Cero ruptura — todos los selectores originales preservados |
| 2 | Owner panel: toggle 🌙/☀️ + anti-flash + bottom-nav móvil con 5 destinos (Cola/Cocina/Reservas/Menú/Más), espejo de permisos sidebar→bottom-nav, badges via `MutationObserver` | ✅ |
| 3 | Gráficos premium: `charts-theme.js` (degradados, fuente Lato, tooltips redondeados); endpoints **A1** `GET /api/reportes/kpis` (ticket promedio + tasa cancelación), **A2** `GET /api/reportes/hora-pico`, **A3** ya cubierto por A1 | ✅ Verificado en vivo |
| 4 | `menu.html` (cara del comensal): CSS extraído a `public/css/menu.css` (~736 líneas con tokens compartidos), dark mode auto sin toggle, hero con efecto ken-burns, header sticky con shrink al scroll, skeleton loaders, modal de foto al tap (`role="dialog"` + `aria-modal`), drawer del carrito repulido, código de reserva con animación `pulse-glow`, touch targets ≥44px garantizados, `prefers-reduced-motion` respetado | ✅ |
| 5 | Auditoría 360px (cero overflow, cero font-sizes problemáticos, 0 inputs sin type, 0 imgs sin alt) + accesibilidad mínima (modal con role/aria) + smoke test E2E (login → menú público → orden → reserva con código → consulta) + docs (`status.md`, `features.md`, `deploy.md`) | ✅ |
| 6 | Rediseño **"Pro Console"** del super admin (`admin/dashboard.html` + `admin/login.html`): nueva identidad **slate + índigo-violeta** distinta de la del owner; Inter + JetBrains Mono + Syne; sidebar con backdrop-blur y brand-dot animado; stat cards con gradient text + hover lift; tablas con datos mono tabular-nums; bottom-nav móvil de 5 destinos sin "Más"; skeletons en grid y tablas; charts con paleta nueva (`charts-theme-admin.js`); modales con `modalPop` + glow del accent; copy "Menú Pro" en lugar de "Restaurant SaaS" | ✅ |
| 7 | Rediseño premium de `landing.html` + `manuales.html` (cara pública del producto) | ✅ Completado 2026-05-29 |

---

#### Fase 7 ✅ COMPLETADA 2026-05-29 — Rediseño premium de landing.html + manuales.html

**Resultado:** landing + manuales repintados a terracota `#c8692a` (coherencia total con owner/menu). Ejecutado todo el TODO sin tocar copy ni screenshots.
- **7.1** Repaint terracota: `brand {light:#fdf0e8, DEFAULT:#c8692a, dark:#a0521e}` + var `--brand-glow`. 0 referencias a `#f97316` / `orange-*` (verificado en HTML servido). `bg-orange-50` → `bg-brand-light`.
- **7.3** Hero premium: `.gradient-mesh` (3 radiales terracota/violeta/azul con `mix-blend-mode:screen` + blur), `.hero-phone` flotante `rotate(-3deg)` + `@keyframes float 6s` con glow del producto detrás (`::before` blur 80px). Screenshot real del bot intacto dentro del frame.
- **7.4** CTA secundario **"Ver demo en vivo"** → `/menu?restaurante=1&mesa=1` en hero y CTA final. Documentado en `deploy.md §10.1` (restaurante demo sembrado para prod).
- **7.5** Animaciones on-scroll: `IntersectionObserver` añade `.in-view` a cada `<section class="reveal">`; stagger en cards vía `--i` + `@keyframes rise`. Fallback: si no hay IO o `reduce`, todo visible.
- **7.6** Nav glassmorphism (`rgba(17,24,39,0.7)` + `backdrop-filter blur(14px)`) + `.nav-shrunk` al pasar 80px (wiring `requestAnimationFrame`).
- **7.7** FAQ semántico: `<input type=checkbox>` → `<details>/<summary>` con chevron rotado en `[open]` y `@keyframes faqOpen`.
- **7.8** Cards Problema/Features/FAQ con `.card-lift` (`translateY(-3px)` + sombra en `:hover` y `:active` para feedback táctil).
- **7.9** Footer ampliado: mini-logo, WhatsApp icon, Contacto (mailto), Manuales, Ingresar, año dinámico, "Hecho en Perú 🇵🇪".
- **7.10** `manuales.html` repintado: paleta terracota, nav glassmorphism, tabs pill estilo owner (`box-shadow` glow al activarse), header con badge dinámico del rol ("Manual del cocinero…") + título en Playfair, glow radial de fondo, blockquote/links/imgs en terracota, footer con "← Volver". marked.js intacto.
- **7.11** Verificación en vivo (PORT 3310): `/` 200, `/manuales` 200, `/menu?restaurante=1&mesa=1` 200, 6/6 screenshots 200, 4/4 manuales por rol 200. HTML servido confirma terracota, gradient-mesh, hero-phone, IntersectionObserver, nav-shrunk, `<details>`, "Ver demo en vivo", reduced-motion, footer Contacto. **0 referencias residuales a `#f97316`.**
- `prefers-reduced-motion` respetado en ambos archivos.

<details><summary>Plan original (archivado)</summary>

##### Fase 7 (plan) — Rediseño premium de landing.html + manuales.html

**Contexto del estado actual:**
- `public/landing.html` (570 líneas) — 7 secciones (Nav, Hero, Problema, Tutorial, Features, Quién, FAQ, CTA, Footer) con Tailwind CDN, color `brand: #f97316` (orange-500), fuente Inter, screenshots reales del bot. Funcional pero **rompe consistencia de marca** con el owner panel (terracota `#c8692a`).
- `public/manuales.html` (222 líneas) — renderiza los 4 manuales `.md` con marked.js, mismo estilo Tailwind básico.

**Limitaciones detectadas:**
1. Paleta naranja brillante (`#f97316`) ≠ terracota del owner (`#c8692a`) — la landing se siente "otro producto"
2. Sin animaciones de entrada (todo aparece simultáneo)
3. Hero estático, phone frame quieto sobre `bg-gray-900` plano
4. **No hay demo viva** — el visitante solo ve screenshots, no puede tocar el menú real
5. FAQ con checkbox hack (`<input type="checkbox">`) — funciona pero sin semántica
6. Sin dark mode ni glassmorphism en nav
7. CTA único hacia WhatsApp, sin variante secundaria

**Objetivo Fase 7:** llevar la landing al mismo nivel que owner+menu+admin sin tocar copy, estructura de secciones, ni screenshots actuales del bot.

**TODO list propuesto:**

| # | Tarea | Detalle | Riesgo |
|---|-------|---------|--------|
| 7.1 | **Repaint a paleta terracota del owner** | Reemplazar `brand: '#f97316'` (Tailwind config inline) por `brand: '#c8692a'` con scale completa (`light: #fdf0e8`, `DEFAULT: #c8692a`, `dark: #a0521e`, `glow: rgba(200,105,42,0.28)`). Auditar todos los `bg-orange-*`, `text-orange-*`, `border-orange-*` y reemplazarlos por la nueva escala. | Bajo |
| 7.2 | **Mantener Tailwind CDN** (decisión) | CLAUDE.md permite Tailwind en módulos nuevos. Más rápido y la landing es marketing aislado. Si en el futuro se quiere extraer a CSS custom, queda como deuda baja. **No mezclar Tailwind con `public/css/owner.css` en este archivo** — landing es independiente. | Bajo |
| 7.3 | **Hero premium** | Añadir gradient mesh (3-4 radial-gradients superpuestos en violeta/terracota/azul con `mix-blend-mode: screen`), phone frame con `transform: rotate(-3deg) translateY(0)` + animación `float 6s ease-in-out infinite` (ya-yó subtle), glow del producto detrás del phone (`box-shadow` con blur 80px del color brand). **Mantener screenshot real del bot dentro del frame**, no mockup. | Medio |
| 7.4 | **CTA secundario "Ver demo en vivo"** | Botón nuevo al lado de "Probar gratis" en hero y CTA final. Link a `/menu?restaurante=1&mesa=1`. Asumir que en producción habrá un restaurante demo (slug `demo` o id sembrado por seeder de prod). En dev usa el id=1 del seeder. **Importante**: documentar en `deploy.md §10` que hay que crear un restaurante "demo" con menú/carta pre-sembrado para que el botón funcione en prod. | Bajo |
| 7.5 | **Animaciones on-scroll** | Bloque `<script>` con `IntersectionObserver` que añade clase `.in-view` a cada sección al entrar en viewport. CSS: `section { opacity: 0; transform: translateY(20px); transition: .6s cubic-bezier(.16,1,.3,1) }` `section.in-view { opacity: 1; transform: translateY(0) }`. Stagger entre tarjetas usando `transition-delay: var(--i, 0) * .08s`. Respetar `prefers-reduced-motion`. | Bajo |
| 7.6 | **Nav glassmorphism + shrink** | `bg-gray-900/95` → `bg-gray-900/70 backdrop-blur-md`. Al pasar 80px de scroll, agregar clase `.nav-shrunk` que reduzca padding vertical y opacidad del border. Wiring con `requestAnimationFrame`. | Bajo |
| 7.7 | **FAQ con `<details>`** | Reemplazar el truco `<input type=checkbox>` + `~` selector por `<details><summary>…</summary>…</details>` semántico. Custom CSS: `summary::-webkit-details-marker { display: none }`, chevron con `details[open] summary .faq-chevron { transform: rotate(180deg) }`. Animación de altura via `interpolate-size: allow-keywords` (con fallback). | Bajo |
| 7.8 | **Tarjetas con hover lift** | Las cards de Features, Tutorial y Problema reciben `transition: transform .25s, box-shadow .25s; :hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.10) }`. Touch-friendly: el lift también se activa en `:active` para feedback en mobile. | Bajo |
| 7.9 | **Footer con socials + branding** | Agregar bloque con WhatsApp icon link, email de contacto, copyright, y mini-logo. Tono `bg-gray-950 text-gray-500`. | Bajo |
| 7.10 | **Repulir `manuales.html`** | Misma paleta terracota. Tabs de rol con la estética del owner (pills con `box-shadow accent-glow` al activarse). Hero compacto con nombre del manual seleccionado en Playfair. Botón "← Volver" link a `/`. Mantener marked.js render del .md. | Bajo |
| 7.11 | **Verificación en vivo** | Levantar server, abrir `/` en viewport 360px y 1280px, scroll completo, click en "Demo en vivo", abrir `/manuales`, click en cada tab de rol. Verificar que `prefers-reduced-motion` desactiva animaciones. | Bajo |
| 7.12 | **Docs Fase 7** | Anotar en `status.md` con detalle de cambios + marcar Fase 7 ✅ en tabla. Actualizar tabla en `features.md`. | Bajo |

**Decisiones clave para la próxima sesión:**
1. **Tailwind se queda** en la landing (decisión simple, no extraer a CSS custom).
2. **No tocar copy** — Hero, secciones, FAQ y CTA text quedan idénticos.
3. **No regenerar screenshots** — los del bot actuales son auténticos y suficientes.
4. **El restaurante "demo"** que necesita "Ver demo en vivo" en producción se documenta como tarea operativa en `deploy.md §10` (crear restaurante con slug `demo`, sembrar menú simple, dejar mesa 1 fija).
5. **Coherencia con admin** — el admin tiene su propia identidad (índigo-violeta) que es intencional. La landing usa terracota porque la audiencia es el owner del restaurante (no el operador).

**Tiempo estimado:** 1 sesión (~2 horas) si se sigue el TODO al pie de la letra.

**Bloqueante:** nada. Es polish puro de cara pública. No afecta deploy del backend.

**Fix paralelo durante Fase 5:** desactivado `upgrade-insecure-requests` en CSP de Helmet (`app.js`) — Chrome trataba IP de LAN como insegura y rompía POSTs en HTTP. Localhost no se veía afectado porque es secure context. Documentado en `deploy.md §8.2` con nota para reactivar en producción HTTPS.

**Setup desde laptop nueva (post-clone):**
1. `npm install` + `npx playwright install chromium` (si vas a correr el bot)
2. Generar `.env` con VAPID keys: `node -e "const w=require('web-push');console.log(w.generateVAPIDKeys())"` + `JWT_SECRET` aleatorio
3. Bootstrap inicial: script inline que crea `restaurantes id=1` (Crisolito) + admin `admin@local / Admin2026!`
4. `npm run bot:setup` → usuarios `owner@bot.com / cocina@bot.com / mozo@bot.com` (pass `BotMenuPro2026!`)
5. `node scripts/seed-demo-data.js` → menú del día + carta + mesas + 6 reservas y 5 órdenes en todos los flags del kanban (idempotente para el día actual)

</details>

---

### Prioridad Media

#### ~~Sección `/manuales` en la landing page~~ ✅ Completado 2026-05-28

~~Los 4 manuales `.md` generados por el bot deben renderizarse como páginas web en la landing.~~

- `public/manuales.html` — 4 tabs (Dueño, Cocinero, Mozo, Cliente), renderizado client-side con `marked.js` CDN
- Endpoint `GET /api/manuales/:rol` sirve el `.md` correspondiente
- Screenshots servidos en `/bot-screenshots/` desde `landing/bot/output/screenshots/`
- Mobile-first, mismo sistema de diseño de la landing
- Enlace en nav y footer de `landing.html`
- **Pendiente futura:** enlace desde botón `?` dentro de la app

#### Refactorización: JS inline → archivos externos
Actualmente todo el JavaScript de `owner.html`, `menu.html`, `kitchen.html` y `admin/dashboard.html` está inline dentro del HTML. Moverlo a archivos `.js` separados mejora mantenibilidad y rendimiento, pero **no es un tema de seguridad**.

##### Por qué NO es un problema de seguridad
El JS que corre en el navegador siempre es público — inline o en archivo separado, el usuario puede verlo igual en DevTools. Las rutas de la API que aparecen en el código tampoco son un secreto: la seguridad real viene del backend (JWT en cookie httpOnly + `authorizePermiso()` en cada endpoint). Lo que sí sería un problema es poner secrets en el frontend (como una `secret_key` de Culqi), y eso debe evitarse siempre independientemente de dónde esté el JS.

##### Por qué SÍ vale hacerlo (mantenibilidad y rendimiento)
- Los archivos `.js` externos los cachea el navegador → menos datos transferidos en recargas
- HTML más limpio y legible
- Posibilidad de usar un bundler (Vite, esbuild) en el futuro para minificación y tree-shaking
- Facilita testing unitario de funciones JS sin cargar el HTML completo
- Prepara el terreno para migrar a un framework (Vue, React) si el proyecto crece

##### Alcance
- Extraer el bloque `<script>` de cada HTML a su archivo par: `owner.js`, `menu.js`, `kitchen.js`, `admin-dashboard.js`
- Servir como estáticos desde `public/js/`
- Sin cambios en backend ni en lógica — es refactorización pura
- Complejidad: media (mecánica pero extensa — los scripts son grandes)
- **Hacer al final**, antes de producción, una vez que las features estén estables

#### Inventario / control de stock
Permitir al owner marcar un plato de carta como "sin stock" (activo=0 ya existe, pero no hay flujo claro ni alerta). Extender a un sistema básico de stock por plato: cantidad disponible, alerta cuando llega a cero, ocultado automático del menú QR.
- **Alcance:** columna `stock INTEGER DEFAULT NULL` en `platos_carta`, endpoint PATCH, indicador en `owner.html` y ocultado condicional en `menu.html`


---

### Prioridad Baja

#### Pagos integrados (Yape, Plin y tarjeta)
Permitir que los clientes paguen su orden o reserva directamente desde `menu.html`, y que el owner gestione y confirme los pagos desde `owner.html`. Convierte el sistema en un POS completo adaptado al mercado peruano.

##### Modelo de funcionamiento
Cada restaurante configura sus propios datos de cobro en el panel de Configuración. El cliente, al confirmar su pedido en `menu.html`, ve las opciones de pago habilitadas por ese restaurante y elige cómo pagar.

##### Métodos de pago

###### Yape
- **Cómo funciona:** El cliente ordena desde su propio celular, así que mostrarle un QR en pantalla no sirve (no puede escanearse a sí mismo). ⚠️ No existe un deep link web público de Yape para abrir la app con un número pre-cargado (`https://yape.com.pe/cobrar?phone=...` no es un endpoint real — se probó y da error 404). La solución actual es mostrar el número de Yape del restaurante con un **botón "Copiar número"**, igual que Plin: el cliente copia el número, abre su propia app Yape manualmente, paga y confirma. El QR como imagen solo tiene sentido en desktop (donde el cliente sí puede escanearlo con su celular) o impreso físicamente en la mesa.
- **Configuración por restaurante:**
  - Número de teléfono Yape (campo `yape_telefono TEXT`) — con esto se genera el link automáticamente, sin subir nada
  - Toggle "Habilitar Yape" (`yape_activo INTEGER DEFAULT 0`)
  - Opcional: nombre a mostrar en el botón (ej. "Yapea a El Rincón")
- **Flujo simple (sin gateway):** `menu.html` muestra botón "Pagar con Yape" → abre app → cliente paga → toca "Ya pagué" en `menu.html` → estado pasa a `pago_enviado` → owner confirma manualmente en `owner.html`. Estado: `pendiente_pago → pago_enviado → pago_confirmado`.
- **Flujo avanzado (con gateway):** Culqi o Nuvei confirman el pago automáticamente via webhook. Requiere cuenta de negocio en el gateway.

###### Plin
- **Cómo funciona:** Igual que Yape — deep link que abre la app de Plin en el celular del cliente. Soportado por BBVA, Scotiabank e Interbank. El link es del tipo `plin://pay?phone=9XXXXXXXX` o similar (cada banco puede variar; el flujo más robusto es mostrar el número y un botón que intente abrir la app con fallback a mostrar el número copiable).
- **Configuración por restaurante:**
  - Número de teléfono Plin (campo `plin_telefono TEXT`)
  - Toggle "Habilitar Plin" (`plin_activo INTEGER DEFAULT 0`)
- **Flujo:** idéntico a Yape (manual o via gateway Culqi/Nuvei).

###### Tarjeta (débito/crédito)
- **Cómo funciona:** Integración con un gateway de pagos peruano que provee el checkout embebido.
- **Gateway recomendado:** [Culqi](https://culqi.com) — gateway peruano, soporta Visa/MC/Amex/Diners + Yape + Plin. Comisión: ~3.44% + IGV. Alternativas: Izipay, Mercado Pago Perú.
- **Configuración por restaurante:**
  - `culqi_public_key TEXT` — clave pública del restaurante en Culqi (el owner la obtiene de su cuenta Culqi)
  - `culqi_secret_key TEXT` — clave secreta (se almacena encriptada, nunca se expone al frontend)
  - Toggle "Habilitar tarjeta" (`tarjeta_activa INTEGER DEFAULT 0`)
- **Flujo:** Al pagar, `menu.html` carga el widget de Culqi con la `public_key` del restaurante. El token de pago se envía al backend, que llama a la API de Culqi con la `secret_key` para cobrar. Culqi confirma o rechaza. El backend actualiza el estado de la orden.

##### Cambios en base de datos
```sql
ALTER TABLE restaurantes ADD COLUMN yape_activo      INTEGER DEFAULT 0;
ALTER TABLE restaurantes ADD COLUMN yape_telefono    TEXT    DEFAULT NULL;  -- el link se genera en frontend: https://yape.com.pe/cobrar?phone=XXXX
ALTER TABLE restaurantes ADD COLUMN plin_activo      INTEGER DEFAULT 0;
ALTER TABLE restaurantes ADD COLUMN plin_telefono    TEXT    DEFAULT NULL;
ALTER TABLE restaurantes ADD COLUMN tarjeta_activa   INTEGER DEFAULT 0;
ALTER TABLE restaurantes ADD COLUMN culqi_public_key TEXT    DEFAULT NULL;
ALTER TABLE restaurantes ADD COLUMN culqi_secret_key TEXT    DEFAULT NULL;  -- encriptada, nunca al frontend

ALTER TABLE ordenes   ADD COLUMN metodo_pago TEXT DEFAULT NULL;  -- 'yape'|'plin'|'tarjeta'
ALTER TABLE ordenes   ADD COLUMN estado_pago  TEXT DEFAULT NULL;  -- 'pendiente'|'enviado'|'confirmado'|'rechazado'
ALTER TABLE reservas  ADD COLUMN metodo_pago TEXT DEFAULT NULL;
ALTER TABLE reservas  ADD COLUMN estado_pago  TEXT DEFAULT NULL;
```
 
##### Cambios en backend
- `routes/menu.js` (o nuevo `routes/pagos.js`):
  - `GET /api/config/pagos` — devuelve métodos activos + public_key de Culqi + teléfonos/QRs (sin secret_key)
  - `POST /api/pagos/culqi` — recibe token Culqi del frontend, llama a API de Culqi con secret_key, actualiza `estado_pago`
  - `PATCH /api/orders/:id/pago` — owner confirma pago Yape/Plin manualmente
- Encriptación de `culqi_secret_key`: usar `crypto.createCipheriv` con clave en variable de entorno `ENCRYPT_KEY`

##### Cambios en frontend
- **`owner.html` → Panel Configuración → sub-sección "Métodos de pago":**
  - Toggle + número de teléfono + botón subir foto QR para Yape
  - Toggle + número de teléfono + botón subir foto QR para Plin
  - Toggle + campo "Clave pública Culqi" + campo "Clave secreta Culqi" (tipo password) para tarjeta
  - Indicador visual de qué métodos están activos
- **`menu.html` → Paso de pago (nuevo paso tras confirmar orden):**
  - Si hay métodos configurados: mostrar opciones (tabs Yape / Plin / Tarjeta)
  - Yape/Plin: mostrar QR (imagen) + número de teléfono + botón "Ya pagué" (marca `estado_pago = 'enviado'`)
  - Tarjeta: cargar widget de Culqi con `public_key` del restaurante
- **`owner.html` → Tarjeta de orden/reserva:**
  - Badge de estado de pago (`pendiente_pago`, `pago_enviado`, `confirmado`, `rechazado`)
  - Botón "Confirmar pago" para Yape/Plin pendientes
  - Historial básico de pagos filtrable por fecha en panel Órdenes > Historial

##### Complejidad y riesgos
- **Alta complejidad total.** Dividir en 3 fases:
  1. **Fase 1 — Configuración y flujo manual Yape/Plin** (complejidad media): solo UI de config + mostrar QR/teléfono en menu.html + confirmación manual por el owner. Sin gateway. Funciona para el 80% de los restaurantes peruanos hoy.
  2. **Fase 2 — Tarjeta vía Culqi** (complejidad alta): integración real con API, encriptación de secret_key, webhooks de confirmación.
  3. **Fase 3 — Confirmación automática Yape/Plin vía Culqi/Nuvei** (complejidad muy alta): requiere cuenta de negocio en el gateway por restaurante, lo cual puede ser un bloqueador comercial.
- **Riesgo de seguridad:** las `secret_key` de Culqi nunca deben exponerse. Encriptarlas en BD y solo usarlas server-side.
- **Recomendación:** empezar por Fase 1 — es lo que el 80% de los restaurantes peruanos necesita hoy y no requiere integraciones externas.

---

##### Estado actual — Fase 1 parcialmente implementada (2026-05-20)

La Fase 1 está en desarrollo. Lo que ya existe en el código:

**Base de datos (ya migrado):**
- `restaurantes`: columnas `yape_activo`, `yape_telefono`, `plin_activo`, `plin_telefono`, `efectivo_activo`
- `ordenes`: columnas `metodo_pago`, `estado_pago`, `comprobante_url`
- `reservas`: columnas `metodo_pago`, `estado_pago`, `comprobante_url`

**Backend (ya implementado):**
- `GET /api/public/restaurante/:id` → devuelve `pagos: { yape, plin, efectivo }` al cliente
- `PATCH /api/public/pago/orden/:id` → cliente registra pago con foto comprobante (multer)
- `PATCH /api/public/pago/reserva/:id` → ídem para reservas
- `PATCH /api/orders/:id/confirmar-pago` → owner confirma pago de orden
- `PATCH /api/reservations/:id/confirmar-pago` → owner confirma pago de reserva
- Panel Configuración en `owner.html`: toggles Yape/Plin/Efectivo + teléfonos

**Frontend `menu.html` (ya implementado):**
- Paso de pago tras confirmar orden/reserva: botones Yape / Plin / Efectivo
- Yape: número + botón "Copiar número" (igual que Plin — no existe deep link web público de Yape)
- Upload de foto comprobante (opcional) + preview
- Botón "Ya pagué" → `PATCH /api/public/pago/...`

**Frontend `owner.html` (ya implementado):**
- Badge visual de método de pago + miniatura de comprobante en tarjetas de orden y reserva
- ~~Botón "✓ Confirmar pago" en tarjetas de orden~~ — eliminado en REFACTOR-001; `estado_pago='pagado'` se setea automáticamente al marcar `es_pagado`
- ~~Botón "✓ Confirmar pago" en tarjetas de reserva~~ — eliminado en REFACTOR-001; `estado_pago='pagado'` se setea automáticamente al marcar `es_full`

---

##### Bugs encontrados en Fase 1 (pendientes de fix)

**Bug 1 — `fileFilter` de multer demasiado restrictivo (`routes/public.js:25-28`)**
- Solo acepta `image/jpeg`, `image/png`, `image/webp`
- Dispositivos iOS/Android pueden enviar `image/heic`, `image/heif`, `image/jpg` u otros
- Resultado: multer rechaza la foto → error 400 → el cliente no puede enviar el comprobante
- Solo efectivo funciona porque no sube archivo y multer nunca aplica el fileFilter
- **Fix:** cambiar a `file.mimetype.startsWith('image/')` para aceptar cualquier imagen

**Bug 2 — "Confirmar pago" en reservas es redundante con el estatus full** ✅ RESUELTO 2026-05-21
- ~~El botón aparece cuando `estado_pago = 'enviado'`, pero el owner ya cierra la reserva moviéndola al estatus `es_full`~~
- **Fix aplicado:** botón eliminado de tarjetas de reserva y de tarjetas de orden en `owner.html`. Al pasar a `es_full` (reservas) o `es_pagado` (órdenes), el backend setea `estado_pago = 'pagado'` automáticamente.

---

##### Prerrequisito crítico — Refactor de estatus dinámicos ✅ COMPLETADO 2026-05-21

> ~~Este refactor es BLOQUEANTE para que los pagos funcionen correctamente con estatus personalizados. Sin él, renombrar cualquier estatus desde el super admin rompe el sistema de pagos, historial y reportes.~~
>
> **Resuelto.** El sistema ahora usa flags semánticos en todas partes. Ver [REFACTOR-001](issues/REFACTOR-001-estatus-dinamicos.md).

**Concepto central:**
- `es_full` (reservas) / `es_pagado` (órdenes) = el owner confirmó el cobro → el registro pasa a **historial**
- Mientras no esté en ese estatus, la orden/reserva sigue en la **vista activa** (el dueño aún tiene que cobrarla)
- Los nombres de los estatus son libres; el backend usa **flags**, no nombres de texto

**Flags a agregar a `estatus_orden` (5 columnas nuevas):**
```sql
es_inicial   INTEGER DEFAULT 0  -- el "pendiente"   → al crear una orden/reserva
es_pagado    INTEGER DEFAULT 0  -- el "completado"  → owner cobra, cierra, va a historial
es_cancelado INTEGER DEFAULT 0  -- el "cancelado"   → va a historial sin cobro
es_en_cocina INTEGER DEFAULT 0  -- el "preparando"  → cocina lo está trabajando
es_listo     INTEGER DEFAULT 0  -- el "entregado"   → en mesa, pendiente de cobro
```

**Flags a agregar a `estatus_reserva` (3 columnas nuevas, `es_full` ya existe):**
```sql
es_inicial   INTEGER DEFAULT 0  -- el "pendiente"   → al crear una reserva
es_cancelado INTEGER DEFAULT 0  -- el "cancelada"   → va a historial sin cobro
es_confirmada INTEGER DEFAULT 0 -- el "confirmada"  → aparece en el plano de mesas
```

**Mapa completo de hardcodes a reemplazar:**

| Archivo | Línea | Hardcode actual | Reemplazar por |
|---------|-------|-----------------|----------------|
| `routes/public.js` | 221 | `nombre = 'pendiente'` (órdenes) | `es_inicial = 1` |
| `routes/public.js` | 318 | `nombre = 'pendiente'` (reservas) | `es_inicial = 1` |
| `routes/orders.js` | 44 | `IN ('pendiente','preparando','entregando')` | `es_pagado=0 AND es_cancelado=0` |
| `routes/orders.js` | 98 | `IN ('pendiente','preparando')` | `es_pagado=0 AND es_cancelado=0` |
| `routes/orders.js` | 266 | `nombre = 'pendiente'` (nueva orden desde owner) | `es_inicial = 1` |
| `routes/orders.js` | 332 | `ESTATUS_VALIDOS` array hardcodeado | validar contra BD dinámica |
| `routes/orders.js` | 346 | `completado \|\| cancelado` (inmutabilidad) | `es_pagado=1 OR es_cancelado=1` |
| `routes/orders.js` | 353 | `estatus === 'completado'` (calcular total) | `nuevoEstatus.es_pagado = 1` |
| `routes/orders.js` | 607 | `completado \|\| cancelado` (kitchen check) | `es_pagado=1 OR es_cancelado=1` |
| `routes/reservations.js` | 165 | `nombre = 'pendiente'` | `es_inicial = 1` |
| `routes/reservations.js` | 226 | `completada \|\| cancelada` | `es_full=1 OR es_cancelado=1` |
| `routes/mesas.js` | 62 | `IN ('pendiente','preparando','entregando')` | `es_pagado=0 AND es_cancelado=0` |
| `routes/mesas.js` | 73 | `er.nombre = 'confirmada'` | `er.es_confirmada = 1` |
| `routes/admin.js` | 28, 43, 83 | `eo.nombre = 'completado'` (revenue) | `eo.es_pagado = 1` |
| `routes/reportes.js` | 21, 65, 294, 317 | `e.nombre != 'cancelado'` | `e.es_cancelado = 0` |
| `config/database.js` | 349 | `e.nombre = 'completado'` (backfill) | `e.es_pagado = 1` |
| `utils/orderStatus.js` | — | mapeo `cooking→preparando`, `done→entregando` | usar flags `es_en_cocina`, `es_listo` |

**Admin — endpoints nuevos necesarios para `estatus_orden`:**
- `PATCH /api/admin/estatus-orden/:id/set-pagado` — marca este estatus como el pagado (único)
- `PATCH /api/admin/estatus-orden/:id/set-cancelado` — marca como cancelado (único)
- `PATCH /api/admin/estatus-orden/:id/set-inicial` — marca como inicial (único)
- `PATCH /api/admin/estatus-orden/:id/set-en-cocina` — marca como "en cocina" (único)
- `PATCH /api/admin/estatus-orden/:id/set-listo` — marca como "listo/entregado" (único)
- Para `estatus_reserva`: agregar `set-inicial`, `set-cancelado`, `set-confirmada` (equivalentes al ya existente `set-full`)

**Archivos a tocar:** `config/database.js`, `routes/orders.js`, `routes/reservations.js`, `routes/public.js`, `routes/mesas.js`, `routes/admin.js`, `routes/reportes.js`, `utils/orderStatus.js` — total ~20 cambios en 8 archivos.

#### Notificaciones WhatsApp (owner, staff y cliente)
Enviar mensajes automáticos de WhatsApp al dueño, al staff seleccionado y/o al cliente según el evento. El owner activa/desactiva cada tipo de notificación desde el panel de Configuración.

##### Casos de uso
| Evento | Destinatario | Mensaje sugerido |
|--------|-------------|-----------------|
| Nueva orden creada | Owner / cocinero asignado | "🍽 Nueva orden #123 — Mesa 4 — Juan Pérez" |
| Nueva reserva creada | Owner | "📅 Nueva reserva #45 — 3 personas — Viernes 23/05 20:00 — María López" |
| Reserva confirmada | Cliente | "✅ Tu reserva fue confirmada. Te esperamos el viernes 23/05 a las 20:00 hs." |
| Reserva cancelada | Cliente | "❌ Lamentamos informarte que tu reserva fue cancelada. Contáctanos para reprogramar." |
| Orden completada (pago) | Owner | "💰 Orden #123 completada — Total: S/ 85.00" |

##### Infraestructura requerida
- **Proveedor:** Twilio WhatsApp API (necesita número de WhatsApp Business aprobado por Meta) o WhatsApp Business Cloud API directa (Meta for Developers). La Cloud API directa es gratuita hasta cierto volumen mensual; Twilio cobra por mensaje pero simplifica la integración.
- **Cuenta y aprobación:** El dueño del restaurante necesita un número de WhatsApp dedicado verificado. Meta puede tardar días en aprobar el número y las plantillas de mensajes.
- **Plantillas (templates):** WhatsApp Business solo permite enviar mensajes iniciados por la empresa si usan plantillas pre-aprobadas por Meta. Hay que crear y registrar cada plantilla de mensaje en el Business Manager.

##### Cambios en base de datos
- Nueva tabla `notificaciones_config` (o columna JSON `notif_config` en `restaurantes`):
  ```
  id_restaurante, evento, activo, destinatarios (owner|staff|cliente), telefono_owner
  ```
- Columna `telefono` en `usuarios` para los staffs que reciben notificaciones.

##### Cambios en backend
- Nuevo `utils/whatsapp.js` con función `enviarWpp(telefono, template, params)` que llama a la API de Twilio/Meta.
- Variables de entorno: `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_WPP_FROM` (o `META_WPP_TOKEN`, `META_PHONE_ID`).
- Trigger en `POST /api/orders` → notificar al owner/cocinero si `activo = 1`.
- Trigger en `POST /api/reservations` → notificar al owner.
- Trigger en `PATCH /api/reservations/:id` cuando cambia a `confirmada` → notificar al cliente.
- Trigger en `PATCH /api/reservations/:id` cuando cambia a `cancelada` → notificar al cliente.
- Manejo de errores silencioso: si el envío falla, la orden/reserva igual se crea; el error solo se loguea.

##### Cambios en frontend (`owner.html`)
- Sub-panel "Notificaciones" dentro del panel Configuración.
- Toggle por evento (nueva orden, nueva reserva, reserva confirmada, etc.).
- Input para ingresar el número de WhatsApp del owner (con prefijo de país).
- Selección de qué usuarios del staff reciben notificaciones de órdenes.
- Indicador de estado de la integración (configurada / sin configurar).

##### Complejidad y riesgos
- Alta complejidad total: cuenta externa, aprobación de Meta, plantillas por evento, manejo de errores de red, costos por mensaje, número de teléfono dedicado.
- Riesgo de latencia: las llamadas a la API de Twilio/Meta deben hacerse de forma asíncrona para no bloquear la respuesta al cliente.
- Recomendación de implementación: empezar con notificación de "nueva orden al owner" únicamente, probar el flujo completo, y luego extender a los demás eventos.

#### Descuentos y promociones
Permite aplicar descuentos porcentuales o fijos a una orden antes de cerrarla (happy hour, cupones, etc.).
- **Alcance:** campo `descuento` en `ordenes`/`reservas`, lógica de recalculo en `utils/totales.js`, UI en vista del mozo/owner

---

## Roadmap — Features propuestas 2026

### Tier A — Alto impacto, bajo esfuerzo

#### ~~A1 — Ticket promedio por restaurante~~ ✅ Completado 2026-05-29 (Fase 3 Opus 4.8)
Implementado en `GET /api/reportes/kpis` (panel owner). Stat-card "Ticket promedio" en Reportes muestra `SUM(total) / COUNT(*)` combinado de órdenes + reservas pagadas/completas del mes corriente. Pendiente: replicar también en el drawer admin por restaurante (queda como mejora menor).

#### ~~A2 — Hora pico de demanda~~ ✅ Completado 2026-05-29 (Fase 3 Opus 4.8)
Implementado en `GET /api/reportes/hora-pico` (panel owner). Gráfico de barras apiladas por hora del día (zona Lima UTC-5), órdenes + reservas, agrupado con `strftime('%H', created_at, '-5 hours')`. Card "Hora pico" en panel Reportes. Pendiente: replicar también en el drawer admin (mejora menor).

#### ~~A3 — Tasa de cancelación~~ ✅ Completado 2026-05-29 (Fase 3 Opus 4.8)
Implementado en el mismo endpoint `GET /api/reportes/kpis`: devuelve `tasa_cancelacion` y `total_pedidos_mes`. Stat-card "Tasa de cancelación" en Reportes con código de color (rojo > 15%, amarillo 8-15%, verde < 8%). Pendiente: alerta visual en drawer admin si supera el 15% (mejora menor).

#### A4 — Platos más vendidos en admin
El owner ya tiene el análisis de pedidos por plato. El admin debería poder verlo por restaurante desde el drawer, para entender qué producto mueve a cada negocio.
- **Backend:** reutilizar `contarPedidosPorPlato` de `reportes.js` con ID explícito, nuevo endpoint admin
- **Frontend:** tab adicional "Platos" en el drawer de stats del admin
- **Complejidad:** baja (reutiliza lógica existente)

---

### Tier B — Impacto medio, esfuerzo medio

#### B1 — CRM básico por teléfono
Historial de un cliente (número de teléfono) en el sistema: cuántas veces ha venido, cuánto ha gastado, qué platos pide. Accesible desde la tarjeta de reserva/orden con un botón "Ver cliente" cuando hay teléfono registrado.
- **Backend:** nuevo endpoint `GET /api/clientes/:telefono` que agrega reservas + órdenes por teléfono
- **Frontend:** modal/drawer en `owner.html` con historial del cliente
- **Complejidad:** media (query multi-tabla, UI nueva)

#### B2 — Programación de menús por semana
El owner prepara los menús de los próximos días desde hoy (lunes configura lunes-viernes). Hoy solo existe el menú del día activo; no hay forma de preparar el del mañana sin cambiar la fecha.
- **Backend:** el campo `dia` en `menus_dia` ya existe — agregar vista de calendario semanal en owner.html y permitir crear menús para fechas futuras
- **Frontend:** tab "Semana" en panel Menú del día; mini-calendario de 7 días
- **Complejidad:** media (cambio de UX, sin cambios de schema)

#### B3 — Comparativa entre restaurantes (admin)
Tabla de ranking en el admin mostrando todos los restaurantes ordenados por revenue, órdenes, ticket promedio o tasa de cancelación. Útil para ver quién crece y quién está estancado o necesita atención.
- **Backend:** extender `GET /api/admin/restaurantes` con columnas de ticket promedio y tasa cancelación
- **Frontend:** cabeceras de tabla clickeables para ordenar; indicadores visuales de tendencia
- **Complejidad:** media (sorting en frontend, queries adicionales en backend)

#### B4 — Cambio de contraseña propio ✅ Completado 2026-05-26
`PATCH /api/auth/me/password` — verifica contraseña actual con bcrypt. Modal en sidebar footer de `owner.html` con 3 campos (actual, nueva, confirmar). Aplica a todos los roles.

#### B4b — Recuperación de contraseña (olvidé mi contraseña)

**Estado actual — sin self-service:**

| Caso | Solución disponible hoy |
|------|------------------------|
| Mozo/cocinero olvidó su contraseña | El **owner** la resetea desde panel Usuarios → botón "Cambiar contraseña" |
| Owner olvidó su contraseña | El **admin de Menú Pro** la resetea desde el panel Admin → tabla de usuarios del restaurante → `PATCH /api/usuarios/:id/password` |
| Admin olvidó su contraseña | Acceso directo a la base de datos SQLite: `UPDATE usuarios SET password_hash = ? WHERE rol = 'admin'` con un hash generado por bcrypt |

No existe flujo automático "olvidé mi contraseña" con email. El owner debe contactar a soporte de Menú Pro.

**Cuándo implementarlo:** cuando el volumen de restaurantes haga que el reset manual sea un cuello de botella para soporte. Requiere configurar SMTP (SendGrid, Resend, etc.) y tabla `password_reset_tokens` con TTL.

**Para implementar:**
- Tabla `password_reset_tokens (id, id_usuario, token_hash, expires_at, usado)`
- `POST /api/auth/forgot-password` — genera token + envía email (link con token)
- `POST /api/auth/reset-password` — valida token, cambia hash, invalida token
- Pantalla `forgot.html` con formulario de email
- Variables de entorno: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `APP_URL`

#### B4c — Protección avanzada contra fuerza bruta

**Estado actual — protección básica por IP:**
- ✅ `loginLimiter` en `routes/auth.js`: **10 intentos en 15 min** por IP → HTTP 429 con mensaje en español
- ✅ Rate limit global en `/api/auth/*`: **20 req/15 min** por IP (app.js)
- ❌ No hay bloqueo por cuenta (si el atacante rota IPs, puede seguir intentando)
- ❌ No hay alerta al owner/admin cuando se detectan intentos fallidos
- ❌ Los valores están hardcodeados — no son configurables desde variables de entorno

**Configuración desde el servidor de deploy:** los límites actuales están en el código. Para hacerlos configurables sin tocar el código, agregar al `.env`:
```
LOGIN_MAX_ATTEMPTS=10
LOGIN_WINDOW_MINUTES=15
```
Y en `routes/auth.js`:
```js
max:       parseInt(process.env.LOGIN_MAX_ATTEMPTS  || '10'),
windowMs:  parseInt(process.env.LOGIN_WINDOW_MINUTES || '15') * 60 * 1000,
```

**Para implementar protección completa (bloqueo por cuenta + alerta):**
- Tabla `login_attempts (id, email, ip, created_at, exitoso)` — registra cada intento
- Bloquear cuenta N minutos tras X fallos consecutivos por email (independiente de IP)
- `POST /api/auth/login`: si cuenta bloqueada → HTTP 423 "Cuenta bloqueada hasta HH:MM"
- Alerta: Web Push o email al owner cuando su restaurante tiene más de Y intentos fallidos en Z minutos
- Complejidad: media. Bloqueo por cuenta es el paso prioritario; alerta es opcional.

#### B5 — Historial del cliente por código de reserva
Desde `menu.html`, el cliente puede ver sus reservas anteriores buscando por número de teléfono (no solo el código actual). Muestra las últimas N reservas, su estado y el total gastado.
- **Backend:** nuevo endpoint público `GET /api/public/cliente/:telefono` con historial limitado
- **Frontend:** nueva sección en la pantalla de "Consultar mi reserva" en `menu.html`
- **Complejidad:** media (endpoint nuevo, UI existente extendida)

---

### Tier C — Estratégico, mayor esfuerzo

#### C1 — Planes / tiers SaaS
Definir niveles de servicio: básico (1 usuario, sin reportes Excel), pro (5 usuarios, reportes), premium (usuarios ilimitados, API, soporte). Control desde el admin para asignar plan a cada restaurante y limitar features según el plan activo.
- **Schema:** columna `plan TEXT DEFAULT 'basico'` en `restaurantes`; tabla `planes` con límites
- **Backend:** middleware `checkPlan()` que bloquea endpoints según plan activo
- **Frontend:** badge de plan en tabla de restaurantes admin; modal de upgrade desde `owner.html`
- **Complejidad:** alta (transversal a todo el sistema)

#### C2 — Inventario básico / alertas de stock
Más allá del toggle "agotado" actual: cantidad disponible por plato de carta, alerta automática cuando llega a cero, descuento automático del stock al crear una orden. Diferencia entre "lo marco agotado manualmente" y "el sistema lo sabe".
- **Schema:** columna `stock INTEGER DEFAULT NULL` en `platos_carta` (NULL = sin control de stock)
- **Backend:** al crear orden con ítem de carta, `UPDATE platos_carta SET stock = stock - cantidad`; alerta si `stock = 0` → marcar `activo = 0`
- **Complejidad:** media-alta (trigger en creación de orden, UI de gestión de stock)

#### C3 — WhatsApp / SMS de confirmación
Ver sección completa más abajo (ya documentada). Mensaje automático al confirmar reserva, cancelación, nueva orden. Proveedor: Meta WhatsApp Business Cloud API o Twilio.
- **Complejidad:** alta (cuenta externa, aprobación de Meta, plantillas, costos por mensaje)

#### C4 — Pre-pago online (reduce no-shows)
El cliente paga con Yape/Plin antes de llegar al restaurante al crear una reserva. Reduce no-shows drásticamente. Requiere verificación automática del pago (webhook o polling).
- **Complejidad:** muy alta (integración gateway, confianza del cliente, disputas)

#### C5 — API pública para integraciones
Exponer endpoints REST documentados (OpenAPI/Swagger) para que los restaurantes integren el sistema con sus propias herramientas (POS físico, delivery propio, contabilidad). Requiere API keys por restaurante.
- **Schema:** tabla `api_keys` con `id_restaurante`, `key_hash`, `permisos`, `activo`
- **Complejidad:** alta (auth adicional, rate limiting por key, documentación)

#### C6 — Métrica de visitas al menú por restaurante (dashboard admin) — anotado 2026-07-09
Idea del usuario: no implementar todavía — recién tiene sentido "cuando inicie masivo" (varios restaurantes activos con tráfico real). Ver `vision_negocio.md` sección 15 para el detalle completo de la motivación de negocio (ingreso indirecto vía publicidad dentro de `menu.html`, usando el tráfico agregado de todos los restaurantes como audiencia local vendible).
- **Objetivo del admin de la plataforma:** saber cuántas personas ven el menú de cada restaurante, para (a) evaluar si el tráfico agregado justifica vender espacio publicitario, y (b) tener el dato antes de cotizarle a un anunciante.
- **A definir antes de implementar** (decisiones de producto, no técnicas):
  - ¿Se cuenta cada carga de página (page views) o visitantes únicos por sesión/día? Lo segundo requiere un identificador anónimo (cookie o hash) con las implicancias de privacidad correspondientes — el sistema hoy es 100% anónimo del lado cliente (sección 9 de `vision_negocio.md`).
  - ¿El dato es visible solo para el admin de la plataforma, o también para el owner de cada restaurante (riesgo: filtra info competitiva entre restaurantes si se muestra mal)?
  - ¿Cuánto tiempo se retienen los datos crudos vs. agregados?
- **Boceto técnico (sin comprometer diseño final):** tabla nueva `visitas_menu` (o similar) con `id_restaurante`, `fecha`, `contador` — incrementada en `GET /api/public/menu` o en la carga inicial de `menu.html`; nuevo endpoint en `routes/admin.js` (ej. `GET /api/admin/restaurantes/:id/visitas` o resumen agregado); nueva card/gráfica en `public/admin/dashboard.html`.
- **Complejidad:** media (la métrica en sí es simple; lo que hay que resolver es el diseño de privacidad/alcance antes de tocar código).

#### C7 — Módulo de blog/noticias de la empresa (dashboard admin) — anotado 2026-07-09
Idea del usuario: un módulo dentro del panel admin (`public/admin/dashboard.html`) para que Pedro, como fundador, publique actualizaciones sobre la evolución de la empresa — no del restaurante de un cliente, sino de Menú Pro como producto/negocio. Ejemplos que dio el usuario: "ya tengo mi primera prueba piloto", "una semana después, así van las pruebas", anuncios de nuevas features, hitos. Por ahora **solo documentación, sin implementar**.

**Para qué sirve (contexto de negocio):** construir confianza pública con prospectos y restaurantes piloto mostrando avance real y transparencia — el tipo de "build in public" que ayuda a vender el producto a los próximos restaurantes sin depender de marketing pagado. Complementa la landing (`public/landing.html`), que hoy es estática.

**Boceto técnico (sin comprometer diseño final):**
- **Schema:** tabla nueva `posts_blog` — `id`, `titulo`, `contenido` (markdown o HTML simple), `slug`, `publicado` (bool), `created_at`, `id_usuario_admin` (autor).
- **Backend:** `routes/admin.js` (o un `routes/blog.js` separado) — `POST/GET/PATCH/DELETE /api/admin/blog` protegido con `authorize('admin')` (mismo patrón que el resto de `admin.js`); endpoint público de solo lectura `GET /api/public/blog` (o similar) para listar los posts publicados, sin autenticación.
- **Frontend admin:** nueva sección en `dashboard.html` — lista de posts + editor (título, contenido, toggle publicado/borrador) con `FormModal` u otro patrón ya usado en el proyecto.
- **Frontend público:** página nueva, ej. `public/blog.html` o una sección dentro de `landing.html`, que liste los posts publicados (más reciente primero) — mobile-first como el resto del sistema.
- **Decisiones a tomar antes de implementar:**
  - ¿Editor de texto simple (textarea) o con formato (markdown/rich text)? Empezar simple es razonable dado el volumen bajo de posts esperado.
  - ¿Los posts llevan fotos/imágenes? Si sí, reutilizar el patrón de upload ya existente (`multer` + carpeta en `public/uploads/`).
  - ¿Viven en una URL propia (`menupro.tech/blog`) o como sección scrolleable de la landing? Afecta SEO y si se linkean posts individuales.
- **Complejidad:** media-baja (CRUD simple, sin lógica de negocio compleja — el esfuerzo real está en el editor/UI, no en el backend).

---

## Implementados

| Feature | Fecha | Descripción |
|---------|-------|-------------|
| Cancelar desde Cola del día (Gap 19) | 2026-07-14 | Botón "✗ Cancelar" en las tarjetas de `renderKanbanOrden()`/`renderKanbanReserva()` — antes había que entrar a Órdenes/Reservas por separado para cancelar. Reutiliza `accionRapidaOrden()`/`accionRapidaReserva()` (mismo endpoint `PATCH /:id/estatus`, sin cambios de backend — la devolución de stock ya la maneja). Mismo criterio de visibilidad que esos paneles: en órdenes siempre disponible; en reservas se oculta si el cliente ya llegó o ya se completó. La modalidad (`badgeModalidad()`) ya se mostraba desde antes. 267/267 jest verde (sin tests nuevos, reutiliza endpoints ya cubiertos); verificado con Playwright en las 4 zonas. |
| Horario de atención configurable y estricto (Gap 18) | 2026-07-14 | El owner fija un rango horario (ej. 12:00–15:00) + los días de la semana en que atiende (`restaurantes.horario_activo`/`hora_apertura`/`hora_cierre`/`dias_atencion`, apagado por defecto). `POST /orders` y `POST /reservations` bloquean con 400 fuera de ese horario (`utils/horarioAtencion.js`); las reservas además validan la `hora_llegada` futura si el cliente la especifica. `menu.html` muestra banner "Cerrado" + deshabilita el botón de confirmar sin bloquear la carta/menú. Config en `owner.html` → "🕐 Horario de atención". Límite conocido: no soporta horario que cruce medianoche. Tests `horario-atencion.test.js` (13) → 267/267 jest; E2E `scripts/test-horario-atencion.js` (9/9). |
| Stock por plato del menú del día | 2026-07-02 | Columnas `stock_inicial`/`stock_restante` en `componentes_menu_dia` (NULL = sin control, opcional por plato). El stock es **por menú**: si el mismo plato está en 2 menús, cada uno lleva su cuenta (decisión del usuario — reparte sus porciones). Owner fija "hoy tengo 25" desde el ⋯ del acordeón (📦 Stock, FormModal); badge "quedan N" (ámbar ≤5, "Sin stock" en 0). **Descuento al crear** orden/reserva (público y owner, transaccional con guard `restante >= n` → 409 "Solo quedan N porciones de X" y revierte todo); menú fijo descuenta todos sus componentes (ya viajan como items). **Devolución al cancelar** (PATCH estatus órdenes/reservas + cancel desde cocina). Al llegar a 0 el plato desaparece del menú QR (mismo filtro que agotado); el toggle manual de agotado sigue independiente. Copiar menú replica `stock_inicial` con la olla llena; herencia de secciones no arrastra stock (nace sin platos). Nuevo `utils/stock.js` + endpoint `PATCH …/platos/:componenteId/stock`. Tests `stock-platos.test.js` (11) → 241/241 jest; E2E full-stack 11/11. Fase 2 futura: stock en carta, aviso "¡quedan 3!" al cliente, reporte cociné-vs-vendí. |
| Flujo Menú del Día v2 — acordeón + picker multi + herencia de secciones | 2026-07-02 | Rediseño del armado del menú (ver `flujo-menuv2.md`): (1) la vista de config es un **acordeón vertical** de secciones (badges "N platos"/"⚠ sin platos", acciones de plato tras ⋯) — reemplaza al carrusel horizontal que rebotaba a la primera sección tras cada acción; (2) **hub eliminado**: ⚙ Configurar aterriza directo en las secciones, toggles del cliente como fila compacta; (3) **PlatoPicker multi-selección** con pre-marcado (marcar agrega, desmarcar quita, footer "Guardar (N nuevos · quitar M) ✓"); (4) **herencia de secciones**: `POST /menus-dia` con `heredar_secciones: true` copia la estructura (sin platos) del menú más reciente; el wizard cierra con «Crear y agregar platos →» y encadena directo al armado con hint ✨; (5) alta de sección en **1 tap** (Obligatoria/Opcional) reemplaza al mini-wizard de 2 pasos. ~31 taps + swipes → ~15 taps por menú típico. Tests: `heredar-secciones.test.js` (8) → 230/230 jest; E2E `test-menu-wizard.js` reescrito → 51/51 a 360px. Mockup previo en `public/demo_flujo_menu.html`. |
| Botón Instalar PWA + widget `PwaInstall` | 2026-05-30 | Botón "📲 Instalar app" en `owner.html` (sidebar) y `login.html`. Widget `pwa-install.js`: captura `beforeinstallprompt`, instructivo iOS, se oculta si ya instalada. E2E `scripts/test-pwa-install.js`. Comensal-installable + URLs por slug quedan como features futuras. |
| Editar platos + widget `FormModal` + fix scroll Menús del día | 2026-05-30 | Botón ✏️ por fila para editar platos de menú (nombre+desc) y carta (nombre+precio+desc+categoría) vía widget `FormModal` (modal de formulario genérico por esquema). Backend `PATCH /platos-menu/:id` y `/platos-carta/:id`. Fix de layout: `.card-header` con `flex-wrap` para que el botón "Eliminar" de los menús del día no se corte en 360px. Tests `editar-platos.test.js` (10) + E2E. 207/207 verde. |
| Sistema de widgets + `PhotoEditor` | 2026-05-30 | Filosofía de **componentes de UI reutilizables autocontenidos** (ver `widgets.md`). Primer widget `public/js/widgets/photo-editor.js`: en `owner.html` (Platos de menú y Carta) la miniatura de cada plato es clicable → visor de imagen en grande con **recorte 1:1** + Cambiar + Eliminar; placeholder vacío → recortador directo. Recortador propio en canvas (arrastrar + zoom táctil, exporta JPEG 800×800), sin dependencias, no toca CSP. Prueba E2E `scripts/test-photo-editor.js` (8/8 verde). Siguiente: widget `PhotoViewer` solo-lectura para migrar el modal de `menu.html`. |
| Auth + roles | 2026-05-09 | Login/logout con JWT en cookie httpOnly. Roles: admin, owner, cocinero, mozo |
| Menú del día | 2026-05-09 | Secciones, platos, menús con componentes. Modos fijo y elegible por sección |
| Carta | 2026-05-09 | Categorías y platos a la carta con toggle activo/inactivo |
| Órdenes activas | 2026-05-09 | Vista en tiempo real con flujo de estatus (pendiente → preparando → entregando → completado) |
| Historial de órdenes | 2026-05-09 | Filtros por fecha y estatus + descarga Excel (`historial_ordenes_DESDE_HASTA.xlsx`) |
| Reservas activas + historial | 2026-05-09 | Gestión completa de reservas + descarga Excel (`historialReservas_DESDE_HASTA.xlsx`) |
| Vista cocina | 2026-05-09 | `kitchen.html` para cocineros — vista de órdenes activas |
| Menú QR para clientes | 2026-05-09 | `menu.html` con carta y menú del día, fotos, hero banner y colores dinámicos |
| Panel admin | 2026-05-09 | Gestión global de restaurantes y usuarios desde cuenta admin |
| Usuarios + permisos granulares | 2026-05-14 | Owner crea cocinero/mozo y asigna 8 permisos individuales por módulo |
| Toggle elegible/fijo en menú | 2026-05-09 | El owner puede cambiar entre "Cliente elige" y "Fijo" en cada menú del día |
| Toggle requerido/opcional en secciones | 2026-05-09 | Cada sección del menú del día puede marcarse como obligatoria u opcional |
| Eliminar sección de menú del día | 2026-05-14 | Botón ✕ por sección sin afectar historial de órdenes ni reservas |
| Fotos en platos (menú y carta) | 2026-05-14 | Upload/delete de foto por plato. Miniaturas en owner.html y menu.html |
| Configuración visual del restaurante | 2026-05-14 | Foto de portada, color primario y secundario. Sidebar muestra nombre y foto real |
| Reportes — Curva de clientes | 2026-05-11 | Gráfica de línea órdenes/reservas por día/semana/mes + Excel (`demanda_clientes_{intervalo}.xlsx`) |
| Reportes — Análisis de pedidos | 2026-05-11 | Drill-down por tipo (Menú/Carta) → sección/categoría → bar chart + Excel |
| Reportes — Ganancias | 2026-05-13 | 4 stat cards + gráfica de línea con 3 series (Total/Órdenes/Reservas) + Excel |
| Cálculo y persistencia de totales | 2026-05-13 | Columna `total` en órdenes y reservas. Backfill automático al arranque. Calculado al completar |
| Precio correcto en menús elegibles | 2026-05-09 | Precio se divide solo entre secciones obligatorias; opcionales no pedidas = S/0 |
| Polling automático en kitchen + alerta de sonido | 2026-05-18 | Auto-refresh cada 15 s. 3 endpoints REST (`GET /queue`, `PUT /:id`, `PUT /combo/:id`). Detección de órdenes nuevas por comparación de sets. Alerta sonora via Web Audio API, botón 🔔/🔕 con preferencia en localStorage |
| Generador de QR del menú | 2026-05-18 | Card en panel Configuración con QR autogenerado (CDN `qrcode@1.5.3`), link copiable y botón "Descargar PNG". Se genera al abrir el panel. Sin cambios en backend. |
| Inhabilitar menú del día | 2026-05-18 | Toggle "Visible / Oculto" por menú en owner.html. Columna `activo` en `menus_dia`. `GET /api/public/menu` filtra `activo = 1`. Órdenes y reservas previas no se afectan |
| Plano de mesas visual | 2026-05-18 | Tabla `mesas` (numero, capacidad, activo). `routes/mesas.js` con CRUD + `GET /estado` que deriva libre/ocupada/reservada cruzando órdenes activas y reservas confirmadas de hoy. Tab "Plano" en panel Órdenes con chips color-coded. Config de mesas en panel Configuración. Polling 10s integrado. Tests: 13 casos. |
| Platos agotados en menú del día | 2026-05-18 | Toggle "Disponible / Agotado" por plato en cada sección. Columna `agotado` en `componentes_menu_dia`. `GET /api/public/menu` filtra `agotado = 0`. El componente permanece en BD para preservar historial de órdenes |
| hora_llegada en reservas + asignación de mesa | 2026-05-18 | Campo `hora_llegada TEXT` en `reservas`. El plano solo marca una mesa "reservada" cuando la hora de llegada cae en la ventana [-30min, +120min] respecto a la hora actual Lima (`esInminente()`). Desde `menu.html` el cliente puede indicar hora de llegada (opcional). En `owner.html` las tarjetas de reserva muestran la hora y permiten asignar mesa inline (`PATCH /api/reservations/:id/mesa`). Tests: 18 casos en `tests/hora-llegada.test.js`, todos pasan. |
| REFACTOR-001 — Estatus dinámicos por flags semánticos | 2026-05-21 | Eliminados todos los hardcodes de nombres de estatus. `estatus_orden` tiene 5 flags (`es_inicial, es_en_cocina, es_listo, es_pagado, es_cancelado`); `estatus_reserva` tiene 7 (`es_inicial, es_confirmada, es_en_cocina, es_listo, es_cliente_llego, es_full, es_cancelado`). Backend: `PATCH /:id/estatus` en órdenes y reservas acepta `{ flag }` además de `{ estatus }`. Frontend: `owner.html` usa flags para botones de acción y detección de nuevas órdenes/reservas. Eliminado `utils/orderStatus.js`. 10 sesiones, ~40 cambios en 9 archivos. |
| Gap 6 — Código de reserva aleatorio + estado para el cliente | 2026-05-21 | `utils/codigoReserva.js` genera código único de 7 chars. Columna `codigo` en `reservas` con índice único. `POST /api/public/reservations` asigna y devuelve el código. `GET /api/public/reserva/:codigo` (público) devuelve estado + items en tiempo real. `menu.html`: pantalla de confirmación con código grande + instrucción de screenshot + pantalla de consulta con polling 30s + pill "Consultar mi reserva" en header. `owner.html`: código visible en tarjetas de reserva activas. |
| Gap 2 — Kanban "Cola del día" | 2026-05-23 | `pedidos.js` reescrito: 4 tabs (Pendientes/En Cocina/Listos/Por cobrar), badges por zona + badge total en nav, botones de acción rápida por tarjeta/zona, polling 15s. Nuevo flag `es_entregado` en `estatus_orden` (migración en `database.js`, agregado a `VALID_ORDER_FLAGS` y SELECT en `routes/orders.js`). Botón "🍽 Entregar" en Listos → `es_entregado` → Por cobrar. Reservas: "🍽 Entregado" reemplaza a "👤 Cliente llegó" en `reservas.js` y `pedidos.js`. 15/15 pruebas manuales OK. |
| Bot de documentación Playwright | 2026-05-27 | `landing/bot/` — orquestador `bot.js` + 4 flows por rol (owner/cocina/mozo/cliente). 34 screenshots en viewport mobile 390×844. 4 manuales `.md` en `landing/bot/output/`. Captura errores de consola en `errors-report.md`. Imágenes de platos en `landing/bot/assets/` generadas con `generate-placeholder-images.js` (Playwright, sin internet externo). Scripts: `npm run bot:setup / bot:assets / bot:run / bot:all`. Usuarios bot: owner@bot.com / cocina@bot.com / mozo@bot.com (pass: BotMenuPro2026!). |
| Hardening producción 9/10 — health endpoint, graceful shutdown, npm audit, multer iOS | 2026-05-27 | `GET /health` sin auth (devuelve `{ status, uptime }`) para monitoreo externo. Graceful shutdown: handlers `SIGTERM`/`SIGINT` cierran server HTTP + BD SQLite antes de salir (timeout forzado 10s). `npm audit fix`: cerradas 5 vulnerabilidades (ip-address XSS, qs DoS, tmp path traversal HIGH, ws memory disclosure). Multer fileFilter en `routes/public.js` y `routes/menu.js` (×2): reemplazado lista blanca de extensiones por `file.mimetype.startsWith('image/')` — acepta HEIC/HEIF de iOS y Android. Puntuación: 8.5 → 9/10. |
| Hardening producción — Helmet + rate limiting + índices BD | 2026-05-26 | `helmet` instalado con CSP completa (CDNs Chart.js, QRCode, Google Fonts permitidos; `unsafe-eval` solo para qrcodejs). Rate limiting: `/api/auth` 20 req/15min, `/api/` 300 req/min. 4 índices en `database.js`: `idx_ordenes_restaurante`, `idx_ordenes_fecha`, `idx_reservas_restaurante`, `idx_reservas_fecha`. Bug crítico resuelto: `login.html` redirigía mozo a `/waiter.html` (inexistente) → corregido a `/owner.html`; ruta `/waiter` eliminada de `app.js`. Puntuación producción: 7.2 → 8.5 / 10. |
