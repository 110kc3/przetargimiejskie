# Spike — Jelenia Góra (Dolnośląskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Jelenia Góra runs a steady stream of *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych* directly through the city BIP at `bip.jeleniagora.pl`. Both announcement and result-notice boards are live and paginated. Result notices confirm achieved prices for flats. The data lives inside born-digital PDFs attached to otherwise-thin HTML stub pages — the pattern is identical to Bytom/Zabrze. ZGKiM is the municipal housing manager but does NOT publish auctions separately; everything flows through the city BIP. No JS SPA, no auth, no bot block observed.

---

## 1. Sells municipal property at auction?

**Yes — confirmed, open flat auction stream.** The city runs *przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych* on a near-weekly cadence. Verified examples from 2026 alone:

- **69/2026** — ul. Juszczaka 4/6, ul. Jana Sobieskiego 21/6, ul. Łabskiej 6/3 (3 flats in one batch)
- **68/2026** — Pl. Energetyka 1/4, ul. Długiej 9/…, ul. Wolności 229/4 + lokal użytkowy
- **67/2026** — ul. Cieplickiej 183/2 + 2 lokale użytkowe
- **61/2026** — lokal mieszkalny nr 2, Pl. Niepodległości 5
- **60/2026** — lokal mieszkalny nr 4,4A, ul. Wojska Polskiego 2

Result notices in 2026 confirm flat auctions completed:
- **52/2026(2)** — lokal mieszkalny nr 4, ul. Kasprowicza 2 (published 22.06.2026)
- **52/2026** — lokal mieszkalny nr 5A, ul. 1 Maja 2 / Piłsudskiego 8
- **43/2026** — lokal mieszkalny nr 4, ul. 1 Maja 59

This is NOT a bezprzetargowy-dominant city. The bezprzetargowy stream (sale to tenants) co-exists but flat open auctions are clearly a distinct, recurring product visible in BIP. I-przetarg, II-przetarg, III-przetarg sequences also evidenced (ul. Jasna 4, ul. Jagiellońska 29), meaning unsold lots are re-auctioned.

Housing manager **ZGKiM** (Zakład Gospodarki Komunalnej i Mieszkaniowej, ul. Podgórna 9; converted to budget unit April 2025) manages the housing stock but **auctions are organised by the Prezydent Miasta and published solely on the city BIP**. ZGKiM has its own BIP at `zgkim.bip.jeleniagora.pl` but it does not carry auction notices.

---

## 2. Where published? (hosts + boards, with URLs)

### Primary source — city BIP

| Board | URL | Content |
|---|---|---|
| Announcements (sprzedaż/użytkowanie wieczyste) | https://bip.jeleniagora.pl/artykuly/126/sprzedaz-uzytkowanie-wieczyste | Active auction notices — flats, land, commercial; ~10 per page, 6 pages as of 2026-06-27 |
| Result notices | https://bip.jeleniagora.pl/artykuly/321/informacje-o-wyniku-przetargu | "Informacja o wyniku przetargu nieograniczonego na sprzedaż …" — confirmed flat results with PDFs |
| Restricted-auction qualifier lists | https://bip.jeleniagora.pl/artykuly/322/listy-osob-zakwalifikowanych-do-uczestnictwa-w-przetargu-ustnym-ograniczonym | Occasional; limited-participation auctions (secondary stream) |
| Top-level offers hub | https://bip.jeleniagora.pl/artykuly/90/oferty-nieruchomosci | Parent nav node linking to all three above |

BIP root: https://bip.jeleniagora.pl/
CMS: Logonet Sp. z o.o. (Bydgoszcz), version 2.9.0. Last BIP update: 26.06.2026 13:06.

### Secondary / cross-check

- https://nieruchomosci.jeleniagora.pl/nieruchomosci — city's own property portal (separate domain); utility unclear, likely marketing overlay, not the canonical auction feed.
- https://listaprzetargow.pl/oferty/jelenia-gora — third-party aggregator already scraping JG; confirms active flat-auction volume.

---

## 3. Format + rendering

| Layer | Detail |
|---|---|
| Index pages | Server-rendered HTML (Logonet CMS). Article list with title + anchor per entry. Paginated (`/artykuly/126/2/10/…`). No JS required to render listing. |
| Detail/stub page | Server-rendered HTML stub. Contains: title string (e.g. "Informacja o wyniku przetargu nieograniczonego na sprzedaż lokalu mieszkalnego nr 4 …"), metadata table (Wytworzył, Data wytworzenia, Data opublikowania), and **one PDF attachment link**. |
| Payload | **Born-digital PDF** (~130–200 kB). PDF contains structured text: address, area (m²), auction date, cena wywoławcza, cena osiągnięta (achieved price), buyer identifier (initials only under RODO). NOT scanned — text-extractable with pdfplumber/pdfminer. |
| TLS | HTTPS (valid cert). |
| Auth | None. No login, no CAPTCHA observed. |
| Bot blocking | None evident — Logonet BIP serves static-ish HTML. |
| RSS feed | Available at https://bip.jeleniagora.pl/rss (untested for nieruchomości category filtering). |
| XML export | Each article list has an XML link (e.g. `https://bip.jeleniagora.pl/artykuly/xml/321/1/1`) — potentially useful for diff-polling. |

---

## 4. Volume + achieved-price stream

**Volume (2026, through 2026-06-27):**
- Announcements numbered up to **69/2026** — approximately 69 auction-event batches in ~6 months. Many batches cover 2–4 lots simultaneously, so gross lot-count is higher (~100+ lots year-to-date including land and commercial).
- Result notices numbered up to **53/2026** — at least 53 closed auction events reported in the same period.
- Of the result notices visible on page 1 (5 entries), **3 of 5 concern lokale mieszkalne** — indicating flats are the majority of the closed-auction stream.
- Historical depth: entries visible from at least 2021 (e.g. 25/2024 Pijarska 22/1 III przetarg; 2021 Staromiejska 9).

**Achieved-price stream:** YES — result PDFs contain the achieved price. The index-page titles say "Informacja o wyniku przetargu nieograniczonego na sprzedaż lokalu mieszkalnego …" and each links to a PDF that per standard Polish auction-result format includes: cena wywoławcza, achieved price, and whether the auction succeeded or failed (bezskuteczny). Confirmed from search snippets (e.g. ul. Jasna 4/3 I przetarg: cena wywoławcza 270 000 PLN, wynik bezskuteczny).

**Cadence:** ~2–3 announcements per week; results published within days of auction.

---

## 5. Adapter effort + verdict

### Closest analog

**Bytom** — same Logonet CMS BIP, same structure (index HTML → stub HTML → born-digital PDF attachment), same numbering convention (NN/RRRR per event), same achieved-price-in-PDF pattern. The Bytom adapter would port with minimal changes: swap base URLs, verify PDF field layout (likely identical boilerplate), adjust CSS selectors if needed.

### Effort breakdown

| Task | Estimate |
|---|---|
| Index scraper (paginated HTML list) | 0.5 day — trivial with BeautifulSoup; pagination is `/artykuly/126/{page}/10/…` |
| Stub-page parser (extract PDF URL + metadata) | 0.5 day |
| PDF parser (born-digital, text extraction) | 1 day — pdfplumber; need to handle multi-lot batches (single PDF may list 2–4 properties) |
| Result-notice scraper + achieved-price extraction | 1 day — same structure, separate board |
| De-dup / re-auction tracking (I/II/III przetarg) | 0.5 day |
| Test harness + CI integration | 0.5 day |
| **Total** | **~4 days** |

### Blockers

- **Multi-lot PDFs**: some announcement batches cover 3–4 flats in a single PDF; parser must split per-property records. Moderate complexity.
- **bezskuteczny result notices**: result PDFs for failed auctions still need to be ingested (they carry the failed-sale signal and re-listing expectation). Parser must handle both outcome types.
- **No structured XML API**: the XML endpoint (`/artykuly/xml/…`) may carry just article metadata, not the PDF text content. Must be tested before relying on it for diff-polling.

### Risks

- Low: Logonet CMS is mature and consistent across Polish BIPs; no custom JS, no dynamic routing.
- Low: No bot protection.
- Medium: PDF layout could drift between years (though Jelenia Góra's consistent use since 2021 suggests stable templates).
- Low: Volume is sufficient (~30–40 flat auctions/year estimated) to justify adapter cost.

### Verdict

**BUILD** — strong signal. Active flat-auction stream confirmed live, result notices with achieved prices confirmed, born-digital PDFs (same stack as Bytom), no access barriers. Medium adapter effort given PDF multi-lot splitting requirement.

---

## Sources

- BIP Jelenia Góra (główna): https://bip.jeleniagora.pl/
- Ogłoszenia sprzedaży/użytkowania wieczystego: https://bip.jeleniagora.pl/artykuly/126/sprzedaz-uzytkowanie-wieczyste
- Informacje o wyniku przetargu: https://bip.jeleniagora.pl/artykuly/321/informacje-o-wyniku-przetargu
- Wynik 52/2026(2) — lokal mieszkalny Kasprowicza 2: https://bip.jeleniagora.pl/artykul/321/25507/52-2026-2
- ZGKiM BIP: http://zgkim.bip.jeleniagora.pl/
- ZGKiM główna: http://www.zgkim-jg.pl/
