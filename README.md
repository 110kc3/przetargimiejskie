# przetargimiejskie

A pipeline that scrapes municipal property auctions from Polish cities (nationwide coverage that began with the Silesian / Górnośląsko-Zagłębiowska cluster), plus an isolated pilot for nationwide institutional sellers, parses them into structured JSON, and surfaces price/round history — so that when browsing an active auction listing you can see whether the property has been offered before, in which round, and at what prices.

**Coverage inventory:** **1,026 official cities and towns**, keyed by GUS SIMC: 121 monitored adapters, 215 other previously surveyed cities and 690 unresearched cities. The generated state is [`spikes/SPIKE-PROGRESS.md`](./spikes/SPIKE-PROGRESS.md); monitored-city counts and source hosts are in [`data/index.json`](./data/index.json). Each adapter lives under `pipeline/src/cities/<city>/` and is registered in `pipeline/src/cities/index.js`.

The production architecture is deliberately simple: **GitHub-hosted pipeline → JSON committed to this repo → Chrome extension fetches the JSON from `raw.githubusercontent.com`.** No private runner, private-network tunnel, paid service or hosted database is required. See [PLAN.md](./PLAN.md) for the why.

## What's here

| Path | What it is |
|---|---|
| [`pipeline/`](./pipeline) | Node.js scraper + OCR/text/`.doc` extractors + per-city parsers. Builds `data/<city>/*.json`. |
| [`pipeline/src/cities/<city>/`](./pipeline/src/cities) | One adapter per city (crawl + parse), registered in `cities/index.js`. |
| [`pipeline/src/providers/`](./pipeline/src/providers) | Nationwide institutional-seller adapters (currently PKP + AMW). Kept separate from cities and municipal metrics. |
| [`pipeline/ocr-cache/`](./pipeline/ocr-cache) | Committed OCR text per scanned PDF (each OCR'd once). |
| [`pipeline/pdf-text-cache/`](./pipeline/pdf-text-cache) | Committed `pdftotext` output for text PDFs (many cities). |
| [`pipeline/doc-text-cache/`](./pipeline/doc-text-cache) | Committed `catdoc` output for legacy `.doc` announcements (Bytom, Legnica, …). Doubles as a retention store if a source later removes the file. |
| [`pipeline/uldk-cache/`](./pipeline/uldk-cache) | Committed ULDK lookups (obręb + parcel → TERYT parcel id) so each land plot gets a precise geoportal `identifyParcel` deep-link, resolved once per parcel. |
| `data/<city>/properties.json` | One record per unique `(street, building, apt)` with the full chronological listings history. **The file the Chrome extension consumes.** |
| `data/<city>/active.json` | Currently-active auctions and "wykaz" pre-announcements. |
| `data/<city>/meta.json` | Provenance: when generated, schema/parser versions, counts. |
| [`data/index.json`](./data/index.json) | Per-city summary (label, authority, host, counts). |
| [`data/providers/`](./data/providers) | Separate provider index, metadata and row-based listings. The contract and rollout notes are in [`spikes/providers/`](./spikes/providers). |
| [`.github/workflows/refresh.yml`](./.github/workflows/refresh.yml) | GitHub Actions: daily/on-change hosted refresh in bounded source-aware shards; each city is process/worktree-isolated and one municipal publisher validates and commits all successful deltas plus the index. |
| [`.github/workflows/health.yml`](./.github/workflows/health.yml) | Daily source-health check (`pipeline/scripts/health-check.js`): fails if any city's data is empty or stale — failures feed the per-city `[city-broken]` triage issues. |
| [`.github/workflows/inventory.yml`](./.github/workflows/inventory.yml) | Annual/manual official GUS TERYT city-inventory reconciliation, with a read-only generator and allowlisted publisher. |
| [`.github/workflows/README.md`](./.github/workflows/README.md) | The workflow catalog — all 8 numbered workflows. |
| [`spike/ocr_samples/`](./spike/ocr_samples) | Raw OCR fixtures for the parser unit tests. |
| [`OPERATING-MODEL.md`](./OPERATING-MODEL.md) | The operating manual above all other docs: how the project runs autonomously, reaches genre-completeness, and makes money. |
| [`PLAN.md`](./PLAN.md) | Full architecture & form-factor comparison. |
| [`PRIVACY.md`](./PRIVACY.md) | Privacy policy for the Chrome extension (required for Web Store). |
| [`SPIKE.md`](./SPIKE.md) | OCR-feasibility spike notes. |

## How it runs

```
       crawl-results.js  ──┐
                           ├──>  ocr-pdf.js  ──>  parse-result.js  ──┐
       crawl-active.js   ──┤      (tesseract -l pol, cached)         │
                           │                                          ├──>  data/*.json
                           └─────────────────────────────────────────┘
```

1. **`crawl-results.js`** walks `/wyniki-przetargow/page/N/`, extracts every result-PDF URL and the auction date from the filename (handles three different ZGM filename conventions).
2. **`ocr-pdf.js`** downloads each PDF, rasterizes at 300 DPI with `pdftoppm`, runs Polish-language tesseract, caches the resulting text in `pipeline/ocr-cache/`. The cache is checked into git so CI does work only for *new* PDFs.
3. **`parse-result.js`** splits each PDF's text into the "sold" and "unsold" sections, pulls fields out with regex (round numeral, address, prices, outcome, unsold reason).
4. **`normalize.js`** turns address strings into a stable `{street, building, apt}` join key tolerant of Polish-language conventions (`ul./al./pl.`), Roman-numeral commercial-unit apt numbers, OCR slash-as-`I` slips, garage-unit suffixes, building ranges, and so on.
5. **`crawl-active.js`** scrapes the four "currently active" pages on the site.
6. **`refresh.js`** is the orchestrator: it walks every registered city adapter and writes `data/<city>/properties.json`, `active.json`, `meta.json`, plus the top-level `data/index.json`.

The diagram above is the **Gliwice** flow (OCR'd result PDFs). Other cities plug into the same orchestrator via their adapter but use different source types: Katowice mixes text-PDF yearly summaries (`pdftotext`) with BIP/SharePoint announcements; Bytom crawls the server-rendered BIP sales list and enriches from the i-BIIP catalog + `.doc` announcements (`catdoc`); Zabrze pulls a JSON document board and parses attachment PDFs. Each adapter implements the same contract (`crawlResultDocs` / `parseResultDoc` / `crawlActive`, optional `enrichActive`).

## Running locally

> Headless Linux box (RPi5 / ARM64, Polish residential IP)? Follow
> [REMOTE.md](./REMOTE.md) for operator-initiated local work. Automated Polish
> egress is separately constrained by [PL-EGRESS-PLAN.md](./PL-EGRESS-PLAN.md).

```bash
# one-time setup
sudo apt-get install poppler-utils tesseract-ocr tesseract-ocr-pol  # or brew equivalents
cd pipeline
npm install

# the full build
npm run refresh

# institutional provider feeds (PKP + AMW)
npm run refresh:providers
npm run health:providers

# tests (only failures print)
npm test
```

Output ends up in `../data/*.json`. The OCR cache lives in `pipeline/ocr-cache/` — commit it.

The pipeline is incremental: deleting `pipeline/ocr-cache/` forces re-OCR; deleting `data/*.json` rebuilds from cached OCR text in seconds.

## Testing

All automated tests live in [`pipeline/tests/`](./pipeline/tests) and run on Node's built-in test runner (`node --test`, no extra deps). They are **offline and fast** — every parser test runs against committed fixtures (condensed-but-faithful copies of real extracted source text), so you do **not** need network or the OCR/PDF tools to run them.

```bash
cd pipeline
npm install            # one-time (installs the dev test deps; playwright is optional)

# Full suite — only FAILURES print (dot reporter). A clean run shows just dots + a summary.
npm test

# One file — the inner-loop while building/altering a single city's parser:
node --test tests/parse-kedzierzyn-kozle.test.js

# If a runner is ever chatty, filter to failures only (project convention):
node --test tests/parse-kedzierzyn-kozle.test.js 2>&1 | grep -iE "fail|not ok|error|✖" || echo "pass"
```

**What's covered.** One `tests/parse-<city>.test.js` per city (each asserts the city's parser against real announcement/result fixtures — address keys, prices, round, area, sold/unsold outcome, dates), plus the cross-cutting engines: `normalize.test.js` + `normalize-parity.test.js` (the pipeline↔extension address-key must stay byte-identical), `classify-kind.test.js`, `build-properties.test.js`, `merge-history.test.js`, `build-land.test.js` / `land-robustness.test.js`, `dealscore.test.js`, and `extension-version.test.js` (the `manifest.json` ↔ `popup.html` ↔ `CHANGELOG.md` version lockstep). **Adding a city = adding its `parse-<city>.test.js` with real fixtures**; CI runs the whole suite before every refresh.

**Testing one city end-to-end (live, network-gated).** Unit tests cover the *parsers*; the *crawlers* fetch live municipal sites, so they're validated by an actual refresh. Run a single city without touching the others:

```bash
# Needs the extraction tools: poppler-utils tesseract-ocr tesseract-ocr-pol (+ catdoc for Bytom).
CITY=kedzierzyn-kozle npm run refresh      # writes data/kedzierzyn-kozle/*.json, skips index.json
npm run build-index                        # rebuild data/index.json after a filtered run
node src/cities/kedzierzyn-kozle/crawl.js  # smoke-run just the crawler → prints counts + a sample record
```

A brand-new city adapter's crawler is therefore **first validated on its first CI refresh** (or a local `CITY=<id> npm run refresh`) — review that run's committed `data/<city>/` delta before relying on it. Per-city isolation in `refresh.js` means a new city that errors or returns empty can't break the others.

**Source-health check.** `npm run health` (script: [`pipeline/scripts/health-check.js`](./pipeline/scripts/health-check.js)) fails if any registered city's data is empty or stale — the same gate [`.github/workflows/health.yml`](./.github/workflows/health.yml) runs daily.

`npm run health:providers` applies the equivalent freshness, count, identity and
deduplication checks to the separate institutional feeds.

**Extension.** No automated DOM tests; load it unpacked (see [Chrome extension](#chrome-extension) below) and verify against a covered site. The only enforced invariant is the version lockstep test above.

## Running on GitHub Actions

The included workflow `.github/workflows/refresh.yml` runs daily at 04:00 UTC, on demand via the "Run workflow" button, and on every push to `main` (the push trigger ignores doc/data/cache/extension-only changes to avoid loops). A `setup` job runs the parser suite once, then emits bounded shards: about four or five small cities, while OCR/render-heavy adapters receive dedicated capacity and cities sharing a source host stay together. Racibórz and Pszczyna are marked `needsResidentialEgress` and are always excluded; no proxy or private-network credential enters a hosted job. See [`PL-EGRESS-PLAN.md`](./PL-EGRESS-PLAN.md). Each shard:

1. Installs `poppler-utils`, `tesseract-ocr-pol`, and `catdoc` (legacy `.doc` → text, for Bytom) (~5 s).
2. Runs every assigned city sequentially in its own detached worktree and subprocess with a per-city timeout; one failure cannot contaminate or stop the others.
3. Applies the national validation policy. New cities are strict by default; 21 named legacy datasets remain visibly quarantined until their recorded parser findings are repaired or the 6 October review deadline fails health. Land-only and mixed streams use separate source state and valid-empty proof.
4. Uploads one allowlisted, hashed manifest per city while holding only a read token. A single trusted municipal publisher requires the complete artifact set, rejects traversal, symlinks, unexpected paths/types, malformed JSON, oversized content, hash conflicts and missing cities, reruns validation, rebuilds `data/index.json`, then commits once. Failed outcomes publish their attempt time, duration and instrumented request count but cannot replace last-good city files.

In parallel, the provider path refreshes PKP and AMW, validates the complete combined ledger, and commits only `data/providers/` plus its OCR cache. Because `www.pkp.pl` can selectively drop one Azure region while remaining reachable from others, an isolated PKP connection failure gets up to two retries on fresh hosted runners; the final provider gate still requires AMW, provider health, commits, and at least one fresh PKP attempt to succeed. The municipal publisher rebuilds the city index in its single commit, and a triage job files one `[city-broken]` issue per broken hosted city. The full 8-workflow catalog is documented in [`.github/workflows/README.md`](./.github/workflows/README.md).

The crawler jobs use a read-only `GITHUB_TOKEN` and check out with persisted credentials disabled. Only artifact publishers receive `contents: write`. No hosted crawl receives a residential proxy or private-network credential.

If you branch-protect `main`, switch the workflow to open a PR via `peter-evans/create-pull-request` instead of pushing directly.

## Chrome extension

Lives in [`extension/`](./extension). MV3, no build step, no dependencies. Load as unpacked:

1. Open `chrome://extensions`, toggle **Developer mode** on (top right).
2. Click **Load unpacked**, point it at this repo's `extension/` directory.
3. Visit any of the 8 overlay-covered hosts, e.g. `zgm-gliwice.pl`, `bip.katowice.eu`, `bip.zgm.rybnik.pl` (full list: `manifest.json` `content_scripts`).

What it does:

- **Background service worker** (`background.js`) fetches each city's `properties.json` / `active.json` / `meta.json` from `raw.githubusercontent.com/110kc3/przetargimiejskie/main/data/<city>/`, merges them into one payload (keys namespaced `<city>|<street>|<building>|<apt>`), and caches in `chrome.storage.local` with a 6-hour TTL. The popup has a **Refresh data** button to bypass the TTL. Note: the extension currently surfaces 9 Śląskie cities — the data-driven rework that reads the city list from `index.json` is the top [ROADMAP.md](./ROADMAP.md) T1 item. The public website archive shows the gated Śląskie set (see *Website* below); every crawled city is on `/archiwum-all`.
- **Content script** (`content.js` + per-site adapters in `sites/`) runs on each covered host:
  - On listing index pages: appends a stats chip to each card — round (`2. przetarg`), starting price, area, zł/m², a **deal score** (`▼ N% below median` / `▲ N% above median` vs the city's median zł/m²), auction date — plus a color-coded history badge (green = no prior auctions / `brak danych archiwalnych` for a re-listing we have no archive for; gray = previously sold; amber = one prior unsold; red = ≥2 unsold). Hover for the full prior-attempt table.
  - On property-detail pages: injects a sidebar with a chronological history table and a price-delta summary versus the first historical attempt.
- **Popup** (`popup.html` + `popup.js`) lists all currently-active properties across cities (city-tagged), sorted by most-relisted first; re-listings show their round (`2./3. przetarg`) rather than "nowa"; the zł/m² cell carries the same deal-score badge. Click a row → opens that property's detail page. The per-city median zł/m² is computed client-side in [`extension/dealscore.js`](./extension/dealscore.js) (residential flats only, ≥5 priced samples).
- **Archive** (`archive.html` + `archive.js`) — a full sortable/filterable table of all past listings (city, kind, round, area, prices, zł/m², outcome), with city/kind/outcome/year filters and free-text search.
- **Language: PL / EN.** The popup has a small `PL` / `EN` button in the header. Default is PL (since the source data is Polish municipal records). Toggle is persisted in `chrome.storage.local` and broadcast across tabs — flipping it in the popup retranslates open zgm-gliwice.pl tabs in place, no reload required. All user-facing strings live in [`extension/i18n.js`](./extension/i18n.js).

**Address-key parity** — the extension's `normalize.js` and the pipeline's `normalize.js` produce identical `street_norm|building|apt` join keys. This is verified end-to-end against live data: every active listing in `active.json` round-trips from page-title → parsed address → matching property key in `properties.json`. A committed test (`pipeline/tests/normalize-parity.test.js`, run in `npm test`/CI) additionally asserts the two `parseAddress` implementations stay byte-identical — over bug-history fixtures **and** a sweep of every published property address.

**Detail-page address detection** — the page `<title>` is preferred over the URL slug because slug encoding is ambiguous on digit collisions (e.g. `/krolewskiej-tamy-5-2-...` could be either `5/2` or `53/2`); the title carries the canonical address.


### Privacy policy

See [PRIVACY.md](./PRIVACY.md). The short version: nothing leaves your computer. The extension fetches each covered city's public JSON files from GitHub and reads pages you're already viewing on the covered municipal sites — that's the entire network footprint. No analytics, no tracking, no third-party services. For Chrome Web Store submission, link to the GitHub-hosted raw URL: `https://github.com/110kc3/przetargimiejskie/blob/main/PRIVACY.md`.

### Roadmap

See [ROADMAP.md](./ROADMAP.md) for tiers/gates and [TODO.md](./TODO.md) for the live backlog.

## Website (przetargimiejskie.pl)

The same repo also publishes a public website, so the data is usable without installing anything.

Lives in [`site/`](./site) — fully static, no build step. [`build-site.sh`](./build-site.sh) assembles the published site (`_site/`) from:

- `site/index.html` → landing page (live city counts pulled from `/data/index.json`).
- `site/archiwum/` → a standalone web version of the archive — same filters/summary as the extension's archive, but it fetches `/data/<city>/*.json` directly (no Chrome APIs), so it works in any browser.
- `site/privacy/` → privacy page (`/privacy`).
- `data/` is copied to `/data/…` so the archive can read it.

The `/archiwum-all` test view also loads the separate PKP/AMW provider ledger,
labels each seller and offers a seller filter. This is a pilot: provider rows do
not enter municipal medians, `data/index.json`, city health, or the extension.
See [`spikes/providers/README.md`](./spikes/providers/README.md) for the public
graduation gate and the documented Orange defer decision.

**Public scope is gated twice.** [`scripts/build-seo-pages.mjs`](./scripts/build-seo-pages.mjs) is the single place that decides which cities the site advertises: `PUBLIC_VOIVODESHIPS` (`null` = all of Poland, since 2026-07-27) and then `MIN_PUBLIC_AUCTIONS` — a city needs at least 10 auctions (live + archived) or its page is mostly empty tables, which reads as broken rather than as honest coverage. **54 of 121 crawled cities currently publish, across 15 voivodeships.** The script writes a per-city `public` flag and a **date-aware `live_auctions`** count into the *published* `_site/data/index.json`; the landing, `/archiwum` and `/raporty` all filter and count off those fields, so the pages cannot disagree about how many cities or auctions there are. Two consequences worth knowing:

- Use `live_auctions`, not `active_auctions`, for anything user-facing. `active_auctions` is frozen at the last refresh, so auctions whose date has since passed still count there — that drift is what used to make the landing advertise auctions a city page then denied.
- The gate is self-healing and applies only to the published copy. The repo's own `data/index.json` is untouched (the extension reads it from `raw.githubusercontent.com` and must keep seeing every city), gated-out cities keep being crawled, and they stay visible on the `/archiwum-all` test view. A city re-appears on its own once its board produces enough auctions.

**The extension is not bundled into the site** — it lives in its own top-level `extension/` directory and is distributed via the Chrome Web Store; the site root is `site/`, not the extension.

**Hosting: the live host is OVH.** The domain's DNS A/AAAA records point at OVH shared hosting, and [`.github/workflows/ovh-deploy.yml`](./.github/workflows/ovh-deploy.yml) is the canonical deploy: on every push to `main` touching `site/`/`data/`/`extension/`, **and** after each data-refresh run, it runs `build-site.sh` and mirrors `_site/` to OVH over SFTP (requires the `OVH_FTP_*` repo secrets documented in that workflow).

OVH is the **only** deploy path (the former GitHub Pages fallback, `pages.yml`, was removed July 2026 — recover it from git history and repoint DNS if ever needed). All workflows are documented in [`.github/workflows/README.md`](./.github/workflows/README.md).

## Current coverage (data quality notes)

Counts per city live in `data/<city>/meta.json` and `data/index.json`. Achieved sold-price history is no longer Gliwice-only — most adapters (~45 of 55) parse achieved-price result streams; Gliwice's OCR'd result PDFs remain the deepest history. A handful of cities (Bytom, Bielsko-Biała, Rybnik, Świnoujście, Nowa Sól, Gdańsk) publish no usable result stream and stay active-only.

### Gliwice

- **160+ unique properties** tracked from historical result PDFs going back to **2024-02-12**.
- **~95–97% of records** in each PDF parse cleanly. The remaining ~3% are real edge cases the parser intentionally drops:
  - Properties identified only by internal building ID (`Kłodnicka (ID budynku nr 2155)`).
  - Garage units with no building number (`Ziębia`, `garażu nr 12 na płd. wsch. od ul. Daszyńskiego 95-97`).
- OCR-introduced quirks that *are* corrected and flagged in `notes`:
  - `1I` → `1` (slash eaten by OCR).
  - `TII` → `III` (T misread for I).
  - `105:400,00` → `105400` (colon mistaken for period in prices).
- Roman-numeral apartment numbers are preserved as-is (`Barlickiego 12/I`), which matches Polish municipal convention.

## Attribution

All scraped data originates from each covered city's public BIP / municipal source (city-hall bulletin boards, housing-authority sites, municipal catalogs). This repository is a read-only mirror with a derived view; the canonical source for any data point is linked from each listing's `source_pdf` / `detail_url` field, and the full list of covered cities with their source hosts lives in [`data/index.json`](./data/index.json).
