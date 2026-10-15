// usage: node scripts/_cap.mjs <outPrefix>  -> desktop + phone full pages of home and ai-tips
import { chromium } from 'playwright-core';
const pre = process.argv[2];
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
for (const [n, w, h, m] of [['desktop', 1440, 900, false], ['phone', 375, 812, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, deviceScaleFactor: m ? 2 : 1, userAgent: m ? 'Mozilla/5.0 (Linux; Android 14) Mobile' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140' });
  for (const [pg, path] of [['home', '/'], ['tips', '/ai-tips/']]) {
    const p = await ctx.newPage(); await p.goto('http://localhost:6790' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
    await p.screenshot({ path: `${pre}-${pg}-${n}.png`, fullPage: true }); await p.close();
  }
}
await b.close();
