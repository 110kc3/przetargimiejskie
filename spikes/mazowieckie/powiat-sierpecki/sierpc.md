# Spike — Sierpc (Mazowieckie · powiat sierpecki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD — municipal flats are sold **bezprzetargowo na rzecz najemcy**; the only OPEN oral auctions (`przetarg ustny nieograniczony`) on the BIP board are **land + lease (najem)**, ~0 flat-sale auctions.

## TL;DR
Gmina Miasto Sierpc (Urząd Miejski, Burmistrz Miasta Sierpca) runs `przetarg ustny nieograniczony` — but every open-auction notice on the city BIP across 2021/2023/2025 is for **undeveloped land** (`sprzedaż niezabudowanej nieruchomości`), plus occasional `przetarg ustny ograniczony` (neighbouring-owner land) and a `najem` (lease) auction. **Municipal residential units are sold bezprzetargowo to sitting tenants** with a bonifikata under Uchwała 406/LIII/2021 (a dedicated e-service "Sprzedaży komunalnego lokalu mieszkalnego na rzecz najemcy" covers it), so flats never reach the open-auction board. New housing supply is rental via SIM Północne Mazowsze (TBS-family), not sale-by-auction. No dedicated ZGM/ZBM flat-auction stream. Source is a clean, scrapeable hosted BIP (`bip.sierpc.pl`, `bipkod/NNNNN` boards + born-digital PDFs), but there is essentially no flat-auction volume to extract → NO-BUILD for the flat target.

## 1. Sells municipal property at auction?
**Land: YES (open oral auction). Flats: NO (bezprzetargowo na rzecz najemcy).**
- The Burmistrz Miasta Sierpca conducts `I PRZETARG USTNY NIEOGRANICZONY` under ustawa o gospodarce nieruchomościami — confirmed born-digital notice text: *"na sprzedaż niezabudowanej nieruchomości, stanowiącej własność Gminy Miasto Sierpc … przy ulicy Stefana Żeromskiego"* (działki 187/3-5, cena wywoławcza 120 000 zł, wadium 12 000 zł, 07.09.2023). This is **land**, not a flat.
- 2025 board: `przetarg ustny nieograniczony na sprzedaż` (ul. 11 Listopada — land/building), `przetarg ustny ograniczony` (ul. Płocka — restricted, neighbouring owners), `przetarg ustny nieograniczony na najem` (10-yr lease of a commercial building). No flat sales.
- 2021 board: undeveloped land (ul. Bojanowska/Żeromskiego, ul. Kazimierza Odnowiciela), restricted land auctions, one dzierżawa. No flat sales.
- **Flats:** sold **bezprzetargowo na rzecz najemcy** with bonifikata under **Uchwała Nr 406/LIII/2021 Rady Miejskiej Sierpca (24.11.2021)** — tenant buy-outs at ul. Wyzwolenia 6/1, Grota-Roweckiego 3, Wiosny Ludów 9, Słowackiego 21/25, etc. Dedicated procedural e-service: *"Sprzedaży komunalnego lokalu mieszkalnego na rzecz najemcy"* (`bipkod/28645110`). These are non-auction, targeted sales → out of scope.
- No dedicated municipal housing manager (ZGM/ZBM/MZBM) publishing flat auctions; the local mieszkaniowy vehicle is **SIM Północne Mazowsze Sp. z o.o.** (Dworcowa — social rental, nabór na najem), which does not run flat-sale auctions.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (hosted BIP CMS):** `https://bip.sierpc.pl`
- Sprzedaż nieruchomości w drodze przetargu (procedura + entry): `https://bip.sierpc.pl/bipkod/10756091`
- Przetargi 2025: `https://bip.sierpc.pl/bipkod/37892742`
- Przetargi 2023: `https://bip.sierpc.pl/bipkod/31281413`
- Przetargi 2021: `https://bip.sierpc.pl/bipkod/25737123`
- Flats (tenant buy-out, non-auction): `https://bip.sierpc.pl/bipkod/28645110`
- Notice PDFs: `https://bip.sierpc.pl/res/serwisy/pliki/<ID>?version=1.0` (e.g. `.../32934790?version=1.0`).
- Both announcements (`Ogłoszenie o … przetargu`) and results (`Informacja o wyniku … przetargu`) are posted on the same year boards, paginated (~36 items / 4 pages per year).
- **Do NOT confuse** with rural **Gmina Sierpc** (`ugsierpc.bipgmina.pl`, bipgmina.pl CMS) or **Starostwo Powiatowe w Sierpcu** (`sierpc.starostwo.gov.pl`) — separate JSTs, out of scope. Target is the town **Gmina Miasto Sierpc** (Urząd Miejski, ul. Piastowska 11a).

## 3. Format + rendering
- **Server-rendered HTML** boards (numeric `bipkod/NNNNN` IDs; paginated dated article lists). No SPA, no auth, no CAPTCHA observed.
- Notices are **born-digital PDF** attachments (confirmed: created with Microsoft Word 2013, selectable text via `pdftotext -layout`; **not** scanned images → no OCR needed). Attachment URL pattern `res/serwisy/pliki/<ID>?version=1.0`.
- CMS family: hosted/bespoke BIP (WordPress/custom-HTML family in ADAPTER-GUIDE §3 terms — HTML boards + born-digital PDF attachments). Technically very scrapeable.

## 4. Volume + achieved-price stream
- **Open flat-sale auctions: ~0/year.** No `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` found on any year board (2021/2023/2025 all land + lease). The one 2023 notice the auto-classifier flagged as a "flat" is, on reading the PDF, **undeveloped land** (Żeromskiego działki 187/3-5).
- **Land auctions:** a handful/year (mixed nieograniczony/ograniczony + occasional najem).
- **Achieved-price stream:** YES for land — `Informacja o wyniku I przetargu ustnego nieograniczonego` notices are posted on the same boards (born-digital PDF). But there is no flat stream to price.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built for land):** a WordPress/custom-HTML gmina with born-digital-PDF notices (`brzeg`/`nowa-sol` shape) — year board → PDF list → `pdfText` → parse. Technically **Low** effort mechanically.
- **Blocker (decisive):** the flat-auction target is **absent**. Sierpc disposes of residential units **bezprzetargowo na rzecz najemcy** (Uchwała 406/LIII/2021), and open auctions are land/lease only. Per the spike mandate (BUILD only for recurring OPEN flat-sale auctions), there is no flat-sale stream to extract.
- **Effort:** — (no-build).

**VERDICT: NO-BUILD** — Gmina Miasto Sierpc sells flats only bezprzetargowo to sitting tenants (with bonifikata); its open oral auctions on `bip.sierpc.pl` are undeveloped land + one lease, giving ~0 municipal flat-sale auctions per year. Clean scrapeable BIP, but nothing in scope to build.
