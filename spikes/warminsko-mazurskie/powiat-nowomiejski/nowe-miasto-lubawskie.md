# Spike — Nowe Miasto Lubawskie (Warmińsko-Mazurskie · powiat nowomiejski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (effort —).

## TL;DR
Gmina Miejska Nowe Miasto Lubawskie (Urząd Miejski) **does** run open oral auctions — but **only for LAND** (niezabudowane działki gruntowe) plus the occasional garage/lokal użytkowy, and it **leases** commercial units by przetarg. Municipal **flats are disposed bezprzetargowo na rzecz najemców** (tenant-preferential sale) — there is a dedicated procedural category for exactly that, and **zero** `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` appears anywhere on the BIP across 2020–2026. No housing manager runs flat auctions (the gmina company is MPGK utilities; the only housing SPV is SIM KZN new-build). Published on the town BIP `bip.umnowemiasto.pl` — a modern custom server-HTML CMS (`/artykul/<slug>` + `/pliki/…` PDF), nginx/PHP, DataTables. This is the textbook NO-BUILD shape: generic small gmina-miejska BIP skewing to land + tenant flat sales, ~0 open flat auctions.

**Do NOT confuse** with the rural **Gmina Nowe Miasto Lubawskie** (`bip.gminanml.pl` / `gminanml.pl`) — a separate JST, out of scope. Our target is the town, **Gmina Miejska**.

## 1. Sells municipal property at auction?
**YES for land, NO for flats.** The Burmistrz runs `ustny przetarg` (mostly **ograniczony**, some **nieograniczony**) for sale of municipal property, but the entire auction stream is land and non-residential:
- 2026 disposal folder (14 entries) — all `sprzedaż nieruchomości gruntowej` (działki 479.14–479.17, ul. Tysiąclecia) + one `nieruchomość zabudowana garażem` (dz. nr 477, obr. 9), all as `I ustny przetarg ograniczony` with matching `Informacja o wyniku…` results.
- Main board — `sprzedaż niezabudowanej nieruchomości gruntowej` at ul. Świerkowa, ul. Kolejowa, dz. 602/10 (obr. 14), dz. 75/5; plus `oddanie w najem na okres do lat 10` of a `lokal użytkowy` at ul. 3 Maja 38.
- **Zero `lokal mieszkalny` sale auctions** in any year folder (2020–2026) or on the board.

**Flats go to sitting tenants, not to auction.** The BIP has a standing category **"Sprzedaż lokali mieszkalnych stanowiących własność gminy na rzecz ich najemców"** (procedural page + PDF + wniosek, author M. Łokietek, 2020-07-10). This is the disqualifying signal: residential disposal is `bezprzetargowo na rzecz najemcy`, a separate track from "Zbywanie nieruchomości w drodze przetargów". (The Piastowska 5/1, 56.8 m² flat auction surfaced in search belongs to the **rural** Gmina `gminanml.pl`, not the town.)

## 2. Where published? (hosts + boards, URLs)
**Primary — town BIP (Urząd Miejski):** `https://bip.umnowemiasto.pl`
- Auctions board: `https://bip.umnowemiasto.pl/artykul/ogloszenia-o-przetargach-i-rozstrzygniecia-przetargow-1` (announcements **and** `Informacja o wyniku…` results, same board)
- Property hub: `https://bip.umnowemiasto.pl/artykul/nieruchomosci` — child categories incl. `Zbywanie nieruchomości w drodze przetargów`, `Zbywanie nieruchomości w drodze bezprzetargowej`, and `Sprzedaż lokali mieszkalnych … na rzecz ich najemców`
- Tenant flat-sale (bezprzetargowo): `https://bip.umnowemiasto.pl/artykul/sprzedaz-lokali-mieszkalnych-stanowiacych-wlasnosc-gminy-na-rzecz-ich-najemcow-1`
- Yearly disposal folders under `Sprzedaż mienia komunalnego`: `…/artykul/2026-2029`, `…/2025-2027`, `…/2024-2032`, `…/2023-4`, `…/2022-1`, `…/2021-1`, `…/2020-1`
- PDF attachments served from `/pliki/umnowemiasto/pliki/…`
- Contact: Referat Gospodarki Nieruchomościami, Urząd Miejski, ul. Rynek 1. Gmina utility company: MPGK Sp. z o.o. (ul. Działyńskich 8a) — utilities, **not** a housing/flat-auction manager.

**Out of scope:** rural `bip.gminanml.pl` / `gminanml.pl` (Gmina wiejska).

## 3. Format + rendering
- **Server-rendered HTML** — confirmed via `curl` (HTTP 200, nginx + PHP `PHPSESSID`). Modern custom BIP CMS: `/artykul/<slug>` article URLs, jQuery **DataTables** listing tables, Nunito Sans, FontAwesome, `prawomiejscowe.pl` legal-acts embed, reCAPTCHA on forms only (not a content gate).
- **WebFetch was 403-blocked** (bot user-agent filter); a normal browser UA over the Polish residential IP returns full HTML. Minor scraper watch-item — set a browser UA — but content is otherwise plain, no JS-SPA, no auth.
- Notice bodies are **inline HTML**; supporting docs (wykazy, wniosek, some ogłoszenia) are **born-digital text PDFs** at `/pliki/…` (`pdfText`, no OCR expected).
- CMS family: not one of the known analogs exactly; describe as a custom/modern server-HTML BIP (`/artykul/` slug + `/pliki/` PDF), closest in shape to a clean WordPress/custom-HTML board.

## 4. Volume + achieved-price stream
- **Open FLAT auctions: 0.** None in 2020–2026. Not a threshold miss — a categorical absence; flats leave the stock via tenant sale.
- **Overall auction volume:** low. ~8 items on the live board; ~14 in the busiest year (2026), and those are land parcels (ul. Tysiąclecia dz. 479.x) + one garage, mostly `przetarg ograniczony` (restricted to adjacent owners).
- **Achieved-price stream:** exists but for the wrong asset — `Informacja o wyniku I ustnego przetargu…` notices carry hammer prices, all for **land/garage/lease**, never flats.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** clean single-board server-HTML gmina BIP — DataTables list → `/artykul/` article fetch → `/pliki/` PDF. Technically **Low** to scrape, but there is **nothing in scope to scrape** — the target asset class (open flat auctions) does not exist here.
- **Blocker (fatal to value, not tech):** residential disposal is `bezprzetargowo na rzecz najemcy`; auction pipeline is land + commercial leases; no ZGM/ZBM/MZBM/TBS flat-auction manager (MPGK = utilities; SIM KZN = new-build social housing).
- **Effort:** **—** (no build).

**VERDICT: NO-BUILD** — small gmina-miejska BIP; municipal flats sold to sitting tenants bezprzetargowo, zero open flat auctions across 2020–2026; auction stream is land + commercial leases; no housing manager. Off-thesis.

```json
{"city_slug":"nowe-miasto-lubawskie","voivodeship":"warminsko-mazurskie","powiat_slug":"powiat-nowomiejski","status":"no-build","effort":"—","confidence":"LIVE","note":"no housing manager (MPGK utilities/SIM KZN new-build); flats sold bezprzetargowo na rzecz najemcy; auction stream = land (dz. 479.x ul. Tysiaclecia, Swierkowa, Kolejowa) + garage + lokal uzytkowy najem; 0 open flat auctions 2020-2026; custom server-HTML BIP /artykul/+/pliki/ PDF; analog=clean single-board gmina BIP","host":"bip.umnowemiasto.pl","cms":"custom modern server-HTML BIP (/artykul/ slug + /pliki/ PDF, DataTables)"}
```
