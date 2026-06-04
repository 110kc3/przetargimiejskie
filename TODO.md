# TODO

> Wave-2 work (Katowice SharePoint crawler + yearly-summary parser +
> per-site adapter registry + branding cleanup + year filter) shipped in
> v1.2.0 — see [CHANGELOG.md](./CHANGELOG.md). Items below are the
> remaining backlog.

## Pipeline

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
- **Wire the result notices as a sold-price stream** — the skipped
  "INFORMACJA O WYNIKU PRZETARGÓW" PDFs are exactly the achieved-price data
  Zabrze otherwise lacks. Parsing them into `crawlResultDocs()` would give
  Zabrze real sold-price history (currently active-only).

### City-namespaced keys in the data files

[EXPANSION.md §1.5](./EXPANSION.md) wants the property key namespaced at the
*pipeline* layer (`city|street|building|apt`) with `schema_version: 2`,
instead of the current `street|building|apt` + late-namespacing inside
`extension/background.js` `mergeCityPayloads()`. Pure tidying — the
extension-side namespacing already handles all four cities cleanly, so this is
optional, not a correctness fix. Touches `core/build-properties.js`,
`refresh.js`, and the extension's `background.js` migration code (which can
then be deleted once everyone's on the new schema).

### Per-city CI matrix in `refresh.yml`

`.github/workflows/refresh.yml` runs a single job that walks all cities
sequentially. Switch to a `strategy.matrix` over the city registry so a
Bytom parser break doesn't block the Gliwice / Katowice refresh. Each job
commits its own `data/<city>/`. Bonus: the per-city run time becomes
visible in the Actions UI.

### Katowice yearly-summary parser — recover 2024 + tighten "unknown" kinds

`parseYearlySummaryPdf` now recovers 477 records across 2011-2026, but two
small gaps remain:

- **2024 is a single record**, because the 2024 yearly-summary PDF is one
  of the 266 dead-link 404s inside `katowice.eu` (the body href points at a
  file that no longer exists). Worth one probe-cycle of likely alternative
  paths (`/SiteAssets/dla-mieszkańca/…/Wykaz nieruchomości sprzedanych w
  roku 2024.pdf`, plus the same in the BIP attachments index) before giving
  up. If the file genuinely isn't published anywhere, only a content-team
  ticket at UM Katowice can fix it.
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

### Popup: city column in the watchlist

`popup.js` renders the watching section, but the address cell mixes
properties from Gliwice and Katowice without a visual city marker. The
archive table already does this via `cityTagHtml(city)` from `archive.js` —
lift that helper into a shared file (or duplicate the markup inline) and
prepend the city chip in `popup.js`'s watching row. Same CSS classes
(`.zgm-city-tag`) already live in `popup.css`.

### Detail-page sidebar: city tag in the panel header

`content.js` `injectPanel` shows `Auction history — Sienkiewicza 3/9` but
doesn't disambiguate which city the address belongs to. Once the
content-script runs on more than one host (Wave 2 shipped it for Katowice),
prefix the panel title with the same `<span class="zgm-city-tag">` the
archive uses. The site adapter already knows its `city`.

### Popup: mirror the min-year filter

`v1.2.0` added the `From year` dropdown to the archive only. The popup
shows `prior` counts in its watching section (`popup.watching.historical_only`
"Not currently active — Nx prior") that don't respect `minHistoryYear`. The
fix is one line in `popup.js`'s prior-count filter to call the same
`window.ZGM_SETTINGS.getMinHistoryYear()` the archive uses, mirrors what
`content.js` already does.

### Background: per-city notification fallback URL

`extension/background.js` line 231:

```js
reg[id] = entry.detail_url || `https://zgm-gliwice.pl/`;
```

The fallback URL when a watchlist entry has no `detail_url` is hardcoded to
the Gliwice site. Switch to a per-city map (`gliwice` → `zgm-gliwice.pl`,
`katowice` → `bip.katowice.eu`) keyed off `entry.city`, with a generic
fallback to the project home page when neither is set. Cosmetic — modern
watchlist entries always carry `detail_url`.

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
- **Remaining unspiked Silesian field:** Bielsko-Biała, Częstochowa, Jaworzno,
  Mysłowice, Siemianowice/Świętochłowice/Piekary, Żory/Wodzisław. **Kraków,
  Warszawa** out-of-region/demand-gated (Warszawa ≈18 district BIPs — last).
  Apply the housing-manager heuristic (ZGM/ZBM/MZBM auctioning flats) when
  choosing the next spike.

### Cities to build next (backlog, prioritised)

Apply the proven heuristic first: a city is a good candidate when a **dedicated
municipal housing manager** (ZGM / ZBM / MZBM / ZGL) publishes
"przetarg ustny … na sprzedaż lokali mieszkalnych" — that's what gives a real
open flat-auction stream (Gliwice, Bytom, Zabrze, Rybnik). Generic city-BIP
"gospodarka nieruchomościami" sections skew to land + tenant bezprzetargowe and
tend to be drops (Tychy, Dąbrowa, Ruda Śląska).

1. **Bielsko-Biała** — ✅ **SPIKED (June 2026) → BUILD.** ZGM Bielsko-Biała is
   rentals/procurement only; flat *sales* run by the city on a server-rendered
   **Giełda Nieruchomości** (`bielsko-biala.pl/gielda-nieruchomosci`, nodes at
   `/nieruchomosc/<slug>`). Cleanest source in the project: labelled HTML
   key-value block gives address, cena, rodzaj (lokal mieszkalny), data
   przetargu, **round explicit in `Forma przetargu`** (Pierwszy/Drugi…), status,
   wadium; area in description prose. No PDF/DOC/RTF/OCR. ~4 live flats now,
   active + archived-mode (no sold-price stream). New `cities/bielsko/`, no new
   extractor. See [SPIKE-WAVE2.md](./SPIKE-WAVE2.md). **Next to build.**
2. **Mysłowice** — ✅ **SPIKED → BUILD.** MZGK; ~7 live `przetarg ustny
   nieograniczony` on lokale mieszkalne on the city FINN-BIP
   (`bip.myslowice.pl/artykul/...`). First user of the `finn-bip` template.
3. **Świętochłowice** — ✅ **SPIKED → BUILD.** MPGL; recurring flat auctions with
   explicit rounds (drugi/trzeci przetarg) on `bip.swietochlowice.pl/bipkod/003/010/003`.
4. **Jaworzno** — ✅ **SPIKED → BUILD (med).** MZNK; flat-sale auctions in
   batches (~8) on `bip.mznk.jaworzno.pl` (news on the WordPress `mznk.jaworzno.pl`).
5. **Częstochowa** — ✅ **SPIKED → VIABLE (med).** City FINN-BIP "Sprzedaż
   nieruchomości i lokali" (`bip.czestochowa.pl/artykuly/71547`); skews land —
   **confirm flat share at build** before committing. (ZGM TBS = rentals, skip.)
6. **Żory** — ✅ **SPIKED → VIABLE (low).** ZBM has a "Sprzedaż mieszkań"
   category + `/przetargi/`; BIP `zbmzory.bip.net.pl`. ⚠️ **`zbmzory.pl` is
   hijacked (casino spam) — use `zbm.zory.pl` only.** Low volume; bip.net.pl
   platform (separate small crawler).
7. **Siemianowice Śląskie, Piekary Śląskie, Wodzisław Śląski** — ✅ **SPIKED →
   DROP.** Siemianowice: mostly land + spółdzielnia. Piekary & Wodzisław:
   **bezprzetargowe** sales to sitting tenants (no open-auction stream — Tychy trap).
8. **Kraków, Warszawa** — out-of-region, demand-gated; Warszawa last (≈18 district
   BIPs). Only if the product expands beyond Śląsk.

Full write-up of the whole field in [SPIKE-WAVE2.md](./SPIKE-WAVE2.md) (Wave 3).
**Architectural note — build a reusable `finn-bip` crawl+parse helper** (FINN
eUrząd: `/bipkod/<code>` indexes, `/artykul/<id>` pages, standard ogłoszenie
vocabulary). It covers Mysłowice + Świętochłowice + Jaworzno + Częstochowa (and
could re-home Katowice) with per-city config instead of four bespoke adapters —
build it once at Mysłowice.

Each: spike → confirm open flat-auction volume EARLY (the lesson from Tychy) →
build only if non-trivial. Reuse the existing extractors (OCR PDF / text PDF /
`.doc` catdoc / RTF pure-JS / JSON API / structured HTML) — most new cities fit one.

### Monetization: alert + saved-search MVP

[EXPANSION.md §4.6](./EXPANSION.md) — the smallest paid-product slice over
the four-city data we already publish: email alerts off a saved
search ("new active listing in district X under N zł / m²"). Needs a tiny
hosted layer (Vercel + Supabase + Resend would do it), independent of the
extension. Not started; decide whether to do this before adding more
cities.
