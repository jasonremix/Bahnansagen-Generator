// Render single frames at given times: node preview.js outdir t1 t2 ...
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [out, ...times] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGEERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  for (const t of times) {
    await page.evaluate(t => window.render(t), parseFloat(t));
    await page.screenshot({ path: `${out}/f_${String(t).padStart(6, '0')}.png` });
  }
  await browser.close();
})();
