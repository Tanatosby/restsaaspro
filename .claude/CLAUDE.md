# Menú Pro
## Stack
- Node.js + Express
- JWT Auth + JWT en cookie httpOnly
- SQLite (better-sqlite3) → PostgreSQL (migración futura)
- Frontend: HTML/CSS/JS vanilla + ES Modules (sin framework)
- CSS: custom en archivos existentes; Tailwind para módulos nuevos (adopción progresiva)

## Convenciones
- Siempre usar async/await, no callbacks
- Comentarios en español
- Variables y funciones en inglés
- **Todo el frontend debe ser mobile-first obligatorio** — ver sección Mobile

## Mobile-first — REQUISITO NO NEGOCIABLE

El sistema vive en celulares de gama media. No hay tablets. No hay laptops en el punto de venta.
Todos los usuarios (owner, mozo, cocinero, cliente) usan celular.

Reglas que aplican a TODO el código frontend:
- Touch targets mínimo 44×44px (botones, inputs, links)
- Font-size mínimo 14px en texto de contenido, 16px en inputs (evita zoom automático en iOS)
- Sin overflow horizontal — todo debe entrar en 360px de ancho mínimo
- Sin hover-only interactions — cualquier acción debe funcionar con tap
- Imágenes y assets optimizados para conexión móvil (sin archivos pesados innecesarios)
- Formularios con `type` correcto en inputs (tel, number, email) para activar teclado correcto
- El sistema debe ser instalable como PWA (manifest.json + service worker)

## Arquitectura de módulos JS

`owner.html` es el **único** orquestador — todos los roles (owner, admin, mozo, cocinero)
entran por ahí, con paneles filtrados según permisos (ver `usuarios.js` / `PERMISOS_DEF`). Un
cocinero sin permisos delegados ve solo los paneles Cocina + Cola del día. `kitchen.html` **no
existe como vista propia desde 2026-05-23** (ISS-007) — el archivo sigue en disco solo como
stub de redirect a `/owner.html` (preserva bookmarks viejos), no importa nada.

La lógica vive en `public/js/modules/`:
- `utils.js` — api(), toast(), esc(), fDate(), fDT() — compartido
- `ordenes.js` — lógica de órdenes
- `reservas.js` — lógica de reservas
- `pedidos.js` — vista unificada (cola del día)
- `mesas.js` — plano de mesas
- `cocina.js` — cola de cocina, panel "Cocina" dentro de `owner.html`
- `reportes.js` — métricas y gráficas
- `config.js` — configuración del restaurante
- `usuarios.js` — gestión de usuarios

## Otras configuraciones

3. Las ideas y problemas los escribiré en español, por lo tanto debes responderme siempre en español para mayor comprensión.
4. Ante cada prompt, primero presenta tu análisis del problema y un TODO list con los pasos propuestos para la solución. Este TODO list puede ser modificado por mí antes de proceder.
5. Una vez aprobado el TODO list, ejecuta cada paso de forma secuencial, uno por uno.
6. Si no existe aún, crea el archivo status.md en la raíz del proyecto. En él debes registrar y actualizar el estado del proyecto, marcando el estado actual de los cambios y el historial de prompts.

## PowerShell — regla de encoding

**NUNCA usar `Set-Content -Encoding utf8` en PowerShell 5.1** para archivos HTML/JS/CSS.
PowerShell 5.1 agrega BOM (UTF-8 con BOM) que corrompe caracteres especiales en el navegador.

Siempre usar para escribir archivos de texto:
```powershell
[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
```
O preferir las herramientas `Write` y `Edit` del editor que no introducen BOM.
Ver ISS-004 para contexto completo.

## Documentación — regla obligatoria

Al finalizar cada tarea o sesión de trabajo, siempre actualizar todos los `*.md` relevantes para mantener consistencia:
- `status.md` — registrar el prompt, los cambios realizados y el estado actual
- `vision_negocio.md` — si cambia algún flujo, decisión o gap
- `features.md` — si se completa, agrega o modifica un feature o ARCH
- `issues/ISSUES.md` — si se abre, avanza o resuelve un issue
- `issues/REFACTOR-XXX.md` o `issues/ISS-XXX.md` — si aplica al trabajo del día
- `pilotos.md` — registro día a día de las incidencias de uso real con los restaurantes piloto.
  **Cada entrada lleva fecha explícita** (no solo "Día N" — el número de día sin la fecha calendario
  al lado es lo que generó el hueco del 2026-08-19: quedaron sin registrar los días entre una
  visita y la siguiente). Si el usuario cuenta algo de un piloto en la conversación (qué pasó, qué
  dijo el dueño, quién lo usó), anotarlo ahí el mismo día — no esperar a que pregunte por qué falta.
- `public/js/modules/novedades.js` — no es `.md` pero sigue la misma regla: si el cambio es
  visible para la dueña en el panel (owner/admin), agregar una entrada nueva al array
  `NOVEDADES`, en su idioma, no técnico (mismo hábito que `status.md`, para otro público). Ver
  `issues/ISS-076-que-hay-de-nuevo.md`.

**El objetivo:** que cualquier sesión futura (desde cualquier laptop) arranque con documentación exacta del estado real del proyecto.

## Deploys — los hace SIEMPRE el usuario

**Claude Code no despliega y no debe intentarlo.** No tiene acceso al servidor de producción y no es algo por resolver: es cómo funciona el proyecto. Todo deploy lo ejecuta el usuario a mano, por la consola web del Droplet o por SSH interactivo. Detalle completo en `deploy.md` §16.

- Cuando una tarea termina con "pendiente: deploy", **el trabajo de Claude ya está completo**.
- No proponer automatizar deploys, cargar claves en el `ssh-agent`, ni pedir credenciales del servidor.
- **Al terminar cada commit, preguntarle al usuario si ya está desplegado** y anotar la respuesta en `status.md` (commit + fecha). El deploy suele ocurrir horas o días después, a veces desde la otra laptop, así que sin preguntar el log se desactualiza.

**Por qué importa:** el 2026-08-10 una sesión calculó **16 commits pendientes de deploy cuando en realidad eran 2** — un deploy hecho por la consola web entre el 16 de julio y el 10 de agosto nunca se anotó. Con el dato equivocado casi se implementa una feature (auto-actualización del service worker) para resolver un problema que ya no existía. **Un log de deploys inexacto hace que se tomen decisiones de producto sobre datos falsos.**

## Git — commitear siempre directo a `main`

**No crear ramas de feature. Commitear y pushear siempre directo a `main`.**

Es un repo de un solo desarrollador, sin PRs ni revisión de terceros, sin CI que gatee sobre
ramas. `deploy.md` confirma que el deploy hace `git pull origin main` directamente — una rama
sin mergear no tiene ningún efecto sobre producción y solo agrega un paso extra. El historial
completo del repo (76+ commits verificados) es todo directo a `main`; nunca se usó una rama.

La regla genérica de "ramear antes de commitear en la rama por defecto" no aplica a este flujo
trunk-based — no sugerir ni crear una rama antes de commitear en este repo.

## Gestión de Issues

El proyecto tiene una carpeta `issues/` en la raíz para tracking de bugs y problemas encontrados en producción/testing.

- Cada issue tiene su propio archivo `issues/ISS-XXX-titulo.md` con descripción, pasos para reproducir, capturas y diagnóstico técnico.
- Las capturas de pantalla se guardan en `issues/screenshots/`.
- El archivo `issues/ISSUES.md` es el índice central con todos los issues y su estado.
- Al inicio de cada sesión, si hay issues abiertos relevantes al trabajo, mencionarlos.
- El usuario trabaja desde 2 laptops distintas, por lo tanto al inicio de sesión siempre leer CLAUDE.md, vision_negocio.md, features.md, status.md, backlog.md, ISSUES.md y pilotos.md para tener contexto completo antes de cualquier tarea.
- `backlog.md` es el plan priorizado de la etapa (P0/P1/P2) con el porqué de cada prioridad y el contexto de los pilotos. Es la fuente para "¿qué sigue?". Actualizarlo al cerrar cada sesión. **Ojo:** los archivos `conversacion_*.md` están en `.gitignore` y no viajan entre laptops — si el usuario trae uno con decisiones nuevas, portar lo que sea permanente a `backlog.md`.
- `vision_negocio.md` es la brújula del proyecto: define el target (restaurantes de menú pequeños, NO restaurantes elegantes), los flujos reales de reserva/orden/cocina/pago, los roles y los 15 gaps pendientes. Leerlo siempre — evita implementar cosas que no encajan con el negocio real.
- El usuario puede enviar capturas de pantalla (rutas de archivo) para diagnóstico — leerlas con Read tool.
- Para diagnosticar bugs de frontend: pedir captura de consola (F12 → Console) y Network tab con la request fallida.

