# Spike — Lubaczów (Podkarpackie · powiat lubaczowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miejska Lubaczów (Urząd Miejski, ul. Rynek 26) does dispose of municipal property via `ustny nieograniczony przetarg`, **but the open-auction stream is land only (działki niezabudowane)** — no recurring stream of open flat-sale auctions. The one property board on the town BIP `bip.um.lubaczow.pl` (CMS **bip.net 7.33 by extranet.pl**, clean server-rendered HTML + born-digital text-PDFs) currently carries exactly two auctions, both undeveloped land, plus a "wykaz" that just redirects to a GIS investment-map portal. Municipal housing manager **MZGKiM** exists but only administers buildings + posts maintenance tenders — it sells nothing. Historically residential disposal here is **bezprzetargowo na rzecz najemcy** (council resolutions on tenant-purchase discounts). This is the textbook generic-city-BIP-skewing-to-land + tenant-sales pattern with ~0 open flat auctions → **NO-BUILD**.

## 1. Sells municipal property at auction?
**Land: YES. Flats at open auction: effectively NO.** The Burmistrz Miasta Lubaczowa runs `I ustny nieograniczony przetarg na sprzedaż niezabudowanej nieruchomości gruntowej` — confirmed live on the property board:
- ul. Sudel — leśna niezabudowana nieruchomość gruntowa, działka 4469, 6 700 m², cena wywoławcza 30 000 zł, wadium 3 000 zł, termin przetargu **14.07.2026 godz. 9:00** (KW PR1L/00026019). Born-digital PDF `plik,3410`.
- zaplecze ul. Wyszyńskiego (GPR.VII.6840.2.3.2026) — niezabudowana nieruchomość gruntowa, with `lista osób zakwalifikowanych` + `informacja o wyniku przetargu` PDFs (`plik,3337 / 3413 / 3414`).

No `lokal mieszkalny` sale auction is present on the board, and the left-menu shows only two property nodes: *Oferty sprzedaży nieruchomości* and *Wykaz nieruchomości przeznaczonych do dzierżawy i oddania w najem* (lease/rent). Web-search hits for "Lubaczów + lokal mieszkalny + wadium" resolve to **komornik/court** licytacje (rękojmia = 1/10 wartości, e.g. Krasińskiego 14/20 — 8 690 zł) or to **Przemyśl/Powiat**, not the town gmina. Town-level residential disposal history is council-resolution discounts for sales **na rzecz najemcy** (bezprzetargowo) — the classic NO-BUILD signal.

## 2. Where published? (hosts + boards, URLs)
**Primary — town BIP (bip.net / extranet.pl):**
- Property sales board (the only one): `https://bip.um.lubaczow.pl/275,oferty-sprzedazy-nieruchomosci` — a paragraph-block (`obiekt_akapit`) page; notices are replaced in place, no rich dated archive.
- Lease/rent list: *Wykaz nieruchomości przeznaczonych do dzierżawy i oddania w najem* (left menu, dzierżawa/najem only).
- Document pattern: `https://bip.um.lubaczow.pl/plik,<ID>,<slug>-pdf.pdf` (e.g. `plik,3410,ul-sudel-pdf.pdf`).
- Public procurement (unrelated): `https://bip.um.lubaczow.pl/redir,przetargi` (zamówienia publiczne — construction/services only).

**"Aktualny wykaz nieruchomości do sprzedaży"** offloads to a GIS portal: `https://mapa.inspire-hub.pl/#/lubaczow` → tile *Oferta inwestycyjna* (investment plots / land — JS map, no auction docs).

**Housing manager:** `https://mzgkim.lubaczow.pl/` (Miejski Zakład Gospodarki Komunalnej i Mieszkaniowej) — administers buildings/flats but its *Przetargi* section (`/category/przetargi/`) is maintenance contracts (roof, pumping station) + occasional lokal-użytkowy **najem**; **no flat sales, no results board.**

**Do NOT confuse** with rural **Gmina Lubaczów** at `bip.lubaczow.com.pl` / `gminalubaczow.pl` (separate JST, building plots) or **Powiat Lubaczowski** at `bip.powiatlubaczowski.pl` — both out of scope.

Contact: Referat Gospodarki Przestrzennej i Ochrony Środowiska, UM Lubaczów, ul. Rynek 26, 37-600.

## 3. Format + rendering
- **Server-rendered HTML** board (bip.net 7.33, extranet.pl) — no JS gate, PHPSESSID cookie, standard `<h3 class="predef">` akapit blocks. Confirmed via direct curl (216 KB HTML).
- **Born-digital text-PDFs** for the actual ogłoszenia — `pdftotext` extracts clean tabular text (nr działki / powierzchnia / cena wywoławcza / wadium / postąpienie / termin). **No OCR needed.**
- No SPA / auth / CAPTCHA on the BIP. The only JS surface is the inspire-hub map portal (irrelevant — no auction docs there).

## 4. Volume + achieved-price stream
- **Volume:** Very low, and **land-only**. Board holds ~1–2 active property auctions at a time (both currently działki); the akapit page overwrites rather than archives, so there is no accumulating flat-auction history. Open **flat** auctions: ~0.
- **Achieved-price stream:** Exists for LAND (`informacja o wyniku przetargu` PDF, e.g. `plik,3414`) but there is no flat stream to feed it. No dedicated results board — results are ad-hoc PDFs dropped onto the same page.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest CMS analog:** **bip.net / extranet.pl** family (server-rendered HTML + `plik,ID,slug.pdf` born-digital PDFs) — technically a Low-effort scrape *were the content there*. But content does not meet the build bar.
- **Why NO-BUILD:** Fails the core heuristic — the only residential disposal is **bezprzetargowo na rzecz najemcy**; the only OPEN auctions are **land** (działki niezabudowane); no municipal housing *sale* pipeline (MZGKiM sells nothing); no flat-auction results board. Generic city-BIP skewing to land + tenant sales with ~0 open flat auctions.
- **Blockers:** No technical blocker (HTML + text-PDF are trivial). The blocker is **data supply**: there is no recurring open flat-auction stream to justify an adapter.

**VERDICT: NO-BUILD** — Miasto Lubaczów disposes of flats bezprzetargowo na rzecz najemcy and runs only land (działki) open auctions on a clean bip.net BIP; ~0 open flat-sale auctions, no housing-manager sale pipeline, no flat results board. Revisit only if a lokale-mieszkalne open-auction stream appears on `bip.um.lubaczow.pl/275`.
