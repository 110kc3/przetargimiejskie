# Spike — Zamość (Lubelskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort to verify, but no flat-sale auction stream exists).

## TL;DR

Zamość does NOT run open competitive auctions (przetarg ustny nieograniczony) for the **sale** of municipal residential flats. The city BIP publishes land/industrial-plot sales only. ZGL Zamość (the dedicated housing manager, Zakład Gospodarki Lokalowej w Zamościu Sp. z o.o.) runs oral auctions exclusively for **rental** (najem) of oversized flats (>80 m²) at free-market rent. No achieved-sale-price data stream exists. The only flat-sale oral auction found for Zamość (2018) was by the Military Property Agency (AMW), not the city. NO-BUILD.

## 1. Sells municipal property at auction?

**Land / commercial / industrial: YES.**
The President of Zamość publishes `I ustny przetarg nieograniczony na sprzedaż nieruchomości gruntowych` on the city BIP. Example confirmed live: two large plots on ul. Szczebrzenska (3.5 ha + 5.9 ha, part of EURO-PARK Mielec SEZ), starting prices PLN 4.87 M and PLN 8.215 M, auction 24 June 2025. These are land only — no residential flats.

**Residential flats (lokale mieszkalne): NO sales auctions found.**
ZGL Zamość has a dedicated page titled "Ogłoszenia o przetargach na lokale mieszkalne" — but every listing on that page is a **rental** (najem) oral auction, not a sale. Confirmed entries:
- ul. Staszica 31/1 (106.96 m²) — rental auction, 11 Feb 2025; opening rent 7.60 zł/m²
- ul. Rynek Wielki 7/2 (105.86 m²) + ul. Staszica 31/1 — rental auction, 6 Feb 2024; opening rent 7.50 zł/m²
- ul. Staszica 33/1A (86.24 m²) — rental auction, 12 May 2023; opening rent 7.30 zł/m²
- ul. Staszica 15/2 (125.65 m²) — rental auction, 28 Feb 2018

The pattern is consistent: Zamość auctions **access to (renting) large municipal flats** at free-market rent, not ownership. Tenants who meet income and residency criteria bid on rent-per-m². This is a rental-allocation mechanism, not a property-sale mechanism.

No `przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych` by the city or ZGL found in any search (BIP, listaprzetargow.pl, adradar, general web). The sole flat-sale oral auction traceable to Zamość (2018, ul. Koszary 59, lokal nr 11, cena wywoławcza 93 000 zł) was run by Agencja Mienia Wojskowego (Military Property Agency), not the municipality.

**Conclusion: Zamość falls firmly in the "bezprzetargowo / rental-only" category for residential flats. No flat-sale auction stream.**

## 2. Where published? (hosts + boards, with URLs)

| Board | URL | Content |
|-------|-----|---------|
| City BIP — Przetargi | https://umzamosc.bip.lubelskie.pl/index.php?id=91 | Land/commercial/industrial oral auctions by President of Zamość. Server-rendered HTML via lubelskie.pl BIP platform. Documents also posted as PDF attachments. |
| ZGL Zamość — Ogłoszenia o przetargach na lokale mieszkalne | https://zgl-zamosc.pl/ogloszenia/ogloszenia-o-przetargach-na-lokale-mieszkalne | RENTAL oral auctions for large municipal flats (>80 m²). WordPress-based site (Elementor 3.15.1). |
| ZGL Zamość — BIP (gov.pl) | https://zglzamosc.bip.gov.pl/ | Public procurement notices for ZGL's own service contracts (not flat auctions). |
| ZGL Zamość — Ogłoszenia bieżące | https://zgl-zamosc.pl/ogloszenia/ogloszenia-biezace | Commercial unit rental tenders (lokale użytkowe). |

The city BIP `Przetargi` listing table was **empty** on direct fetch (2026-06-27) — the list renders via a JS/PHP filter with no current entries visible. Individual auction documents are discoverable via direct document IDs (e.g. `?id=91&action=details&document_id=2154339`).

**No result-notice ("informacja o wyniku przetargu") board found** for flat sales, because no flat sales occur. ZGL does post brief "przetarg rozstrzygnięty" notices on the residential-rental page (e.g. "przetarg na lokal przy ul. Staszica 31/1 został rozstrzygnięty" — Feb 2025), but these record a rental outcome (czynsz/m²), not a purchase price.

## 3. Format + rendering

**City BIP (umzamosc.bip.lubelskie.pl):**
- Platform: lubelskie.pl regional BIP CMS (shared with other Lubelskie municipalities)
- Rendering: server-rendered HTML; table of documents is populated by PHP/server-side query
- Document content: embedded HTML text in the BIP page + PDF attachments (e.g. `strefa.pdf`, 0.59 MB) for full auction terms
- TLS: yes (HTTPS). No auth, no bot block observed. Fetch succeeded cleanly.
- The przetargi index (`id=91`) shows an empty table on direct fetch — the filter may require POST parameters or JS interaction to populate the list. Individual documents are accessible by direct `document_id` URL parameter.

**ZGL Zamość (zgl-zamosc.pl):**
- Platform: WordPress + Elementor 3.15.1
- Rendering: server-rendered HTML (page fully rendered without JS — content visible in fetch)
- Auction notices are static WordPress page content (not a dynamic listing), updated manually; attachments are PDFs hosted on the same domain
- TLS: yes. No auth or bot block. Page fetched successfully (55 KB).
- Last modified: 2025-02-14 (meta `article:modified_time`)

**PDF attachments:** born-digital (not scanned); text-selectable. Used for full auction terms, but core data (address, area, opening rent, date) is in the HTML body.

## 4. Volume + achieved-price stream

**Volume:** extremely low for any scraping purpose.
- Flat rental auctions: ~1–2 per year (one large flat at a time, specifically flats >80 m² at "czynsz wolny")
- Land/commercial sales: ~occasional (1–3 per year based on BIP snippets); large-value industrial plots, not residential

**Achieved-price stream:** DOES NOT EXIST for flat sales. For flat rentals, ZGL posts a one-line "przetarg rozstrzygnięty" notice with no achieved rent figure disclosed publicly. The city BIP land-sale documents state "cena nieruchomości zostanie ustalona w wyniku przetargu" but no structured result board was found.

There is no machine-readable stream, no JSON API, and no structured result archive.

## 5. Adapter effort + verdict

**Closest analog among known adapters:** None of the reference cities (Gliwice/ZGM, Zabrze, Bytom, Kraków, Tarnowskie Góry) apply — all those cities run flat-sale auctions. Zamość's rental-auction model is structurally different.

**Blockers:**
1. No flat-sale auction data exists — there is nothing to scrape for the project's core use-case (aggregating achieved prices for municipal flat sales).
2. The ZGL residential page covers rental, not ownership transfer — outside project scope.
3. City BIP covers only land/industrial plots at multi-million PLN price points — a different market segment.
4. BIP przetargi list renders empty on direct fetch; individual documents are only discoverable via ID.

**Risks if reconsidered:** If the project scope were expanded to rental auctions, the ZGL page is scrapable (WordPress, server-rendered HTML, ~1-2 events/year), but volume is negligible and the "achieved price" is a rent-per-m², not a sale price.

**Verdict: NO-BUILD.** Zamość does not run open flat-sale auctions. The housing manager (ZGL) runs only rental oral auctions for large-format flats (~1–2/year). The city BIP runs land/industrial-plot sales only. There is no flat-sale achieved-price data stream to aggregate. Effort to build an adapter would be wasted — zero signal for the project's core use-case.

---

**Sources verified live 2026-06-27:**
- https://umzamosc.bip.lubelskie.pl/index.php?id=91 (city BIP przetargi index)
- https://umzamosc.bip.lubelskie.pl/index.php?action=details&document_id=2154339&id=91 (land auction notice, Apr 2025)
- https://zgl-zamosc.pl/ogloszenia/ogloszenia-o-przetargach-na-lokale-mieszkalne (ZGL rental auctions, last updated Feb 2025)
- https://zgl-zamosc.pl/ (ZGL homepage)
- https://zglzamosc.bip.gov.pl/ (ZGL BIP)
- https://listaprzetargow.pl/oferty/864 (aggregator: only AMW flat-sale from 2018)
- https://przetargi.adradar.pl/przetargi/all/17376/Zamo%C5%9B%C4%87/all (adradar: komornicze only, no city flat sales)
