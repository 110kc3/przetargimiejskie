# Spike — Strzyżów (Podkarpackie · powiat strzyżowski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD — Gmina Strzyżów runs open oral auctions for **land + commercial rentals only**; no municipal **lokal mieszkalny** sale auctions found (classic Podkarpackie tenant pre-emption + land-only pattern).

## TL;DR
Gmina Strzyżów (miejsko-wiejska, town seat; Burmistrz Strzyżowa) does hold recurring *przetarg ustny nieograniczony na sprzedaż nieruchomości*, but across 2023–2026 every open sale auction found is for **land plots** (nieruchomości niezabudowane/zabudowane, działki in Wysoka Strzyżowska, Godowa, Tropie, Brzeżanka, Zawadka, plus obręby 0001/0003 in Strzyżów town) or **najem lokalu użytkowego** (commercial/warehouse rentals). **Zero** *przetarg na sprzedaż lokalu mieszkalnego* (municipal flat sale). The only flat auction surfacing for Strzyżów (ul. Grunwaldzka 15, 58,22 m², cena 116 127 zł, **rękojmia** 15 483,60 zł) is a **komornik/court licytacja** (bailiff execution, not a gmina sale) — out of scope. Notices live on the city BIP `bip.strzyzow.pl` (BUK Softres CMS, PDF attachments) mirrored as clean-slug articles on `strzyzow.pl/aktualnosci`. Municipal flats here go **bezprzetargowo na rzecz najemcy**; there is no scrapeable open flat-auction stream. NO-BUILD.

## 1. Sells municipal property at auction?
**YES for land / commercial rental — NO for flats.** The Burmistrz Strzyżowa regularly announces *pierwszy/drugi/trzeci przetarg ustny nieograniczony na sprzedaż nieruchomości* and *przetarg ustny nieograniczony na najem lokalu użytkowego*. Confirmed 2023–2026 examples (all land or commercial):
- Wysoka Strzyżowska — sprzedaż nieruchomości 0,06 / 0,24 ha (I, II przetarg).
- Godowa — działka 1768/2; drugi przetarg ustny nieograniczony na sprzedaż nieruchomości.
- Tropie, Brzeżanka (0,15 / 0,54 ha), Zawadka (0,1244 ha, III przetarg) — all land.
- Strzyżów town obręb ewid. 0001 / 0003 — sprzedaż nieruchomości (plots).
- ul. Rynek 12 — **najem** lokalu użytkowego 91,04 m²; magazyn 379 m² **najem** (rentals, not sales).

**No** *przetarg na sprzedaż lokalu mieszkalnego* in any year checked. The one flat lot for Strzyżów (ul. Grunwaldzka 15, 58,22 m², wartość 154 836 zł, cena wywoławcza 116 127 zł, **rękojmia** 15 483,60 zł) carries a *rękojmia* (bailiff deposit), i.e. a **komornik licytacja** under court execution — not a municipal sale. Consistent with the Podkarpackie seat pattern: council flats are sold **bezprzetargowo na rzecz dotychczasowego najemcy** (tenant pre-emption); only surplus land goes to open auction. A local housing manager exists (PGKiM — Przedsiębiorstwo Gospodarki Komunalnej i Mieszkaniowej w Strzyżowie) but it manages/administers stock, not a public flat-auction board.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (BUK Softres CMS):**
- Przetargi group: `https://bip.strzyzow.pl/index.php?page=group.php&grp=13`
- Przetargi board (department, under 22 / grp 13): `https://bip.strzyzow.pl/index.php?page=zwykly.php&under=22&grp=13`
- Yearly sub-section (2025 example, dep=213): `https://bip.strzyzow.pl/index.php?page=zwykly.php&under=22&grp=13&dep=213`
- Bulk procurement (zamówienia publiczne): `https://platformazakupowa.pl/pn/strzyzow`

**Mirror — main city site (clean-slug articles, WordPress-style):**
- Przetargi feed: `https://strzyzow.pl/aktualnosci/przetargi/`
- Article example: `https://strzyzow.pl/aktualnosci/pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-polozonej-w-miejscowosci-godowa-17682.html`

No dedicated **wyniki / rozstrzygnięcia** (achieved-price) board was found; results are not published as a structured stream. CMS footer: "Realizacja: BUK Softres" (BUK Softres BIP — same family as several small Podkarpackie gminy).

## 3. Format + rendering
- **BIP (`bip.strzyzow.pl`):** BUK Softres, `index.php?page=…&grp=…&dep=…` query-param boards; individual notices are **PDF attachments** listed on the board page (no per-notice HTML permalink). Server-rendered board index; born-digital PDF documents.
- **City site (`strzyzow.pl/aktualnosci`):** server-rendered HTML articles with clean slugs; the auction detail is HTML body + a linked PDF. No JS-SPA gate, no auth/CAPTCHA observed.
- Would be a straightforward HTML-list + `pdfText` scrape **if** there were flats — but the target content (flat sales) does not exist here.

## 4. Volume + achieved-price stream
- **Open flat-sale auctions/year:** effectively **0**. All open sale auctions are land; flats move bezprzetargowo to tenants.
- **Land/commercial auction volume:** modest — a handful per year (several działki + occasional lokal użytkowy najem).
- **Achieved-price (cena osiągnięta) stream:** none found — no wyniki/rozstrzygnięcia board; only *cena wywoławcza* in the announcement PDFs.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (had it been a build):** a BUK Softres / query-param BIP with PDF attachments — WordPress/custom-HTML family (ADAPTER-GUIDE §3), board index + `pdfText`. Technically low, but **not applicable** here.
- **Blocker:** no in-scope inventory. Municipal flats are sold bezprzetargowo na rzecz najemcy; the only open-auction stream is land + lokal użytkowy rentals; the sole flat auction is a bailiff (komornik) licytacja, out of scope. No achieved-price board.
- **Effort:** — (no build).

**VERDICT: NO-BUILD** — Gmina Strzyżów holds recurring open oral auctions for **land and commercial rentals only**; no municipal *sprzedaż lokalu mieszkalnego* auctions exist (flats go bezprzetargowo to tenants; the lone Strzyżów flat auction is a court/komornik licytacja). Textbook Podkarpackie seat: tenant pre-emption + land-only, no scrapeable flat-auction stream.
