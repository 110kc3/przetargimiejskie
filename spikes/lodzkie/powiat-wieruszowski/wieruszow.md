# Spike — Wieruszów (Łódzkie · powiat wieruszowski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (no open flat-auction stream).

## TL;DR
Gmina Wieruszów (miejsko-wiejska, seat) sells municipal property, but **flats (lokale mieszkalne) go `bezprzetargowo na rzecz najemcy` z bonifikatą** (tenant sales — e.g. the wykaz for the multi-unit building at **ul. Dąbrowskiego 1-7**), not via open oral auction. The *open* auctions the Burmistrz runs (`przetarg ustny nieograniczony/ograniczony na sprzedaż nieruchomości`) are **land** — nieruchomości zabudowane / niezabudowane / działki. No confirmed `ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego`. The BIP runs on the **WOKISS** regional CMS (`bip3.wokiss.pl/wieruszowm/`); property notices are individual items / PDF attachments buried on yearly **"Ogłoszenia i informacje"** boards — there is **no dedicated przetargi-nieruchomości board and no dedicated results (rozstrzygnięcia) board**. Housing stock is managed by **Przedsiębiorstwo Komunalne w Wieruszowie S.A.** (`bip.pkwieruszow.pl`, biuletyn.net CMS), which runs the "Własne Mieszkanie" installment new-build program — again not an open flat-auction stream. Small town (~9k), very low volume. No usable flat-auction stream → NO-BUILD.

## 1. Sells municipal property at auction?
**YES for land; NO for flats via open auction.**
- **Flats → tenant sales, not auction.** Confirmed wykaz: *lokale mieszkalne przy ul. Dąbrowskiego 1-7 przeznaczone do sprzedaży na rzecz najemców z bonifikatą* (bezprzetargowo, Art. 34 ugn). This is the standard tenant-preemption path — no bidding, no achieved-price contest.
- **Open auctions = land.** The Burmistrz's `przetarg ustny nieograniczony/ograniczony na sprzedaż nieruchomości` notices concern **nieruchomości zabudowane / niezabudowane / działki** (e.g. the 2025-05-28 przetarg ustny ograniczony na sprzedaż nieruchomości zabudowanej; a przetarg nieograniczony na sprzedaż nieruchomości pushed to the gmina Facebook). No `lokal mieszkalny` open-auction notice surfaced.
- Also present: `wykaz lokali użytkowych do wynajęcia w trybie bezprzetargowym` (commercial-space leases) — out of scope.

## 2. Where published? (hosts + boards, URLs)
**Primary — Gmina Wieruszów BIP (WOKISS CMS):** `https://bip3.wokiss.pl/wieruszowm/`
- Ogłoszenia i informacje (hub, yearly boards): `http://bip3.wokiss.pl/wieruszowm/bip/ogloszenia-i-informacje.html`
- Current boards: `.../ogloszenia-i-informacje/ogloszenia-i-informacje-2025.html`, `.../ogloszenia-i-informacje-2026.html` (older years 2012-2024 each own page)
- Finanse i Mienie → Mienie komunalne: `http://bip3.wokiss.pl/wieruszowm/bip/finanse-i-mienie/mienie-komunalne.html`
- Printable item pattern: `http://bip3.wokiss.pl/wieruszowm/wydruk.html?id=NNNN`
- Zamówienia publiczne (procurement, not property): `https://bip3.wokiss.pl/wieruszowm/bip/zamowienia-publiczne.html`

**Housing manager — Przedsiębiorstwo Komunalne w Wieruszowie S.A. BIP (biuletyn.net CMS):** `https://bip.pkwieruszow.pl/`
- Przetargi (PK, procurement/works): `https://bip.pkwieruszow.pl/wiadomosci/3/lista/przetargi`
- Runs "Wieruszowski Program Własne Mieszkanie" (installment purchase of new-build flats) — a nabór, not an open auction.

**Powiat (out of scope, separate JST):** `https://bip.powiat-wieruszowski.pl/bipkod/007` — Starostwo Powiatowe przetargi.

Property notices are pushed to the gmina **Facebook** (facebook.com/GminaWieruszow) and to aggregators (przetargi.egospodarka.pl, gazetawroclawska/gloswielkopolski komunikaty). No dedicated `Rozstrzygnięcia / wyniki przetargów na sprzedaż nieruchomości` board on the BIP.
Contact: Wydział Planowania Przestrzennego, Ochrony Środowiska i Gospodarki Nieruchomościami, tel. 62 783 26 35; Rynek 1-7.

## 3. Format + rendering
- **Server-rendered HTML** — WOKISS shared regional BIP CMS (Wielkopolski Ośrodek Kształcenia i Studiów Samorządowych; note Wieruszów is a Łódzkie border town on a Wielkopolska CMS). Pages are static `.html` under `/wieruszowm/bip/...`; individual notices carry born-digital **PDF attachments** (the ogłoszenie/wykaz body) plus a `wydruk.html?id=` printable view.
- **No SPA, no auth, no CAPTCHA.** Some subpaths 404 (moved between years); some regional-media mirrors (gazetawroclawska) 403 the bot — irrelevant, BIP is the source.
- Notices are **not in a structured board** — they are dated list items on a generic "Ogłoszenia i informacje" page mixing property sales with road works, environmental notices, HR, etc. High classification/noise cost.

## 4. Volume + achieved-price stream
- **Volume: very low.** Wieruszów is a ~9k-population town. A handful of land auctions per year; flats leave the stock **bezprzetargowo to tenants** (no contest). Flat *open-auction* volume ≈ **0/yr**.
- **Achieved-price stream: effectively none for flats.** No dedicated results/rozstrzygnięcia board; `informacja o wyniku przetargu` (if published) lands as another loose item on the yearly ogłoszenia page, and only for the land auctions. There is no flat hammer-price stream to harvest.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built for land):** a WOKISS regional-BIP gmina (`bip3.wokiss.pl/<gmina>/`) — server-HTML yearly boards + PDF attachments, WordPress/custom-HTML family in ADAPTER-GUIDE §3 terms. No existing registered analog is on WOKISS specifically; would be a cold-ish build.
- **CMS family:** WOKISS hosted BIP (server-rendered static HTML + born-digital PDF attachments).
- **Effort for the target (flats): N/A — no stream to extract.** The flat pipeline (tenant bezprzetargowo) yields no wywoławcza-vs-osiągnięta contest. A land-only adapter would be **Medium** (no dedicated property board → must scrape+classify a mixed yearly ogłoszenia page, then pull each PDF; no results board for hammer prices) for a very thin, low-volume feed — poor ROI.
- **Blockers:** (1) flats are tenant sales, not auctions — the core BUILD signal is absent; (2) no dedicated property or results board — notices are mixed into generic yearly pages as PDF attachments; (3) very low absolute volume; (4) housing manager (PK S.A.) runs an installment program, not auctions.

**VERDICT: NO-BUILD** — no `ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego` stream: Wieruszów flats go bezprzetargowo to tenants (z bonifikatą), open auctions are land-only, low-volume, and published as loose PDF attachments on a mixed WOKISS-BIP ogłoszenia board with no results board. Not worth an adapter.
