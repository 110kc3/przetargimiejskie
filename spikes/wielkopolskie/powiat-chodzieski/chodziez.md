# Spike — Chodzież (Wielkopolskie · powiat chodzieski)
> **Status:** spike DESK — 2026-06-30. VERDICT: NEEDS-LIVE-VERIFY (Low effort).

## TL;DR
Miasto Chodzież (Gmina Miejska) does sell municipal **lokale mieszkalne** at **ustny przetarg nieograniczony**, confirmed by multiple independent sources (BIP wykaz, e-przetargi.pl, listaprzetargow.pl). Volume is low (small city, ~46 k residents) — sparse single-flat announcements, not a continuous stream. Primary BIP host is `bip.chodziez.pl`, which serves dynamic content that returns empty to plain HTTP fetch; live browser verification needed to confirm 2024–2026 announcement and result pages are crawlable.

## 1. Sells municipal property at auction?

**YES — confirmed.** The Burmistrz Miasta Chodzieży advertises *ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego* for city-owned flats. Specific confirmed examples:

- **ul. Piekary 17 m. 5** — listed for *przetarg ustny nieograniczony*, wykaz posted 6 weeks on BIP & notice board (confirmed via e-przetargi.pl, ~4 years ago ≈ 2022).
- **ul. Topolowa 6** — I przetarg ustny nieograniczony, residential building (single-family type), cena wywoławcza 120 000 zł, June 2018 (listaprzetargow.pl record).
- **ul. Czechowskiego 2/24, ul. Słowackiego 4, ul. Mickiewicza 20, ul. Żeromskiego 18/5** — residential units sold via przetarg nieograniczony (BIP search snippets, years ~2010–2020).

Also: **Gmina Chodzież** (rural surrounding municipality, separate entity, BIP at `bip.gminachodziez.pl`) conducts second *przetarg ustny nieograniczony* on lokal mieszkalny nr 3 in Podanin — confirming the practice is region-wide but the primary urban target is Miasto Chodzież.

The gov.pl procedure page explicitly states: *"Sprzedaż następuje w przetargu lub bezprzetargowo"* — both paths exist; tenants can buy bezprzetargowo, but open-market sales go to przetarg.

## 2. Where published? (hosts + boards, URLs)

| Layer | URL / Location |
|---|---|
| BIP Miasto Chodzież (primary) | `https://bip.chodziez.pl/` |
| BIP announcements/sales section | `https://bip.chodziez.pl/chodziezm/bip/jednostki-organizacyjne-samorzadu-terytorialnego/urzad-miejski/zamowienia-publiczne-i-ogloszenia/` (year sub-pages: `/2024.html`, `/2025.html`) |
| BIP obrót nieruchomościami | `https://bip.chodziez.pl/chodziezm/bip/jednostki-organizacyjne-samorzadu-terytorialnego/urzad-miejski/obrot-nieruchomosciami/duplikat-2020/przetargi.html` |
| gov.pl mirror | `https://samorzad.gov.pl/web/miasto-chodziez/sprzedaz-nieruchomosci` |
| MZGM BIP (Mieszkaniowy Zasób Gminy) | `https://mzgmchodziez.naszaplacowka.pl/bip/` — manages municipal housing stock; przetargi section has years 2020–2026 but appears to contain procurement tenders (repairs etc.), not property-sale auctions |
| Physical notice board | Urząd Miejski w Chodzieży, ul. I.J. Paderewskiego 2, 64-800 Chodzież (mandatory 6-week posting) |
| Wyniki/achieved price | Published on same BIP page or as sub-document; no dedicated result board URL confirmed yet — **needs live verify** |

## 3. Format + rendering

- BIP host: `bip.chodziez.pl` — runs a standard Polish municipal BIP CMS (WOKISS / similar); year-based URL structure `/zamowienia-publiczne-i-ogloszenia/2024.html`.
- Plain HTTP fetch (`web_fetch`) returns **empty body** for all subpages — the content is rendered client-side (JavaScript / SPA or dynamic DOM injection). This is the main technical risk.
- Confirmed content format when rendered: **HTML text** (full Polish prose announcement with address, price, wadium, auction date, BIK terms). No PDF scanning required for announcements seen to date.
- Aggregators (listaprzetargow.pl, e-przetargi.pl) index these announcements — can serve as cross-check but not primary scrape source.
- Result/achieved-price notices: likely posted as HTML sub-documents on the same BIP — format unknown without live render; low risk of scanned-PDF.

## 4. Volume + achieved-price stream

- **Volume:** Low. Chodzież is a small city (~46 k residents). Based on historical records spanning 2010–2026, flat-auction announcements appear at a rate of roughly **1–4 per year**. Not a high-volume stream; useful as a tracker "long tail" city.
- **Achieved-price data:** Polish law requires publication of auction results (cena osiągnięta) on the BIP. The exact sub-URL where results appear is not confirmed from desk research — live crawl needed.
- No JSON API or structured data feed detected. Data is purely HTML prose.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Any small Wielkopolska BIP running WOKISS-style CMS with year-based HTML pages (e.g., Szamotuły, Wągrowiec pattern). The dynamic rendering is the key blocker — requires headless browser (Playwright/Puppeteer) or Chrome MCP to load the announcement list before parsing.

**Blockers:**
1. **JS-rendered BIP** — plain HTTP fetch returns empty; must use headless render. Effort: low (standard Playwright fetch, ~1–2 hours).
2. **Result sub-page URL pattern** — needs live inspection to confirm where *wyniki przetargu* / *cena osiągnięta* are posted.
3. **Low volume** — worth including but don't prioritise over high-volume cities; polling monthly is sufficient.

**Effort estimate:** Low — standard dynamic-BIP adapter, no OCR, no auth, no SPA with bot blocks detected beyond JS rendering. One headless render to `/zamowienia-publiczne-i-ogloszenia/YYYY.html` should yield parseable HTML.

**VERDICT: NEEDS-LIVE-VERIFY** — confirm (a) the year-page renders correctly in headless browser, (b) result sub-page URL pattern, (c) volume count for 2023–2025.
