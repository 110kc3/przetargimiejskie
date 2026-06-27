# Spike — Tarnobrzeg (Podkarpackie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort to confirm; volume too low).

## TL;DR

Tarnobrzeg does sell municipal flats at auction — but the observed volume is ~1 lokal mieszkalny per year, and the only confirmed flat auction (ul. Barwinek 2/117, Kielce) is an unusual out-of-city asset that required 3 successive rounds to sell. The default policy for city-resident tenants is **bezprzetargowa** (tenant-preference sale with 40–90% bonifikata), confirmed explicitly in the BIP procedure page. No TTBS-run flat-sale auction board exists. The BIP przetargi section (Logonet CMS, clean HTML) is technically easy to scrape, but near-zero flat-auction cadence makes ongoing aggregation pointless. Closest analog: **Tarnowskie Góry** (land-dominant BIP, rare flat auction).

## 1. Sells municipal property at auction?

**Yes, but almost exclusively land and leases; flats are a near-exception.**

- Confirmed flat auction: *trzeci przetarg pisemny nieograniczony na sprzedaż lokalu mieszkalnego nr 117 wraz z udziałem w nieruchomości wspólnej, ul. Barwinek 2, Kielce*, announced 2026-06-01, auction date 2026-07-14 (cena wywoławcza 385 000 zł). This is the **3rd round** (przetarg pisemny nieograniczony), confirming very weak demand. The 2nd round result was published 2026-05-08.
- Source: <https://bip.tarnobrzeg.pl/artykul/60/7206/ogloszenie-o-przetargu-lokal>; result: <https://bip.tarnobrzeg.pl/artykul/60/7139/informacja-o-przetargu>

**Dominant mode for municipal flats: bezprzetargowa.**

The official BIP procedure page "Sprzedaż lokali mieszkalnych na rzecz najemcy" explicitly states:

> *Sprzedaż lokali mieszkalnych może nastąpić na rzecz najemców, których najem został nawiązany na podstawie umów najmu zawartych na czas nieoznaczony — bezprzetargowo.*

Bonifikata: 60% gotówka, 40% raty, 90% if all remaining units in a building are sold simultaneously.
Source: <https://bip.tarnobrzeg.pl/sprawa-do-zalatwienia/1650/sprzedaz-lokali-mieszkalnych-na-rzecz-najemcy>

Scanning pages 1–3 of the przetargi board (~30 entries covering ~2025-Q4 through 2026-06-27), only **1 lokal mieszkalny** auction appeared among predominantly land plots, lease auctions, and ground-floor commercial assets.

## 2. Where published? (hosts + boards, URLs)

| Board | URL | Notes |
|---|---|---|
| BIP Urząd Miasta Tarnobrzega — Przetargi | <https://bip.tarnobrzeg.pl/artykuly/60/przetargi> | Primary board; all nieruchomości auctions. Paginated: `/artykuly/60/{page}/10/przetargi`. 23 pages as of 2026-06-27. |
| BIP — Wykazy nieruchomości | <https://bip.tarnobrzeg.pl/artykuly/61/wykazy-nieruchomosci-przeznaczonych-do-sprzedazy-i-dzierzawy> | Pre-auction lists; not a result stream. |
| UM Tarnobrzeg — Nieruchomości i przetargi | <https://um.tarnobrzeg.pl/nieruchomosc-i-przetargi> | Public-facing mirror/summary; less structured. |
| TTBS BIP | <https://tarnobrzeskitbs.bip.gov.pl/> | Exists but TTBS is a rental-only TBS entity; **no flat-sale auction board** found. TTBS publishes only zamówienia publiczne (construction/service contracts). |

Result notices (achieved price) are published on the same BIP board under "Informacja o przetargu" / "Informacja o wyniku przetargu" entries, typically within 7–14 days post-auction. The actual achieved price is in a linked **.docx attachment** (not inline HTML text).

## 3. Format + rendering

- **Board index**: Clean server-rendered HTML (Logonet CMS v2.9.0). Article list renders in plain `<h2>` + paragraph snippets, no JavaScript required. Pagination via URL path `/artykuly/60/{page}/10/przetargi`. No auth, no bot block observed. RSS available at <https://bip.tarnobrzeg.pl/rss> (scope unclear).
- **Individual entries**: Also plain HTML. Body text contains the announcement in prose; key fields (address, parcel number, area, reserve price) embedded in running text, not a structured table.
- **Attachments**: Announcement details and result notices are in **.docx** (sometimes **.doc**) files linked as `/attachments/download/{id}`. The achieved-price figure lives in the docx, **not** in the HTML body of the result entry.
- **No scanned PDFs** observed; no SPA; no JSON API.
- **Metryczka table** (author, publish date, update date) present on every entry — useful for change-detection.

## 4. Volume + achieved-price stream

- **Flat auction volume**: ~1 per year (single asset observed across 3 pages / ~6 months of entries). This is noise-level.
- **Land/lease volume**: Active — roughly 4–8 active przetargi per month (plots for single-family housing, agricultural leases, occasional commercial).
- **Achieved price**: Published post-auction in a linked .docx attachment within the "Informacja o przetargu" entry. For the Barwinek flat, the 2nd-round result entry (id 7139) linked a 16 kB .docx; the achieved price is inside that document, not extractable from HTML alone.
- **No TTBS flat-sale stream**: TTBS (city-owned TBS) operates a rental housing portfolio and runs only construction/service procurement — confirmed at <https://ttbs.tarnobrzeg.pl/zamowienia-publiczne>.

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry — generic city-BIP board, land-dominant, occasional stray flat, no dedicated housing-manager board.

**Effort if built:** Low-Medium technically (Logonet CMS is already understood from other cities; clean HTML scraping; pagination via URL path). However:

- Achieved price is in a .docx attachment — requires docx parsing for the price field, adding a parsing step not needed for HTML-embedded prices.
- Flat auction cadence is ~1/year (single repeating asset seen 3 rounds). No pipeline value.
- No housing manager (ZGM/ZBK equivalent) running a parallel flat-sale board.

**Blockers / risks:**
- Near-zero flat volume — index would be empty almost always.
- Price extraction requires .docx parsing (not HTML).
- The one observed flat (Barwinek 2, Kielce) is an oddity — a Kielce asset managed by Tarnobrzeg city, not a local mieszkanie komunalne. May not recur.

**VERDICT: NO-BUILD.** Flat auction volume is effectively zero; dominant disposal route is bezprzetargowa to sitting tenants; no housing-manager board supplements the city BIP. Technical scraping is feasible but there is nothing useful to aggregate.
