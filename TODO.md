# TODO

## Pipeline

### Deeper Katowice history (sales archive on katowice.eu, not BIP)

The current Katowice adapter crawls the live BIP board (`bip.katowice.eu/ogloszenia/tablicaogloszen?idt=468`) — that gets roughly the last ~12 months of auctions. The BIP's archive endpoint (`default_arch.aspx?idt=468&archiw=1`) exists but contains zero auction docs (only planning notices). See [SPIKE-WAVE1.md](./SPIKE-WAVE1.md) for the full finding.

The actual multi-year archive of Katowice sale auctions lives on **`katowice.eu`** (the city portal, not the BIP), in two SharePoint lists:

- `katowice.eu/Lists/Nieruchomoci  ogoszenia` — "Przetargi na zbycie nieruchomości" (full announcements archive)
- `katowice.eu/Lists/Wykazy dotyczce wynikw przetargw i inne ogoszenia` — "Wykazy dotyczące wyników przetargów" (full results archive)

Both are SharePoint `allitems.aspx` list views — items load via JavaScript, so plain `fetch()` only returns chrome. To enumerate them the pipeline needs **either**:

1. A non-JS endpoint — probe `katowice.eu/_api/web/lists/getbytitle('...')/items` (OData), the list's RSS/ATOM feed, or `_layouts/15/listfeed.aspx?List={GUID}`. Cheapest if it works.
2. A headless browser (Playwright) added to the pipeline that renders `allitems.aspx`, scrapes the doc-id list, then hands each `dokument.aspx?idr=N` to the existing crawler — the per-doc + PDF code paths can be reused as-is. Heavier dependency but reliable.

Once item IDs are enumerable, the existing `dokument.aspx` fetching, the PDF-attachment extractor, and `parseResultPdf` / `parseAnnouncement` all work without change. The new work is only the *enumeration* layer.

**Estimated payoff:** years of Katowice price history (vs. ~12 months from the live board alone) — the data needed for the product's full price-history value proposition.
