# Spike — Wadowice (Małopolskie · powiat wadowicki)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: NO-BUILD (Low effort if ever reconsidered; Low confidence BUILD would yield recurring listings).

## TL;DR

Gmina Wadowice does conduct *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* — confirmed. However, volume is critically low: one residential unit (ul. Sienkiewicza 3/3, 138.70 m²) has cycled through four failed auctions (2023) plus at least three rounds of negotiations (2024–2025), all with negative results. No flat has actually sold through auction in the tracked window. The gmina's recent active auction (March 2026) was for a commercial *lokal użytkowy* (najem, not sprzedaż). The BIP lives inside the Małopolska regional BIP portal (bip.malopolska.pl/umwadowice), which returned empty on direct fetch — JS-rendered. Announcements are mirrored to the city's own WordPress site (wadowice.pl), which renders clean HTML. No dedicated housing manager. Verdict: technically a valid source type, but de facto ONE stubborn unsold flat means zero practical scrape value until the portfolio renews.

## 1. Sells municipal property at auction?

YES — confirmed LIVE-VERIFIED via multiple primary sources.

- **Mechanism:** *przetarg ustny nieograniczony* (open oral auction) under art. 37 ust. 1 Ustawy o gospodarce nieruchomościami, conducted by Burmistrz Wadowic through Wydział Gospodarki Gruntami.
- **Residential flat confirmed:** Lokal mieszkalny nr 3, ul. Henryka Sienkiewicza 3, Wadowice, 138.70 m², KW KR1W/00025519/2. Uchwała Rady Miejskiej nr LIX/561/2023 authorised the sale.
- **Auction timeline for this one flat:**
  - 1st przetarg: before Sept 2023 — negative result
  - 2nd przetarg: 2023-11-30 (cena wywoławcza 680 000 zł) — negative result [LIVE-VERIFIED: full announcement text recovered]
  - 3rd przetarg: 2024 — negative result
  - 4th przetarg: 2024 — negative result
  - Rokowania 1: announced 2024-11-21 (Zarządzenie 0050.175.2024.GG) — negative result (31-01-2025, cena 420 000 zł)
  - Rokowania 2: announced 2025-05-15 (Zarządzenie 0050.316.2025.GG)
  - Rokowania 3: announced 2025-07-28 (Zarządzenie 0050.357.2025.GG)
  - Status as of June 2026: no confirmed sale; flat appears stuck

- **Recent commercial auction (2026):** March 2026, *przetarg ustny nieograniczony na najem* lokalu użytkowego 102 m², Plac Jana Pawła II 5 "Pod Lipką" — this is a **rental/najem**, not a sale (sprzedaż), and commercial not residential.
- **No dedicated housing manager / TBS / ZGM:** Gmina handles all property transactions directly via Wydział Gospodarki Gruntami at the Urząd Miejski. No separate housing company identified.

## 2. Where published? (hosts + boards, URLs)

Two parallel publication channels:

### Primary BIP (statutory)
- **Host:** `bip.malopolska.pl` (regional BIP platform, Małopolska Urząd Marszałkowski)
- **Gmina node:** `https://bip.malopolska.pl/umwadowice`
- **Ogłoszenia różne (where property auctions live):** `https://bip.malopolska.pl/umwadowice,m,294372,2017.html` (year-indexed)
- **2025 listings index:** `https://bip.malopolska.pl/umwadowice,m,450167,2025.html`
- **Individual article example:** `https://bip.malopolska.pl/umwadowice/Article/id,23773.html`
- **Result notices also posted here** per § 12 Rozporządzenia RM 2004 r.

### Secondary mirror (WordPress, cleaner HTML)
- **Host:** `wadowice.pl` (WordPress, city official site)
- **Department news feed:** `https://wadowice.pl/aktualnosci/wydzial-gospodarki-gruntami/` (paginated, 4 pages visible)
- **Result notices:** published as news articles, e.g. `https://wadowice.pl/informacja-o-wyniku-rokowan-na-sprzedaz-nieruchomosci/`
- **Process page:** `https://wadowice.pl/dla-mieszkancow/zalatw-sprawe/znajdz-swoja-sprawe/gospodarka-gruntami/sprzedaz-nieruchomosci/przetargowa/`

### Additional notice channels (per zarządzenia)
- Physical bulletin board at Urząd Miejski, Plac Jana Pawła II 23
- Local press: *Gazeta Krakowska* (for auctions with cena wywoławcza ≥ 100 000 EUR, regional coverage)

## 3. Format + rendering

| Channel | Format | Fetchable? |
|---------|--------|-----------|
| `bip.malopolska.pl/umwadowice` | **JS-rendered SPA** — direct web_fetch returns empty body | NO — needs JS execution (headless browser / Chrome MCP) |
| `wadowice.pl` (WordPress) | **Clean HTML** — full article text, tables, inline content | YES — web_fetch returns complete plain-text content |
| Result notice PDFs | PDF attachments hosted on wadowice.pl (e.g. `Zarzadzenie_nr_0050.175.2024.GG_.pdf`) | YES via URL — likely text PDF, not scanned |
| BIP file downloads | `bip.malopolska.pl/api/files/{id}` or `e,pobierz,get.html?id=...` | Probably direct binary — untested |

Key finding: `wadowice.pl` WordPress news category `wydzial-gospodarki-gruntami` is a clean RSS-style paginated HTML list that mirrors all BIP content. Full announcement text (including price tables) appears in the og:description and article body. **This is the practical scrape target.**

No auth/bot blocks observed on wadowice.pl. Standard Cloudflare/GA but no CAPTCHA or login wall seen. Standard User-Agent sufficient.

## 4. Volume + achieved-price stream

- **Active flat listings (sprzedaż):** 1 property tracked across entire visible 2023–2026 window
- **Sales completed at auction:** 0 confirmed (all auctions and negotiations resulted in "wynik negatywny")
- **Achieved-price stream:** non-existent — no successful sale has been announced; price dropped from 680 000 zł (Nov 2023) to 420 000 zł (Jan 2025 rokowania)
- **Commercial/rental activity:** 1 lokal użytkowy auction seen (Mar 2026, najem not sprzedaż — out of scope for "achieved price" tracking)
- **Historical depth:** Wydział Gospodarki Gruntami news feed has 4 pages (~32 items), mostly the one flat's repeated auction cycles plus land/procedural items. No evidence of multiple concurrent residential listings.
- **Assessment:** Volume is effectively 0 for purpose of a recurring data feed. Even if the flat eventually sells, the next residential auction cycle would likely be 1–2 years away.

## 5. Adapter effort + verdict

### Closest analog
Most similar to **Tarnowskie Góry** (single BIP node, WordPress mirror, occasional one-off residential sales), not Kraków or Gliwice (which have TBS/ZGM with dedicated ongoing feeds and volume).

### Technical architecture
If ever built, the adapter would be:
1. Scrape `wadowice.pl/aktualnosci/wydzial-gospodarki-gruntami/` (paginated HTML, no JS needed)
2. Filter for keywords: `przetarg`, `lokal mieszkalny`, `sprzedaż nieruchomości`
3. Parse article body (clean WordPress HTML, structured table inside announcement text)
4. Cross-reference BIP for official PDF attachments if needed
5. For result notices: same feed, filter for `wynik przetargu` / `informacja o wyniku`

**Effort rating: Low** (WordPress HTML, no auth, simple table parsing) — but only if there were listings to scrape.

### Blockers
- **Volume blocker (critical):** 1 residential property stuck in repeated failed auctions. Zero data stream value.
- **BIP primary channel is JS-rendered** (bip.malopolska.pl) — would require Chrome MCP or Playwright for the canonical source; however wadowice.pl mirror is sufficient.
- **No achieved-price stream:** all auctions ended negatively, so no price data exists to aggregate.

### Risks
- The Sienkiewicza flat may eventually sell or be withdrawn entirely — either way no new residential listings are visible in the pipeline.
- Gmina has no TBS or dedicated housing manager; residential sales depend entirely on ad-hoc Council resolutions (uchwały Rady Miejskiej) to designate individual properties for sale.
- Low population pressure (Wadowice ~19k residents, small municipal housing stock) means infrequent future supply.

### VERDICT: NO-BUILD

The gmina does technically conduct *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* (Q1 confirmed YES), but practical volume is 1 flat that has failed to sell across 4+ auctions over 2+ years. There is no ongoing data stream. The format is favourable (WordPress HTML, no JS) but there is nothing to scrape. Revisit only if a new residential auction cycle is announced via the Wydział Gospodarki Gruntami feed.

---

### Sources
- Announcement text (2nd przetarg, Nov 2023): https://przetargi.adradar.pl/przetarg/mieszkania/Wadowice/miasto/12516371
- Rokowania 1 announcement (Nov 2024): https://wadowice.pl/zarzadzenie-nr-0050-175-2024-gg-burmistrza-wadowic-z-dnia-21-listopada-2024-roku-w-sprawie-ogloszenia-rokowan-po-czwartym-przetargu-zakonczonym-wynikiem-negatywnym/
- Rokowania 1 result (Jan 2025): https://wadowice.pl/informacja-o-wyniku-rokowan-na-sprzedaz-nieruchomosci/
- Wydział Gospodarki Gruntami feed: https://wadowice.pl/aktualnosci/wydzial-gospodarki-gruntami/
- Commercial lokal auction (Mar 2026): https://wadowice.pl/gmina-oglosila-przetarg-na-lokal-w-samym-centrum-miasta/
- BIP node: https://bip.malopolska.pl/umwadowice
- Przetargowa procedure page: https://wadowice.pl/dla-mieszkancow/zalatw-sprawe/znajdz-swoja-sprawe/gospodarka-gruntami/sprzedaz-nieruchomosci/przetargowa/
- Adradar gmina index: https://przetargi.adradar.pl/p/a/41150/Wadowice/przetargi
