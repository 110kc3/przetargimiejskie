# Spike — Krotoszyn (Wielkopolskie · powiat krotoszyński)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort if reversed — see §5).

## TL;DR

Gmina Krotoszyn (Miasto i Gmina Krotoszyn, Burmistrz Natalia Robakowska) does conduct *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* — confirmed with a live auction notice dated 23 June 2026 — but volume is extremely low: one flat at a time, in rural sołectwa (Orpiszewo), repeatedly failing to sell (I → II → presumably III). The primary flat-disposal channel is *bezprzetargowy* sale to existing tenants (Zarządzenie Nr 1542/2022). The BIP portal is JS-rendered and returns blank HTML to web_fetch; announcements reach the public only via the local news portal ikrotoszyn.pl (paid official notices). No dedicated housing manager publishes flat-sale przetargi — it is the Urząd Miejski itself (Wydział Gospodarki Przestrzennej). Achieved-price notices not found published online. **Volume too low and BIP too opaque for a viable adapter.**

## 1. Sells municipal property at auction?

**Yes, but barely — and flats are a marginal edge case.**

Two confirmed modes:

1. **Bezprzetargowy sprzedaż lokali mieszkalnych na rzecz głównych najemców** — the dominant channel. Zarządzenie Nr 1542/2022 Burmistrza Krotoszyna (14 July 2022) listed 7 flats across central Krotoszyn (ul. Konstytucji 3 Maja, ul. Koźmińska, ul. Przemysłowa, os. Szarych Szeregów) for priority sale to sitting tenants at appraiser price (87 790 – 215 817 PLN). These never go to open auction.
   - Source: `https://bip.um.krotoszyn.pl/api/files/151115` (PDF — readable directly)

2. **Przetarg ustny nieograniczony** for residual flats nobody wants to buy directly (vacant, rural, run-down). Confirmed example (2026):
   - I przetarg: 14 April 2026, Orpiszew ul. Raszkowska 19/3, 53.14 m², cena wywoławcza 99 000 PLN — **failed** (no buyer).
   - II przetarg: 28 July 2026, same flat, same price — pending.
   - Source: `https://ikrotoszyn.pl/news,ogloszenie-o-drugim-przetargu-ustnym-nieograniczonym,17628.html` (LIVE-VERIFIED)
   - Source: `https://ikrotoszyn.pl/news,pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-w-budynku,17095.html`

Confirmed phrase in the official notice: **"ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego usytuowanego w budynku wielorodzinnym"** — so the legal form matches the target criterion, but this represents one property on its second failed round.

Land auctions run at a higher cadence (confirmed: III przetarg on garage plots in Biadki, 2 June 2026; przetarg ograniczony for land). **Flat auctions: roughly 1–2 properties/year, all rural sołectwa, repeatedly unsold.**

## 2. Where published? (hosts + boards, URLs)

| Channel | URL | Notes |
|---|---|---|
| BIP Urzędu Miejskiego — main index | `https://www.bip.um.krotoszyn.pl/m,4569,sprzedaz-gruntow-i-nieruchomosci-dzierzawy.html` | JS-SPA — blank to web_fetch; individual article URLs work as PDF/redirect |
| BIP individual article (example) | `https://bip.um.krotoszyn.pl/a,106734,...html` | Returns blank HTML (JS-rendered) |
| BIP PDF attachments | `https://bip.um.krotoszyn.pl/api/files/{id}` | PDFs served directly — readable |
| ikrotoszyn.pl (local news portal) | `https://ikrotoszyn.pl/newses,przetargi-ogloszenia-urzedowe.html` | Paid official notices re-published here as HTML articles; this is the *de facto* public board |
| Physical board | Urząd Miejski, ul. Kołłątaja 5/7, Krotoszyn | Required by law; contact: mikolaj.guziak@um.krotoszyn.pl, tel. 62 722 74 32 |
| PGKiM Krotoszyn | `https://pgkimkrotoszyn.pl/` | Housing manager (water/sewage/housing/sanitation) — publishes *najem* (rental) tenders, NOT flat sales |

**Result notices (achieved price):** Not found published online. The BIP section title is "Sprzedaż gruntów i nieruchomości / dzierżawy / najem" — no separate "informacja o wyniku" sub-board discovered. Legal obligation requires posting for 7 days on physical board only.

## 3. Format + rendering

| Layer | Finding |
|---|---|
| BIP main listing | **SPA / JS-rendered** — `bip.um.krotoszyn.pl` returns `<title>Biuletyn Informacji Publicznej</title>` with empty body to static fetchers. No content without JS execution. |
| BIP individual article pages | Same — blank HTML shell. |
| BIP PDF attachments (`/api/files/`) | **Text PDF** — readable directly (confirmed: Zarządzenie 1542/2022 parsed cleanly with full table data). |
| ikrotoszyn.pl notice pages | **Static HTML** — fully readable without JS (confirmed live). Rich text, full auction details, structured paragraphs. No auth, no bot block observed. |
| Auth/bot blocks | None detected on ikrotoszyn.pl. BIP portal appears standard nv.pl/eBOI stack. |

Scraping path: ikrotoszyn.pl is readable, but it is a *news republication* of official notices — not the authoritative source, may lag, may omit some notices, and carries no result data.

## 4. Volume + achieved-price stream

- **Flat auction volume:** ~1 flat/year entering open auction (the bezprzetargowy channel handles the rest). The one tracked case (Orpiszew 2026) is on its second round, suggesting demand near zero.
- **Achieved-price data:** No online stream found. The BIP does not publish "informacja o wyniku przetargu" pages in a discoverable form. Prices would need to be obtained by physical inspection of the board or phone/email inquiry to Wydział Gospodarki Przestrzennej (mikolaj.guziak@um.krotoszyn.pl).
- **Land/commercial auction volume:** Higher — confirmed III przetarg on land plots (Biadki), przetarg on developed property (ul. Zdunowska 35). These are potentially scrapeable from ikrotoszyn.pl but are out of scope for flat aggregation.

## 5. Adapter effort + verdict

**Closest analog:** None of the reference adapters (gliwice/zabrze/bytom/krakow/tarnowskie-gory) — those are urban gminas with dedicated housing companies (ZBM, ZGM) publishing dozens of flat auctions/year. Krotoszyn is structurally closer to a small rural gmina that occasionally auctions off a single unwanted flat through the Urząd.

**Blockers:**
1. **BIP is JS-SPA** — the listing index cannot be scraped with a static HTTP fetcher; would require a headless browser (Playwright/Puppeteer) to enumerate articles.
2. **Volume too low** — 1 flat/year, repeatedly failing to sell, in a village 10 km from the city centre. Not a meaningful signal stream.
3. **No achieved-price online stream** — result notices are not published online; the data gap cannot be bridged without human outreach.
4. **ikrotoszyn.pl is a secondary source** — republishes paid official notices but is not exhaustive and has no result data.

**Risks if built anyway:**
- BIP JS-rendering means the scraper depends on a headless browser staying stable against eBOI platform updates.
- Notice republication on ikrotoszyn.pl may lag by days or be omitted for some categories.
- The single flat in circulation may sell (or not) and leave a zero-event adapter for months.

**Effort if reversed to BUILD:** Medium — would need headless-browser scraper for BIP index (or ikrotoszyn.pl as proxy), PDF parser for attachment-type notices, and a manual/email lookup for achieved prices. Adapter code ~2–3 days; ongoing data value near zero.

**VERDICT: NO-BUILD** — volume is too low (1 flat/year in open auction), achieved-price data is offline-only, and the BIP requires headless rendering. The gmina's dominant flat-disposal method is bezprzetargowy tenant sale. Revisit only if a dedicated housing company (ZGM/TBS) is ever established for Krotoszyn that publishes its own flat-auction board.
