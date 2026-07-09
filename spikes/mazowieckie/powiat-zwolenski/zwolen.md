# Spike — Zwoleń (Mazowieckie · powiat zwoleński)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (land-only, no flat-auction stream; live source is a JS-rendered gov.pl register).

## TL;DR
Gmina Zwoleń (miejsko-wiejska, ~8k in-town, ~14k gmina) is a small powiat seat. The Burmistrz **does** run `przetarg ustny nieograniczony na sprzedaż nieruchomości`, but every sale notice found is **land** — building plots for `budownictwo jednorodzinne` and rural parcels (e.g. Wólka Szelężna dz. 91, 0.50 ha, cena wyw. 25 000 zł, 11.04.2025). No `lokal mieszkalny` (flat) auction was found, and there is **no dedicated municipal housing manager** (no ZGK/ZGKiM/ZGM/TBS for Zwoleń) — property is handled directly by the Urząd Miejski's *Referat Gospodarki Nieruchomościami*. Flat disposals in a town this size are tenant sales *bezprzetargowo*, not open auctions. On top of the scope miss, the **live BIP has migrated** from the archival finn.pl/e-urząd `bip.zwolen.pl` (frozen at 2023) to the **gov.pl "Samorząd" platform** (`samorzad.gov.pl/web/gmina-zwolen`), whose notice lists render as a **JS-populated register** (empty `{"register":{"columns":[]}}` in static HTML) — a render/API source, not clean server HTML. No usable open-flat-auction stream → NO-BUILD.

## 1. Sells municipal property at auction?
**YES for LAND, NO evidence of FLATS.** The Burmistrz Zwolenia issues `przetarg ustny nieograniczony na sprzedaż nieruchomości` under the 1997 ustawa o gospodarce nieruchomościami. Confirmed auctions are land-only:
- **Wólka Szelężna, dz. nr 91, 0,5000 ha** — I przetarg ustny nieograniczony, cena wywoławcza 25 000 zł, 11.04.2025, 10:00 (Urząd Miejski w Zwoleniu). [gov.pl notice](https://samorzad.gov.pl/web/gmina-zwolen/ogloszenie-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-polozonej-w-obrebie-geodezyjnym-wolka-szelezna)
- Recurring "siódmy przetarg … na sprzedaż nieruchomości … pod budownictwo jednorodzinne" — municipal **building plots** cycling through repeat rounds.
- Older `bip.zwolen.pl` notices in scope were **najem/dzierżawa** of `lokal użytkowy` (e.g. Jagiełły 8 / Kościuszki 2, 57.98 m², 30 zł/m² netto, 2017) — rentals of commercial premises, not flat sales.

No `przetarg … na sprzedaż lokalu mieszkalnego` surfaced across the current gov.pl BIP, the archival BIP, or web search. "Sprzedaż mienia" on the BIP is **movable property** (fire truck, service cars, scaffolding) — 0 flats. No dedicated housing manager exists to feed a flat-auction pipeline.

## 2. Where published? (hosts + boards, URLs)
**Current (live) — gov.pl "Samorząd" platform:** `https://samorzad.gov.pl/web/gmina-zwolen`
- Gospodarka nieruchomościami (property mgmt): `https://samorzad.gov.pl/web/gmina-zwolen/gospodarka-nieruchomosciami` — year tabs 2024/2025/2026, list rendered via JS register.
- Sprzedaż mienia (movables): `https://samorzad.gov.pl/web/gmina-zwolen/sprzedaz-mienia`
- Ogłoszenia: `https://samorzad.gov.pl/web/gmina-zwolen/ogloszenia2`
- Individual notices are slugged pages (e.g. `…/ogloszenie-pierwszy-przetarg-ustny-…-wolka-szelezna`).

**Archival — finn.pl / e-urząd `www.gmina.pl` CMS (frozen, "aktualizowany do 2023 r."):** `https://bip.zwolen.pl` (mirror: `archiwum2023bip.zwolen.pl`)
- Gospodarka nieruchomościami archive: `https://bip.zwolen.pl/indexc0c1.html?id=207` (year sub-pages 2014–2023)
- Sprzedaż mienia: `https://bip.zwolen.pl/index3c7f.html?id=444`
- URL shapes: hashed static `indexXXXX.html?id=NNN` + `index.php?a=NNNN&id=NNN&n_id=NNNN` (FINN.pl e-urząd family).

**City portal (CONCEPT Intermedia CMS, non-BIP):** `https://www.zwolen.pl/strona-3387-przetargi_i_ogloszenia.html` — duplicative announcements board.

**Not our target:** `bip.zwolenpowiat.pl` is the **Starostwo Powiatowe** (county / Skarb Państwa property) — separate JST, out of scope.

## 3. Format + rendering
- **Live source = JS-rendered register (SPA-ish).** The gov.pl samorzad Gospodarka-nieruchomości page ships an empty `{"register":{"columns":[]}}` in static HTML and hydrates the notice table client-side → needs `core/render.js` (Playwright) or the underlying register API. Not clean server HTML.
- Individual notices on gov.pl are server-rendered slug pages (readable), but discovery of the list requires render/API.
- Archival `bip.zwolen.pl` = plain finn.pl server HTML, but it is **frozen at 2023** — dead for a live crawler.
- No text-PDF/OCR blocker observed; the blocker is scope (no flats) + a render-gated live index.

## 4. Volume + achieved-price stream
- **Flat volume: effectively zero.** No open flat auctions found in current or archival BIP. Sales stream is municipal **building plots** (land) running through repeat rounds (I…VII przetarg) — a handful of parcels per year.
- **Achieved-price stream:** `informacja o wyniku przetargu` notices exist for land, but no flat results. Even for land, results would have to be read off the JS register on gov.pl.
- Town of ~8k with no ZGM/TBS → any residential disposals are tenant bezprzetargowo sales, which never enter an auction feed.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built for land):** a gov.pl **Samorząd/Liferay register** source — same JS-SPA class as `chrzanow` (render.js) / `warszawa` (aggregator) in ADAPTER-GUIDE §3; would need `needsRender: true`. The archival finn.pl BIP would map to the WordPress/custom-HTML family, but it's frozen and useless for live data.
- **CMS family:** live = gov.pl **Samorząd (mc.gov.pl / Liferay)** JS register; archive = **FINN.pl e-urząd** (`www.gmina.pl`).
- **Effort:** **— (N/A).** No flat stream to extract. Even a land-only build would be **Medium** (render/API for the register), unjustified for a ~14k-person gmina selling a few plots a year.
- **Blockers:** (1) **Scope** — no municipal flat auctions; no housing manager; flats sold bezprzetargowo. (2) **Live index is JS-rendered** on gov.pl (render/API required). (3) Authoritative HTML archive is frozen at 2023.

**VERDICT: NO-BUILD** — Zwoleń auctions building plots (land), not flats; there is no ZGM/TBS and no `lokal mieszkalny` auction stream, and the live source is a JS-rendered gov.pl register. Nothing to build against for the municipal-flat dataset.
