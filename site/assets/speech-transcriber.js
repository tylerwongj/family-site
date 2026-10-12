// Speech Transcriber page: download buttons from the newest GitHub release, this computer's tab first.
import { detectDevice, formatDate, formatSize, loadRelease, RELEASES_PAGE, SAMPLE } from './release.js';
import { copyButton, el, icon, selectTab } from './site.js';

const device = detectDevice();
if (device === 'phone') document.getElementById('phone-note').hidden = false;
if (device === 'macos') selectTab(document.getElementById('tab-macos'));

const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const result = local && new URLSearchParams(location.search).has('demo') ? SAMPLE : await loadRelease();
const meta = document.getElementById('release-meta');

for (const card of document.querySelectorAll('.dl')) {
  const platform = card.dataset.platform;
  const asset = result.state === 'ready' ? result.release.assets.find((a) => a.platform === platform) : null;
  const btn = card.querySelector('.btn');
  const note = card.querySelector('small');
  if (platform === device) {
    card.classList.add('mine');
    card.querySelector('.dl-head').append(el('span', { class: 'dl-badge' }, 'This computer'));
  }
  if (asset) {
    btn.href = asset.url;
    btn.removeAttribute('aria-disabled');
    btn.replaceChildren(icon('download-simple'), el('span', {}, `Download for ${asset.label}`));
    note.textContent = formatSize(asset.size);
  } else if (result.state === 'error') {
    btn.href = RELEASES_PAGE;
    btn.removeAttribute('aria-disabled');
    btn.replaceChildren(icon('arrow-square-out'), el('span', {}, 'Open download page'));
    note.textContent = 'On GitHub';
  } else {
    btn.replaceChildren(icon('hourglass-medium'), el('span', {}, 'Coming soon'));
    note.textContent = result.state === 'ready' ? 'Not in this version yet' : '';
  }
}

if (result.state === 'ready') {
  const { version, released, assets } = result.release;
  meta.textContent = [version && `Version ${version}`, released && formatDate(released), 'Free'].filter(Boolean).join(' · ');
  if (result.sample) meta.prepend(el('span', { class: 'pending-tag' }, 'Sample data (local preview)'), ' ');
  document.getElementById('update-latest').replaceChildren(
    `Newest: ${version || '?'}${released ? ` (${formatDate(released)})` : ''}. `,
    el('a', { href: RELEASES_PAGE, target: '_blank', rel: 'noopener' }, 'All versions'));
  const hashes = assets.filter((a) => a.sha256);
  const { sumsUrl } = result.release;
  if (hashes.length || sumsUrl) {
    document.getElementById('hashes').replaceChildren(...(hashes.length
      ? hashes.map((a) => el('div', { class: 'hash' }, el('b', {}, a.file), el('code', {}, a.sha256), copyButton(a.sha256)))
      : [el('a', { href: sumsUrl, target: '_blank', rel: 'noopener' }, 'Fingerprint list (SHA256SUMS.txt)')]));
    document.getElementById('check-file').hidden = false;
  }
} else if (result.state === 'none') {
  meta.textContent = 'First version is almost ready. Check back soon.';
} else {
  meta.textContent = "Couldn't reach GitHub just now. The buttons open the download page instead.";
}
