# Spike — Puck (Pomorskie · powiat pucki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (flat-auction volume ~0).

## TL;DR
Target is the **town Gmina Miasta Puck** (gmina miejska, ~11k, coastal) — distinct from the rural **Gmina Puck** (`bip.gmina.puck.pl`). The town BIP is `bip.miastopuck.pl` (mirror `miastopuck-bip2.alfatv.pl`), a server-rendered HTML CMS by **Wytwórnia Telewizyjno-Filmowa Alfa** ("BIP v89.3.a.2", alfatv.pl) with jQuery DataTables list boards; individual notices are HTML stubs carrying a **born-digital text-PDF** attachment (`/pliki/miastopuck/zalaczniki/NNNN/…pdf`). The gmina runs a **high-volume open LAND-auction program** (309 distinct `przetarg ustny nieograniczony na sprzedaż nieruchomości dz. nr …` slugs) but **almost no flat auctions**: only **3** `…na sprzedaż … lokalu mieszkalnego` notices exist across the whole disposal board history, of which **1 is currently active** (ul. Nowa 8 m.2, przetarg 30.07.2026). The dedicated **PRZETARGI** board is entirely **dzierżawa/najem** of lokale użytkowe + parkingi (lease). No housing manager (no ZGM/ZBM/MZBM/TBS). Residential disposal to sitting tenants is handled **bezprzetargowo** (`Wniosek o sprzedaż lokalu mieszkalnego na rzecz najemcy`). This is the textbook generic-city-BIP-skewing-to-land pattern → NO-BUILD for a flat-focused adapter.

## 1. Sells municipal property at auction?
**YES for LAND — essentially NO for FLATS.** The Urząd Miasta Puck runs `przetarg ustny nieograniczony na sprzedaż nieruchomości` at scale, but the object is almost always a **działka gruntowa** (obr. 2/5 parcels, `dz. nr 15-11`, `dz. nr 473`, `dz. nr 502`, etc.). Concrete counts scraped live from the disposal board `/artykul/zbywanie-nieruchomosci`:
- **309** distinct land sale-auction slugs (`…na-sprzedaz-nieruchomosci-dz-nr-…`), many as I/II/III rounds and `[Nieruchomość sprzedana]` / `[nie została sprzedana]` outcome-tagged.
- **3** flat sale-auction slugs total (`…na-sprzedaz-nieruchomosci-lokal(u)-mieszkaln…`).
- **0** tenant-auction — flat disposal to tenants is bezprzetargowo (`/dokumenty/8614` *Wniosek o sprzedaż lokalu mieszkalnego na rzecz najemcy*).

Live-confirmed active flat auction: **"Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż nieruchomości lokalu mieszkalnego przy ul. Nowej 8 m.2"**, przetarg **30.07.2026** — notice is an HTML stub linking PDF `/pliki/miastopuck/zalaczniki/9668/ogloszenie-o-i-przetargu-lokal-mieszkalny-ul-nowa-8-m-2.pdf` (376 KB, born-digital). Open (nieograniczony), both natural + legal persons, wadium. So the *mechanism* is a real open flat auction — but the **volume is ~0** (a handful ever; ~1 active).

## 2. Where published? (hosts + boards, URLs)
**Primary — town BIP (Alfa / alfatv.pl CMS):** `https://bip.miastopuck.pl`
- Sales (where flats + land live): **Zbywanie nieruchomości** → `https://bip.miastopuck.pl/artykul/zbywanie-nieruchomosci` (`/dokumenty/150` 301→ here)
- Przetargi (LEASE only) — **Przetargi** → `https://bip.miastopuck.pl/artykul/przetargi` (52 notices, all dzierżawa/najem)
- Wykazy nieruchomości → `https://bip.miastopuck.pl/artykul/wykazy-nieruchomosci` (`/dokumenty/3666`)
- Wyniki — **Informacje o wyniku przetargów i rokowań** → `https://bip.miastopuck.pl/artykul/informacje-o-wyniku-przetargow-i-rokowan` (`/dokumenty/6519`)
- Gospodarka Nieruchomościami menu → `/dokumenty/menu/20`; Dzierżawa/najem → `/dokumenty/151`
- Notice URL pattern: `/artykul/<długi-slug>`; PDF attachments: `/pliki/miastopuck/zalaczniki/NNNN/<file>.pdf`
- **Mirror host:** `https://miastopuck-bip2.alfatv.pl/…` (same `/dokumenty/NNNN`, `/artykul/…` scheme; returns 200 — a secondary/"bip2" instance).

**Do NOT confuse** with rural **Gmina Puck** (`bip.gmina.puck.pl`, `gmina.puck.pl`, WordPress + Nefeni-style BIP) or **Starostwo Powiatowe w Pucku** (`bip.starostwo.puck.pl`) — separate JSTs, out of scope. Contact for the town: Referat Gospodarki Nieruchomościami i Planowania Przestrzennego, Urząd Miasta Puck, ul. 1 Maja 13.

## 3. Format + rendering
- **Server-rendered HTML**, no SPA, no auth, no CAPTCHA. CMS = **Wytwórnia Telewizyjno-Filmowa Alfa "BIP v89.3.a.2"** (footer `alfatv.pl/kontakt`).
- List boards render a **jQuery DataTables** table of `/artykul/<slug>` rows (client-side paging/sort/search over server HTML — full row set is in the initial HTML, ~0.9–1.1 MB per board incl. nav chrome).
- Individual notice = thin HTML page whose substantive content is a **born-digital text-PDF** attachment under `/pliki/miastopuck/zalaczniki/…`. Cena wywoławcza / powierzchnia / termin / wadium live inside the PDF → needs `pdfText` (OCR unlikely; these are digital PDFs).
- **Geoblock:** US-based WebFetch → HTTP 403; Polish-IP curl → HTTP 200. Adapter must run from a PL egress (as the fleet does).

## 4. Volume + achieved-price stream
- **Flat volume: ~0.** 3 flat auctions total in board history, 1 active (Nowa 8 m.2). Not recurring — a flat surfaces every few years at most.
- **Land volume: high.** 309 open land auctions (I/II/III rounds), the actual bread-and-butter of this BIP — in-scope only for a *land* dataset, not the flat target.
- **Achieved-price stream: land only.** The Wyniki board publishes `Informacja o wyniku … przetargu dz. nr …` per parcel (e.g. `informacja-o-wyniku-iii-przetargu-dz-nr-15-11-…`), and sale notices are outcome-tagged `[Nieruchomość sprzedana]`. Hammer price sits inside the result PDF. **No flat results** observed (flats too rare/recent). So there is a results pipeline, but it tracks działki, not lokale mieszkalne.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** No exact fleet match for the **Alfa (alfatv.pl) BIP** CMS. Nearest by rendering is the **bip.net / extranet.pl** family (server-HTML index + born-digital text-PDF notices): DataTables list → `/artykul/…` row → PDF → `pdfText`. Filtering land vs flat vs lease is a title-regex classification step.
- **Effort if built:** Low-Medium — clean server HTML, stable slug/PDF URL scheme, no JS gate; cost is per-notice PDF text extraction and dropping the land/lease majority.
- **Blockers:** (a) **flat-auction volume is effectively zero** — 3 ever, 1 active; (b) PL-only egress required (US 403); (c) the primary "PRZETARGI" board is a decoy (100% dzierżawa/najem), real flat notices hide on the sales board among 300+ land parcels; (d) no housing manager (ZGM/ZBM/TBS) to concentrate residential stock; (e) tenant flat sales are bezprzetargowo (no auction, no price contest).
- Per the spike heuristic — *generic city-BIP skewing to land + tenant sales with ~0 open flat auctions = NO-BUILD* — Puck matches almost exactly.

**VERDICT: NO-BUILD** — town Miasto Puck runs a busy OPEN LAND-auction program on a clean Alfa/alfatv server-HTML BIP, but flat auctions are near-zero (3 historical, 1 active), residential disposal is otherwise bezprzetargowo na rzecz najemcy, and the przetargi board is all lease. Not worth a flat-focused adapter. Revisit only if a land dataset is in scope or flat cadence rises.
