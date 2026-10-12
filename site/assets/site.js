// Shared page behaviour: light/dark button, copy buttons, tabs, and the AI tip cards (from data/tips.json).
const SPRITE = new URL('./icons.svg', import.meta.url).href;
const SVG_NS = 'http://www.w3.org/2000/svg';

export function icon(name, cls = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `i ${cls}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `${SPRITE}#i-${name}`);
  svg.append(use);
  return svg;
}

/** Tiny element builder: el('p', {class: 'x'}, 'text', child). Text is always set as text, never HTML. */
export function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) node.setAttribute(k, v === true ? '' : v);
  node.append(...kids.filter((k) => k != null && k !== false));
  return node;
}

// Light / dark
document.querySelector('.theme-btn')?.addEventListener('click', () => {
  const light = document.documentElement.dataset.theme !== 'light';
  if (light) document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch { /* fine */ }
});

// Copy buttons: data-copy="text" or data-copy="url" (this page's address)
export function copyButton(text, label = 'Copy') {
  const btn = el('button', { type: 'button', class: 'icon-btn copy', 'data-copy': text, title: label }, icon('copy'), el('span', {}, label));
  return btn;
}
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn || btn.classList.contains('done')) return;
  const text = btn.dataset.copy === 'url' ? location.href.split('#')[0] : btn.dataset.copy;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return; // clipboard blocked: leave the button as it was
  }
  const label = btn.querySelector('span');
  const before = label?.textContent;
  btn.classList.add('done');
  if (label) label.textContent = 'Copied';
  setTimeout(() => { btn.classList.remove('done'); if (label) label.textContent = before; }, 1600);
});

// Tabs: <div role="tablist" data-tabs> with buttons role=tab aria-controls=<panel id>
export function selectTab(tab) {
  const list = tab.closest('[role="tablist"]');
  for (const t of list.querySelectorAll('[role="tab"]')) {
    const on = t === tab;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  }
}
for (const list of document.querySelectorAll('[data-tabs]')) {
  list.addEventListener('click', (e) => { const t = e.target.closest('[role="tab"]'); if (t) selectTab(t); });
  list.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const next = tabs[(tabs.indexOf(document.activeElement) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    selectTab(next);
    next.focus();
  });
}

// AI tips: <div data-tips="3"> shows the first 3 tips; data-tips="all" shows every tip; <div data-videos> lists videos
const tipTargets = document.querySelectorAll('[data-tips], [data-videos]');
if (tipTargets.length) {
  const res = await fetch(new URL('../data/tips.json', import.meta.url)).catch(() => null);
  const data = res?.ok ? await res.json() : { tips: [], videos: [] };
  for (const target of document.querySelectorAll('[data-tips]')) {
    const limit = target.dataset.tips === 'all' ? Infinity : Number(target.dataset.tips);
    target.replaceChildren(...data.tips.slice(0, limit).map(tipCard));
  }
  for (const target of document.querySelectorAll('[data-videos]')) {
    target.replaceChildren(...(data.videos.length
      ? data.videos.map(videoCard).filter(Boolean)
      : [el('div', { class: 'empty' }, icon('monitor-play'), el('span', {}, 'Videos coming soon'))]));
  }
}

function tipCard(t) {
  const link = t.link && /^(https:\/\/|\.\.?\/|[a-z-]+\/)/.test(t.link.href)
    ? el('a', { class: 'more-link', href: resolveLink(t.link.href), ...(t.link.href.startsWith('https://') ? { target: '_blank', rel: 'noopener' } : {}) }, t.link.label, icon(t.link.href.startsWith('https://') ? 'arrow-square-out' : 'arrow-right'))
    : null;
  return el('article', { class: 'tip', id: `tip-${t.id}` },
    el('div', { class: 'tip-head' }, icon(t.icon, `c-${t.color || 'blue'}`), el('h3', {}, t.title)),
    el('p', {}, t.text),
    t.try ? el('div', { class: 'try' }, el('q', {}, t.try), copyButton(t.try)) : null,
    link);
}

// Links in tips.json are written from the site root ("speech-transcriber/"); pages live at different depths.
function resolveLink(href) {
  return href.startsWith('https://') ? href : new URL(`../${href}`, import.meta.url).href;
}

function videoCard(v) {
  if (!/^https:\/\//.test(v.url)) return null;
  return el('a', { class: 'video', href: v.url, target: '_blank', rel: 'noopener' },
    icon('play-circle'),
    el('span', {}, el('b', {}, v.title), el('small', {}, [v.by, v.length].filter(Boolean).join(' · '))));
}
