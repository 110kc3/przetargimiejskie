# Spike — Braniewo (Warmińsko-Mazurskie · powiat braniewski)
> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Miasta Braniewo (Burmistrz) sells municipal flats via **ustny przetarg nieograniczony** and **ustny przetarg ograniczony** directly from the city BIP. Both announcement and result notices (with achieved price) are published as HTML article stubs + attached PDFs on the same paginated list. No dedicated housing manager — auctions run directly through Urząd Miasta Braniewa, room 26. Volume is moderate: ~4–6 flat-auction events per year across 2–3 properties, each going through multiple rounds. BIP is static HTML (Logonet CMS), no auth, no JS wall, no SPA.

## 1. Sells municipal property at auction?
YES — confirmed LIVE. The BIP "Nieruchomości do sprzedaży" section contains:
- **Lokal mieszkalny nr 3, ul. Krasickiego 12** — przetarg ustny nieograniczony I (announced, result published 19.06.2026)
- **Lokal nr 8, ul. Plac Wolności 18** — przetarg ustny ograniczony (I + II rounds, results published)
- **Spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 9, ul. Hozjusza 5** — przetarg ustny nieograniczony (I, II, III rounds, results published)

All are genuine lokale mieszkalne, sold at open auction (not bezprzetargowo to tenants). Also sells land (działki) but flats are clearly in the mix.

## 2. Where published? (hosts + boards, URLs)
- **Primary BIP:** `http://bip.braniewo.pl/artykuly/120/nieruchomosci-do-sprzedazy` (paginated, 11 pages, ~110 entries total)
- **City site mirror:** `https://braniewo.pl/dla-mieszkancow/nieruchomosci-na-sprzedaz` (subset)
- **Aggregators:** `otoprzetargi.pl`, `przetargi-gctrader.pl` (auto-scraped copies, not canonical)
- **Physical boards:** Urząd Miasta Braniewa, ul. Kościuszki 111, Braniewo
- Result notices are published on the same BIP section, separate article per result

No dedicated housing manager / TBS / ZGM publishes these — it is the city office (Anna Kapusta / Agnieszka Swatowska, ref. metryczka on result article).

## 3. Format + rendering
- **HTML listing page** — Logonet CMS 2.9.0, clean server-rendered HTML, no JS required to read the list
- **Individual article stubs** — HTML with minimal body text (often just a heading), plus a **PDF attachment** containing the full announcement or result notice
- **PDFs** — standard text-PDF (not scanned), ~334 kB per result notice; directly downloadable at `http://bip.braniewo.pl/attachments/download/{id}`
- No auth, no bot blocks, no SPA. Standard pagination: `/artykuly/120/{page}/10/nieruchomosci-do-sprzedazy`
- RSS feed available: `http://bip.braniewo.pl/rss` (may include property items)

Achieved price is in the PDF attachment, not in the HTML stub — PDF parsing required for price extraction.

## 4. Volume + achieved-price stream
- 11 pages × ~10 entries = ~110 total records (announcements + results combined, all property types)
- Flat-specific events visible across pages 1–2: at least **5 distinct flat auction rounds** in 2025–2026, covering 3 different lokale mieszkalne
- Each property typically cycles through 2–4 auction rounds before sale or abandonment
- Estimated ~3–5 flat auction events per calendar year
- **Achieved price: YES** — result notices ("Wynik przetargu") are published as PDF attachments on the same BIP section, per-property. Price confirmed published (e.g. Krasickiego 12 result, 19.06.2026).

## 5. Adapter effort + verdict (closest analog; blockers)
**Closest analog:** standard Logonet-CMS BIP adapter (same platform as many other cities in this project).

**Scrape strategy:**
1. Paginate `bip.braniewo.pl/artykuly/120/{page}/10/nieruchomosci-do-sprzedazy` (11 pages)
2. Parse article titles to classify: flat announcement vs. flat result vs. land (filter by keywords: "lokal mieszkalny", "spółdzielcze własnościowe prawo do lokalu")
3. For result articles: download PDF attachment from `bip.braniewo.pl/attachments/download/{id}`, extract achieved price via pdfplumber/pypdf2
4. For announcement articles: parse HTML stub for starting price, wadium, date; fetch PDF for full details if needed

**Blockers:** None significant. PDFs are text-based (no OCR needed). No auth. Pagination is deterministic.

**Effort:** Low — Logonet CMS is already a known pattern; PDF parsing for price is the only added step vs. pure-HTML cities.
