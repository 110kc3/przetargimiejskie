# Spike — Prudnik (Opolskie · powiat prudnicki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Prudnik (Urząd Miejski, gmina miejsko-wiejska seat, ~21k) actively and recurrently sells municipal **lokale mieszkalne** by **przetarg ustny nieograniczony**. A dedicated BIP board **"Przetargi na zbycie nieruchomości i lokali"** on `bip.prudnik.pl` (a **Joomla** BIP, template by sm32 STUDIO, LiteSpeed) runs 8 pages of sale-auction announcements. The board list is clean **server-rendered HTML** with `?start=N` pagination; the auction payload (prices, area, wadium, addresses) sits in **born-digital, text-extractable PDFs** in `/images/artykuly/mienie-gminy---przetargi/`. Crucially, each announcement page also carries an **"Informacja o wynikach przetargów" PDF** with *Cena wywoławcza + Najwyższa cena osiągnięta + nabywca* — a real achieved/hammer-price stream. Lease auctions are cleanly segregated on a separate `przetargi-na-dzierzawe-nieruchomosci` board, so sale-only crawling is trivial. Housing manager exists (**Zarząd Budynków Komunalnych w Prudniku**, zbkprudnik.pl) though the disposals are run by the Urząd (WMGiGP). Closest analog: a Joomla/server-HTML BIP with text-PDF notices (extranet.pl text-PDF profile). No OCR, no JS gate, no auth. Effort Medium only because each PDF bundles several lots (land + lokal użytkowy + lokal mieszkalny) needing per-lot parsing.

## 1. Sells municipal property at auction?
**YES — confirmed, flats are a recurring, current category.** Both natural and legal persons bid; auctions held at ul. Kościuszki 3, pokój 117; 10% wadium to Bank Spółdzielczy w Prudniku. Confirmed **open flat (lokal mieszkalny) auctions**, LIVE-verified from the board and PDFs:
- **13.05.2026** — przetarg ustny nieograniczony na sprzedaż **lokalu mieszkalnego, ul. Rynek 20/8**.
- **09.07.2025** — lokale niezabudowane **+ lokal mieszkalny nr 5, ul. Parkowa 8**.
- **21.05.2025** — lokal mieszkalny **ul. Parkowa 8/5**.
- **02.04.2025** — lokale mieszkalne **ul. Rynek 9/7 i ul. Parkowa 8/5**.
- **14.02.2024** — sprzedaż m.in. **lokal mieszkalny ul. Klasztorna 8** (+ wynik PDF 28.03.2024).
- **08.02.2023** — lok. mieszkalne **Klasztorna 8/10, Kochanowskiego 3/1a, Klasztorna 16/2, Chrobrego 11/5**.
- Wykaz pipeline (feeders): **Batorego 28/7, Rynek 15-17/3, Młyńska 28/4, Młyńska 28/3A** przeznaczone do sprzedaży.

This is NOT tenant-only (bezprzetargowo) or lease-only disposal — open flat auctions recur across 2023–2026.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Joomla, `bip.prudnik.pl`):**
- Sale auctions (target board): `https://bip.prudnik.pl/gospodarka-przestrzenna/przetargi-na-zbycie-nieruchomosci-i-lokali` — **8 pages**, pagination `?start=10,20,…,70`.
- Wykaz nieruchomości (feeder, przeznaczone do sprzedaży/najmu): `https://bip.prudnik.pl/gospodarka-przestrzenna/wykaz-nieruchomosci` — 41 pages, `?start=N`.
- Lease auctions (SEPARATE, exclude): `https://bip.prudnik.pl/gospodarka-przestrzenna/przetargi-na-dzierzawe-nieruchomosci`.
- Detail example (with both ogłoszenie + wynik PDFs): `…/przetargi-na-zbycie-nieruchomosci-i-lokali/914-ogloszenie-z-dnia-14-02-2024-r-…`.
- PDF asset folder: `https://bip.prudnik.pl/images/artykuly/mienie-gminy---przetargi/` (e.g. `informacja-z-dnia-28.03.2024-r.pdf`).
- Procedure card: `https://bip.prudnik.pl/1449/karta-uslug-nr-4wmgigp-sprzedaz-lub-oddanie-w-uzytkowanie-wieczyste-nieruchomosci-komunalnych.html`.
- Legacy/archive (2012–2023, skyCMS): `https://archiwumbip.prudnik.pl/…skycms.com.pl/3230/…` and `https://bip.prudnik.pl/3230/przetargi-na-zbycie-nieruchomosci-i-lokali-2012-2022.html`.

**Housing manager:** Zarząd Budynków Komunalnych w Prudniku — `https://zbkprudnik.pl/` (ul. Kościuszki 3, tel. 77 40 66 200-202). Manages the housing stock; sale auctions themselves are published/run by the Urząd (Wydział, symbol WMGiGP), not ZBK. (ZBK site returned HTTP 520 at spike time — not needed; the Urząd BIP is authoritative.)

Contact: Urząd Miejski w Prudniku, ul. Kościuszki 3, 48-200 Prudnik.

## 3. Format + rendering
- **Board list:** server-rendered HTML (Joomla; `<meta generator>` = Joomla, template "sm32 STUDIO", server LiteSpeed). SEF URLs with numeric-prefixed slugs (`/914-ogloszenie-…`); pagination `?start=N`. No SPA, no JS gate, no auth/CAPTCHA.
- **Payload:** each announcement detail page is a thin HTML title + **born-digital PDF attachments** (ogłoszenie PDF + result PDF). Verified with `pdftotext`: clean text, Polish diacritics intact — **NO OCR needed**. Announcement PDF exposes structured fields: *Cena wywoławcza*, *Wysokość wadium*, *pow. użytkowa m²*, per-lot lokal descriptions.
- **Rendering class:** server-HTML board + **born-digital text-PDF** notices.

## 4. Volume + achieved-price stream
- **Volume:** Modest-to-good. 8 board pages; flat auctions recur every cycle (Rynek 20/8 2026; Parkowa 8/5, Rynek 9/7, Parkowa 8/5 across 2025; Klasztorna/Kochanowskiego/Chrobrego 2023). PDFs bundle multiple lots per notice (land + lokal użytkowy + several flats), so per-notice flat count is often >1. Expect several flat auctions/year, some as II przetarg (repeats when unsold).
- **Achieved-price stream: YES — strong.** The **"Informacja o wynikach przetargów ustnych nieograniczonych"** PDFs (e.g. `informacja-z-dnia-28.03.2024-r.pdf`, same asset folder, linked from the announcement) list, per lot: *Cena wywoławcza*, **Najwyższa cena osiągnięta w przetargu**, and **nabywca** (or "wynik negatywny"). Verified values: lokal użytkowy Staszica 1/1 wyw. 300.800 → osiągnięto 122.000 zł; lokal mieszkalny nr 10 → 142.000 / 138.000 zł brutto; Batorego 26 wyw. 172.800 zł. Both cena wywoławcza and hammer price are parseable from text PDFs.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** a **server-HTML BIP with born-digital text-PDF notices** — the extranet.pl/bip.net text-PDF profile; CMS-wise a **Joomla** gmina BIP. In-voivodeship BUILD peers (nysa/głubczyce/kluczbork/namysłów/olesno) confirm Opolskie seats carry real flat-auction volume; Prudnik fits.
- **Effort: MEDIUM.** Board crawl is easy (list HTML + `?start=N`, 8 pages; exclude the separate dzierżawa board). The real work is **PDF parsing**: `pdfText` each ogłoszenie PDF and split multi-lot bodies into per-lot records (address via parseAddress, pow. użytkowa, cena wywoławcza, wadium, round, przetarg date), then join the paired "Informacja o wynikach" PDF for cena osiągnięta + nabywca. Filter non-flat lots (land, lokal użytkowy) where flats are the target.
- **Blockers:** None hard. No OCR (born-digital), no auth, no rate-limit signals (LiteSpeed, sets a session cookie only). Watch-items: (1) multi-lot PDFs need robust per-lot segmentation; (2) achieved prices live in a separately-named result PDF on the same page — pair by page, not filename; (3) some 2012–2023 backfill sits on the legacy skyCMS archive host if deep history is wanted.

**VERDICT: BUILD (Medium effort)** — recurring open municipal flat auctions on a clean Joomla server-HTML board with born-digital text-PDF ogłoszenia AND a real "Informacja o wynikach" achieved-price stream; separate lease board makes sale-only crawling clean. Medium only due to multi-lot PDF parsing.
