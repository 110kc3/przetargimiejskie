# Spike — Bydgoszcz (Kujawsko-Pomorskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Bydgoszcz runs confirmed *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych* through the city BIP (bip.um.bydgoszcz.pl), published by Wydział Mienia i Geodezji. Flat auctions are a genuine, recurring stream — multiple active listings live on 2026-06-27, including one reaching VII round (ul. H.Sienkiewicza 37m2). Result notices exist on the same BIP board but achieved price is buried in a DOCX attachment, not in the HTML body — this is the one structural wrinkle vs. Gliwice/Zabrze. Everything else is a clean server-rendered BIP with stable URL patterns. BUILD is justified; the DOCX-parse step for prices is medium complexity.

---

## 1. Sells municipal property at auction?

**Yes — confirmed, including residential flats (lokale mieszkalne).**

The Prezydent Miasta Bydgoszczy actively runs *przetarg ustny nieograniczony* on:
- **Residential flats (lokale mieszkalne):** confirmed active listings on 2026-06-27. Title pattern: `Lokal przeznaczony do sprzedaży w drodze przetargu ustnego nieograniczonego`. Examples live at time of research:
  - ul. Grunwaldzka 90m3 — I przetarg, date 31.07.2026 ([link](https://bip.um.bydgoszcz.pl/artykul/1208/10367/lokal-przeznaczony-do-sprzedazy-w-drodze-przetargu-ustnego-nieograniczonego-w-dniu-31-07-2026-r-ul-grunwaldzka-90m3))
  - ul. H.Sienkiewicza 37m2 — **VII przetarg**, date 09.07.2026 ([link](https://bip.um.bydgoszcz.pl/artykul/1208/10271/lokal-przeznaczony-do-sprzedazy-w-drodze-przetargu-ustnego-nieograniczonego-w-dniu-09-07-2026-r-ul-h-sienkiewicza-37m2)) — indicates stubborn stock, multiple failed rounds
  - ul. Piotrowskiego 5m9 — II przetarg, date 09.07.2026 ([link](https://bip.um.bydgoszcz.pl/artykul/1208/10270/lokal-przeznaczony-do-sprzedazy-w-drodze-przetargu-ustnego-nieograniczonego-w-dniu-09-07-2026-r-ul-piotrowskiego-5m9))
  - ul. Garbary 9m4 — I przetarg, date 30.06.2026 ([link](https://bip.um.bydgoszcz.pl/artykul/1208/9987/lokal-przeznaczony-do-sprzedazy-w-drodze-przetargu-ustnego-nieograniczonego-w-dniu-30-06-2026-r-ul-garbary9m4))
  - ul. Brzozowa 8Am2 — I przetarg announced then cancelled (odwołany), rescheduled ([link](https://bip.um.bydgoszcz.pl/artykul/1208/10190/lokal-przeznaczony-do-sprzedazy-w-drodze-przetargu-ustnego-nieograniczonego-w-dniu-30-06-2026-r-ul-brzozowa-8am2))
- **Land (nieruchomości niezabudowane/zabudowane):** also frequent — ul. Szamarzewskiego (III przetarg, 28.07.2026), ul. Rajska, ul. Fordońska, etc.
- **Buildings (nieruchomości zabudowane):** ul. Piekary 5-7, ul. Rajska 2, etc.

**Key nuance on flat selection criteria:** city policy restricts *przetarg* for flats to those meeting at least one criterion: area <25 m² or >80 m², attic/basement location, average height <2.40 m, or requiring renovation >30% of replacement value. Standard-size, standard-condition flats normally go *bezprzetargowo* to sitting tenants at 98% discount. This means the flat-auction stream is real but skews toward marginal/difficult stock. Volume is moderate (city population ~340K).

**ADM (Administracja Domów Miejskich):** ADM is the city's housing manager (bip.adm.com.pl) but does NOT run flat-sale auctions — ADM publishes procurement tenders for renovation works and manages property leases. All flat-sale przetargi are published exclusively through the city BIP.

---

## 2. Where published? (hosts + boards, with URLs)

**Single authoritative host:** `bip.um.bydgoszcz.pl`

| Board | URL | Content |
|---|---|---|
| Ogłoszenia o przetargach na zbycie nieruchomości | https://bip.um.bydgoszcz.pl/artykuly/1208/ogloszenia-o-przetargach-na-zbycie-nieruchomosci | All auction announcements + result notices, paginated (10/page, currently 2 pages = ~20 active items) |
| Wykaz nieruchomości przeznaczonych do zbycia | https://bip.um.bydgoszcz.pl/artykuly/1071/wykaz-nieruchomosci-przeznaczonych-do-zbycia | Pre-auction listing register |
| Nieruchomości miejskie (parent section) | https://bip.um.bydgoszcz.pl/artykuly/1061/nieruchomosci-miejskie | Navigation hub |

**Result notices ("informacja o wyniku przetargu")** are published on the **same board** (artykuly/1208), not a separate section. Example live result: [ul. Wyszogrodzka 11 — wynik II przetargu 18.06.2026](https://bip.um.bydgoszcz.pl/artykul/1208/10388/informacja-o-wyniku-ii-przetargu-przeprowadzonego-w-dniu-18-06-2026-r-ul-wyszogrodzka-11-dz-nr-156-3-156-2-obr-341).

Individual article URL pattern: `https://bip.um.bydgoszcz.pl/artykul/1208/{article_id}/{slug}`

**Pagination URL pattern:** `https://bip.um.bydgoszcz.pl/artykuly/1208/{page}/{per_page}/ogloszenia-o-przetargach-na-zbycie-nieruchomosci`

**Responsible department:** Wydział Mienia i Geodezji (WMG), signatory: Prezydent Miasta Bydgoszczy. Reference codes follow pattern `WMG-V.6840.{N}.{year}` (lokale) and `WMG-II.6840.{N}.{year}` (land/buildings).

**ADM BIP** (bip.adm.com.pl): confirmed not a source for flat-sale auctions. Can be ignored for this use-case.

---

## 3. Format + rendering

| Attribute | Detail |
|---|---|
| Rendering | Server-rendered HTML (Logonet CMS v2.9.0) — full content in response body, no JS required |
| Index page | HTML list of article stubs with title + 1-line description; paginated, 10 or 5/25 items per page |
| Individual article | Minimal HTML stub: title, 1-2 sentences of summary, publication date range, reference code. **Main content is in attachments.** |
| Attachments | PDF (announcement) + DOC/DOCX (announcement copy) + PDF (floor plan/rzut lokalu) for new listings. Result notices: DOCX only (e.g. `informacja-o-wyniku*.docx`, 20 kB) — **achieved price is inside the DOCX, not the HTML body** |
| TLS | Standard HTTPS, no auth, no bot blocks observed during live fetch |
| XML feed | Available: `https://bip.um.bydgoszcz.pl/artykuly/xml/1208/{page}/1` — useful for polling |
| RSS | Site-level RSS at `https://bip.um.bydgoszcz.pl/rss` |
| Archive BIP | Historical data at `archiwumbip.um.bydgoszcz.pl` (old system, static HTML) |

**Critical constraint:** Achieved price (cena wywoławcza + cena uzyskana) is stored in a DOCX attachment on the result-notice pages, not in the HTML. To extract the achieved price, the adapter must: (1) detect "informacja o wyniku" articles, (2) download the DOCX attachment, (3) parse price from DOCX body.

---

## 4. Volume + achieved-price stream

**Flat-auction volume (lokale mieszkalne):** approximately 4–7 active flat listings at any one time based on live observation (2026-06-27 snapshot). Some units reach VI–VII round, indicating slow-moving stock. Monthly cadence: roughly 2–4 new flat auction announcements per month. For a 340K-population city this is moderate — lower density than Gliwice/Zabrze but a genuine recurring stream.

**Land/building auctions:** also frequent, mix of city-owned and Skarb Państwa. These add volume to the same board but are separate from the flat stream.

**Result notices:** published on same board 7–10 days after auction date (observed: auction 18.06.2026 → wynik published 26.06.2026). Result notice announces outcome but all price data is in DOCX.

**Achieved-price stream:** POSSIBLE but requires DOCX parsing. The DOCX files are small (20–50 kB), born-digital (not scanned), so extraction via python-docx or similar is straightforward. This is the primary technical risk vs. analogues where price appears inline in HTML.

---

## 5. Adapter effort + verdict

**Closest analogs:** Gliwice / Zabrze (same Logonet CMS, same BIP article structure, same single-board mix of announcements + results). The BIP platform and URL patterns are essentially identical.

**Delta vs. Gliwice:**
1. **DOCX parse for achieved price** — Gliwice result notices expose price in HTML; Bydgoszcz puts it in a DOCX attachment. Adds ~1 day of work for a `python-docx` extraction step.
2. **Flat-selection policy** — only atypical flats (edge size/condition) go to przetarg; standard flats go bezprzetargowo. The adapter will only see the edge-case slice of the housing stock, not the full market. Acceptable for aggregation purposes but worth noting in UI.
3. **No dedicated housing manager BIP** — unlike some cities with a separate TBS or ZBM BIP, Bydgoszcz is single-source.

**Blockers:** None hard. DOCX parse is the only non-trivial addition.

**Risks:**
- Archive rotation: BIP only shows ~20 items (2 pages) at a time; older items may drop off. Polling cadence should be daily.
- DOCX structure may vary across older vs. newer result notices — needs a small corpus of DOCX samples before finalising the price-extraction regex.
- ADM announced a Fordońska 120 sale in the past via Kujawsko-Pomorski Urząd Wojewódzki channel — if ADM ever publishes flat sales separately, the feed could be missed. Low risk; current evidence is that all city flat sales go through UM BIP.

**Effort estimate:** Medium (2–3 days). BIP scraper = 0.5 day (copy from Gliwice adapter). DOCX price extraction = 1 day. Testing + integration = 0.5–1 day.

**VERDICT: BUILD — Medium effort.**

Single reliable source (bip.um.bydgoszcz.pl/artykuly/1208), server-rendered HTML, no auth, confirmed flat-auction stream with recurring cadence, result notices on same board. Only non-trivial step is DOCX price extraction. Closest analogy: Gliwice adapter + python-docx attachment step.
