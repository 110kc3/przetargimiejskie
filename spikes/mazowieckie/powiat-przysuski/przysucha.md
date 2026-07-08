# Spike — Przysucha (Mazowieckie · powiat przysuski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (flat-auction volume ~1/year; land-dominated generic city-BIP; MADKOM SPA).

## TL;DR
Urząd Gminy i Miasta Przysucha (a small gmina miejsko-wiejska seat) does technically sell municipal **lokale mieszkalne** at *przetarg ustny nieograniczony* — two live cases confirmed (Partyzantów 4B, Dec 2025; Radomska, Feb 2025). But **open flat-auction volume is negligible (~1/year)**: an aggregator snapshot over ~10 months (Jun 2024 – Apr 2025) shows 15 property tenders of which **only 1 was a flat**, 1 commercial, and **~12 were land plots (działki budowlane)**. There is **no housing manager** (no ZGM/ZBM/TBS — sales handled by the Wydział Mienia Komunalnego) and **no dedicated achieved-price results board**. The BIP is **MADKOM eBIP**: a React SPA (`#root`, webpack chunks) fed by a `/api/` JSON backend — Medium adapter effort. Volume, not tech, kills it. Matches the "small Mazowieckie seat → NO-BUILD" pattern. Closest analog would be the MADKOM SPA cities (milicz / oława), but not worth building here.

## 1. Sells municipal property at auction?
**YES for property in general, but flats are rare.** The Burmistrz ogłasza *przetarg ustny nieograniczony na sprzedaż nieruchomości położonych na terenie miasta i gminy Przysucha* — the board is dominated by building plots (tereny zabudowy mieszkalno-usługowej / budownictwa jednorodzinnego) and periodic lease (dzierżawa) items. Confirmed **flat** auctions:
- **ul. Partyzantów 4B** — lokal mieszkalny w budynku wielorodzinnym + udział w gruncie; *przetarg ustny nieograniczony*; cena wywoławcza **133 959,00 zł**, wadium 15 000 zł; auction **04.12.2025** godz. 12:00, sala nr 2 UGiM (republished as a paid komunikat in Dziennik Zachodni, 27.10.2025).
- **ul. Radomska** — lokal mieszkalny, przetarg **27.02.2025** (per adradar monitor).
Everything else on the board is land or lease. Procedure run by **Wydział Mienia Komunalnego** (p. nr 4a, tel. 48/675-00-44) — **no separate housing company/manager exists**.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (MADKOM eBIP):** `https://bip.gminaprzysucha.pl`
- Przetargi board: `https://bip.gminaprzysucha.pl/m,13,przetargi.html` (menu id **13**, parent m,92 *Gospodarka nieruchomościami*, root m,12 *Menu podmiotowe*).
- Wykazy nieruchomości do sprzedaży: `https://bip.gminaprzysucha.pl/a,19048,wykaz-nieruchomosci-gminy-i-miasta-przysucha-przeznaczonych-do-sprzedazy.html`
- Example notice: `https://bip.gminaprzysucha.pl/a,19119,ogloszenie-o-przetargu.html` (article id **19119** — actually a 2022 land + dzierżawa ogłoszenie; slug is generic "ogłoszenie o przetargu").
- Zamówienia publiczne (works/services, out of scope): `https://bip.gminaprzysucha.pl/o,85,zamowienia-publiczne.html`
- URL scheme: `m,<menuId>,slug.html` (menu), `a,<articleId>,slug.html` (article), `o,…` / `v,…` variants.
- **JSON API base:** `https://bip.gminaprzysucha.pl/api/` — single article: `GET /api/articles/{id}` (e.g. `/api/articles/19119` → 200, ~34 KB JSON). List endpoint `/api/article-previews` exists but needs the SPA's exact call signature (bare id 400s "Niepoprawny format id").
- **No dedicated "wyniki / informacja o wyniku przetargu" board** was found — results, if posted, land as ordinary articles in the same przetargi menu (no hammer-price stream).
- Do **not** confuse with the powiat: `bip.przysucha.pl` / `bip.powiatprzysuski.eu` = Starostwo Powiatowe (separate JST).

## 3. Format + rendering
- **CMS: MADKOM eBIP.** Raw page (`m,13,…`) is a **React SPA shell** — 4 KB HTML, empty `<div id="root">`, webpack runtime + `main.*.chunk.js` (`webpackJsonplayout-default`); "madkom"/"Madkom" string in bundle; no server-rendered content (curl body has zero przetarg text).
- **Data via JSON API** (`window.location.origin + "/api/"`). `/api/articles/{id}` returns a rich object; the ogłoszenie body is **inline HTML** in `content` (HTML-entity-encoded tables: powierzchnia / cena wywoławcza / wadium / termin), plus **born-digital text PDF attachments** — e.g. `Ogłoszenie przetarg 23 03 2022.pdf` (232 KB) under `attachments[]`.
- **No SPA rendering needed for scraping** if you hit the API directly; **no auth/CAPTCHA**. Reachable from the Pi (Polish IP), plain HTTP→HTTPS.
- Effort tax: reverse-engineer `/api/article-previews` pagination + parse HTML-in-JSON tables and/or the attached text-PDF. `pdfText` sufficient (born-digital, no OCR).

## 4. Volume + achieved-price stream
- **Open flat auctions: ~1 per year.** Adradar monitor (gm. Przysucha, Jun 2024 – Apr 2025): **15 tenders → 1 flat (Radomska), 1 commercial (Skrzyńsko, repeated), ~12 land plots** (Głęboka Droga, Kolonia Szczerbacka, Janików, Beźnik, Jakubów). Add the single Partyzantów 4B flat in late 2025. So the flat cadence is roughly 1/year against a land-heavy stream.
- **Achieved-price stream: effectively none.** No dedicated results/rozstrzygnięcia board; announcements carry only *cena wywoławcza* / *wadium*. Hammer prices are not systematically published.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** MADKOM eBIP React-SPA + `/api/` JSON cities — **milicz / oława** pattern (both backlog-only, no built adapter to crib from yet).
- **Effort:** would be **Medium** — JSON API is clean but undocumented; must reverse `article-previews` list call, parse HTML-in-JSON tables, and dip into text-PDF attachments; classify to drop the dominant land/lease/procurement noise.
- **Blockers to value (not tech):** (1) **flat volume ~1/year** — far below the "recurring open flat auctions" bar; (2) **no housing manager** (Wydział Mienia Komunalnego only); (3) **no achieved-price results board**; (4) board is a **generic city-BIP skewing to działki budowlane** + tenant/lease items. This is the textbook NO-BUILD profile for a small Mazowieckie miejsko-wiejska seat.

**VERDICT: NO-BUILD** — Przysucha sells the odd municipal flat at open auction but only ~1/year, on a land-dominated generic city-BIP with no housing manager and no hammer-price board; the MADKOM SPA adapter effort (Medium) is not justified by the flat volume.
