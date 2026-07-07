# REMOTE.md — RPi5 runbook (headless Linux, ARM64, 8 GB, residential Polish IP)

Runbook for running przetargimiejskie work on the Raspberry Pi 5: no GUI, no desktop
Chrome, Debian Bookworm arm64. Companion docs: [README.md](README.md) (pipeline overview,
"Running locally"), [ROADMAP.md](ROADMAP.md) (phased plan), [TODO.md](TODO.md) (task queue).

## 1. Why this box matters strategically

Its **residential Polish IP** is egress GitHub Actions cannot buy:

- **raciborz + swietochlowice** — both BIPs resolve to the shared FINN host
  `bip2.finn.pl` (194.24.181.47), which silently connect-drops GitHub Actions / Azure
  IP ranges (UND_ERR_CONNECT_TIMEOUT in CI since ~2026-07-04). Both sites answer
  HTTP 200 in under 2 s from a Polish connection. No code fix exists — the fix is egress.
- **brzeg** — brzeg.pl serves an anti-DDoS waiting room ("Proszę czekać…" + reload
  script) selectively to GH-runner traffic; the real page and the existing parser work
  fine from a Polish IP.

Three ways to use the Pi for this:

1. **One-off refreshes from the Pi**: `CITY=raciborz npm run refresh` (then
   swietochlowice, brzeg), ship data via PR. Manual but works today.
2. **GitHub self-hosted runner**: register the Pi as a runner and point the FINN-hosted
   cities' matrix jobs at it (`runs-on: self-hosted` split in
   `.github/workflows/refresh.yml`). Automated, but the Pi must stay up at 04:00 UTC.
3. **PL proxy exit**: `FETCH_PROXY_URL` in `pipeline/src/core/fetch.js` (undici
   ProxyAgent; when unset, undici is never imported — behavior identical to plain
   fetch) — point CI at a Polish/non-Azure exit, per-city or globally. Keeps
   everything in hosted CI but needs a trustworthy proxy. NOTE: only requests
   through the `core/fetch.js` helpers (`politeGet`/`getText`/`getBytes`) are
   proxied — the insecureTLS path, city-local direct `fetch` calls and the
   playwright renderer are not.

Bonus: spikes benefit too — cloud fetchers get 403'd by some BIPs (choszczno) that
accept residential clients.

## 2. What runs on the Pi vs what does not

| Task | Pi? | Notes |
|---|---|---|
| Data refresh (`npm run refresh`, `CITY=<id> npm run refresh`) | YES | Node + pdftotext/pdftoppm/tesseract/catdoc; chrzanow additionally needs Playwright Chromium |
| Backfills (local equivalent of `backfill.yml`) | YES | Same toolchain; OCR-heavy first passes slower on ARM, committed caches absorb steady state |
| City spikes (`spikes/README.md` protocol) | YES | Plain HTTP by design; residential IP is an advantage |
| Adapter builds + parser tests (`npm test`, `node --test tests/parse-<city>.test.js`) | YES | Offline, fixture-based, Node built-in runner |
| Crawler hardening / smoke runs (`node src/cities/<city>/crawl.js`) | YES | Terminal-only |
| Health check (`npm run health`) | YES | Reads committed `data/<city>/meta.json`, no network |
| Site build (`bash build-site.sh _site`) | YES | bash cp + `node scripts/build-seo-pages.mjs`, no deps |
| Doc work (TODO/README/ledger, `node spikes/build-progress.mjs`) | YES | Markdown + dependency-free Node |
| Extension DOM/overlay testing | NO | Needs desktop Chrome, load-unpacked, eyeball overlays |
| Chrome Web Store submission | NO | Interactive dashboard UI |
| Visual site QA (landing, /archiwum, /raporty) | NO | Judging rendered pages needs a display |
| claude-in-chrome flows | NO | Drives the desktop Chrome session; none exists here |

## 3. Setup (once)

1. Flash **Raspberry Pi OS Lite 64-bit (Bookworm)** with Raspberry Pi Imager;
   pre-set hostname, SSH key, network in the imager's headless config. Boot, SSH in.
2. System packages (the exact set `.github/workflows/refresh.yml` installs, plus git):
   `sudo apt-get update && sudo apt-get install -y git poppler-utils tesseract-ocr tesseract-ocr-pol catdoc`
3. **Node 20+ LTS — NOT apt's nodejs** (Bookworm ships 18.x; `pipeline/package.json`
   requires `engines >=20`, CI pins 20). Via nvm:
   `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && nvm install 20`
   or NodeSource: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs`.
   Verify: `node -v` ≥ 20.
4. GitHub CLI from its official apt repo (arm64 .deb):
   ```
   sudo mkdir -p -m 755 /etc/apt/keyrings
   wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
   echo "deb [arch=arm64 signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list
   sudo apt-get update && sudo apt-get install -y gh
   ```
   Auth headlessly: `gh auth login` → "Login with a web browser" (device-code: enter the
   printed code at github.com/login/device from any other device), or
   `gh auth login --with-token < token.txt` (PAT with repo + workflow + read:org scopes).
   Confirm: `gh auth status` shows **110kc3**.
5. Git identity: `git config --global user.name '110kc3' && git config --global user.email '110kc3@gmail.com'`,
   then `gh auth setup-git` (HTTPS pushes via gh credential helper).
6. Clone to the layout the tooling expects:
   `mkdir -p ~/repos && gh repo clone 110kc3/przetargimiejskie ~/repos/przetargimiejskie`
7. Deps: `cd ~/repos/przetargimiejskie/pipeline && npm ci` — installs the pipeline's
   two dependencies: playwright (optional renderer) and undici (optional
   `FETCH_PROXY_URL` egress), both lazy-loaded; the Chromium browser binary is
   NOT downloaded by `npm ci`.
8. *(Optional — only if refreshing chrzanow here)* `npx playwright install --with-deps chromium`
   in `pipeline/`. chrzanow is the sole `needsRender: true` city
   (`pipeline/src/cities/chrzanow/config.js:37`); `core/render.js` lazy-imports playwright
   so no other adapter ever loads it. Skip and stay browser-free otherwise.
9. Verify offline: `npm test` (dot reporter — only failures print) and `npm run health`
   (committed data only, no network).
10. Live smoke on one small plain-fetch city:
    `CITY=chelmno npm run refresh`, then `npm run build-index`. Ship any resulting
    changes via branch + PR (section 4), never direct push.
11. Site-build sanity: `cd ~/repos/przetargimiejskie && bash build-site.sh /tmp/_site && ls /tmp/_site`.

## 4. Operating rules on the Pi

- **Ship via PR, never direct push to main** (house policy — there is NO
  server-side branch protection to catch a mistake, so the discipline is on you):
  `git push origin main:refs/heads/<branch>` then
  `gh pr create --head <branch> --title "<title>" --body-file <file>`.
- **Sequential, not parallel**: run `CITY=<id> npm run refresh` one city at a time.
  CI's 10-way matrix parallelism does not fit 8 GB, especially with OCR or Chromium.
- **Data commits race the 04:00 UTC cron refresh** (`refresh.yml` per-city jobs push
  with rebase-retry). Prefer PRs; on generated-file conflicts apply the repo
  CLAUDE.md rule: take both sources, rebuild, `git add -A && git commit --no-edit && git push`.
- **Per-machine drift — read this if you are an agent session on the Pi**: the user's
  global CLAUDE.md hardcodes Windows facts ("gh is NOT on PATH, use
  `C:\Program Files\GitHub CLI\gh.exe`"; repos under `C:\Users\K\repos`). On the Pi,
  **gh IS on PATH** (bare `gh` works) and the repo lives at `~/repos/przetargimiejskie`.
  Do not path-translate Windows instructions literally.

## 5. Risks and mitigations

- **OCR throughput**: pdftoppm 300 DPI + `tesseract -l pol` runs ~2–4x slower than
  GitHub's x86 runners; a cold scanned-PDF backfill can take hours. Mitigated by the
  committed caches (`pipeline/ocr-cache/`, `pdf-text-cache/`, `doc-text-cache/`,
  `rtf-text-cache/`, `detail-cache/`, `uldk-cache/`) — steady-state refreshes only
  process NEW documents.
- **Memory**: 8 GB is comfortable for one city at a time; large scanned pages produce
  big intermediate PPMs and headless Chromium (chrzanow only) adds ~300–500 MB.
  Enable zram/swap as a safety net; keep runs sequential.
- **Storage/thermals**: the repo carries ever-growing committed caches — run from a
  quality USB SSD (or NVMe HAT), not microSD; add active cooling or sustained
  tesseract runs will thermally throttle a passive Pi 5.
- **Playwright on ARM**: headless Chromium is supported on Debian-family arm64 only
  (`--with-deps` needs apt) — stick to RPi OS Bookworm 64-bit; `render.js` already
  passes `--no-sandbox --disable-dev-shm-usage`.
- **Strategic simplification**: the nowy-sacz spike
  (`spikes/malopolskie/nowy-sacz/nowy-sacz.md`, "Side finding") proved
  bip.malopolska.pl exposes `/api/articles/{id}` + `/api/menu/{id}/articles` JSON —
  rewriting chrzanow to that API removes the repo's only browser dependency and makes
  the Pi 100% browser-free.
- **Network quirks**: residential IP helps, but some BIPs gate on User-Agent
  (`core/fetch.js` supports browser UA/headers — bytom, wejherowo). CG-NAT/IPv6-only
  home connections can flake on legacy municipal hosts; prefer IPv4.

## 6. Sessions and skills that apply here

- **`.claude/skills/przetargi-city-triage/SKILL.md`** (committed with the July 2026
  docs PR) — batch city spikes / adapter builds / re-verifications; fully
  terminal-based, Pi-suitable.
- **`spikes/README.md`** — the spike protocol (browser-free by design); ledger roll-up
  via `node spikes/build-progress.mjs` → `spikes/SPIKE-PROGRESS.md`.
- **`pipeline/ADAPTER-GUIDE.md`** — adapter contract (incl. `needsRender`) for builds
  done from the Pi.
- **wrap-up ritual** (global skill) — end-of-session md sync still applies; the
  Obsidian vault lives on the Windows box, so from the Pi limit wrap-up to this
  repo's md files and note vault-log lines in the PR body instead.
