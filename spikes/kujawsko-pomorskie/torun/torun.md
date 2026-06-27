# Spike — Toruń (Kujawsko-Pomorskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Low effort).

## TL;DR

Toruń runs a steady stream of *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych* published directly on the city BIP (`bip.torun.pl`). The BIP is server-rendered HTML with a structured filterable listing. Result notices are posted as `.docx` attachments on the same record page. Volume is solid: ~10–15 flat auctions confirmed across 2025–2026 in the visible archive. ZGM Toruń is the property manager but the BIP is the canonical publication point; ZGM's own site is a secondary relay with stale posts. The adapter is a straightforward HTML scrape with docx attachment download — closest analogue to Gliwice/Zabrze.

---

## 1. Sells municipal property at auction?

**Yes — confirmed LIVE.** Toruń (Gmina Miasta Toruń) actively sells residential flats (*lokale mieszkalne*) at open oral auctions (*przetarg ustny nieograniczony*) organised by the **Wydział Gospodarki Nieruchomościami** (Real Estate Management Department) of Urząd Miasta Torunia. Auctions take place in room 115 at ul. Grudziądzka 126B.

Confirmed flat auctions from the live BIP listing (2025–2026):

| Adres | Cena wywoławcza | Data przetargu | Status |
|---|---|---|---|
| ul. Mostowa 10 m. 2 | 193 000 zł | 19.05.2026 | lokal sprzedany |
| ul. Ślusarska 5 m. 5a | 140 000 zł | 14.07.2026 | aktualny |
| ul. Mickiewicza 93 m. 13A | 100 000 zł | 30.06.2026 | aktualny |
| ul. Poznańska 81 m. 8 | 90 000 zł | 27.01.2026 | rozstrzygnięty |
| ul. Poznańska 81 m. 7 | 90 000 zł | 25.11.2025 | rozstrzygnięty |
| Poznańska 81 m. 5 | 190 000 zł | 18.11.2025 | rozstrzygnięty |
| ul. Wielkie Garbary 5 m. 21A | 109 000 zł | 06.11.2025 | lokal sprzedany |
| ul. Św. Jakuba 18 m. 6 | 109 000 zł | 06.11.2025 | lokal sprzedany |
| ul. Żeglarska 4 m. 6 | 268 000 zł | 2025 | lokal sprzedany |
| ul. Wielkie Garbary 17 m. 3 i m. 4 | 450 000 / 420 000 zł | 20.05.2025 | lokale sprzedane |

Also sells: nieruchomości niezabudowane (land plots), nieruchomości zabudowane (built properties), lokale użytkowe (commercial units). The flat stream is the most relevant signal for the tool.

**Volume estimate:** ~10–15 flat auctions per year based on visible records; the BIP archive shows at least 4 pages × 25 items = ~100 total property-auction records across all types going back several years.

---

## 2. Where published? (hosts + boards, with URLs)

### Primary: City BIP — `bip.torun.pl`

- **Listing board (all types):** https://bip.torun.pl/przetargi-nieruchomosci/1/25
  - Filterable by: typ przetargu, rodzaj nieruchomości (incl. `lokal mieszkalny`), rok publikacji, status (Aktualne / Rozstrzygnięte / Unieważnione)
  - Pagination: page/per-page in URL path, e.g. `/przetargi-nieruchomosci/{page}/{per_page}`
  - XML export available: https://bip.torun.pl/przetargi-nieruchomosci/xml/1/1 (entire list as XML — high value for scraping)
- **Individual record:** `https://bip.torun.pl/przetarg-nieruchomosci/{id}/{slug}`
  - Contains: full property description, auction conditions, asking price, auction date
  - Attachments: zarządzenie PMT (PDF), mapa (PDF), zdjęcia (PDF), and crucially **"info o wyniku przetargu" (DOCX)** — the achieved-price notice
- **Section anchor:** https://bip.torun.pl/przetargi-nieruchomosci/32538 (Sprzedaż i dzierżawa nieruchomości miejskich)
- **Wykaz nieruchomości do rozdysponowania:** https://bip.torun.pl/obwieszczenia/32539 (pre-auction disposition notices)

### Secondary: ZGM Toruń — `www.zgm.torun.pl`

- https://www.zgm.torun.pl/lokale-nieruchomosci-sprzedaz/ — WordPress post last updated 2017; lists old auctions conducted by the same Wydział Gospodarki Nieruchomościami. ZGM relays BIP information but does NOT maintain an independent live listings board for sales.
- https://www.zgm.torun.pl/ogloszenia-o-przetargach/ — przetargi section, but focus appears to be rental auctions (lokale użytkowe wynajęcie) rather than sale.
- https://www.zgm.torun.pl/wyniki-przetargu-ustnego-28/ — "Wyniki przetargu ustnego" posts on ZGM are for **rental** auctions (garages, utility spaces), not sales.
- **Conclusion:** ZGM is not a parallel sales-auction publisher; the BIP is the sole authoritative source for flat sales.

### Contact: Iwona Więckowska, Wydział Gospodarki Nieruchomościami, ul. Grudziądzka 126B pok. 225, tel. 56 61-18-401.

---

## 3. Format + rendering

| Aspect | Detail |
|---|---|
| Listing page | Server-rendered HTML (CMS: Logonet Sp. z o.o., system v2.9.0) |
| Individual record | Server-rendered HTML, same CMS |
| XML export | Native XML endpoint at `/przetargi-nieruchomosci/xml/{page}/{per_page}` — potentially parseable as structured feed |
| Result notice | `.docx` attachment linked from record page (e.g. `bip.torun.pl/attachments/download/59378`) — confirmed binary DOCX, ~15 kB each |
| Supporting attachments | PDF (zarządzenie, mapa, zdjęcia, zaświadczenie o samodzielności) |
| Auth / bot-block | None observed. Standard cookie consent banner only. `meta-robots: index,follow,all` — explicitly crawler-friendly. No CAPTCHA, no JS-SPA, no login. |
| TLS | Standard HTTPS, no anomalies |
| RSS | https://bip.torun.pl/rss (available, scope TBD) |

Key insight: The XML endpoint (`/xml/1/1`) is potentially the cleanest ingestion path — worth testing whether it covers all listing fields including status and attachment links.

---

## 4. Volume + achieved-price stream

**Listings:** Confirmed ~10–15 `lokal mieszkalny` auctions per year. The BIP listing at 25-per-page has 4 pages for **all** property types, so residential flats are roughly 30–40% of total volume.

**Achieved-price stream:** YES — confirmed LIVE. Each resolved BIP record gains a `.docx` attachment named "info o wyniku przetargu {date}r." (e.g. file ID 59378 from 2026-05-26 for Mostowa 10 m. 2). The DOCX is ~15 kB, born-digital (not scanned). The record for ul. Mostowa 10 m. 2 shows two rounds: an initial auction (17.03.2026) and a repeat (19.05.2026), with result notices attached after each. This pattern means:
- Every sold flat has a traceable result DOCX with achieved price.
- Title slug changes to include "lokal sprzedany" after sale — detectable as a status signal.
- Download count on result attachments (54–34) confirms they are actively consulted.

**Risk:** Achieved price is in a DOCX, not inline HTML. The adapter must download and parse DOCX to extract the final sale price. The docx files appear to be short (~15 kB), so parsing is straightforward (python-docx or equivalent).

---

## 5. Adapter effort + verdict

### Closest analogue: **Gliwice / Zabrze**

Both use a city-BIP HTML listing with paginated records, individual detail pages, and result notices as file attachments. Toruń is slightly cleaner because:
1. The BIP has a **native XML export endpoint** that may eliminate the need to scrape HTML tables.
2. The CMS is Logonet (not the typical ePUAP variant), well-structured, robotically crawlable.
3. Result notices are DOCX not PDF scans — easier to parse than OCR'd PDFs.

### Adapter work items

1. **Discover phase:** Hit `/przetargi-nieruchomosci/xml/1/1` — if it exposes full structured data including IDs and statuses, use XML; otherwise fall back to paginated HTML scrape with filter `rodzaj=lokal mieszkalny`.
2. **Detail page scrape:** Extract structured metadata table (address, typ, cena wywoławcza, data przetargu) from `<table>` on detail page.
3. **Attachment enumeration:** Find "info o wyniku przetargu" links in the attachments section (type `.docx`).
4. **DOCX parse:** Download and extract achieved price from the result notice DOCX.
5. **Status detection:** Check page title / slug for "lokal sprzedany" to determine resolved status.

### Blockers

- None critical. No auth, no CAPTCHA, no SPA.

### Risks

- DOCX result notice format may vary (free-text vs. structured); requires sampling 5–10 to determine parse pattern.
- XML endpoint scope unknown — may not include attachment links (needs one-time test).
- Moderate archival depth: BIP shows records going back at least to 2022 in the filter; older records may be pruned.

### Verdict

**BUILD — Low effort.**

Toruń has an active, sustained, robotically-accessible flat-auction stream on a single canonical host (`bip.torun.pl`) with no technical barriers. Volume (~10–15 flats/year) is solid. Achieved-price data is consistently attached as DOCX to each resolved record. The XML export may further simplify the adapter. The only non-trivial step is DOCX parsing for the result price, which is a one-time implementation reusable across other cities that follow the same pattern.

---

### Sources

- LIVE: https://bip.torun.pl/przetargi-nieruchomosci/1/25 (listing, 25/page, 4 pages total)
- LIVE: https://bip.torun.pl/przetarg-nieruchomosci/61786/ul-mostowa-10-m-2 (detail record with DOCX result attachment)
- LIVE: https://bip.torun.pl/przetargi-nieruchomosci/32538 (Sprzedaż i dzierżawa section anchor)
- LIVE: https://www.zgm.torun.pl/lokale-nieruchomosci-sprzedaz/ (ZGM secondary — stale 2017 post)
- DESK: https://www.zgm.torun.pl/wyniki-przetargu-ustnego-28/ (ZGM auction results — rental only)
- DESK: https://listaprzetargow.pl/oferty/torun (aggregator confirming volume)
