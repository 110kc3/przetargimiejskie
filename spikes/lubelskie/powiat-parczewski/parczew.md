# Spike — Parczew (Lubelskie · powiat parczewski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (generic city-BIP, land + lease only, ~0 municipal open flat auctions).

## TL;DR
Gmina Parczew (Urząd Miejski w Parczewie, gmina miejsko-wiejska seat) runs `przetarg ustny nieograniczony`, but **only on land** — undeveloped/agricultural-building plots (działki: Jasionka, Kolejowa, Przewłoka, Królewski Dwór). Residential disposal by the gmina appears to be **land + lease (dzierżawa/użyczenie) + tenant-side**, not open flat auctions. The only "mieszkanie" auctions surfacing in Parczew are **licytacje komornicze** (bailiff/court sales — out of scope), not gmina sales. There is **no housing manager** (no ZGM/ZBM/MZBM/TBS) — property sits under the Referat Nieruchomości i Planowania Przestrzennego (NP). The BIP is `umparczew.bip.lubelskie.pl` on the **Wrota Lubelszczyzny / bip.lubelskie.pl** platform: the przetargi-nieruchomości table (id=413) is a **JS/DataTables grid that renders empty over plain HTTP** (rows load via AJAX/JSON), currently with no active property auctions. Actual notices/wykazy live partly on the Joomla city portal `parczew.com`. **No open flat-auction volume, no results/hammer-price board.** Closest analog: the family flagged NO-BUILD in the brief — bip.lubelskie.pl land/lease seats. Verdict: NO-BUILD.

## 1. Sells municipal property at auction?
**Land — YES. Municipal FLATS at open auction — NO (none found).** The Burmistrz Parczewa runs `przetarg ustny nieograniczony na sprzedaż mienia komunalnego`, but every confirmed example is a **działka**:
- ul. Kolejowa (Parczew) — przetarg na działkę (2026-04-17, 2026-01-23, 2025-11-14).
- obręb Jasionka — nieruchomość nr ewid. 920, 0,1063 ha, "pod zabudowę mieszkaniową zagrodową", cena wywoławcza 20 000 zł + 23% VAT, II przetarg 2024-12-05 (drugi przetarg ustny nieograniczony na sprzedaż mienia komunalnego) — **land, not a flat**. Recurs 2026-04-23, 2026-03-11, 2026-01-28.
- Przewłoka (2025-12-19), Królewski Dwór (2025-10-17) — land.

The aggregator (Adradar, gm. Parczew) breakdown over the last ~12 months: **~11 land/działka**, **3 "mieszkanie" — all licytacja komornicza (bailiff)**, 2 dom (bailiff), **0 gmina flat auctions, 0 lokal użytkowy sale**. The gmina's residential-adjacent activity on the city portal is **lease/loan wykazy**: "WYKAZ NIERUCHOMOŚCI GMINY PARCZEW PRZEZNACZONYCH DO DZIERŻAWY NA OKRES DO 3 LAT" (2026-06-23) and "…PRZEZNACZONYCH DO ODDANIA W UŻYCZENIE" (2026-02-17). No `sprzedaż lokalu mieszkalnego` notice found on BIP, city portal, or aggregator. Contact: Referat NP, pok. 217, tel. 83 355 12 27; Urząd Miejski, ul. Warszawska 24.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (bip.lubelskie.pl / Wrota Lubelszczyzny):** `umparczew.bip.lubelskie.pl`
- Przetargi - nieruchomości: `https://umparczew.bip.lubelskie.pl/index.php?id=413` (currently empty grid)
- Przetargi do 31.12.2021 (archive): `https://umparczew.bip.lubelskie.pl/index.php?id=81`
- Referat Nieruchomości i Planowania Przestrzennego (NP): `https://umparczew.bip.lubelskie.pl/index.php?id=225`
- Mienie: `https://umparczew.bip.lubelskie.pl/index.php?id=75`; Oferty inwestycyjne: `id=82`
- Elektroniczne zamówienia publiczne: `id=407`; do 130 000 zł: `id=408`
- Uploaded docs live under `/upload/pliki/*.pdf` (born-digital PDFs, e.g. oświadczenia majątkowe).

**City portal (Joomla) — where readable notices/wykazy actually appear:** `parczew.com`
- Ogłoszenia i komunikaty: `https://parczew.com/index.php/dla-mieszkancow/ogloszenia-i-komunikaty`
- e.g. `…/2684-ogloszenie-burmistrz-parczewa-oglasza-drugi-przetarg-ustny-nieograniczony-na-sprzedaz-mienia-komunalnego…` (Jasionka land), `…/2641-wykaz-nieruchomosci-do-sprzedarzy`.
- e-zamówienia (procurement, not property sales): `https://ezamowienia.parczew.com/`

**Do NOT confuse** with `spparczew.bip.lubelskie.pl` (Starostwo Powiatowe — county, separate JST) or `powiat.parczew.pl` (county portal). Our target is the town/gmina Urząd Miejski w Parczewie.

## 3. Format + rendering
- **BIP (umparczew.bip.lubelskie.pl):** **JS-driven DataTables grid.** Over plain HTTP the przetargi tables (id=413, id=81) return the filter UI + column headers (Lp / Symbol / Data ogłoszenia / Tytuł / Termin / Opcje) but **no rows** — content is fetched via AJAX/JSON after load. This is the classic `bip.lubelskie.pl` / Wrota Lubelszczyzny DataTables-JSON pattern flagged in the brief as often NO-BUILD. Would require driving the JSON endpoint, not simple server-HTML scraping.
- **City portal (parczew.com):** **Joomla, server-rendered HTML.** Notice bodies are inline HTML; wykazy sometimes attached as **born-digital text-PDF** (`/upload/pliki/*.pdf` on the BIP side).
- No auth/CAPTCHA seen, but the BIP grid's empty-over-HTTP behavior is the real friction.

## 4. Volume + achieved-price stream
- **Open flat-auction volume: ZERO.** No `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` located on any Parczew source. Gmina auction stream is ~a dozen **land** parcels/year (Jasionka/Kolejowa/Przewłoka/Królewski Dwór), several as II/III przetarg (repeat unsold). Residential = lease/użyczenie wykazy + bailiff licytacje (komornicze) that are not municipal disposals.
- **Achieved-price stream: NONE.** No `informacja o wyniku przetargu` / cena osiągnięta board. Notices carry only cena wywoławcza. No hammer-price feed to harvest.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** bip.lubelskie.pl / Wrota Lubelszczyzny land+lease seat — the exact family the brief marks "often NO-BUILD." No ZGM/TBS, no flat auctions, no results board — nothing to differentiate it from a generic Lubelskie gmina-BIP.
- **CMS family:** BIP = bip.lubelskie.pl (Wrota Lubelszczyzny, DataTables/JSON, JS-SPA-ish grid); notices = Joomla city portal + born-digital PDF.
- **Effort:** **— (not applicable / High if forced).** Would mean reverse-engineering the DataTables JSON endpoint for a stream that is ~100% land/lease and 0% municipal flats — negative ROI for a flat-auction dataset.
- **Blockers:** (1) No open flat auctions — fails the core BUILD heuristic. (2) No housing manager. (3) No achieved-price/results board. (4) JS-rendered empty-over-HTTP BIP grid. (5) The only flat "auctions" are bailiff licytacje, out of scope.

**VERDICT: NO-BUILD** — Gmina Parczew disposes of **land** at open auction and handles residential via **lease/wykaz/tenant** channels; there are **~0 municipal open flat auctions**, no housing manager, and no results board, on a bip.lubelskie.pl DataTables platform. Textbook Lubelskie-seat NO-BUILD.
