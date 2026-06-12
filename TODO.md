# TODO

> Open backlog only. Completed work lives in [CHANGELOG.md](./CHANGELOG.md)
> (extension) and git history (pipeline/site). Last sweep: 10 June 2026 —
> the June bug reviews (pipeline ~25 findings, extension E/L series), the
> Zabrze result-stream + edge cases, the Świętochłowice price/date fix, the
> Katowice land-row/kind fixes, the per-city CI matrix, and the site/archive
> fixes are all DONE and removed from this list.

## Pipeline

### CI security scanning — Trivy + SAST (NEW, 10 June 2026)

Add `.github/workflows/security.yml`:

- **CodeQL (javascript)** — free for public repos; covers the project's real
  risk class (crawled municipal content flowing into `innerHTML`/hrefs across
  extension, site and popup — the exact bug family fixed by hand in
  v1.14.3). Run on PR/push + weekly cron.
- **Trivy `fs` mode** — lockfile CVEs (the playwright chain is the only dep)
  + secret scanning over the repo (crawl caches and `data/` get committed —
  cheap insurance against an accidental token).
- While in there: **pin GitHub Actions by commit SHA** in refresh.yml /
  pages.yml / security.yml — the refresh workflow holds `contents: write`.

Scope expectations: no containers, one dependency — this is a ~3-4 min/run
safety net, not a deep audit.

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

### Verify the first per-city matrix CI run

The matrix refresh (setup → per-city jobs → index rebuild) shipped 10 June
2026 but hasn't run on Actions yet. On the first run after push, check: the
rebase-retry pushes don't collide, `build-index.js` produces a complete
`data/index.json`, and the Zabrze result-stream dedupe folds sold rows onto
the archived announcement listings as designed.

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

### Publish v1.16.0 to the Chrome Web Store — PACKAGE READY

The live store build is **v1.3.3** (29 May): 2 cities, the old "Od roku"
filter, none of the v1.14.2–v1.17.0 fixes/features (incl. innerHTML escaping
and the new wadium/auction deadline reminders). Ready to upload:
**`przetargimiejskie-extension-v1.17.0.zip`** (repo root, syntax-verified) +
refreshed copy in [WEB_STORE_LISTING.md](./WEB_STORE_LISTING.md) (9 cities).
Remaining: the developer-dashboard submission itself (account action).

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
- **Genitive street display** — streets captured after "przy ul. …" render in
  the genitive ("Częstochowskiej 4/9", "Kalinowej 51"). Join keys are healed,
  but the display form stays grammatically odd. A nominative display pass
  (reuse SUFFIX_SUBS on the DISPLAY string, conservative allowlist) would fix
  the cosmetics without touching keys.
- **Bytom multi-street property** — "Strażacka 3 i ul. Podgórna" parsed as one
  street. Decide: split into two properties or keep with a sanitized label.
- **Area backfill for concluded listings** — Gliwice 37 and Katowice 40-odd
  properties have no `area_m2` because result PDFs carry no area and
  detail-page enrichment only covers listings active at crawl time. Zabrze
  self-heals on the next refresh (announcement text is cached; the wrapped-m²
  parser fix re-reads it). For Gliwice, consider a one-off crawl of archived
  detail slugs still resolvable on zgm-gliwice.pl.
- **Świętochłowice cellar-area leftovers** — 5 properties still carry a
  cellar-sized area (`hutniczej|9B|9`, `grunwaldzkiej|5|5`, `hutniczej|9B|`,
  `sredniej|12C|4`, `nowej|12|5`): their announcement attachments aren't in the
  local text caches, so the offline re-derivation couldn't verify them. The
  fixed `areaFromText` should heal them on the next CI refresh — verify after
  the run.
