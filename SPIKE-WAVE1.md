# Wave 1 spike — where Polish cities publish municipal property *sales*

> **Status:** done (May 2026). Follow-up to the [EXPANSION.md](./EXPANSION.md) Part 2 correction. Goal: find the real sale-auction data source for the next city, since the housing authorities (MZZL, KZGM) turned out to publish only rentals. Method: direct page fetches + one JS render. No code written.

## TL;DR

- Municipal property **sales** are not published by the housing authorities. They live on the **city BIP**.
- Two city BIPs were spiked: Sosnowiec and Katowice.
- **Katowice is the clear Wave 2 pick.** Its city BIP runs genuine open sale auctions (residential + commercial, with relisting rounds) and publishes results as **PDF attachments** — architecturally near-identical to Gliwice. The existing OCR-paragraph parser is largely reusable.
- **Sosnowiec is deprioritized.** MZZL is rentals-only (confirmed earlier); the city BIP is a JavaScript SPA that plain `fetch()` cannot read at all. No sale-auction stream confirmed.

## Katowice — `bip.katowice.eu` ✅ viable

- **Source:** city BIP, "Tablica ogłoszeń → Dział ogłoszeń urzędu" (`tablicaogloszen/default.aspx?idt=468&menu=679`).
- **Sales confirmed.** The board carries genuine open auctions, e.g. *"Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy ul. Koszalińskiej 36a/5"*, *"… ul. Sokolskiej 54/5"*, *"Drugi przetarg … ul. Sienkiewicza 8/9"*, *"… ul. Wiertniczej 6/26"*, *"… ul. Staromiejskiej 15/8"* — residential flats, plus commercial units and land/buildings.
- **Relisting rounds.** Titles carry "Drugi/Trzeci przetarg" — the same low-interest signal Gliwice's Roman-numeral rounds give.
- **Results stream.** "Informacja o pozytywnych wynikach przetargów przeprowadzonych w dniu DD.MM.YYYY" documents.
- **Format.** Each BIP document is a thin wrapper: a short summary paragraph + a downloadable **PDF** ("Wyniki przetargów DD.MM.YYYY.pdf"). This is exactly the Gliwice pattern — result PDFs.
- **Boilerplate.** "przetarg ustny nieograniczony na sprzedaż lokalu … położonego przy ul. …" — the same Polish grammar Gliwice's `parse-result.js` already anchors on. The OCR-paragraph parser family is reusable with a Katowice-specific vocabulary.
- **Address conventions.** `ul. <street> <bldg>/<apt>` and Roman-numeral commercial units (`Mariackiej 26/V`, `Francuskiej 6` units `II`/`III`) — already handled by `normalize.js`.

**Crawl complexity (the one real difference from Gliwice).** `bip.katowice.eu` is a SharePoint site:
- The **list page** (`tablicaogloszen`) *is* server-rendered and readable with plain `fetch()` — it yields document links + titles (titles already carry address + round).
- The **individual document page** is JavaScript-rendered — plain `fetch()` returns only the page chrome; the PDF link appears only after JS runs.
- So the crawler needs either a headless browser (Playwright) for the document→PDF-link step, or a derivable PDF URL pattern. The OCR/parse steps downstream are unchanged from Gliwice.

**Open questions for the start of Wave 2:** (a) can the PDF link be obtained without running JS; (b) is the result PDF scanned (OCR, like Gliwice) or text-based.

## Sosnowiec — `mzzl.pl` + `bip.um.sosnowiec.pl` ⚠️ deprioritized

- **MZZL:** rentals only — confirmed in the earlier spike. Not a sales source.
- **City BIP `bip.um.sosnowiec.pl`:** a full JavaScript single-page app. Plain `fetch()` of any `Article/...` URL returns an empty shell (`Home | Calculators`) — even listing pages need a headless browser to inspect. A "Przetargi" section exists but its contents and format are unverified.
- **Verdict:** harder to even spike than Katowice, and the existence of a sale-auction stream is unproven. Not a Wave 2 candidate; revisit only after Katowice proves the BIP-scraping pattern.

## Implications for the build

1. **Wave 2 = Katowice**, sourced from the city BIP, reusing the OCR-paragraph parser family (`parse-result.js` → a shared engine + Katowice vocabulary).
2. **New pipeline capability:** crawling a JS-rendered SharePoint BIP. Add a headless browser (Playwright) for the document→PDF-link hop, or find a non-JS path. The list page itself needs no JS. CI can run Playwright.
3. The user's original instinct — "reuse the Tesseract OCR pipeline for Katowice" — was **right**; only the *source* moves from KZGM to the city BIP.
4. **General lesson for later cities:** the spike target is always the **city BIP's property/announcements board**, not the housing authority. BIP platforms vary (Katowice = SharePoint, Sosnowiec = SPA) — each needs its own crawl spike before an adapter.

## Recommendation

Build **Katowice** as the first new city. Drop **Sosnowiec** from the near-term plan.

## Appendix — Katowice result-PDF format (confirmed)

Fetched a real results PDF (`bip.katowice.eu/Lists/Dokumenty/Attachments/151152/Wyniki przetargów 28.04.2026.pdf`):

- **It is a text PDF, not scanned.** Text extracts cleanly — **no OCR, no Polish tesseract pack, none of Gliwice's OCR-slash bugs.** On this axis Katowice is *easier* than Gliwice.
- **PDF URL is derivable:** `/Lists/Dokumenty/Attachments/<idr>/<filename>.pdf`, where `<idr>` is the BIP document id taken from the list page — a SharePoint list attachment, clean URL, no query string.
- **The result is a structured table**, one row per auctioned property: Lp. · auction date · venue · auction type (`ustny nieograniczony`) · property designation · starting price · price achieved · bidders admitted/rejected · buyer name.
- **Property designation** packs address + kind + area, e.g. `ul. Francuska 6/II · lokal niemieszkalny o pow. użytkowej 24,18 m² · dz. nr 206 …`. The address format (`ul. <street> <bldg>/<apt>`, Roman-numeral commercial units) is what `normalize.js` already handles. **Area is in the results PDF itself** — Katowice needs no separate detail-page crawl for area (Gliwice does).
- This sample is "pozytywne wyniki" (sold only). Unsold / relisting history comes from the **auction announcements** ("Drugi/Trzeci przetarg …") whose titles carry the round directly.

**Implication:** Katowice needs a new **text-PDF table parser** — extract with `pdftotext`, parse the linearised table — not the OCR-paragraph parser, and simpler than it. The crawler still must reach the JS-rendered BIP document pages to discover each PDF's filename (the `<idr>` is known from the list page; the filename is not).

### Remaining before the Katowice adapter can be built well

- 2–3 more sample result PDFs across the date range (check format drift), one **announcement** PDF (rounds, starting prices, upcoming auctions), and a negative/no-result document if one exists.
- Confirm how to obtain each PDF's filename without rendering JS — or commit to a headless browser (Playwright) for that hop.

### Update — result-PDF extraction reality (pdftotext)

Downloaded the one available result PDF and ran `pdftotext`:

- `pdftotext -layout` keeps column positions, but each logical row spans ~6 physical lines — the "Oznaczenie nieruchomości" cell is itself multi-line (address / type+area / plot / obręb). Rows must be reassembled by the `Lp.  DD.MM.YYYY` row-start marker.
- `pdftotext` plain (reading order) is worse: it emits column-by-column (all Lp values, then all dates, …) — unusable for row reconstruction.
- So a result parser needs **column-aware row reassembly**, not a simple per-line regex. Tractable, but fiddly.
- **Only one result document is currently on the BIP board** (`idr=151152`, 5 sold properties). Building and drift-testing a robust table parser really wants 2–3 samples; older result docs would have to be located in the BIP archive first.

**Recommendation:** the result-table parser is a focused follow-up, best done once more result documents are available to validate against. Katowice's announcement adapter (rounds + active auctions + prices) already ships real value without it.

## Appendix — Where Katowice keeps *old* auctions (May 2026)

A follow-up spike was triggered by "the live BIP board only shows ~1 result PDF; can we fetch deeper history?"

- **`bip.katowice.eu/ogloszenia/tablicaogloszen/default_arch.aspx?idt=468&archiw=1`** — *this exists* and returns 109 documents spanning **2017–2024**. But every single entry is a planning notice (`ustalenie lokalizacji inwestycji mieszkaniowej`, `obwieszczenie`, `wycofanie wniosku`) — **no auctions at all**. Past sale-auction documents *do not* end up in this archive.
- **The real auction history is on `katowice.eu` (NOT `bip.katowice.eu`)**, in five dedicated SharePoint lists linked from `katowice.eu/dla-mieszkańca/zamieszkaj-w-katowicach/przetargi-na-nieruchomości-miasta`. The two relevant ones for the product:
  - `katowice.eu/Lists/Nieruchomoci  ogoszenia` — "Przetargi na zbycie nieruchomości" (full archive of sale-auction *announcements*).
  - `katowice.eu/Lists/Wykazy dotyczce wynikw przetargw i inne ogoszenia` — "Wykazy dotyczące wyników przetargów" (full archive of *result* wykazy).
- **Catch:** these are SharePoint list views (`allitems.aspx`). Plain `fetch()` returns chrome only; the items load via JavaScript. To enumerate them the pipeline needs either a headless browser (Playwright) **or** a non-JS endpoint (SharePoint REST `/_api/`, ATOM feed, or `_layouts/15/listfeed.aspx?List={GUID}`) — none of which I successfully probed in this spike. The BIP's REST endpoint was locked (returned the homepage); `katowice.eu`'s wasn't tested.

**Implication:** the *current* Katowice adapter is limited to whatever's still on the live BIP board (`tablicaogloszen?idt=468`) — roughly the last ~12 months. Full multi-year history requires a second adapter route that talks to those katowice.eu SharePoint lists.

### Two ways forward

1. **Quick win (no new deps):** raise `MAX_PAGES` in `cities/katowice/crawl.js` to ~25 with a "stop after N consecutive auction-empty pages" heuristic. Captures everything currently on the live board.
2. **Deeper history:** spike `katowice.eu`'s SharePoint lists — try `/_api/`, list RSS, or commit to a headless browser. If reachable, that's how to get years of Katowice price history.

## Appendix — katowice.eu SharePoint lists (May 2026, resolved)

The open question above is now answered: **the SharePoint REST endpoint works anonymously, no JS, no auth, no Playwright.** Both target lists are publicly readable through `/_api/web/lists(guid'…')/items`. Field names are stable. Spaces are encoded in URLs but field names are constant across the API (`Title`, `Tre_x015b__x0107_` for `Treść`, `Data_x0020_publikacji`, `Attachments`).

### The two lists

| List | GUID | Items | Date range | Body shape |
|---|---|---|---|---|
| **Przetargi na zbycie nieruchomości** (announcements) | `45A01FD4-EF73-4E52-8294-C31CE3CEB738` | 60 | 2025-02 → 2026-05 | HTML body in `Treść`, no attachments — all fields inline (cena wywoławcza, wadium, area, address, dates) |
| **Wykazy dotyczące wyników przetargów i inne ogłoszenia** (results) | `272ABCA8-EAFD-4D6A-AFFA-D418AB3630B2` | **295** | **2012-01 → 2026-05** | Thin summary in `Treść` + a PDF link (`/SiteAssets/Lists/Wykazy…/AllItems/Wyniki…pdf`) carrying the actual result table — same shape and same parser as the BIP results |

### Canonical endpoints (confirmed working)

```
# Item count
GET /_api/web/lists(guid'<GUID>')/ItemCount
  → {"d":{"ItemCount":295}}

# Full enumeration, slim payload (Accept: application/json;odata=verbose)
GET /_api/web/lists(guid'<GUID>')/items
    ?$select=Id,Title,Tre_x015b__x0107_,Data_x0020_publikacji,Attachments
    &$orderby=Data_x0020_publikacji asc
    &$top=500

# Single item (when we only need to refresh one record)
GET /_api/web/lists(guid'<GUID>')/items(<id>)

# RSS feed of recent items (server-rendered XML, also works anonymously)
GET /_layouts/15/listfeed.aspx?List=<GUID without braces>
```

`AllItems.aspx` is the *page* SharePoint serves — it does load items client-side from JS, which is what the May-2026 spike was bouncing off. We don't need it: the REST endpoint above is the same data, server-side, in clean JSON, with stable Polish-encoded field names like `Data_x0020_publikacji` (publication date) and `Tre_x015b__x0107_` (body content).

### What this implies for the pipeline

The Katowice adapter now has **two crawl routes that should be merged at the build-properties layer**:

1. **`bip.katowice.eu/ogloszenia/tablicaogloszen`** (the existing `crawl.js`) — keeps catching announcements + results within their ~12-month live window. Already shipped, keep it.
2. **`katowice.eu` SharePoint lists** (new) — pulls deeper history:
   - List 1 (announcements) — backfills any announcement the live board has aged out, plus catches anything published only on the city portal. Body HTML is parseable directly by `parseAnnouncement()` after a minor change (it currently takes the dokument.aspx page HTML; here it takes the `Treść` field — same regexes, different wrapper).
   - List 2 (results) — the **load-bearing route for "years of price history."** The body text mentions the result PDF; the PDF URL is in an `<a href>` inside the body. Each PDF is a "Wyniki przetargów DD.MM.YYYY.pdf" of the exact shape the existing `parseResultPdf()` already handles (text-PDF table via `pdftotext -layout`).

The OCR-cache, address normalizer, the announcement parser, and the result-PDF table parser **are reusable as-is** — only the *enumeration* layer is new.

### Implementation sketch

```
pipeline/src/cities/katowice/
  config.js              (add the two list GUIDs)
  crawl-sharepoint.js    (NEW: fetches /_api/.../items for both lists,
                          decodes Treść body or extracts the PDF href)
  crawl.js               (existing BIP crawler — keep, dedupe at merge)
  parse.js               (existing: parseAnnouncement + parseResultPdf
                          — Treść HTML feeds parseAnnouncement after a
                          tiny adapter; the PDF path is unchanged)
  index.js               (combine both crawls, dedupe by source URL +
                          auction_date+address before parsing)
```

Dedup key candidates: `(auction_date, address.key)` for announcements; `pdf_url` for results. The result PDFs from the BIP and the city portal sometimes share filenames — easy to fold.

### Estimated payoff (vs. earlier estimate)

- **Announcements:** modest boost — currently the BIP board carries the live ~12 months; list 1 adds maybe 6 more months back and any city-portal-only items.
- **Results:** the big win — **14 years of result wykazy (295 items, 2012 → present)**, vs. ~1 result PDF on the BIP today. This is the dataset that makes Katowice rows populate the archive summary tiles and the median-zł/m² stats meaningfully.

### Open follow-ups (intentionally NOT done in this spike)

- Build `crawl-sharepoint.js` and wire it into `index.js`. Estimated effort: small (one fetch loop + body→HTML/PDF dispatcher), but adds a real code path so deferred until you sign off.
- Decide the schema-version question: does adding the SharePoint route bump anything? Probably not — the records it emits have the same shape as the BIP route.
- A small dedup test fixture proving BIP results + SharePoint results merge cleanly when both list the same auction.
