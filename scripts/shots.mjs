// Headless page check + screenshots of every page at desktop and phone sizes (nothing opens on screen).
//   npm run shots                      -> shots/<page>-<size>.png against http://localhost:6790
//   SITE_URL=http://localhost:6791 npm run shots
// Fails (exit 1) on a page error, a console error, sideways scrolling, or a tap target that is covered.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE = (process.env.SITE_URL || 'http://localhost:6790').replace(/\/$/, '');
const OUT = fileURLToPath(new URL('../shots/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['home', '/'],
  ['speech', '/speech-transcriber/'],
  ['speech-demo', '/speech-transcriber/?demo'], // sample release data, local preview only
  ['tips', '/ai-tips/'],
  ['computer-use', '/ai-tips/computer-use/'],
];
const WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36';
const SIZES = [
  { name: 'desktop', width: 1280, height: 800, ua: WIN_UA },
  { name: 'mac', width: 1280, height: 800, ua: MAC_UA, only: ['speech-demo'] },
  { name: 'phone', width: 375, height: 812, ua: PHONE_UA, mobile: true },
  { name: 'phone-wide', width: 844, height: 390, ua: PHONE_UA, mobile: true },
  { name: 'phone-short', width: 891, height: 309, ua: PHONE_UA, mobile: true, only: ['home', 'speech'] },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
let problems = 0;
for (const size of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height }, userAgent: size.ua,
    isMobile: !!size.mobile, hasTouch: !!size.mobile, deviceScaleFactor: size.mobile ? 2 : 1,
  });
  for (const [name, path] of PAGES) {
    if (size.only && !size.only.includes(name)) continue;
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
    page.on('console', (m) => {
      // Until the first release exists, GitHub answers 404 and the page shows "Coming soon": expected.
      if (m.type() !== 'error' || m.location().url?.startsWith('https://api.github.com/repos/tylerwongj/speech-transcriber-downloads/')) return;
      errors.push(`console: ${m.text()}`);
    });
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const layout = await page.evaluate(() => {
      const W = innerWidth;
      const covered = [];
      for (const e of document.querySelectorAll('a, button, summary')) {
        const r = e.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue;
        if (!e.matches('summary') && e.closest('details:not([open])')) continue; // folded away, not tappable yet
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (hit && hit !== e && !e.contains(hit) && !hit.contains(e) && !hit.closest('.top')) covered.push((e.innerText || e.className).trim().slice(0, 30));
      }
      // Content cut off inside a box that hides overflow (sideways scroll checks can't see it)
      const clipped = [];
      for (const e of document.querySelectorAll('main *')) {
        const cs = getComputedStyle(e);
        if (!/hidden|clip/.test(cs.overflowX) || cs.textOverflow === 'ellipsis' || !e.clientWidth) continue;
        if (e.scrollWidth > e.clientWidth + 1) clipped.push((e.className || e.tagName).toString().slice(0, 30));
      }
      return { overflowX: document.scrollingElement.scrollWidth - W, covered, clipped };
    });
    const bad = [...errors];
    if (layout.overflowX > 1) bad.push(`sideways scroll ${layout.overflowX}px`);
    if (layout.covered.length) bad.push(`covered: ${layout.covered.join(', ')}`);
    if (layout.clipped.length) bad.push(`cut off: ${layout.clipped.join(', ')}`);
    await page.screenshot({ path: join(OUT, `${name}-${size.name}.png`), fullPage: true });
    console.log(`${bad.length ? 'CHECK' : 'ok   '} ${name} ${size.name} ${size.width}x${size.height}${bad.length ? ' ' + bad.join(' | ') : ''}`);
    problems += bad.length;
    await page.close();
  }
  await ctx.close();
}

// Light mode, picked once, survives a reload and applies before paint
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: WIN_UA });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.click('.theme-btn');
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => scrollTo(0, 0));
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.screenshot({ path: join(OUT, 'home-light.png'), fullPage: true });
  console.log(`${theme === 'light' ? 'ok   ' : 'CHECK'} light mode kept after reload (${theme})`);
  if (theme !== 'light') problems++;
  await ctx.close();
}

await browser.close();
console.log(problems ? `${problems} problem(s); screenshots in shots/` : 'All pages ok; screenshots in shots/');
process.exit(problems ? 1 : 0);
