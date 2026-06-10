# TODO

> Wave-2 work (Katowice SharePoint crawler + yearly-summary parser +
> per-site adapter registry + branding cleanup + year filter) shipped in
> v1.2.0 — see [CHANGELOG.md](./CHANGELOG.md). Items below are the
> remaining backlog.

## Pipeline

### Bug-review findings (June 2026 full-pipeline review)

Full read of `pipeline/src/**` + committed `data/`. Items 1–4 fixed in the
same pass (pipeline-only — no extension version bump needed); the rest are
open. `data/katowice/properties.json` was deleted per the merge escape hatch
so the corrupted rows rebuild on the next refresh.

**Fixed:**

- [x] **1. Katowice neg-PDF rows published as `sold`** — `parseResultRow`
  hardcoded `outcome:'sold'`; negative wykazy ("Przetarg zakończony wynikiem
  negatywnym", e.g. `Wyniki_…neg.pdf`) now yield `outcome:'unsold'`.
  Observed: `staromiejska|15|8` was `sold` with `final_price_pln:null`.
- [x] **2. Dual-stream duplicate listings corrupt outcomes + rounds** —
  Katowice feeds the same auction from the results PDF and the SharePoint
  announcement archive. Same `date|kind` fingerprint → announcement row
  silently replaced the result record (`sklodowskiej curie|21|1` survived
  only as `archived`); different kinds → both rows survived and round
  derivation counted one auction as two attempts (`grzyski|1|7` got a
  fabricated round 2). Fixed with within-run dedupe by date in
  `build-properties.js` (result-backed row wins, missing fields back-filled)
  + date-based listing fingerprint in `merge-history.js`.
- [x] **3. Property key splits on Polish case endings** — results PDF says
  "Staromiejska", announcement "Staromiejskiej" → two properties for one
  flat, history/round linkage lost. Fixed by coalescing street-suffix
  variants (genitive↔nominative) into one property in `build-properties.js`.
- [x] **4. Rybnik + Bytom round detection: `pierwsz` wins over the whole
  document** — second-round announcements always carry the mandatory history
  clause ("Pierwszy przetarg odbył się … wynikiem negatywnym"), so every
  re-listed auction parsed as round 1. Fixed: ordinal must qualify
  "przetarg" and past-tense history clauses are skipped.

**Fixed (second pass):**

- [x] **5. Katowice result-PDF price regex rejects grosze** — the row regex
  now accepts grosze + dotted thousands ("150 000,00 zł", "150.000,00 zł"),
  same amount shape as the yearly-summary regex; the `,`-aware lookbehind
  keeps the ",00 zł" tail from matching alone.
- [x] **6. merge-history freezes removed listings as `active` forever** —
  new `archivePastActive()` runs on the post-merge properties in refresh.js,
  so retained past-dated rows age out to `archived` instead of inflating
  `meta.active_auctions`.
- [x] **7. finn-bip `auctionDateFromText` fallbacks match any date** —
  added a numeric "odbędzie się" anchor; fallbacks now REQUIRE the
  "w dniu" prefix, so page chrome ("Data publikacji: …", town datelines)
  can't leak in as the auction date. No date → null (listing stays
  dateless) rather than a wrong archived-classification.
- [x] **8. `normalize.js TRAIL_NOISE` strips trailing `m. N`** — "m. N" is
  now converted to the standard "/N" apartment form ("Zwycięstwa 34 m. 9" →
  key `zwyciestwa|34|9`); only the "wraz z …" tail is stripped as noise.

**Fixed (third pass — all low items):**

- [x] refresh.js + recount-auctions.js now count Gliwice's `no_winner` in
  `archived_auctions`.
- [x] Gliwice unsold-section regexes accept `ul|al|pl|os` like the sold
  section.
- [x] finn-bip Roman matching is case-sensitive (the conjunction "i" no
  longer reads as round 1; in the body scope the LAST Roman wins, so an
  ALL-CAPS "I ZAPRASZA" can't either), map extended to X, "piątek" excluded.
- [x] finn-bip pattern B: uppercase first-letter street guard re-checked
  after the /i match ("przy czym nabywca…" can't become a street).
- [x] fetch.js no longer sleeps the backoff after the final failed attempt.
- [x] rtf-text.js strips `{\fonttbl …}` groups brace-aware (nested groups,
  no font-name leakage) and decodes `\uN` BEFORE `\'xx`, consuming the
  fallback byte (no doubled characters).
- [x] refresh.js `crawlEmpty` uses the PRE-floor record count.
- [x] Gliwice detail-areas title split keeps hyphenated streets
  (Skłodowskiej-Curie, 9-11) — splits on spaced dashes only.
- [x] Katowice `addressFromTitle` captures street + number and stops —
  trailing title words no longer drop the announcement.
- [x] Katowice SharePoint crawl follows `__next` paging (capped at 10
  pages × 2000 defensively).
- [x] Świętochłowice `isFlatAnnouncement` rejects only LEADING "KW/księg…"
  (the annex), not announcements citing a KW number.
- [x] `todayWarsaw()` (Europe/Warsaw civil date) replaces UTC `TODAY` in
  build-properties and the refresh aging pass.

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

### Bug-review findings (June 2026 extension review)

Full read of `extension/**`, cross-checked against the pipeline data
contract. Fixing any of these touches `extension/` → PATCH bump
(manifest + popup.html + CHANGELOG) per the version rules.

**High (E1–E4) — DONE, shipped v1.14.2.** normalize.js re-synced (m. N → /N
+ rejonMatch); content.js retries the lookup with street-suffix variants;
background.js treats "0 cities fetched" as failure (keeps the old cache);
katowice.js uses the bounded street+number title capture.

**Medium (E5–E9) — DONE, shipped v1.14.3.** archive.js surfaces `no_winner`
(table + outcome filter); archive search Polish-folds the query (both tables);
crawled data is HTML-escaped + URLs http(s)-only in popup/archive/content.js;
watchlist mutations are serialized; the Bytom ancestor walk requires a real
ADRES/TYP match (skips otherwise).

**Low (L1–L8) — DONE, shipped v1.15.0.** popup.js/archive.js use a
`todayWarsaw()` civil date; the popup watching-row "unsold" is i18n'd
(`popup.watching.active_prior`); the archive year dropdown retranslates on
language toggle; the dead historical-sort ternary is removed (new column starts
desc); the Gliwice detail-title split breaks on the space-padded date dash so
hyphenated building ranges survive; manifest now covers `katowice.eu` (Katowice
adapter recognises the SharePoint DispForm detail path) and non-www `bytom.pl`;
content.js registers the watchlist `onChange` once at page level (no listener
leak); Bytom detail-title detection falls through announcement-title → `<h1>` →
`document.title` and uses the first that parses.

Note: the Gliwice **slug** fallback (`addressFromSlug`) still can't tell a
building range (`10-12`) from a building/apt (`10/12`) — the slug is genuinely
ambiguous. It's a last resort only; the authoritative title parse (fixed above)
covers the real case, so this is left as-is.

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
4. **Jaworzno** — ❌ **RE-SPIKED (June 2026) → DROP/DEFER.** The earlier note was
   wrong. MZNK (`bip.mznk.jaworzno.pl`) handles **rentals/commercial** (najem,
   dzierżawa, lokale użytkowe), not flat sales, and its list is **JavaScript-
   rendered** (raw HTML is a ~4 KB shell — the static pipeline can't scrape it).
   Flat *sales* are run by the city on `bip.jaworzno.pl` — the **same JS-rendered
   platform**, and its sales skew to **land/działki** (Tychy/Dąbrowa pattern). The
   only node-scrapeable source, the WordPress `mznk.jaworzno.pl`, has ~1 historical
   flat-sale post (2022) — no recurring stream. Thin volume + un-scrapeable
   authoritative source ⇒ not worth building. Revisit only if the pipeline gains a
   headless-browser fetch or Jaworzno starts a real flat-auction stream.
5. **Częstochowa** — ❌ **RE-SPIKED (June 2026) → DROP (for flats).** Source is
   server-rendered and scrapeable (`bip.czestochowa.pl/artykuly/71547/sprzedaz-
   nieruchomosci-i-lokali`, FINN, `/artykul/71547/<id>/<slug>` articles), so the
   mechanics are fine — but the flat-share check failed hard: across 6 pages / 60
   announcements, **0 lokale mieszkalne, 60 land/działki/garaże**. Częstochowa
   auctions land; flats go bezprzetargowo (Tychy/Dąbrowa/Ruda pattern). Build only
   if it ever starts auctioning flats, or if the product expands to land sales.
   (ZGM TBS = rentals, skip.)
6. **Żory** — ❌ **RE-SPIKED (June 2026) → DROP.** No usable source. The official
   BIP `zbmzory.bip.net.pl` (bip.net.pl platform) is server-rendered at the top
   level but its category/article *listings* load via JavaScript (raw HTML =
   "Wczytywanie…") — the static pipeline can't scrape them; the "Zbywanie
   nieruchomości" branch only holds year-foldered *wykazy* (no clear przetarg
   stream), and 2025 was empty. The WordPress `zbmzory.pl` is **still hijacked** —
   it 301s to `foro-go.com` ("Bison Casino"). So: JS-rendered official source +
   hijacked alt + low volume. Revisit only with a headless-browser fetch in the
   pipeline.
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

### Monetization: alert + saved-search MVP

[EXPANSION.md §4.6](./EXPANSION.md) — the smallest paid-product slice over
the four-city data we already publish: email alerts off a saved
search ("new active listing in district X under N zł / m²"). Needs a tiny
hosted layer (Vercel + Supabase + Resend would do it), independent of the
extension. Not started; decide whether to do this before adding more
cities.
