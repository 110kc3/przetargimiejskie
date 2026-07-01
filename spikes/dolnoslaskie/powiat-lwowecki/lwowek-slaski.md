# Spike — Lwówek Śląski (Dolnośląskie · powiat lwówecki)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Low effort).

## TL;DR
Gmina i Miasto Lwówek Śląski regularly sells municipal flats via *I/II/III przetarg ustny nieograniczony na sprzedaż*. Announcements and result notices (with achieved price) are published on the municipal BIP at `bip.lwowekslaski.pl` as standard HTML pages under a paginated `/wiadomosci/3/lista/przetargi` board. Format is plain HTML — no SPA, no auth, no scanned PDFs observed. Volume is low-to-medium (several flats per year). Closest analog to other small Dolnośląskie gmina BIPs already built (e.g. Złotoryja pattern). No blockers.

## 1. Sells municipal property at auction?
**YES — confirmed.** Burmistrz Gminy i Miasta Lwówek Śląski regularly announces oral unlimited auctions (*ustny przetarg nieograniczony*) for sale of *lokale mieszkalne*. Multiple confirmed examples:

- ul. Wąska 15 lok. 2 (20,80 m²) — I przetarg ustny nieograniczony, wadium 4 500 PLN (10%), 2024
- ul. Wąska 15 lok. 5 (52,30 m²) — I przetarg ustny nieograniczony, wadium 11 200 PLN, 2024
- ul. Tęczowa 1 lok. 2 (38,00 m²) — II przetarg ustny nieograniczony, wadium 10 000 PLN, 2024
- ul. Gryfowska 5 lok. 1 (23,80 m²) — I przetarg ustny nieograniczony (confirmed via listaprzetargow.pl aggregation)
- ul. Orzeszkowej 32–36 lok. 1 — listed in 2025 BIP przetargi index
- Gaszów nr 30 lok. 3 — listed in 2025 BIP przetargi index
- ul. Partyzantów 5 lok. 4 — result notice confirmed on BIP (informacja o wyniku I przetargu)

Both natural and legal persons may bid; participation requires 10% wadium deposited before auction date. Property also includes commercial and land parcels, but flat auctions are a recurring and distinct category.

## 2. Where published? (hosts + boards, URLs)
**Primary source — municipal BIP:**
- Announcement board: `https://bip.lwowekslaski.pl/wiadomosci/3/lista/przetargi`
- Year-filtered view: `https://bip.lwowekslaski.pl/struktura/1/34/dokumenty/3/lista/1/2025` (and `/2024`, `/2023`, etc.)
- Burmistrz organ page: `https://bip.lwowekslaski.pl/organy/168/dokumenty/3`
- Result notices (achieved price): published as individual BIP articles, e.g. `https://www.bip.lwowekslaski.pl/wiadomosci/3/wiadomosc/574644/informacja_burmistrza_gminy_i_miasta_lwowek_slaski_o_wyniku_i_pr`
- Lokale mieszkalne i użytkowe info page: `https://bip.lwowekslaski.pl/cms/2685/lokale_mieszkalne_i_uzytkowe`

**Secondary / aggregator (for cross-check):**
- `https://lwowecki.info` — local news site that re-publishes BIP auction notices with summary text (useful for volume audit but not primary source)
- `https://listaprzetargow.pl/oferty/30560` — national aggregator confirms flat przetargi category active

**Contact (fallback):** Urząd Gminy i Miasta, pok. 5, tel. (075) 647-78-72

## 3. Format + rendering
- **HTML** — standard BIP CMS pages (iBIP / eSOD class system common across Dolnośląskie). Article list is paginated HTML; individual notices are HTML text articles.
- **No SPA, no auth, no bot blocking** observed across multiple search-indexed pages.
- **XML export available** — BIP declares XML data export (noted in site structure search); may provide structured list endpoint worth checking.
- **PDFs** — not observed for property auction announcements; the result notices (`informacja o wyniku`) appear to be inline HTML text, not attached PDFs.
- **OCR not required.**
- Lwówecki.info re-publishes auction text verbatim — useful secondary parse target if BIP HTML structure changes.

## 4. Volume + achieved-price stream
- **Volume:** Low-to-medium. Roughly 3–8 flat auctions per year based on observed examples across 2024–2025. Mix of I, II, III przetargi (repeat auctions when no buyer at first attempt).
- **Achieved-price stream:** YES — BIP publishes `Informacja Burmistrza ... o wyniku przetargu` as separate articles on the same `/wiadomosci/3/` board. The ul. Partyzantów 5 lok. 4 result notice (ID 574644) confirms this pattern. These contain the final hammer price.
- **Cena wywoławcza** (opening price) is in the announcement notice; **cena osiągnięta** (achieved price) is in the result notice — both parseable from BIP HTML.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** Any small Dolnośląskie gmina BIP on iBIP CMS — same URL pattern (`/wiadomosci/3/lista/przetargi`), same article structure, same result-notice convention.
- **Effort:** LOW. Standard BIP HTML scraper. List pagination → article fetch → regex/DOM parse for property details, cena wywoławcza, wadium, date. Separate pass for `informacja o wyniku` articles to capture achieved price.
- **Blockers:** None identified. No rate-limiting on BIP observed (search indexing is clean). No auth. No CAPTCHA signals.
- **Risk:** Volume is low (3–8/year), so ROI per city is modest — but implementation cost is also low given CMS reuse.

**VERDICT: BUILD (Low effort)** — flat auctions via ustny przetarg nieograniczony confirmed, BIP HTML format, achieved-price notices present, no technical blockers.
