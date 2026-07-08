# Spike — Łuków (Lubelskie · powiat łukowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (land-dominated generic city-BIP; ~0 recurring flat auctions).

## TL;DR
Gmina Miejska Łuków (Burmistrz Miasta Łuków, ul. Piłsudskiego 17, 21-400 Łuków) **does** run `pierwszy/drugi/trzeci przetarg ustny nieograniczony na sprzedaż nieruchomości`, but the stream is a **land-disposal machine** — undeveloped building plots (`nieruchomości niezabudowane`) sold under MPZP for single-family housing. Municipal **flat** auctions are essentially non-existent: exactly one lokal mieszkalny (os. Leona Klimeckiego 6/23, 48.32 m², cena wywoławcza 275 600 zł) surfaced, and it limped to a **third** auction (Feb 2024) after failing twice. The formal BIP is `umlukow.bip.lubelskie.pl` (**bip.lubelskie.pl / Wrota Lubelszczyzny** DataTables platform — a Lubelskie NO-BUILD analog); the practical notice board is the **Joomla city portal** `www.lukow.pl` (`/dla-inwestorow/nieruchomosci-na-sprzedaz`). Housing manager **ZGL** (Zakład Gospodarki Lokalowej) exists but is a **lease/najem** manager and is **in liquidation (2025)**, not a flat-seller. No per-notice results/hammer-price board. Classic Lubelskie land-heavy generic city-BIP → **NO-BUILD**.

## 1. Sells municipal property at auction?
**YES for land; effectively NO for flats.** Confirmed live notices, all `przetarg ustny nieograniczony`, seller literally "Burmistrz Miasta Łuków ul. Piłsudskiego 17, 21-400 Łuków ogłasza…":
- **LAND** — Kiernickich / Al. Lecha i Marii Kaczyńskich, ~868 m², cena wyw. 231 836 zł net, I przetarg 21.01.2025 (MNU19, single-family + services).
- **LAND** — dz. 7071/9, Al. Ryszarda Kaczorowskiego, 602 m², cena wyw. 240 800 zł net, I przetarg 06.08.2024.
- **FLAT (the only one)** — os. Leona Klimeckiego 6/23, 48.32 m², III piętro, 3 pokoje, cena wyw. 275 600 zł net, **trzeci** przetarg ustny nieograniczony 20.02.2024 (unsold at I & II).

The dedicated sales board (`nieruchomosci-na-sprzedaz`) held ~9 active listings on spike day — **100% land** (ul. Zagrodowa, Zabrowarna, Wypoczynkowa, Telimeny/Rolnicza, Południowa, Poważe, Bartnia, Siedlecka, Zakolejna/Podgórna). City property reports confirm the land skew: 2023 — ~7 500 m² sold via przetarg for 614 808 zł net; 2022 disposals 2 237 185 zł.

> Do NOT confuse with the **rural Gmina Łuków** (`uglukow.bip.lubelskie.pl`, `lukow.ug.gov.pl`) or the **Powiat Łukowski** — the Zbożowa 7A/33 and (separately) other Klimeckiego flats are **Zarząd Powiatu Łukowskiego / powiatlukowski.pl** property, out of scope. Target here is the TOWN (Burmistrz).

## 2. Where published? (hosts + boards, URLs)
**Formal BIP — `umlukow.bip.lubelskie.pl` (bip.lubelskie.pl / Wrota Lubelszczyzny):**
- Landing / recently-added: `https://umlukow.bip.lubelskie.pl/index.php?id=ostatnio_dodane`
- Wydział Gospodarki Nieruchomościami (menu node): `https://umlukow.bip.lubelskie.pl/index.php?id=183`
- Sale regulaminy (born-digital PDF): `.../upload/pliki/zarzadzenie_nr_13_2024_sprzedaz_mienia_regulamin_10102024.pdf`, `.../zarzadzenie_nr_8_2025_sprzedaz_mienia_regulamin_17062025.pdf`
- Zamówienia publiczne (DataTables table, id=82) — separate, not property.

**Practical notice board — city portal `www.lukow.pl` (Joomla):**
- Property sales: `https://www.lukow.pl/dla-inwestorow/nieruchomosci-na-sprzedaz`
- Ogłoszenia i komunikaty: `https://www.lukow.pl/start/ogloszenia-i-komunikaty`
- Aktualności (przetarg notices land here too): `https://www.lukow.pl/start/aktualnosci/…` (id-slug, e.g. `4453-mieszkanie-na-sprzedaz`, `5375-pierwszy-przetarg-ustny-nieograniczony-…`, `4936-ogloszenie-o-przetargu-02-07-2024-2`).

**Housing manager — ZGL:** `https://zgl.lukow.pl` (Joomla, `com_content`) — but scope is najem/administracja (concludes/terminates rental agreements for units designated by Burmistrz), managed 59 buildings + targowiska; **in liquidation late-2025**, replaced by a new municipal spółka. Also a legacy **Miejski Zarząd Budynków Mieszkalnych – TBS** (KRS 151922). Neither is a flat-auction seller.

Contact: WGN, ul. Piłsudskiego 17 pok. 7, tel. (25) 797 66 10, sekretariat@um.lukow.pl.

## 3. Format + rendering
- **City portal `www.lukow.pl`:** server-rendered **HTML** (Joomla `com_content`, id-slug URLs). Notices are inline HTML article text — clean, no JS gate/auth/CAPTCHA. This is the parseable layer.
- **BIP `umlukow.bip.lubelskie.pl`:** **bip.lubelskie.pl / Wrota Lubelszczyzny** family — DataTables list-ajax (JSON-backed tables) with document detail pages; attachments are `upload/pliki/*.pdf`. Regulaminy/wykazy are **born-digital text-PDF**; some administrative scans exist (one report title came through OCR-garbled), but auction notices are text.
- No SPA render.js needed; no rate-limit/auth signals observed.

## 4. Volume + achieved-price stream
- **Flat-auction volume: ~0 recurring.** One lokal mieszkalny (Klimeckiego 6/23) across the observed 2024 window, and it needed three rounds to (maybe) clear. The active board is exclusively building plots. This fails the BUILD volume bar.
- **Land volume:** modest-steady (a handful of plot auctions/year) — but land, not flats.
- **Achieved-price stream: NO usable per-flat feed.** Portal notices are pre-auction announcements (cena wywoławcza only); no dedicated `wynik przetargu / cena osiągnięta` board per notice. Hammer prices exist only as aggregate zł totals inside annual "Raport o stanie Miasta" PDFs — not a parseable results stream.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** Lubelskie **bip.lubelskie.pl / Wrota Lubelszczyzny** DataTables family (chełm pattern) for the formal BIP, or a Joomla `com_content` list scraper for `www.lukow.pl`. Two sources, land-heavy classification burden.
- **Effort:** would be **Medium** (dual source, DataTables JSON + Joomla HTML, aggressive land/tenant filtering) — but moot.
- **Blockers / why NO-BUILD:** residential disposal is essentially absent — a single flat that failed to two rounds inside a board that is otherwise 100% undeveloped building plots. No housing-manager flat-sale pipeline (ZGL is a najem manager, in liquidation). No per-notice achieved-price results board. This is the textbook Lubelskie generic city-BIP skewing to land + tenant sales with ~0 open flat auctions the heuristic flags as NO-BUILD.

**VERDICT: NO-BUILD** — Miasto Łuków auctions land, not flats; ~0 recurring open flat-sale auctions, no hammer-price stream, lease-only housing manager in liquidation, on the NO-BUILD-leaning bip.lubelskie.pl/Wrota Lubelszczyzny platform.

```json
{"city_slug":"lukow","voivodeship":"lubelskie","powiat_slug":"powiat-lukowski","status":"no-build","effort":"—","confidence":"LIVE","note":"Burmistrz sells LAND via przetarg ustny nieogr.; only 1 flat (Klimeckiego 6/23, went to 3rd round); board 100% building plots; ZGL=najem manager in liquidation 2025, no flat-sale pipeline; no per-notice results/hammer board; notices on Joomla www.lukow.pl + bip.lubelskie.pl DataTables; classic Lubelskie land-heavy NO-BUILD","host":"umlukow.bip.lubelskie.pl","cms":"bip.lubelskie.pl / Wrota Lubelszczyzny (DataTables JSON) + Joomla city portal www.lukow.pl"}
```
