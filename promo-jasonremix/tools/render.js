// Rendert scene.html Frame für Frame und schreibt das Video.
// node tools/render.js [--preview t1,t2,...] [--from s --to s] [--workers n] [--fps n]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), BUILD = path.join(ROOT, 'build');
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const TL = JSON.parse(fs.readFileSync(path.join(BUILD, 'timeline.json')));
const FPS = +arg('--fps', TL.fps), total = Math.round(TL.duration * FPS);

async function page(browser) {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('PAGEERROR', e.message));
  await p.goto('file://' + path.join(ROOT, 'scene.html'));
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); window.setup(); });
  return p;
}

(async () => {
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--font-render-hinting=none'] });
  const prev = arg('--preview');
  if (prev) {
    const p = await page(browser);
    fs.mkdirSync(path.join(BUILD, 'preview'), { recursive: true });
    for (const t of prev.split(',').map(Number)) {
      await p.evaluate(t => window.seek(t), t);
      await p.screenshot({ path: path.join(BUILD, 'preview', `t${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 85 });
    }
    await browser.close(); return;
  }
  const from = Math.round(+arg('--from', 0) * FPS), to = Math.min(total, Math.round(+arg('--to', TL.duration) * FPS));
  const W = +arg('--workers', 3), per = Math.ceil((to - from) / W);
  const t0 = Date.now(); let done = 0;
  await Promise.all([...Array(W)].map(async (_, w) => {
    const a = from + w * per, b = Math.min(to, a + per);
    if (a >= b) return;
    const p = await page(browser);
    const out = path.join(BUILD, `part${w}.mp4`);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < b; f++) {
      await p.evaluate(t => window.seek(t), f / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 94 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (++done % 150 === 0) console.log(`${done}/${to - from} Frames, ${((Date.now() - t0) / done).toFixed(0)} ms/Frame`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }));
  await browser.close();
  fs.writeFileSync(path.join(BUILD, 'parts.txt'), [...Array(W)].map((_, w) => `file 'part${w}.mp4'`).filter((_, w) => from + w * per < to).join('\n'));
  console.log('fertig in', ((Date.now() - t0) / 1000).toFixed(0), 's');
})();
