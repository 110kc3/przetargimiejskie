# Spike — Radomsko (Łódzkie · powiat radomszczański)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: NO-BUILD (High confidence).

## TL;DR

Gmina Miasto Radomsko auctions only land plots (działki niezabudowane) via its BIP. Municipal flats
(lokale mieszkalne) are sold exclusively bezprzetargowo to sitting tenants. The flat-auction stream
that exists in Radomsko comes entirely from RSM (Radomszczańska Spółdzielnia Mieszkaniowa), a private
housing cooperative that has no legal or ownership relationship to the gmina. RSM's auctions cannot
be scraped as "municipal przetargi". There is no ZGM or equivalent housing manager running open
auctions on behalf of the city. The heuristic applies: generic city-BIP with land/commercial only
= NO-BUILD.

---

## 1. Sells municipal flats at auction?

**No — confirmed NO.**

The Urząd Miasta Radomska (Prezydent Miasta Radomska) publishes two types of property actions on
bip.radomsko.pl:

- **Ogłoszenia o przetargach na zbycie nieruchomości** (bip.radomsko.pl/bipkod/009/003) — all
  archived entries visible via Adradar cover only *działki niezabudowane* (unbuilt plots). Confirmed
  types: plots at ul. Malinowa, Starowiejska, Cicha, Telimeny, Kazimierza Pużaka, Jerzego
  Słowińskiego. Date range verified: Jan 2025 – Feb 2026. No lokal mieszkalny entry found in any
  auction announcement by Urząd Miasta.

- **Nieruchomości przeznaczone do zbycia** (bip.radomsko.pl/45) — wykaz page lists lokale mieszkalne
  (Miła 6, Plac 3 Maja 13, Piastowska 23, Rolna 4d/32, etc.) but explicitly as bezprzetargowy
  sales with tenant first-refusal rights (art. 34 ust. 1 pkt 3 ustawy o gospodarce
  nieruchomościami), not open auctions.

- **Informacja o wyniku przetargów** (bip.radomsko.pl/bipkod/009/007) — result notices exist for
  auctions on 30.09.2025, 14.10.2025, 18.11.2025, 24.02.2026; all relate to land plots per
  Adradar cross-reference.

**Conclusion:** ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych by the gmina = ZERO
instances found in any accessible archive. The typological pattern is land-only.

---

## 2. Where published? (hosts + boards, URLs)

### Gmina Miasto Radomsko — BIP (city hall)

| Board | URL | Notes |
|---|---|---|
| Auction announcements | https://bip.radomsko.pl/bipkod/009/003 | Land plots only; JS-rendered, empty via web_fetch |
| Auction results | https://bip.radomsko.pl/bipkod/009/007?showArchive=true | Same renderer; confirmed via search snippets |
| Nieruchomości wykaz | https://bip.radomsko.pl/45 | Flat sales bezprzetargowo listed here |
| Zamówienia publiczne | https://bip.radomsko.pl/bipkod/13500064 | Public procurement (services), irrelevant |

BIP system: **e-bip.pl / MegaBIP variant** hosted at bip.radomsko.pl. Pages are JavaScript
Single-Page App — web_fetch returns empty body on all tested URLs (confirmed three attempts).
Content is loaded dynamically; would require a headless browser or Chrome MCP to scrape.

### RSM — Radomszczańska Spółdzielnia Mieszkaniowa (private cooperative, NOT gmina)

| Board | URL | Notes |
|---|---|---|
| Przetargi page | https://rsm-radomsko.pl/przetargi/ | WordPress site, fully HTML-rendered |
| Flat auction PDFs | https://rsm-radomsko.pl/wp-content/uploads/YYYY/MM/YYYY_MM_DD_Przetarg_na_lokale_mieszkalne.pdf | Direct PDF links on the przetargi page |

RSM is a tenant-member cooperative (spółdzielnia mieszkaniowa), not a municipal housing manager.
Its flat auctions are open only to members or those eligible for membership per the statute —
not public open auctions in the sense of the ustawa o gospodarce nieruchomościami.

### PGK — Przedsiębiorstwo Gospodarki Komunalnej Sp. z o.o. Radomsko

BIP at bip2.pgk-radomsko.pl and bip.pgk-radomsko.pl. PGK handles communal services (waste,
utilities). Its archived przetargi are service/supply contracts, not property sales. No lokale
mieszkalne sales found. Not a housing manager in the ZGM sense.

---

## 3. Format + rendering

| Source | Format | Rendering | Auth/Bot blocks |
|---|---|---|---|
| bip.radomsko.pl | SPA (JavaScript, MegaBIP/e-bip.pl engine) | Client-side JS — empty HTML shell served to curl/web_fetch | No login required but JS mandatory; Cloudflare not detected |
| rsm-radomsko.pl | WordPress static HTML | Fully rendered server-side; PDF attachments for details | None detected |
| bip2.pgk-radomsko.pl | MegaBIP | JS-rendered | None detected |

The BIP at bip.radomsko.pl is a **hard SPA blocker**: three web_fetch attempts all returned empty
content. A headless browser (Playwright/Puppeteer) or Chrome MCP would be required to read it.
Individual item pages follow the pattern `/bipkod/009/003` with list rendered by JS fetch to a
REST endpoint. No publicly documented API found.

RSM PDFs are standard text PDFs (not scanned), named consistently by date pattern, directly linkable
from the przetargi page.

---

## 4. Volume + achieved-price stream

### Gmina auctions (land only)

Adradar records for Urząd Miasta Radomska: ~10–12 land-plot auctions per year (2025–2026 visible).
No flat auctions. No achieved-price data published openly (result notices on BIP are JS-rendered;
content not accessible via fetch).

### RSM flat auctions (cooperative, not municipal)

RSM has published flat-sale przetargi at roughly **monthly cadence** since at least early 2025.
Visible recurring lots: Jagiellońska 19 m 25, Jagiellońska 22 m 8, Piastowska 35 m 23, Starowiejska
9 m 9, Starowiejska 11 m 11, Starowiejska 17 m 13, L.Czarnego 11b m 62, Piastowska 35 m 11.
Some lots appear in 6+ consecutive monthly auctions (re-offered after no sale). Starting prices
visible on Adradar: ~155 850–286 500 zł (39–64 m²). No achieved-price publication found on the RSM
site (no results board).

**Achieved-price stream for any Radomsko source: ABSENT** (BIP results not fetchable; RSM has no
results board).

---

## 5. Adapter effort + verdict

### Closest analog

None of the existing adapters (Gliwice/Zabrze/Bytom/Kraków/Tarnowskie Góry) match well because
those all have municipal housing managers (ZGM, ZBK, etc.) publishing gmina-owned flat auctions.
Radomsko has no such entity. The closest structural analog would be a city that sells only land via
its BIP — but even that would be a lower-value target than the flat-auction cities.

### Blockers

1. **No gmina flat auctions exist** — the fundamental precondition for this project is absent. The
   gmina sells flats bezprzetargowo only.
2. **BIP is a hard SPA** — even if land-only auctions were worth scraping, the JS rendering would
   require a Playwright adapter (higher effort than static HTML cities).
3. **RSM is out of scope** — cooperative flat sales require RSM membership; they are not public
   municipal auctions; scraping them would not fulfil the project's intent.

### Risks

- The BIP wykaz page (bip.radomsko.pl/45) lists flat addresses; a casual observer might mistake
  these for auction listings. They are not — they are bezprzetargowy offers to sitting tenants.
- RSM flat listings have volume (monthly, 6–10 flats active at any time) but are inaccessible as
  "municipal" data without scope-change for the project.

### Verdict

**NO-BUILD.** Gmina Miasto Radomsko does not hold open auctions for municipal flats. The BIP
auction board is land-only. There is no ZGM/housing manager publishing flat przetargi on behalf
of the city. Effort to build an adapter would be wasted regardless of technical feasibility.

---

## Sources

- https://bip.radomsko.pl/bipkod/009/003 — Ogłoszenia o przetargach na zbycie nieruchomości
- https://bip.radomsko.pl/bipkod/009/007?showArchive=true — Informacja o wyniku przetargów
- https://bip.radomsko.pl/45 — Nieruchomości przeznaczone do zbycia (wykaz, incl. flat bezprzetargowo)
- https://przetargi.adradar.pl/p/a/1/pl/a/3070/Urz%C4%85d+Miasta+Radomska — Adradar: all Urząd Miasta Radomska auctions (LIVE-VERIFIED: all are działki)
- https://przetargi.adradar.pl/p/a/23709/Radomsko/przetargi?page=1&sort=termin_desc — Adradar: all Radomsko auctions by all organisers
- https://rsm-radomsko.pl/przetargi/ — RSM flat auction listings (LIVE-VERIFIED: WordPress, text PDF, monthly flat auctions by cooperative)
- http://bip2.pgk-radomsko.pl/przetargi/fc — PGK BIP przetargi (service contracts only)
