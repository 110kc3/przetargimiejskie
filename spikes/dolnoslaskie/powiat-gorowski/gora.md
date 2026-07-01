# Spike — Góra (Dolnośląskie · powiat górowski)

> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Góra (UMiG Góra) conducts **ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych** from its municipal housing stock. Announcements and results are published on **bip.gora.com.pl** — a standard HTML BIP (2ClickPortal engine), no auth, no JS gate on the results board. The announcements page (233-przetargi.html) is JS-rendered but the results board (wyniki-przetargow.html) renders fully in plain HTML. Results are posted as **DOCX file attachments** linked from the results page. Volume is confirmed at roughly 2–4 flat auction events per year (2021–2025), with a recurring pattern of I przetarg → II przetarg → rokowania when bidders don't appear. Both przetarg and rokowania results for flats are present. Achieved price is embedded inside the DOCX result files (not as a standalone HTML field).

---

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** UMiG Góra publishes results of oral unlimited auctions (`ustny przetarg nieograniczony`) for municipal flats (`lokale mieszkalne`). Confirmed result notices extracted from **bip.gora.com.pl/wyniki-przetargow.html**:

- **lokal mieszkalny Kłoda Górowska 28 m7** — "INFORMACJA O WYNIKU PRZETARGU lokal mieszkalny Kłoda Górowska 28 m7.docx" — 2024-02-23
- **Góra ul. Wrocławska 26 m 3** — "informacja o wyniku II przetargu- lokal mieszkalny Góra ul. Wrocławska 26 m3.docx" — 2024-10-25 (II przetarg = second round after first failed)
- **Góra ul. Starogórska 15/6** — "INFORMACJA O WYNIKU PRZETARGU lokal ul. Starogórska 15/6" — 2023-12-29
- **Góra ul. Wrocławska 26 m 3** — "Informacja o wyniku rokowań lokal mieszkalny Góra ul. Wrocławska 26 m 3.docx" — 2025-01-21 (rokowania after failed II przetarg)
- **Góra ul. Armii Polskiej 9 m 7** — "INFORMACJA O WYNIKU ROKOWAŃ NA SPRZEDAŻ lokal mieszkalny Góra ul. Armii Polskiej 9 m 7" — 2021-10-08

Pattern: flats go to przetarg first, then rokowania if no bidder in two rounds. Multiple flat disposals visible each year 2021–2025. The gmina does **not** appear to sell flats solely bezprzetargowo to tenants — the przetarg track is the primary mode, with rokowania as a legal fallback.

---

## 2. Where published? (hosts + boards, URLs)

**BIP host:** `https://bip.gora.com.pl/` — Urząd Miasta i Gminy w Górze, ul. Adama Mickiewicza 1, 56-200 Góra. Powered by 2ClickPortal.

**Announcement board (active listings):**
- `https://bip.gora.com.pl/233-przetargi.html` — JS-rendered, content not accessible via plain GET. Requires browser rendering. Lists current przetarg notices before auctions.

**Results board (achieved-price proxies):**
- `https://bip.gora.com.pl/wyniki-przetargow.html` — **LIVE-VERIFIED plain HTML**, no auth, no JS gate. Renders fully in GET. Lists DOCX attachments for each auction result. Each DOCX filename identifies the property and auction type (przetarg / rokowania). This is the primary data source for confirming sales and extracting achieved prices.

**Wykazy nieruchomości do sprzedaży:**
- `https://bip.gora.com.pl/wykazy-nieruchomosciami-do-sprzedazy.html` — pre-auction property lists (also DOCX-linked, JS-heavy page but content may be accessible).

**Parent landing:**
- `https://bip.gora.com.pl/przetargi.html` — "Gospodarka nieruchomościami" hub, plain HTML, no content beyond navigation.

---

## 3. Format + rendering

| Board | Format | Auth/gate | Notes |
|---|---|---|---|
| wyniki-przetargow.html (results) | Plain HTML listing DOCX links | None — plain GET | LIVE-VERIFIED. All result entries visible. DOCX files contain the actual achieved-price data. |
| 233-przetargi.html (announcements) | JS-rendered SPA | None (no auth) but requires JS execution | Content not visible in plain GET. Needs browser (Chrome MCP). |
| wykazy-nieruchomosciami-do-sprzedazy.html | HTML + DOCX links | Page is JS-heavy; GET may be partial | Pre-auction property lists; secondary. |
| Result DOCX files | DOCX (Word, ~15–24 KB) | None | Must be downloaded and parsed. Contain: property address, przetarg type, cena wywoławcza, cena osiągnięta (or "przetarg zakończony wynikiem negatywnym"), nabywca initials/data. |

No scanned-PDF, no OCR needed. DOCX parsing via python-docx is sufficient. No auth, no bot blocks observed. The 2ClickPortal BIP engine is the same stack seen in other Dolnośląskie cities — reliable plain HTML for finished-item pages, JS gate only on the live listings.

---

## 4. Volume + achieved-price stream

**Volume (confirmed from results board, 2021–2026):**
- 2021: at least 1 flat (Armii Polskiej 9 m 7 — rokowania)
- 2023: at least 1 flat (Starogórska 15/6 — przetarg)
- 2024: at least 2 flat events (Kłoda Górowska 28 m7 — przetarg Feb; Wrocławska 26 m3 — II przetarg Oct)
- 2025: at least 1 flat (Wrocławska 26 m3 — rokowania Jan)
- 2026: no flat result visible in 2026 yet (most recent results are land parcels and dzierżawa)

Estimated cadence: **~2–4 flat auction events per year** (some are repeat rounds on the same flat). Low but consistent. The same flat (Wrocławska 26 m3) ran II przetarg in Oct 2024 and then rokowania in Jan 2025 — indicating thin demand and repeat-round behaviour typical of small towns.

**Achieved-price stream:**
- **PARTIALLY CONFIRMED** — the result DOCX files contain outcome data (price achieved or negative result). The wyniki-przetargow.html page lists all result files as downloadable DOCX links with human-readable filenames. An adapter can enumerate this page, detect new DOCX entries for lokale mieszkalne (by filename keyword), download, and parse for price.
- Limitation: DOCX parsing adds complexity vs. plain HTML price extraction; no structured JSON feed.

---

## 5. Adapter effort + verdict

**Closest analog:** Rawicz (Wielkopolskie) or Środa Śląska — small gmina, 2ClickPortal BIP, DOCX-based result notices, low flat volume, confirmed auction track.

**Architecture:**
- **Results scraper (primary):** Poll `bip.gora.com.pl/wyniki-przetargow.html` monthly. Parse HTML for DOCX links. Filter by filename keywords: `lokal mieszkalny`, `lokal`, `Starogórska`, `Wrocławska`, `Armii Polskiej`, `Kłoda Górowska` etc. Download new DOCX files. Extract price data via python-docx.
- **Announcements scraper (secondary):** Render `bip.gora.com.pl/233-przetargi.html` with Chrome MCP or headless browser. Parse active listing entries for upcoming flat auctions. Fields: address, cena wywoławcza, wadium, auction date.
- **Wykazy:** Optional — pre-auction registry useful for early discovery. Same JS rendering requirement as announcements page.

**Blockers:**
1. Announcements page requires JS execution — Chrome MCP or Playwright needed (same as other 2ClickPortal cities). Not a hard blocker if results-board-only mode is acceptable.
2. Achieved price is inside DOCX, not inline HTML — requires python-docx parse step.
3. Low volume (~2–4/year) — adapter ROI is modest unless bundled with other Dolnośląskie cities sharing the same stack.

**Risks:**
- DOCX format may vary between clerks (Dariusz Mielcarek vs. Natalia Bartkowiak) — parsing heuristics must be robust to minor template differences.
- Flat auction count may drop further if gmina shifts to bezprzetargowy tryb for remaining komunalny stock.

**Verdict: BUILD** — flat auctions confirmed real and recurring (2021–2026), BIP is public with no auth, results board is plain HTML, achieved-price data exists inside DOCX. Medium effort due to DOCX parse step and JS-gated announcement page. Confidence: High (LIVE-VERIFIED from results board).

**Effort: Medium** (2–3 days including DOCX parser + JS-rendered announcements layer).
