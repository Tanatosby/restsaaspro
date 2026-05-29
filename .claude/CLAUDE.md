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

`owner.html` es el orquestador. La lógica vive en `public/js/modules/`:
- `utils.js` — api(), toast(), esc(), fDate(), fDT() — compartido
- `ordenes.js` — lógica de órdenes
- `reservas.js` — lógica de reservas
- `pedidos.js` — vista unificada (cola del día)
- `mesas.js` — plano de mesas
- `cocina.js` — cola de cocina (compartido con kitchen.html)
- `reportes.js` — métricas y gráficas
- `config.js` — configuración del restaurante
- `usuarios.js` — gestión de usuarios
`kitchen.html` importa solo `cocina.js` — vista minimalista para cocinero.

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

**El objetivo:** que cualquier sesión futura (desde cualquier laptop) arranque con documentación exacta del estado real del proyecto.

## Gestión de Issues

El proyecto tiene una carpeta `issues/` en la raíz para tracking de bugs y problemas encontrados en producción/testing.

- Cada issue tiene su propio archivo `issues/ISS-XXX-titulo.md` con descripción, pasos para reproducir, capturas y diagnóstico técnico.
- Las capturas de pantalla se guardan en `issues/screenshots/`.
- El archivo `issues/ISSUES.md` es el índice central con todos los issues y su estado.
- Al inicio de cada sesión, si hay issues abiertos relevantes al trabajo, mencionarlos.
- El usuario trabaja desde 2 laptops distintas, por lo tanto al inicio de sesión siempre leer CLAUDE.md, vision_negocio.md, features.md, status.md e ISSUES.md para tener contexto completo antes de cualquier tarea.
- `vision_negocio.md` es la brújula del proyecto: define el target (restaurantes de menú pequeños, NO restaurantes elegantes), los flujos reales de reserva/orden/cocina/pago, los roles y los 15 gaps pendientes. Leerlo siempre — evita implementar cosas que no encajan con el negocio real.
- El usuario puede enviar capturas de pantalla (rutas de archivo) para diagnóstico — leerlas con Read tool.
- Para diagnosticar bugs de frontend: pedir captura de consola (F12 → Console) y Network tab con la request fallida.

