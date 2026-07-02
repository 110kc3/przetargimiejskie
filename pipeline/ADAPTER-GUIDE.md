# Building a city adapter — how to extract the data (the whole flow)

> **Read this before spiking or building any city.** It describes the end-to-end
> flow, the status files that say what's already done, the CMS families + which
> existing adapter to clone, the shared utilities, and the field-extraction
> patterns. Companion: [PROJECT-OVERVIEW.md](../PROJECT-OVERVIEW.md) (architecture),
> [spikes/README.md](../spikes/README.md) (spike convention).

---

## 0. FIRST — check what's already done (never redo a city)

A dispatched agent MUST read these before touching a city:

- **`spikes/backlog.json`** — the full queue of all 380 powiat seats, each marked
  `status: "done" | "pending"` with its voivodeship/powiat/`spike_path`. Pick
  `pending` cities from here. (Human view: `spikes/BACKLOG.md`.)
- **`spikes/master-cities.json`** — the authoritative **per-city status** of every
  city already spiked. If a city is in here, its `status` field is the truth:

  | status | meaning | do NOT |
  |---|---|---|
  | `pending` | not yet spiked | — |
  | `build` | spiked, source profiled, ready to build | re-spike |
  | `built` | adapter shipped + registered + tested | re-spike or re-build |
  | `no-build` | spiked, no usable flat-auction stream | re-spike or build |
  | `verify` | spiked, needs a live re-check before building | build blindly |
  | `dropped` / `deferred` | prior Śląsk decisions | re-spike |

- **`spikes/SPIKE-PROGRESS.md`** — human-readable roll-up + the BUILD-ready queue.

**Rule:** if a city is `built`/`no-build`/`dropped`/`deferred`, leave it alone. If
`build`, build it. If `pending`, spike it first.

---

## 1. The whole flow

```
pick pending city (backlog.json)
        │
        ▼
   SPIKE  ──►  write spikes/<woj>/<powiat>/<city>.md   (3 questions + verdict)
        │      set status in master-cities.json
        ▼
   verdict == BUILD?  ── no ──►  mark no-build / verify, done
        │ yes
        ▼
   BUILD  ──►  clone closest analog → fetch real fixtures →
        │      write cities/<city>/{config,crawl,parse,index}.js
        │      + tests/parse-<city>.test.js (groundtruthed)
        ▼
   VERIFY (fresh shell): test green + no null bytes + node --check
        │
        ▼
   REGISTER  ──►  one import + one array entry in cities/index.js
        │         mark status: built in master-cities.json
        ▼
   COMMIT  ──►  adapter + test + index.js + the populated pipeline/*-cache/
        │
        ▼
   CI (refresh.yml) crawls live, sanity-check + health-check guard it.
```

A spike is **knowledge** (an .md). A build is **code** (the adapter). Never build
a city that hasn't been spiked BUILD.

---

## 2. The adapter contract (`cities/<city>/index.js`)

```js
export default {
  ...config,                 // id, label, voivodeship, authority, host, source
  async crawlActive(),       // → { listings, wykaz, land }   (current auctions/designations)
  async crawlResultDocs(),   // → result refs (the achieved-price stream)
  parseResultDoc,            // (text/ref) → result records
};
```

`config`: `id` (slug), `label`, `voivodeship` (slug e.g. `malopolskie`),
`authority`, `host`, `source` (`'html'` if the adapter extracts attachments
itself; `'pdf'` only for the legacy OCR-dispatch path). Add `teryt` with a
"confirm on first geoportal run" comment. **If the adapter uses `core/render.js`
(JS-SPA source), set `needsRender: true`** — the CI matrix installs Playwright
Chromium only for flagged cities (see `refresh.yml`/`backfill.yml` setup
outputs); forgetting the flag fails the city's refresh job on a missing browser.

`refresh.js` loops the registry: `crawl → (OCR/extract) → parse →
build-properties → merge-history → write data/<city>/*.json`.

---

## 3. Pick your CMS family → clone the analog (the fast path)

Most Polish BIPs run one of a handful of CMS platforms. Identify the host's
platform, then **clone the closest existing adapter** instead of starting cold.

| CMS / platform | host shape | analog adapters | how data comes |
|---|---|---|---|
| **Logonet eUrząd** | `/artykul/<board>/<id>`, `/api/menu/<id>/articles` | `tarnowskie-gory`, `kedzierzyn-kozle`, `skarzysko-kamienna` | born-digital text PDFs (some scanned); result notices inline |
| **IDcom** | `bip.<city>…/wiadomosci/<cat>/<id>` | `tczew`, `gniezno`, `gizycko` | HTML + text/scanned PDF attachments |
| **SmartSite** | `bipum.<city>…` / `bip.um.<city>…` | `kielce`, `augustow` | HTML; results in DOCX or PDF |
| **BIP-E.PL** | `um.bip.<city>…` boards | `legnica`, `gliwice`, `zabrze`, `bytom` | HTML boards + `.doc`/`.docx` results |
| **REKORD SI** | `bip.<city>…` / `…rekord.com.pl` | `oswiecim`, `bielsko` | `/<board>/dokument/<id>`, `/api/download/file?id=` (**relative hrefs!**) |
| **WordPress / custom HTML** | `<city>.pl/…`, `bip.<city>.pl` | `brzeg`, `nowa-sol`, `bochnia`, `olkusz`, `trzebinia` | HTML tables/articles, PDF attachments |
| **Bespoke server-rendered** | varies | `krakow`, `lodz`, `slupsk` | in-band HTML + born-digital PDFs |
| **JS SPA** (no server HTML) | `bip.malopolska.pl/...`, Liferay, Next.js | `chrzanow` (render.js); `warszawa` (ETO aggregator) | needs `core/render.js` (Playwright) |

Tip: view-source the BIP. Logonet shows "Wersja systemu" in the footer; IDcom/
SmartSite/REKORD have telltale URL shapes; a body that's empty without JS = SPA.

---

## 4. Core utilities — REUSE, never reimplement (`pipeline/src/core/`)

| util | call | use for |
|---|---|---|
| `fetch.js` | `getText(url, {userAgent})`, `getBytes(url)` | polite HTTP. Pass a **browser UA** for hosts that gate the bot UA (e.g. bytom.pl, wejherowo) |
| `pdf-text.js` | `pdfText(url)` | **born-digital** PDFs (pdftotext). Content-addressed cache. |
| `ocr-pdf.js` | `ocrPdf(url)` | **scanned** PDFs (tesseract -l pol). Use when `pdfText` returns empty/garbage. Cache. |
| `doc-text.js` | `docText(url)` | `.doc` (catdoc) / `.docx` (unzip). Cache. |
| `render.js` | `renderHtml(url)` | JS-SPA pages only (headless Chromium, lazy-loaded). |
| `classify-kind.js` | `classifyKind(text)` | → `mieszkalny` / `zabudowana` / `uzytkowy` / `garaz` / `grunt` |
| `normalize.js` | `parseAddress('ul. Street 12/3')` | → `{street, street_norm, building, apt, key}`. **Never store a raw title as the address.** Note: `-skiej/-ckiej` genitive street names are kept as-is (surname ambiguity — see the file). |
| `build-properties.js` | — | merges listings + results into `properties[]` |
| `known-urls.js` | `loadKnownSourceUrls(city)` | incremental crawl: **skip result pages already in committed data**. Safe for concluded results only — never skip active listings. |
| `merge-history.js` | — | accumulates history across runs; drops null-twin duplicates |

**Do NOT modify any `core/` file** when building a city — they're shared.

---

## 5. How to actually extract the fields

1. **Discover.** Fetch the board/listing page(s). Paginate, but **bound it** (page
   cap + wall-clock budget) for big archives so the 25-min CI job can't time out —
   see `kedzierzyn-kozle` / `bialystok`. Harvest detail URLs; skip rentals
   (`dzierżawa`/`najem`) and pre-announcement `wykaz` where appropriate.
2. **Get the text per detail.** Fetch the detail HTML, find the document link, then:
   - born-digital PDF → `pdfText` · scanned PDF (pdftotext empty) → `ocrPdf` ·
     `.doc`/`.docx` → `docText` · plain HTML body → parse it directly.
3. **Route announcement vs result:**
   - **Announcement** — `ustny przetarg … na sprzedaż lokalu mieszkalnego`, a
     future date, `cena wywoławcza`. → `crawlActive` listings.
   - **Result** — `informacja o wyniku przetargu`, `cena osiągnięta` + `nabywca`
     (sold) or `wynikiem negatywnym` / `nie odnotowano wpłaty wadium` (unsold). →
     `crawlResultDocs`.
4. **Parse the fields:** `address` (parseAddress), `area_m2` (`powierzchnia
   użytkowa X,XX m²`), `starting_price_pln` (`cena wywoławcza`, spaced thousands),
   `final_price_pln` (`cena osiągnięta`), `auction_date`, `round` (I/II/III ustny
   przetarg — ≥II signals a property that keeps failing to sell).
5. **Edge cases:** a single notice can list **several flats** (one record each);
   **wykaz** entries are pre-auction designations (no date/price yet — keep the
   clean address, don't treat as a scheduled auction); **shares** (`udział`) can
   produce odd zł/m² (sanity-check may flag — that's expected).

---

## 6. Verify-before-register (mandatory — the mount truncates writes)

The dev sandbox's mount **intermittently truncates or null-pads large writes**.
So after writing an adapter, in a FRESH shell:

```
cd pipeline
node --test tests/parse-<city>.test.js 2>&1 | grep -iE "fail|not ok|# pass|# fail"
grep -qP '\x00' src/cities/<city>/*.js && echo "NULL BYTES — re-write" || echo "clean"
for f in config crawl parse index; do node --check src/cities/<city>/$f.js; done
```

Only register a city after this passes. If a file shows null bytes or a syntax
truncation, re-write it (prefer the file Write tool). Two earlier builds
(Bydgoszcz, Gorzów) shipped corrupted because this step was skipped — don't.

---

## 7. Register + conventions

- **Register:** one `import <name> from './<city>/index.js';` + one array entry in
  `pipeline/src/cities/index.js`. Then set `status: built` in `master-cities.json`.
- **Commit the caches.** `data/<city>/` **and** the populated `pipeline/*-cache/`
  (pdf-text/doc-text/ocr/detail). They're content-addressed → committing means CI
  never re-extracts. This is the "skip what's already in the repo" mechanism.
- **Test-tier:** non-Śląskie cities are **test-tier** — visible only at
  `/archiwum-all`, and `sanity-check.js` treats their errors as non-blocking WARNs
  while parsers settle. Only the 12 Śląskie cities are public + block CI.
- **No version bump** for pipeline/site/doc changes — only `extension/` changes
  bump `manifest.json` + `popup.html` (per [CLAUDE.md](../CLAUDE.md)).
- **CI commit-push** is conflict-immune (`-X theirs` + `git rebase --abort`); the
  first live `refresh.yml` run validates the crawler, `health.yml` guards it after.

---

## 8. When dispatching a build/spike agent

Point every agent at this flow so it can't redo work or reinvent extraction:

> Read `spikes/backlog.json` + `spikes/master-cities.json` (skip any city not
> `pending`/`build`), then `pipeline/ADAPTER-GUIDE.md` (CMS family → analog →
> core utils → extraction → verify-before-register). Clone the closest analog;
> reuse `core/`; groundtruth the parser on real fixtures; verify in a fresh shell
> before reporting.
