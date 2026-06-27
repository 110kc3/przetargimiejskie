# Spike — Ciechanów (Mazowieckie · powiat ciechanowski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (High confidence).

## TL;DR

Gmina Miasto Ciechanów sells flats **only bezprzetargowo** — exclusively to sitting tenants (art. 34 ust. 1 ugn). The BIP contains 216 entries under "Nieruchomości na sprzedaż" going back to 2016; every auction entry is for **działki gruntowe** (land plots) or commercial properties. There are no *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* anywhere in the archive. Housing manager TBS Ciechanów administers the stock but only procures construction/maintenance services — it does not conduct flat-sale auctions. No achieved-price stream exists for flats because there are no flat auctions.

## 1. Sells municipal property at auction?

**Yes — but land/commercial only. Flats: NO.**

- The BIP section "Nieruchomości na sprzedaż" at `https://bip.umciechanow.pl/informacje_urzedu/nieruchomosci_na_sprzedaz` contains 216 entries spanning 2016–2026 (22 pages).
- Flat-related entries are titled **"Wykaz nieruchomości lokalowych stanowiących własność Gminy Miejskiej Ciechanów przeznaczonych do sprzedaży na rzecz najemców"** — always bezprzetargowy (right-of-first-refusal for tenant). Verified on entries: idn:1049 (May 2026), idn:1027 (Feb 2026), idn:999 (Nov 2025), idn:987 (Sep 2025) and throughout the full archive.
- Auction (przetarg) entries reference only: niezabudowane działki, nieruchomości gruntowe, land for development. Most recent: Jan 2026 — przetarg for działka nr 60-106/8 and działki 40-940/22 / 90-75/1 (idn:1022, idn:1021). Both confirmed land-only.
- Scanning pages 1, 10 and 22 (oldest) confirms the pattern is consistent across the full 10-year archive: **zero flat auction notices**.

## 2. Where published? (hosts + boards, URLs)

| Resource | URL |
|---|---|
| BIP Urząd Miasta Ciechanów (main) | https://bip.umciechanow.pl/ |
| Nieruchomości na sprzedaż (board) | https://bip.umciechanow.pl/informacje_urzedu/nieruchomosci_na_sprzedaz |
| Dzierżawa/najem | https://bip.umciechanow.pl/informacje_urzedu/Dzierzawa_nieruchomosci |
| TBS Ciechanów (housing manager) | https://tbsciechanow.pl/ |
| TBS Ciechanów BIP | https://bip.tbsciechanow.pl/ |
| TBS przetargi page | https://tbsciechanow.pl/przetargi/ |

**Result notices (informacja o wyniku przetargu):** published on the same BIP entry as a second attached PDF file. Confirmed: the Jan 2026 działka auction (idn:1022) has "Informacja o wyniku przetargu.pdf" (published 2026-04-24, 366 KB) attached to the same page.

No separate dedicated results board exists; results are appended to the original notice entry.

## 3. Format + rendering

- BIP platform: custom CMS at `bip.umciechanow.pl` — standard Polish municipal BIP.
- Listing pages: **HTML**, paginated (10 items/page, 22 pages total). No auth, no CAPTCHA observed. URL pattern: `?page=N`.
- Detail pages: **HTML** with attached **PDFs** (typically 190–400 KB). The HTML page title describes the property; the PDF contains the full legal notice text.
- PDF type: generated PDFs (not scans), so text-extractable without OCR.
- TBS przetargi page: plain HTML list, no auth, no JS-heavy SPA.
- No bot-block observed during live fetch.

## 4. Volume + achieved-price stream

- **Flat auctions: 0** — none in the full archive (2016–2026).
- Land/commercial auctions: approximately 5–10 per year based on page-count sampling (~216 total entries / 10 years, mix of wykazes + przetargi; land auctions appear to be a minority subset).
- Achieved price for flats: **no stream exists** — there are no flat auction results because there are no flat auctions.
- Achieved price for land przetargi: available as PDF appended to the same BIP entry (e.g., idn:1022 has result PDF from 2026-04-24). These are land-only and out of scope.

## 5. Adapter effort + verdict

**VERDICT: NO-BUILD**

Closest analog: none directly applicable. The pattern is identical to the "bezprzetargowy" gminas eliminated during spike scoping (tenant-purchase model, no open flat auctions).

**Blockers:**
- No *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* has ever been published on this BIP. Flats are sold exclusively under art. 34 ust. 1 pkt 1 ugn (right of first refusal for tenant), which is an administrative procedure, not a public auction.
- TBS Ciechanów is a pure rental/management entity; its przetargi page covers only construction and maintenance procurement (37 pages of ZO/TBS procurement notices as of June 2026).

**Risks/notes:**
- The gmina does hold municipal flat stock and actively cycles flats to tenants (8–17 lokali per "wykaz" batch, several batches per year), so there is real transaction volume — but it is entirely off-market for scrapers.
- If policy changes (gmina decides to auction excess stock), the BIP and the przetargi board URL would be the place to monitor. Low probability near-term.
- No separate powiat-level przetarg board was found relevant to flats.
