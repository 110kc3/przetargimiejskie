# Spike — Lublin (Lubelskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort to confirm, but no viable flat-auction stream).

## TL;DR

Lublin sells municipal residential flats **exclusively bezprzetargowo** — via written application by the sitting tenant, no open public auction whatsoever. The city's BIP does run regular *ustny przetarg nieograniczony* auctions, but across 2024, 2025, and 2026 (20+ pages of results, LIVE-VERIFIED) every single one targets **land plots (działki)** or one recurring non-residential unit (lokal niemieszkalny Skarbu Państwa, ul. 1 Maja 17). There is no residential-flat auction stream to scrape. This is the classic weak-city pattern the heuristic warns about.

---

## 1. Sells municipal property at auction?

**Yes, land and commercial — no residential flats.**

- The city (via Wydział Gospodarowania Mieniem i Energią, GME) runs active public oral auctions — approx. 20–25 per year on the results board.
- Asset classes at auction: bare land plots (działki budowlane, rolne, leśne), access strips, one non-residential unit (lokal niemieszkalny) at ul. 1 Maja 17 auctioned repeatedly.
- Residential flats (lokale mieszkalne): sold **only to sitting tenants** under art. 35 ustawy o gospodarce nieruchomościami + Uchwała nr 466/XL/2019 Rady Miasta Lublin. The BIP service description (karta GME-016, updated 2026-05-29) lists the process: tenant submits form GME-016-01, city gets a valuation, prepares a "wykaz nieruchomości" published for 21 days, then concludes a notarial sale directly — no auction. **Zero open flat auctions in any year reviewed.**
- One apparent exception: April 2024 result mentions sale of *spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 58, Częstochowa, ul. Adama Czartoryskiego 13* — this is a Skarb Państwa asset in a different city, not a Lublin municipal flat.
- ZNK (Zarząd Nieruchomości Komunalnych w Lublinie): manages utility/commercial lets, not flat sales auctions. ZNK BIP at `biuletyn.lublin.eu/znk/` covers procurement, not property auctions.

---

## 2. Where published? (hosts + boards, with URLs)

Two hosts, both city-operated:

| Purpose | URL |
|---|---|
| Auction announcements (ogłoszenia) | https://bip.lublin.eu/urzad-miasta-lublin/ogloszenia/rozporzadzanie-nieruchomosciami/ |
| Auction announcements — 2025 index | https://bip.lublin.eu/urzad-miasta-lublin/ogloszenia/rozporzadzanie-nieruchomosciami/2025/ |
| Auction results (wyniki przetargów) | https://bip.lublin.eu/urzad-miasta-lublin/ogloszenia/informacje-o-wynikach-przetargow/ |
| Auction results — 2026 | https://bip.lublin.eu/urzad-miasta-lublin/ogloszenia/informacje-o-wynikach-przetargow/2026/ |
| Flat sale service description (bezprzetargowy) | https://bip.lublin.eu/e-urzad/opisy-uslug/wydzial-gospodarowania-mieniem-i-energia/lokale-mieszkalne-sprzedaz/sprzedaz-lokali-mieszkalnych,1,22944,2.html |
| Electronic notice board (mirror) | https://eto.lublin.eu/przetargi-nieruchomosci/ |
| ZNK BIP (commercial/utility lets only) | https://biuletyn.lublin.eu/znk/ |
| ZNK legacy site | https://www.znk-lublin.pl/ |

The BIP is the authoritative source. ETO (eto.lublin.eu) appears to mirror the same content. The wyniki section is paginated by year (2021–2026 confirmed), each year on one or two pages.

---

## 3. Format + rendering

- **Server-rendered HTML** throughout. Pages load fully without JavaScript execution — DOM text extraction works (confirmed via Chrome MCP get_page_text).
- Announcement and result index pages: plain unordered list of document titles as `<a>` links. No JS SPA.
- Individual result documents: HTML pages with tabular/prose content. Based on the listing titles, each "Informacja o wyniku" names the property, auction date, and (in the document body) achieved price — standard PL BIP format.
- No authentication, no CAPTCHA observed. TLS: standard HTTPS on bip.lublin.eu.
- Year-based URL structure is predictable: `.../informacje-o-wynikach-przetargow/{YEAR}/` and `.../2,strona.html` for page 2.
- No JSON API or PDF documents on the results pages — born-digital HTML only.
- `web_fetch` returned empty on first attempt (possible rate-limit or JS-rendered redirect); Chrome MCP navigated and rendered successfully. Bot-friendliness: medium — no explicit block, but standard fetch may be unreliable.

---

## 4. Volume + achieved-price stream

| Year | Total auction results (all types) | Residential flat results |
|---|---|---|
| 2026 (to 2026-06-27) | ~20 (single page) | 0 |
| 2025 | ~38 (2 pages) | 0 |
| 2024 | ~30+ (2 pages) | 0 (1 Częstochowa flat — irrelevant) |

- Volume of land/commercial auctions is moderate (~25–40/year), but **the flat-auction stream is zero**.
- The "Wykaz" notices for flat sales (e.g., Wykaz nr GME-SN-I.7125.110.4.2025, Wykaz nr GME-SN-I.7125.110.5.2025) appear in the ogłoszenia board but are bezprzetargowy — no auction price, no competitive bidding, no "informacja o wyniku" issued for these.
- There is no achieved-price data stream for residential flat transactions from this city.

---

## 5. Adapter effort + verdict

**Closest analog:** None of the existing adapters (Gliwice, Zabrze, Bytom, Kraków, Tarnowskie Góry) — those cities all run open flat auctions. Lublin's pattern is closer to a municipality where flats are fully converted to tenant ownership off-market and the BIP only publishes land deals.

**Blockers:**
1. **No flat auction stream** — the core data type this project aggregates does not exist in Lublin's BIP. Building an adapter would scrape land-plot auctions only, which is out of scope.
2. Even if land-plot data were in scope, the ETO mirror and BIP pagination would need monitoring, and the unreliable `fetch` behaviour would require Chrome-MCP-style rendering.

**Risks if reconsidered:** Policy could change (city council could amend Uchwała 466/XL/2019 to allow open flat auctions), but there is no evidence of this in any recent BIP entry or council agenda.

**Effort if scope expanded to land plots:** Medium — HTML scraping is straightforward, pagination is predictable, but achieved-price extraction requires per-document fetch (~25–40 documents/year), and the `web_fetch` reliability issue would need a headless-browser workaround.

**VERDICT: NO-BUILD.** Lublin sells residential flats exclusively bezprzetargowo to sitting tenants; the open-auction stream contains zero lokale mieszkalne. Building a Lublin adapter would deliver only land-plot data, mismatched to the project's residential-auction focus. Revisit only if scope expands to land/commercial or if council policy changes.
