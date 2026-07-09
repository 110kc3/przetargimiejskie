# Spike — Żuromin (Mazowieckie · powiat żuromiński)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (no open flat-auction stream).

## TL;DR
Gmina i Miasto Żuromin (a small miejsko-wiejska seat, ~9k) does dispose of municipal property, but **not in a way that fits our thesis**. Every **lokal mieszkalny** is sold **bezprzetargowo na rzecz najemcy** (non-tender sale to the sitting tenant) — confirmed across 2020→2026 (Wyzwolenia 35/37, 41, 45, 56, 60; Targowa 50; Przemysłowa 43A — all wykaz/tenant sales, never an auction). The only auctions are for **land (działki)** and they run as **przetarg PISEMNY nieograniczony** (sealed written bid), not oral. There is **no przetarg ustny nieograniczony**, **no flat-auction stream**, and **no dedicated housing manager (ZGM/TBS)** publishing flat auctions — the Urząd's NiPP (Nieruchomości i Planowanie Przestrzenne) department handles everything. Current BIP is `zuromin.ibip.net.pl` (NowyBIP CMS, all notices as PDFs on `fs.siteor.com`). An achieved-price stream exists but only for **land** written auctions. No flat auction volume → NO-BUILD.

## 1. Sells municipal property at auction?
**Partly — but NOT flats, and not orally.** Two disposal tracks, both out of our core scope:
- **Flats (lokale mieszkalne) → bezprzetargowo na rzecz najemcy.** Every residential unit on the sales board is a *wykaz* / tenant sale, no auction:
  - 2026-06-09 — Lokal nr 27, ul. Wyzwolenia 35/37 — *sprzedaż na rzecz najemcy* (NiPP.7125.1.2026).
  - 2020–2021 — Lokal 7 Wyzwolenia 56, Lokal 8 Targowa 50/62B, Lokal 10 Wyzwolenia 60, Lokal 10 Przemysłowa 43A, Lokal 13 Wyzwolenia 41, Lokal 6 Wyzwolenia 45 — all *bezprzetargowo na rzecz najemcy* (GGNRiPP.7125.* / Wykaz_dla_lokalu_*).
- **Land (działki) → przetarg PISEMNY nieograniczony** (sealed written bid), plus assorted bezprzetargowe forms (na rzecz użytkownika wieczystego, na poprawę warunków zagospodarowania). Examples: dz. 182/13 ul. Malinowa (przetarg pisemny, 2026); dz. 1570 ul. 3 Maja, dz. 410/3-4 Dębsk, dz. 381/2 Wyzwolenia (written auctions with results, 2025–2026).

No **przetarg ustny nieograniczony** anywhere; no flat is ever put to auction. (Note: a nearby "Ogłoszenie lokal 1" 88.54 m² flat at 309,890 zł belongs to **Starostwo Powiatowe / Powiat Żuromiński** — a different JST on `bip.zuromin-powiat.pl` — and was itself a *written* auction; out of scope, do not conflate with the gmina.)

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (NowyBIP CMS):** `https://zuromin.ibip.net.pl/`
- Property sales board: `https://zuromin.ibip.net.pl/ogloszenia-o-sprzedazy-nieruchomosci`
- Movables: `https://zuromin.ibip.net.pl/ogloszenia-o-sprzedazy-ruchomosci`
- Public-procurement / ogłoszenia by year: `/ogloszenia-bip-2025-rok`, `/ogloszenia-bip-2024-rok`, `/zamowienia-publiczne-2026-rok`
- File host for all attachments: `https://fs.siteor.com/zuromin/files/Downloads/<ts>/<file>.pdf` (e.g. `.../20260609062205/Wykaz_dz.182_13.pdf`).

**Legacy / archive mirror (also NowyBIP):** `https://zuromin-strona.nowybip.pl/` — e.g. `/ogloszenia-gospodarka-nieruchomosciami-2020`, `/ogloszenia--ggnr-i-pp-` (2015–2020). Same siteor.com storage.

**Other IDs seen but NOT the gmina:** `bip.zuromin.nv.pl` (old placeholder), `bip.zuromin-powiat.pl` / `zuromin-powiat.pl` (**powiat**, separate JST). Contact: Plac Józefa Piłsudskiego 3, tel. 23 657 25 58, ugimz@zuromin.info.

## 3. Format + rendering
- **NowyBIP** server-rendered HTML index pages (REST-style `/section-name` paths, no JS gate), but the substantive notice content lives in **PDF attachments on `fs.siteor.com`** — the HTML page is essentially a titled link list. So this is a **PDF-extraction** source, not inline-HTML.
- PDFs appear **born-digital** (wykazy, przetarg announcements, informacja o wyniku) → `pdfText` would work; OCR probably unneeded. No auth / CAPTCHA / SPA.

## 4. Volume + achieved-price stream
- **Flat-auction volume: ZERO.** Flats only move as tenant (bezprzetargowo) sales — a handful/year, none in scope.
- **Land-auction volume: very low** — roughly a few written (pisemny) land auctions per year for a ~9k-resident gmina.
- **Achieved-price stream: YES but land-only** — `Informacja o wyniku przetargu` PDFs are published per land auction (e.g. `.../20260302141508/Informacja_o_wyniku_przetargu.pdf`, `.../20250527072845/...`, `.../20250117071753/...`). No such stream for flats because flats aren't auctioned.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built for land only):** a NowyBIP/siteor.com PDF-list gmina — WordPress/custom-HTML family per ADAPTER-GUIDE §3 (HTML link board → `pdfText` on siteor PDFs), similar shape to small `nowa-sol`/`bochnia`-style PDF pulls but with a NowyBIP index.
- **CMS family:** NowyBIP (server-HTML index + `fs.siteor.com` born-digital PDFs).
- **Effort:** **—** (not worth building). Even a land-only adapter would yield a trickle of sealed-written land auctions with no flat content.
- **Blockers (thesis-level, not technical):** (1) flats are 100% tenant/bezprzetargowo — **no open flat auction ever**; (2) land auctions are **pisemny (written)**, not the oral-auction pattern; (3) no ZGM/TBS housing manager; (4) tiny volume. Technically scrapeable, but nothing in-scope to scrape.

**VERDICT: NO-BUILD** — Żuromin sells flats only bezprzetargowo na rzecz najemcy and lands only via sealed written auction; there is no open oral flat-auction stream, no housing manager, and negligible volume. Clean NowyBIP+siteor PDFs, but no target data.
