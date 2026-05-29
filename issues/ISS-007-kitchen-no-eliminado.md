# ISS-007 — kitchen.html no eliminado + cocinero redirige a página en blanco

**Estado:** Resuelto — 2026-05-23
**Módulo:** Auth / Login / Usuarios
**Prioridad:** Alta
**Capturas:** issue_login_sin_roles.png, issues_login_sin_roles_2.png, issue_falta_de_rol_cocina.png

---

## Descripción

Tres sub-problemas relacionados con la eliminación de kitchen.html en ARCH-001 paso 1.6:

### Sub-problema 1 — login.html sigue redirigiendo cocinero a kitchen.html
`public/login.html:353`: `cocinero: '/kitchen.html'`
El cocinero hace login y aterriza en una página en blanco. El servidor sirve kitchen.html vacío (o con Tailwind CDN warning).

### Sub-problema 2 — kitchen.html sigue existiendo en disco
El archivo no fue borrado en ARCH-001 paso 1.6. El servidor lo sirve como página vacía/rota.
La captura muestra el warning de Tailwind CDN en consola — confirma que el archivo existe con el CDN aún dentro.

### Sub-problema 3 — No existe permiso "Cocina" en PERMISOS_DEF
`public/js/modules/usuarios.js:4-13`: PERMISOS_DEF tiene 8 ítems (menú, carta, órdenes activas, historial órdenes, reservas activas, historial reservas, reportes, configuración) pero **no tiene `cocina`**.

El owner no puede asignar acceso al panel Cocina a sus cocineros.
Captura `issue_falta_de_rol_cocina.png` confirma: Ana García (COCINERO) tiene todos los checkboxes disponibles pero ninguno corresponde a Cocina.

### Sub-problema 4 — Cocinero sin permisos asignados no puede entrar a owner.html
Guard de owner.html línea 658:
```js
if (!session || (!['owner','admin'].includes(session.role) && !Array.isArray(session.permisos)))
  window.location.replace('/login.html');
```
Un cocinero con `session.permisos = null` (sin permisos asignados) es redirigido a login en loop.
Necesita que el guard también permita `session.role === 'cocinero'` con un tratamiento específico.

## Causa raíz

ARCH-001 paso 1.6 eliminó la lógica de kitchen.html y creó cocina.js, pero olvidó:
1. Actualizar el redirect en login.html
2. Eliminar el archivo kitchen.html
3. Agregar el permiso `cocina` a PERMISOS_DEF
4. Actualizar el guard de owner.html para el rol cocinero

## Archivos a tocar

- `public/login.html` → cambiar `cocinero: '/kitchen.html'` → `'/owner.html'`
- `public/kitchen.html` → reemplazar con meta-redirect a `/owner.html` (preserva bookmarks)
- `public/js/modules/usuarios.js` → agregar `{ key: 'cocina', label: '🍳 Cocina' }` a PERMISOS_DEF
- `public/owner.html` → extender guard y bloque de PANELS para rol cocinero sin permisos delegados

## Solución aplicada

**2026-05-23:**
- `login.html` — `cocinero: '/kitchen.html'` → `'/owner.html'`
- `kitchen.html` — reemplazado con meta-redirect + JS redirect a `/owner.html`
- `usuarios.js` — `{ key: 'cocina', label: '🍳 Cocina' }` agregado a PERMISOS_DEF entre `ordenes_historial` y `reservas_activas`
- `owner.html` — guard extendido: `['owner','admin','cocinero']`. Nuevo bloque para `session.role === 'cocinero' && !permisos`: oculta todos los paneles excepto Cocina y Cola del día, navega directo a Cocina.
