/**
 * build-landing.js
 * Genera public/landing.html a partir del mockup landing/landing-concepto.html.
 *
 * El mockup (publicado como artifact) es la FUENTE: ahí se diseña y se prueba.
 * Este script lo convierte en la página de producción:
 *   - envuelve el fragmento en un documento completo (title, meta, Open Graph, íconos);
 *   - pasa los enlaces absolutos a menupro.tech a rutas relativas (/login, /menu…);
 *   - apunta el video, su póster y sus subtítulos a /landing/media/;
 *   - QUITA la sección de precios (en el mockup vive oculta con `hidden`, pero en producción
 *     el HTML es público: con `hidden` los precios seguirían visibles en "ver código fuente").
 *
 * Uso:  node scripts/build-landing.js
 * Para publicar los precios: quitar la limpieza de "PRECIOS" de abajo y volver a correrlo.
 */
const fs = require('fs/promises');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const FUENTE = path.join(RAIZ, 'landing', 'landing-concepto.html');
const SALIDA = path.join(RAIZ, 'public', 'landing.html');
const MEDIA_ORIGEN = path.join(RAIZ, 'landing', 'media');           // fuera de git (ver .gitignore)
const MEDIA_DESTINO = path.join(RAIZ, 'public', 'landing', 'media'); // el que sirve Express

const SITIO = 'https://menupro.tech';
const TITULO = 'Menupro — Sistema de pedidos para tu restaurante';
const DESCRIPCION = 'Menupro es un sistema de pedidos, reservas y cocina para restaurantes que venden menú. ' +
  'El cliente escanea un QR, pide desde su celular, y tú gestionas todo desde el tuyo.';

/** Corta `texto` desde `desde` hasta el final de `hasta` (inclusive); lanza si falta alguna marca. */
function quitarBloque(texto, desde, hasta, etiqueta) {
  const i = texto.indexOf(desde);
  if (i === -1) throw new Error(`No se encontró el inicio de "${etiqueta}"`);
  const j = texto.indexOf(hasta, i);
  if (j === -1) throw new Error(`No se encontró el final de "${etiqueta}"`);
  return texto.slice(0, i) + texto.slice(j + hasta.length);
}

async function copiarMedia() {
  let archivos;
  try { archivos = await fs.readdir(MEDIA_ORIGEN); }
  catch { return console.log('· landing/media no existe en este equipo — se usa el que ya está en public/landing/media'); }
  await fs.mkdir(MEDIA_DESTINO, { recursive: true });
  for (const a of archivos) await fs.copyFile(path.join(MEDIA_ORIGEN, a), path.join(MEDIA_DESTINO, a));
  console.log(`· media copiada a public/landing/media (${archivos.join(', ')})`);
}

async function main() {
  const html = await fs.readFile(FUENTE, 'utf8');

  // 1) Estilos y cuerpo del fragmento
  const iEstilo = html.indexOf('<style>');
  const fEstilo = html.indexOf('</style>');
  if (iEstilo === -1 || fEstilo === -1) throw new Error('El mockup no tiene <style>');
  let css = html.slice(iEstilo + '<style>'.length, fEstilo);
  let cuerpo = html.slice(fEstilo + '</style>'.length);

  // 2) PRECIOS: fuera de producción (CSS + HTML + reglas responsive sueltas)
  const iPrecios = css.indexOf('  /* ============ PRICING ============ */');
  const iPie = css.indexOf('  /* ============ FOOT ============ */');
  if (iPrecios === -1 || iPie === -1 || iPie < iPrecios) throw new Error('No se encontró el CSS de precios');
  css = (css.slice(0, iPrecios) + css.slice(iPie))
    .replace(/\n {4}\.plans \{ grid-template-columns: 1fr; \}/, '')
    .replace(/\n {4}\.plan--reco \{ order: -1; \}/, '');
  cuerpo = quitarBloque(cuerpo, '<!-- PRECIOS OCULTOS', '</section>', 'sección de precios');

  // 3) Enlaces relativos y medios del video
  cuerpo = cuerpo.split(`${SITIO}/`).join('/');
  // "Ingresar" navega en la misma pestaña (es la app, no un extra); demo y manuales sí abren aparte
  cuerpo = cuerpo.split('href="/login" target="_blank" rel="noopener"').join('href="/login"');
  cuerpo = cuerpo
    .replace('src="karina-landing.mp4"', 'src="/landing/media/karina-landing.mp4"')
    .replace('poster="karina-poster.jpg"', 'poster="/landing/media/karina-poster.jpg"')
    .replace(/(<source src="\/landing\/media\/karina-landing\.mp4" type="video\/mp4">)/,
      '$1\n        <track kind="captions" srclang="es" label="Español" src="/landing/media/karina.vtt">');
  cuerpo = quitarBloque(cuerpo, '<!-- Video testimonial. Archivos aparte', '-->', 'comentario de medios');

  // 4) Base que en el artifact ponía el envoltorio de publicación
  const base = `  :root { color-scheme: light; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark; } }
  [hidden]:not([hidden=until-found i]) { display: none !important; }
  img { max-width: 100%; }
`;

  const doc = `<!DOCTYPE html>
<!-- ARCHIVO GENERADO — no editar a mano. Fuente: landing/landing-concepto.html
     Regenerar con: node scripts/build-landing.js -->
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${TITULO}</title>
  <meta name="description" content="${DESCRIPCION}">
  <meta name="theme-color" content="#F7F6F1" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#15120D" media="(prefers-color-scheme: dark)">
  <link rel="canonical" href="${SITIO}/">
  <link rel="icon" type="image/png" href="/icons/icon-192.png">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">

  <!-- Al compartir el link por WhatsApp / redes -->
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_PE">
  <meta property="og:site_name" content="Menupro">
  <meta property="og:url" content="${SITIO}/">
  <meta property="og:title" content="${TITULO}">
  <meta property="og:description" content="${DESCRIPCION}">
  <meta property="og:image" content="${SITIO}/landing/og-menupro.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
  <style>
${base}${css}</style>
</head>
<body>
${cuerpo.trim()}
</body>
</html>
`;

  await fs.writeFile(SALIDA, doc, 'utf8');
  await copiarMedia();
  console.log(`✅ ${path.relative(RAIZ, SALIDA)} generado (${(doc.length / 1024).toFixed(1)} KB)`);
}

main().catch(e => { console.error('❌ build-landing:', e.message); process.exit(1); });
