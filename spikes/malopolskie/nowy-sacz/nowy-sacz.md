# Spike — Nowy Sącz (Małopolskie · miasto na prawach powiatu)

> **Status:** re-verified LIVE — 2026-07-06. VERDICT: NO-BUILD (one flat-auction event ever on the board, Apr 2024; zero in the 26 months since).

## TL;DR

Nowy Sącz (pop. ~80 k, miasto na prawach powiatu in Małopolskie) does publish occasional *ustny przetarg nieograniczony na sprzedaż lokali* via the Wydział Geodezji i Nieruchomości (WGN). At least one confirmed open-auction flat sale has been found (Kochanowskiego, 24.88 m², April 2024) and one III-round commercial-unit auction (lokal użytkowy). However the dominant disposal model for municipal flats is **bezprzetargowy** sale to sitting tenants under Art. 34 ustawy o gospodarce nieruchomościami — flat-auction volume appears low (one confirmed in 2024, not annually recurring). The publication channel is **bip.malopolska.pl/nowysacz** (the same regional Małopolska BIP platform as Kraków and Tarnów), whose pages returned empty body on all direct fetch attempts — rendering unknown (likely JS SPA or bot-filtered). Overall: marginal residential auction volume; needs live verification of BIP rendering and actual flat-auction cadence.

## 1. Sells municipal property at auction?

**Yes — but residential flat volume is low and the dominant route is bezprzetargowy.**

- Nowy Sącz (through its Wydział Geodezji i Nieruchomości, Referat Lokalowy at ul. Szwedzka 2) regularly runs *ustny przetarg nieograniczony* for **land parcels (działki)** and **commercial units (lokale użytkowe)** — confirmed through multiple BIP announcements on bip.malopolska.pl/nowysacz and monitorurzedowy.pl (including 2026-02-16 batch on ul. Gwardyjska, Jagiellońska, Jaśminowa, Krzykalskiego).
- **Residential flat auctions do occur** but at low frequency:
  - One confirmed: *I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* at ul. Kochanowskiego (24.88 m², attic, 2 rooms + hall + kitchenette alcove), auction date 25 April 2024, wadium 10 000 PLN (source: adradar.pl/monitor, mirroring a BIP notice ref GN.6840.56.2024.NP).
  - III przetarg ustny nieograniczony na sprzedaż lokalu użytkowego confirmed via bip.malopolska.pl/nowysacz,a,2416030 (commercial unit — not residential).
  - II przetarg ustny nieograniczony mentioned via bip.malopolska.pl/nowysacz,a,2378993 (description truncated in snippet — content unverified).
- **Main flat-disposal channel**: bezprzetargowy sale to existing tenant under Art. 34 ust. 1 pkt 3 u.g.n. — the city publishes wykazes (lists per Art. 35) of flats earmarked for sale to their tenants, visible in the Gospodarka mieniem section on nowysacz.pl. One example: lokal nr 9 at ul. Barska 6, 47.30 m², cena 121 280 PLN, sold without auction. This is confirmed by search snippets from nowysacz.pl/gospodarka-mieniem.
- **No dedicated housing manager running a flat-auction programme** (unlike Gliwice/ZBK or Tarnowskie Góry). The WGN handles everything inline; STBS Nowy Sącz (the city's social housing company) runs rental competitions only — no sales auctions.

**Confidence: DESK** — BIP page bip.malopolska.pl/nowysacz returned empty body on all fetch attempts; adradar/monitorurzedowy snippets confirm at least one residential open auction in 2024 but full volume count unverified.

## 2. Where published? (hosts + boards, with URLs)

### Primary — city BIP (auction notices + wykazes)

| Layer | URL | Notes |
|---|---|---|
| BIP home (Nowy Sącz) | https://bip.malopolska.pl/nowysacz | Regional Małopolska BIP platform; returns empty body on fetch |
| Ogłoszenia o zamówieniach (public procurement) | https://bip.malopolska.pl/nowysacz,m,288947,ogloszenia-o-zamowieniach.html | Procurement-type notices; auctions of property listed here |
| Zamówienia publiczne | https://bip.malopolska.pl/nowysacz,m,285790,zamowienia-publiczne.html | Alternative procurement section |
| Wydział Geodezji i Nieruchomości | https://bip.malopolska.pl/nowysacz,m,287844,wydzial-geodezji-i-nieruchomosci.html | Department page (empty on fetch) |
| Example flat-auction notice | https://bip.malopolska.pl/nowysacz,a,2378993,prezydent-miasta-nowego-sacza-z-siedziba-nowy-sacz-rynek-1-oglasza-ii-przetarg-ustny-nieograniczony-.html | II przetarg ustny nieograniczony — snippet confirms existence; body empty on fetch |
| Example commercial-unit notice | https://bip.malopolska.pl/nowysacz,a,2416030,prezydent-miasta-nowego-sacza-oglasza-iii-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-uzytkoweg.html | III przetarg — lokal użytkowy |

### Secondary — city portal (wykazes + gospodarka mieniem)

| Layer | URL | Notes |
|---|---|---|
| Gospodarka mieniem (main) | https://www.nowysacz.pl/gospodarka-mieniem | Category listing; confirmed server-rendered HTML (snippet text retrieved) |
| Archived bezprzetargowy wykaz example | https://www.nowysacz.pl/gospodarka-mieniem/15012 | Residential flat list for tenant purchase (not auction) |

### Aggregators (DESK cross-check only — not scraped sources)

| Layer | URL | Notes |
|---|---|---|
| Monitor Urzędowy | https://monitorurzedowy.pl/office/1729/urzad-miasta-nowy-sacz | Mirrors BIP notices; useful for indexing cadence |
| adradar.pl | https://monitor.adradar.pl/przetarg/mieszkania/Nowy+S%C4%85cz/miasto/13326446 | Found the April 2024 flat auction entry |
| ListaPrzetargow.pl | https://listaprzetargow.pl/index.php/oferty/393582 | Mostly land parcels from Nowy Sącz |

### Achieved-price notices (informacja o wyniku przetargu)

- Would be published on BIP as separate articles (standard Polish practice: Prezydent ogłasza informację o wyniku przetargu). Not directly found in search snippets for Nowy Sącz residential flats. Likely exist on the BIP ogłoszenia section but content unverifiable due to fetch failures.

## 3. Format + rendering

### bip.malopolska.pl (primary channel)

- Hosted on the **regional Małopolska BIP platform** — identical to Kraków, Tarnów, Chrzanów, Olkusz, Oświęcim.
- **All fetch attempts returned empty body** — consistent with JS-rendered SPA or aggressive bot filtering (same issue documented in Tarnów and Kraków spikes).
- Individual article pages (e.g. /nowysacz,a,2378993,...) also returned empty.
- **Rendering: unknown — likely JS SPA or server-side page requiring cookie/session context.** Playwright or Chrome MCP required to confirm actual content format.
- TLS: standard HTTPS, no auth wall, but content not accessible via plain HTTP GET.

### nowysacz.pl (city portal, secondary channel)

- **Server-rendered HTML** — snippet text from gospodarka-mieniem pages was retrieved cleanly by search crawlers; no JS requirement for content.
- Used for bezprzetargowy wykaz listings, not for open-auction notices.
- No bot block observed in searches.

### monitorurzedowy.pl (aggregator)

- Server-rendered HTML; fetch attempt not made. Standard aggregator site with parsed BIP content.

## 4. Volume + achieved-price stream

### Volume

- **Residential flats (open auction):** Very low. One confirmed in 2024 (Kochanowskiego). No evidence of a regular cadence — may be 1–3 per year when individual surplus flats (e.g. formerly occupied, vacated, or attic conversions) are identified. Most municipal flats go bezprzetargowo to tenants.
- **Land/commercial (open auction):** Active — multiple rounds per year confirmed (e.g. 2026-02-16 batch of 4+ lots; 2024 November land parcel on Wiktora; garage on Barbackiego). Land-only cadence roughly quarterly.
- **Total flat-auction signal:** Weak. Even if BIP is scrapable, expect only occasional residential entries mixed in with land/commercial noise.

### Achieved-price stream

- Not directly confirmed. Standard Polish legal framework (Rozporządzenie Rady Ministrów z 2004 r. w sprawie trybu przeprowadzania przetargów) requires municipalities to publish *informacja o wyniku przetargu* on the BIP within 7 days of auction. These should exist for the Kochanowskiego auction (April 2024) and any other completed open auctions, but they were not surfaced in searches — either buried in BIP (unfetchable) or not indexed.
- If BIP is rendered via JS, achieved-price articles are in the same format problem as announcement articles.

## 5. Adapter effort + verdict

### Closest analog

- **bip.malopolska.pl platform**: identical to Kraków (BUILT). If the Kraków adapter already handles the regional BIP's JS rendering (Playwright or equivalent), the platform layer is reusable.
- **City structure**: closer to Tarnów than Gliwice/ZBK — no dedicated housing manager with its own flat-auction programme; city WGN handles everything inline.
- **Volume profile**: weaker than Kraków (major flat-auction stream) but slightly more active than Tarnów (zero confirmed flat auctions) — one flat auction found in 2024.

### Blockers

1. **bip.malopolska.pl rendering**: all direct fetches returned empty body. Must verify with Playwright/Chrome MCP before committing. Kraków adapter approach is the expected fix.
2. **Low flat-auction volume**: even with a working scraper, the flat-specific signal from Nowy Sącz is thin (likely <5/year). Mixed with land/commercial pages, the signal-to-noise ratio is low.
3. **No dedicated BIP section for nieruchomości**: Nowy Sącz BIP does not appear to have a dedicated property-auction board (unlike some cities). Notices appear in the general ogłoszenia/zamówienia section, requiring category/keyword filtering.

### Risks

- Flat auctions may occur more frequently than the one confirmed example suggests — if BIP is fully searchable when rendered, a deeper archive may exist. LIVE-VERIFY needed.
- Municipal policy may shift: the upcoming end of 90% bonifikaty (nationwide reform 2026/2027) may push more tenants to buy now bezprzetargowo, temporarily flooding the bezprzetargowy channel rather than opening more auction slots.
- bip.malopolska.pl is a shared regional platform — any platform-wide change affects all Małopolskie cities simultaneously.

### Verdict: NO-BUILD (superseded 2026-07-06 — see "Re-verify 2026-07-06" below; desk text kept for history)

Nowy Sącz is a **borderline case**. It runs occasional flat auctions (confirmed at least 1 in 2024) via bip.malopolska.pl/nowysacz, the same platform as the already-built Kraków adapter. If Kraków's renderer handles bip.malopolska.pl, the marginal cost of adding Nowy Sącz is low (platform reuse, city-specific URL config only). However, the flat-auction volume is low and unquantified — a live BIP crawl is needed to determine whether the archive contains meaningful residential auction history (>10 entries) to justify the addition.

**Recommended next step:** Use Chrome MCP / Playwright to render bip.malopolska.pl/nowysacz,m,288947 and count flat-auction vs land-auction entries in the past 2 years. If ≥5 flat auctions found: BUILD (Low effort, platform already solved by Kraków). If <5: park as low-priority.

## Re-verify 2026-07-06

**Method:** the bip.malopolska.pl AngularJS SPA (Madkom SIDAS) exposes a **public JSON API** — no browser needed. `app-conf.js` gives `ApiUrl: https://bip.malopolska.pl/api/`. Working endpoints, verified live:

- Article body (full HTML content in JSON): `https://bip.malopolska.pl/api/articles/{id}` — e.g. `/api/articles/2416030` returns title + 6.4 kB `content` for the garage auction. **This makes the whole regional platform scrapable without Playwright** (relevant to Chrzanów/`needsRender: true` and any future Małopolska city).
- Board listing (with pagination + archive): `https://bip.malopolska.pl/api/menu/{menuId}/articles?limit=100&offset=0[&archived=true]`.
- Menu tree: `/api/menu/{id}`, context: `/api/contexts/nowysacz`.

**Correct board found:** menu **285761 "Gospodarka mieniem"** (Tablica ogłoszeń → Gospodarka mieniem) — NOT the 288947 "Ogłoszenia o zamówieniach" board from the desk spike (that is procurement; 979 articles of supplies/services tenders). Full crawl of 285761: **508 articles, 2021-12-03 → 2026-07-03** (303 active + 205 archived), 251 mentioning "przetarg".

**Flat-auction volume (the gate): FAIL.** Title scan of all 508 articles for `lokal* mieszkal*` / `mieszka*`:

- **Exactly one flat-auction event in ~4.5 years of board history**: 2024-03-21, *I przetarg ustny nieograniczony* for **three flats in one building** at ul. Kochanowskiego (dz. 277/1 obr. 20) — lokal nr 2 (46,07 m², a,2429189), nr 3 (33,16 m², a,2429191), nr 4 (24,88 m², a,2429200 — the desk spike's "one confirmed" flat). Auction 25 Apr 2024.
- **Result notices exist and are parseable**: 2024-05-06 — a,2448379 (nr 2), a,2448397 (nr 3), a,2448405 (nr 4). So the achieved-price stream works — but only for this one event.
- **Zero flat auctions since May 2024** (26 months) and zero in 2023/2025/2026. The desk spike's "II/III przetarg ustny" examples (a,2378993 area / a,2416030) turn out to be a **garage** (lokal użytkowy G12, ul. Pijarska), not residential.
- Yearly *przetarg ustny … sprzedaż* announcement counts (all asset types): 2023: 2, 2024: 12, 2025: 6, 2026: 5 — dominated by land (działki) plus the garage rounds.
- City portal cross-check (nowysacz.pl/gospodarka-mieniem, server-rendered, ~10 most-recent items): current entries are land wykazy, land auctions and **rental** przetargi for lokale użytkowe; zero flat sales. Tenant-sale (bezprzetargowy, Art. 34) remains the flat-disposal channel, as desk-profiled.

**Verdict: NO-BUILD.** The desk spike's own gate was "≥5 flat auctions in past 2 years → BUILD; <5 → park". Live count: **0 in the past 2 years** (3 lifetime, all one building in one month). No recurring residential stream exists to scrape. Park; revisit only if the 2026/2027 bonifikata reform visibly shifts disposals from tenant sales to open auctions — the JSON-API crawl above makes any future re-check a five-minute job (`/api/menu/285761/articles`, title-grep `lokal.*mieszkal`).

**Side finding for the pipeline (do not lose):** bip.malopolska.pl needs **no headless renderer** — `/api/articles/{id}` + `/api/menu/{id}/articles` return everything as JSON. The Chrzanów adapter's Playwright path (`pipeline/src/cities/chrzanow/crawl.js`, `needsRender: true`) could be replaced with plain fetches, and any future Małopolska-platform city (Kraków, Tarnów, Bochnia, Olkusz…) should use the API directly.
