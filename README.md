# przetargimiejskie

A pipeline that scrapes municipal property auctions from several Silesian cities, parses them into structured JSON, and surfaces price/round history — so that when browsing an active auction listing you can see whether the property has been offered before, in which round, at what prices, and how the city has been adjusting the asking price.

**Cities covered:** Gliwice (ZGM — full sold-price history via OCR'd result PDFs), Katowice (BIP + SharePoint — yearly result summaries + announcements), Bytom (`www.bytom.pl/bip` sales list + i-BIIP catalog + `.doc` announcements), Zabrze (`bip.miastozabrze.pl` document board + attachment PDFs), Sosnowiec (`bip.um.sosnowiec.pl` JSON API — open flat auctions, filtered out of the city's land/commercial + tenant bezprzetargowe sales), Rybnik (ZGM `bip.zgm.rybnik.pl` — flat auctions as RTF announcements, decoded by a pure-JS RTF reader). Each city is a self-contained adapter under `pipeline/src/cities/<city>/` registered in `pipeline/src/cities/index.js`.

The architecture is deliberately simple: **local pipeline → JSON committed to this repo → Chrome extension fetches the JSON from `raw.githubusercontent.com`.** No server, no paid service, no hosted database. See [PLAN.md](./PLAN.md) for the why.

## What's here

| Path | What it is |
|---|---|
| [`pipeline/`](./pipeline) | Node.js scraper + OCR/text/`.doc` extractors + per-city parsers. Builds `data/<city>/*.json`. |
| [`pipeline/src/cities/<city>/`](./pipeline/src/cities) | One adapter per city (crawl + parse), registered in `cities/index.js`. |
| [`pipeline/ocr-cache/`](./pipeline/ocr-cache) | Committed OCR text per scanned PDF (each OCR'd once). |
| [`pipeline/pdf-text-cache/`](./pipeline/pdf-text-cache) | Committed `pdftotext` output for text PDFs (Katowice, Zabrze). |
| [`pipeline/doc-text-cache/`](./pipeline/doc-text-cache) | Committed `catdoc` output for legacy `.doc` announcements (Bytom). Doubles as a retention store if a source later removes the file. |
| `data/<city>/properties.json` | One record per unique `(street, building, apt)` with the full chronological listings history. **The file the Chrome extension consumes.** |
| `data/<city>/active.json` | Currently-active auctions and "wykaz" pre-announcements. |
| `data/<city>/meta.json` | Provenance: when generated, schema/parser versions, counts. |
| [`data/index.json`](./data/index.json) | Per-city summary (label, authority, host, counts). |
| [`.github/workflows/refresh.yml`](./.github/workflows/refresh.yml) | GitHub Actions: re-runs the pipeline weekly **and on push to `main`**, commits any deltas. |
| [`.github/workflows/health.yml`](./.github/workflows/health.yml) | Daily source-health check (`pipeline/scripts/health-check.js`): fails (→ email) if any city's data is empty or stale. |
| [`spike/ocr_samples/`](./spike/ocr_samples) | Raw OCR fixtures for the parser unit tests. |
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

```bash
# one-time setup
sudo apt-get install poppler-utils tesseract-ocr tesseract-ocr-pol  # or brew equivalents
cd pipeline
npm install

# the full build
npm run refresh

# tests (only failures print)
npm test
```

Output ends up in `../data/*.json`. The OCR cache lives in `pipeline/ocr-cache/` — commit it.

The pipeline is incremental: deleting `pipeline/ocr-cache/` forces re-OCR; deleting `data/*.json` rebuilds from cached OCR text in seconds.

## Running on GitHub Actions

The included workflow `.github/workflows/refresh.yml` runs every Monday at 06:00 UTC, on demand via the "Run workflow" button, and on every push to `main` (the push trigger ignores doc/data/cache/extension-only changes to avoid loops). It:

1. Installs `poppler-utils`, `tesseract-ocr-pol`, and `catdoc` (legacy `.doc` → text, for Bytom) (~5 s).
2. Runs the parser test suite (must pass — fail-fast against parser regressions).
3. Runs `npm run refresh`.
4. Commits and pushes `data/` + the caches (`ocr-cache/`, `pdf-text-cache/`, `doc-text-cache/`, `detail-cache/`) if any changed.

The auto-provided `GITHUB_TOKEN` with `permissions: contents: write` is enough; no secrets needed.

If you branch-protect `main`, switch the workflow to open a PR via `peter-evans/create-pull-request` instead of pushing directly.

## Chrome extension

Lives in [`extension/`](./extension). MV3, no build step, no dependencies. Load as unpacked:

1. Open `chrome://extensions`, toggle **Developer mode** on (top right).
2. Click **Load unpacked**, point it at this repo's `extension/` directory.
3. Visit any covered site: `zgm-gliwice.pl`, `bip.katowice.eu`, `www.bytom.pl`, `i-biip.um.bytom.pl`.

What it does:

- **Background service worker** (`background.js`) fetches each city's `properties.json` / `active.json` / `meta.json` from `raw.githubusercontent.com/110kc3/przetargimiejskie/main/data/<city>/`, merges them into one payload (keys namespaced `<city>|<street>|<building>|<apt>`), and caches in `chrome.storage.local` with a 6-hour TTL. The popup has a **Refresh data** button to bypass the TTL.
- **Content script** (`content.js` + per-site adapters in `sites/`) runs on each covered host:
  - On listing index pages: appends a stats chip to each card — round (`2. przetarg`), starting price, area, zł/m², a **deal score** (`▼ N% below median` / `▲ N% above median` vs the city's median zł/m²), auction date — plus a color-coded history badge (green = no prior auctions / `brak danych archiwalnych` for a re-listing we have no archive for; gray = previously sold; amber = one prior unsold; red = ≥2 unsold). Hover for the full prior-attempt table.
  - On property-detail pages: injects a sidebar with a chronological history table and a price-delta summary versus the first historical attempt.
- **Popup** (`popup.html` + `popup.js`) lists all currently-active properties across cities (city-tagged), sorted by most-relisted first; re-listings show their round (`2./3. przetarg`) rather than "nowa"; the zł/m² cell carries the same deal-score badge. Click a row → opens that property's detail page. The per-city median zł/m² is computed client-side in [`extension/dealscore.js`](./extension/dealscore.js) (residential flats only, ≥5 priced samples).
- **Archive** (`archive.html` + `archive.js`) — a full sortable/filterable table of all past listings (city, kind, round, area, prices, zł/m², outcome), with city/kind/outcome/year filters and free-text search.
- **Language: PL / EN.** The popup has a small `PL` / `EN` button in the header. Default is PL (since the source data is Polish municipal records). Toggle is persisted in `chrome.storage.local` and broadcast across tabs — flipping it in the popup retranslates open zgm-gliwice.pl tabs in place, no reload required. All user-facing strings live in [`extension/i18n.js`](./extension/i18n.js).

**Address-key parity** — the extension's `normalize.js` and the pipeline's `normalize.js` produce identical `street_norm|building|apt` join keys. This is verified end-to-end against live data: every active listing in `active.json` round-trips from page-title → parsed address → matching property key in `properties.json`. A committed test (`pipeline/tests/normalize-parity.test.js`, run in `npm test`/CI) additionally asserts the two `parseAddress` implementations stay byte-identical — over bug-history fixtures **and** a sweep of every published property address.

**Detail-page address detection** — the page `<title>` is preferred over the URL slug because slug encoding is ambiguous on digit collisions (e.g. `/krolewskiej-tamy-5-2-...` could be either `5/2` or `53/2`); the title carries the canonical address.


### Privacy policy

See [PRIVACY.md](./PRIVACY.md). The short version: nothing leaves your computer. The extension fetches three public JSON files from GitHub and reads pages you're already viewing on `zgm-gliwice.pl` — that's the entire network footprint. No analytics, no tracking, no third-party services. For Chrome Web Store submission, link to the GitHub-hosted raw URL: `https://github.com/110kc3/przetargimiejskie/blob/main/PRIVACY.md`.

### Roadmap

See [TODO.md](./TODO.md) for the live backlog (sold-price streams for Bytom/Zabrze, per-city CI matrix, Katowice land-parcel coverage, monetization MVP, and remaining edge cases).

## Website (przetargimiejskie.pl)

The same repo also publishes a public website, so the data is usable without installing anything.

Lives in [`site/`](./site) — fully static, no build step. [`build-site.sh`](./build-site.sh) assembles the published site (`_site/`) from:

- `site/index.html` → landing page (live city counts pulled from `/data/index.json`).
- `site/archiwum/` → a standalone web version of the archive — same filters/summary as the extension's archive, but it fetches `/data/<city>/*.json` directly (no Chrome APIs), so it works in any browser.
- `site/privacy/` → privacy page (`/privacy`).
- `data/` is copied to `/data/…` so the archive can read it.

**The extension is not bundled into the site** — it lives in its own top-level `extension/` directory and is distributed via the Chrome Web Store; the site root is `site/`, not the extension.

**Hosting: the live host is OVH.** The domain's DNS A/AAAA records point at OVH shared hosting, and [`.github/workflows/ovh-deploy.yml`](./.github/workflows/ovh-deploy.yml) is the canonical deploy: on every push to `main` touching `site/`/`data/`/`extension/`, **and** after each data-refresh run, it runs `build-site.sh` and mirrors `_site/` to OVH over SFTP (requires the `OVH_FTP_*` repo secrets documented in that workflow).

[`.github/workflows/pages.yml`](./.github/workflows/pages.yml) is a **manual-only GitHub Pages fallback** (run by hand from the Actions tab) for when OVH is unavailable; making it the live host would require repointing DNS to GitHub Pages. Only one host can own the `przetargimiejskie.pl` custom domain at a time.

## Current coverage (data quality notes)

Counts per city live in `data/<city>/meta.json` and `data/index.json`. Gliwice is the only city with achieved sold-price history; Katowice has yearly result summaries plus active announcements; Bytom and Zabrze are active-listing adapters (no published achieved-price stream yet — see TODO.md).

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

All scraped data originates from the public municipal sources of each covered city: [zgm-gliwice.pl](https://zgm-gliwice.pl/) (ZGM Gliwice), [bip.katowice.eu](https://bip.katowice.eu/) (UM Katowice), [www.bytom.pl/bip](https://www.bytom.pl/bip) + [i-biip.um.bytom.pl](https://i-biip.um.bytom.pl/) (UM Bytom), and [bip.miastozabrze.pl](https://bip.miastozabrze.pl/) (UM Zabrze). This repository is a read-only mirror with a derived view; canonical sources for any data point are linked from each listing's `source_pdf` / `detail_url` field.
