// Planted breaks for scripts/test-the-tester.mjs (gate kit). Each = a real past bug (git log, docs/PLAYTESTS.md,
// player notes) or the core of the project, put back on purpose: the quick check must FAIL on every one (Lauren Tan:
// a check counts once it is proven to fail on the real mistake). At least 2. `expect` = words the failure must show.
export default [
  // c3ac11f: inner quotes in tips.json's help text broke the JSON (the AI tips page lost its cards)
  { name: 'tips-json-broken', what: 'tips.json has unescaped inner quotes', file: 'site/data/tips.json', from: 'title (a short question, Tyler 2026-10-14)', to: 'title ("a short question", Tyler 2026-10-14)', expect: 'tests \\(npm test\\)' },
  // e0cd622: one Windows/Mac picker; a Mac visitor starts on the Mac download and steps
  { name: 'mac-gets-windows-tab', what: 'a Mac visitor lands on the Windows download', file: 'site/assets/speech-transcriber.js', from: "if (device === 'macos') selectTab(document.getElementById('tab-macos'));", to: '// (Mac first removed)', expect: 'download picker' },
  // e0cd622: on phones the say-it / types-it picture stacks so each sentence stays on one line
  { name: 'say-types-squeezed', what: 'the home picture squeezes side by side on phones', file: 'site/assets/style.css', from: '  .talk-type { flex-direction: column; gap: .5rem; padding: .8rem .75rem; }', to: '  .talk-type { gap: .5rem; padding: .8rem .75rem; }', expect: 'wraps onto' },
];
