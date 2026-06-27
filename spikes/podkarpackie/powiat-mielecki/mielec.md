# Spike — Mielec (Podkarpackie · powiat mielecki)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort to confirm, but volume is the blocker — Medium confidence).

## TL;DR

Gmina Miejska Mielec (Prezydent Miasta) does auction municipal flats (`przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych`) — confirmed with a live Jan 2026 + Jun 2026 double-round example. The MZBM (Miejski Zarząd Budynków Mieszkalnych Sp. z o.o.) is NOT the seller here; it manages buildings and auctions commercial spaces only. The blocker is volume: only one lokal mieszkalny was found in the auction queue spanning late 2025–2026, and the same unit ran unsold through two rounds. Sporadic one-off sales rather than a feed. No machine-readable achieved-price stream found on BIP. Analogous to small-city gminas that sell flats only when clearing residual stock — not a reliable recurring data source.

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** Prezydent Miasta Mielca runs `przetarg ustny nieograniczony (licytacja)` for `lokal mieszkalny` (separate ownership of a flat) from the Gmina Miejskiej Mielec stock.

Live example confirmed:
- **Lokal nr 15, Al. Niepodległości 5, Mielec** — 73.43 m², 4th floor, 3 rooms + kitchen/bath, KW nr TB1M/00102313/7. Starting price 410 000 PLN. Wadium 25 000 PLN.
- 1st round: 22 January 2026, 09:00, UM Mielec ul. Żeromskiego 26, sala Jana Pawła II. Announced 16 Dec 2025.
- 2nd round (same unit): announced 8 June 2026 — 1st round went unsold.

The Wydział Gospodarki Miejskiej (ul. Żeromskiego 23, pok. 12, tel. 17 787 44 36) handles these.

Search results also surfaced earlier auctions: 2nd round on a `lokal mieszkalny` scheduled March 2023; auctions in May 2022. So this has occurred across at least 2022–2026, but always one flat at a time.

## 2. Where published? (hosts + boards, URLs)

Two primary publication channels, plus physical notice board:

| Channel | URL | Role |
|---|---|---|
| BIP Gminy Miejskiej Mielec | https://mielec.bip.gov.pl/ | Statutory primary publication (BIP) |
| City website — przetargi | https://www.mielec.pl/przetargi/ | HTML landing + PDF attachments |
| Physical notice board | UM Mielec, ul. Żeromskiego 26 | Statutory requirement |
| Local news (paid ads) | https://hej.mielec.pl/pl/651_artykuly-sponsorowane/ | Cross-posted paid announcements |

The BIP `/ogloszenia/` path returned only 2017-era content in a direct fetch — property auctions appear to be filed under a different BIP section (not `/ogloszenia/`). The BIP page `mielec.bip.gov.pl/ogloszenia/137218_ogloszenie-o-przetargu.html` was confirmed by search snippet to contain the Jan 2026 przetarg. A dedicated przetargi platform also exists: https://przetargi.um.mielec.pl/ (used for public contracts, not property sales).

**Achieved-price notices**: Required by law (Rozporządzenie w sprawie sposobu i trybu przeprowadzania przetargów) to be published within 7 days after the auction. Not found as a machine-readable stream; not prominently indexed. Would require dedicated BIP scraping or manual lookup.

## 3. Format + rendering

- **Announcements on mielec.pl/przetargi/**: Standard WordPress CMS page. Full announcement text is embedded as HTML or links to a text-PDF attachment.
- **PDF format**: Text-PDF (not scanned), machine-readable — confirmed by fetching `https://www.mielec.pl/wp-content/uploads/2025/07/ogloszenie-o-przetargu.pdf` (July 2025 commercial space auction; same template used for flats). Clean structured text, no OCR required.
- **BIP pages**: Standard Polish BIP CMS (govCMS-based), HTML article pages, plain text body. No auth gate. No bot block observed.
- **hej.mielec.pl cross-posts**: Article HTML with full announcement body embedded (confirmed live fetch).
- **SPA / JS wall**: None observed. Static HTML.

## 4. Volume + achieved-price stream

**Volume: VERY LOW.** Evidence from 2022–2026 suggests at most 1–3 lokal mieszkalny auctions per year from the gmina. Key signal: the same lokal nr 15 at Al. Niepodległości 5 appeared in Jan 2026 (1st round) and Jun 2026 (2nd round, still active) — meaning it has not sold after 6+ months. No other gmina flat listings were found in the same period. The MZBM's przetargi page concerns only `lokale użytkowe` (commercial spaces) and maintenance contracts.

Comparison city Bytom runs 10–20+ flat auctions per year with rich result notices; Mielec appears to run ~1–2 per year at most.

**Achieved-price stream**: No publicly visible result-notice archive found on mielec.bip.gov.pl or mielec.pl. The law requires the Prezydent to publish informacja o wyniku przetargu within 7 days, but this was not indexable via search or direct BIP path fetch. Likely exists somewhere in BIP but not prominently organized, and volume is too low to be useful regardless.

## 5. Adapter effort + verdict

**Closest analog**: Not Bytom/Gliwice/Zabrze (high-volume, structured feeds). Closest is a small-city residual-stock seller. Within the existing codebase, the generic BIP scraper pattern would apply (similar to Tarnowskie Góry light-use case).

**Blockers**:
1. **Volume too low** — 1–2 flats/year from gmina does not justify adapter maintenance cost.
2. **No result-price stream** — achieved prices are not machine-readable; would require page-by-page BIP scraping with unpredictable URL structure.
3. **MZBM is NOT the flat seller** — MZBM only auctions `lokale użytkowe` for rent. No flat sales from housing manager.
4. **Two publication URLs** — mielec.bip.gov.pl + www.mielec.pl/przetargi/ would need dual monitoring.

**Risks**:
- The same unit appeared twice; hard to deduplicate without a stable ID per lokal.
- BIP URL for property auctions not confirmed (redirect issues in live fetch); may require crawl to discover correct path.

**VERDICT: NO-BUILD.** Flat auctions exist and are technically scraped (HTML + text-PDF, no auth, no SPA), but volume is too low (~1–2/year) to justify an adapter. If the project later adds a "sporadic/low-volume" tier or needs Podkarpackie coverage for completeness, this could be revisited at Low effort (2–3 days to wire scraper + dedup), but there is no achieved-price stream to drive the core value proposition.

---

**Sources:**
- https://hej.mielec.pl/pl/19_wiadomosci-z-regionu/635_miasto-mielec/104311_przetarg-na-sprzedaz-lokalu-mieszkalnego-w-mielcu.html (1st round Jan 2026 — LIVE fetch)
- https://hej.mielec.pl/pl/651_artykuly-sponsorowane/110441_gmina-miejska-mielec-oglasza-przetarg-na-sprzedaz-nieruchomosci.html (2nd round Jun 2026 — LIVE fetch)
- https://mielec.bip.gov.pl/ogloszenia/137218_ogloszenie-o-przetargu.html (BIP announcement, search-confirmed)
- https://www.mielec.pl/wp-content/uploads/2025/07/ogloszenie-o-przetargu.pdf (text-PDF format sample — LIVE fetch)
- https://mzbm.mielec.pl/przetargi/ (MZBM — commercial spaces only, confirmed)
- https://www.mielec.pl/przetargi/ (city przetargi portal)
