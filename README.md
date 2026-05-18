# zgm-gliwice

A pipeline that scrapes auction results from [zgm-gliwice.pl](https://zgm-gliwice.pl/), OCRs the PDFs, parses them into structured JSON, and surfaces price history for municipal properties — so that when browsing an active auction listing you can see whether the property has been unsold before, how many times, at what prices, and how the city has been adjusting the asking price.

The architecture is deliberately simple: **local pipeline → JSON committed to this repo → Chrome extension fetches the JSON from `raw.githubusercontent.com`.** No server, no paid service, no hosted database. See [PLAN.md](./PLAN.md) for the why.

## What's here

| Path | What it is |
|---|---|
| [`pipeline/`](./pipeline) | Node.js scraper + OCR + parser. Builds `data/*.json`. |
| [`pipeline/ocr-cache/`](./pipeline/ocr-cache) | Committed OCR text per source PDF. Means each PDF is OCR'd exactly once over its lifetime. |
| [`data/properties.json`](./data/properties.json) | One record per unique `(street, building, apt)` with the full chronological listings history. **The file the Chrome extension consumes.** |
| [`data/active.json`](./data/active.json) | Currently-active auctions and "wykaz" pre-announcements. |
| [`data/meta.json`](./data/meta.json) | Provenance: when the data was generated, schema/parser versions, counts. |
| [`.github/workflows/refresh.yml`](./.github/workflows/refresh.yml) | Weekly GitHub Actions cron that re-runs the pipeline and commits any deltas. |
| [`spike/ocr_samples/`](./spike/ocr_samples) | Raw OCR fixtures for the parser unit tests. |
| [`PLAN.md`](./PLAN.md) | Full architecture & form-factor comparison. |
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
6. **`refresh.js`** is the orchestrator: it ties the above together and writes `data/properties.json`, `data/active.json`, `data/meta.json`.

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

The included workflow `.github/workflows/refresh.yml` runs every Monday at 06:00 UTC, plus on demand via the "Run workflow" button. It:

1. Installs `poppler-utils` + `tesseract-ocr-pol` (~5 s).
2. Runs the parser test suite (must pass — fail-fast against parser regressions).
3. Runs `npm run refresh`.
4. Commits and pushes `data/` + `pipeline/ocr-cache/` if any of them changed.

The auto-provided `GITHUB_TOKEN` with `permissions: contents: write` is enough; no secrets needed.

If you branch-protect `main`, switch the workflow to open a PR via `peter-evans/create-pull-request` instead of pushing directly.

## Chrome extension

Lives in [`extension/`](./extension). MV3, no build step, no dependencies. Load as unpacked:

1. Open `chrome://extensions`, toggle **Developer mode** on (top right).
2. Click **Load unpacked**, point it at this repo's `extension/` directory.
3. Visit any page under `zgm-gliwice.pl/`.

What it does:

- **Background service worker** (`background.js`) fetches `data/properties.json`, `data/active.json`, `data/meta.json` from `raw.githubusercontent.com/110kc3/zgm-gliwice/main/data/` and caches them in `chrome.storage.local` with a 6-hour TTL. The popup has a **Refresh data** button to bypass the TTL.
- **Content script** (`content.js`) runs on `zgm-gliwice.pl`:
  - On listing index pages (mieszkalne / garaże / użytkowe / wykaz): adds a small color-coded badge to each Elementor card — green for first-time listings, gray for "previously sold" repeats, amber for one prior unsold attempt, red for ≥2 unsold attempts. Hover for a tooltip with the full prior-attempt table.
  - On property-detail pages (the slug-style `/zygmunta-starego-29-4-23-03-2026-r/` URLs): injects a sidebar near the top of the page with a chronological history table (date · round · kind · start price · outcome · final · reason · source PDF) and a price-delta summary versus the first historical attempt.
- **Popup** (`popup.html` + `popup.js`) lists all currently-active properties sorted by most-relisted first. Click a row → opens that property's detail page on `zgm-gliwice.pl`. The footer shows when the cached data was last refreshed.

**Address-key parity** — the extension's `normalize.js` and the pipeline's `normalize.js` produce identical `street_norm|building|apt` join keys. This is verified end-to-end against live data: every active listing in `active.json` round-trips from page-title → parsed address → matching property key in `properties.json`.

**Detail-page address detection** — the page `<title>` is preferred over the URL slug because slug encoding is ambiguous on digit collisions (e.g. `/krolewskiej-tamy-5-2-...` could be either `5/2` or `53/2`); the title carries the canonical address.

### Roadmap

- Icons (manifest currently has no `icons` entry — Chrome will fall back to a default).
- Optional CI step: validate the extension's address parser against current `data/` as part of `.github/workflows/refresh.yml`.

## Current coverage (data quality notes)

- **162+ unique properties** tracked from 43 historical result PDFs going back to **2024-02-12**.
- **~95–97% of records** in each PDF parse cleanly. The remaining ~3% are real edge cases the parser intentionally drops:
  - Properties identified only by internal building ID (`Kłodnicka (ID budynku nr 2155)`).
  - Garage units with no building number (`Ziębia`, `garażu nr 12 na płd. wsch. od ul. Daszyńskiego 95-97`).
- OCR-introduced quirks that *are* corrected and flagged in `notes`:
  - `1I` → `1` (slash eaten by OCR).
  - `TII` → `III` (T misread for I).
  - `105:400,00` → `105400` (colon mistaken for period in prices).
- Roman-numeral apartment numbers are preserved as-is (`Barlickiego 12/I`), which matches Polish municipal convention.

## Attribution

All scraped data originates from [zgm-gliwice.pl](https://zgm-gliwice.pl/), the public site of Zakład Gospodarki Mieszkaniowej Gliwice. This repository is a read-only mirror with a derived view; canonical sources for any data point are linked from each `listings[].source_pdf` field.
