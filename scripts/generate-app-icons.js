// scripts/generate-app-icons.js
// Regenera los íconos de la PWA (public/icons/icon-192.png, icon-512.png)
// con el monograma "MP" de Menú Pro, usando los colores de marca ya
// definidos (terracota). Usa Playwright (ya es devDependency del proyecto)
// para renderizar HTML/CSS y capturarlo como PNG — mismo enfoque que
// scripts/take-landing-screenshots.js.

const { chromium } = require('playwright');
const path = require('path');

const TERRACOTA_BG     = '#c8692a';
const TERRACOTA_CIRCLE = '#a0521e';

async function generarIcono(browser, size, outPath) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`
    <html><body style="margin:0;padding:0;">
      <div style="
        width:${size}px;height:${size}px;
        background:${TERRACOTA_BG};
        display:flex;align-items:center;justify-content:center;
      ">
        <div style="
          width:${Math.round(size * 0.72)}px;height:${Math.round(size * 0.72)}px;
          border-radius:50%;
          background:${TERRACOTA_CIRCLE};
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="
            font-family:Arial, Helvetica, sans-serif;
            font-weight:700;
            font-size:${Math.round(size * 0.34)}px;
            color:#ffffff;
            letter-spacing:-1px;
          ">MP</span>
        </div>
      </div>
    </body></html>
  `);
  await page.screenshot({ path: outPath });
  await page.close();
}

(async () => {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  const browser  = await chromium.launch();

  await generarIcono(browser, 192, path.join(iconsDir, 'icon-192.png'));
  await generarIcono(browser, 512, path.join(iconsDir, 'icon-512.png'));

  await browser.close();
  console.log('✅ Íconos regenerados con el monograma "MP" en', iconsDir);
})();
