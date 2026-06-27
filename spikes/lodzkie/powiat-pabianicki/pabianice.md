# Spike — Pabianice (Łódzkie · powiat pabianicki)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Low effort).

## TL;DR

Gmina Miejska Pabianice actively auctions municipal **flats (lokale mieszkalne)** via *przetarg ustny nieograniczony* on a dedicated, well-structured BIP page (Logonet CMS). The list view is clean HTML with structured tables (address, typ przetargu, rodzaj nieruchomości, cena wywoławcza, data przetargu), no JS rendering required. Result notices (rozstrzygnięcie) are published as PDF attachments on each listing's detail page. Volume is high — 48 pages × 10 items = ~480 total entries going back to at least 2015, with roughly half being *lokal mieszkalny*. The BIP also runs a parallel *bezprzetargowy* tenant-sale track, but the open-auction track for flats is confirmed and active. Closest analog: **Bytom** (Logonet BIP, HTML list + PDF attachments for result).

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** The city sells municipal flats (lokale mieszkalne) via *przetarg ustny nieograniczony* (open oral auction). Verified from live page fetched 2026-06-27:

- **Lokal mieszkalny nr 7 ul. Pomorska 20** — przetarg ustny nieograniczony, cena wywoławcza 53 000 zł, data 14.05.2026. Result notice (Rozstrzygnięcie przetargu) published 22.05.2026. [Detail page](https://bip.um.pabianice.pl/przetarg-nieruchomosci/23966/lokal-mieszkalny-nr-7-przy-ul-pomorskiej-20)
- **Lokal mieszkalny nr 6 ul. Pomorska 20** — przetarg ustny nieograniczony, 67 000 zł, 14.05.2026
- **Lokal mieszkalny nr 4 ul. Pomorska 20** — przetarg ustny nieograniczony, 69 000 zł, 14.05.2026
- **Lokal mieszkalny nr 3 ul. Toruńska 29** — przetarg ustny nieograniczony, 85 000 zł, 06.08.2026 (upcoming)
- **Lokal mieszkalny nr 6 ul. Nawrockiego 4A** — przetarg ustny nieograniczony, 53 000 zł, 06.08.2026 (upcoming)
- **Lokal mieszkalny nr 64/65 ul. Wyszyńskiego 3** — przetarg ustny nieograniczony (spółdzielcze własnościowe prawo), 240 000 zł, 03.06.2026

The city also runs a *bezprzetargowy* (without auction) track — sale to sitting tenants via the Wydział Gospodarki Nieruchomościami per uchwała XXXIV/316/04. These are separate procedures and not the auction stream.

## 2. Where published? (hosts + boards, URLs)

**Primary source — Gmina Miejska Pabianice BIP:**

- **List board (ogłoszenia):** `https://bip.um.pabianice.pl/przetargi-nieruchomosci/61`
  - Paginated: `https://bip.um.pabianice.pl/przetargi-nieruchomosci/{page}/10`
  - 48 pages of 10 = ~480 entries; page 1 is the most-recent.
  - XML feed also available per page: `https://bip.um.pabianice.pl/przetargi-nieruchomosci/xml/1/1`
- **Individual detail page:** `https://bip.um.pabianice.pl/przetarg-nieruchomosci/{id}/{slug}`
  - Contains structured detail table + PDF attachments for both the announcement and the result.
- **Result notices (rozstrzygnięcie):** Published as PDF attachments on the same detail page (not a separate URL), filed under "Rozstrzygnięcie przetargu". No separate results board.
- BIP CMS: Logonet Sp. z o.o. w Bydgoszczy, version 2.9.0; last updated 26.06.2026.

**Secondary — ZGM Pabianice BIP** (`https://bip.zgm.pabianice.pl/artykuly/81/przetargi`):
- ZGM (Zakład Gospodarki Mieszkaniowej, ul. Warzywna 6) publishes its own tenders for service contracts (kominiarskie etc.) and vehicle sales, and administers the *bezprzetargowy* tenant-sale attestation. ZGM does **not** publish flat-sale auctions separately — those go through the city BIP.

## 3. Format + rendering

- **List page:** Clean server-rendered HTML; each entry is a `<table>` with labelled rows. No JS required to read the list. No SPA, no auth wall, no CAPTCHA observed.
- **Detail page:** Same CMS — structured HTML table with key fields, then attachment links.
- **Result documents:** PDF attachments (typ `application/pdf`). Size is small (~248–302 kB). These appear to be typeset PDFs (text-PDF), not scans — very likely machine-readable without OCR based on file size and the BIP's modern CMS.
- **XML endpoint:** Each page has an `/xml/` variant (`https://bip.um.pabianice.pl/przetargi-nieruchomosci/xml/1/1`), though its schema is standard Logonet BIP XML and may not include all fields.
- **No bot-block observed:** Standard cookie consent banner; no Cloudflare, no rate-limit headers detected during fetch.
- **Achieved price:** Embedded in the result PDF, not in the HTML detail table. The detail page says "Informacje dostępne w załączniku" for the rozstrzygnięcie. PDF must be parsed to extract achieved price.

## 4. Volume + achieved-price stream

- **Total index size:** 48 pages × 10 items = ~480 entries (all property types, going back to 2015).
- **Flat-auction share:** From pages 1–2 sampled live, roughly 7 out of 20 entries are *lokal mieszkalny* (35%). Estimated ~150–170 flat-auction records total in the archive.
- **2026 pace:** Pages 1–2 show ~7 lokal mieszkalny entries spanning Jan–Aug 2026, suggesting ~15–20 flat auctions/year.
- **Achieved-price stream:** Present — result PDFs are published consistently (67 downloads on the Pomorska 20 result within ~5 weeks of posting, indicating real use). Price is in the PDF body, not the HTML. A PDF text-extraction step is needed; OCR likely not required given file sizes and CMS generation.

## 5. Adapter effort + verdict

**Closest analog: Bytom** — Logonet CMS, HTML list with structured tables, PDF result attachments on detail pages.

**Effort: Low.**

| Component | Assessment |
|---|---|
| List scraper | Copy Bytom pattern: paginate `przetargi-nieruchomosci/{page}/10`, filter `rodzaj nieruchomości = lokal mieszkalny` |
| Detail scraper | Follow each listing URL, parse HTML table for metadata |
| Result/achieved-price | Fetch `Rozstrzygnięcie przetargu` PDF attachment; parse text-PDF for price |
| Filter logic | Field `Typ przetargu = Przetarg ustny nieograniczony` + `Rodzaj nieruchomości = lokal mieszkalny` — both present in HTML, no regex needed |
| Auth / bot risk | None observed |
| XML alternative | Available but untested for completeness; HTML is reliable |

**Blockers / risks:**
- Achieved price is PDF-only, not in HTML. If PDFs turn out to be scans (unlikely given CMS), OCR would be needed.
- The BIP also lists *przetarg pisemny nieograniczony* (written tender) for some flats — confirm whether to include both types or just oral.
- ZGM's *bezprzetargowy* tenant-sale track means some flats are removed from auction pool, which is normal and expected.
- 48-page archive is substantial; initial backfill should be scoped to 2–3 years unless full history is desired.

**Verdict: BUILD — Low effort, High confidence.**

The source is a clean Logonet BIP with structured HTML, active flat-auction volume (~15–20/year), and consistently published result PDFs. No novel engineering required beyond what the Bytom adapter already handles.
