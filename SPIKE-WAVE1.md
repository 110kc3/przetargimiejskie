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
