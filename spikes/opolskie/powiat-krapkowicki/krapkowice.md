# Spike — Krapkowice (Opolskie · powiat krapkowicki)
> **Status:** spike DESK — 2026-06-30. VERDICT: NEEDS-LIVE-VERIFY (Medium effort).

## TL;DR
Gmina Krapkowice does sell municipal flats at ustny przetarg nieograniczony — confirmed by BIP auction announcements and a dedicated results board. Volume is low (a handful of units per year), with some flats going bezprzetargowo to sitting tenants and others going to open auction. The BIP is a standard self-hosted Polish municipal BIP (HTML index pages + individual announcement sub-pages, some with attached PDFs). Achieved-price data has its own board. Live verification needed to confirm current 2025–2026 cadence and exact HTML structure of results entries before committing to an adapter.

## 1. Sells municipal property at auction?
YES — both modes co-exist:
- **Bezprzetargowo** to sitting tenants: e.g. Rybacka 17/2 (lokal mieszkalny listed in wykaz nieruchomości for sale to najemca). Standard Art. 34 UGN priority purchase.
- **Ustny przetarg nieograniczony**: confirmed for residential units — e.g. lokal nr 1 at Pietna, ul. Łąkowa 1 (132.28 m², ground floor of residential-commercial building). Also historic examples at ul. Szkolna 7 nr 2.
- Gmina also sells działki (building plots) and commercial/service land at auction, but residential flat auctions are confirmed present.

## 2. Where published? (hosts + boards, URLs)
| Board | URL |
|---|---|
| Announcements (current + archive index) | https://bip.krapkowice.pl/2571/ogloszenia-o-przetargach-i-wykazach-nieruchomosci.html |
| Announcements (short alias) | https://bip.krapkowice.pl/2571/ogloszenia-o-przetargach.html |
| Year sub-pages (e.g. 2023) | https://bip.krapkowice.pl/12980/ogloszenie-o-przetargach-i-wykazach-nieruchomosci-przeznaczonych-do-dzierzawy-sprzedazy-uzyczenia-2023-rok.html |
| Results 2025 | https://bip.krapkowice.pl/16579/wyniki-przetargow-na-zbycie-nieruchomosci-2025.html |
| Results archive | https://bip.krapkowice.pl/2513/wyniki-przetargow-na-zbycie-nieruchomosci.html |
| Wykazy nieruchomości do sprzedaży (main site) | https://krapkowice.pl/7445/wykazy-nieruchomosci-przeznaczonych-do-sprzedazy.html |
| News-style auction notices (krapkowice.pl) | https://krapkowice.pl/1047/informacja-o-przetargach-na-sprzedaz-nieruchomosci-w-gminie-krapkowice.html |

Primary scrape target: `bip.krapkowice.pl` — the BIP is the authoritative source for both announcements and results.

## 3. Format + rendering
- **HTML index pages** listing links to individual announcement sub-pages — standard Polish municipal BIP pattern.
- Individual auction announcements appear as HTML sub-pages (some with PDF attachments for the formal notice).
- Results board (`wyniki-przetargow`) is also HTML, likely a list of result entries or attached PDF protocols.
- No SPA, no auth/bot block detected. Static BIP CMS (likely eBIP or similar).
- PDFs where present appear to be text-PDFs (generated from Word/LibreOffice), not scanned — OCR not expected to be needed.
- No JSON API detected.

## 4. Volume + achieved-price stream
- **Announcement volume**: Low — estimated 2–6 flat auction announcements per year based on search evidence (individual named properties found across 2019–2024 spanning multiple streets). Gmina stock: ~325 lokale mieszkalne administered by ZGKiM; sale volume is small fraction.
- **Mix**: Some units go bezprzetargowo (to tenants); others go to open auction. Both paths are published in wykaz / BIP.
- **Achieved-price stream**: CONFIRMED — dedicated `wyniki przetargow` board exists for 2025 (and archive). Entries likely include achieved price, but format of results entries (HTML text vs. attached PDF protocol) needs live verification.
- **Cadence**: No evidence of batch auction events; individual properties are auctioned as they become available.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog**: Any small Opolskie gmina BIP with annual auction + results sub-pages (standard pattern).

**Effort breakdown**:
- BIP scraper: list page → sub-page per announcement — Low effort (standard pattern).
- Results scraper: `wyniki-przetargow` board — Low-to-Medium; need to confirm if achieved price is inline HTML or in a linked PDF protocol.
- Flat-vs-land filter: need keyword filter (`lokal mieszkalny` / `lokal użytkowy`) since mixed content (flats + plots + commercial) on same board.
- Bezprzetargowe wykazy: separate board (`wykazy-nieruchomosci`) — these are not auction results but could be tracked as "offered to tenant" pre-auction signals if desired; out of scope for MVP.

**Blockers requiring live verification**:
1. Confirm current 2025–2026 announcement cadence (is the board actively updated or dormant?).
2. Confirm results board format — inline HTML price vs. PDF protocol attachment.
3. Check whether year-based sub-pages require navigating an index or if the main `/2571/` board aggregates all years.

**Verdict**: NEEDS-LIVE-VERIFY (Medium effort). The gmina clearly runs flat auctions and publishes results on BIP, but annual volume is low and the exact results format is unconfirmed from DESK research alone. Worth building if aggregating Opolskie broadly; low standalone ROI.
