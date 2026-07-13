# ISS-017 — Botón "Abrir Yape" abre página inexistente

**Estado:** ✅ cerrado — 2026-07-13
**Módulo:** Pagos / `menu.html`
**Reproducible:** siempre
**Fecha detectado:** 2026-07-13

---

## Descripción

En el paso de pago de `menu.html`, al elegir "Pagar con Yape" se mostraba un botón "Abrir Yape 💚" que enlazaba a `https://yape.com.pe/cobrar?phone=XXXX`. Esa URL no es un endpoint real de Yape — no existe una página web pública para abrir la app con un número pre-cargado. El botón llevaba a una página inexistente, rompiendo el flujo de pago del cliente.

## Causa raíz

Se asumió (documentado en `features.md`) que Yape ofrecía un deep link web público tipo `yape.com.pe/cobrar?phone=...`, similar a como funcionan algunos deep links de otras apps. Yape no expone ese endpoint sin integración de comercio afiliado.

## Solución aplicada

Se alineó el flujo de Yape con el de Plin (que nunca tuvo este problema porque no intentaba abrir ninguna app):
- `public/menu.html`: reemplazado el `<a href="https://yape.com.pe/cobrar...">` por un botón "Copiar número 📋" (`navigator.clipboard.writeText`), igual que el flujo de Plin.
- Texto de instrucción actualizado: "Abre tu app Yape, paga a este número y luego sube la foto del comprobante."
- `features.md`: quitada la referencia al deep link inexistente en las secciones de descripción de Yape y de frontend implementado.

## Archivos modificados

- `public/menu.html` (función `seleccionarMetodoPago`, rama `yape`)
- `features.md` (sección Yape + resumen frontend `menu.html`)
