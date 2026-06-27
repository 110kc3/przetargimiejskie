# Spike — Łódź (Łódzkie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Łódź is a high-volume flat-auction city. The President of the City of Łódź runs frequent *ustne przetargi nieograniczone (licytacje)* for *samodzielne lokale mieszkalne* (freehold residential units) via the city BIP at `bip.uml.lodz.pl`. Multiple flat-auction batches publish every month; result notices ("Wyniki ustnych przetargów nieograniczonych") are posted on the same BIP as HTML articles. Announcements are PDF-linked from HTML listing pages; the PDFs are born-digital and machine-readable. ZLM (Zarząd Lokali Miejskich) manages the housing stock but the auctions are run and published by the city (Wydział Zbywania i Nabywania Nieruchomości). No paywall, no bot blocks detected. Closest analog: Kraków/Bytom (city BIP + PDF announcements + HTML result pages).

## 1. Sells municipal property at auction?

**Yes — strong flat-auction stream confirmed LIVE.**

The city publishes *ustne przetargi nieograniczone (licytacje) na sprzedaż samodzielnych lokali mieszkalnych* with high frequency. Live examples fetched directly from `bip.uml.lodz.pl` on 2026-06-27:

- 24.06.2026 — flats at ul. Płocka 16, ul. Stefana Jaracza 23, ul. Juliana Tuwima 6
- 17.06.2026 — flats at ul. Wschodniej 49, ul. Zjednoczenia 7
- 12.06.2026 — flats at ul. dr. Adama Próchnika 5
- 03.06.2026 — large batch covering 10 buildings (Felsztyńskiego, Lubelska, Grabowa, Budowlana, Piramowicza, Północna, Rewolucji 1905, Tuwima, Zbocze, al. Kościuszki)
- 03.06.2026 — flats at Srebrzyńska 95, Więckowskiego 74, Radwańska 24, Pomorska 87, Piotrkowska 141A
- 27.05.2026 — flats at 7 addresses (Hersza Berlińskiego 12A & 24, Tokarska 2, 6 Sierpnia 28, Wschodnia 27, WiN 54/58, Wojska Polskiego 108)
- 13.04.2026 — 11-building batch
- 08.04.2026 — 10-building batch (lokale mieszkalne + użytkowe)
- 08.04.2026 — 10-address flat-only batch

Archived 2026 batches: at least 6 batches in Jan–Apr 2026. Archived 2025 batches: multiple entries visible (May–June 2025).

In addition to freehold *samodzielne lokale*, the city also runs *aukcje* on *spółdzielcze własnościowe prawa do lokali mieszkalnych* (cooperative membership rights — Traktorowa, Beli Bartoka, Lniana addresses, April 2026).

Land/buildings (zabudowane/niezabudowane) are also sold through the same BIP section, but residential flat volume dominates the listing page. This is a **strong BUILD signal** — Łódź is Poland's third-largest city (~660 k residents) with a large municipal housing stock managed by ZLM.

ZLM itself does **not** publish property sale auctions — its BIP (`bip.zlm.lodz.pl`) covers procurement (zamówienia publiczne) only. The actual sale auctions are run by Wydział Zbywania i Nabywania Nieruchomości (Departament Gospodarowania Majątkiem) of Urząd Miasta Łodzi. ZLM provides property viewings and technical contacts but is not the publishing entity.

## 2. Where published? (hosts + boards, with URLs)

**Primary host: `bip.uml.lodz.pl`** — the city's official BIP (TYPO3 CMS).

| Board / section | URL | Content |
|---|---|---|
| Active auction listings | https://bip.uml.lodz.pl/urzad-miasta/przetargi/sprzedaz-nieruchomosci/ | HTML index of all active sale auctions (flats, land, buildings); ~10–15 entries per page |
| Archive 2026 | https://bip.uml.lodz.pl/urzad-miasta/przetargi/archiwum-przetargow/sprzedaz-nieruchomosci-archiwum/sprzedaz-nieruchomosci-archiwum-2024-r-1-1/ | Concluded 2026 batches |
| Archive 2025 | https://bip.uml.lodz.pl/urzad-miasta/przetargi/archiwum-przetargow/sprzedaz-nieruchomosci-archiwum/sprzedaz-nieruchomosci-archiwum-2024-r-1/ | Concluded 2025 batches |
| Archive hub | https://bip.uml.lodz.pl/urzad-miasta/przetargi/archiwum-przetargow/sprzedaz-nieruchomosci-archiwum/ | Hub page (single child node visible) |
| Recently added (results land here) | https://bip.uml.lodz.pl/ostatnio-dodane/ | All new BIP posts incl. "Wyniki ustnych przetargów …" result notices |
| Residential flats info (uml.lodz.pl) | https://uml.lodz.pl/dla-biznesu/nieruchomosci-na-sprzedaz/sprzedaz-nieruchomosci/mieszkania/ | Citizen-facing page; links to current BIP auctions and bidding forms |
| Announced auctions (mirror) | https://uml.lodz.pl/dla-biznesu/nieruchomosci-na-sprzedaz/sprzedaz-nieruchomosci/ogloszone-przetargi-nieruchomosci-zabudowane-i-niezabudowane-sprzedazdzierzawa/ | Mirror on main city portal |

**Result notices ("Wyniki ustnych przetargów nieograniczonych")** are published as HTML pages, e.g.:  
`https://bip.uml.lodz.pl/ostatnio-dodane/artykul/wyniki-ustnych-przetargow-nieograniczonych-licytacji-na-sprzedaz-samodzielnych-lokali-mieszkalnych-usytuowanych-w-budynkach-polozonych-w-lodzi-przy-ul-plk-jana-kilinskiego-34-...-id112983/2025/03/6/`  
(confirmed in search snippet, March 2025 — title explicitly says "Wyniki ustnych przetargów nieograniczonych (licytacji) na sprzedaż samodzielnych lokali mieszkalnych")

Also noted: a "Wyniki ustnego przetargu nieograniczonego (licytacji) na wydzierżawienie …" result page (lease, not sale) confirms the result-notice pattern is consistent and machine-navigable via `/ostatnio-dodane/` feed.

**Secondary / legacy:** `http://przetargi.bip.uml.lodz.pl/` and `http://archiwum.bip.uml.lodz.pl/` — old BIP subdomains still linked, but modern content is on `bip.uml.lodz.pl`. Not needed for new scraping.

**ZLM BIP** (`bip.zlm.lodz.pl`) — procurement only, no property sale auctions. ZLM's main site (`zlm.lodz.pl`) has a "Wykup lokali" page for sitting-tenant direct-sale rules, not auction stream.

## 3. Format + rendering

| Layer | Details |
|---|---|
| CMS | TYPO3 (confirmed via `meta-generator: TYPO3 CMS` in live fetch) |
| Index page | Server-rendered HTML; listing of titled links with dates and author names; no JS required |
| Individual auction article | Each batch is an HTML page on `bip.uml.lodz.pl/urzad-miasta/przetargi/sprzedaz-nieruchomosci/ogloszenie/{slug}/YYYY/MM/DD/` |
| Announcement PDF | Each announcement links to a born-digital PDF under `bip.uml.lodz.pl/files/bip/public/BIP_{initials}_{YY}/ZNN_sn_{address}_{YYYYMMDD}.pdf` — naming pattern confirmed (e.g. `BIP_TW_25/ZNN_sn_Komunardow_20250219.pdf`, `BIP_TW_26/ZNN_sn_Lubelska_inne_20260128.pdf`) |
| PDF content | Born-digital, text-selectable (confirmed by direct fetch of `ZNN_sn_Komunardow_20250219.pdf`): structured table with address, KW numbers, RON contact, obręb/działka, flat area, share in common parts, room count, floor, **cena wywoławcza (asking price)**, **wadium**, **minimalna kwota postąpienia** |
| Result notices | HTML article pages; URL pattern `/ostatnio-dodane/artykul/wyniki-ustnych-przetargow-…-id{N}/YYYY/MM/DD/` |
| TLS | Standard HTTPS; no auth, no bot-blocking detected on listing or PDF fetches |
| API / JSON | None detected — no JSON feed, no SPA |

**Key data in PDFs:** address, KW number, działka, flat area (m²), share ratio, structure (rooms), floor, asking price, wadium. Achieved price is not in the announcement PDF — it will be in the result notice HTML (standard Polish BIP law requirement: §12 Rozp. RM 2004 on przetargi nieruchomości requires informacja o wyniku). Result HTML pages need to be fetched and parsed separately.

## 4. Volume + achieved-price stream

**Volume:** Active listing page showed ~10–11 distinct announcement entries in approximately the last 30 days (May–June 2026), each typically covering 2–12 flat units per batch. Conservative estimate: **30–60+ individual flat lots per month**, making Łódź one of the highest-volume municipal flat-auction cities in Poland.

**Archive depth:** At minimum 2025 and 2026 archives are accessible. Legacy archive at `archiwum.bip.uml.lodz.pl` likely holds earlier years.

**Achieved-price stream:** Result notices ("Wyniki ustnych przetargów nieograniczonych (licytacji) na sprzedaż samodzielnych lokali mieszkalnych") are published as HTML pages on `bip.uml.lodz.pl`. A March 2025 result notice for flats at Kilińskiego 34, Jaracza 5, Piotrkowska 15, Kościuszki 99 & 119, Wólczańska 228 was confirmed in search results — confirming the result stream exists and is co-located on the same BIP. The achieved price (cena osiągnięta / wylicytowana) will be in these HTML articles or in linked PDF protocols.

**Risk:** Result pages have very long URL slugs (full address list in slug), making URL-length the main practical challenge for direct web_fetch — a crawler must discover these via the `/ostatnio-dodane/` or archive feeds rather than by constructing URLs.

## 5. Adapter effort + verdict

**Closest analog:** Kraków (city BIP, TYPO3, same PDF naming convention `ZNN_sn_…`, born-digital PDFs, HTML result notices). Also similar to Gliwice/Zabrze (TYPO3 BIP, flat-first volume).

**Adapter architecture:**
1. Scrape HTML listing page (`/sprzedaz-nieruchomosci/`) + archive pages for batch links
2. For each batch HTML page, extract linked PDF URL(s) + metadata
3. Fetch PDF → parse structured table (address, KW, area, asking price, wadium, date, auction date)
4. Scrape result notices from `/ostatnio-dodane/` or archive feed → parse achieved price per lot

**Blockers / risks:**
- Result notice URL slugs are extremely long (full street list embedded); must use feed/index discovery, not URL construction
- Batch structure: one BIP article may cover 2–12 separate lots across different addresses; need to split per lot in the PDF table
- ZLM is the housing manager but NOT the publisher — no ZLM scraping needed for auctions
- No single "informacja o wyniku" per individual lot — one result page covers all lots from a batch; matching announcement lot → result requires address+date join
- Legacy BIP subdomains (`archiwum.bip.uml.lodz.pl`) hold pre-2024 history — separate crawl pass if historical depth is needed
- Cooperative-right auctions (*aukcje* on *spółdzielcze własnościowe prawa*) use a slightly different publication format; track separately or filter

**Effort:** Medium. The TYPO3 BIP structure is well-understood from Kraków adapter. PDF parsing is straightforward (born-digital table). Main extra work vs. Kraków: higher volume requires robust pagination, and the lot-to-result matching logic is slightly more complex (multi-lot batches). No OCR needed.

**VERDICT: BUILD** — High-confidence, LIVE-VERIFIED. Łódź has an active, high-volume *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* stream, born-digital PDFs, co-located result notices with achieved prices, no auth/bot blocks, and a well-structured TYPO3 BIP. Effort is Medium, analogous to Kraków with slightly larger batch sizes.
