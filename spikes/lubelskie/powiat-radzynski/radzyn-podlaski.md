# Spike — Radzyń Podlaski (Lubelskie · powiat radzyński)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miejska Radzyń Podlaski (Urząd Miasta, Burmistrz) does run open oral auctions, but **only for land (nieruchomości gruntowe), dzierżawa of market stalls, and rental of premises — NOT for lokale mieszkalne**. Four full years of the city BIP "Przetargi" board (2023-2026) contain zero flat-sale auctions. Flats/lokale komunalne are disposed of **bezprzetargowo na rzecz najemcy** — confirmed by the standing "Wniosek o wykup lokalu komunalnego przez głównego najemcę" form in the GOSPODARKA NIERUCHOMOŚCIAMI section. The BIP is on the **Wrota Lubelszczyzny** regional platform (`umradzynpodlaski.bip.lubelskie.pl`), which is technically clean (server-side DataTables with a JSON `action=list-ajax` endpoint — easily scrapeable), but there is no open flat-auction stream to scrape. NO-BUILD on scope, not on tech.

## 1. Sells municipal property at auction?
**YES for land/lease, NO for flats.** The Burmistrz issues Zarządzenia ogłaszające *przetarg ustny nieograniczony/ograniczony*, but every auction on the board is one of:
- **Sprzedaż nieruchomości gruntowych** (land, mostly niezabudowane) — e.g. Zarządzenia Nr 21/22 (2024-03-07/08), Nr 96 (2024-07-18, ograniczony); several in 2023 (Nr 11/12/13/14/18).
- **Dzierżawa** of market stalls (stoiska handlowe, ul. Sitkowskiego) — recurring every year (2023 Nr 50/117, 2024 Nr 65/124, 2025 Nr 74, 2026 Nr 60).
- **Wynajem pomieszczeń** (Pałac Potockich) — 2024 Nr 137.

**No `sprzedaż lokalu mieszkalnego` auction in any year 2023-2026.** Flats are sold **bezprzetargowo na rzecz najemcy**: the GOSPODARKA NIERUCHOMOŚCIAMI section publishes the citizen form **"Wniosek o wykup lokalu komunalnego przez głównego najemcę"** (2025-05-08) plus the bonifikata/opłata-jednorazowa form — i.e. tenant buy-out, not open auction. This is the classic small-town pattern. Housing is administered by the city's own **Wydział Zarządzania Mieniem Komunalnym** (BIP id=701) — no separate ZGM/ZBM/TBS auctioning flats.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Wrota Lubelszczyzny regional platform):** `https://umradzynpodlaski.bip.lubelskie.pl`
- Przetargi (parent, yearly subfolders): each year is its own `?id=` page —
  - 2026: `https://umradzynpodlaski.bip.lubelskie.pl/index.php?id=1914`
  - 2025: `https://umradzynpodlaski.bip.lubelskie.pl/index.php?id=1766`
  - 2024: `https://umradzynpodlaski.bip.lubelskie.pl/index.php?id=1506`
  - 2023: `https://umradzynpodlaski.bip.lubelskie.pl/index.php?id=1349`
  - older folders 2009-2022 (ids 487-1188).
- GOSPODARKA NIERUCHOMOŚCIAMI (wykazy + tenant buy-out forms): `https://umradzynpodlaski.bip.lubelskie.pl/index.php?id=1068`
- Document table AJAX/JSON endpoint (per folder): `…/index.php?id=<folder>&action=list-ajax` (server-side DataTables, returns JSON rows).

**Contact:** Urząd Miasta Radzyń Podlaski, ul. Warszawska 32, 21-300 Radzyń Podlaski, tel. 83 351-24-60.

**Do NOT confuse** with the rural **Gmina Radzyń Podlaski** (Urząd Gminy) at `https://ugradzynpodlaski.bip.lubelskie.pl` — a separate JST, out of scope — nor with **Starostwo Powiatowe** (`spradzynpodlaski.bip.lubelskie.pl`, powiat property, e.g. the Armii Krajowej building auction). Our target is the town **Gmina Miejska** (`umradzynpodlaski…`, UM = Urząd Miasta).

## 3. Format + rendering
- **CMS family: Wrota Lubelszczyzny** shared regional BIP (`*.bip.lubelskie.pl`). Page shells are server-rendered `index.php?id=N`; the document list within each folder is an **empty table in the served HTML, hydrated via a server-side DataTables AJAX call** returning JSON (`ajaxSource:"?id=N&action=list-ajax"`).
- Scraping path is clean: hit the `action=list-ajax` JSON endpoint per year folder → get id/date/title/author rows → follow document `podglad` links. Individual acts are Zarządzenia (born-digital PDF attachments; `pdfText`, OCR unlikely).
- No SPA framework, no auth, no CAPTCHA. Technically Low-effort *if* there were flats.

## 4. Volume + achieved-price stream
- **Open flat auctions/year: 0.** (2023-2026 all land/lease/rental.)
- Total board volume is thin: ~4-6 auction Zarządzenia per year, dominated by the annual market-stall dzierżawa + occasional land parcels.
- **Achieved-price (cena osiągnięta):** N/A for flats — no flat auctions, so no flat hammer-price stream. (Land/lease results, if published, are irrelevant to the target dataset.)

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (tech only):** any Wrota Lubelszczyzny `*.bip.lubelskie.pl` gmina with the `action=list-ajax` JSON document table — a JSON-API pull, cleaner than most HTML BIPs.
- **Effort:** would be **Low** technically, but **there is no in-scope stream to build against**.
- **Blocker (scope, decisive):** flats sold **bezprzetargowo na rzecz najemcy** (tenant wykup), and the open-auction board carries only land + stall lease + premises rental. Zero recurring open flat-sale auctions. Fails the BUILD test in EXPANSION.md / spikes README heuristic.

**VERDICT: NO-BUILD** — Gmina Miejska Radzyń Podlaski auctions only land, market-stall leases, and premises rentals; municipal flats go bezprzetargowo to sitting tenants (wykup lokalu komunalnego przez najemcę). No open flat-auction stream despite a clean, easily-scrapeable Wrota Lubelszczyzny JSON-backed BIP. Re-verify only if the town later starts publishing `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego`.
