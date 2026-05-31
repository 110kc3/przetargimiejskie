# Scope — Bytom `.doc` announcement parser (recover past-auction data)

> **Status: IMPLEMENTED (pipeline-only, no extension bump).** Shipped:
> `core/doc-text.js` (catdoc + `doc-text-cache/`), `cities/bytom/parse.js`
> (`parseAnnouncement` + helpers), `cities/bytom/crawl.js` (`enrichActive`,
> `attachmentUrlFromDetail`, filter moved post-enrich), `index.js` export,
> `catdoc` added to `refresh.yml`, tests in `tests/parse-bytom.test.js`.
> Parser logic validated offline; **live `.doc` fetch + catdoc conversion
> validate on the first real CI refresh** (sandbox can't reach bytom.pl).

## Problem

Bytom's archive is empty. The 10 past Bytom auctions reach us from the BIP sales
list (they have a `detail_url` → `…/idn:N` per-property page) but they no longer
appear in the i-BIIP catalog, which is our only source of price / area /
auction-date. So they arrive with `auction_date = area_m2 = starting_price_pln =
null`, get dropped by the data-less filter in `crawlActive`, and never reach
`properties.json` — and even if kept, a null date can't be classified
`archived`. The data we need exists **only inside each auction's attached
`.doc` announcement** (legacy Word binary), which the pipeline does not read.

Goal: for any active/past Bytom listing the catalog can't enrich, pull its
`.doc`, extract price + area + auction date + round, fill the listing. Past-dated
ones then classify as `archived` and populate the Bytom archive.

## Approach (fits existing architecture)

Reuse the existing `enrichActive(active)` hook — `refresh.js:88` already calls
`city.enrichActive(active)` after `crawlActive()` if the adapter exports it. No
loop changes needed. Bytom currently has no `enrichActive`; add one.

Flow per listing that's missing price/area/date:
1. Fetch its `/idn:N` detail page (`getText`, browser UA — same gate as the list).
2. Extract the `.doc` attachment URL from that page (regex on `href="….doc"`,
   same shape the catalog parser already uses).
3. Download the `.doc` bytes (`getBytes`, browser UA) and convert to text.
4. Parse the text for `starting_price_pln`, `area_m2`, `auction_date`, `round`.
5. Fill the listing's null fields (catalog still wins where it has a value).

Then move the data-less filter to run **after** enrichment so recovered rows
survive. Past-dated recovered rows become `archived` via the existing
`build-properties` classification — no change there.

### `.doc` → text: the one real decision

`.doc` is legacy Word binary (NOT `.docx`). Tooling check on this machine:
`pandoc` **cannot** read legacy `.doc`; `libreoffice/soffice` can but is heavy
(~hundreds of MB) and slow to `apt-get` install on every CI run; `antiword` /
`catdoc` are **not installed** but are tiny, apt-available, and purpose-built for
exactly this.

**Recommendation: `catdoc`** (fallback `antiword`). Add it to the workflow's
existing install step:

```yaml
# .github/workflows/refresh.yml  (line ~42)
sudo apt-get install -y -qq poppler-utils tesseract-ocr tesseract-ocr-pol catdoc
```

Conversion mirrors `pdf-text.js`: write bytes to a tmp file, `execFileSync('catdoc',
['-a', tmpDoc])`, capture stdout. (`-a` = ASCII/dumb-quotes; we then normalise.)

### Caching

Add `pipeline/doc-text-cache/` (committed, same convention as `pdf-text-cache/`),
keyed by `urlCacheKey(docUrl)`. This doubles as the data-retention guarantee: once
a `.doc` is converted and committed, the parsed text survives even if Bytom later
removes the announcement. New module `pipeline/src/core/doc-text.js` mirroring
`pdf-text.js` (`docText(url, {userAgent})`).

### Parsing

New `parse.js` helpers in the Bytom adapter (reuse Zabrze's regex playbook — same
Polish auction vocabulary, "cena wywoławcza", "powierzchnia … m²", "przetarg
odbędzie się w dniu DD.MM.YYYY", ordinal → round). Lower risk than the Zabrze
PDFs because `catdoc` output isn't column-laid-out like `pdftotext -layout`, so
no detached-token gymnastics — but the cellar/plot-exclusion logic from Zabrze
should be carried over for area.

## Files touched

| File | Change | Bump? |
|------|--------|-------|
| `.github/workflows/refresh.yml` | add `catdoc` to apt install | no (pipeline) |
| `pipeline/src/core/doc-text.js` | NEW — `docText()` + `doc-text-cache/` | no |
| `pipeline/src/cities/bytom/crawl.js` | add `enrichActive`; move filter after enrich | no |
| `pipeline/src/cities/bytom/parse.js` | NEW/extend — price/area/date/round from text | no |
| `pipeline/src/cities/bytom/index.js` | export `enrichActive` | no |
| `tests/parse-bytom.test.js` | add `.doc`-text parsing cases | no |
| `pipeline/doc-text-cache/` | committed cache (retention) | no |

All changes are pipeline-only → **no `extension/` version bump.** The extension
already renders `archived` rows correctly (verified: `archive.js:157`), so once
the data lands, Bytom's archive populates with no client change.

## Validation

The CI sandbox **cannot reach `bytom.pl` (DNS blocked)** — same constraint as the
whole Bytom adapter. So:
- Unit-test the parser against committed sample `.doc`-text fixtures (offline).
- Validate the live fetch + `.doc` link extraction on the **first real refresh**
  (GitHub Actions runner has outbound network), then read back `data/bytom/
  properties.json` for `archived` rows.

Per CLAUDE.md testing rules: targeted test file only (`tests/parse-bytom.test.js`),
quiet runner, failures-only output.

## Risks / unknowns (flagged, not assumed)

1. **`.doc` link is on the `/idn:N` page** — strongly implied (v1 used exactly
   that download link), but not re-confirmable from the sandbox. Verify on first
   real refresh; if the link instead lives one hop deeper, add a follow.
2. **`catdoc` text quality** — Polish diacritics + table layout. If `catdoc`
   garbles, fall back to `antiword`, then `libreoffice --headless --convert-to txt`
   as a last resort (accepting the CI weight).
3. **Some past announcements may be `.pdf` not `.doc`** — if so, route those
   through the existing `pdfText()` instead. Detect by extension at enrich time.
4. **Coverage** — recovers only auctions still linked from the BIP list (the ~10
   we currently drop). Older auctions already gone from the list stay
   unrecoverable; the `doc-text-cache` prevents *future* loss going forward.

## Effort

~Half a day: `doc-text.js` + cache (~1h, clone of `pdf-text.js`), Bytom
`enrichActive` + `.doc` link extraction (~1h), parser + tests against fixtures
(~2h), workflow one-liner + first-refresh validation (~1h). Single PR, PATCH-level
(pipeline-only, no bump).
