// Static checks on site/: links resolve, safety rules hold, tips data is valid. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = fileURLToPath(new URL('../site/', import.meta.url));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
const files = walk(SITE);
const pages = files.filter((f) => f.endsWith('.html') && !f.endsWith('404.html'));
const sprite = readFileSync(join(SITE, 'assets/icons.svg'), 'utf8');
const symbols = new Set([...sprite.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]));

// Every outside address the pages may link to. Add here on purpose, never by accident.
const EXTERNAL_OK = [
  'https://chatgpt.com/',
  'https://learn.chatgpt.com/docs/',
];

test('site has the expected pages', () => {
  const rel = pages.map((p) => relative(SITE, p).replaceAll('\\', '/')).sort();
  assert.deepEqual(rel, ['ai-tips/computer-use/index.html', 'ai-tips/index.html', 'index.html', 'speech-transcriber/index.html']);
});

test('home page: apps only, with one link to the AI page at the bottom (Tyler 2026-10-14)', () => {
  const home = readFileSync(join(SITE, 'index.html'), 'utf8');
  const main = home.slice(home.indexOf('<main'), home.indexOf('</main>'));
  assert.doesNotMatch(main, /class="(example|tip|chat)\b/, 'AI examples and tips live on the AI tips page, not home');
  assert.match(main, /<p class="learn-line"><a href="ai-tips\/">Want to learn how to improve your life with AI\?/);
  assert.ok(main.lastIndexOf('learn-line') > main.lastIndexOf('app-card'), 'AI link comes after the apps');
});

test('example chats that mention a photo show the photo', () => {
  const tipsPage = readFileSync(join(SITE, 'ai-tips/index.html'), 'utf8');
  for (const [, msg] of tipsPage.matchAll(/<p class="msg you">([\s\S]*?)<\/p>/g)) {
    const text = msg.replace(/<[^>]+>/g, '').trim();
    if (text.startsWith('@Computer')) continue; // computer-use asks point at what's on the screen
    if (/\b(this|these|letter|photo)\b/i.test(text)) assert.match(msg, /<img class="snap"/, `needs its picture: ${msg.replace(/<[^>]+>/g, '').trim()}`);
  }
});

for (const page of pages) {
  const name = relative(SITE, page).replaceAll('\\', '/');
  const html = readFileSync(page, 'utf8');

  test(`${name}: every local link, picture and icon exists`, () => {
    for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|#)/.test(url)) continue;
      const [path, hash] = url.split('#');
      let target = join(dirname(page), path.split('?')[0] || '.');
      if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
      assert.ok(existsSync(target), `${name} links to missing ${url}`);
      if (path.endsWith('icons.svg')) assert.ok(symbols.has(hash), `${name} uses missing icon ${hash}`);
    }
  });

  test(`${name}: safety rules (CSP, no trackers, no inline code, hidden from search)`, () => {
    assert.match(html, /http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self';/);
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
    assert.match(html, /<meta name="referrer" content="no-referrer">/);
    assert.match(html, /<script src="(\.\.\/)*assets\/theme\.js"><\/script>/, 'theme picked before first paint');
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, 'no inline scripts');
    assert.doesNotMatch(html, /\sstyle="/, 'no inline styles (CSP blocks them)');
    assert.doesNotMatch(html, /\son[a-z]+="/, 'no inline event handlers');
    assert.doesNotMatch(html, /<(form|iframe|input)\b/, 'nothing that collects data or embeds other sites');
    for (const [, url] of html.matchAll(/(?:href|src)="(https?:[^"]+)"/g)) {
      assert.ok(EXTERNAL_OK.some((ok) => url.startsWith(ok)), `${name}: unexpected outside link ${url}`);
    }
    for (const [tag] of html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)) assert.match(tag, /rel="noopener"/);
  });
}

test('no installers, speech models or big files in the site (they live in GitHub Releases)', () => {
  for (const f of files) {
    assert.ok(!/\.(exe|dmg|msi|pkg|zip|7z|onnx|nemo|bin|pt|safetensors)$/i.test(f), `not allowed in site/: ${f}`);
    assert.ok(statSync(f).size < 2_000_000, `too big for the site: ${f}`);
  }
});

test('tips.json: every card is complete and uses real icons and safe links', () => {
  const { tips, videos } = JSON.parse(readFileSync(join(SITE, 'data/tips.json'), 'utf8'));
  const ids = new Set();
  assert.ok(tips.length >= 3, 'home page shows the first 3');
  for (const t of tips) {
    assert.match(t.id, /^[a-z0-9-]+$/);
    assert.ok(!ids.has(t.id), `duplicate tip id ${t.id}`);
    ids.add(t.id);
    assert.ok(symbols.has(`i-${t.icon}`), `tip ${t.id}: no icon ${t.icon} (add it in tools/build-icons.mjs)`);
    assert.ok(['blue', 'green', 'amber', 'pink', 'violet', 'teal', 'red'].includes(t.color), `tip ${t.id}: color`);
    assert.ok(t.title && t.title.length <= 40, `tip ${t.id}: short title`);
    assert.ok(t.text && t.text.length <= 60, `tip ${t.id}: one short line`);
    if (t.link) {
      assert.ok(t.link.label);
      const local = !t.link.href.startsWith('https://');
      if (local) assert.ok(existsSync(join(SITE, t.link.href, t.link.href.endsWith('/') ? 'index.html' : '')), `tip ${t.id}: missing page ${t.link.href}`);
    }
  }
  for (const v of videos) {
    assert.ok(v.title);
    assert.match(v.url, /^https:\/\//);
  }
});

test('style.css: no layout jump when a page starts scrolling', () => {
  const css = readFileSync(join(SITE, 'assets/style.css'), 'utf8');
  assert.match(css, /html \{[^}]*scrollbar-gutter: stable/);
  assert.doesNotMatch(css, /body \{[^}]*overflow-x: hidden/);
  assert.doesNotMatch(css, /100vh/);
});

test('robots.txt keeps search engines out', () => {
  assert.match(readFileSync(join(SITE, 'robots.txt'), 'utf8'), /Disallow: \//);
});
