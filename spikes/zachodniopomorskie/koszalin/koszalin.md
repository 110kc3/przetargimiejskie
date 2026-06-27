# Spike — Koszalin (Zachodniopomorskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort if reversed, but volume too low to justify).

## TL;DR

Koszalin does run *przetarg ustny nieograniczony* on **lokale mieszkalne** (confirmed via BIP ewidencja records 2016–2025), but volumes are extremely low: 1 flat sold in 2025, 1 in 2018, sparse earlier. Current active listings (June–August 2026) are entirely land/niezabudowane. The city BIP is clean server-rendered HTML with a filterable auction register, no auth/bot block, and result notices published as PDF attachments. The weak flat-auction signal (≤1–2/year) puts this below minimum viable volume for a standalone adapter.

---

## 1. Sells municipal property at auction?

**Yes, all types — but flat volume is very low.**

The Koszalin city BIP (Urząd Miejski) runs *przetarg ustny nieograniczony* for:
- nieruchomości niezabudowane (land) — dominant; 11 active listings in current window (July–Aug 2026)
- nieruchomości zabudowane (built)
- lokale użytkowe (commercial units)
- lokale mieszkalne (residential flats) — **confirmed via tryb przetargowy**, but scarce

**Flat auction evidence:**
- Ewidencja zbycia (przetargowy, lokale mieszkalne) shows 1 flat sold in 2025 (ul. Rejtana 6/3, 33.39 m², sold 10.07.2025) and 1 in 2018 (ul. Zawiszy Czarnego 6/1, 17.38 m²). Only these two years have records in the ewidencja.
- A search snippet confirms a 19.60 m² flat at ul. Piłsudskiego 98E/9 was auctioned (oral unlimited), demonstrating the mechanism exists.
- The current active listing board (as of 27.06.2026, 2 pages, 11 entries) shows **zero** flat auctions — all land.

**ZBM Koszalin** (Zarząd Budynków Mieszkalnych, ibip.pl at `zbm.koszalin.ibip.pl`) manages municipal housing but publishes procurement notices (PZP) and commercial unit *najem* auctions — not flat sales. Flat sales go through the city's own Wydział Nieruchomości on `bip.koszalin.pl`.

---

## 2. Where published? (hosts + boards, with URLs)

**Primary publisher: Urząd Miejski w Koszalinie BIP**
- Active auction register (filterable by type/year/status):
  `https://bip.koszalin.pl/przetargi-nieruchomosci/1677`
- Archive of flat sales (tryb przetargowy, ewidencja):
  `https://bip.koszalin.pl/artykuly/1603/lokale-mieszkalne`
  - 2025 record: `https://bip.koszalin.pl/artykul/1603/15191/ewidencja-zbycia-nieruchomosci-komunalnych-tryb-przetargowy-lokale-mieszkalne-2025-rok`
- Resolution/wynik page:
  `https://bip.koszalin.pl/artykuly/1869/rozstrzygniecia-przetargow-na-zbycie-nieruchomosci`
  (leads to `artykul/1869/14254/...` — PDF attachment, see section 3)
- Tryb przetargowy hub:
  `https://bip.koszalin.pl/artykuly/1599/tryb-przetargowy`

**Secondary / no flat-sale content:**
- ZBM Koszalin BIP: `http://zbm.koszalin.ibip.pl/public/?id=238769` — auction notices for commercial unit *najem* only, not flat sales
- Voivodeship Marshal BIP (`bip.wzp.pl`) — has one Koszalin property entry from ~2014; not a live channel for the city

---

## 3. Format + rendering

| Attribute | Detail |
|-----------|--------|
| Host | `bip.koszalin.pl` (Logonet CMS v2.9, hosted by Logonet Sp. z o.o. Bydgoszcz) |
| Rendering | **Server-rendered HTML** — full page content present in HTTP response, no JS SPA |
| Listings | Paginated HTML tables with structured fields: address, type of auction, property type, asking price, auction date |
| Filter params | URL path: `/przetargi-nieruchomosci/{page}/{per_page}` — filter form POSTs/GETs by type, kind, year, date range, status |
| XML feed | Present: `https://bip.koszalin.pl/przetargi-nieruchomosci/xml/1/1` |
| TLS | HTTPS (standard cert, no anomalies) |
| Auth | None |
| Bot block | None detected — `meta-robots: index,follow,all` |
| Result notices | **PDF attachment** linked from `/artykul/1869/14254/` (downloaded from `/attachments/download/74648`, 289 kB, updated 11.06.2026). Not inline HTML — requires PDF parsing for achieved prices. |
| Individual listing pages | Server-rendered HTML at `/przetarg-nieruchomosci/{id}/{slug}` |

---

## 4. Volume + achieved-price stream

**Volume (flat auctions):**
- 2025: 1 flat (tryb przetargowy ewidencja)
- 2024: no ewidencja entry found (likely 0)
- 2018: 1 flat
- 2016: 1 flat (partial record in ewidencja)
- Estimated run-rate: ~0–2 flat auctions/year

**Land/niezabudowane volume:**
- 11 active listings in the July–August 2026 window alone (including batch sessions of 5–8 plots at once)
- Strong land auction activity, minimal flat auction activity

**Achieved-price stream:**
- The BIP resolution page (`/artykuly/1869/rozstrzygniecia-przetargow-na-zbycie-nieruchomosci`) aggregates results as a single downloadable PDF (289 kB, last updated 11.06.2026). Achieved prices are inside that PDF.
- Individual listing pages have a "Rozstrzygnięte" status filter — resolution data may also appear inline on listing detail pages (not confirmed for flats specifically).
- The ewidencja pages (per year, per type) record date of sale but **not achieved price** — only confirms sale occurred.

---

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry / Bytom (plain Logonet BIP HTML, filterable register, PDF results) — but those cities have higher flat volumes. Koszalin's BIP structure is clean and would be low-effort to adapt.

**If this were a BUILD:**
- Scrape `bip.koszalin.pl/przetargi-nieruchomosci/` with filter `rodzaj=lokal+mieszkalny` (form filter, may need POST or URL params)
- XML feed (`/przetargi-nieruchomosci/xml/1/1`) may offer structured data — worth probing
- Achieved prices require PDF parsing of the consolidated results PDF (one file, updated periodically)
- Effort: Low (≈ Bytom analog, 1–2 days)

**Verdict: NO-BUILD**

The mechanism is confirmed and the BIP is scrape-friendly, but **1 flat/year** is below viable signal threshold for this tool. Koszalin is dominantly a land-auction city. Recommend revisit only if: (a) policy changes push more flats to open auction, or (b) the tool expands to land parcels.

**Risks / blockers if reversed:**
- PDF-only result stream (achieved prices require PDF parser, not HTML)
- Flat auction cadence is irregular — scraper may run many cycles with zero yield
- No dedicated ZBM flat-auction stream (ZBM does najem, not sprzedaż)
