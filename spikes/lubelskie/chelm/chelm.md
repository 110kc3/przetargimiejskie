# Spike — Chełm (Lubelskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Chełm's Prezydent publishes **ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych** directly on the city BIP at `umchelm.bip.lubelskie.pl/index.php?id=55`. On 2026-06-02 alone there were 7 WYKAZ listings for individual lokale mieszkalne plus an active III przetarg on a spółdzielcze własnościowe prawo do lokalu (Wołyńska 65A/5). Volume is real — 796 records since 2013 on that board. Announcements are text-HTML titles on a paginated lubelskie.pl BIP; individual notices are linked as text PDFs (machine-readable, standard Prezydent format). Achieved-price result notices appear on `samorzad.gov.pl/web/miasto-chelm` as plain HTML articles. No dedicated housing manager entity (no ChZGM equivalent found); the Wydział Geodezji, Kartografii i Mienia Komunalnego (DN.* document codes) handles all property disposals directly. PUM Chełm (ul. Bieławin 9) manages rental stock but does not run sale auctions.

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** The BIP board at `id=55` (796 records from 2013 onward) contains both:

- **Wykazy nieruchomości przeznaczonych do sprzedaży** — pre-auction property lists (mandatory 21-day public display before the actual przetarg is called). On 2026-06-02 seven separate lokale mieszkalne were listed:
  - ul. Juliusza Słowackiego 25
  - ul. 11 Listopada 6B
  - ul. Żwirki i Wigury 8 lok. 8
  - ul. Wiejska 6A lok. 2a
  - ul. Wiejska 26 lok. 42
  - ul. Wiejska 12 lok. 1
  - al. Marszałka Józefa Piłsudskiego 25 lok. 21
  - ul. Adama Mickiewicza 28 lok. 7

- **Active przetarg announcements** — e.g. *III ustny nieograniczony przetarg na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego* przy ul. Wołyńskiej 65A/5 (2026-06-02); I and II rounds of the same property were published 2025-12-16 and 2026-04-01 respectively. Land/commercial przetargi also present (ul. Rusałki, Bulwarowa, Nadrzeczna, Ceramiczna, Jagiełły) but residential is a distinct, active stream.

Mixed model: some flats go *bezprzetargowo* (the najem/socjalny stream seen on `id=143`), but the open-auction track for outright sprzedaż lokali is clearly active and recurring.

## 2. Where published? (hosts + boards, URLs)

| Purpose | URL | Notes |
|---|---|---|
| Main property board (announcements + wykazy) | `https://umchelm.bip.lubelskie.pl/index.php?id=55` | 796 records 2013–2026, paginated 30/page, lubelskie.pl BIP platform |
| Rental/najem board (not sale — do not scrape for przetargi) | `https://umchelm.bip.lubelskie.pl/index.php?id=143` | 308 records of wolne lokale do najmu |
| Result/wynik notices (secondary) | `https://samorzad.gov.pl/web/miasto-chelm/ogloszenia-i-komunikaty` | Plain HTML articles, e.g. `informacja-o-wyniku-przetargu`; not structured |
| BIP root | `https://umchelm.bip.lubelskie.pl/` | Lubelskie voivodeship BIP platform |
| Document PDFs | `https://umchelm.bip.lubelskie.pl/upload/pliki/*.pdf` | Text PDFs, directly linked from id=55 listing items |

Document codes follow pattern `DN.7140.*` (najem) and `DN.6840.*` / `DN.6845.*` (sprzedaż/dzierżawa). Przetarg sale items sometimes have no code (raw title only) in the listing.

## 3. Format + rendering

- **Listing page** (`id=55`): standard lubelskie.pl BIP — server-rendered HTML table. Each row has: date, title string (full human-readable text of the notice type), and a hyperlink to either an inline BIP sub-page or a direct PDF. No JS required to read the listing. Pagination via `?strona=N` or `?page=N` (needs verification — lubelskie.pl BIP uses its own param).
- **Individual notices**: **text PDF** (confirmed via direct fetch of `2019_Prusa_950_15.pdf` — UTF-8 readable, no OCR needed). Standard Prezydent Miasta Chełm header, `OGŁOSZENIE O PRZETARGU`, cena wywoławcza, wadium, data i miejsce przetargu.
- **Wykazy**: also text PDFs or inline HTML sub-pages (mixed — some items link to a BIP popup `id=141&p1=info_przetarg&...`).
- **Result notices** (`samorzad.gov.pl`): plain HTML, narrative text only — achieved price not consistently structured (the sampled notice for MPEC reported negative result without price).
- **No auth / bot block observed** — lubelskie.pl BIP is open, no CAPTCHA, no rate-limit signs on direct PDF fetch.
- **No SPA** — pure server-rendered HTML.

## 4. Volume + achieved-price stream

- **Announcement volume**: 796 records on `id=55` since 2013 ≈ ~60/year across all property types (land, commercial, residential). Residential flat wykazes appear in batches (7 on a single date in June 2026), suggesting periodic clearance rounds. Estimated 10–30 flat-sale przetargi per year (I/II/III rounds on the same flat inflate the count).
- **Achieved-price stream**: WEAK. Result notices exist on `samorzad.gov.pl/web/miasto-chelm` but are sparse, narrative HTML, and the sampled one reported a negative result only (no price). The BIP `id=55` board does not appear to have a dedicated "wyniki" sub-section equivalent to e.g. Lublin's BIP. Achieved price would need to be inferred from notarial act registers or follow-up BIP search — not directly available as structured data. This is the main risk for the price-tracking feature.

## 5. Adapter effort + verdict

**Closest analog**: Zamosc spike (also lubelskie.pl BIP platform, same `id=55`-style board, text PDFs). If Zamosc adapter exists it should be near-directly reusable for Chełm.

**Effort breakdown**:
- Scraper: low — same lubelskie.pl BIP platform as Zamosc/Biała Podlaska. Paginate `id=55`, filter titles containing "lokal mieszkalny" OR "spółdzielczego własnościowego". ~1–2 days.
- PDF parser: low — text PDFs, same Prezydent-format as other lubelskie cities. Reuse existing parser.
- Achieved-price stream: medium-high — no structured wyniki board. Would need to match future `samorzad.gov.pl` articles or skip price tracking for now. Risk: result notices are inconsistently published and may not include price.
- Deduplication: medium — same flat goes through I/II/III rounds; need to group by address+lokal number.

**Blockers**: none for announcement scraping. Achieved-price is the open question.

**Risks**:
- lubelskie.pl BIP occasionally times out on bulk PDF fetches (observed in other lubelskie cities).
- Flat-sale volume is real but not huge (~10–20 distinct flats/year); ROI is solid for a regional aggregator.
- "Spółdzielcze własnościowe prawo" items (city holding co-op rights) are a legal edge case — confirm whether the aggregator should present these identically to odrębna własność.

**VERDICT: BUILD** — active flat-sale przetargi confirmed live on structured BIP board, text PDFs, same platform as existing lubelskie adapters. Medium effort primarily because of the weak achieved-price stream. Announcement scraping is straightforward.

---

*Sources (LIVE-VERIFIED 2026-06-27):*
- `https://umchelm.bip.lubelskie.pl/index.php?id=55` — property board, read live in Chrome MCP
- `https://umchelm.bip.lubelskie.pl/upload/pliki//2019_Prusa_950_15.pdf` — text PDF format confirmed via web_fetch
- `https://samorzad.gov.pl/web/miasto-chelm/informacja-o-wyniku-przetargu` — result notice page, fetched via web_fetch
- `https://umchelm.bip.lubelskie.pl/index.php?id=143` — rental board (excluded from scrape scope), read live
