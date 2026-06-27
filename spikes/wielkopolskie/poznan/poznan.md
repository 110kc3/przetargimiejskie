# Spike — Poznań (Wielkopolskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Poznań runs a genuine *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych* through its Wydział Gospodarki Nieruchomościami (WGN), published on bip.poznan.pl. Volume is low-to-medium (single units sold individually, not in batches). The BIP serves server-rendered HTML and also exposes XML/JSON API endpoints per department. ZKZL (Zarząd Komunalnych Zasobów Lokalowych) manages the communal housing stock but does **not** run the open flat auctions itself — it prepares flats for sale and hands them to WGN. There is no dedicated achieved-price ("wynik przetargu") section confirmed live, but result notices appear inline in the same BIP news feed. Closest analog: Kraków (single BIP department feed, low auction volume, server-rendered HTML, no dedicated results board).

---

## 1. Sells municipal property at auction?

**YES — confirmed with live examples.**

The city's Wydział Gospodarki Nieruchomościami (WGN) at Urząd Miasta Poznania announces *przetargi ustne nieograniczone* for individual residential flats (*lokale mieszkalne*) owned by Miasto Poznań. Multiple specific notices were found indexed on bip.poznan.pl, e.g.:

- ul. Grodziska 32/2 (Grunwald) — przetarg scheduled 27 Feb 2025  
  https://bip.poznan.pl/bip/wydzial-gospodarki-nieruchomosciami,24/news/ogloszenie-o-przetargu-na-sprzedaz-lokalu-mieszkalnego-grunwald-ul-grodziska-32-2,241142.html
- ul. Limanowskiego 20 / lokal nr 34 (2015 vintage)  
  https://bip.poznan.pl/bip/wydzial-gospodarki-nieruchomosciami,24/news/ul-limanowskiego-20-lokal-mieszkalny-nr-34-sprzedaz-lokalu-w-przetargu,80647.html
- ul. Zbąszyńska 5/7 (2016)  
  https://bip.poznan.pl/bip/wydzial-gospodarki-nieruchomosciami,24/news/lokal-mieszkalny-ul-zbaszynska-5-7-sprzedaz-w-przetargu,90576.html
- ul. Grodziska 65 / lokal nr 1 (trzeci przetarg, 2018)  
  https://bip.poznan.pl/bip/wydzial-gospodarki-nieruchomosciami,24/news/ul-grodziska-65-lokal-nr-1-ogloszenie-o-przetargu-na-sprzedaz-lokalu-mieszkalnego,112732.html

**Important nuance — ZKZL role:** ZKZL sp. z o.o. manages the communal housing stock but does NOT sell flats directly at open auction. Its "Sprzedaż lokali" page (live-verified 2026-06-27) states explicitly that flats are sold *bezprzetargowo* to sitting tenants in two categories: (a) flats released from police allocation, (b) single-unit residential buildings. General communal flats are only sold if Miasto Poznań designates them for sale and the sitting tenant requests purchase. See: https://zkzl.poznan.pl/sprzedaz-wykup-lokali-mieszkalnych/

The open *przetarg ustny nieograniczony* stream therefore covers **flats with no sitting tenant** (vacated, failed to rent, etc.) and **land/non-residential** — published by WGN directly on BIP. Land auction volume is also present (e.g., a 4.8 ha site near Zegrze, a 3 362 m² plot in Jeżyce/Krzyżownik — both listed June 2026 on listaprzetargow.pl).

**Residential flat auction volume (desk estimate):** low-to-medium — roughly a handful to ~20 individual flat sales per year based on the indexed notices spanning 2014–2025. Poznań's stock is managed conservatively (waiting lists for tenant purchase are long). This is weaker than Gliwice/Bytom but still a genuine open-auction stream.

---

## 2. Where published? (hosts + boards, with URLs)

| What | Host | URL | Notes |
|---|---|---|---|
| Auction announcements (flat + land) | bip.poznan.pl — WGN news board | https://bip.poznan.pl/bip/wydzial-gospodarki-nieruchomosciami,24/news/ | Server-rendered HTML; pagination present |
| WGN department landing (API root) | bip.poznan.pl | https://bip.poznan.pl/bip/wydzial-gospodarki-nieruchomosciami,24/ | Exposes XML + JSON API links |
| Result/wynik notices | Same WGN news board (inline) | same URL as above | No separate "wyniki" board confirmed — results appear in the same feed |
| ZKZL sale info (tenant buyout only) | zkzl.poznan.pl | https://zkzl.poznan.pl/sprzedaz-wykup-lokali-mieszkalnych/ | Not an open-auction feed; skip for scraping |
| ZKZL procurement (supplies/services) | zkzl.eb2b.com.pl | https://zkzl.eb2b.com.pl/ | Unrelated to property sales |
| Aggregator cross-check | listaprzetargow.pl | https://listaprzetargow.pl/oferty/przetargi/poznan | Re-publishes BIP notices; confirms active flow |

**BIP JSON/XML API:** bip.poznan.pl exposes per-department API endpoints:
- JSON: `https://bip.poznan.pl/api-json/bip/wydzial-gospodarki-nieruchomosciami,,wydzial-gospodarki-nieruchomosciami/`
- XML: `https://bip.poznan.pl/api-xml/bip/wydzial-gospodarki-nieruchomosciami,,wydzial-gospodarki-nieruchomosciami/`

Both endpoints returned empty bodies in a direct web_fetch probe (possible auth/bot block or they expose metadata rather than news items). The news items themselves are in the `/news/` sub-path. Confirmation of the API payload structure requires a live browser test.

**Dedicated email for auctions:** `gn.przetargi@um.poznan.pl` (listed on BIP department page for "przetargi na sprzedaż nieruchomości").

---

## 3. Format + rendering

| Property | Finding | Confidence |
|---|---|---|
| Rendering | Server-rendered HTML (bip.poznan.pl is a classic Poznań BIP CMS — not a JS SPA) | LIVE-VERIFIED |
| Content type | `text/html;charset=UTF-8` confirmed on department page | LIVE-VERIFIED |
| Individual notice format | HTML page per announcement; text is born-digital, no OCR | DESK (individual notice page timed out on fetch; inferred from indexing) |
| PDF attachments | Likely for formal ogłoszenie documents (standard PL BIP practice) — unconfirmed whether PDFs are born-digital or scanned | DESK |
| TLS | Standard HTTPS, no auth wall on public BIP pages | LIVE-VERIFIED |
| Bot/rate-limit | No captcha observed; standard Polish BIP — likely permissive | DESK |
| API viability | JSON/XML endpoints exist but returned empty in probe; may require Accept header or session cookie | DESK — needs live browser verify |

---

## 4. Volume + achieved-price stream

**Volume:** Low-to-medium open flat auction stream. Individual notices are published one flat at a time (not batch lists). Based on indexed notices from 2014–2025, estimated 5–15 flat auction announcements per year. Land auctions add further volume (multiple plots per year).

**Achieved-price stream:**
- No dedicated "Wyniki przetargów" board found on bip.poznan.pl WGN — unlike Powiat Poznański BIP which has a separate results section (https://www.bip.powiat.poznan.pl/2636,wyniki-przetargow — this is powiat, not miasto).
- Result notices ("informacja o wyniku przetargu") are expected to appear in the same WGN news board feed but were not directly confirmed with a live example during this spike. The przetargi-komunikaty.pl aggregator references the same WGN board as the source of all auction activity.
- **Risk:** If the city only posts results on a physical notice board (as allowed by law) and not online, the achieved-price stream may be absent or sparse. This is the main unresolved question.

---

## 5. Adapter effort + verdict

**Closest analog:** Kraków — single BIP department news feed, individual flat notices, server-rendered HTML, medium city size with moderate (not high) flat auction volume, no confirmed dedicated results board.

**Blockers / risks:**

1. **Achieved-price stream not confirmed.** The WGN news board is the presumed location for result notices, but no live "informacja o wyniku" example was retrieved. If results are absent online, the adapter can still scrape listings but not closing prices.
2. **API endpoints returned empty.** The JSON/XML API exists but payload structure is unconfirmed. Scraping will likely rely on HTML parsing of the `/news/` board with pagination.
3. **Low flat-auction volume.** Poznań leans heavily on *bezprzetargowy* tenant buyout for its communal stock (ZKZL's model). The open-auction stream is real but thin — perhaps 5–15 flats/year. This weakens the data proposition vs. Gliwice/Bytom/Zabrze which run larger batches.
4. **ZKZL is a red herring** for open auctions. It must be excluded from scraping scope (it only handles bezprzetargowy tenant sales and service procurement).

**Effort estimate:** Medium.
- HTML scraper for `bip.poznan.pl/bip/wydzial-gospodarki-nieruchomosciami,24/news/` with pagination.
- Per-notice page parser (born-digital HTML, structured like other Poznań BIP CMS pages).
- Result notice detection (same feed, keyword filter on "wynik przetargu" / "informacja o wyniku").
- No OCR needed (born-digital BIP CMS).
- Land + flat announcements mixed in same feed — requires type-classifier or keyword filter to separate lokale mieszkalne from działki.

**VERDICT: BUILD (Medium effort)**

The open flat-auction stream is confirmed real and recent (2025 notice found). The BIP is a standard server-rendered CMS with a clean per-department news feed. Volume is lower than Silesian cities but sufficient for a useful data feed. Main risk is thin achieved-price data — recommend confirming the live results-notice presence as the first adapter task before building the full pipeline.
