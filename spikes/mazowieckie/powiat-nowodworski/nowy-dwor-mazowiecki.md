# Spike — Nowy Dwór Mazowiecki (Mazowieckie · powiat nowodworski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (residential disposal is tenant right-to-buy, not open auction).

## TL;DR
Gmina Miejska Nowy Dwór Mazowiecki (~28k) publishes property notices on its BIP `bip.nowydwormaz.pl`, which runs **bip.net 7.33 by extranet** (clean server-HTML board shell; individual notices delivered as **born-digital text-PDF** at `plik,NNNN,slug.pdf`). The main portal `www.nowydwormaz.pl` is the same vendor family (netadmin 7.33 / extranet). There IS a dedicated **"Przetargi nieruchomości"** board and a municipal housing company (**ZBK — Zarząd Budynków Komunalnych Sp. z o.o.**), so the surface looks promising — but the substance fails the flat-auction test. The open-auction (`przetarg ustny nieograniczony`) stream is **land-dominated** (działki niezabudowane + occasional udział / lokal użytkowy); the live board on spike day carried a single **land** result. Municipal **flats are disposed of bezprzetargowo na rzecz najemcy** (right-to-buy, ~90% discount per Rada Miejska resolution, installments to 10 years) via *wykaz* lists — no competitive bidding, no hammer price. ZBK only runs lease/maintenance/inspection tenders, never flat sales. Open flat-auction volume ≈ 0. Closest analog: generic Mazowieckie city-BIP land+tenant-sale skew (bip.net/extranet family) — technically trivial to scrape, but nothing to scrape *for*.

## 1. Sells municipal property at auction?
**Land: YES. Flats: essentially NO (tenant right-to-buy, not auction).**
- **Open auctions run**, but on **land**: `II przetarg ustny nieograniczony na sprzedaż nieruchomości` ul. Leśnej (dz. 51/8, 52/7…); ul. Daszyńskiego 18 (udział, dz. 36/1, 36/2); **ul. Przemysłowej** (recurring działki, I–III przetarg, latest result 24.06.2026); Wólka Górska gm. Jabłonna (dz. 288/23–26); ul. Bema (dz. 3/57); ul. Dębowej (IV przetarg, dz. 28/28–34). One **non-residential** unit U1 at ul. Warszawska 3A. One rare residential item historically (prawo własności lokalu, ul. Piekarska 21) — an outlier, not a recurring stream.
- **Flats (lokale mieszkalne)** are sold **w drodze bezprzetargowej na rzecz najemców, z którymi najem nawiązano na czas nieoznaczony** — wykazy for ul. Lotników 11, Długa 4A, Inżynierska 3, płk. Malewicza 282, 29 Listopada 327, etc. Price = rzeczoznawca valuation **obniżona o 90%** per Rada Miejska resolution, ratalnie do 10 lat. This is classic right-to-buy: no przetarg, no wadium, no competing bidders, **no achieved/hammer price**.
- **ZBK (Zarząd Budynków Komunalnych Sp. z o.o.)** — the housing manager — runs only building inspections, boiler/utility maintenance, cleaning, and one **lease** (najem lokalu użytkowego, ul. Młodzieżowa 4U). **Zero flat sale-auctions.**

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (`bip.nowydwormaz.pl`, bip.net 7.33 / extranet):**
- Gospodarka nieruchomościami (parent): `https://bip.nowydwormaz.pl/1356,gospodarka-nieruchomosciami`
- **Przetargi nieruchomości** (auctions + results): `https://bip.nowydwormaz.pl/1368,przetargi-nieruchomosci`
- Zbywanie nieruchomości (wykazy sprzedaży): `https://bip.nowydwormaz.pl/1366,zbywanie-nieruchomosci`
- Dzierżawa nieruchomości (lease wykazy): `https://bip.nowydwormaz.pl/1367,dzierzawa-nieruchomosci`
- Użyczenie nieruchomości: `https://bip.nowydwormaz.pl/1481,uzyczenie-nieruchomosci`
- Document/notice URL pattern: `https://bip.nowydwormaz.pl/plik,NNNN,slug.pdf` (e.g. `plik,6579,informacja-o-wyniku-iii-przetargu-…-przemyslowej.pdf`).
- NOTE: legacy CMS URLs `bip.nowydwormaz.pl/public/?id=NNNN` and `/public/print/?id=NNNN` (2020–2024 archive, incl. the tenant-sale wykazy) are now **dead (HTTP 404)** — site migrated to the `NNNN,slug` bip.net scheme.

**Housing company:** `https://www.zbkndm.pl/przetargi` (custom PHP/Joomla-ish, server HTML, 21 pages) — lease + maintenance only.
**Portal (context/redirect):** `https://www.nowydwormaz.pl/1379,sprzedaz-nieruchomosci` (netadmin 7.33, same extranet family, `plik,NNNN,…pdf` docs).
Contact: Wydział Gospodarki Nieruchomościami, Urząd Miejski, ul. Zakroczymska 30, 05-100 Nowy Dwór Mazowiecki.

## 3. Format + rendering
- **Server-rendered HTML** board shell — bip.net 7.33 by extranet. Confirmed via curl: HTTP 200, ~120–133 KB pages, PHPSESSID + `licznikNNNN` cookies, `<title>` per board. No JS/SPA gate, no auth, no CAPTCHA.
- **Individual notices = born-digital text-PDF** attachments (`plik,NNNN,slug.pdf`, ~0.4–0.5 MB) — the board HTML carries the title + date; body/price detail lives in the PDF. Parse with `pdfText` (no OCR needed).
- Matches the `bip.net (extranet.pl) → server-HTML + text-PDF` analog exactly.

## 4. Volume + achieved-price stream
- **Open FLAT auctions: ≈ 0 recurring.** The przetarg stream is land (działki niezabudowane, recurring at ul. Przemysłowej) plus the odd udział / lokal użytkowy. Live board on 2026-07-08 = one land result. Flats go the tenant right-to-buy route.
- **Achieved-price stream: land only.** `Informacja o wyniku przetargu` notices exist (e.g. III przetarg ul. Przemysłowej, 24.06.2026) — but for land. **No hammer prices for flats** exist because flats are never auctioned; tenant-sale prices are valuation-minus-90%, not market-cleared.
- Net: nothing that feeds the target dataset (competitive flat-auction outcomes).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** generic Mazowieckie / bip.net-extranet city-BIP with a land+tenant-sale skew — same server-HTML+text-PDF shape as bip.net(extranet) targets, but on the NO-BUILD side of the ledger (like small seats where residential disposal is right-to-buy only).
- **CMS family:** bip.net 7.33 (extranet.pl) — server-HTML boards, `plik,NNNN,…pdf` born-digital docs. Technically **Low** effort to scrape *if there were flats*.
- **Blockers (business, not technical):** (1) municipal flats disposed **bezprzetargowo na rzecz najemcy** at 90% discount — no auction, no competitive price; (2) open-auction stream is land + occasional non-residential unit; (3) housing manager (ZBK) sells nothing, only leases/maintains; (4) no flat achieved-price board. Open flat-auction volume ≈ 0.
- **Effort:** — (n/a — no flat-auction product to build).

**VERDICT: NO-BUILD** — clean, easily-scrapable bip.net/extranet BIP, but residential disposal is tenant right-to-buy (bezprzetargowo, −90%), the przetarg stream is land-only, and the ZBK housing company runs no sale auctions. ~0 recurring open flat auctions = correct NO-BUILD.
