# TODO

> Wave-2 work (Katowice SharePoint crawler + yearly-summary parser +
> per-site adapter registry + branding cleanup + year filter) shipped in
> v1.2.0 — see [CHANGELOG.md](./CHANGELOG.md). Items below are the
> remaining backlog.

## Pipeline

> The June 2026 full-pipeline bug review (3 passes, ~25 findings) is fully
> fixed — see git history / CHANGELOG. Open items below.

### ~~Świętochłowice zeros / missing price+date+area~~ — FIXED (10 June 2026), republish pending

Two stacked causes. (1) The published zeros were a **source-outage run** (the
flaky host 502'd; no prior data existed, so preserve-on-empty had nothing to
keep). A later crawl seeded 164 listings + 106 cached `.doc` texts. (2) Those
listings still had **price=null on every single doc (0/106)** because
`finn-bip.js priceFromText` required the nominative "cena wywoławcza" while
Świętochłowice writes the operative sentence in the **accusative** ("Cenę
wywoławczą … ustala się na kwotę 195 000,00 zł") — and JS `\w` doesn't match
ę/ą. Fixed: the label now accepts declined forms, and `PL_MONTHS` gained
nominative month names ("w dniu 17 styczeń 2024" typo). Verified against all
106 cached docs: **price 106/106 (0 mismatches vs the operative amount), area
106/106, date 106/106**; regression tests added to
`tests/parse-swietochlowice.test.js`. **Run a refresh (CI or local) to
republish data/swietochlowice with the recovered fields.**

### Verify Bytom `.doc` history retention over time

The Bytom `.doc` enrichment (Wave 5) commits converted text to
`pipeline/doc-text-cache/`, and `refresh.js` history-merge is meant to retain
listings the source later drops. Not yet verified across runs: confirm that
when an auction rolls off both the i-BIIP catalog AND the BIP list, its
`properties.json` entry (with the figures recovered from the cached `.doc`)
still survives the merge. First clean run showed `retained 0` (nothing to
retain yet). Re-check after a few refresh cycles once older auctions age out.

### Zabrze active-list edge cases (remaining 0-flat warnings)

After the Wave-5 fixes (route non-PDF attachments → catdoc; skip published
"INFORMACJA O WYNIKU" result notices quietly), a few announcements still warn
`0 flats parsed`:
- **`de Gaulle'a`-type addresses** — the typographic apostrophe in
  "ul. Gen. de Gaulle'a 89/3" isn't in `ADDR_IN_LINE`'s char class, so the
  address (and thus the flat) is dropped. Widen the class to include `'`/`’`.
- **Old concluded announcements** lingering in the JSON document-list (e.g. a
  2022 single cooperative-ownership-right lokal). These pre-date the useful
  window and shouldn't count as *active*; consider dropping announcements whose
  auction date is well in the past.
- ~~Wire the result notices as a sold-price stream~~ — **DONE (10 June 2026).**
  The board crawl is now a single memoised pass; "INFORMACJA O WYNIKU" texts
  feed `crawlResultDocs()` → new `parseResultDoc()` (date + round from the
  preamble, per-bullet address/area/start/achieved/buyer; negative wording →
  `unsold`). Validated 18/18 records against the three cached real notices +
  unit tests in `tests/parse-zabrze.test.js`. Watch the first CI run: the
  within-run dedupe should fold each sold row onto the same flat's archived
  announcement listing.

### City-namespaced keys in the data files

[EXPANSION.md §1.5](./EXPANSION.md) wants the property key namespaced at the
*pipeline* layer (`city|street|building|apt`) with `schema_version: 2`,
instead of the current `street|building|apt` + late-namespacing inside
`extension/background.js` `mergeCityPayloads()`. Pure tidying — the
extension-side namespacing already handles all four cities cleanly, so this is
optional, not a correctness fix. Touches `core/build-properties.js`,
`refresh.js`, and the extension's `background.js` migration code (which can
then be deleted once everyone's on the new schema).

### ~~Per-city CI matrix in `refresh.yml`~~ — DONE (10 June 2026)

`refresh.yml` is now: `setup` (tests once + emits the registry as the matrix)
→ `refresh` (one job per city, `CITY=<id> npm run refresh`, commits only its
own `data/<city>/` + caches with a rebase-retry push) → `index` (rebuilds
`data/index.json` via the new `src/build-index.js` after all city jobs).
`refresh.js` gained the `CITY` env filter (skips index.json when set).
Verify on the next Actions run.

### Katowice yearly-summary — remaining gaps

- **2024 (and 2022) yearly PDFs are confirmed UNPUBLISHED (10 June 2026).**
  Both SharePoint folders were enumerated exhaustively via the Files REST API
  (`/SiteAssets/dla-mieszkańca/…/przetargi-na-nieruchomości-miasta` and
  `/SiteAssets/Lists/Wykazy dotyczce wynikw przetargw…/AllItems`): yearly
  wykazy exist for 2005-2021 and 2023 — no 2024, no 2022, anywhere; the
  site-search API returns 500. Only a content ticket at UM Katowice can fix
  this (kontakt via bip.katowice.eu). 2024/2022 coverage otherwise comes from
  the per-auction result wykazy that do resolve.
- **A few 2012-13 rows still produce `kind: "unknown"`** when the "lokal
  mieszkalny" cell falls outside the midpoint window AND the address has no
  apartment number (a building sold whole, no apt). Low priority — the row
  is still correct on date / address / prices / area.

### Katowice: 29 of 60 SharePoint announcements aren't picked up

`parseAnnouncement` requires an `<street> <building>[/<apt>]` shape in the
title. ~29 of the 60 items on the announcements list are land-plot sales
(`przy ul. Kochłowickiej (dz. nr 207/15, …)`) with no building number; they
genuinely don't fit our `street|building|apt` data model. Two options if we
want to surface them anyway:

1. Treat `dz. nr <parcel>` as a synthetic "apt" so the property key is
   stable across re-listings of the same parcel. Cheapest fix.
2. Introduce a separate `kind: "grunt"` property type with its own key
   (`city|street|parcel`). More principled but invasive.

Not load-bearing for the flat-flipper product the extension is currently
aimed at — these are vacant lots / multi-parcel land sales.

## Extension

> The June 2026 extension bug review is fully fixed (E1–E4 → v1.14.2,
> E5–E9 → v1.14.3, L1–L8 → v1.15.0); see CHANGELOG. Known wontfix: the
> Gliwice slug fallback can't distinguish a building range (`10-12`) from
> building/apt (`10/12`) — the slug is genuinely ambiguous, the title parse
> covers the real case.

### Publish the current build to the Chrome Web Store (NEW, 10 June 2026)

The live store build is **v1.3.3** (29 May) — 12 minor versions behind. Store
users see only Gliwice + Katowice, the old "Od roku" filter, and none of the
v1.14.2–v1.15.0 bug/security fixes (incl. the innerHTML escaping). Package
`extension/` at v1.15.0 and submit; update the store description to list all
9 cities (it still says "Gliwice, Katowice, Bytom").

### ~~Detail-page city tag · popup min-year · notification fallback~~ — DONE, shipped v1.16.0 (10 June 2026)

The injected panel header now opens with a city chip (neutral `.zgm-city-tag`
variant in styles.css); popup prior counts filter sold/unsold history through
`minHistoryYear` (mirrors content.js — archived rows always count); the
notification fallback URL is a per-city map (`CITY_HOME`) with
przetargimiejskie.pl as the final fallback. See CHANGELOG v1.16.0.

## City coverage status

### Spiked cities (built / dropped) + Wave 3 candidates

[EXPANSION.md Part 2](./EXPANSION.md) flagged Chorzów (ZK PGM), Bytom
(Bytomskie Mieszkania), Kraków (ZBK), Warszawa (ZGN per district) as
unspiked. Same discipline as the Katowice spike — find the city BIP's
sales board, answer (a) does this city sell municipal property at auction,
(b) where are results published, (c) in what format.

- **Bytom — spiked + built (v1.4.0); BIP-list rewrite + `.doc` enrichment
  shipped.** Primary crawl is the server-rendered `www.bytom.pl/bip` sales list
  (real `…/idn:N` detail links + round in the description); the i-BIIP catalog
  enriches price/area/date. For past auctions the catalog has dropped, the
  per-property `.doc` announcement is parsed (catdoc) to recover
  price/area/auction-date/round — past-dated ones classify `archived` and
  populate the archive. See [SPIKE-WAVE2.md](./SPIKE-WAVE2.md). Remaining
  follow-up: sold-price *results* (JS-rendered `bytom.pl/bip`) — Bytom still has
  no achieved-price stream.
- **Chorzów — spiked + DROPPED.** Browser spike (May 2026) expanded the BIP
  menus: there is no `lokale mieszkalne na sprzedaż` category, the sale
  categories are empty 2014-era placeholders, flats are rental-only, and the
  only live sale content is occasional land/plot result notices as free-text
  HTML. No flat-sale stream → no adapter. See SPIKE-WAVE2.md. Revisit only if
  the product expands to municipal land sales.
- **Zabrze — spiked + BUILT (v1.6.0); validated on real runs.** `cities/zabrze/`
  crawls the *Lokale mieszkalne* board (round + auction date per announcement)
  and parses each attachment for per-flat rows (~400 flats). Active-listings
  adapter; no sold-price stream yet. Attachment handling resolved: most are text
  PDFs (pdftotext); the occasional legacy `.doc` is routed to catdoc, and
  published "INFORMACJA O WYNIKU" result notices are skipped. Remaining 0-flat
  edge cases tracked under "Zabrze active-list edge cases" above. See
  SPIKE-WAVE2.md.
  - **List source corrected:** the board is a Vue SPA — announcements come from
    the JSON API `/api/v1/document-list/549` (all items, one call), not HTML
    scraping. The `/doc/<id>` pages are server-rendered (carry the attachment
    link). Pagination is moot (single API call).
  - **TLS resolved:** `bip.miastozabrze.pl` ships an incomplete cert chain
    (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`); the adapter now fetches it via a
    node:https path with relaxed chain verification (`insecureTLS`), scoped to
    this host (public, read-only). Secure alternative documented in
    `core/fetch.js` (supply the intermediate via `NODE_EXTRA_CA_CERTS`).
- **Ruda Śląska — spiked (June 2026); BUILDABLE but DEFERRED.** Sales on the
  city BIP `rudaslaska.bip.info.pl` (server-rendered `bip.info.pl`), per-year
  *Zbycie lokali, mieszkań, garaży* category; data lives in per-document PDF
  attachments (mixed scanned→OCR / text→pdftotext), and a sold-price *results*
  stream exists. Downsides: concluded docs are pulled upstream (no back-fill),
  and current open-flat-auction volume is low (the 2026 category is mostly garage
  tenant-sales + land). Reuses the Gliwice OCR + Bytom/Zabrze attachment patterns.
  Revisit when we want a reusable `bip.info.pl`+OCR-attachment adapter template
  (would also unlock other `*.bip.info.pl` cities) or when flat volume rises. See
  [SPIKE-WAVE2.md](./SPIKE-WAVE2.md).
- **Tychy — spiked + DROPPED for the flat product (June 2026).** Mechanics are
  ideal (server-rendered `bip.umtychy.pl`, sales under *Obwieszczenia → Gospodarka
  nieruchomościami* at clean URLs `/obwieszczenia/gospodarka-nieruchomosciami/
  <year>/<month>` → detail → text-PDF `PobierzPlik`). **But the content doesn't
  fit:** across 2024–2026 (36 months, 145 items) there were 12 auctions — all
  land/commercial/lease — and **zero residential-flat auctions**; every flat sale
  is *bezprzetargowe* (tenant, bonifikata). Not built. Revisit if the product
  expands to land/commercial auctions or if Tychy starts auctioning flats.
  Mechanics documented in [SPIKE-WAVE2.md](./SPIKE-WAVE2.md) so no re-spike needed.
- **Dąbrowa Górnicza — spiked + DROPPED for flats (June 2026).** Excellent
  mechanics: dedicated server-rendered *Zbycie nieruchomości* section
  (`bip.dabrowa-gornicza.pl/15665`, paginated; detail `/dokument/<id>` with an
  accessibility **text PDF** attachment) **and a results/sold-price stream**. But
  content is land-only: 48 open auctions scanned = all land/plots, **0 flat
  auctions**; flats go *bezprzetargowo* to tenants. Strong build *if* scope
  expands to land/commercial auctions. See [SPIKE-WAVE2.md](./SPIKE-WAVE2.md).
- **Pattern (Ruda Śląska, Tychy, Dąbrowa Górnicza):** smaller Silesian cities
  sell flats bezprzetargowo to tenants and only auction land/commercial. Built
  cities with real flat-auction streams (Gliwice, Katowice, Bytom, Zabrze) have a
  dedicated housing manager (ZGM/ZBM). **Next-spike heuristic:** target cities
  with such an entity, not generic city-BIP gospodarka-nieruchomościami sections.
- **Sosnowiec — spiked + BUILT (June 2026, v1.10.0).** `cities/sosnowiec/` crawls
  the city BIP JSON API (`/api/menu/6339/articles` current + archived →
  `/api/articles/<id>` content), keeps only open `przetarg ustny … na sprzedaż
  lokalu mieszkalnego` auctions (37 in the archive; land/działki + tenant
  bezprzetargowe sales skipped), and parses address/area/price/date from the
  inline `content` HTML (no PDF/OCR). Active-listings adapter; results stream
  ("informacja o wyniku przetargu") not yet wired. Verified live: price + date +
  address ~10/10, area best-effort. See [SPIKE-WAVE2.md](./SPIKE-WAVE2.md).
- **Rybnik — spiked + BUILT (June 2026, v1.11.0).** `cities/rybnik/` crawls ZGM's
  *Ogłoszenie o przetargach* page + `&Archive=` batches, downloads each RTF
  announcement and decodes it with a new **pure-JS RTF reader**
  (`core/rtf-text.js`, no external tool), then parses price/area/date/round
  (address from the link label). Verified live: 6/6 current flats fully parsed.
  Active-listings adapter; no results stream wired. See [SPIKE-WAVE2.md](./SPIKE-WAVE2.md).
- **Bielsko-Biała — spiked + BUILT (June 2026).** `cities/bielsko/` crawls the
  city Giełda Nieruchomości (structured HTML key-value, round explicit in
  `Forma przetargu`). Active-listings adapter; no sold-price stream.
- **Mysłowice — spiked + BUILT (June 2026).** `cities/myslowice/` — first user
  of the reusable `core/finn-bip.js` helper (FINN eUrząd platform).
- **Świętochłowice — spiked + BUILT (June 2026).** `cities/swietochlowice/` on
  the finn-bip helper — **but the last run published all zeros; see the
  Pipeline section.**
- **The Silesian field is now fully spiked** (see SPIKE-WAVE2.md incl. the
  10 June 2026 re-verification). **Kraków, Warszawa** out-of-region /
  demand-gated (Warszawa ≈18 district BIPs — last). Apply the housing-manager
  heuristic (ZGM/ZBM/MZBM auctioning flats) for any future out-of-region spike.

### Cities — deferred / dropped (none left to build)

All Silesian candidates are spiked; the buildable ones (Bielsko-Biała,
Mysłowice, Świętochłowice) shipped in June 2026. What remains is deferred on
**content volume**, not mechanics — heuristic for revisits: a city is worth
building when a dedicated municipal housing manager (ZGM/ZBM/MZBM/ZGL)
publishes "przetarg ustny … na sprzedaż lokali mieszkalnych"; generic city-BIP
sections skew to land + tenant bezprzetargowe.

1. **Jaworzno** — ❌ **DEFER (re-verified 10 June 2026 — scraping blocker GONE,
   volume still thin).** Correction: `bip.jaworzno.pl` (and `bip.mznk.jaworzno.pl`)
   is the **same JSON-API platform as the built Sosnowiec adapter** —
   `/api/menu/<id>/articles?archived=0|1` + `/api/articles/<id>` work with plain
   fetch; no headless browser needed. A future adapter is a Sosnowiec clone.
   But content stands: "Komunikaty i obwieszczenia" (menu 18057, 61+285 items)
   auctions **land only, 0 flats**; flat sales surface only as council consent
   uchwały (mostly tenant bezprzetargowe, occasional single flat cleared for
   auction). Revisit on volume only. See SPIKE-WAVE2.md re-verification.
2. **Częstochowa** — ❌ **RE-SPIKED (June 2026) → DROP (for flats).** Source is
   server-rendered and scrapeable (`bip.czestochowa.pl/artykuly/71547/sprzedaz-
   nieruchomosci-i-lokali`, FINN, `/artykul/71547/<id>/<slug>` articles), so the
   mechanics are fine — but the flat-share check failed hard: across 6 pages / 60
   announcements, **0 lokale mieszkalne, 60 land/działki/garaże**. Częstochowa
   auctions land; flats go bezprzetargowo (Tychy/Dąbrowa/Ruda pattern). Build only
   if it ever starts auctioning flats, or if the product expands to land sales.
   (ZGM TBS = rentals, skip.)
3. **Żory** — ❌ **DEFER (re-verified 10 June 2026 — now plain-fetch scrapeable,
   content still thin).** Correction: `zbmzory.bip.net.pl` now **server-renders**
   its category listings and article pages — plain fetch reads them (the
   "Wczytywanie…" is breadcrumb chrome; JSON API `zbmzory-api.bip.net.pl` exists
   but isn't needed). ROK 2025 is no longer empty: **5 wykazy**, all flat-keyed
   addresses (Sikorskiego 9M/30 & 9M/12, Strażacka 24B/22, AWP 21/5, Boczna
   11C/2), each a thin page + one ~47 KB PDF (`/api/attachments/<id>`). Still no
   przetarg/round/results stream, no ROK 2026, ~5 items/yr ⇒ defer on volume.
   `zbmzory.pl` **still 301s to the casino site** — keep blacklisted. See
   SPIKE-WAVE2.md re-verification.
4. **Siemianowice Śląskie, Piekary Śląskie, Wodzisław Śląski** — ✅ **SPIKED →
   DROP (re-verified 10 June 2026, all stand).** Siemianowice: auctions moved to
   a FINN eUrząd JS register (`eurzad.finn.pl/msiemianowicesl…/P-NIER`); 2026 has
   exactly **one** flat auction (Szeflera 12/8, I→II przetarg) among rentals/land.
   Piekary (BIP now on the Nefeni bip.net.pl platform): Feb 2026 zarządzenia still
   designate flats for **tenant** sale; live przetargi are land. Wodzisław:
   **bezprzetargowe** tenant program unchanged.
5. **Kraków, Warszawa** — out-of-region, demand-gated; Warszawa last (≈18 district
   BIPs). Only if the product expands beyond Śląsk.

Full write-up of the whole field in [SPIKE-WAVE2.md](./SPIKE-WAVE2.md) (Wave 3
+ the 10 June 2026 re-verification). The reusable `core/finn-bip.js` helper is
built (Mysłowice + Świętochłowice use it; a possible follow-up is re-homing
Katowice onto it). For any future city: spike → confirm open flat-auction
volume EARLY → reuse the existing extractors (OCR PDF / text PDF / `.doc`
catdoc / RTF pure-JS / JSON API / structured HTML).

**Headless-fetch capability (June 2026).** `core/render.js` now exists — an
opt-in Playwright/Chromium renderer for genuinely JS-rendered BIPs (lazy-loaded,
so the 9 server-rendered cities never touch it; CI installs Chromium). This is
the unblock mechanism the Jaworzno/Żory entries above asked for. Two caveats
before reaching for it: (1) prefer the **JSON API** — the `bip.net.pl` platform
(Żory) and the Jaworzno platform fetch their lists from `/api/page-content/…`
and `/api/menus/<id>`; hitting that with plain `getText` needs no browser and
fits the lean design, so render.js is the last resort. (2) The render/API unlock
is *mechanical* — Jaworzno (rentals + land), Częstochowa (land-only) and Żory
(a few wykazy/year) still have **thin flat content** behind the JS, so the
capability mainly pays off when a *richer* JS-rendered source appears.

**Re-verification (10 June 2026).** All not-built cities re-checked live — no
verdict flips to BUILD, but two drop rationales were obsolete: Jaworzno is the
same JSON-API platform as Sosnowiec (plain-fetch scrapeable, no render.js
needed) and Żory's bip.net.pl now server-renders its listings (ROK 2025 has 5
flat wykazy). Both remain deferred on flat volume alone. Ruda Śląska, Tychy,
Częstochowa, Dąbrowa, Chorzów, Siemianowice (1 flat auction/yr, eUrząd JS
register), Piekary, Wodzisław: unchanged. Full notes in SPIKE-WAVE2.md
"Re-verification" section.

### Monetization: alert + saved-search MVP

[EXPANSION.md §4.6](./EXPANSION.md) — the smallest paid-product slice over
the four-city data we already publish: email alerts off a saved
search ("new active listing in district X under N zł / m²"). Needs a tiny
hosted layer (Vercel + Supabase + Resend would do it), independent of the
extension. Not started; decide whether to do this before adding more
cities.
