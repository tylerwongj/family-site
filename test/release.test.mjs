// Download data: GitHub release JSON -> buttons. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { API, detectDevice, formatDate, formatSize, loadRelease, parseRelease, SAMPLE } from '../site/assets/release.js';

const BASE = 'https://github.com/tylerwongj/speech-transcriber-downloads/releases/download/speech-transcriber-v0.3.0/';
const HASH = 'ab'.repeat(32);
const release = (assets) => ({ tag_name: 'speech-transcriber-v0.3.0', published_at: '2026-10-12T21:35:00Z', html_url: 'x', assets });
const asset = (name, extra = {}) => ({ name, size: 189_000_000, digest: `sha256:${HASH}`, browser_download_url: BASE + name, ...extra });

test('reads version, date, both installers and their fingerprints', () => {
  const r = parseRelease(release([
    asset('SpeechTranscriber-Setup-0.3.0.exe'),
    asset('SpeechTranscriber-0.3.0-macos-arm64.dmg'),
    asset('SHA256SUMS.txt'),
    asset('speech-transcriber-latest.json'),
  ]));
  assert.equal(r.version, '0.3.0');
  assert.equal(r.released, '2026-10-12');
  assert.deepEqual(r.assets.map((a) => a.platform), ['windows', 'macos']);
  assert.equal(r.assets[0].sha256, HASH);
  assert.equal(r.assets[0].url, `${BASE}SpeechTranscriber-Setup-0.3.0.exe`);
  assert.equal(r.sumsUrl, `${BASE}SHA256SUMS.txt`);
});

test('ignores links that are not this repo\'s GitHub downloads', () => {
  const r = parseRelease(release([
    asset('SpeechTranscriber-Setup-0.3.0.exe', { browser_download_url: 'https://evil.example/SpeechTranscriber-Setup-0.3.0.exe' }),
    asset('SpeechTranscriber-0.3.0-macos-arm64.dmg', { browser_download_url: 'http://github.com/tylerwongj/speech-transcriber-downloads/releases/download/x.dmg' }),
  ]));
  assert.deepEqual(r.assets, []);
});

test('a missing or odd digest means no fingerprint shown, not a wrong one', () => {
  const r = parseRelease(release([asset('SpeechTranscriber-Setup-0.3.0.exe', { digest: null }), asset('SpeechTranscriber-0.3.0-macos-arm64.dmg', { digest: 'md5:123' })]));
  assert.equal(r.assets[0].sha256, null);
  assert.equal(r.assets[1].sha256, null);
});

test('NVIDIA build is picked up as its own file, never as the main Windows one', () => {
  const r = parseRelease(release([asset('SpeechTranscriber-Setup-0.3.34-nvidia.exe', { size: 1_234_000_000 }), asset('SpeechTranscriber-Setup-0.3.34.exe')]));
  assert.equal(r.assets.find((a) => a.platform === 'windows').file, 'SpeechTranscriber-Setup-0.3.34.exe');
  assert.equal(r.assets.find((a) => a.platform === 'windows-nvidia').file, 'SpeechTranscriber-Setup-0.3.34-nvidia.exe');
  assert.equal(parseRelease(release([asset('SpeechTranscriber-Setup-0.3.34.exe')])).assets.some((a) => a.platform === 'windows-nvidia'), false);
});

test('only Windows installer published: Mac stays "coming soon"', () => {
  const r = parseRelease(release([asset('SpeechTranscriber-Setup-0.3.0.exe')]));
  assert.deepEqual(r.assets.map((a) => a.platform), ['windows']);
});

test('which computer is this', () => {
  assert.equal(detectDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140' }), 'windows');
  assert.equal(detectDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605', maxTouchPoints: 0 }), 'macos');
  assert.equal(detectDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605', maxTouchPoints: 5 }), 'phone'); // iPad
  assert.equal(detectDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }), 'phone');
  assert.equal(detectDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile' }), 'phone');
  assert.equal(detectDevice({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' }), 'other');
});

test('sizes and dates read naturally', () => {
  assert.equal(formatSize(189_123_456), '189 MB');
  assert.equal(formatSize(2_500_000_000), '2.5 GB');
  assert.equal(formatDate('2026-10-12'), 'Oct 12, 2026');
});

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
}
const reply = (status, body) => async (url) => {
  assert.equal(url, API);
  return { status, ok: status >= 200 && status < 300, json: async () => body };
};

test('no release yet (404) shows "coming soon"', async () => {
  assert.deepEqual(await loadRelease({ fetchFn: reply(404), storage: memoryStorage() }), { state: 'none' });
});

test('GitHub busy: falls back to the last good answer, else to the download page', async () => {
  const storage = memoryStorage();
  const good = await loadRelease({ fetchFn: reply(200, release([asset('SpeechTranscriber-Setup-0.3.0.exe')])), storage, now: 0 });
  assert.equal(good.state, 'ready');
  const later = await loadRelease({ fetchFn: reply(403), storage, now: 60 * 60 * 1000 });
  assert.equal(later.state, 'ready');
  assert.deepEqual(await loadRelease({ fetchFn: reply(403), storage: memoryStorage() }), { state: 'error' });
  assert.deepEqual(await loadRelease({ fetchFn: async () => { throw new Error('offline'); }, storage: memoryStorage() }), { state: 'error' });
});

test('asks GitHub at most every 10 minutes', async () => {
  const storage = memoryStorage();
  let calls = 0;
  const fetchFn = async () => { calls++; return { status: 404, ok: false }; };
  await loadRelease({ fetchFn, storage, now: 0 });
  await loadRelease({ fetchFn, storage, now: 5 * 60 * 1000 });
  assert.equal(calls, 1);
  await loadRelease({ fetchFn, storage, now: 11 * 60 * 1000 });
  assert.equal(calls, 2);
});

test('the local-preview sample parses like a real release', () => {
  assert.equal(SAMPLE.release.assets.length, 3);
  assert.equal(SAMPLE.release.version, '0.3.0');
});
