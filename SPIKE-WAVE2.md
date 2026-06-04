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

## Ruda Śląska — `rudaslaska.bip.info.pl` ⚠️ buildable but low-priority (spike, June 2026)

**Does the city sell municipal flats at auction?** Yes. The **Wydział Gospodarki
Nieruchomościami (AG)** publishes "ogłoszenia o przetargach na … zbycie lokali
mieszkalnych i użytkowych oraz garaży" — open oral auctions (`ustny przetarg
nieograniczony`) for flats, commercial units and garages — plus *wykazy*
(intent-to-sell lists), *bezprzetargowe* tenant sales, and **result notices**
("Informacja o wyniku … przetargu", i.e. achieved prices). (`Wydział Spraw
Lokalowych — AL` is mostly *najem*/rental, not our target.)

**Where.** City BIP `rudaslaska.bip.info.pl` — the classic server-rendered
`bip.info.pl` platform (no JS SPA). Under *Menu przedmiotowe → Nieruchomości*,
organised by year: `Rok <YYYY> - Zbycie lokali, mieszkań, garaży` (current:
2026 = `idmp=4478`; 2024 = 4183, 2023 = 4023; land sales are a separate
`Zbycie gruntów` category). Active proceedings render in **bold**; the
deadline/validity date sits in the link's `title` (hover) attribute, e.g.
"Data ważności dokumentu upływa w dniu 08.07.2026".

**Format (the catch).** Each document page is minimal HTML — title + a reference
number (`ALM.7125…`, `KGN.6871…`) + a contact name. **All substantive data
(price, area, address terms) lives in a PDF attachment**, and the MIME is mixed:
a garage *wykaz* was **3.17 MB → scanned/image PDF (needs OCR)**; a result notice
was **126 KB → text PDF (pdftotext)**. Filenames are `…_anonymised.pdf` (personal
data redacted; the property data remains). So an adapter would reuse the existing
stack: `core/ocr-pdf` for scanned attachments, `pdf-text` for text ones, routed
by sniffing.

**Two real downsides:**
1. **Poor upstream retention.** Once a proceeding concludes, the BIP sets the
   document to "Dokument jest niedostępny" and empties the old year indexes
   ("Treść jest niedostępna") — the title persists in menus but the content +
   attachment are pulled. Past auctions are therefore **not** back-fillable; only
   forward-captured data survives (our `ocr-cache` + history-merge would preserve
   it going forward, like Bytom).
2. **Low signal right now.** The entire 2026 flat/garage-sale category currently
   holds **3 documents**: two garage *bezprzetargowe* tenant sales (no auction)
   and one land/commercial auction *result*. **Zero open flat auctions are live.**
   Historic "Zbycie 6-ciu lokali mieszkalnych" announcements existed (2023–24) but
   are now `niedostępne`. Volume of genuine open flat auctions looks thin.

**UA note:** `web_fetch` got an empty body — bot-UA gated like Bytom; needs a
browser-like User-Agent (untestable from the CI sandbox).

**Verdict: BUILDABLE, LOW PRIORITY (defer).** Technically tractable — a
server-rendered `bip.info.pl` crawl (per-year category → per-doc page → attachment
PDF → OCR/pdftotext → parse) that reuses the Gliwice OCR stack and the Bytom/Zabrze
per-doc-attachment pattern, and even has a sold-price *results* stream. But the
value/effort ratio is worse than the built cities: data is OCR-gated, mixed
text/scanned, anonymised, poorly retained upstream, and current open-flat-auction
volume is low. Not a DROP like Chorzów — revisit when (a) we want a reusable
"bip.info.pl + OCR-attachment" adapter template (Ruda Śląska, and likely other
`*.bip.info.pl` cities, would then be cheap), or (b) flat-auction volume picks up.

## Tychy — `bip.umtychy.pl` ✅ viable, recommended next build (spike, June 2026)

**Does the city sell municipal flats at auction?** Yes. The Prezydent Miasta
Tychy runs `przetarg ustny nieograniczony na sprzedaż` of municipal property
(flats, commercial, land) and publishes *wykazy* (registers of properties for
sale — e.g. lokal nr 14 at ul. Edukacji 52). Run by the city's
property-management dział, not a separate housing company (MZBM Tychy is the
building manager — procurement/rentals only).

**Where.** City BIP `bip.umtychy.pl` — its own server-rendered CMS (no JS SPA).
A single consolidated section **"NIERUCHOMOŚCI (NAJEM, DZIERŻAWA, SPRZEDAŻ)"**
(`/inne-przetargi/jednostki-organizacyjne-urzedu`, plus a "Jednostki
Organizacyjne Miasta" group) lists current **Aktualne** items and a deep
**month-by-month archive going back to 2014** (concluded items are *retained*,
not pulled — unlike Ruda Śląska). There's also a built-in search box. Sales are
interleaved with najem/dzierżawa and are identified by title
(`… na sprzedaż …` / `zbycie`; exclude `najem`/`dzierżawa`).

**Format (the good part).** Each list item is a detail page that links the
announcement as a **text PDF** via `index.php?action=PobierzPlik&id=<N>`.
Confirmed on a real announcement: `application/pdf`, ~630 KB, embedded fonts +
text operators, PDF title "Microsoft Word - PRZETARG I OGŁOSZENIE" — i.e. a
**Word→PDF export with selectable text → `pdftotext`, no OCR needed**. Same
extractor family as Katowice text PDFs / Zabrze attachments.

**Open items before building (none blocking):**
1. **List/item mechanics** — the Aktualne items + archive-month links render
   (seen via the text reader) but use JS-augmented / query-string anchors; pin
   the exact item-URL + pagination pattern at build time (browser network trace,
   like the Bytom spike).
2. **Results/sold-price stream** — confirm whether "informacja o wyniku
   przetargu" notices are published (would add achieved prices). Even without
   them, the retained archive yields real *announcement* history (rounds at
   descending starting prices), better than Bytom.
3. **Sale volume** — current Aktualne are all *najem*; gauge how many genuine
   flat **sales** the archive carries per year.

**UA note:** the BIP served real content to the browser; `web_fetch` from the
sandbox should be retried with a browser-like UA at build time.

**Verdict (initial): BUILD.** ~~Best remaining Silesian candidate.~~

**Verdict (revised after build-time verification, June 2026): DROP for the flat
product — no open flat-auction stream.** When I went to build it I quantified the
actual content, and the optimistic read did not survive contact with the data:

- The flat-rental list (`/inne-przetargi/jednostki-organizacyjne-urzedu`) is
  **najem only** — no sales.
- The real sales section is **Obwieszczenia → Gospodarka nieruchomościami**
  (`/obwieszczenia/gospodarka-nieruchomosciami/<year>/<month>` — clean,
  server-rendered, crawlable; detail pages `/…/<id>` link a text PDF via
  `?action=PobierzPlik&id=<N>`). So the *mechanics* are exactly as hoped.
- **But the content is the wrong kind.** Across **2024–2026 (36 months, 145
  items): 12 were auctions — every one of them land / commercial / lease
  (działki: Katowicka, Oświęcimska, Jaśkowicka, dzierżawa) — and ZERO were
  residential-flat auctions.** Every municipal *flat* sale is **bezprzetargowe**
  (direct sale to the sitting tenant, with a bonifikata) — not an open auction,
  no rounds, no public price competition.

So Tychy sells almost no flats at open auction; the flat stream is tenant
bezprzetargowe (off-target for a flat-flipper/investor view), and the auctions
that exist are land/commercial. Same shape as Ruda Śląska, confirmed harder.
**Not built.** Revisit only if (a) the product expands to municipal land/
commercial auctions, or (b) Tychy starts auctioning flats. Mechanics are
documented above so a future build needn't re-spike.

## Dąbrowa Górnicza — `bip.dabrowa-gornicza.pl` ❌ dropped for flats (spike, June 2026)

**Mechanics: excellent.** A dedicated, server-rendered **"Zbycie nieruchomości"**
section (`/15665`, paginated `/15665/strona/<N>`, `/15665/wszystkie`; detail
pages `/15665/dokument/<id>`). Detail pages carry the announcement title +
metadata (incl. `Data ważności` = auction date) inline, with PDF attachments —
crucially **both** a scanned `Ogloszenie_….pdf` (~3.8 MB) **and** a
`…_w_wersji_dostepnej_cyfrowo.pdf` (~210 KB) = **accessibility text PDF
→ `pdftotext`, no OCR**. There is also a **results stream** ("informuje o
wynikach przetargów ustnych nieograniczonych" → achieved prices). Run by the
WGN (Wydział Gospodarki Nieruchomościami).

**Content: wrong kind (same as Tychy / Ruda Śląska).** Scanned the disposal list
(5 pages, 75 items): **48 open `przetarg ustny` sale auctions — all land/plots**
(street-only addresses — ul. Łuszczaka, DW 790, Polcera, Al. Kościuszki — with
cadastral maps attached), **0 residential-flat auctions**. The only *flat*
entries are **wykazy of `lokale mieszkalne … do sprzedaży bezprzetargowej na
rzecz najemców`** (tenant sales with bonifikata — Spisaka 15/111, Cieszkowskiego
16/12, …), not auctions.

**Verdict: DROP for the flat product.** No open flat-auction stream; flats go
bezprzetargowo to tenants, open auctions are land. Mechanics are ideal and a
results stream exists, so Dąbrowa Górnicza would be a **strong build if the
product ever expands to land/commercial auctions** — not before. Documented so a
future build needn't re-spike.

## Pattern across the smaller Silesian cities (Ruda Śląska, Tychy, Dąbrowa Górnicza)

Three consecutive spikes show the same shape: the city sells municipal **flats
bezprzetargowo to sitting tenants** (fixed price + bonifikata, no rounds), and
runs **open `przetarg ustny` auctions only for land/commercial**. The built
cities with real open *flat*-auction streams (Gliwice, Katowice, Bytom, Zabrze)
all have a **dedicated municipal housing manager** (ZGM/ZBM-type) that auctions
*vacated* flats. **Selection heuristic for future spikes:** target cities with
such a housing entity (e.g. MZBM/ZBM/ZGM that publishes "przetarg na sprzedaż
lokali mieszkalnych"), not generic city-BIP `gospodarka nieruchomościami`
sections (which skew to land + tenant bezprzetargowe).

## Sosnowiec — `bip.um.sosnowiec.pl` ✅ BUILT (v1.10.0, June 2026)

> **Built.** Adapter `cities/sosnowiec/` crawls the JSON API
> (`/api/menu/6339/articles` current+archived → `/api/articles/<id>`), keeps only
> open `przetarg ustny … na sprzedaż lokalu mieszkalnego` auctions (**37** in the
> archive), and parses address/area/price/date/round from the inline `content`
> HTML — no PDF/OCR. Verified live: price/date/address ≈10/10, area best-effort.
> The land/działka auctions and bezprzetargowe tenant flat sales are excluded.
> Results stream ("informacja o wyniku przetargu") not yet wired. Original spike
> notes below.

Applied the heuristic (look for a housing manager auctioning flats). Sosnowiec
has **MZZL** (Miejski Zakład Zasobów Lokalowych), but its `bip.mzzl.pl/
ogloszenia-o-przetargach` is **rentals only** (wynajem flats "do remontu", latest
2018 — stale). The property **sales** are city-run.

**Sales source: city BIP `bip.um.sosnowiec.pl`** (server-rendered).
- `m,6339,przetargi.html` — current auctions; "Pokaż archiwalne" →
  `o,6339,przetargi.html` is a **deep retained archive (~53 pages)** with sort +
  advanced search. Includes a **results/"lista osób / wynik"** thread.
- `m,6344,nieruchomosci-do-przetargow.html` — a consolidated **"Wykaz
  nieruchomości planowanych do przetargu w 2026"** as a **text PDF** (~180 KB).
- Individual announcements are detail articles with **text-PDF** attachments.

**Content: mostly land, but — unlike Tychy/Ruda/Dąbrowa — flats DO appear.**
The recent archive page is dominated by `sprzedaż nieruchomości niezabudowanej`
(land), `działki`, and `dzierżawa` (lease), plus developed properties
(`zabudowana, ul. Piłsudskiego 34`). **But Sosnowiec genuinely auctions flats
too**: confirmed `przetarg ustny … na sprzedaż spółdzielczego własnościowego
prawa do lokalu mieszkalnego` (e.g. ul. Kaliska 14a, 48,25 m²). So the
flat-auction stream is **non-zero but a minority** amid land/lease auctions.

**Couldn't auto-quantify** flat frequency in-spike: the archive list is
AJAX-paginated, so same-origin fetch returns only the shell (pin the list
endpoint via a network trace at build time, like the Bytom/Zabrze spikes).

**Verdict: VIABLE — the best of the four mid-size cities, but borderline on
flat volume.** Mechanics are good (server-rendered, deep *retained* archive,
text PDFs, results stream) and it's the only one of the four with any real
flat-auction stream. Risk: flats are a minority of auctions, so a flat-filtered
adapter would add a **modest** set (plus history), not a deep one. Recommend
**build only if maximising coverage** (flat-filtered, `lokal mieszkalny` /
`spółdzielcze prawo do lokalu`), or as a **strong build if scope expands to land/
commercial**. Confirm flat volume with a quick archive scan once the list
endpoint is pinned, before committing.

## Rybnik — `bip.zgm.rybnik.pl` ✅ BUILT (v1.11.0, June 2026)

> **Built.** `cities/rybnik/` crawls ZGM's *Ogłoszenie o przetargach* page +
> `&Archive=<id>` batches → each `OGŁOSZENIE <addr>` RTF (Download.ashx?id=N) →
> decoded by `core/rtf-text.js` (pure-JS RTF reader: cp1250 `\'xx`, `\uN`,
> strips raw CR/LF so CRLF-split prices like "180\r\n 000,00" rejoin) → parse
> price / area / date / round (address from the link label). Verified live: 6/6
> current flats fully parsed. No external RTF tool / CI change. Spike notes below.

The heuristic pays off cleanly: Rybnik has **ZGM (Zakład Gospodarki
Mieszkaniowej)** — a dedicated municipal housing manager, exactly like Gliwice —
that **auctions vacated municipal flats** and publishes them on its own
server-rendered BIP.

- **Dedicated flat-sale auction page:** *Sprzedaż lokali mieszkalnych →
  Ogłoszenie o przetargach* (`bip.zgm.rybnik.pl/Default.aspx?Page=214`; an
  `&Archive=<id>` param holds older batches). Full server-rendered HTML.
- **Real, regular flat volume:** 6 current open flat auctions (Zgrzebnioka 7b/6,
  Janke Waltera 5b/2, Kilińskiego 28/17, Rymera 40/35, Cierpioła 6a/3, św. Józefa
  18/47) + 8 in a July 2025 batch — all proper flats *with apartment numbers*
  (keyable), incl. `spółdzielcze własnościowe prawo do lokalu`. Run by
  "Prezydent Miasta Rybnika", `przetarg ustny nieograniczony`.
- **Format catch — RTF:** each announcement is an **RTF attachment** (~200 KB,
  "OGŁOSZENIE <address> [rtf]"). RTF is text (no OCR), but the pipeline has no
  RTF extractor yet — add one (`unrtf --text`, tiny apt package; or `pandoc`,
  already in the sandbox), mirroring `doc-text.js`/`pdf-text.js`, then parse the
  standard ogłoszenie vocabulary (cena wywoławcza / powierzchnia / round / date).
- Bezprzetargowe tenant sales + the procurement "Przetargi" (Zamówienia
  Publiczne, DZP.212.* construction tenders) are separate — skip both.
- Results/sold-price stream: not obvious; treat as active + announcement history
  (like Bytom/Zabrze) unless a "wyniki" page turns up at build time.

**Verdict: BUILD — the best remaining Silesian candidate, Gliwice-class.**
Dedicated ZGM, dedicated flat-auction page, genuine recurring flat volume,
server-rendered + retained archive. One new component (RTF→text extractor),
otherwise mirrors the existing text-extraction adapters. Open items to pin at
build: the `&Archive=` pagination for history, RTF parses cleanly (confirm on a
real file), and whether achieved prices are published anywhere.

## Bielsko-Biała — `bielsko-biala.pl/gielda-nieruchomosci` ✅ viable, cleanest source yet

The housing-manager heuristic *misfires* here in a good way. ZGM Bielsko-Biała
(`zgm.eu` / `bip.zgm.eu`) exists but only does **rentals + procurement**
(remonty pustostanów, zamówienia publiczne) — no flat sales. The flat *sales*
are run by the **city** (Urząd Miejski, Wydział Mienia Gminnego) and published
on a purpose-built, server-rendered **Giełda Nieruchomości**.

- **Source:** `https://bielsko-biala.pl/gielda-nieruchomosci` — a Drupal
  marketplace listing every current municipal sale offer (Domy / Działki /
  **Mieszkania** / Lokale użytkowe / Garaże / …) with filters for category,
  price, area and status. Each item is a node at
  `/nieruchomosc/<slug>`. Per-category **RSS feeds** exist too
  (`/taxonomy/term/15/feed` = Mieszkania).
- **Format — the easiest in the project.** Fully **server-rendered HTML**
  (plain `fetch`, no JS, no PDF/DOC/RTF/OCR). Each detail page carries a clean
  labelled key-value block — *"Najważniejsze informacje"* — with everything the
  model needs:
  - `Adres:` ul. Stanisława Wyspiańskiego 32/9 → street/building/apt key
  - `Cena:` 92 450,00 zł → cena wywoławcza
  - `Rodzaj nieruchomości:` lokal mieszkalny → kind tag (filter to flats)
  - `Data przetargu / rokowań:` 12.06.2026 r. → auction date
  - `Forma przetargu:` **Pierwszy** przetarg pisemny nieograniczony → **round
    handed to us explicitly** (Pierwszy/Drugi/Trzeci → 1/2/3)
  - `Status oferty:` Przetarg ogłoszony / oczekujący na ogłoszenie → active flag
  - `Wysokość wadium`, `Obręb`, `Numer działki` — bonus fields
  - flat **area** ("Powierzchnia użytkowa lokalu wynosi 17,75 m2") is in the
    description prose, regex-able (the structured `Powierzchnia` field is the
    *plot* area — don't use it for flats).
- **Volume — modest but real.** ~24 live offers across all types; currently ~4
  flats (Modrzewskiego 2/5 768 080 zł, 11 Listopada 23/2 399 000 zł & 23/3
  599 000 zł, Wyspiańskiego 32/9 92 450 zł) + lokale użytkowe (Grota-Roweckiego
  4/11B, 11 Listopada 23/12). Largest uncovered Silesian city; steady turnover.
- **Two caveats (both match existing patterns):**
  1. These are **written tenders** (`przetarg pisemny`/oferty), not the oral
     `przetarg ustny` of the ZGM cities — model still fits (cena wywoławcza,
     round, date, wadium).
  2. **No concluded-auction archive** — the giełda only shows current/pending
     offers; sold items drop off. So it's an **active + archived-mode** adapter
     like Sosnowiec/Rybnik (no achieved-price stream). The upside: round is
     explicit in `Forma przetargu`, so re-listings self-report 2./3. przetarg
     without us reconstructing history. Taxonomy tagging is inconsistent
     (Wyspiańskiego wasn't tagged Mieszkania), so **crawl the whole giełda and
     classify by `Rodzaj nieruchomości`**, don't trust the category chips.

**Verdict: BUILD — and it's the lowest-effort adapter in the project.** A new
`cities/bielsko/` that crawls the giełda index, follows each `/nieruchomosc/`
node, and parses the labelled HTML block. No new extractor needed (reuses the
plain-HTML pattern; closest sibling is Bytom's i-BIIP catalog). Open items to
pin at build: confirm there's no pagination beyond one page (≈24 items now),
decide whether to also ingest Lokale użytkowe/Garaże or flats-only, and check
for a Drupal JSON:API (`/jsonapi/node/...`) as an even cleaner feed than HTML.

---

# Wave 3 — rest of the Silesian field (June 2026)

Scoped the remaining backlog in one pass: Częstochowa, Jaworzno, Mysłowice,
Świętochłowice, Siemianowice Śląskie, Piekary Śląskie, Żory, Wodzisław Śląski.
Method as before — find the real flat-*sale* auction source, confirm open
flat-auction volume EARLY, identify the format. Direct page fetches, no headless
browser.

## TL;DR ranking

| City | Source | Format | Open flat auctions? | Call |
|---|---|---|---|---|
| **Bielsko-Biała** | `bielsko-biala.pl/gielda-nieruchomosci` (city Giełda) | structured HTML key-value + RSS | yes (~4 now) | **BUILD #1** (done above) |
| **Mysłowice** | `bip.myslowice.pl` + MZGK | FINN-BIP article HTML | **yes — ~7 now** | **BUILD #2** |
| **Świętochłowice** | `bip.swietochlowice.pl` + MPGL | FINN-BIP article HTML | yes, recurring, w/ rounds | **BUILD #3** |
| **Jaworzno** | `bip.mznk.jaworzno.pl` (MZNK) | FINN-BIP article HTML | yes (batches of ~8) | **BUILD #4** |
| **Częstochowa** | `bip.czestochowa.pl` "Sprzedaż nieruchomości i lokali" | FINN-BIP article HTML | mixed land+lokale; confirm flat share | viable, MED |
| **Żory** | `zbm.zory.pl/przetargi/` + `zbmzory.bip.net.pl` (ZBM) | WordPress + bip.net.pl | "Sprzedaż mieszkań" category exists; low volume | viable, LOW |
| **Siemianowice Śl.** | `bip.msiemianowicesl.finn.pl/bipkod/025` | FINN-BIP | mostly land + spółdzielnia sales | **DROP/defer** |
| **Piekary Śl.** | `bip.piekary.pl` | FINN-BIP | **bezprzetargowe na rzecz najemcy** | **DROP** |
| **Wodzisław Śl.** | `wodzislaw-slaski.pl` / Biuro Gospodarki Lokalowej | — | **bezprzetargowe** (250 flats to tenants) | **DROP** |

**Architectural insight — a FINN-BIP template unlocks several at once.** Most
Silesian municipal BIPs run on the **FINN eUrząd** platform with a common URL
shape (`/bipkod/<code>` category indexes, `/artykul/<id>` or `/Article/get/id,<n>`
article pages) and a consistent announcement vocabulary (`przetarg ustny
nieograniczony`, `cena wywoławcza`, `powierzchnia użytkowa`, `lokal mieszkalny`,
`pierwszy/drugi/trzeci przetarg`). Katowice already taps a FINN BIP. A reusable
`finn-bip` crawl+parse helper would cover Mysłowice, Świętochłowice, Jaworzno,
Częstochowa (and re-home Katowice) with per-city config (base URL + category
code) rather than four bespoke adapters. Build it once at Mysłowice, reuse.

## Mysłowice — `bip.myslowice.pl` + MZGK ✅ BUILD

- **Housing manager:** **MZGK** (Miejski Zarząd Gospodarki Komunalnej,
  `mzgk.myslowice.pl`). Sales run by Prezydent Miasta, announced on the city
  FINN-BIP (`bip.myslowice.pl/artykul/ogloszenie-o-i-przetargu-na-sprzedaz-lokalu-mieszkalnego-...`).
- **Volume — strong:** **~7 current `przetarg ustny nieograniczony` on lokale
  mieszkalne** (Armii Krajowej 6B/47, 16C/24, 4/11; Zielona 8/1; …), dated
  Apr 2026, held in sala 204 UM. Real flats with apartment numbers (keyable).
- **Format:** FINN-BIP article HTML — server-rendered, plain fetch, no PDF/OCR.
  Round is in the title (`I przetarg`), price/area/date in the article body.
- **Verdict: BUILD** — best of the wave after Bielsko; first user of the
  `finn-bip` template.

## Świętochłowice — `bip.swietochlowice.pl` + MPGL ✅ BUILD

- **Housing manager:** **MPGL Świętochłowice Sp. z o.o.** (`mpglswietochlowice.pl`);
  sales by Prezydent Miasta on the city FINN-BIP (`bip.swietochlowice.pl/bipkod/003/010/003`).
- **Volume:** recurring `publiczny przetarg ustny nieograniczony na sprzedaż
  wolnego lokalu mieszkalnego` — multiple live/recent (Średnia 15b/3 →
  drugi przetarg 110 000 zł; Wyzwolenia 51/4 → **drugi & trzeci przetarg**;
  Powstańców Śląskich 17/9 → pierwszy). Explicit rounds = the relisting signal
  the product is built around.
- **Format:** FINN-BIP article HTML. Same template as Mysłowice.
- **Verdict: BUILD** — smaller city but a clean, round-bearing flat stream.

## Jaworzno — `bip.mznk.jaworzno.pl` (MZNK) ✅ BUILD (medium)

- **Housing manager:** **MZNK** (Miejski Zarząd Nieruchomości Komunalnych).
  Public site `mznk.jaworzno.pl` is WordPress/Elementor (news only); the actual
  auction announcements live on its FINN-BIP **`bip.mznk.jaworzno.pl`**
  ("Przetargi i ogłoszenia", `Article/id,103.html`). Sales via Wydział Obrotu
  Nieruchomościami UM, `przetarg ustny nieograniczony na sprzedaż gminnego
  mieszkania`.
- **Volume:** sold in **batches (~8 flats at a time)**; active in 2026
  ("Ostatni dzwonek na zgłoszenie do przetargu", Feb 2026). Lumpy but real.
- **Format:** FINN-BIP article HTML (template-compatible). Crawl the BIP list,
  not the WordPress news.
- **Verdict: BUILD** — fits the template; pin the exact BIP category at build.

## Częstochowa — `bip.czestochowa.pl` ⚠️ viable, confirm flat share

- **Source:** city FINN-BIP **"Sprzedaż nieruchomości i lokali"**
  (`bip.czestochowa.pl/artykuly/71547`) + "Tablica ogłoszeń"; sales by Prezydent
  Miasta. (There is a **ZGM TBS**, `zgmtbs.bip.czestochowa.pl`, but it's
  rentals + renovation tenders — not sales.)
- **Caveat:** the live announcements skew toward **land/działki and whole
  buildings** (Szczytowa 40/42, Piłsudskiego 3) — flat (`lokal mieszkalny`)
  volume is unconfirmed and may be thin despite the city's size. Confirm the
  flat share before committing.
- **Format:** FINN-BIP article HTML (template-compatible).
- **Verdict: VIABLE (medium)** — build via the template only if a flat-volume
  check at build time clears the Tychy bar.

## Żory — `zbm.zory.pl` (ZBM) ⚠️ viable, low volume + domain caveat

- **Housing manager:** **ZBM** (Zarząd Budynków Miejskich). Site has a
  **"Sprzedaż mieszkań"** category and a `/przetargi/` page; formal BIP at
  **`zbmzory.bip.net.pl`** (a *bip.net.pl* platform, not FINN).
- **⚠️ Domain hijack:** the old **`zbmzory.pl` is no longer the ZBM** — it now
  redirects to a casino-spam site (`foro-go.com`). Use **`zbm.zory.pl`** /
  `zbmzory.bip.net.pl` only. Do not crawl `zbmzory.pl`.
- **Volume:** flat sales exist but appear infrequent (most ZBM activity is
  rentals/management). Low priority.
- **Verdict: VIABLE (low)** — revisit after the FINN-BIP cities; different BIP
  platform (bip.net.pl) means a small separate crawler.

## Drops

- **Siemianowice Śląskie** (`bip.msiemianowicesl.finn.pl/bipkod/025`) — municipal
  activity is mostly **land** (tereny pod zabudowę jednorodzinną); the flat
  tenders that surface are largely **spółdzielnia** (cooperative) sales, not
  gmina. Thin municipal flat volume → **drop/defer**.
- **Piekary Śląskie** (`bip.piekary.pl`) — lokale sold **bezprzetargowo na rzecz
  najemcy** (tenant first-refusal); open auctions negligible → **drop**.
- **Wodzisław Śląski** — adopted a program to sell ~250 flats over 4 years but
  **bezprzetargowo to sitting tenants** (uchwała o zasadach bezprzetargowej
  sprzedaży). No open-auction stream → **drop** (same trap as Tychy/Dąbrowa).

## Out of region (unchanged)

Kraków and Warszawa remain demand-gated and out-of-Śląsk; Warszawa is ~18
district BIPs. Only if the product expands beyond Silesia.
