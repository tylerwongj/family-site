# Family Site

Tyler's small website for **family and friends** (not the public): downloads of his apps and plain-language AI tips. Launcher tile **Family Site** (Sites). Local preview http://localhost:6790 (spare ports 6791-6799, `shared-ai-context/PORTS.md`).

- **What it is:** plain static files in `site/` (HTML, one CSS, small ES-module JS, no build step, no framework). `server.mjs` is only the local preview; it is never published.
- **Live (once Tyler approves):** GitHub Pages from the public repo `tylerwongj/family-site` → https://tylerwongj.github.io/family-site/. `.github/workflows/pages.yml` runs `npm test`, then publishes `site/` on every push to main. **Not created yet: ask Tyler before creating the repo or pushing** (public repo = anyone with the link can read it).
- **Audience:** non-technical family. Few words, many visuals, plain names, every step says exactly what to click. Dark by default (footer button = light), phone-first (375x812, 844x390, 891x309).

## Rules (security and trust)

- **Static only:** no server, no forms, no data collection, no analytics, no cookies, no tokens or keys in any file. Every page has the same CSP meta (scripts/styles from the site only; the only outside call is `api.github.com`), `referrer: no-referrer`, `robots: noindex` and `robots.txt` Disallow. No inline scripts/styles/handlers (CSP blocks them). `npm test` enforces all of this, plus an allowlist of outside links (`EXTERNAL_OK` in `test/site.test.mjs`).
- **Never put installers, speech models or big files in this repo.** Installers live in GitHub Releases of the public repo `tylerwongj/speech-transcriber-downloads` (made by the Speech Transcriber chat, `C:/Users/tyler/p/speech-transcriber`). The site only links to them.
- **Guides link only to official pages** (OpenAI: chatgpt.com/download, learn.chatgpt.com/docs/...). Never bundle, mirror or auto-configure someone else's software. Re-check the computer-use steps against https://learn.chatgpt.com/docs/computer-use when touching that page and update the "Checked" date.
- **Never fake OS dialogs.** Install pictures are pending placeholders until real screenshots exist (below).

## Speech Transcriber downloads

- `site/assets/release.js` asks `https://api.github.com/repos/tylerwongj/speech-transcriber-downloads/releases/latest` (public, CORS-enabled, 60 checks/hour per visitor, cached 10 min in the browser). **Why not `speech-transcriber-latest.json`:** GitHub release files send no CORS header, so a web page can't read them (checked 2026-10-12 with curl). The API gives the same file names, sizes and SHA-256 (`digest`).
- Files are matched by name, same as `PLATFORMS` in `speech-transcriber/tools/release_manifest.py`: `SpeechTranscriber-Setup-<ver>.exe` (Windows), `SpeechTranscriber-<ver>-macos-arm64.dmg` (Mac); version from the tag (`speech-transcriber-v<ver>`). Only `https://github.com/tylerwongj/speech-transcriber-downloads/releases/download/...` links are ever used. **If the release file names change, update `PLATFORMS` in release.js and its test.**
- States: no release yet (GitHub 404) → "Coming soon"; GitHub unreachable → buttons open the releases page; ready → buttons, size, version, date, fingerprints. Drafts and pre-releases never show (GitHub's "latest" skips them).
- `?demo` on localhost shows clearly labelled sample data, for previewing the finished look.

## Real install screenshots (pending)

Each step picture is a `<figure class="shot pending" data-shot="<file>">` in `site/speech-transcriber/index.html`. To add a real one: save it as `site/assets/img/speech-transcriber/<file>` (PNG/WebP, about 1200 px wide, under 300 KB, no personal info, real screenshot only), then replace that figure's contents with `<img src="../assets/img/speech-transcriber/<file>" alt="<what it shows>" loading="lazy">` and drop the `pending` class. Files: `win-1-open.png`, `win-2-run-anyway.png`, `win-3-install.png`, `mac-1-drag.png`, `mac-2-open-anyway.png`, `mac-3-permissions.png`.

## Adding things

- **AI tips / videos:** edit `site/data/tips.json` (format in its `_help`). The home page shows the first 3 tips. New icon? Add its Phosphor name to `tools/build-icons.mjs`, rerun it (source: `people-map/node_modules/@phosphor-icons/web/src/duotone/selection.json`), commit `site/assets/icons.svg`.
- **A new app:** copy `site/speech-transcriber/` to `site/<app>/`, add its card to the Apps grid in `site/index.html`, extend the expected-pages list in `test/site.test.mjs`. Its installers go in that app's own public downloads repo, never here.
- **Paths are relative** (`../assets/...`) so the site works at `/family-site/` on Pages and `/` locally. `site/404.html` is self-contained and links to `/family-site/` (change it if the repo is renamed).

## Checks

- `npm test`: release parsing, link/icon/file checks, safety rules, tips data (also runs in the publish workflow).
- `npm run shots` (site must be running): headless, muted Chrome; every page at desktop, Mac, 375x812, 844x390, 891x309 + light mode; fails on page/console errors, sideways scroll or covered buttons; screenshots in `shots/` (git-ignored). Look at the pictures, not just "ok".
