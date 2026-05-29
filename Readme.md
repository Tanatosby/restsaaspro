# Restaurant SaaS Platform

Multi-tenant SaaS para restaurantes de menú pequeños en Perú. Cada restaurante opera de forma aislada con su propio dueño, personal, menú, órdenes y reservas.

---

## Stack

| Tecnología | Uso |
|---|---|
| Node.js + Express | Servidor web y API REST |
| better-sqlite3 | Base de datos SQLite |
| bcryptjs | Hash de contraseñas |
| jsonwebtoken | Autenticación JWT (cookie httpOnly) |
| multer | Upload de imágenes (fotos de platos, comprobantes) |
| exceljs | Generación de reportes Excel |
| dotenv | Variables de entorno |

---

## Estructura de carpetas

```
RestSaas/
├── app.js                      ← servidor Express principal
├── .env                        ← JWT_SECRET, PORT (no subir a Git)
├── database.sqlite             ← BD auto-generada al iniciar
│
├── config/
│   └── database.js             ← conexión + creación de tablas + migraciones idempotentes
│
├── middleware/
│   ├── authenticate.js         ← JWT verify, authorize(roles), authorizePermiso()
│   └── logger.js               ← logging de requests
│
├── routes/
│   ├── auth.js                 ← login / logout
│   ├── admin.js                ← panel admin (stats, restaurantes, estatus)
│   ├── menu.js                 ← menú del día, carta, configuración del restaurante
│   ├── orders.js               ← órdenes activas, historial, cocina, exportar Excel
│   ├── reservations.js         ← reservas activas, historial, exportar Excel
│   ├── mesas.js                ← CRUD de mesas + estado del plano en tiempo real
│   ├── reportes.js             ← curva de clientes, análisis de pedidos, ganancias
│   ├── usuarios.js             ← CRUD usuarios + permisos granulares
│   └── public.js               ← endpoints públicos (menú QR, crear orden/reserva, pagos)
│
├── utils/
│   ├── menuPricing.js          ← cálculo de precio por componente de menú
│   ├── totales.js              ← calcularTotalOrden / calcularTotalReserva
│   └── fecha.js                ← fechaLima() — fecha actual en timezone Lima
│
├── public/
│   ├── login.html              ← login para owner/cocinero/mozo
│   ├── owner.html              ← panel principal (owner, cocinero, mozo según permisos)
│   ├── kitchen.html            ← vista de cocina legacy (polling básico)
│   ├── menu.html               ← menú QR para clientes (público, sin login)
│   └── admin/
│       └── dashboard.html      ← panel admin (gestión global)
│
├── issues/                     ← tracking de bugs y refactors
└── tests/                      ← tests Jest por módulo
```

---

## Variables de entorno (`.env`)

```env
PORT=3000
JWT_SECRET=tu_secret_aqui
```

---

## Cómo correr

```bash
npm install
node app.js
# → http://localhost:3000
```

El primer arranque crea automáticamente las tablas y un usuario admin por defecto.

---

## Roles y acceso

| Rol | Acceso | `restaurant_id` |
|-----|--------|-----------------|
| `admin` | Panel admin global (`/admin/dashboard.html`) | NULL |
| `owner` | Panel completo (`owner.html`) | su restaurante |
| `cocinero` | Panel según permisos asignados | su restaurante |
| `mozo` | Panel según permisos asignados | su restaurante |

El owner asigna permisos granulares a cocinero y mozo (8 módulos). Todos los roles protegidos usan `owner.html` — `kitchen.html` es legacy.

El JWT se almacena en cookie `httpOnly` (no en header `Authorization`).

---

## Autenticación

```
POST /api/auth/login        → setea cookie httpOnly con JWT
POST /api/auth/logout       → borra la cookie
```

Todas las rutas protegidas leen el JWT de la cookie automáticamente via middleware `authenticate`.

---

## Principales endpoints

### Público (sin login — para clientes desde menu.html)
```
GET  /api/public/menu/:restaurantId          ← menú del día + carta activos
GET  /api/public/restaurante/:id             ← config del restaurante (métodos de pago, colores)
POST /api/public/orders                      ← crear orden walk-in
POST /api/public/reservations                ← crear reserva
PATCH /api/public/pago/orden/:id             ← cliente registra pago (con foto comprobante)
PATCH /api/public/pago/reserva/:id           ← ídem para reservas
```

### Órdenes
```
GET  /api/orders/estatus                     ← lista de estatus (para selects dinámicos)
GET  /api/orders/activas                     ← órdenes activas con flags semánticos
GET  /api/orders/queue                       ← cola de cocina (sin pagadas/canceladas/listas)
GET  /api/orders                             ← historial con filtros fecha/estatus
GET  /api/orders/export                      ← Excel historial
PATCH /api/orders/:id/estatus                ← cambiar estatus (acepta { estatus } o { flag })
PUT  /api/orders/:id                         ← cambiar estatus desde cocina (cooking/done/cancelled)
```

### Reservas
```
GET  /api/reservations/estatus               ← lista de estatus
GET  /api/reservations                       ← lista con filtros fecha/estatus/?flag=es_inicial
GET  /api/reservations/export                ← Excel historial
PATCH /api/reservations/:id/estatus          ← cambiar estatus (acepta { estatus } o { flag })
PATCH /api/reservations/:id/mesa             ← asignar mesa a reserva
```

### Mesas
```
GET  /api/mesas                              ← lista de mesas
GET  /api/mesas/estado                       ← estado en tiempo real (libre/ocupada/reservada)
POST /api/mesas                              ← crear mesa
PATCH /api/mesas/:id                         ← editar capacidad/activo
DELETE /api/mesas/:id                        ← eliminar mesa
```

### Menú (owner)
```
GET/POST /api/menu/secciones                 ← secciones del menú del día
GET/POST /api/menu/platos-menu               ← platos del menú
GET/POST /api/menu/menus-dia                 ← menús del día con componentes
GET/POST /api/menu/categorias                ← categorías de carta
GET/POST /api/menu/platos-carta              ← platos a la carta
GET/PATCH /api/menu/config                   ← configuración del restaurante
```

### Reportes
```
GET /api/reportes/clientes-timeline          ← curva demanda por período
GET /api/reportes/clientes-timeline/export   ← Excel demanda
GET /api/reportes/pedidos                    ← platos más pedidos
GET /api/reportes/pedidos/export             ← Excel pedidos
GET /api/reportes/ganancias/resumen          ← stat cards (total/mes/semana/hoy)
GET /api/reportes/ganancias/timeline         ← gráfica líneas
GET /api/reportes/ganancias/export           ← Excel ganancias
```

### Admin (solo rol admin)
```
GET  /api/admin/stats                        ← métricas globales de la plataforma
GET  /api/admin/restaurantes                 ← todos los restaurantes con stats
GET  /api/admin/estatus-orden                ← catálogo de estatus de órdenes
GET  /api/admin/estatus-reserva              ← catálogo de estatus de reservas
PATCH /api/admin/estatus-orden/:id/set-*     ← asignar flag semántico a un estatus
PATCH /api/admin/estatus-reserva/:id/set-*  ← ídem para reservas
```

---

## Sistema de estatus dinámicos (flags semánticos)

Los nombres de estatus son libres — el admin puede renombrarlos. El sistema usa **flags** para la lógica:

### `estatus_orden`
| Flag | Significado |
|------|-------------|
| `es_inicial` | Estado inicial al crear una orden |
| `es_en_cocina` | Cocina está preparando el pedido |
| `es_listo` | Pedido listo, pendiente de cobro |
| `es_pagado` | Cobrado — va a historial |
| `es_cancelado` | Cancelado — va a historial |

### `estatus_reserva`
| Flag | Significado |
|------|-------------|
| `es_inicial` | Estado inicial al crear una reserva |
| `es_confirmada` | Reserva confirmada (aparece en plano de mesas) |
| `es_en_cocina` | Cocina preparando el pedido de la reserva |
| `es_listo` | Pedido listo para entregar |
| `es_cliente_llego` | Cliente llegó y fue identificado |
| `es_full` | Completada y cobrada — va a historial |
| `es_cancelado` | Cancelada — va a historial |

---

## Aislamiento multi-tenant

Cada query sobre datos sensibles filtra por `id_restaurante = req.user.restaurant_id` (decodificado del JWT firmado por el servidor). Un usuario no puede acceder a datos de otro restaurante aunque conozca el ID.
