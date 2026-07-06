# przetargimiejskie — complete project overview

> **Purpose of this document.** A single, complete description of the whole
> project — architecture, data model, the all-Poland city-coverage effort, and how
> to extend it — so the work is well documented as coverage grows toward every
> Polish city. Companion to the focused docs: [PLAN.md](./PLAN.md),
> [EXPANSION.md](./EXPANSION.md), [SPIKE-NEIGHBORS.md](./SPIKE-NEIGHBORS.md),
> [spikes/SPIKE-PROGRESS.md](./spikes/SPIKE-PROGRESS.md), [TODO.md](./TODO.md).
>
> *Intended for the LLM Wiki "complete project description" — the wiki MCP was
> unreachable when this was written, so it lives in-repo and can be imported.*

---

## 1. What it is

**przetargimiejskie** ("municipal tenders") aggregates **Polish municipal
property-auction listings** — flats, buildings and land that a gmina/city sells at
public oral auction (*ustny przetarg nieograniczony na sprzedaż*) — scraped from
each city's public BIP (Biuletyn Informacji Publicznej). It surfaces, for each
property: which **auction round** it's on (a 2nd/3rd round signals a property that
keeps failing to sell, with a falling price), the **starting price**, the
**achieved price** when sold, area and **zł/m²**, and the auction date.

The value proposition is the *history and aggregation* of public records:
flippers, small landlords and agents can spot undervalued municipal stock (e.g.
"sold on the IV attempt at −8% vs. starting price"). The raw records are public;
the product owns the aggregation, freshness, alerting and analysis.

**Three surfaces:**

1. **Chrome extension** (`extension/`) — overlays auction history directly on the
   municipal BIP pages the user is already browsing; popup + searchable archive.
2. **Node pipeline** (`pipeline/`) — crawls each city's BIP, parses the documents,
   and emits clean per-city JSON under `data/`.
3. **Static site** `przetargimiejskie.pl` (`site/`) — landing + searchable
   `/archiwum` + market `/raporty` + `/privacy`, built by `build-site.sh` and
   deployed to **OVH** shared hosting.

The data is committed as public JSON in the repo and served from
`raw.githubusercontent.com` (extension) and mirrored to OVH (site).

---

## 2. Architecture

### 2.1 Two independent adapter layers

There are **two** places that "know" about a specific city, and they share only
the JSON schema:

- **Pipeline adapter** — knows a city's *URLs and document formats* (where to
  fetch, how to read PDFs/HTML/DOCX).
- **Extension site adapter** (`extension/sites/<city>.js`) — knows a city's
  *page DOM* (how to find listing cards and inject the overlay). A city can be
  **data-only** (popup + archive + site, no in-page overlay) with no extension
  change; adding an overlay needs a site adapter + new `host_permissions` + a
  Chrome Web Store resubmit.

### 2.2 Pipeline structure (`pipeline/src/`)

```
pipeline/src/
├── core/                      # shared, city-agnostic
│   ├── fetch.js               # polite fetcher (UA, throttle)
│   ├── pdf-text.js            # pdftotext (born-digital PDFs)
│   ├── ocr-pdf.js             # tesseract -l pol (scanned PDFs)
│   ├── doc-text.js            # catdoc / DOCX → text
│   ├── render.js              # headless Chromium (JS-SPA BIPs only, lazy)
│   ├── classify-kind.js       # mieszkalny / zabudowana / uzytkowy / garaz / grunt
│   ├── build-properties.js    # merge listings+results → properties[]
│   ├── build-land.js          # land.json
│   ├── merge-history.js       # retain prior auctions across daily refreshes
│   ├── normalize.js           # address normalization + keys
│   ├── geoportal.js, uldk.js  # precise parcel geoportal deep-links
│   └── hash.js
├── cities/
│   ├── index.js               # the REGISTRY: exports [gliwice, …, legnica]
│   └── <city>/ { config, crawl, parse, index }.js   # one folder per built city
└── refresh.js                 # thin loop over the registry → data/<city>/*.json
```

**The adapter contract** every city implements (see any `cities/<city>/index.js`):

```js
export default {
  ...config,                 // id, label, voivodeship, authority, host, source
  async crawlActive(),       // → { listings, wykaz, land }
  async crawlResultDocs(),   // → result refs (achieved-price stream)
  parse / parseResultDoc,    // document → records (groundtruthed, unit-tested)
};
```

Adding a city = **one new `cities/<city>/` folder + one import + one array entry**
in `cities/index.js`. `refresh.js`, the CI matrix and `data/index.json` all read
from the registry, so they can't drift.

**Three parser families, not one per city** (per EXPANSION §1.4):
`core/pdf-text` + paragraph parser (born-digital PDFs), `core/ocr-pdf` (scanned →
OCR), HTML/table parsers, and `doc-text` for `.doc`/`.docx`. Each city's
`parse.js` is mostly its boilerplate anchors handed to a shared engine.

### 2.3 Data model (`data/`)

```
data/
├── index.json                 # city list + per-city counts + generated_at
└── <city>/
    ├── properties.json        # unique properties w/ listings[] history + outcomes
    ├── active.json            # currently-running auctions/listings
    ├── land.json              # land plots (+ geoportal deep-links)
    └── meta.json              # provenance: generated_at, parser_version, counts
```

Property join key is `city|street_norm|building|apt` (namespaced by city so
`ul. Słowackiego` in two cities can't collide). `meta.json` drives the health
check. Result notices join their announcement by address (+ unit) + round.

### 2.4 Extension (`extension/`)

Manifest V3. `content.js` is a generic renderer driven by a per-site adapter
(`sites/<city>.js`); `background.js` fetches per-city data lazily with a 6h TTL;
`popup.js` + `archive.js` provide the filterable list/archive; `watchlist.js`
fires notifications on new auctions / price drops; full PL/EN i18n. **Versioning
is strict** (see [CLAUDE.md](./CLAUDE.md)): any change under `extension/` bumps
`manifest.json` **and** `popup.html` together + a `CHANGELOG.md` line. Pipeline /
site / docs changes do **not** bump the extension version.

### 2.5 CI/CD (`.github/workflows/`)

- **`refresh.yml`** — daily `0 4 * * *`. `setup` job emits the registry + runs
  parser tests once; a **matrix** runs one `refresh (city)` job per city
  (`fail-fast: false`, `max-parallel: 4`, `timeout-minutes: 25`), each committing
  only its own `data/<city>/`; an `index` job rebuilds `data/index.json`.
- **`health.yml`** — `scripts/health-check.js`: FAILs if a city's `meta.json` is
  missing/stale or `unique_properties === 0` (silent-breakage guard).
- **`ovh-deploy.yml`** — chains off refresh, runs `build-site.sh`, SFTP-mirrors
  `_site/` to OVH (the only deploy; the Pages fallback was removed July 2026).
  Full workflow catalog: `.github/workflows/README.md`.

### 2.6 Site & monetization

`site/` is static (dark "Slate Ledger" theme). Landing shows live stats + cities
**grouped by voivodeship** from `data/index.json`. Monetization direction
(EXPANSION Part 4): keep the extension + raw data **free** (acquisition + it's
un-gateable anyway); sell the **service layer** (cross-city alerts, saved
searches, full history, analytics) at `przetargimiejskie.pl`. Usage metrics:
OVH Web Statistics (server logs, already on) + optionally a cookieless beacon
(GoatCounter / Cloudflare Web Analytics, both free, RODO-safe); extension usage
via the Chrome Web Store dashboard.

---

## 3. The spike methodology (build go/no-go)

Expansion is **spike-gated**: no city adapter is written until a live spike has
located its real sale-auction source and inspected its format. A spike answers
three load-bearing questions, then gives a **BUILD / NO-BUILD** verdict + effort +
closest existing analog:

1. **Does the gmina sell municipal property at auction — especially residential
   flats (lokale mieszkalne)?**
2. **Where is it published?** (host + BIP boards for announcements *and*
   result/achieved-price notices)
3. **In what format?** (server-rendered HTML / born-digital text-PDF / scanned-PDF
   → OCR / JSON API / JS-SPA; plus auth/TLS/bot blocks)

**The load-bearing heuristic:** a dedicated municipal housing manager
(ZGM/ZBM/MZBM/ZGL/TBS) publishing *"przetarg ustny … na sprzedaż lokali
mieszkalnych"* = BUILD candidate. A generic city-BIP property section usually
skews to **land + tenant** sales. **Confirm open flat-auction VOLUME early** — the
single most common NO-BUILD reason nationwide is that municipal flats are sold
*bezprzetargowo* (off-auction, to sitting tenants), so only land/commercial
reaches open auction.

A spike is **knowledge, not code**; it never bumps a version.

---

## 4. All-Poland coverage — the `spikes/` tree

Goal: spike **every city in Poland**, one file per city, grouped by **district
(powiat)**. Convention (see [spikes/README.md](./spikes/README.md)):

```
spikes/<voivodeship>/<powiat>/<city>.md
```

- A **miasto na prawach powiatu** (city-county) is its own powiat → folder is the
  city slug (e.g. `spikes/mazowieckie/warszawa/warszawa.md`).
- A town inside a land powiat → `powiat-<adjective>` (e.g.
  `spikes/malopolskie/powiat-olkuski/olkusz.md`).

**Master list + resume ledger:** [`spikes/master-cities.json`](./spikes/master-cities.json)
(machine-readable; status + spike metadata per city) and
[`spikes/SPIKE-PROGRESS.md`](./spikes/SPIKE-PROGRESS.md) (human ledger by
voivodeship + the resume protocol). One agent is dispatched **per city** to
live-verify and write its spike file.

### 4.1 Tiers & current status

- **Wave A = all 66 *miasta na prawach powiatu* (city-counties)** — the largest
  cities, where essentially all municipal flat-auction volume sits. **100%
  spiked.**
- **Wave B = largest *land-powiat seats*** — rolling.
- **Long tail (~900 smaller towns)** — enumerated per voivodeship in later runs.

The live roll-up (built / BUILD-ready / NO-BUILD / etc.) is always in
[SPIKE-PROGRESS.md](./spikes/SPIKE-PROGRESS.md). Headline pattern: a large share
of cities are NO-BUILD because flats go *bezprzetargowo* to tenants; the BUILD
cities are those with a real recurring *ustny przetarg* flat stream (often a
dedicated housing manager or a city WGN publishing born-digital PDFs/HTML).

### 4.2 Worked build example — Legnica

Legnica (Dolnośląskie) was spiked BUILD and **built end-to-end** as the reference
for the build phase: `pipeline/src/cities/legnica/{config,crawl,parse,index}.js` +
a groundtruthed `pipeline/tests/parse-legnica.test.js` (parser tested against the
real announcement `.docx` and result `.doc` fixtures), registered in
`cities/index.js`. Source profile: BIP-E.PL CMS (same family as Gliwice/Zabrze/
Bytom), board `um.bip.legnica.eu/.../przetargi-na-lokale`, achieved price in a
`.doc` attachment. Crawler validates on the first live CI refresh (project
convention — crawlers can only be confirmed against the live BIP).

---

## 5. How to extend

**Spike a new city:** create `spikes/<woj>/<powiat>/<city>.md` answering the three
questions; record the verdict in `master-cities.json` + `SPIKE-PROGRESS.md`.

**Build a BUILD city:**
1. Read the closest existing analog adapter in `pipeline/src/cities/` and the
   `core/` utilities (reuse, don't reimplement).
2. Fetch real fixtures (an announcement + a result doc) to groundtruth the parser.
3. Write `cities/<city>/{config,crawl,parse,index}.js` + `tests/parse-<city>.test.js`.
4. Register in `cities/index.js` (one import + one array entry).
5. Run only that test (`node --test tests/parse-<city>.test.js`), iterate to green.
6. First live CI refresh validates the crawler; `health.yml` then guards it.

**Closest analogs by source profile:** Gliwice (OCR result-PDFs) · Zabrze
(city-BIP board, attachments) · Bytom (HTML catalog + `.doc`) · Kraków (bespoke
server-rendered HTML, multi-property) · Tarnowskie Góry / Kędzierzyn-Koźle
(Logonet eUrząd JSON API + text PDFs) · Legnica (BIP-E.PL HTML + `.doc` results).

---

## 6. Conventions that matter (from CLAUDE.md)

- **Verify paths before editing; don't guess** the architecture.
- **Testing:** only the specific test file for the task; quiet/failures-only
  output (`--quiet`, `--reporter=dot`, or `| grep -iE "fail|error"`); never dump
  passing tests.
- **Versioning:** bump `extension/manifest.json` + `extension/popup.html` together
  on any `extension/` change, with a `CHANGELOG.md` line. Pipeline/site/doc
  changes don't bump.

---

## 7. Session log — 27 June 2026

- **Site rebrand** to national: removed "Górny Śląsk"/"śląsk" wording across
  `site/` (title, meta, brand, hero, raporty, privacy); landing **cities grouped
  by voivodeship**; reworded the "Runda, nie „nowość"" card → "Która to już
  runda"; removed the "Prywatnie" card.
- **CI fixes** (refresh #88 + health): bounded the **Kędzierzyn-Koźle** crawler
  (year-filter + wall-clock budget + article cap) so it can't blow the 25-min job
  timeout; fixed **Oświęcim** (REKORD relative-href + 1-indexed pagination) and
  **Chrzanów** (two-level stub→BIP harvest) crawlers — both LIVE-VERIFIED root
  causes; added a documented temporary `EXEMPT_NEW` allowlist in `health-check.js`
  for the three first-run adapters.
- **All-Poland spike:** `spikes/` tree + `master-cities.json` + `SPIKE-PROGRESS.md`;
  all **66 city-counties spiked** (Waves 1–4) plus a first batch of land-powiat
  seats (Wave B), one agent per city, live-verified.
- **First build of the wave:** the **Legnica** adapter (built, parser-tested,
  registered).

*Pipeline/site/docs only — no `extension/` change, so no version bump.*
