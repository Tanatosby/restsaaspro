# Landing Page — Menupro.tech

> Documento de planificación de la landing page del producto.
> Cuando estés listo para construirla, este archivo tiene toda la estructura y los textos.
> Última actualización: 2026-05-27

---

## 1. Concepto general

**Producto:** Menupro.tech
**Tagline:** _Sistema de pedidos y reservas para tu restaurante. Desde el celular. Sin complicaciones._
**Tono:** directo, honesto, peruano. Sin corporativo, sin promesas vacías.
**Dominio:** menupro.tech
**Tipo de página:** landing de una sola columna, mobile-first (los dueños de restaurante la van a ver desde el celular).

---

## 2. Estructura de secciones

### Sección 1 — Hero

**Título:**
> Tu restaurante en el siglo XXI, sin volverte loco.

**Subtítulo:**
> Menupro es un sistema de pedidos, reservas y cocina para restaurantes pequeños. El cliente escanea un QR, pide desde su celular, y tú gestionas todo desde el tuyo.

**CTA principal:** `Quiero probarlo →` (enlaza a WhatsApp)
**CTA secundario:** `Ver cómo funciona ↓` (ancla a sección tutorial)

**Visual:** screenshot del menú QR del cliente (`menu.html`) en un celular.
_📸 Imagen pendiente: screenshot de menu.html con un menú real cargado._

---

### Sección 2 — El problema que resuelve

**Título:** _¿Todavía gestionas todo con cuaderno y WhatsApp?_

Tres puntos reales, sin exagerar:

- **El mozo olvida pedidos en hora pico** — Menupro los registra automáticamente desde la mesa.
- **La cocina no sabe qué preparar primero** — tiene su propio panel ordenado por urgencia.
- **No sabes cuánto ganaste este mes** — el sistema lleva el historial y te lo muestra en un gráfico.

_Sin inventar casos de uso que no existen en el sistema._

---

### Sección 3 — Cómo funciona (Tutorial visual)

**Título:** _Así de simple_

Tres pasos con screenshot de cada uno:

#### Paso 1 — El cliente pide desde su celular
> Pegas el QR en la mesa. El cliente lo escanea, ve el menú del día y la carta, elige sus platos y confirma. Sin descargar nada, sin crear cuenta.

_📸 Imagen pendiente: `menu.html` con selector de platos abierto._

#### Paso 2 — La cocina lo recibe en el momento
> El pedido aparece al instante en el panel de cocina. Nada de gritos ni papelitos. Cuando el plato está listo, el mozo recibe la señal.

_📸 Imagen pendiente: panel Cocina de `owner.html` con tarjetas de pedidos activos._

#### Paso 3 — Tú cobras y cierras la mesa
> El mozo marca el pedido como entregado, el cliente paga con Yape, Plin o efectivo, y la orden pasa al historial. Puedes ver tus ganancias del día en cualquier momento.

_📸 Imagen pendiente: panel Cola del día con tab "Por cobrar" y tarjeta de pago._

---

### Sección 4 — Qué incluye

**Título:** _Todo lo que necesitas para empezar_

Lista honesta de lo que ya existe en el sistema:

| Feature | Detalle |
|---------|---------|
| 📱 Menú QR para el cliente | El cliente abre desde su celular, sin app, sin cuenta |
| 🍽 Pedidos y reservas | Flujo completo: pide → cocina → entrega → cobro |
| 👨‍🍳 Panel de cocina | Vista unificada ordenada por urgencia |
| 📋 Kanban del día | Pendientes → En cocina → Listos → Por cobrar |
| 💳 Pagos Yape / Plin / Efectivo | El cliente sube foto del comprobante |
| 📊 Reportes y ganancias | Gráficas por día/semana/mes, descarga Excel |
| 🔔 Notificaciones push | Avisa al celular aunque la app esté cerrada |
| 🗺 Plano de mesas | Estado en tiempo real: libre / ocupada / reservada |
| 🚶 Para llevar y delivery | El cliente elige modalidad al pedir |
| 📲 Instala como app | PWA: se instala en el celular sin Play Store |

---

### Sección 5 — Quién lo hace (el ángulo honesto)

**Título:** _Construido diferente_

> Menupro es un producto indie desarrollado con inteligencia artificial y gestionado por una persona real. Eso significa: precio accesible, trato directo, sin burocracia, y mejoras constantes basadas en lo que realmente necesitan los restaurantes.
>
> No somos una empresa grande. Somos un sistema que funciona, probado en restaurantes reales, con soporte directo por WhatsApp.

_Este ángulo es una ventaja competitiva real frente a sistemas corporativos caros e impersonales._

---

### Sección 6 — Preguntas frecuentes

**¿Necesito instalar algo en el restaurante?**
> No. Solo necesitas celular con internet. Ni computadora ni tablet obligatorio.

**¿El cliente necesita crear una cuenta para pedir?**
> No. El cliente abre el QR, pide y listo. Sin registros, sin contraseñas.

**¿Funciona sin internet?**
> El sistema necesita conexión para recibir pedidos. Cualquier celular con datos o WiFi es suficiente.

**¿Qué pasa si tengo varios menús (universitario y ejecutivo, por ejemplo)?**
> Puedes crear varios menús activos al mismo tiempo con precios distintos. El cliente elige cuál quiere.

**¿Puedo usar Yape o Plin?**
> Sí. El sistema genera un botón que abre directamente la app de Yape o Plin en el celular del cliente con tu número precargado.

**¿Hay contrato de permanencia?**
> No. Pagas mes a mes. Si no funciona para ti, listo.

---

### Sección 7 — CTA final

**Título:** _¿Quieres probarlo en tu restaurante?_

> Los primeros restaurantes entran con precio especial. Escríbeme por WhatsApp y coordinamos una demo de 15 minutos.

**Botón:** `Escribir por WhatsApp →` (deep link con mensaje predeterminado)

Mensaje predeterminado sugerido:
> "Hola, me interesa probar Menupro en mi restaurante. ¿Podemos coordinar una demo?"

---

## 3. Screenshots que necesitas tomar

Antes de construir la landing, toma estas capturas desde el sistema corriendo:

| # | Qué capturar | Dónde | Para qué sección |
|---|-------------|-------|-----------------|
| 1 | Menú QR con platos del día cargados | `menu.html` | Hero + Paso 1 |
| 2 | Selector de platos abierto (cliente eligiendo) | `menu.html` | Paso 1 |
| 3 | Panel Cocina con tarjetas de pedidos activos | `owner.html` → Cocina | Paso 2 |
| 4 | Cola del día — tab "Por cobrar" con una tarjeta | `owner.html` → Cola del día | Paso 3 |
| 5 | Plano de mesas con mesas ocupadas y libres | `owner.html` → Plano | Sección features |
| 6 | Gráfica de ganancias del panel Reportes | `owner.html` → Reportes | Sección features |
| 7 | Vista general del sidebar de owner.html en móvil | `owner.html` | Sección "quién lo hace" |

**Cómo tomarlas desde la laptop (sin necesitar el celular físico):**

1. Corre el sistema: `npm start` en la terminal del proyecto
2. Abre Chrome o Brave → `F12` → icono de celular arriba a la izquierda (Toggle device toolbar)
3. Selecciona el dispositivo:
   - Para `owner.html` (panel del dueño/mozo/cocina): **Galaxy S20** (360×800) — representa el target real
   - Para `menu.html` (vista del cliente): **iPhone 14** o **Galaxy S20** — cualquiera se ve bien
4. Recarga la página (`Ctrl+R`) para que el CSS mobile-first se aplique correctamente
5. Navega a la pantalla exacta que quieres capturar
6. Toma la screenshot: `Ctrl+Shift+P` → escribe `screenshot` → selecciona **Capture screenshot**
   - Chrome genera la imagen del viewport del dispositivo simulado, sin bordes del navegador
7. Guarda cada imagen en `public/landing/screenshots/` con nombre descriptivo (ej: `menu-cliente-platos.png`)

**Requisito:** tener datos en la BD para que las pantallas se vean con contenido real.
Si la BD local está vacía, entra como owner y crea: un menú del día con 3-4 platos, una carta con 2-3 ítems, y 3-4 mesas. Con eso es suficiente para que todas las pantallas se vean bien.

**Alternativa recomendada:** esperar al primer restaurante real en producción y tomar las screenshots con datos reales. Una landing con datos auténticos convence más.

---

## 4. Panel admin para monitorear la landing

Una vez construida la landing, tiene sentido agregar en el panel admin (`/admin/dashboard`) una sección pequeña con:

- **Visitas a la landing** — requiere un script de tracking mínimo (no Google Analytics, algo propio: `POST /api/public/track` con evento `landing_view`)
- **Clics en el CTA de WhatsApp** — el botón de WhatsApp llama a `trackCTA()` antes de abrir el link
- **Leads recibidos** — si se agrega un formulario de contacto, los mensajes aparecen en el admin

**Prioridad:** baja. Construir después de tener los primeros 3 restaurantes. Al principio, WhatsApp directamente es suficiente para saber si hay interés.

---

## 5. Stack de la landing

- HTML/CSS/JS vanilla — igual que el resto del proyecto
- Sin framework, sin build step
- Mobile-first obligatorio (los dueños de restaurante la ven desde el celular)
- Tailwind CSS para esta página (es nueva, no tiene CSS legacy que mantener)
- Archivo: `public/landing.html`
- Ruta en `app.js`: `/` (raíz) o `/landing`

---

## 6. Decisiones pendientes antes de construir

- [ ] ¿La landing va en la raíz `/` o en `/landing`? Si va en `/`, el acceso a `/login` y `/admin/login` sigue igual.
- [ ] ¿Número de WhatsApp para el CTA? (para el deep link)
- [ ] ¿El precio? — la landing puede no mencionarlo ("escríbeme y coordinamos") o poner un precio tentativo.
- [ ] Screenshots tomadas y en `public/landing/screenshots/`

---

## 7. Nombre y dominio

- **Nombre del producto:** Menupro
- **Dominio:** menupro.tech ($6.99 primer año en Porkbun, renueva ~$50/año)
- **Cómo explicarlo en Perú:** "se escribe como tecnología pero con h"
- **Estado:** pendiente de comprar
