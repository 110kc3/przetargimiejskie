# Spike — Jasło (Podkarpackie · powiat jasielski)
> **Status:** spike LIVE — re-verified 2026-07-06. VERDICT: NO-BUILD (volume: 0 flat auctions 2023–2026; bezprzetargowo-dominant).

## TL;DR
Jasło (Miasto Jasło, ~36 k residents) does occasionally auction residential flats at *przetarg pisemny nieograniczony*, but the dominant disposal mode for municipal flats is *tryb bezprzetargowy* (direct sale to sitting tenants under 1998 City Council resolution). Only one flat auction was confirmed across all searches; land/commercial parcels dominate the przetarg stream. Volume needs on-site manual count before committing to BUILD.

## 1. Sells municipal property at auction?

**Yes — but flats are rare.** Confirmed evidence:
- **Flat auction found:** *Ogłoszenie o przetargu* (um.jaslo.pl/pl/ogloszenie-o-przetargu-3/) — *przetarg pisemny nieograniczony* for lokal mieszkalny 56.10 m², obr. 2 – Ulaszowice, cena wywoławcza 55 000 zł. This is a **written** (pisemny), not oral (ustny), auction.
- **Dominant flat mode is bezprzetargowy:** Multiple pages confirm flats at ul. 3 Maja 14/10, ul. Asnyka 10/25, ul. Kraszewskiego 1, ul. 3 Maja 14/13 are sold directly to tenants under Uchwała Nr LI/493/98 (1998). No *ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego* found.
- **Land/commercial auctions are routine:** Multiple *ustny przetarg nieograniczony* notices found for gruntowe niezabudowane parcels (Warzyce, Podzamcze, PGR district) — these are the main auction stream.

**Conclusion:** Flat auctions occur but are isolated and infrequent (≤1/year estimate); the gmina predominantly disposes of flats outside of competitive auction. The spike target (ustny przetarg nieograniczony na lokale mieszkalne) is not the dominant practice here.

## 2. Where published? (hosts + boards, URLs)

| Board | URL | Notes |
|---|---|---|
| Main city site — announcements | https://um.jaslo.pl/pl/category/aktualnosci/ogloszenia/ | CMS category page; both auction and bezprzetargowy notices |
| BIP (gov.pl hosted) | https://um_jaslo.bip.gov.pl/ | Official BIP; result notices published here (e.g. "Informacja Burmistrza... o wyniku przetargu") |
| BIP ogłoszenia subsection | https://um_jaslo.bip.gov.pl/ogloszenia/ | Auction-specific announcements |
| Aggregator mirror 1 | https://przetargi-gctrader.pl/ | Mirrors Jasło announcements (confirmed: "Informacja Burmistrza Miasta Jasła" page found) |
| Aggregator mirror 2 | https://otoprzetargi.pl/ | Mentioned in city notices as additional publication outlet |
| Result notices | Individual BIP articles under um_jaslo.bip.gov.pl | No dedicated results board URL confirmed; per-auction articles |

Physical board: Tablica ogłoszeń Urzędu Miasta Jasła, ul. Rynek 12 (contact: room 309, tel. 13 44 86 328).

## 3. Format + rendering

- **um.jaslo.pl:** Standard WordPress/CMS HTML. Auction details published as individual article pages with embedded text (not PDF). Clean scrape target.
- **um_jaslo.bip.gov.pl:** gov.pl BIP platform — HTML, same platform as other gov.pl BIPs. Consistent structure.
- **No SPA/auth/bot blocks detected** in search results. Pages return standard HTML.
- **No scanned PDFs** observed in flat auction announcements found; text is inline HTML.
- **No JSON/API endpoint** identified.
- Aggregator mirrors (gctrader, otoprzetargi) republish as HTML.

## 4. Volume + achieved-price stream

- **Flat auction volume:** Very low — 1 confirmed flat auction in all searches across 2019–2025. Most flat disposals are bezprzetargowy (direct-to-tenant). Land auctions are more frequent (~3–5+ per year visible in search results).
- **Achieved-price publication:** Result notices ("Informacja Burmistrza o wyniku przetargu") are published on BIP as individual articles. One such notice found in BIP index (dated 14-02-2022) but content could not be fetched (rate limit). No dedicated aggregated results table found.
- **Rate of flat auctions is insufficient to confirm viable scrape volume** without manual BIP audit.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Any small Podkarpackie miasto with low flat auction volume (similar to pattern seen in other small powiat seats).

**Blockers:**
1. **Volume blocker (primary):** Only ~1 flat auction confirmed across years. The site does not run *ustny przetarg nieograniczony na lokale mieszkalne* as a regular practice — flats go bezprzetargowy. Without ≥3–4 flat auctions/year, adapter ROI is negligible.
2. **Auction type mismatch:** The confirmed flat auction was *przetarg pisemny* (written/sealed-bid), not *ustny* (oral/open). Pisemny auctions may have different result disclosure norms.
3. **Result board fragmented:** No single URL lists achieved prices; each result is a separate BIP article requiring crawl of full ogłoszenia index.

**Effort if built:** Medium — two HTML sources (um.jaslo.pl + BIP), clean HTML, no auth. But volume likely does not justify build.

**Recommended next step:** Manual audit of um_jaslo.bip.gov.pl/ogloszenia/ going back 3 years to count flat auction notices. If ≥3 flat auctions/year confirmed → BUILD (Low-Medium effort). If <3 → NO-BUILD (bezprzetargowy city).

## Re-verify 2026-07-06

**Live 3-year audit (2023 → 2026-07) done via WebFetch/WebSearch. Result: 0 flat auctions in the window → NO-BUILD on volume.**

Method + evidence:
- **BIP retention too short for audit:** um_jaslo.bip.gov.pl/ogloszenia/ (pagination `articles/index/ogloszenia/page:N/`) holds only 9 pages spanning ~25.03.2026 → 02.07.2026 (~3 months, mostly obwieszczenia/elections). No flat auction in it. The audit therefore ran on um.jaslo.pl site search (WordPress, 154-page ogłoszenia category; search index reaches back to 2017).
- **Full sweep of `um.jaslo.pl/pl/?s=lokal+mieszkalny+przetarg` (all 6 result pages):** ~25 lokal-mieszkalny items, **every one a "wykaz … przeznaczonych do sprzedaży" (tenant sale), zero "ogłoszenie o przetargu" for a flat**. Sampled Kościuszki 20/5 (publ. 27.08.2025): "sprzedaży w drodze bezprzetargowej na rzecz najemcy", 75 300 zł after 70% bonifikata — classic sitting-tenant sale. Addresses cycling 2023–2026: Kościuszki 20/x, Kraszewskiego 1/x, 3 Maja 14/x + 35/x, Baczyńskiego 4/x, Asnyka 10/25, Kadyiego 14/7, Słowackiego 7/15, Kazimierza Wielkiego 5/4.
- **The one known flat auction is OUTSIDE the window and pisemny:** um.jaslo.pl/pl/ogloszenie-o-przetargu-3/ = *przetarg pisemny nieograniczony*, lokal mieszkalny 56.10 m² Ulaszowice, 55 000 zł — **published 2020** (Informacja Burmistrza o przetargu dated 10.06.2020 refers to the same lot). Search `?s="przetarg ustny"+lokal+mieszkalny` on um.jaslo.pl: no flat hits, land only.
- **Current ustny stream is land + restricted shares:** June 2026 ustny auctions are gruntowe parcels (Podzamcze, PGR, Warzyce); the 29.06.2026 "Wykaz udziałów … przetargu ustnego ograniczonego" is co-ownership shares (ograniczony, pre-emption/co-owner restricted, details in PDF) — not an open flat stream. Aggregator cross-check (otoprzetargi/gctrader, 2024–2025): land + lokal użytkowy notices only.

**Count: ustny flat auctions 2023–2026 = 0; pisemny flat auctions 2023–2026 = 0; flat disposals in window = bezprzetargowa to tenants (1998 resolution practice confirmed still active through 2025).** Per heuristic (bezprzetargowo-dominant + ≤1 flat auction/yr — here 0/yr) → **NO-BUILD**.
