# TODO

> Open backlog only. Completed work lives in [CHANGELOG.md](./CHANGELOG.md)
> (extension) and git history (pipeline/site). 13 June 2026 audit: extension
> bug fixes shipped as v1.20.1 (Warsaw-time wadium flag, i18n default
> fallback, escaping hardening, archive/popup prior-count parity); new items
> below (6-city adapter gap, store-zip rebuild). Last big sweep: 10 June 2026 —
> the June bug reviews (pipeline ~25 findings, extension E/L series), the
> Zabrze result-stream + edge cases, the Świętochłowice price/date fix, the
> Katowice land-row/kind fixes, the per-city CI matrix, and the site/archive
> fixes are all DONE and removed from this list.

## Pipeline

### ~~CI security scanning — Trivy + SAST~~ — DONE (13 June 2026)

`.github/workflows/security.yml` added: CodeQL (javascript, PR/push + Monday
cron) and Trivy `fs` (vuln + secret scanners, SARIF → Security tab,
non-blocking). All third-party actions across security.yml, refresh.yml,
pages.yml and ovh-deploy.yml are now pinned to a full commit SHA with the
human tag in a trailing comment (checkout v4.3.1, setup-node v4.4.0,
upload-pages-artifact v3.0.1, deploy-pages v4.0.5, codeql-action v3.36.2,
trivy-action 0.35.0).

NOTE: SARIF upload to the Security tab requires code scanning to be enabled
on the repo (free for public repos). If the first run errors on upload,
enable it under Settings → Security → Code scanning.

### ~~Wire the remaining sold-price results streams~~ — DONE where streams exist (10 June 2026)

- **Sosnowiec — WIRED.** Dedicated "Wyniki przetargów" board found (menu
  **7043**, sibling of Przetargi; 182 archived notices, mostly land —
  `isFlatResult` keeps the flat sales). `crawlResultDocs` walks it via the
  same JSON API; `parseResultDoc` reads the past-tense body ("że w dniu
  23.01.2026 r. … odbył się"), cena wywoławcza, "osiągnięto najwyższą cenę"
  and the buyer. Validated against the real Zwycięstwa 25/15 article
  (77 000 → 92 000 zł, 17,85 m²); `areaFromText` also gained the abbreviated
  "pow. użytkowej" label. Tests in `tests/parse-sosnowiec.test.js`.
- **Świętochłowice — WIRED (validate on first CI run).** The board's
  "Informacja o wyniku z III przetargu … przy ul. Polaka 7/6" PDFs (~45 KB)
  now feed `crawlResultDocs` from the SAME memoised page walk as the
  announcements; the title alone yields the address key + round, the body
  (pdftotext, catdoc fallback) the date + prices. Body parsing is
  best-effort (no extractable sample at build time — Zabrze precedent): a
  record is emitted only when the outcome is determinable, otherwise the
  refresh WARN flags it for tuning. Tests in
  `tests/parse-swietochlowice.test.js`.
- **Rybnik — confirmed NONE.** The ZGM BIP menu has no results category
  ("Wyniki postępowań" = procurement only); the flat-sale section carries
  zasady/wykazy/ogłoszenia only. Announcement-history model stands.
- **Bytom — confirmed NONE (re-spiked).** No results category under "Zbycie
  nieruchomości" (six announcement categories only) and zero "wynik"
  content on the Tablica ogłoszeń. Bytom does not publish achieved prices;
  announcement-round history remains the signal.

Remaining without an achieved-price stream by SOURCE limitation: Bytom,
Rybnik, Bielsko-Biała (giełda drops sold items), Mysłowice (none observed —
worth a look if one appears on the FINN board).

### Verify Bytom `.doc` history retention over time

Time-gated: `retained_properties` is still 0 after the 10 June run (nothing
has rolled off the source yet). Confirm, once older auctions age out of both
the i-BIIP catalog and the BIP list, that their `properties.json` entries
(figures recovered from the cached `.doc`) survive the merge.

### ~~Verify the first per-city matrix CI run~~ — DONE (13 June 2026)

Verified against the 12 June run: per-city `data: refresh <city>` commits
landed without rebase-retry collisions and `data: rebuild index` produced a
complete 9-city `data/index.json` (shape matches what site/index.html and
archiwum consume).

### Katowice — externally blocked / product-gated

- **2024 + 2022 yearly-summary PDFs are confirmed unpublished** (both
  SharePoint folders enumerated exhaustively, 10 June 2026). Needs a content
  ticket at UM Katowice; nothing to code. Per-auction result wykazy cover
  those years partially.
- **Land-plot sales (~29 of 60 announcements) are skipped by design** — they
  don't fit `street|building|apt`. If the product ever surfaces land:
  synthetic `dz. nr <parcel>` keys (cheap) vs a `kind: "grunt"` type
  (principled). Decision needed first.

### City-namespaced keys in the data files (optional)

[EXPANSION.md §1.5](./EXPANSION.md): namespace property keys at the pipeline
layer (`city|street|building|apt`, `schema_version: 2`) instead of inside
`extension/background.js mergeCityPayloads()`. Pure tidying — the
extension-side namespacing works for all nine cities; do it only as part of a
schema bump that's needed anyway.

### Chore: stop committing `_site/`

`_site/` is a build artifact (`build-site.sh` regenerates it; the deploy
builds from `site/`), and the committed copy goes stale and confuses
debugging (it shadowed the real cause during the 10 June "site looks broken"
incident). Add it to `.gitignore` and remove from the index.

## Extension

### Publish to the Chrome Web Store — SUBMIT (account action, 13 June 2026)

The live store build is **v1.3.3** (29 May): 2 cities, the old "Od roku"
filter, none of the v1.14.2+ fixes/features. The current upload bundle
**`przetargimiejskie-extension-v1.22.0.zip`** is rebuilt at the repo root from
`extension/` (manifest.json verified at the root of the zip) and is gitignored.
Listing copy is ready in [WEB_STORE_LISTING.md](./WEB_STORE_LISTING.md).
**Only remaining step is the developer-dashboard upload + submission itself —
an account action I can't perform.** Note the v1.21.0/v1.22.0 host additions
mean the store review will flag new host permissions (expected).

### ~~Content-script adapters for the newer cities~~ — 7/9 DONE (13 June 2026)

Shipped on-page overlays for four more cities (v1.21.0 + v1.22.0):
**Rybnik** (`sites/rybnik.js`, OGŁOSZENIE link label), **Mysłowice** +
**Świętochłowice** (`sites/myslowice.js` / `swietochlowice.js` + shared
`sites/finn-common.js`, FINN/Liferay title), **Bielsko-Biała**
(`sites/bielsko.js`, giełda node "Adres:" field, detail pages only). Keys
verified against the published data.

Still popup/archive-only, deferred by platform (not worth the risk with a
single document_idle content script):
- **Zabrze** — Vue SPA list; each flat's address lives inside a downloaded
  announcement attachment, not the page DOM. No reliable DOM key.
- **Sosnowiec** — React SPA backed by a JSON API; content.js runs once at
  document_idle (before hydration) and doesn't re-fire on SPA route changes.

Revisit only if either site gains a server-rendered surface, or if the content
script is reworked to observe SPA navigations + late hydration.

### Manifest host-list alignment (cosmetic)

`content_scripts.matches` includes `https://katowice.eu/*` and
`https://bytom.pl/*` (no-www) absent from `host_permissions`. No functional
impact (the SW only fetches raw.githubusercontent.com; content scripts inject
off `matches` alone). The v1.21/v1.22 city hosts were likewise added to
`matches` only — content scripts don't need `host_permissions`. Align the two
lists only if a future change needs page-host fetch permissions.

## City coverage (reference)

Nine cities built and published: Gliwice, Katowice, Bytom, Zabrze, Sosnowiec,
Rybnik, Bielsko-Biała, Mysłowice, Świętochłowice. The Silesian field is fully
spiked — everything not built is deferred on **flat-auction volume**, not
mechanics. Full status, drop rationales and the 10 June 2026 re-verification
live in [SPIKE-WAVE2.md](./SPIKE-WAVE2.md); per-adapter notes in each
`pipeline/src/cities/<id>/config.js`.

- **Deferred (revisit on volume):** Jaworzno (Sosnowiec-platform JSON API,
  scrapeable; flats only as council consents), Żory (plain-fetch scrapeable;
  ~5 wykazy/yr, no przetarg stream — `zbmzory.pl` is still domain-hijacked,
  keep blacklisted), Ruda Śląska (bip.info.pl + OCR template candidate; ~0
  open flat auctions now).
- **Dropped (no open flat-auction stream):** Chorzów, Tychy, Dąbrowa
  Górnicza, Częstochowa, Siemianowice, Piekary, Wodzisław — flats go
  bezprzetargowo to tenants; auctions are land/commercial. Several have
  ideal mechanics if the product ever expands to land sales.
- **Out of region / demand-gated:** Kraków, Warszawa (≈18 district BIPs —
  last).
- **Heuristic for any future spike:** a dedicated municipal housing manager
  (ZGM/ZBM/MZBM/ZGL) publishing "przetarg ustny … na sprzedaż lokali
  mieszkalnych" = build candidate; generic city-BIP property sections skew
  to land + tenant sales. Confirm open flat-auction volume EARLY.

## Monetization: alert + saved-search MVP

[EXPANSION.md §4.6](./EXPANSION.md) — the smallest paid slice over the
published data: email alerts off a saved search ("new active listing in
district X under N zł/m²"). Needs a tiny hosted layer (Vercel + Supabase +
Resend), independent of the extension. Not started; decide whether to do
this before adding more cities.

## Leftovers from the 12 June 2026 bug sweep (missing m² / weird streets)

- **Katowice `oddzialow mlodziezy i ustny|86|`** — junk key from the (now
  fixed) yearly-summary column bleed. Holds a REAL sale (2025-02-24,
  450 000 → 517 500 zł) whose true building/apt the bleed destroyed, and no
  surviving property matches it by date+price, so `heal-properties.js`
  deliberately refuses to fold it. Resolve manually against the source PDF
  ("Przetargi 2025 na BIP.pdf") and either re-key or fold it.
- ~~Genitive street display~~ — DONE for unambiguous endings (-owej/-nej/
  -czej/-niej via `nominativeStreetDisplay`) and for -skiej/-ckiej/-dzkiej
  with a nominative twin anywhere in the dataset (cross-city evidence in
  heal-properties). Remaining genitives ("Częstochowskiej", "Jagiellońskiej",
  "Grunwaldzkiej") are morphologically ambiguous with patron surnames — flip
  only if a curated allowlist of place-adjectives is ever added.
- ~~Bytom multi-street property~~ — DONE: joint-lot titles ("ul. Strażacka 3
  i ul. Podgórna 6/1") key on the first address (crawl.js `primaryAddress`);
  the published record was re-keyed to `strazacka|3|` with the 1 749 m² total
  moved to `land_area_m2`.
- **Area backfill for concluded listings** — Gliwice 37 and Katowice 40-odd
  properties have no `area_m2` because result PDFs carry no area and
  detail-page enrichment only covers listings active at crawl time. Zabrze
  self-heals on the next refresh (announcement text is cached; the wrapped-m²
  parser fix re-reads it). For Gliwice, consider a one-off crawl of archived
  detail slugs still resolvable on zgm-gliwice.pl.
- ~~Świętochłowice cellar-area leftovers~~ — DONE (12 June, evening): the CI
  refresh with the fixed `areaFromText` healed all five (verified 37–50 m²).
- **CI data sanity gate added** (12 June): `pipeline/scripts/sanity-check.js`
  runs per city in refresh.yml between refresh and commit — glued prices,
  cellar/plot areas, junk streets, zombie duplicates. Known exception:
  `katowice|oddzialow mlodziezy i ustny|86|` is allowlisted until the manual
  re-key (entry above). Keep the allowlist tied to TODO entries.
