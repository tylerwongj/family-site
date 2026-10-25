// Family Site quick check (~1 min; gate kit). The real pages from a test copy of the preview server on a spare port
// (never :6790), headless and muted; nothing is published. Runs when a chat finishes (Stop hook). Rows: CHECKS.md.
//   node scripts/quick-check.mjs   -> PASS/FAIL per item, exit 0 = all passed
import { runGate, npmTest, startServer, uiAudit, browser } from './gate/kit.mjs';

const WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
let app, b;

// The Speech Transcriber page with sample release data (?demo: no GitHub call), as a Windows or Mac visitor sees it.
async function downloadPage(ua) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, userAgent: ua });
  const page = await ctx.newPage();
  await page.goto(`${app.url}speech-transcriber/?demo`, { waitUntil: 'networkidle' });
  const look = () => page.evaluate(() => ({
    tab: document.querySelector('[role="tab"][aria-selected="true"]')?.id,
    win: !document.getElementById('get-windows').hidden, mac: !document.getElementById('get-macos').hidden,
    winHref: document.querySelector('.dl[data-platform="windows"] .btn')?.getAttribute('href') || '',
    macHref: document.querySelector('.dl[data-platform="macos"] .btn')?.getAttribute('href') || '',
    nvidia: !!document.querySelector('.dl[data-platform="windows"] .alt-dl'),
  }));
  return { page, ctx, look };
}

process.exitCode = await runGate([
  npmTest(), // safety rules (CSP, no trackers/forms/inline code), every link/icon exists, home = apps only, tips.json valid, release parsing
  { name: 'preview starts on a spare port', run: async () => { app = await startServer({ cmd: 'node server.mjs' }); process.env.SITE_URL = app.url; b = await browser(); } },
  // its own page check: desktop, Mac, 375x812, 844x390, 891x309 + light mode (errors, sideways scroll, covered buttons, cut-off or blurry pictures)
  { name: 'every page at desktop, Mac and three phone shapes (npm run shots)', run: 'node scripts/shots.mjs' },
  { name: 'download picker: a Windows visitor gets Windows, Mac switches it, a Mac visitor starts on Mac (Tyler 2026-10-20)', run: async () => {
    const bad = [];
    const w = await downloadPage(WIN_UA);
    let s = await w.look();
    if (s.tab !== 'tab-windows' || !s.win || s.mac) bad.push(`a Windows visitor sees the ${s.tab} tab`);
    if (!/\.exe$/.test(s.winHref)) bad.push(`the Windows button points to "${s.winHref}", not the .exe`);
    if (!s.nvidia) bad.push('no "NVIDIA graphics card? Faster version" link though the release has one');
    await w.page.click('#tab-macos');
    s = await w.look();
    if (!s.mac || s.win) bad.push('clicking Mac does not switch to the Mac download and steps');
    if (!/\.dmg$/.test(s.macHref)) bad.push(`the Mac button points to "${s.macHref}", not the .dmg`);
    await w.ctx.close();
    const m = await downloadPage(MAC_UA);
    s = await m.look();
    if (s.tab !== 'tab-macos' || !s.mac) bad.push(`a Mac visitor starts on the ${s.tab} tab, not Mac`);
    await m.ctx.close();
    return bad;
  } },
  { name: 'home on a phone (360 = Tyler\'s Samsung, 375): "You say it / It types it" stacks, each sentence on one line (e0cd622)', run: async () => {
    const bad = [];
    for (const width of [360, 375]) {
      const ctx = await b.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
      const page = await ctx.newPage();
      await page.goto(app.url, { waitUntil: 'networkidle' });
      const lines = await page.evaluate(() => [...document.querySelectorAll('.talk-type .say, .talk-type .textbox')].map((e) => {
        const r = document.createRange(); r.selectNodeContents(e);
        return { text: e.textContent.trim(), lines: new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size };
      }));
      await ctx.close();
      if (lines.length < 2) bad.push('the say-it / types-it picture is missing on the home page');
      for (const l of lines.filter((x) => x.lines > 1)) bad.push(`"${l.text}" wraps onto ${l.lines} lines at ${width} px`);
    }
    return bad;
  } },
  { name: 'pages pass the UI audit (1440 / 780 / 375)', run: async () => (await Promise.all(['', 'speech-transcriber/?demo', 'ai-tips/', 'ai-tips/computer-use/'].map((p) => uiAudit(app.url + p, { browser: b }).then((x) => x.map((y) => `/${p} ${y}`))))).flat() },
], { after: async () => { await b?.close(); await app?.stop(); } });
