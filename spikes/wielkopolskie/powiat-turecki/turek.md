# Spike — Turek (Wielkopolskie · powiat turecki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (land-only auction stream; flats go to sitting tenants bezprzetargowo).

## TL;DR
Gmina Miejska Turek (Urząd Miejski w Turku, ul. Jedwabnicza 4) does sell municipal property by `ustny przetarg nieograniczony`, and publishes clean, dated, server-rendered notices on its BIP `bip.miastoturek.pl` — an **AlfaTV** CMS (`/artykul/<slug>`, jQuery-DataTables "Lista artykułów" board). **But the entire 2023→2026 auction history is land, garages, firewood and rentals — not a single open `lokal mieszkalny` (flat) auction.** Flats surface only as `wykaz lokali mieszkalnych przeznaczonych do sprzedaży ... wraz ze sprzedażą udziału w gruncie` (pre-sale designation lists), with no auction ever following → they are disposed **bezprzetargowo na rzecz najemcy** (sitting-tenant preemption sales, art. 34 ugn / bonifikata), which are out of scope. There IS an achieved-price stream (`Informacja o wyniku przetargu`) but it is land-only and very low volume (~3-4 sale auctions/yr). This is the textbook "generic city-BIP property section skews to land + tenant flat sales" NO-BUILD case. Disambiguated from the rural **Gmina Turek** (`bip.gmina.turek.pl`), a separate JST.

## 1. Sells municipal property at auction?
**YES for land/garages — NO open flat auctions.** The Burmistrz Miasta Turku runs `przetarg ustny nieograniczony` for property sales. Full board history (2023-01 → 2026-06, "Przetargi na nieruchomości") is dominated by:
- `nieruchomość gruntowa niezabudowana` (undeveloped land) — the bulk (ul. Zdrojki Lewe, Korytkowska, Aleja NSZZ „Solidarność", Os. Wyzwolenia, Mickiewicza, Andersa…);
- `nieruchomość gruntowa zabudowana` / `zabudowana garażem` (developed land, garage plots);
- `sprzedaż drewna opałowego` (firewood — not real estate), `najem lokali użytkowych/garaży`, `wydzierżawienie` (rentals/leases — out of scope);
- one `samodzielny lokal użytkowy 40,00 m²` (2026-02-04 — **commercial** unit, not mieszkalny);
- one `nieruchomość gruntowa zabudowana budynkiem mieszkalnym` (ul. Niepodległości 16, 2026-04-29 — a whole **house on a plot**, not a `lokal mieszkalny` flat);
- `udział 1/40` share in a developed plot (ul. Nowa 17, 2025-06-04).

**Zero `sprzedaż lokalu mieszkalnego` (open flat) auctions across ~3.5 years.** Meanwhile the "Nieruchomości miejskie" board carries recurring `Wykaz lokali mieszkalnych przeznaczonych do sprzedaży ... wraz ze sprzedażą udziału w gruncie` (2026-05-20, 2026-02-18, plus older 2020 batches). A wykaz that is never followed by a przetarg = the flats are sold to their **sitting tenants bezprzetargowo** (tenant preemption, not an auction). That volume is invisible/out-of-scope for a flat-auction scraper.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (AlfaTV CMS):** `https://bip.miastoturek.pl`
- Auction board (announcements + inline results): `https://bip.miastoturek.pl/artykul/przetargi-na-nieruchomosci`
- Property/wykaz board (flats appear here as designations): `https://bip.miastoturek.pl/artykul/nieruchomosci-miejskie`
- Movable-property auctions: `https://bip.miastoturek.pl/artykul/przetargi-na-ruchomosci`
- Individual notices are `https://bip.miastoturek.pl/artykul/<slug>` (long descriptive slugs). **Notices expire** — the board tags concluded items "(artykuł stracił ważność)" and the article URL then returns **HTTP 404** (delisted), so only currently-valid notices are reliably fetchable; historical detail pages are ephemeral.
- Vendor: **alfatv.pl** (footer). Board rows are rendered server-side into a jQuery-**DataTables** "Lista artykułów" table (Tytuł + Data publikacji columns) — rows are in the static HTML; DataTables only adds client-side sort/paginate.

Authority: Urząd Miejski w Turku, Wydział Gospodarki Nieruchomościami i Lokalami Mieszkaniowymi, ul. Jedwabnicza 4, tel. 63 222-38-89.

**Do NOT confuse** with the rural **Gmina Turek** at `https://bip.gmina.turek.pl` / `www.gmina.turek.pl` — a separate JST, out of scope. Our target is the town **Gmina Miejska Turek**.

## 3. Format + rendering
- **Server-rendered HTML** — AlfaTV CMS. Board list rows (title + timestamp) are in-band in the HTML table; no server-side AJAX needed to enumerate the list (the page's only AJAX endpoints are `/rejestrzmian/ajax` for the change-register, unrelated).
- **No SPA, no auth, no CAPTCHA.** WebFetch is **403-gated** on the bot UA; a **browser UA via curl returns 200** (fetched live). Detail notices are HTML articles; some carry born-digital PDF/DOC attachments (handle with `pdfText`/`docText` if ever needed).
- Caveat: expired notices 404, so a crawler can only ever see the live window — no in-CMS backfill of concluded auctions beyond what is currently valid.

## 4. Volume + achieved-price stream
- **Volume:** Very low, and **land-only** for our purposes — roughly **3-4 sale auctions per year** (undeveloped/developed land + occasional garage plot), plus firewood and rentals. **Flat-auction volume = 0.**
- **Achieved-price stream:** YES but land-only — `Informacja o wyniku/wynikach przetargu` notices are posted to the same board (e.g. 2026-01-29 land, 2025-11-12, 2025-07-14 udział 1/40). Parseable `cena osiągnięta`/`nabywca`, but no flats.
- **Housing manager:** no dedicated ZGM/TBS flat-auction pipeline is visible; flat disposals run through the Urząd's wykaz → tenant-preemption route, not an auction stream.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (were it in scope):** AlfaTV / server-HTML DataTables board — a plain "WordPress / custom HTML" family board (ADAPTER-GUIDE §3): list-rows in HTML → `/artykul/<slug>` detail → regex/DOM parse. Technically easy (Low) IF there were flats.
- **CMS family:** AlfaTV (alfatv.pl) hosted BIP — server-rendered HTML + jQuery DataTables; browser-UA required (bot UA 403s).
- **Blocker (decisive):** **no target signal.** Zero open flat auctions in ~3.5 years; the municipal-flat volume is sold bezprzetargowo to tenants (wykaz-only, no przetarg). The auction stream that IS scrapeable is land/garages, and notices expire to 404 (thin, live-window-only history). Building here yields land records only — not the flat-auction dataset this project targets.

**VERDICT: NO-BUILD** — clean AlfaTV server-HTML BIP with a real auction + results board, but the stream is **land/garages/rentals only**; municipal flats are disposed to sitting tenants bezprzetargowo (wykaz, no auction). No open flat-auction stream to extract. Effort N/A. Re-verify only if Turek later switches to selling flats by open przetarg.
