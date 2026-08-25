# ISS-075 — "Agregar manual" simplificado: lista plana, mesa/nombre opcionales

**Estado:** Resuelto — 2026-08-25
**Reportado por:** el usuario, contando una conversación del mismo día con la dueña

## Problema

Retoma de la conversación de ISS-072/073/074: la dueña no logra registrar un pedido verbal por
su cuenta. Las únicas veces que usó "Agregar manual" fue con el usuario guiándola paso a paso
("¿y ahora? ah ya, el nombre no? ah ya, ¿y cómo lo coloco?"). El mismo día, sin guía, no
registró ningún pedido manual — llegó a preguntar dónde queda la pantalla estando parada ahí
mismo, y volvió a preguntar 30 minutos después de que se lo explicaran (ver `pilotos.md`, Día
11). No es un problema de encontrar el botón — vive en el header de Cola del día, la primera
pantalla del bottom-nav — es que el procedimiento no se le queda entre usos.

## Causa encontrada al revisar el modal completo

"Agregar manual" no era un atajo rápido — abría el mismo camino que el flujo del cliente:
tarjeta del menú → por cada sección (Entrada, Segundo, Postre…) un chip que abría **otro modal
encima** (`PlatoPicker`, grid de fotos) para elegir el plato → repetir por sección → recién ahí
enviar. Modal-sobre-modal, con fotos que ella no necesita (ya sabe qué es cada plato).

## Fix

- `owner.html` — "Mesa" y "Nombre del cliente" ya eran opcionales en el backend; se agregó
  "(opcional)" a ambas etiquetas para que no tenga que preguntarse si hace falta llenarlos.
- `pedidos.js` — `renderManualSeccion()` reemplaza el chip + `abrirPickerManual()` (que abría
  PlatoPicker) por una lista plana de nombres de plato, inline, sin modal aparte ni fotos. Tocar
  un plato lo selecciona; tocar el mismo de nuevo lo deselecciona (mismo patrón de ISS-069).
  `elegirPlatoManual()` ahora hace la mutación de estado y el repintado en un solo lugar
  (antes el repintado vivía en el callback `onSelect` de PlatoPicker).
- Se eliminó `abrirPickerManual()` (sin más usos).
- La carta (`renderManualCartaItem`) no se tocó — ya era una lista plana con stepper, sin fotos
  ni modal, cumplía el objetivo desde antes.

Sin cambios de backend ni de base de datos. 34/34 test suites, 458/458 tests.

## Nota aparte, sin implementar — kardex de stock en carta

En la misma conversación se planteó que "Agregar manual" descuente stock también para platos
de carta (hoy solo descuenta menú del día — `descontarStock()` en `utils/stock.js` está escrito
específicamente para `componentes_menu_dia`, sin ningún concepto de carta). Investigado: no es
un ajuste chico — `platos_carta` no tiene columnas `stock_inicial`/`stock_restante`, y el patrón
"no descuenta carta" se repite en 4 lugares (`routes/orders.js`, `routes/public.js` ×2,
`routes/reservations.js`). Del mismo tamaño que cuando se construyó el stock por plato del menú
del día en julio. **Decisión del usuario: separarlo** — queda como su propio ítem en
`backlog.md`, no implementado hoy.

## Verificación pendiente

Sin probar en uso real — confirmar que la dueña logra registrar un pedido manual sola, sin guía.
