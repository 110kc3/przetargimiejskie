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
auctions only. So the v1 Bytom adapter is **active-only**: properties are built
from the catalog alone, all `outcome: 'active'`. This mirrors how Katowice
shipped its announcement adapter before the result-PDF parser. The round
(`II/III Przetarg`) already encodes "this has failed to sell before," so the
active feed carries real relisting signal even without a results history.

> **Correction (browser network spike, May 2026).** An earlier draft here
> claimed `www.bytom.pl/bip` is *JavaScript-rendered*. That was wrong — see the
> "Update — bytom.pl/bip is server-rendered" section below. It IS crawlable;
> the empty `web_fetch` result was a bot-UA / readability artifact, not JS.

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

## Chorzów — `bip.chorzow.eu` ❌ dropped (no flat-sale stream)

> **Verdict (browser spike, May 2026): drop Chorzów.** It does not auction
> residential flats — they are rental-only — and its actual sale auctions are
> sparse land/plot sales published as free-text HTML. Not a fit for the
> flat-flipper product. Details below; the earlier "deferred" notes follow.

**What the browser spike found (expanding the BIP menus directly):**

- **No `lokale mieszkalne na sprzedaż` category exists at all.** The only sale
  categories on the "Ogłoszenia urzędowe" board are *Nieruchomości niezabudowane
  na sprzedaż* (land), *Nieruchomości zabudowane na sprzedaż* (buildings) and
  *Lokale użytkowe* (commercial) — there is simply no residential-flat sale
  bucket. Flats are handled by Wydział Mieszkalnictwa as **rentals** (confirmed
  in the first spike: stawka zł/m², umowa najmu).
- **Those three sale categories are empty, stale placeholders** — each renders
  no listings and carries a "modyfikowany: 10-09-2014" stamp. Current sale
  activity is not posted there.
- **The live sale content is a thin "Informacja o wyniku przetargu" results
  stream**, and what it contains is **land**. The one current item
  (`id=175377876015289622`, "ul. Wysockiego") is a concluded **plot** auction
  described in free-text HTML prose — geodetic parcel numbers, m², księga
  wieczysta — *"przeprowadzony II przetarg ustny nieograniczony na sprzedaż
  nieruchomości … ul. Wysockiego … 4995/242 o powierzchni 335 m² …"*. No
  structured fields, no PDF, no flats.

**Why drop:** the product keys on `street|building|apt` residential flats with a
price-per-m² history. Chorzów offers none of that at auction — its flats are
rentals, and its sale auctions are occasional land/commercial parcels posted as
unstructured prose. Same call as Sosnowiec. Revisit only if the product ever
expands to municipal *land* sales (a different vertical), in which case the
"Informacja o wyniku przetargu" notices are a free-text HTML source to parse.

---

### Earlier notes (first spike) — Chorzów `bip.chorzow.eu` ⚠️ (superseded by the verdict above)

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

### Remaining before a Chorzów adapter can be built — RESOLVED

Both questions are now answered by the browser spike (see the verdict at the top
of this section): the menus were expanded, and Chorzów does **not** sell
residential flats at auction — only occasional land/commercial parcels, as
free-text HTML result notices. No adapter to build. Dropped.

## Update — bytom.pl/bip is server-rendered (browser network spike, May 2026)

Triggered by two user reports against the shipped v1.4.0 Bytom adapter: (1) the
per-listing link *downloads a .doc* instead of opening a page, and (2) there are
*no historical auctions*. Both pointed at `www.bytom.pl/bip`, which earlier
`web_fetch` calls returned empty for. I drove a real Chrome tab to inspect it.

**Key finding: `www.bytom.pl/bip` is NOT a JS SPA.** The network trace for
`/bip/zbycie-nieruchomosci-bytom/nieruchomosci-wszystkie` shows a single
document GET (200) plus CSS/JS/fonts/images — **zero XHR/fetch/API calls**. The
listing content is in the initial HTML. The earlier empty `web_fetch` was
therefore bot-UA gating or readability extraction returning nothing, **not**
client-side rendering. Implication: a plain-`fetch` crawl can read it — *but the
crawler must send a browser-like User-Agent / Accept headers*, since something
served `web_fetch` an empty body. (Couldn't verify the UA gate from the CI
sandbox — its DNS can't reach bytom.pl — so treat "bot UA works" as unconfirmed
until a real run.)

**What the BIP listing offers (richer than the i-BIIP catalog):**

- **`/bip/zbycie-nieruchomosci-bytom/nieruchomosci-wszystkie`** — a paginated
  index: **36 items across 3 pages**, covering flats, commercial units,
  buildings and land — including items the catalog omits (e.g. *ul. Sienna 5*,
  *ul. Głęboka 20 w Parzymiechach*).
- **Filters in the page (server-side query params):** category
  (`Lokale mieszkalne`, `Lokale niemieszkalne`, …), a **date-from / date-to
  range**, and a free-text search. The date range is the lever for *history*.
- **Per-property pages**: `/bip/zbycie-nieruchomosci-bytom/<category-slug>/<address-slug>/idn:<id>`
  — a real webpage (fixes the "downloads a file" complaint: link here, not the
  .doc). The round is in the title text ("drugi/trzeci przetarg ustny…").

**Two limitations found:**

1. **Detail pages are thin.** A property page (`idn:13423`) contains only the
   title, publication date, a one-line description, and the attached **.doc** —
   the cena wywoławcza / area / terms live *only inside the .doc*. So the BIP
   route gives proper page URLs + round + date, but **not** inline price or
   area; those still come from the i-BIIP catalog (current) or from parsing the
   .doc.
2. **No achieved/sold-price stream.** The category list has no "wyniki
   przetargu" / results category — every entry is an *announcement*. Bytom
   appears **not to publish achieved sale prices** (unlike Gliwice/Katowice). So
   "historical auctions" for Bytom realistically means **announcement history**
   — the same property offered across I/II/III rounds at descending *starting*
   prices — not sold prices. Worth confirming by filtering the BIP list to old
   date ranges to see how far back concluded announcements persist.

**Recommended Bytom v2 (the real fix for both user reports):** make
`bytom.pl/bip/zbycie-nieruchomosci-bytom` the primary crawl source instead of
the i-BIIP catalog:

- Crawl the paginated list (browser-like UA) → per-property `idn:` page URL +
  address + round + publication date. Use the `idn:` page as `detail_url`.
- Enrich price/area by parsing each `.doc` (`core/parse-docx.js`, per
  EXPANSION.md §1.4) — or keep pulling those two fields from the i-BIIP catalog
  and join by address.
- Walk the date-range filter backwards to collect prior-round announcements →
  per-property *announcement* history (rounds at starting prices).
- Accept that achieved sold prices likely don't exist for Bytom; the product
  shows starting-price-per-round history, which still flags repeatedly-relisted
  (discounted) stock — the core signal.

This is a meaningfully bigger build than the v1 catalog adapter (pagination +
.doc parsing + browser-like UA + history backfill), scoped as a follow-up rather
than folded into the v1.4.x patch.

## Zabrze — `bip.miastozabrze.pl` ✅ viable + BUILT (Wave 4, v1.6.0)

> **Verdict (browser spike, May 2026): build-worthy → built.** Zabrze genuinely
> auctions residential flats — a dedicated, deep category — unlike Chorzów.
> Adapter shipped (`cities/zabrze/`).
>
> **Corrections after the first runs:** (1) the board is a **Vue SPA**, not
> server-rendered — announcements come from the JSON API
> `/api/v1/document-list/549` (all items, one call); the `/doc/<id>` pages *are*
> server-rendered and carry the `/attachment/<id>` link. (2) The host ships an
> **incomplete TLS chain** (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`) — fetched via a
> relaxed-TLS path (see core/fetch.js). The remaining unknown is the
> **attachment format** (assumed text PDF / pdftotext); validated on the next
> run via the `zabrze WARN: 0 flats parsed` log line.

- **Sales confirmed, residential flats included.** The city BIP has
  *Przetargi na nieruchomości → Sprzedaż → **Lokale mieszkalne***
  (`/zabrze/nieruch/um_pnn/zabrze_pn_sprzedaz/zabrze_pns_mieszkalne`) — a
  dedicated flat-sale board, **113 entries**, paginated (30/page, 4 pages),
  back to at least mid-2025. (Siblings: *Grunty*, *Wykazy nieruchomości*, *Najem*.)
- **Round + auction date in every title.** Entries read *"Ogłoszenie o **I/II**
  ustnych nieograniczonych przetargach na sprzedaż lokali mieszkalnych … na
  dzień **DD.MM.YYYY** r."* with a publication date — the relisting round and
  auction date are parseable straight from the list, like Gliwice's rounds.
- **Server-rendered.** The browser reads it with no API/XHR; `/doc/<id>`
  announcement pages and `/attachment/<id>` files have stable clean URLs. (A
  plain `web_fetch` timed out once — a slow response, not JS.) Plain-`fetch`
  crawl should work.
- **Format — the one real cost.** Each announcement (`/doc/<id>`) is a thin
  wrapper around a **single attachment** ("Ogłoszenie", ~226 KB) holding the
  per-flat table (addresses, starting prices, areas); the list/detail HTML does
  *not* carry those fields inline. So an adapter must download + parse each
  attachment. I could not pin the attachment MIME in-spike (the same-origin
  fetch was privacy-blocked; the file downloads rather than renders) — it's a
  PDF or a DOC. **Confirm on build**, then route to the matching parser family:
  `core/ocr-pdf` (scanned PDF), `pdftotext` (text PDF), or the `core/parse-docx`
  family (EXPANSION.md §1.4).

**Effort:** comparable to Gliwice/Katowice — a paginated list crawl (round +
auction date + `/doc/` link per title) plus a per-attachment table parser.
Richer than Bytom: real round history and ~1yr+ of announcements. Also has a
*Wykazy nieruchomości* registry (e.g. `/doc/16440`) and — to confirm — possibly
a "wyniki przetargu" results stream that could add sold prices.

**Open items before building:** (a) confirm the attachment MIME + whether the
table is clean text or scanned; (b) check for a results/"wyniki" stream (sold
prices); (c) confirm the bot UA isn't gated (untestable from the CI sandbox,
which can't reach the host).

## Recommendation

Build **Zabrze** next (Wave 4) — the best untouched Silesian candidate: a deep,
dedicated, server-rendered flat-sale board with rounds and dates. Build
**Bytom** as the third city (done, v1.4.0, active-only). For its v2, switch the
crawl to the server-rendered `bytom.pl/bip` list per the update above — it fixes
the file-download link and adds round/announcement history. Keep
**Chorzów** deferred pending a deeper spike — do not build it blind.
