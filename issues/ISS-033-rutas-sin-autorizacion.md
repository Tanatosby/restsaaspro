# ISS-033 — Órdenes y reservas: rutas con autenticación pero sin autorización

**Estado:** ✅ Resuelto (2026-08-12) · **Prioridad:** Alta · **Módulo:** `routes/orders.js`, `routes/reservations.js`

---

## Cómo apareció

No lo reportó un usuario. Salió de una pregunta del dueño del proyecto mientras se
revisaba otra cosa: *"¿el mozo puede reservar desde su panel? ¿qué?"*.

Al verificarlo resultó que **no existe esa pantalla** — ningún archivo del frontend
llama a `POST /api/reservations` (`public/js/modules/reservas.js` solo hace `GET` y
`PATCH`). Pero el endpoint existe y responde. Tirando de ese hilo apareció el
problema real, que no era el que se estaba buscando.

## El problema

`routes/orders.js:14` y `routes/reservations.js:12` tienen `router.use(authenticate)`,
así que **la autenticación nunca faltó**: sin token válido devuelven 401 y el JWT está
firmado con `JWT_SECRET`. Desde fuera no se podía entrar.

Lo que faltaba era la **autorización**. Varias rutas comprobaban *quién sos* pero no
*qué te dejaron hacer*, mientras que sus vecinas de los mismos archivos sí lo hacían:

| Ruta | Antes | Ahora |
|---|---|---|
| `GET /api/orders/estatus` | solo `authenticate` | `authorizePermiso()` |
| `GET /api/orders/activas` | solo `authenticate` | `authorizePermiso()` |
| `GET /api/orders` | solo `authenticate` | `authorizePermiso()` |
| `POST /api/orders` | solo `authenticate` | `authorizePermiso()` |
| `GET /api/reservations/estatus` | solo `authenticate` | `authorizePermiso()` |
| `GET /api/reservations` | solo `authenticate` | `authorizePermiso()` |
| `POST /api/reservations` | solo `authenticate` | `authorizePermiso()` |
| `GET /api/menu/secciones` · `/platos-menu` · `/menus-dia` · `/categorias` · `/platos-carta` | solo `authenticate` | `authorizePermiso()` |
| `GET /api/mesas` · `/api/mesas/estado` | solo `authenticate` | `authorizePermiso()` |

Las 7 primeras se cerraron en la primera pasada; las 7 del catálogo del panel en una
segunda, tras descartar el argumento con que se habían dejado fuera (ver más abajo).

`PATCH /:id/estatus`, `/:id/mesa`, `/:id/confirmar-pago` y `/export` ya tenían
`authorizePermiso()` en ambos archivos. Fue una omisión, no una decisión.

## Por qué se volvió importante ahora

Mientras los únicos usuarios con cuenta eran **staff que el owner contrató**
(mozo, cocinero), el impacto era bajo. El rol `pensionista` (commit `7a92260`,
2026-08-11) cambia eso: el restaurante va a repartir cuentas a **decenas de
comensales**, gente ajena al negocio.

Dos consecuencias concretas:

1. **Fuga de datos de clientes.** Un pensionista logueado podía pedir
   `GET /api/reservations` y recibir todas las reservas del restaurante **con nombre
   y teléfono de cada cliente**. Sin herramientas: desde la consola del navegador en
   su propia página, porque el JWT viaja en cookie y el navegador la manda solo:
   ```js
   fetch('/api/reservations').then(r => r.json()).then(console.log)
   ```

2. **El sistema de saldo se podía saltar por completo.** Un pensionista debe pedir
   por `POST /api/pensionista/pedido`, que valida horario, comprueba saldo, descuenta
   y registra el movimiento en el ledger. Llamando a `POST /api/orders` en su lugar,
   se creaba una **orden normal que no le tocaba un sol del saldo** — y en la cocina
   se veía idéntica a cualquier otra. Toda la lógica transaccional de `7a92260`
   quedaba sin efecto por una ruta que no validaba rol.

## Hallazgo adicional: el restaurante salía del body

`POST /api/orders` **nunca leía `req.user`**: tomaba `id_restaurante` del body y lo
usaba tal cual. Cualquier usuario autenticado podía crear órdenes **en un restaurante
ajeno** pasando otro id. En `POST /api/reservations` pasaba algo parecido por el
fallback `req.user?.restaurant_id || id_restaurante`: para un token de **admin**
(que tiene `restaurant_id` null) ganaba el valor del body.

Ese fallback y su comentario (*"Si viene del cliente (sin auth)..."*) eran restos de
cuando el router era público. Hoy el pedido y la reserva del cliente sin login entran
por `routes/public.js` (`POST /api/public/orders` y `/api/public/reservations`), que
son otras rutas. Era código muerto que además abría un hueco entre restaurantes.

## Por qué `authorizePermiso()` alcanza para el caso pensionista

Encaja sin tocar nada más:

- `routes/pensionistas.js` crea al pensionista **sin permisos** — la columna
  `usuarios.permisos` queda `NULL`.
- `routes/auth.js:108-112` deja `permisos = null` en el JWT para todo rol que no sea
  owner/admin y que no tenga permisos guardados.
- `authorizePermiso()` (`middleware/authenticate.js`) deja pasar a owner/admin, o a
  quien tenga un array con al menos un permiso. Un pensionista no cumple ninguna de
  las dos → **403**.

**Límite conocido, aceptado:** `authorizePermiso()` es de grano grueso — un cocinero
con permiso `['cocina']` pasa igual y puede leer reservas. Es el criterio que ya sigue
todo el proyecto (el propio middleware lo documenta: la granularidad por módulo la
controla el frontend). Cerrar eso sería un cambio de diseño mayor, no parte de este
issue. Lo que este fix garantiza es que **un comensal no tiene acceso de staff**.

## Solución aplicada

- `authorizePermiso()` en las 7 rutas de la tabla.
- `POST /api/orders` y `POST /api/reservations` toman el restaurante **del token**
  (`req.user.restaurant_id`), nunca del body. Si el usuario no tiene restaurante
  asignado, 400 con mensaje claro.
- Eliminados el fallback y el comentario obsoletos de `reservations.js`.
- `tests/autorizacion-rutas.test.js` (nuevo, 15 casos): un token de pensionista recibe
  403 en las 5 rutas de lectura y en los 2 POST; el owner recibe 200; sin token sigue
  siendo 401 (no 403); un mozo con un permiso puede listar; y una reserva creada con
  un `id_restaurante` ajeno en el body queda igual en el restaurante del token.

**392/392 jest verde** (`npx jest tests/`).

## Segunda tanda: el catálogo del panel (mismo día)

En la primera pasada se dejaron fuera los `GET` de `menu.js` y `mesas.js` con el
argumento de que "esos datos ya son públicos en la carta" y de que cerrarlos podía
romper `pensionista.html`. **El argumento era falso**, y lo destapó una pregunta del
usuario: *"¿ese GET que dejaste suelto es el mismo que recibe `menu.html` cuando llama
a los menús?"*.

**No lo era.** Son dos caminos separados:

- `public/menu.html` llama **solo** a `/api/public/*` — 8 endpoints, todos en
  `routes/public.js`, que **no tiene `authenticate`** (correcto: el cliente pide sin
  loguearse).
- `GET /api/menu/*` y `/api/mesas` viven detrás de `router.use(authenticate)` y los
  consume **únicamente el panel**: `owner.html` (24 llamadas),
  `js/widgets/menu-wizard.js`, `js/modules/config.js`, `js/modules/reportes.js` y
  `js/modules/mesas.js`. `kitchen.html` no llama a ninguno, y `cocina.js` solo usa
  `/api/orders/*` y `/api/reservations/*`.

Y `pensionista.html` no los necesita: leerá la carta por `/api/public/menu` y
`/api/public/carta`, igual que `menu.html`. Así que se cerraron también:

`GET /api/menu/secciones`, `/platos-menu`, `/menus-dia`, `/categorias`, `/platos-carta`,
`GET /api/mesas` y `/api/mesas/estado` → todos con `authorizePermiso()`.

**Verificado con el server levantado:** `/api/public/restaurante/1`,
`/api/public/menu?restaurante=1&dia=…` y `/api/public/carta?restaurante=1` siguen
devolviendo **200 sin token**; `/api/menu/menus-dia` y `/api/mesas` devuelven **401**.
La carta del cliente quedó intacta.

**406/406 jest verde** tras esta segunda tanda (14 casos más).

## Alcance deliberado — lo que NO se tocó

- `authorizeRestaurante()` en `middleware/authenticate.js` sigue siendo **código
  muerto**: está importado en `routes/menu.js:5` y no se usa en ninguna ruta. Además
  lee `req.user.restaurante_id` (español) mientras el JWT guarda `restaurant_id`
  (inglés, `routes/auth.js:27`), así que si alguien lo enchufa tal cual no funcionaría.
  **Decidir en otra sesión: arreglarlo o borrarlo.**
- `routes/pensionistas.js` y `routes/pensionista.js` se auditaron y **están correctos**
  — las 7 rutas del owner con `authorize('owner','admin')`, y todo `pensionista.js`
  bajo `router.use(authorize('pensionista'))`. `usuarios.js`, `reportes.js` y `push.js`
  también están bien.

## Nota para el paso 7 de Pensionistas

Este fix es **requisito previo a `pensionista.html`**. Hoy la exposición era teórica
porque no existe ninguna cuenta de pensionista (la pantalla no está construida). El día
que se le entregue la primera cuenta a un comensal, sin este fix, el agujero es real.

Ver `pensionistas.md` §0-bis y `backlog.md`.
