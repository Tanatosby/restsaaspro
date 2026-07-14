# ISS-024 — Fotos de `/uploads` se re-descargan en cada carga de página (sin caché HTTP)

**Módulo:** `app.js`
**Prioridad:** 🟡 Media — contribuye a la lentitud percibida al mostrar el menú/platos, especialmente en redes móviles
**Estado:** ✅ Resuelto 2026-07-14

## Reporte original

Junto con ISS-023 (Cola del día lenta), el usuario mencionó: "hoy también hubo cierta lentitud en desplegar las imágenes del menú."

## Diagnóstico

`app.js` sirve todo `public/` (HTML, CSS, JS, y `uploads/`) con un solo `express.static(path.join(__dirname, 'public'))`, sin ninguna opción de caché. Por defecto, `express.static` agrega `ETag`/`Last-Modified` pero **no** `max-age` — el navegador puede hacer peticiones condicionales (`304 Not Modified`, barato en payload) pero **siempre tiene que ir a la red a preguntar**, nunca sirve la imagen desde su propio caché local sin una request. En una conexión móvil con latencia alta (el escenario típico de este proyecto — "celulares de gama media"), eso significa que **cada foto del menú dispara un round-trip real al servidor en cada carga de página**, aunque el archivo no haya cambiado nunca.

Esto es innecesario acá: las fotos de platos/portada/comprobantes ya se suben con nombres **versionados** (`plato_${id}_${Date.now()}.jpg`, ver comentario en `routes/menu.js` — deliberado desde ISS-015, precisamente para evitar que el navegador muestre una foto vieja tras editarla). Como una URL de `/uploads` **nunca cambia de contenido** una vez creada, es seguro cachearla de forma agresiva y permanente.

No se encontraron fotos de gran tamaño fuera de lo normal en este entorno de desarrollo (la mayoría ~12-15KB, una de 218KB) — el problema no es el peso de una foto puntual, sino que **todas** se vuelven a pedir en cada visita sin necesidad.

## Fix

**`app.js`** — nuevo middleware específico para `/uploads` montado *antes* del `express.static(public)` general:
```js
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
  maxAge: '1y',
  immutable: true,
}));
```
El resto de `public/` (`owner.html`, `menu.html`, CSS, JS) **no** lleva `max-age` — deben poder revalidarse en cada visita para no quedar desactualizados (ver ISS-022, que ya cubre el caso específico del Service Worker instalado).

## Verificación

`curl -I` contra servidor local: `/uploads/platos-menu/*.jpg` → `Cache-Control: public, max-age=31536000, immutable`; `/owner.html` y `/css/owner.css` → siguen en `max-age=0` (sin cambios, revalidan siempre). **267/267 jest verde** (cambio de configuración de servidor estático, sin lógica de negocio).

## Pendiente

Desplegar a producción. El beneficio se nota más en visitas repetidas al mismo menú/panel dentro de la ventana de caché (1 año) — clientes recurrentes y el propio owner revisando el panel varias veces al día.
