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

### Wire the remaining sold-price results streams

Zabrze's "INFORMACJA O WYNIKU" stream shipped (10 June 2026) — the same
pattern is still missing elsewhere; each adds achieved prices to a city that
currently shows starting prices only:

- **Sosnowiec** — the BIP has an "informacja o wyniku przetargu" thread in
  the same JSON API the adapter already crawls. Closest to free.
- **Świętochłowice** — result notices exist on the same Liferay board
  (`isFlatAnnouncement` currently drops them); parse instead of skip.
- **Rybnik** — no obvious "wyniki" page found at build time; re-check ZGM's
  BIP before assuming none.
- **Bytom** — the hard one: no results category found on `bytom.pl/bip`
  (announcement history only). Spike a REST/RSS endpoint before concluding
  Bytom never publishes achieved prices.

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
filter, none of the v1.14.2–v1.16.0 bug/security fixes. Ready to upload:
**`przetargimiejskie-extension-v1.16.0.zip`** (repo root, syntax-verified) +
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
