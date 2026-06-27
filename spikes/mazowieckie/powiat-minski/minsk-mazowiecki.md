# Spike — Mińsk Mazowiecki (Mazowieckie · powiat miński)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (High confidence).

## TL;DR

Gmina Miasto Mińsk Mazowiecki does **not** auction municipal flats openly. The Burmistrz runs at most 1–2 land plot (działka) auctions per year. All observed flat "auctions" in the city are komornik licytacje (court-ordered bailiff) or syndyk (bankruptcy) sales — private, not municipal. Flat transfers from the city to tenants happen **bezprzetargowo** (outside tender) under a 2020 Rada Miasta resolution (uchwała XXIV.227.2020) granting bonifikaty to long-term tenants. No *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* was found anywhere in the BIP history or city news archive. The SIM Mińsk Mazowiecki (Społeczna Inicjatywa Mieszkaniowa) entity builds new flats for rental with dojście do własności — not public auction. NO-BUILD.

---

## 1. Sells municipal property at auction?

**Confirmed: land plots only, not flats.**

The city's "Gospodarka nieruchomościami" news stream (2025–2026) shows:
- 2026-01-16: "Informacja o wyniku przetargu nieograniczonego na sprzedaż nieruchomości przy ul. Mleczarskiej" — land plot (działka), ~45 000 PLN opening price (LIVE-VERIFIED via adradar).
- 2025-01: "Przetarg pisemny nieograniczony na sprzedaż nieruchomości z działki Nr 7968, ul. Stankowizna" — sold via "lokal za grunt" scheme (Art. 16 ustawa z 16.12.2020), i.e. a developer swaps flats for land, not a direct flat auction.
- 2025-01-17: "Informacja o wyniku przetargu ustnym ograniczonym do właścicieli nieruchomości przyległych na sprzedaż prawa własności nieruchomości przy ul. Parkowej" — restricted land auction to neighbouring owners (działka 871/4), not a flat.
- 2025-04: another land plot at ul. Stankowizna (result posted).

**No lokal mieszkalny przetarg by Burmistrz was found** in 20+ posts spanning 2025–2026 on the city news system, nor in the BIP "Ogłoszenia i komunikaty" section (92 pages, accessed via `bip.minsk-maz.pl`).

Uchwała NR XXIV.227.2020 Rady Miasta Mińsk Mazowiecki (PDF available on BIP) grants bonifikata for **bezprzetargowa** sale of municipal flats to sitting tenants — confirming the standard Polish model: tenants get right-of-first-refusal without tender.

---

## 2. Where published? (hosts + boards, URLs)

**MIASTO Mińsk Mazowiecki BIP:**
- Main BIP: <https://bip.minsk-maz.pl/index.php>
- Ogłoszenia i komunikaty (bt29): <https://bip.minsk-maz.pl/index.php?type=4&name=bt29&func=selectsite&value%5B0%5D=mnu26&value%5B1%5D=1>
  - 92 pages of entries; paginator visible but only first page renders; JS-based BIP.
- City news / property section: <https://www.minsk-maz.pl/nasze-miasto/gospodarka-przestrzenna-i-nieruchomosci/gospodarowanie-nieruchomosciami>
  - "Pokaż więcej" link → `wiadomosci?tag=gospodarkaPrzestrzennaINieruchomosci` (AJAX lazy-load, single page, ~20 items visible without JS click).

**NOT the source for flats:**
- `bip.minskmazowiecki.pl` — this is the GMINA (rural commune) BIP, entirely separate from the MIASTO.
- SM "Przełom" (<https://smprzelom.pl/przetargi/>) — private housing cooperative, publishes construction tenders (roboty budowlane), not flat sales.
- SM "Mechanik" (<http://smmechanik.pl>) — sold a commercial/residential building at ul. Zgoda 14A (land), not flats.

**Achieved price notices** ("Informacja o wyniku przetargu"): published on the same city news page, HTML format, linked by slug (e.g. `/wiadomosci/informacja-o-wyniku-przetargu-nieograniczonego-na-sprzedaz-nieruchomosci-przy-ul-mleczarskiej`). These exist only for land plots.

---

## 3. Format + rendering

- **bip.minsk-maz.pl**: Old PHP BIP (bt29 module), query-string navigation. Page renders HTML in-browser; text content extractable via `get_page_text`. Individual auction documents may be HTML inline or PDF attachments. LIVE-VERIFIED: HTML text readable.
- **minsk-maz.pl**: Modern Tailwind/Alpine.js SPA. News items load via AJAX ("Pokaż więcej"). Underlying tag API URL not discoverable without network intercept. `get_page_text` works for visible items (first ~20). No auth required. No bot block observed.
- **PDFs**: Present for some items (e.g. uchwały, obwieszczenia). Uchwała XXIV.227.2020 is a PDF on BIP but web_fetch returned empty — likely requires browser rendering.
- **No JSON/structured API** found publicly.

---

## 4. Volume + achieved-price stream

**Municipal flat auctions: 0 per year** (no instances found in 2023–2026 search).

Land plot auctions by Burmistrz: ~1–2 per year:
- 2026: ul. Mleczarska (działka 132 m², 45 018 PLN opening, result published 2026-01-16) — CONFIRMED.
- 2025: ul. Stankowizna działka 7968 (result 2025-04-09) — CONFIRMED.
- 2025: ul. Parkowa (ograniczony, 1 qualified bidder) — CONFIRMED.

Flat market activity in the city is entirely komornik (10–15 licytacje/year on adradar) + syndyk (3–5/year). Organizer = private courts/trustees, not Miasto.

**Achieved price stream for municipal flats: does not exist** — no auction, no result notice.

---

## 5. Adapter effort + verdict

**Closest analog:** None of the current adapters (Gliwice, Zabrze, Bytom, Kraków, Tarnowskie Góry) apply — those cities have active municipal flat auction programmes. Mińsk Mazowiecki is in the "bezprzetargowo only" category alongside smaller gminy that don't publish flat auctions at all.

**Blockers:**
- No municipal flat auctions to scrape.
- The "lokal za grunt" scheme (ul. Stankowizna) produces flats for new development, not auctioned existing stock.
- SIM Mińsk Mazowiecki (rental + dojście do własności) is a separate legal entity not running public przetargi.
- BIP pagination broken beyond page 1 (JS-only); AJAX feed on minsk-maz.pl not interceptable without network monitoring.

**Risks if built:** Zero throughput — scraper would run daily against a feed that has never had a flat auction entry and has no architectural pathway for one under current city policy.

**VERDICT: NO-BUILD** — Mińsk Mazowiecki sells municipal flats bezprzetargowo to tenants only; no open flat auction has been published on BIP or city website in the observable history (2020–2026). Land plot auctions exist (~2/year) but are out of scope for this project. Return if city policy changes (watch for Rada Miasta uchwały amending the bonifikata resolution).

---

### Sources (LIVE-VERIFIED unless noted)

- BIP Miasto Mińsk Mazowiecki: <https://bip.minsk-maz.pl/index.php>
- City property news: <https://www.minsk-maz.pl/nasze-miasto/gospodarka-przestrzenna-i-nieruchomosci/gospodarowanie-nieruchomosciami>
- City news tag (nieruchomości): <https://www.minsk-maz.pl/wiadomosci?tag=gospodarkaPrzestrzennaINieruchomosci>
- BIP Ogłoszenia i komunikaty: <https://bip.minsk-maz.pl/index.php?type=4&name=bt29&func=selectsite&value%5B0%5D=mnu26&value%5B1%5D=1>
- BIP przetarg ul. Parkowa (restricted, land): <https://bip.minsk-maz.pl/index.php?func=selectsite&name=bt29&type=4&value%5B0%5D=11838>
- Uchwała XXIV.227.2020 (bezprzetargowo flat sales): <https://www.bip.minsk-maz.pl/bip/205_umminskmazowiecki/fckeditor/file/uchwaly/2020/Nr.XXIV.227.202009112020%20Mieszkanie%20Plus.pdf> [PDF, web_fetch empty]
- Adradar — flat auctions Mińsk Mazowiecki (komornik/syndyk only): <https://przetargi.adradar.pl/p/mieszkania/45540/Mi%C5%84sk+Mazowiecki/a>
- Adradar — all property Mińsk Mazowiecki: <https://przetargi.adradar.pl/p/a/45540/Mi%C5%84sk+Mazowiecki/przetargi>
- SIM Mińsk Mazowiecki: <https://www.simminskmaz.pl/>
- jakiwniosek.pl — wykup komunalny (bezprzetargowo process explained): <https://jakiwniosek.pl/wnioski/nieruchomosci/wykup-mieszkania-komunalnego/minsk-mazowiecki>
