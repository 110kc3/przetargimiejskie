# Spike — Myślibórz (Zachodniopomorskie · powiat myśliborski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (land + tenant-sale BIP; ~0 open flat auctions).

## TL;DR
Gmina Myślibórz (Urząd Miejski, Wydział Gospodarki Nieruchomościami, symbol GN) runs `przetarg ustny nieograniczony` for property sales and publishes on the city BIP `bip.mysliborz.pl` — an **alfatv.pl-hosted** server-rendered HTML BIP (Bootstrap, `table.lista_artykuly` listings, `/artykul/<slug>` + legacy `/strony/NNNN.dhtml` URLs), migrated from `mysliborz.bip.alfatv.pl`. There IS a real sale-auction board with a results/achieved-price stream. **But the open auctions are essentially all LAND and "kompleks nieruchomości" — the 2025–2026 sales-auction board carries 15 items and ZERO flat auctions.** The only `sprzedaż lokalu mieszkalnego` open auction found is a **2015** PDF (lokal 37.30 m², Głazów, 43 000 zł). Residential flats are disposed **bezprzetargowo** (dedicated "Ogłoszenia dot. adaptacji lokali mieszkalnych" board) and via **wykaz** (scanned PDFs), not at open auction. No housing manager (ZGM/ZBM/TBS) surfaced. Announcement bodies are thin HTML wrappers around **PDF attachments** (born-digital notices + scanner-named wykaz PDFs). Classic land + tenant-sale city-BIP → NO-BUILD.

## 1. Sells municipal property at auction?
**YES for property in general — but effectively NO for flats.** The Burmistrz Myśliborza runs `pierwszy/drugi/trzeci przetarg ustny nieograniczony na sprzedaż nieruchomości`. Live sales-auction board `/artykul/przetargi-2` (fetched 2026-07-08), 15 rows dated 2025-03 → 2026-06 — every sale item is undeveloped land or "kompleks nieruchomości", e.g.:
- 2026-06-17 — I przetarg ustny nieograniczony, sprzedaż nieruchomości, obręb 0017 Renice, dz. 123/1.
- 2026-03-25 — II przetarg, sprzedaż **kompleksu nieruchomości** (+ 2026-01-26 I przetarg, + wynik notices).
- 2025-04-29 — three separate I przetargi na sprzedaż nieruchomości (land plots).

No `lokal mieszkalny` appears anywhere in the 2025–2026 auction stream (the only "lokali mieszkalnych" strings on the board are the sidebar nav link "Ogłoszenia dot. adaptacji lokali mieszkalnych"). The single open flat auction on record is legacy: `/strony/8216.dhtml` — "przetargi ustne… na sprzedaż nieruchomości" dated **06 lis 2015**, whose PDF listed a lokal mieszkalny 37.30 m² in Głazów at cena wywoławcza 43 000 zł. Flats otherwise move as tenant adaptations (`adaptacja lokali mieszkalnych`) and wykaz-listed (often bezprzetargowo na rzecz najemcy).

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP `bip.mysliborz.pl` (alfatv.pl CMS):**
- Przetargi (parent): `https://bip.mysliborz.pl/artykul/przetargi-3`
- **Sprzedaż nieruchomości** (parent): `https://bip.mysliborz.pl/artykul/sprzedaz-nieruchomosci` → nests three sub-boards:
  - **Przetargi (sale auctions + results):** `https://bip.mysliborz.pl/artykul/przetargi-2`
  - **Wykazy:** `https://bip.mysliborz.pl/artykul/wykazy` (24+ "Wykaz sprzedaż nieruchomości" items, scanned PDFs)
  - Dokumenty do pobrania: `https://bip.mysliborz.pl/artykul/dokumenty-do-pobrania`
- Najem i dzierżawa nieruchomości (lease auctions): `https://bip.mysliborz.pl/artykul/najem-i-dzierzawa-nieruchomosci`
- Ogłoszenia dot. adaptacji lokali mieszkalnych (tenant flat sales, bezprzetargowo): `https://bip.mysliborz.pl/artykul/ogloszenia-dot-adaptacji-lokali-mieszkalnych`
- Legacy host (same CMS, older slugs, still indexed): `mysliborz.bip.alfatv.pl` / `mysliborz-bip.alfatv.pl` (e.g. `/strony/7590.dhtml`, `/strony/7502.dhtml`).

Contact: Urząd Miejski, Rynek im. Jana Pawła II 1, 74-300 Myślibórz; tel. 95 747 20 61; Wydział Gospodarki Nieruchomościami (GN). Not our target: `bip.powiatmysliborski.pl` (Starostwo Powiatowe — county land) is a separate JST, out of scope.

## 3. Format + rendering
- **Server-rendered HTML** — alfatv.pl-hosted BIP. Category pages are Bootstrap `table.table-striped.lista_artykuly` (Tytuł / Data publikacji), individual notices at `/artykul/<slug>`. WebFetch from the US IP gets **HTTP 403** (recaptcha `api.js` present); plain `curl` from the **Polish Pi IP returns 200** — same host-fingerprint gate as other PL BIPs.
- **Announcement bodies are thin HTML wrappers around PDF attachments.** The HTML page holds only the title; the actual notice is a downloadable PDF ("Ogłoszenie o I przetargu … (PDF, 1.67 Mb)"). Wykazy attach scanner-named PDFs (`doc23703720260618092726.pdf`) → **likely scanned → OCR** for those; the przetarg PDFs are probably born-digital text but sometimes bundle maps/scans.
- No SPA, no JSON API, no auth beyond the IP/recaptcha gate.

## 4. Volume + achieved-price stream
- **Open flat-auction volume: ~0.** 2025–2026 sales-auction board = 15 items, all land / kompleks nieruchomości. Only one flat auction ever (2015 PDF). Flats disposed off-auction (adaptacja/wykaz).
- **Land-auction volume:** low-to-modest — roughly a handful of sale przetargi + repeat rounds per year.
- **Achieved-price stream: YES (but for land).** The same `/artykul/przetargi-2` board carries `Informacja o wyniku … przetargu ustnego nieograniczonego` notices (2025-05, 2025-06 x3, 2025-10, 2026-03, 2026-05) — hammer prices exist, just not for flats. Result bodies are again PDF-backed.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** alfatv.pl-hosted Zachodniopomorskie BIP — server-HTML `table.lista_artykuly` + PDF attachments; rendering-wise it resembles the bip.info.pl / bipgov.net server-HTML family, but content lives in PDFs (like the wykaz-heavy NO-BUILD gminy). Legacy `.dhtml` → new `/artykul/` slug is the only quirk.
- **Effort if it were built:** Medium — list scrape is trivial, but every field lives in a PDF (mix of born-digital text + scanned wykaz → OCR), and the flat signal is absent.
- **Blockers / why NO-BUILD:** The dataset target is **open flat auctions with achieved prices**; Myślibórz has essentially none. Residential disposal here is bezprzetargowo (tenant adaptation) + wykaz; open auctions skew entirely to land. No ZGM/ZBM/TBS manager. Unlike drawsko-pomorskie / stargard (BUILD) or łobez (spiked BUILD), Myślibórz shows zero recurring flat-auction volume. Not worth an adapter for flats.

**VERDICT: NO-BUILD** — real land-sale auction board with a results stream, but ~0 open flat auctions (one 2015 PDF); flats move bezprzetargowo/wykaz, notices are PDF-backed, no housing manager. Generic land + tenant-sale city-BIP.
