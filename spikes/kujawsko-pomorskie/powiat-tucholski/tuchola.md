# Spike — Tuchola (Kujawsko-Pomorskie · powiat tucholski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (land-only; no flat-auction stream).

## TL;DR
Gmina Tuchola (miejsko-wiejska; Urząd Miejski w Tucholi, Referat Gospodarki Nieruchomościami) does sell municipal property at **ustny przetarg nieograniczony**, but the entire stream is **building plots** (działki budowlane pod zabudowę mieszkaniową jednorodzinną / usługową) — not flats. The gmina's own *Program gospodarowania mieszkaniowym zasobem* confirms flat disposal is essentially nil: ~1 lokal mieszkalny sold per reporting period, done **bezprzetargowo na rzecz najemcy**, and the single flat put to open auction ended **unsold**. There is **no dedicated municipal housing manager** (no ZGM/TBS spółka; Przedsiębiorstwo Komunalne "PK Tuchola" handles water/utilities, not flat sales). BIP `bip.tuchola.pl` is a clean server-rendered comma-path CMS (`m,ID,slug.html` boards + `e,pobierz,get.html?id=` PDF downloads), so the source is scrapeable — but there is no flat volume and no flat achieved-price stream to justify an adapter. Closest analog would be any small land-only comma-path BIP; verdict is NO-BUILD, not a build target.

## 1. Sells municipal property at auction?
**YES for LAND — but effectively NO for flats (out of scope).**
- The Burmistrz Tucholi runs `ustny przetarg nieograniczony` for property sale; the standing "GMINA SPRZEDAJE" board is **100% building plots** on the day of this spike: ul. Żonkilowa (183–246k, 28.05.2026), Nad Bladówkiem / Bladowo dz. 351 (222k, 28.05.2026), ul. Jana III Sobieskiego / abp. Świnki (155–158k, 26.05.2026), ul. Strzeleckiej dz. 2776 (90k, 17.03.2026), ul. Wincentego Witosa dz. 3915 (241k brutto, mieszkaniowo-usługowa), plus pending Sokolnicza / Pokoju Toruńskiego / Strzelecka 2777. All quote "przeznaczonej pod zabudowę mieszkaniową jednorodzinną" = **grunt, not lokal**.
- **Flats:** the gmina *Program gospodarowania mieszkaniowym zasobem gminy* (V.E) states that in the reporting period Gmina Tuchola sold **1 lokal mieszkalny**, and a flat designated for auction **did not sell** (przetargi zakończone bez rozstrzygnięcia). Municipal flat disposal here is the classic **bezprzetargowo na rzecz najemcy** (sitting-tenant preferential sale), not open oral auction. No recurring open flat-auction category exists.
- Targeted searches for `przetarg ustny na sprzedaż lokalu mieszkalnego` on `bip.tuchola.pl` return nothing from Tuchola (only other cities' notices). Heuristic (README §"Heuristic"): generic city-BIP property section skewing to land + tenant sales → NO-BUILD.

## 2. Where published? (hosts + boards, URLs)
**Primary — gmina BIP (comma-path server-HTML CMS):**
- NIERUCHOMOŚCI board (przetargi + wykazy): `https://bip.tuchola.pl/m,726,nieruchomosci.html` (sortable list variant `https://bip.tuchola.pl/o,726,nieruchomosci.html?sort=13_`)
- Zadania / housing section: `https://bip.tuchola.pl/m,265,zadania.html`
- Program gospodarowania mieszkaniowym zasobem gminy (PDF, evidences flat-disposal policy): `https://bip.tuchola.pl/e,pobierz,get.html?id=35266&file=V.E.Program+gospodarowania+mieszkaniowym+zasobem+gminy.pdf`
- Document/attachment download pattern: `e,pobierz,get.html?id=NNNN&file=...` ; menu/board pattern: `m,ID,slug.html` / `o,ID,slug.html`.

**City portal (human-facing mirror of sale notices):**
- GMINA SPRZEDAJE: `https://www.tuchola.pl/strona/382-gmina-sprzedaje` (points back to `www.bip.tuchola.pl/NIERUCHOMOŚCI/`)
- "Przetargi" tab: `https://www.tuchola.pl/strona/biznes/276-przetargi` → redirects to procurement platform `https://platformazakupowa.pl/tuchola` (public-procurement / zamówienia, NOT property sales).

**Not the source:** `pk.tuchola.pl/przetargi` (Przedsiębiorstwo Komunalne — utilities/tenders); powiat BIP `bippowiat.tuchola.pl` / `bip.powiat.tuchola.pl` (county land, separate JST, out of scope).

Contact: Urząd Miejski w Tucholi, Referat Gospodarki Nieruchomościami, plac Zamkowy 1, pok. 204, tel. 52 564 25 30.

## 3. Format + rendering
- **Server-rendered HTML** comma-path BIP CMS (extranet.pl / eBIP "e,pobierz,get" family — WordPress/custom-HTML tier per ADAPTER-GUIDE §3). Boards are dated HTML lists; full notices attach **born-digital PDFs** via `e,pobierz,get.html?id=` (handle with `pdfText`).
- No SPA/auth/CAPTCHA gate on the BIP. (WebFetch summarizer returned a thin shell on the `m,726`/`o,726` list pages, but the pages are indexed and reachable — a real crawler with a browser UA would get the list HTML; not a blocker, just noted.)
- Procurement lives off-site on `platformazakupowa.pl` — irrelevant to property scope.

## 4. Volume + achieved-price stream
- **Flat volume:** ~0 open flat auctions/yr. Gmina program: 1 flat sold/period, bezprzetargowo to tenant; 1 flat auctioned → unsold. No recurring lokal-mieszkalny auction cadence.
- **Land volume:** modest (~5–8 działki auctions live at spike time) — building plots only.
- **Achieved-price stream:** the NIERUCHOMOŚCI board carries `cena wywoławcza` on announcements and would carry `informacja o wyniku przetargu` for land, but there is **no flat achieved-price stream** (flats don't reach open auction). Nothing in-scope to accumulate.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** a small land-only comma-path BIP — same `m,ID,slug.html` board + `e,pobierz,get.html?id=` PDF shape as other kujawsko-pomorskie eBIP gminas; technically a Low-effort HTML+pdfText clone.
- **CMS family:** comma-path server-rendered BIP (extranet.pl / eBIP; ADAPTER-GUIDE §3 WordPress/custom-HTML tier). No technical blockers — auth-free server HTML with born-digital PDF attachments.
- **Effort:** **—** (not applicable; nothing to build for flats).
- **Blockers / why NO-BUILD:** the disqualifier is **content, not tech** — municipal flat sales are near-zero and go bezprzetargowo to sitting tenants; the auction stream is entirely building plots; no ZGM/TBS housing manager producing a flat-auction pipeline. Per the project heuristic this is a land + tenant-sale BIP, not a flat-auction source.

**VERDICT: NO-BUILD** — Tuchola auctions only municipal building plots; flats are disposed bezprzetargowo to tenants (~1/yr, one auctioned flat went unsold). Clean scrapeable comma-path BIP, but no flat-auction volume and no flat achieved-price stream to justify an adapter.
