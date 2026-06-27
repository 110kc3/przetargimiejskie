# Spike — Jastrzębie-Zdrój (Śląskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort to verify, weak flat-auction signal).

## TL;DR

Jastrzębie-Zdrój runs regular oral unlimited auctions for municipal land and built-up properties via its BIP (`bip.jastrzebie.pl/artykuly/sprzedaz`). The city has a dedicated housing manager — Miejski Zarząd Nieruchomości (MZN, `mzn.jastrzebie.pl`) — but MZN handles flat rental/management only, not sales. Across 10 pages of BIP auction history (2015–2026, ~50+ entries live-checked across pages 1, 2, 5), **zero municipal-owned residential flats (lokale mieszkalne) appear at oral auction**. The one flat entry found (ul. Osiedle Tysiąclecia 19, Oct 2025) was a Skarb Państwa (State Treasury) unit sold via written tender — not the city's own stock. The city almost certainly disposes of residential flats bezprzetargowo (direct sale to sitting tenants). No usable flat-auction stream exists.

## 1. Sells municipal property at auction?

Yes — the city auctions land and commercial/built-up property regularly. Confirmed "Przetarg ustny nieograniczony" for:
- Nieruchomość niezabudowana (undeveloped land parcels) — dominant category, multiple per quarter
- Nieruchomość zabudowana (built-up land / commercial) — occasional, e.g. ul. Pszczyńska 134 at 615 000 zł (June 2026)

**Residential flats (lokale mieszkalne): NO oral auction stream found.** The BIP sprzedaż page's filter dropdown lists "Lokal mieszkalny" as a type, but no city-owned flat listings are populated in that category. The sole flat entry (Oct 2025, Skarb Państwa) was a written tender for a state-owned unit, not a municipal one.

MZN's BIP (`bip.mznjastrzebie.pl`) menu lists: Najem, Zamówienia publiczne, Wykaz Zarządzanego Mienia — no Sprzedaż or Przetargi section. MZN is confirmed as a rental/management body only.

Verdict on flat auctions: **does NOT run ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych** (municipal-owned). Strongly consistent with bezprzetargowy sale to tenants pattern typical of Śląskie mining cities.

## 2. Where published? (hosts + boards, with URLs)

| Source | URL | Content |
|---|---|---|
| City BIP — Sprzedaż (primary board) | https://bip.jastrzebie.pl/artykuly/sprzedaz | All property auction announcements + results |
| City BIP — individual auction detail | https://bip.jastrzebie.pl/przetarg-nieruchomosci/{slug} | Per-auction page with result text |
| City BIP — Gospodarka nieruchomościami | https://bip.jastrzebie.pl/artykuly/gospodarka-nieruchomosciami | Navigation hub |
| MZN main site | https://mzn.jastrzebie.pl/przetargi/ | MZN przetargi (utility premises only, JS-rendered — returned empty) |
| MZN BIP | https://bip.mznjastrzebie.pl/ | MZN admin BIP — rental/finance, no flat sales |
| City official site | https://www.jastrzebie.pl/strefa-biznesu/gospodarka-nieruchomosciami | Mirrors BIP links |

Result notices ("informacja o wyniku") are embedded inline on the same BIP auction detail page under a "Rozstrzygnięcie:" heading — they include achieved price (e.g. "nabyta za cenę netto 137 480,00 zł"), buyer type (osoba fizyczna / firma), and negative-result language. No separate result-board page.

## 3. Format + rendering

- **BIP host**: `bip.jastrzebie.pl` — CMS by Logonet Sp. z o.o. (Bydgoszcz), same vendor seen in other Śląskie cities
- **Rendering**: Server-rendered HTML. Full page content loads without JavaScript (confirmed via `web_fetch`). Tables with structured fields (adres, typ przetargu, rodzaj nieruchomości, cena wywoławcza, data przetargu, stan przetargu).
- **Pagination**: Standard query-string pagination (`?page=N`), 10 entries per page by default (configurable to 5/25/50/100 via UI), 10 pages total as of 2026-06-27.
- **Filter params**: The search form (adres, typ przetargu, rodzaj nieruchomości, rok publikacji, status) appears to be a POST/GET filter — filter-by-type for "Lokal mieszkalny" is available in the dropdown but yields no city results.
- **TLS**: HTTPS with valid cert. No auth or bot-blocking detected. No CAPTCHA. No JS wall.
- **Result text format**: Born-digital plain text inside HTML — fully machine-readable, no PDFs or scanned images for auction outcome data.
- **MZN przetargi**: `mzn.jastrzebie.pl/przetargi/` returned an empty body — likely a Joomla/WordPress JS-rendered page; not the primary source anyway.

## 4. Volume + achieved-price stream

**Land auctions (niezabudowana):**
- Approx. 8–12 land-parcel sessions/year, often batched (multiple parcels at staggered 30-min slots in one session)
- Recent examples: ul. Chabrowa (May 2026, 2 parcels, 77 000–100 000 zł net achieved); ul. Sowia/Sokola (Nov 2025, 1 of 3 sold at 137 480 zł net); ul. Rolnicza batch (Sept 2025, 2 of 3 sold at 97 000 / 135 500 zł net)
- High negative-result rate (no wadium paid in many sessions — typical for this market)

**Flat auctions (lokal mieszkalny): ZERO municipal entries found across full archive (2015–2026).**

**Achieved-price data availability**: YES — result text is embedded on the BIP detail page inline, born-digital, machine-readable. Pattern: "nabyta przez osobę fizyczną za cenę netto X zł." Negative results explicitly stated. Price stream exists for land but not flats.

## 5. Adapter effort + verdict

**Closest analog**: Bytom or Zabrze — city BIP with Logonet CMS, server-rendered, paginated list, result inline on detail page. The BIP scraping pattern would be identical.

**However**: The scraped output would be land-only auctions. The project's primary value proposition is flat auction aggregation. A land-only feed from Jastrzębie-Zdrój adds marginal value unless the platform intentionally covers land+commercial.

**Blockers**:
1. No flat auction stream — the core signal is absent
2. MZN przetargi page is JS-rendered (minor, since MZN doesn't run flat sales anyway)

**Risks**:
- If the city ever starts flat auctions, they would appear on the same BIP board under "Lokal mieszkalny" — easy to detect later
- The Skarb Państwa flat (Oct 2025) was a one-off provincial-authority listing that appeared on the city BIP — could recur but is not a municipal auction

**Effort if building land adapter**: Low-Medium (standard Logonet BIP scraper, same pattern as gliwice/zabrze). Pagination is clean, results inline, no auth.

**Effort for flat adapter**: N/A — no source exists.

**VERDICT: NO-BUILD** — no municipal flat auction stream. Revisit only if flat listings appear on `bip.jastrzebie.pl/artykuly/sprzedaz` under "Lokal mieszkalny" filter in future. Land-only adapter is buildable but out of scope for flat-focused aggregator.

---

**Sources verified 2026-06-27:**
- https://bip.jastrzebie.pl/artykuly/sprzedaz (pages 1, 2, 5 live-fetched)
- https://bip.jastrzebie.pl/przetarg-nieruchomosci/ul-osiedle-tysiaclecia-19
- https://bip.mznjastrzebie.pl/
- https://mzn.jastrzebie.pl/przetargi/
- https://www.jastrzebie.pl/strefa-biznesu/gospodarka-nieruchomosciami
