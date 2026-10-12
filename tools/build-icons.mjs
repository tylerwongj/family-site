// Builds site/assets/icons.svg: one sprite of Phosphor duotone icons (MIT) used across the site.
//   node tools/build-icons.mjs <path to @phosphor-icons/web/src/duotone/selection.json>
// A copy of that package is in people-map/node_modules. Add a name to ICONS, rerun, commit the sprite.
// Use in HTML: <svg class="i"><use href="/assets/icons.svg#i-microphone"/></svg> (path relative to the page).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ICONS = `microphone windows-logo apple-logo download-simple shield-check warning lightbulb
play-circle cursor-click desktop sun moon arrow-right check-circle copy question wrench
arrows-clockwise lock-simple keyboard chat-circle-text camera image device-mobile sparkle
arrow-square-out info fingerprint seal-check heart house squares-four list-checks eye hand-palm
key magnifying-glass chats-circle robot wifi-high hourglass-medium book-open-text caret-down
prohibit gear-six clipboard-text monitor-play hand-tap user-circle-check package
arrow-counter-clockwise x-circle`.split(/\s+/);

const src = process.argv[2];
if (!src) throw new Error('Usage: node tools/build-icons.mjs <selection.json>');
const { icons } = JSON.parse(readFileSync(src, 'utf8'));
// Some entries carry aliases: "seal-check-duotone, circle-wavy-check".
const byName = new Map(icons.flatMap((i) => i.properties.name.split(/,\s*/).map((n) => [n.replace(/-duotone$/, ''), i])));

const symbols = ICONS.map((name) => {
  const icon = byName.get(name);
  if (!icon) throw new Error(`No Phosphor duotone icon named ${name}`);
  const paths = icon.icon.paths.map((d, n) => {
    const faint = icon.icon.attrs?.[n]?.opacity;
    return `<path${faint ? ' opacity=".22"' : ''} d="${d}"/>`;
  });
  return `<symbol id="i-${name}" viewBox="0 0 1024 1024">${paths.join('')}</symbol>`;
});

const out = fileURLToPath(new URL('../site/assets/icons.svg', import.meta.url));
writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg"><!-- Phosphor Icons (duotone), MIT licence, phosphoricons.com -->\n${symbols.join('\n')}\n</svg>\n`);
console.log(`${symbols.length} icons -> ${out}`);
