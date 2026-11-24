// Render frame range to an mp4 segment: node render.js startFrame endFrame out.mp4
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { once } = require('events');
const path = require('path');
const FPS = 30;
(async () => {
  const [s, e, out] = process.argv.slice(2);
  const start = +s, end = +e;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', err => console.error('PAGEERROR', err.message));
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = start; f < end; f++) {
    await page.evaluate(t => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 96 });
    if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    if ((f - start) % 150 === 0) console.log(`[${out}] frame ${f} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await once(ff, 'close');
  await browser.close();
})();
