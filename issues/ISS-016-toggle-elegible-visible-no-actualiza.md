# ISS-016 — Toggles "Cliente elige / Fijo" y "Visible / Oculto" no actualizan la UI

**Módulo:** Menú del día → ⚙ Configurar → Configuración para el cliente  
**Reportado:** 2026-06-15  
**Estado:** ✅ Resuelto 2026-06-15

## Síntoma

Al tocar el botón "Cliente elige" (para cambiar a "Fijo") o "Visible" (para cambiar a "Oculto") dentro de la sub-vista de configuración del menú, aparece el toast correcto ("Menú cambiado a: Fijo") pero el botón **no cambia de texto ni de estilo** en pantalla. El usuario tiene que recargar la página para ver el estado real.

## Causa raíz

`toggleElegibleMenu` y `toggleActivoMenu` llaman a `loadMenusDia()` después del PATCH. Esa función delega en `MenuWizard.reload()`, que re-fetcha y re-renderiza la **galería** (que está oculta cuando la vista de configuración está abierta). La vista de config (`#mc-body`) es renderizada por `renderConfigCliente()` a través de `recargarModalConfig()`, que **no se llamaba** desde los toggles.

## Fix — `public/owner.html`

En `toggleElegibleMenu` y `toggleActivoMenu`, agregar `recargarModalConfig()` tras `loadMenusDia()`:

```js
loadMenusDia();
recargarModalConfig();   // ← línea añadida
```

`recargarModalConfig()` ya tiene el guard `if (!configMenuId) return`, así que es no-op cuando se llama fuera de la vista de config (sin efecto colateral).
