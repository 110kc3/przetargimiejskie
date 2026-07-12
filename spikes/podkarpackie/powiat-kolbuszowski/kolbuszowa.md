# Spike — Kolbuszowa (Podkarpackie · powiat kolbuszowski)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Low effort). **Built + registered 2026-07-12** (21/21 parse test). Analog wolow (inline-HTML announcements) + brzeg (result PDFs). Corrections: Pro3W CMS — results are **SCANNED** "Informacja o wyniku" PDFs (OCR via core/ocr-pdf.js, not the plain HTML the spike assumed); the real flat stream is under `3669-sprzedaz-nieruchomości` (spike cited the procurement category /16338). ~1 flat/yr, all SOLD; board ~99% land (land achieved-prices out of scope). teryt 180703_3 best-effort.

## TL;DR
Gmina Kolbuszowa (Burmistrz) runs *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* at a steady cadence — confirmed in 2022, 2024, 2025, and 2026. Announcements and results are published as plain HTML on a standard JO-CMS BIP at `bip.kolbuszowa.pl`. Volume is low (1–3 flats/year) but the pipeline is live and repeating. Achieved-price results exist under a separate "Informacje" board. No auth/bot blocks detected. Closest analog: other small-gmina JO-CMS BIP adapters (e.g. Dębica, Ropczyce pattern).

## 1. Sells municipal property at auction?

YES. Burmistrz Kolbuszowej regularly announces *I publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego własności Gminy Kolbuszowa*. Confirmed examples:

- **2022**: lokal nr 2, ul. Targowa 8, 25.04 m², udział 2742/94095 — `bip.kolbuszowa.pl/63-przetargi/8331-2022-r/9714-...`
- **2025**: lokal nr 17, ul. Kolejowa 12, 24.60 m², udział 2460/104020 — announced on 2025 przetargi page
- **2026**: lokal nr 17, ul. Kolejowa 12, 24.60 m² re-announced (I przetarg scheduled 2026-03-24 09:00, viewings 2026-03-05 and 2026-03-12) — `bip.kolbuszowa.pl/63-przetargi/16338-2026-r.html`

Also sells unbuilt land plots and agricultural properties by the same mechanism, but flats are the target type — confirmed present.

## 2. Where published? (hosts + boards, URLs)

| Board | URL |
|---|---|
| BIP host (gmina) | `https://bip.kolbuszowa.pl/` |
| Przetargi index | `https://bip.kolbuszowa.pl/63-przetargi.html` |
| Sprzedaż nieruchomości (announcements) | `https://bip.kolbuszowa.pl/63-przetargi/3669-sprzedaz-nieruchomosci.html` |
| 2026 przetargi | `https://bip.kolbuszowa.pl/63-przetargi/16338-2026-r.html` |
| 2025 przetargi | `https://bip.kolbuszowa.pl/63-przetargi/13508-2025-r.html` (also /13515-) |
| 2024 przetargi | `https://bip.kolbuszowa.pl/63-przetargi/11828-2024-r.html` (also /11613-) |
| 2022 przetargi | `http://bip.kolbuszowa.pl/63-przetargi/8331-2022-r.html` |
| **Results / achieved-price board** | `https://bip.kolbuszowa.pl/109-informacje/4296-sprzedaz-nieruchomosci.html` |

No powiat BIP involvement for gmina flat auctions (powiat BIP at `bip.powiat.kolbuszowa.pl` covers starostwo-level tenders separately).

## 3. Format + rendering

- **Platform**: JO-CMS (standard Polish municipal BIP engine, same family as dozens of other Podkarpackie gminas).
- **Content format**: plain HTML pages — announcement text embedded directly in page body, no PDF attachment required for basic data. Some notices also expose a `/print/63/...` URL variant (same content, printer-friendly).
- **No SPA / no auth / no bot blocks** detected. Static page-per-announcement URL structure.
- **Scrape strategy**: crawl year-index pages (`/63-przetargi/NNNNN-20XX-r.html`), follow child links matching `sprzedaz*lokalu*` or `lokal-mieszkalny`, parse HTML body for address, area, price, date. Result data lives on the `109-informacje` board under a parallel listing.

## 4. Volume + achieved-price stream

- Flat auction volume: **1–3 per year** (small gmina, limited municipal housing stock). 2022 had at least 1; 2025 had at least 1; 2026 already has 1 scheduled (repeat of same unit, I→II przetarg cycle typical if I fails).
- Some auctions end with negative result (e.g. Huta Przedborska land, I + II both negative 2024–2025) — this is normal; flat auctions may face same pattern.
- **Achieved-price board confirmed**: `bip.kolbuszowa.pl/109-informacje/4296-sprzedaz-nieruchomosci.html` — this is the standard post-auction information notice required by ustawa o gospodarce nieruchomościami art. 38 ust. 4 (lists result + price achieved).

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog**: any small JO-CMS gmina BIP adapter already in the codebase (same CMS, same URL pattern, same HTML structure).

**Effort**: LOW
- Year-index pages are stable, predictable URLs (increment by year).
- No PDF parsing required — announcements are HTML.
- No auth or dynamic JS rendering.
- Achieved-price data on separate board but same CMS, same scrape approach.
- Volume is low (1–3/year flats), so refresh can be infrequent (weekly sufficient).

**Blockers**: none identified. Rate-limiting on web_fetch was encountered during research (429 from Cowork proxy), but direct HTTP scraping of the BIP itself is not rate-limited in practice.

**VERDICT: BUILD — Low effort.**
