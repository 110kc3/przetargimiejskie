# Spike — Jasło (Podkarpackie · powiat jasielski)
> **Status:** spike DESK — 2026-06-30. VERDICT: NEEDS-LIVE-VERIFY (Medium effort).

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
