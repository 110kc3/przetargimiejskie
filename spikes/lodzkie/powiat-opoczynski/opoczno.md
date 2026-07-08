# Spike — Opoczno (Łódzkie · powiat opoczyński)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (effort —).

## TL;DR
Gmina Opoczno (Urząd Miejski, Wydział Rolnictwa i Gospodarki Gruntami) disposes of municipal property on its city BIP `bip.opoczno.pl`, which runs **NowyBIP by ZETO** (Rails/Passenger backend; file store on `fs.siteor.com`; clean server-rendered HTML + born-digital text PDFs). There is a housing manager — **ZGM Opoczno (Zakład Gospodarki Mieszkaniowej Sp. z o.o., ex-TBS 2002)** — but it is a **rental/administration company only** (najem, zarząd budynkami); it does NOT sell flats. Every OPEN auction on the gmina board is **land** (nieruchomości niezabudowane, działki). Flats (lokale mieszkalne) appear only in the *wykaz do sprzedaży*, and every one is **"sprzedaż na rzecz najemcy lokalu mieszkalnego"** — i.e. bezprzetargowo to the sitting tenant. Open flat-auction volume = **ZERO**. Textbook Łódzkie NO-BUILD: generic city-BIP skewed to land auctions + tenant flat sales, with a housing manager that only rents.

## 1. Sells municipal property at auction?
**Land: YES. Flats at OPEN auction: NO.** The Burmistrz Opoczna runs `przetarg ustny nieograniczony`, but the entire live pipeline is undeveloped land:
- "Burmistrz Opoczna ogłasza trzeci przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanych" (działki 112/14, 113/20, 113/23, 113/28, obr. 7, ul. Zielna-Płonowa).
- "…drugi przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej" (działka 729/3).
- "…pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej" (działki 429/2, 765/2, 769/2 …).

**Flats are disposed of bezprzetargowo.** The *wykaz do sprzedaży* PDFs list flats but each is sold outside auction to the tenant. From `wykaz grudzień 2022` (born-digital text): "Lokal mieszkalny Nr 34 przy ul. Rolnej 14", "Lokal mieszkalny Nr 8 przy ul. Oskara Kolberga 2A", "Lokal mieszkalny Nr 9 przy ul. Rolnej 14" — each with tryb **"Sprzedaż nieruchomości lokalowej na rzecz najemcy lokalu mieszkalnego"**. No `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` was found anywhere (announcements, results, or search index). ZGM Opoczno's statutory scope is "prowadzenie remontów i modernizacji obiektów … na zasadzie najmu" and "sprawowanie … zarządu budynkami mieszkalnymi" — rental/management, no sales board.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (NowyBIP / ZETO):** `bip.opoczno.pl` (aliases `www.bip.opoczno.pl`, legacy mirror `opoczno.i-gmina.pl`, portal `um.opoczno.pl`).
- Ogłoszenia o przetargach: `https://www.bip.opoczno.pl/zbycia-i-dzierzawy---pozostale-informacje/ogloszenia-o-przetargach/`
- Informacje o wyniku przetargu (results): `https://www.bip.opoczno.pl/zbycia-i-dzierzawy---pozostale-informacje/informacje-o-wyniku-przetargu/`
- Wykaz do sprzedaży: `https://www.bip.opoczno.pl/zbycia-i-dzierzawy---pozostale-informacje/wykaz-do-sprzedazy/`
- Wykaz do dzierżawy/najmu/aportu/użyczenia: `https://www.bip.opoczno.pl/zbycia-i-dzierzawy---pozostale-informacje/wykaz-do-dzierzawy-najmu-aportu-uzyczenia/`
- Standing procedure page: `https://bip.opoczno.pl/article/sprzedaz-lub-oddanie-w-uzytkowanie-wieczyste-nieruchomosci-komunalnych`
- ZGM (housing manager) BIP: `https://bip.opoczno.pl/zaklad-gospodarki-mieszkaniowej` · site `https://zgmopoczno.pl/`
- Attachments (PDF): `https://fs.siteor.com/opoczno/article_attachments/attachments/NNNNNN/original/<file>.pdf` · print route `/app/articles/print/<slug>.pdf`

Contact: Wydział Rolnictwa i Gospodarki Gruntami, ul. Staromiejska 6 (bud. E), 26-300 Opoczno, tel. 44 736 31 26.

## 3. Format + rendering
- **Server-rendered HTML** — NowyBIP by ZETO (nginx + Phusion Passenger, Rails; `siteor.com` platform). Boards are dated HTML article lists; no SPA, no auth, no CAPTCHA (confirmed via curl + fetch).
- **Born-digital text PDFs** — the substantive content (ogłoszenie, wykaz, wynik) lives in attached PDFs on `fs.siteor.com`. Verified: `wykaz grudzień 2022` = 3-page PDF, 4.5 KB extractable text via `pdfText`, **no OCR needed**.
- Each article also exposes a print PDF at `/app/articles/print/<slug>.pdf`.

## 4. Volume + achieved-price stream
- **Open flat auctions: 0.** Announcements board = land only; results board = **9 entries, all land** (150/46, 112/14, 113/20, 113/23, 113/28, 729/3, 429/2 batch, 608/38), zero flats/lokale użytkowe.
- **Flat disposals:** a handful/year, all **bezprzetargowo na rzecz najemcy** via the wykaz — no auction, no competitive hammer price.
- **Achieved-price stream:** land only. "Informacja o wyniku przetargu" exists but prices sit inside attached PDFs (not in HTML), and none are flats. No residential hammer-price feed to harvest.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (CMS):** NowyBIP / ZETO on `siteor.com` — server-HTML boards + born-digital text-PDF attachments; rendering comparable to the bip.info.pl / bip.net text-PDF families. Buildable *technically* if it had flat auctions — but it doesn't.
- **Effort:** **— (NO-BUILD).** No open flat-auction target to parse; wiring an adapter would yield land-only + tenant sales, off-thesis.
- **Blockers (thesis, not tech):** (1) zero open `sprzedaż lokalu mieszkalnego` auctions; (2) all flat disposal is bezprzetargowo na rzecz najemcy; (3) housing manager ZGM only rents/administers, no sales board; (4) results board is land-only. Matches the Łódzkie small-seat NO-BUILD pattern exactly (BUILD would need a housing manager that actually auctions flats — absent here).

**VERDICT: NO-BUILD** — Opoczno runs open auctions for land only; municipal flats are sold bezprzetargowo to sitting tenants, ZGM merely manages rentals, and there is no open flat-auction or residential hammer-price stream to harvest.
