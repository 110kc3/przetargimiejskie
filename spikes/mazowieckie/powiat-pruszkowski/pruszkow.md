# Spike — Pruszków (Mazowieckie · powiat pruszkowski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (High confidence).

## TL;DR

Gmina Miasto Pruszków sells municipal **flats bezprzetargowo** — exclusively to their sitting tenants under a dedicated "Karta informacyjna G-8" procedure (direct valuation + notarial deed, no open auction). The only confirmed ustny przetarg nieograniczony activity from the BIP concerns **land/building parcels** (e.g., ul. Sosnowej 13 — a non-residential property). No evidence of *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* exists in the 2021–2025 BIP archive. The city has a TBS ("TBS Zieleń Miejska sp. z o.o.") which is a rental-only social housing provider; it does not conduct flat-sale auctions. This is a tenant-sale-only city — no achieved-price stream to scrape.

---

## 1. Sells municipal property at auction?

**Przetargi ustne nieograniczone: YES for land/buildings, NO for lokale mieszkalne.**

- The BIP at `bip.um.pruszkow.pl` confirms przetargi ustne nieograniczone for parcels. The only announced property-sale przetarg found in 2024 was for a building at **ul. Sosnowej 13** — a non-residential asset. A 2025 announcement (`/artykul/727/9160/`) was temporarily unavailable but titled "Ogłoszenie o przetargu na sprzedaż nieruchomości" — no indication of "lokal mieszkalny."
- The BIP's own Karta G-8 page ("Sprzedaż lokali mieszkalnych na rzecz najemców", `/artykul/164/133/`) makes the flat-sale model explicit: flats are sold directly to tenants, **no open auction**. The procedure: tenant submits application → surveyor valuation → price agreement → notarial deed within ~3 months. No third-party bidding.
- The city council resolution **XIII/122/2011** (cited on the Karta G-8 page) governs municipal flat sales "w budynkach stanowiących własność miasta Pruszkowa" — it authorises bezprzetargowe sales to tenants as the exclusive mode.
- A 2023 search-snippet confirms property lists published for "sale via art. 453 CC" (datio in solutum / contribution) and for "gift/contribution" — again non-auction disposals.
- **No instance of ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego was found in any year 2021–2025.** LIVE-VERIFIED via direct BIP page reads and search corroboration.

**Housing manager:** There is no separate MZON/ZGM-style entity running flat auctions. Flat stock managed by **Wydział Gospodarki Komunalnej** (Urząd Miasta Pruszkowa). The city's housing company is **TBS "Zieleń Miejska" Sp. z o.o.** — a social rental TBS, not a flat-sales auctioneer.

---

## 2. Where published? (hosts + boards, URLs)

| What | URL |
|---|---|
| Main BIP (Urząd Miasta Pruszkowa) | https://bip.um.pruszkow.pl/ |
| Przetargi list (paginates 19 pages, all types) | https://bip.um.pruszkow.pl/przetargi/0/1/20 |
| Zamówienia publiczne (public procurement) | https://bip.um.pruszkow.pl/przetargi/374 |
| Ogłoszenia różne — Wydział Geodezji (property sales/lists by year) | https://bip.um.pruszkow.pl/artykuly/172/-ogloszenia-rozne |
| 2026 property announcements | https://bip.um.pruszkow.pl/artykuly/770/2026 |
| 2025 property announcements | https://bip.um.pruszkow.pl/artykuly/727/2025 |
| 2024 property announcements | https://bip.um.pruszkow.pl/artykuly/656/2024 |
| 2023 property announcements | https://bip.um.pruszkow.pl/artykuly/594/2023 |
| Karta G-8: flat sales to tenants (bezprzetargowo) | https://bip.um.pruszkow.pl/artykul/164/133/-sprzedaz-lokali-mieszkalnych-na-rzecz-najemcow |
| TBS Zieleń Miejska (rental only) | https://tbszm.pl/ |

**Result notices:** when przetarg results exist they are published as PDF attachments on the same BIP article as the announcement (confirmed: 2024 ul. Sosnowej 13 had both "Wykaz nieruchomości" PDF and "Informacja o wyniku przetargu" PDF attached to the same article).

**Physical board:** The BIP page explicitly states announcements are posted "na tablicy ogłoszeń w siedzibie Urzędu Miasta Pruszkowa przy ul. Kraszewskiego 14/16" — i.e., also on a physical notice board, not digital-only.

---

## 3. Format + rendering

- BIP platform: **Logonet Sp. z o.o. (Bydgoszcz)**, version 2.9.0. Standard Polish municipal BIP CMS — same stack seen in other Mazowieckie cities.
- Property auction pages: **server-rendered HTML** with brief text + PDF attachments. The HTML itself contains only the announcement blurb (1–2 sentences); the actual property details (address, area, price, terms) are in a **PDF attachment** ("Wykaz nieruchomości", ~100–150 kB).
- Result notices also delivered as **PDF attachments** ("Informacja o wyniku przetargu", ~100 kB).
- No SPA, no JavaScript-gated content, no login/auth wall observed. Standard HTML pages loaded cleanly via web_fetch.
- PDF format: likely text-PDF (not scanned), given the small file sizes (~100–145 kB); no OCR evidence needed.
- No dedicated JSON/API endpoint observed.
- **Bot risk:** none observed — no CAPTCHA, no rate-limiting on BIP page loads (rate limit hit was tool-side, not server-side).

---

## 4. Volume + achieved-price stream

**Volume is very low and wrong type:**
- Confirmed przetarg activity (ustny nieograniczony for properties) on BIP: approximately **1–2 property auctions per year**, all for land or building parcels, not flats.
- No flat auction results page exists (because flats are not sold by open auction).
- Achieved-price PDFs exist for the land/building auctions (e.g., "Informacja o wyniku przetargu" for ul. Sosnowej 13, published 23.08.2024, 81 downloads), but these cover land/commercial properties only.
- Flat sales to tenants: volume unknown but reported as sporadic (the Staszica 6/8/10/1F block sale in 2023–2024 was a bulk bezprzetargowe disposal to tenants). No public price record in a scrapeable stream.
- **Achieved-price stream for flats: does not exist** — prices are set by independent valuer and negotiated privately; not published.

---

## 5. Adapter effort + verdict

**Closest analog:** None of the existing adapters (Gliwice ZGM, Zabrze, Bytom, Kraków, Tarnowskie Góry) is a good match because all of those offer at least some ustny przetarg nieograniczony for lokale mieszkalne. Pruszków has **zero flat auction stream**.

**Blockers:**
1. No ustny przetarg nieograniczony for lokale mieszkalne exists — the core product requirement is unmet at source.
2. Flat sale prices are private negotiated values between gmina and tenant — no public achieved-price data.
3. The only przetarg stream (land/building) is ~1–2 items/year, in PDF, and off-scope.

**Risks if built anyway:**
- An adapter would need to scrape the "Ogłoszenia różne" tree yearly for land auction PDFs — very low ROI.
- Flat inventory exposure is zero for external buyers.

**Effort:** N/A (no buildable product).

**VERDICT: NO-BUILD** — Pruszków sells municipal flats exclusively bezprzetargowo to sitting tenants (council resolution XIII/122/2011). Zero open-auction flat stream. The BIP is technically accessible (clean HTML + text PDFs, no bot blocks), but the content does not exist. High confidence.

---

*Sources verified live 2026-06-27:*
- https://bip.um.pruszkow.pl/artykul/164/133/-sprzedaz-lokali-mieszkalnych-na-rzecz-najemcow
- https://bip.um.pruszkow.pl/artykul/656/7968/ogloszenie-o-sprzedazy-nieruchomosci
- https://bip.um.pruszkow.pl/przetargi/0/6/20
- https://tbszm.pl/oferta-lokali-tbs-zielen-miejska/
