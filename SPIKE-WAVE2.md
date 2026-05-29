# Wave 2 spike — Chorzów & Bytom municipal property sales

> **Status:** done (May 2026). Follow-up to [SPIKE-WAVE1.md](./SPIKE-WAVE1.md)
> (which picked Katowice). Same discipline: find the real *sale*-auction source
> for each candidate, answer the three load-bearing questions — (a) does the
> city sell municipal property at auction, (b) where are results published,
> (c) in what format — before writing any adapter. Method: direct page fetches.
> No headless browser used.

## TL;DR

- **Bytom is the clean pick — built as Wave 3 (v1.4.0).** Its i-BIIP "Katalog
  nieruchomości do zbycia" is a single server-rendered HTML page listing every
  active sale auction with all fields inline (address, type, round, date,
  starting price, area). No OCR, no PDF, no JS — the simplest source in the
  project. Residential flats are present.
- **Chorzów is deferred.** Its prominent municipal-flat board is *rentals*
  (wynajem, stawka in zł/m²), not sales — the same trap MZZL/KZGM sprung in
  Wave 1. Real sale auctions exist (land, commercial, a results stream) but are
  sparse and live behind JS-expandable menus a plain fetch can't open. No clean
  residential-sale catalog was found. Needs a deeper (headless-browser) spike
  before an adapter is justified.

## Bytom — `i-biip.um.bytom.pl` ✅ viable, built

- **Source:** the city spatial-information portal's investor catalog,
  **`i-biip.um.bytom.pl/katalog-nieruchomosci-do-zbycia.html`** ("Katalog
  nieruchomości do zbycia"). Sales are run by Urząd Miasta Bytom (Wydział
  Obrotu Nieruchomościami).
- **Sales confirmed.** The catalog carries genuine open sale auctions including
  residential flats — e.g. *pl. Akademicki 11/12* (76.14 m², III Przetarg,
  97 000 zł), *Piekarska 9/9*, *Katowicka 44/8*, *Chorzowska 20/13* — plus
  commercial units (*lokal użytkowy*) and land parcels (*grunty*).
- **Relisting rounds.** Each row's `ETAP SPRZEDAŻY` is `I / II / III Przetarg`
  — the same low-interest signal Gliwice's Roman-numeral rounds give, handed to
  us directly.
- **Format — the easy part.** The page is **server-rendered HTML readable with
  plain `fetch()`** (no JS, no OCR). Every field is present inline as a
  labelled block:

  ```
  ADRES:            pl. Akademicki 11/12
  TYP:              lokal mieszkalny
  ETAP SPRZEDAŻY:   III Przetarg
  TERMIN PRZETARGU: 2026-06-15            ← already ISO YYYY-MM-DD
  CENA WYWOŁAWCZA:  97000
  POWIERZCHNIA:     76.14
  LINK:             https://www.bytom.pl/bip/download/Ogloszenie-…-11-12,23604.doc
  ```

  So the active-listing record needs **no detail crawl and no OCR** — unlike
  Gliwice (OCR'd result PDFs + a separate detail-area crawl) and Katowice
  (pdftotext result tables). This motivated a new `source: 'html'` adapter type
  in the registry: the refresh loop's OCR/parse phase is skipped entirely.
- **Address conventions.** `<street> <bldg>/<apt>` (`Piłsudskiego 65/10`,
  `Dworcowa 5/18`) — exactly what `core/normalize.js` already keys on. Land
  parcels use plot numbers (`Matki Ewy dz. 5742/32`) which don't fit
  street|building|apt; the adapter **skips all `grunt…` types** (same call
  Gliwice/Katowice make for vacant-lot sales).

**The one real gap — sold-price results.** The catalog is active/upcoming
auctions only. Bytom does publish results ("Informacja o wyniku przetargu") on
`www.bytom.pl/bip/zbycie-nieruchomosci-bytom/…`, but those pages are
**JavaScript-rendered** — plain `fetch()` returns an empty shell (the same wall
the Sosnowiec BIP and the katowice.eu SharePoint `AllItems.aspx` pages hit in
Wave 1). So the v1 Bytom adapter is **active-only**: properties are built from
the catalog alone, all `outcome: 'active'`. This mirrors how Katowice shipped
its announcement adapter before the result-PDF parser. The round (`II/III
Przetarg`) already encodes "this has failed to sell before," so the active feed
carries real relisting signal even without a results history.

### Two ways forward for Bytom sold-price history (not done in this spike)

1. **Parse the `.doc` announcements.** Each catalog `LINK` is a Word
   announcement (`Ogloszenie-przetargu-….doc`). These carry the full legal
   text (wadium, viewing date, sometimes prior-auction references). `.doc` is
   extractable; this is the `core/parse-docx.js` family EXPANSION.md §1.4
   anticipated for Bytom. Adds wadium/viewing enrichment, not sold prices.
2. **Reach the JS-rendered results pages.** A headless browser (Playwright) or
   a non-JS endpoint on `bytom.pl/bip` would unlock "Informacja o wyniku
   przetargu" — the actual sold/negative outcomes. This is the load-bearing
   route for years of Bytom zł/m² history. Spike the BIP's data endpoint
   (REST/RSS) before committing to Playwright, the way katowice.eu's SharePoint
   REST endpoint turned out to be reachable in Wave 1.

## Chorzów — `bip.chorzow.eu` ⚠️ deferred

- **Housing authority:** ZK PGM (rentals). As in Wave 1, the authority is not
  the sales source.
- **The rentals trap.** The most prominent, regularly-updated property board —
  "Lokale mieszkalne do licytacji i przetargu ofertowego"
  (`bip.chorzow.eu/index.php?id=165285662624307654`) — looks like a sales board
  but is **rentals**: it auctions a *rent rate* (`wylicytowana stawka` in
  zł/m²), references "regulamin … przetargów na **wynajem** lokali
  mieszkalnych", "umowa najmu", and means-tested income thresholds. Same shape
  as Sosnowiec MZZL / Katowice KZGM. Not a sales source.
- **The sales pages are thin.** "Sprzedaż nieruchomości Miasta Chorzów"
  (`id=163829087747246213`) is a procedure/how-to card with no listings.
  "Nieruchomości zabudowane na sprzedaż" (`kat=105637856620697995`) is an
  **empty category** (last modified 2014). Sale-relevant categories do exist on
  the "Ogłoszenia urzędowe" board — *Nieruchomości niezabudowane na sprzedaż*,
  *Lokale użytkowe*, and an *"Informacja o wyniku przetargu na zbycie i
  wydzierżawienie nieruchomości"* results node — but they are collapsed
  `rozwiń` (expand) submenus whose contents load only when the JS menu is
  toggled; plain `fetch()` returns the menu chrome, not the documents.
- **Verdict.** Chorzów does sell municipal property at auction (land and
  commercial, with a results stream), but **no clean residential-flat sale
  catalog was located**, and what exists is behind JS-expandable menus. Writing
  an adapter now would be guessing at URLs and formats — exactly what the spike
  discipline (and `CLAUDE.md`'s "no guessing" rule) exists to prevent.

### Remaining before a Chorzów adapter can be built

- A headless-browser pass that expands the "Ogłoszenia urzędowe" sale/result
  submenus and enumerates the actual document URLs + formats (HTML node vs.
  PDF attachment vs. `.doc`).
- Confirm whether Chorzów sells *residential flats* at auction at all, or only
  land/commercial (many Silesian cities sell flats only to sitting tenants
  *bezprzetargowo*, leaving nothing for a flat-flipper product to track).

## Recommendation

Build **Bytom** as the third city (done, v1.4.0, active-only). Keep **Chorzów**
deferred pending a deeper spike — do not build it blind.
