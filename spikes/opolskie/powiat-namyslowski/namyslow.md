# Spike — Namysłów (Opolskie · powiat namysłowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low–Medium effort).

## TL;DR
Namysłów (gmina miejsko-wiejska, powiat seat) has a working municipal **housing manager** — **ZAN Sp. z o.o.** (Zakład Administracji Nieruchomości, ex-**ADM-TBS**, rebranded 2011) — that runs **recurring publiczne przetargi ustne nieograniczone na sprzedaż lokalu mieszkalnego**. Its **WordPress** site `zan-namyslow.pl/przetargi/` carried **3 active flat auctions** on spike day, all in **repeat rounds (III/IV)** — i.e. a steady flat pipeline, not a one-off. Notices are **server-rendered inline HTML** (born-digital) with full detail — address, powierzchnia użytkowa, **cena wywoławcza**, data przetargu, KW — plus a backup **born-digital PDF** per notice. The Gmina's own BIP `bip.namyslow.eu` (a gov.pl / bip.gov.pl CMS) carries the classic land + wykaz + wynik stream (no flats), and the county Starostwo (`bip.namyslow.pl`) is a separate out-of-scope JST. The flat-auction engine here is **ZAN**, and it is clean and parseable. Closest analog: a WordPress list+post gmina/housing-manager (brzeg / nowa-sól / olkusz shape). Only weakness: no dedicated flat **results** board (achieved prices inferred from repeat rounds). No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, flats specifically, via the municipal housing manager ZAN.** ZAN Sp. z o.o. announces `publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` for municipal housing stock. Confirmed live flat auctions on the ZAN board (2026):
- **ul. Jana Pawła II 5a/2** — IV przetarg ustny nieograniczony; **60,12 m²** pow. użytkowej; **cena wywoławcza 160.000,00 zł**; przetarg **30.07.2026 g. 11:00**; KW **OP1U/00069839/1**. (Full detail inline in the HTML post + PDF backup.)
- **ul. Boh. Warszawy 7/8** — III przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego.
- **ul. Jana Pawła II 5, lok. 2** — III przetarg ustny nieograniczony (post dated 13.04.2026).

Older ZAN flats (mirrored on the city portal, `namyslow.eu/8832`): **ul. B. Chrobrego 21/3** (94,97 m² + piwnica), **21/4** (95,52 m²), **ul. 3-go Maja 23 lok. 3** (42,39 m²) — all "III publiczny przetarg ustny nieograniczony na sprzedaż".

The **Gmina Namysłów** (Urząd Miejski) separately runs `przetarg ustny nieograniczony` for its own real estate, but that stream skews to **land** (e.g. Ligotka dz. 345–349) + `wykaz nieruchomości do sprzedaży` + `informacja o wyniku przetargu` (mostly *ograniczony* / land) — no flats on the gmina board at spike time. The **Starostwo Powiatowe** (county) also sells flats (e.g. Rynek 16/7, cena wyw. 50.000–70.000 zł) on `bip.namyslow.pl` — **separate JST, out of scope**.

## 2. Where published? (hosts + boards, URLs)
**Primary — ZAN housing manager (WordPress) — THE flat-auction stream:**
- Auctions board: `https://zan-namyslow.pl/przetargi/`
- Example notice (permalink): `https://zan-namyslow.pl/iv-publiczny-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-ul-jana-pawla-ii-5a-2-w-namyslowie/`
- Attached PDFs: `https://zan-namyslow.pl/pseeckoo/2026/06/Przetarg-Jana-Pawla-II.pdf`, `…/REGULAMIN-SPRZEDAZY-1.pdf` (uploads at `/pseeckoo/YYYY/MM/`)
- Contact: ZAN Sp. z o.o., ul. Dubois 5, Namysłów; tel. 77-4107-265; sekretariat@zan-namyslow.pl
- Mirror on city portal: `https://namyslow.eu/8832/zarzad-zakladu-administracji-nieruchomosci-oglasza-przetargi.html` (same notices as PDF attachments)

**Secondary — Gmina Namysłów BIP (gov.pl / bip.gov.pl CMS) — land + wykaz + wyniki:**
- Ogłoszenia 2026 board: `https://bip.namyslow.eu/9700/4221/ogloszenia-w-2026-roku.html` (paginated, ~144 items; land auctions, wykaz, wynik notices — inline HTML `/NNNN/4221/slug.html`)
- City-portal sale page (gmina, PDF ogłoszenia I–IV, mixed land/flat): `https://namyslow.eu/6301/sprzedaz-nieruchomosci-stanowiacych-wlasnosc-gminy-namyslow.html`
- Historical gmina notices also on legacy `bip.namyslow.eu/6420/…`, `bip.namyslow.eu/5704/…` (ZAN info page).

**Do NOT confuse:** `bip.namyslow.pl` = **Starostwo Powiatowe** (county, separate JST, own flat sales); our targets are `zan-namyslow.pl` (housing manager) + `bip.namyslow.eu` (gmina).

## 3. Format + rendering
- **ZAN (primary): server-rendered HTML, WordPress.** `/przetargi/` is a category index of dated posts; each post permalink carries the **full notice inline as born-digital HTML text** — address, powierzchnia użytkowa, cena wywoławcza, data/godzina przetargu, KW — verified live (Jana Pawła II 5a/2: 160.000 zł / 60,12 m² / 30.07.2026 all inline). Each post also links a **born-digital text-PDF** (`Przetarg-*.pdf`) + a `REGULAMIN-SPRZEDAZY.pdf`. No SPA, no auth, no CAPTCHA. OCR not needed — text is in the HTML; PDFs are born-digital backups.
- **Gmina BIP (secondary): server-rendered HTML** on a gov.pl/bip.gov.pl template (`/NNNN/NNNN/slug.html`), inline-HTML notices. Land/wykaz/wynik stream — parseable but not flat-bearing.
- Both plain server HTML; no JS gate on either.

## 4. Volume + achieved-price stream
- **Volume: modest-to-good and recurring.** ~3 open flat auctions live simultaneously on the ZAN board at spike time (Jana Pawła II 5a/2, Boh. Warszawy 7/8, Jana Pawła II 5/2), **all in repeat rounds (III/IV)** — meaning a rolling inventory of gmina flats cycling through successive auctions. Plus a back-catalogue (Chrobrego 21, 3-go Maja 23). Expect a handful of flats/year, several as II/III/IV rounds. Gmina land auctions run on a separate (busier) board.
- **Achieved-price stream: WEAK.** No dedicated flat **results** board on ZAN — its "zawiadomienie o wyborze oferty" posts are for renovation procurement, not flat outcomes. Partial price signal: **cena wywoławcza** is published per flat, and the round number (III/IV) implies non-sale at higher rounds. The Gmina BIP publishes `informacja o wyniku przetargu`, but for its own land auctions, not ZAN flats. Hammer prices for flats are therefore inferred, not directly scraped.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** WordPress **list + post inline-HTML** source — **brzeg / nowa-sól / olkusz** pattern (category index → post permalink → regex/DOM parse of inline notice). A housing-manager WordPress variant.
- **CMS family:** ZAN = **WordPress/custom-HTML** (ADAPTER-GUIDE §3 plain-HTML family); Gmina BIP = gov.pl/bip.gov.pl server-HTML (secondary, land only).
- **Effort: LOW–MEDIUM.** Crawl `zan-namyslow.pl/przetargi/` → follow post permalinks → parse inline HTML for address (from title + body), powierzchnia użytkowa, cena wywoławcza, data przetargu, round, KW; PDF as fallback (`pdfText`, born-digital). Category/keyword filter to drop non-flat items (termomodernizacja, zapytania ofertowe, zawiadomienia o wyborze). Optionally add the Gmina BIP board as a second source for land/wykaz + results.
- **Blockers:** None technical. Watch-items: (1) two-source layout (ZAN flats vs Gmina land) — keep straight and don't ingest the county `bip.namyslow.pl`; (2) no dedicated flat results board → achieved prices are weak/inferred; (3) WordPress upload paths (`/pseeckoo/…`) for PDFs.

**VERDICT: BUILD (Low–Medium effort)** — a genuine municipal housing manager (ZAN, ex-ADM-TBS) running recurring **open oral flat auctions** with full born-digital inline-HTML detail on a clean WordPress board; standard WordPress list+post analog, no blockers. Only shortfall is the missing flat results board (starting prices + repeat rounds carry the price signal).
