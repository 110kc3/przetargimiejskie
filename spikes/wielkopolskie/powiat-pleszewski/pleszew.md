# Spike — Pleszew (Wielkopolskie · powiat pleszewski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Miasto i Gmina Pleszew (Urząd Miejski, Wydział Gospodarki Nieruchomościami i Planowania Przestrzennego) sells municipal property — including **lokale mieszkalne** — via *przetarg ustny nieograniczony na sprzedaż*. Announcements and results live on the city BIP `bip.pleszew.pl` (mirror `bip2.wokiss.pl/pleszewm/`), which runs the **WOKISS** hosted CMS — the same platform already spiked BUILD for Jarocin / Kalisz / Ostrów Wlkp. Clean server-rendered HTML: one consolidated *"Ogłoszenia dot. nieruchomości"* board per year (2012→2026), entries link **born-digital text PDFs** (`zasoby/files/nieruchomosci/{YYYY}/gp-ogl-*.pdf`). Flat-auction volume is **low** and mixed with heavy land + dzierżawa/najem/użyczenie noise — the live open-flat asset is ul. Zachodnia 1 (1/2 udział lokale nr 1 & nr 2, recycled I→II przetarg 2024→2025), plus historical flats (Rynek 10, Daszyńskiego 1, Poznańska 55, Kowalewice). Achieved-price stream exists as *"informacja o wyniku przetargu"* PDFs. No dedicated housing manager (PTBS is social rental only), but the reusable WOKISS adapter makes marginal effort near-zero. Closest analog: **Jarocin** (identical CMS, same low-volume recycled-unit profile).

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats at OPEN auction.** The Burmistrz Miasta i Gminy Pleszew runs `przetarg ustny nieograniczony` for sale of municipal property. Confirmed open flat-sale auctions:
- **ul. Zachodnia 1, Pleszew** — 1/2 udział w nieruchomości lokalowej **nr 1** (parter, dwulokalowy budynek, pow. użytkowa 69,10 m² + garaż, dz. 2841/507 m²), cena wywoławcza **122 260 zł** (zw. z VAT), wadium 24 452 zł (20%); **I przetarg 31.10.2024 → II przetarg 20.01.2025**, licytacja 26.02.2025 10:00, sala 301, Rynek 1. Wynik PDF (10.12.2024).
- **ul. Zachodnia 1, Pleszew** — 1/2 udział w nieruchomości lokalowej **nr 2** (same building, twin listing, recycled I→II). Wynik PDF (10.12.2024).
- Historical flats (przetarg ustny nieograniczony): **Rynek 10** lokal nr 10; **ul. Daszyńskiego 1** lokal nr 1A; **ul. Poznańska 55** lokal nr 7; **Kowalewice, ul. Cegielniana 1** lokal nr 2 (2019 board).

Caveat: residential disposal also occurs **bezprzetargowo na rzecz najemcy** (e.g. 21.10.2025 lokal mieszkalny nr 2 Kowalewo) — those are out of scope. The board is dominated by land sales (przetarg ustny nieograniczony/ograniczony + bezprzetargowo), dzierżawa/najem, and użyczenie; genuine open flat auctions cycle in and out at ~1–2 assets/year, often the same unit as I→II→III przetarg.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (WOKISS CMS):**
- Section hub: `https://bip.pleszew.pl/pleszewm/bip/ogloszenia-20131/ogloszenia-dot.-nieruchomosci.html`
- Current year board: `https://bip.pleszew.pl/pleszewm/bip/ogloszenia-20131/ogloszenia-dot.-nieruchomosci/ogloszenia-2026.html`
- 2025 board: `.../ogloszenia,-decyzje-2025.html` · 2024: `.../ogloszenia-2024.html`
- Yearly archives 2012→2025 + `archiwum-ogloszen-dot.-nieruchomosci.html` ("Archiwum do 2011")
- Notice/result documents (born-digital PDFs): `https://bip.pleszew.pl/pleszewm/zasoby/files/nieruchomosci/{YYYY}/gp-ogl-*.pdf` (e.g. `.../2024/gp-ogl-31102024-1.pdf`)
- **Mirror host:** `https://bip2.wokiss.pl/pleszewm/...` (identical tree; also `www.wokiss.pl/pleszewm/`)
- Contact: Wydział Gospodarki Nieruchomościami i Planowania Przestrzennego, tel. 62 7428-345 / 346; Rynek 1, sala 301.

**Secondary — city news portal (WordPress):** `https://pleszew.pl/` carries the same ogłoszenia as **inline HTML** (e.g. `/ogloszenie-o-ii-przetargu-ustnym-nieograniczonym-na-sprzedaz-udzialu-w-nieruchomosci-lokalowej/`) — useful fallback for full text when the BIP entry is PDF-only.

**Do NOT confuse** with the county `bip.powiatpleszewski.pl/nieruchomosci/przetargi-i-rokowania` (Starostwo Powiatowe — Skarb Państwa/powiat property, separate JST, out of scope).

## 3. Format + rendering
- **Server-rendered HTML** — WOKISS hosted CMS. Year board = plain HTML list of dated entries; each entry links a **born-digital text PDF** (`gp-ogl-*.pdf`) — parse with `pdfText`, **no OCR** expected.
- **No SPA, no auth, no CAPTCHA, no JS gate** — confirmed live via direct fetch of the 2024/2025 boards (both returned full server HTML; unlike sibling Chodzież, no headless render needed → `needsRender: false`).
- Some notices are also mirrored as **inline HTML** on `pleszew.pl` (WordPress) — clean text fallback.
- Result notices ("informacja o wyniku przetargu") are the same-format PDFs on the same board.

## 4. Volume + achieved-price stream
- **Volume: LOW.** ~1–2 open flat assets/year, frequently the same unit recycled through I→II→III przetarg (2024–2025 live example: ul. Zachodnia 1). Historical years (e.g. 2019) carried more flats (Rynek 10, Daszyńskiego, Poznańska, Kowalewice). Board is otherwise heavily land + dzierżawa/najem/użyczenie — classification/filtering required.
- **Achieved-price stream: YES.** Dedicated *"informacja o wyniku przetargu"* PDFs published on the same yearly board (many entries marked *wynik dostępny*), including for the Zachodnia 1 flat auctions (wyniki 10.12.2024). Announcement PDF carries `cena wywoławcza`; result PDF carries hammer price / nabywca or wynik negatywny. Both parseable.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **Jarocin** (same powiat-neighbourhood, identical **WOKISS** BIP, same low-volume recycled-unit flat profile — already spiked BUILD Low). Also Kalisz / Ostrów Wielkopolski (WOKISS family). Fork the wokiss-family scraper.
- **CMS family:** WOKISS hosted BIP (server-rendered HTML year boards + born-digital PDFs; ADAPTER-GUIDE plain-HTML/text-PDF family). `host=bip.pleszew.pl`.
- **Effort: LOW.** Iterate yearly board (`ogloszenia-{YYYY}.html`) → collect entry links → fetch `gp-ogl-*.pdf` → `pdfText` regex/DOM parse (adres via parseAddress, pow. użytkowa, cena wywoławcza, wadium, data/godzina, runda I/II/III); second pass over same board for `informacja o wyniku` PDFs → cena osiągnięta / nabywca.
- **Blockers:** None technical. Only watch-items: (1) **single consolidated board** mixes sprzedaż lokali + land + dzierżawa/najem/użyczenie + wyniki — adapter MUST classify entry type and drop non-flat / bezprzetargowo-na-najemcy noise; (2) many flat sales are **udział (fractional share)** listings — handle 1/2-share pricing; (3) low absolute flat volume — thin but real recurring stream.

**VERDICT: BUILD (Low effort)** — recurring (if thin) open municipal flat auctions with a live achieved-price stream on a clean server-HTML WOKISS BIP, near-zero marginal cost via the existing Jarocin/Kalisz/Ostrów wokiss-family adapter; no housing manager but no technical blockers.
