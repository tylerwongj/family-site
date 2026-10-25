# Family Site: checks

The gate: `node scripts/quick-check.mjs` (runs by itself when a chat finishes, Stop hook; ~1 min on a test copy of the preview on a spare port, never :6790, nothing published). Test the tester: `node scripts/test-the-tester.mjs` (each planted break in `scripts/gate-breaks.mjs` must FAIL).
Rung = Lauren Tan's ladder: 1 impossible by design · 2 the build fails naming the fix · 3 a check catches it · 4 text only (chats skip it). Move rows up, never down.

| Rule or past bug | Enforced by | Rung | Proven to fail |
|---|---|---|---|
| tips.json stays valid JSON (c3ac11f: inner quotes broke it) | `npm test` "tips.json" (also in the publish workflow) | 3 | 2026-10-25 planted `tips-json-broken` |
| Safety: CSP, noindex, no inline code, no forms/trackers, only allowed outside links, no installers in the repo | `npm test` per page | 3 | not yet planted |
| Home = apps only, one AI link at the bottom (Tyler 2026-10-14) | `npm test` "home page" | 3 | not yet planted |
| One Windows/Mac picker; this computer's tab first; Mac switches download + steps; NVIDIA link only when the release has it (e0cd622, 155c12d) | quick-check "download picker" (Windows + Mac visitor, ?demo sample) | 3 | 2026-10-25 planted `mac-gets-windows-tab` |
| Phone home: "You say it / It types it" stacks, each sentence on one line at 360 (Tyler's Samsung) and 375 (e0cd622; it still wrapped "5!" until 2026-10-25) | quick-check "home on a phone" | 3 | 2026-10-25 planted `say-types-squeezed` |
| No errors, sideways scroll, covered buttons, cut-off or blurry pictures (Tyler 2026-10-16) at desktop, Mac, 375x812, 844x390, 891x309; light mode kept | `scripts/shots.mjs` in the gate | 3 | not yet planted |
| Main buttons small, bottom right on desktop (the download button was a full-width bar until 2026-10-25); no squashed text | shared UI audit at 1440 / 780 / 375 | 3 | its `--self-test` |
