// Newest Speech Transcriber release, read from GitHub's public release list.
// Why not speech-transcriber-latest.json? GitHub release files send no CORS header, so a web page
// can't read them; the release API can be read and gives the same names, sizes and SHA-256 (digest).
export const REPO = 'tylerwongj/speech-transcriber-downloads';
export const API = `https://api.github.com/repos/${REPO}/releases/latest`;
export const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;
const DOWNLOAD_PREFIX = `https://github.com/${REPO}/releases/download/`;

// Same files and wording as PLATFORMS in speech-transcriber/tools/release_manifest.py.
export const PLATFORMS = [
  { platform: 'windows', label: 'Windows', icon: 'windows-logo', file: /^SpeechTranscriber-Setup-[\d.]+\.exe$/i, min_os: 'Windows 10 or 11 (64-bit)' },
  { platform: 'macos', label: 'Mac', icon: 'apple-logo', file: /^SpeechTranscriber-[\d.]+-macos-arm64\.dmg$/i, min_os: 'macOS 12 or newer, Apple chip (M1 or later)' },
];

/** GitHub release JSON -> { version, released, assets: [{platform, label, icon, min_os, file, url, size, sha256}], sumsUrl, page } */
export function parseRelease(json) {
  if (!json || !Array.isArray(json.assets)) return null;
  const safe = (url) => typeof url === 'string' && url.startsWith(DOWNLOAD_PREFIX);
  const version = String(json.tag_name || json.name || '').match(/(\d+\.\d+\.\d+)/)?.[1] || null;
  const assets = PLATFORMS.map(({ file, ...p }) => {
    const a = json.assets.find((x) => file.test(x.name) && safe(x.browser_download_url));
    if (!a) return null;
    const sha256 = /^sha256:([0-9a-f]{64})$/i.exec(a.digest || '')?.[1].toLowerCase() || null;
    return { ...p, file: a.name, url: a.browser_download_url, size: a.size, sha256 };
  }).filter(Boolean);
  const sums = json.assets.find((x) => x.name === 'SHA256SUMS.txt' && safe(x.browser_download_url));
  return {
    version,
    released: /^\d{4}-\d\d-\d\d/.test(json.published_at || '') ? json.published_at.slice(0, 10) : null,
    assets,
    sumsUrl: sums ? sums.browser_download_url : null,
    page: RELEASES_PAGE,
  };
}

export const formatSize = (bytes) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`);
export const formatDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** Which computer is this? 'windows' | 'macos' | 'phone' | 'other' (Apple chip vs Intel can't be told from a browser). */
export function detectDevice(nav = globalThis.navigator) {
  const ua = nav?.userAgent || '';
  const touchMac = /Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1; // iPads say "Macintosh"
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua) || touchMac) return 'phone';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
  return 'other';
}

const CACHE_KEY = 'speech-transcriber-release';
const FRESH_MS = 10 * 60 * 1000; // GitHub allows 60 unsigned checks an hour per visitor; 10 min is plenty

/** { state: 'ready', release } | { state: 'none' } (no release published yet) | { state: 'error' } */
export async function loadRelease({ fetchFn = globalThis.fetch, storage = globalThis.localStorage, now = Date.now() } = {}) {
  let cached = null;
  try { cached = JSON.parse(storage?.getItem(CACHE_KEY) || 'null'); } catch { /* ignore */ }
  if (cached && now - cached.at < FRESH_MS) return cached.result;
  try {
    const res = await fetchFn(API, { headers: { Accept: 'application/vnd.github+json' } });
    let result;
    if (res.status === 404) result = { state: 'none' };
    else if (!res.ok) throw new Error(`GitHub said ${res.status}`);
    else {
      const release = parseRelease(await res.json());
      result = release && release.assets.length ? { state: 'ready', release } : { state: 'none' };
    }
    try { storage?.setItem(CACHE_KEY, JSON.stringify({ at: now, result })); } catch { /* ignore */ }
    return result;
  } catch {
    return cached?.result?.state === 'ready' ? cached.result : { state: 'error' };
  }
}

/** Local preview only (?demo): what the page looks like once a release exists. Clearly marked sample data. */
export const SAMPLE = {
  state: 'ready',
  sample: true,
  release: parseRelease({
    tag_name: 'speech-transcriber-v0.3.0',
    published_at: '2026-10-12T20:00:00Z',
    assets: [
      { name: 'SpeechTranscriber-Setup-0.3.0.exe', size: 199_004_632, digest: `sha256:${'0'.repeat(64)}`, browser_download_url: `${DOWNLOAD_PREFIX}sample/SpeechTranscriber-Setup-0.3.0.exe` },
      { name: 'SpeechTranscriber-0.3.0-macos-arm64.dmg', size: 266_715_006, digest: `sha256:${'0'.repeat(64)}`, browser_download_url: `${DOWNLOAD_PREFIX}sample/SpeechTranscriber-0.3.0-macos-arm64.dmg` },
    ],
  }),
};
