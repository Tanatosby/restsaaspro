'use strict';
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page    = await browser.newPage();

  const htmlPath = 'file:///' + path.join(__dirname, 'dosier.html').replace(/\\/g, '/');
  await page.goto(htmlPath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500); // esperar Google Fonts

  const dest = path.join(__dirname, 'Menupro-Dosier.pdf');
  await page.pdf({
    path:   dest,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  console.log('✅ PDF generado:', dest);
  await browser.close();
})();
