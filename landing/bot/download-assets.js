'use strict';
// Descarga ~12 imágenes de platos peruanos via Wikipedia REST API.
// Artículos verificados manualmente — todos tienen thumbnail disponible.
// Uso: node landing/bot/download-assets.js

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const cfg    = require('./config');

// Artículos Wikipedia verificados (tienen thumbnail) → nombre local
const PLATOS = [
  { local: 'lomo-saltado.jpg',     articulo: 'Lomo_saltado',            desc: 'Lomo saltado'        },
  { local: 'aji-de-gallina.jpg',   articulo: 'Aji_de_gallina',          desc: 'Ají de gallina'      },
  { local: 'ceviche.jpg',          articulo: 'Ceviche',                  desc: 'Ceviche'             },
  { local: 'causa-rellena.jpg',    articulo: 'Causa_lime%C3%B1a',       desc: 'Causa rellena'       },
  { local: 'papa-huancaina.jpg',   articulo: 'Papa_a_la_huanca%C3%ADna', desc: 'Papa a la huancaína' },
  { local: 'arroz-con-leche.jpg',  articulo: 'Rice_pudding',             desc: 'Arroz con leche'     },
  { local: 'chicha-morada.jpg',    articulo: 'Chicha_morada',            desc: 'Chicha morada'       },
  { local: 'pollo-brasa.jpg',      articulo: 'Pollo_a_la_brasa',         desc: 'Pollo a la brasa'    },
  { local: 'seco-pollo.jpg',       articulo: 'Chicken_stew',             desc: 'Seco de pollo'       },
  { local: 'tacu-tacu.jpg',        articulo: 'Tacu-tacu',                desc: 'Tacu tacu'           },
  { local: 'mazamorra-morada.jpg', articulo: 'Mazamorra',                desc: 'Mazamorra morada'    },
  { local: 'chicharron.jpg',       articulo: 'Chicharr%C3%B3n',          desc: 'Chicharrón'          },
];

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MenuProBot/1.0 (educational project)' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return getJson(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`JSON inválido (HTTP ${res.statusCode})`)); }
      });
    }).on('error', reject);
  });
}

function downloadStream(url, destPath, hops = 0) {
  return new Promise((resolve, reject) => {
    if (hops > 5) return reject(new Error('Demasiados redirects'));
    https.get(url, { headers: { 'User-Agent': 'MenuProBot/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return downloadStream(res.headers.location, destPath, hops + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', err => {
        fs.existsSync(destPath) && fs.unlinkSync(destPath);
        reject(err);
      });
    }).on('error', reject);
  });
}

async function getImagenWikipedia(articulo) {
  const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${articulo}`;
  const { status, body } = await getJson(apiUrl);
  if (status !== 200) throw new Error(`API HTTP ${status}`);
  // Preferir originalimage (mayor resolución), fallback a thumbnail
  const src = body?.originalimage?.source || body?.thumbnail?.source;
  if (!src) throw new Error('Sin imagen en artículo');
  // Escalar a 640px si es thumb de Wikimedia
  return src.replace(/\/\d+px-/, '/640px-');
}

async function main() {
  const assetsDir = cfg.ASSETS_DIR;
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  console.log(`\n📥 Descargando ${PLATOS.length} imágenes via Wikipedia REST API...\n`);

  const resultados = { ok: [], error: [] };

  for (const plato of PLATOS) {
    const destPath = path.join(assetsDir, plato.local);

    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 5000) {
      console.log(`  ⏭  ${plato.desc} — ya existe`);
      resultados.ok.push(plato.local);
      continue;
    }

    try {
      process.stdout.write(`  ⬇  ${plato.desc}...`);
      const imgUrl = await getImagenWikipedia(plato.articulo);
      await delay(400);
      await downloadStream(imgUrl, destPath);
      const kb = Math.round(fs.statSync(destPath).size / 1024);
      console.log(` ✓ ${kb}KB`);
      resultados.ok.push(plato.local);
      await delay(700);
    } catch (err) {
      console.log(` ✗ ${err.message}`);
      resultados.error.push({ local: plato.local, desc: plato.desc, error: err.message });
      await delay(1000);
    }
  }

  console.log(`\n${resultados.ok.length === PLATOS.length ? '✅' : '⚠ '} Descargadas: ${resultados.ok.length}/${PLATOS.length}`);

  if (resultados.error.length > 0) {
    console.log(`\nFallos (${resultados.error.length}):`);
    resultados.error.forEach(e => console.log(`  - ${e.desc}: ${e.error}`));
  }

  const indice = PLATOS.map(p => ({
    archivo:     p.local,
    descripcion: p.desc,
    disponible:  fs.existsSync(path.join(assetsDir, p.local)) && fs.statSync(path.join(assetsDir, p.local)).size > 5000,
  }));
  fs.writeFileSync(path.join(assetsDir, 'index.json'), JSON.stringify(indice, null, 2), 'utf8');
  console.log('\n  📋 Índice guardado en assets/index.json\n');
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
