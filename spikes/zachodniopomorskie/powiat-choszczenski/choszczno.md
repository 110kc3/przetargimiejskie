# Spike — Choszczno (Zachodniopomorskie · powiat choszczeński)
> **Status:** spike LIVE — 2026-07-06. VERDICT: BUILD (Low effort, needsRender: false, low volume).

## TL;DR
Gmina Choszczno does sell **lokale mieszkalne** via *ustny przetarg nieograniczony* — confirmed from BIP search snippets (ul. Wolności 58 lokal nr 2, Piasecznik lokal nr 3, ul. Rycerska 2/4 rounds I–III). Volume is LOW (small gmina, ~15 000 residents; 1–3 flat auctions/year, often recycled through multiple rounds). The BIP at `bip.choszczno.pl` times out on direct HTTP fetch — live verification of page structure and any results/achieved-price board is still needed before committing to an adapter.

## 1. Sells municipal property at auction?

YES — confirmed. Evidence from BIP search snippets:

- **ul. Wolności 58, lokal nr 2** (38.12 m²): II przetarg ustny nieograniczony (2018-05-11); cena wywoławcza reduced from 57 000 zł → 30 000 zł for round II after round I on 2018-03-29 found no buyer.
- **Piasecznik, bud. nr 83, lokal nr 3** (99.60 m²): przetarg ustny nieograniczony; udział 39/100 części w częściach wspólnych.
- **ul. Rycerska 2/4, Choszczno**: rounds I, II, III ustny nieograniczony visible in BIP index (2024-11 through 2025-03) — most recent activity, suggesting still-active flat sales programme.
- Also appears on listaprzetargow.pl aggregator under "Mieszkania, Choszczno, zachodniopomorskie".

Flat auctions are run by the Burmistrz Choszczna per art. 37 ugn. Sales also occur bezprzetargowo (tenant buy-out path), but the open-auction channel is confirmed active.

## 2. Where published? (hosts + boards, URLs)

| Board | URL | Notes |
|---|---|---|
| BIP announcement index | `https://bip.choszczno.pl/dokumenty/8021` | Returns empty on direct fetch (timeout/block) |
| BIP przetargi section | `https://bip.choszczno.pl/artykul/przetargi-14` | Also times out |
| BIP przetargi (alt slug) | `https://bip.choszczno.pl/dokumenty/10427` | Times out |
| Individual announcements | `https://bip.choszczno.pl/artykul/burmistrz-choszczna-oglasza-*` | Confirmed by Google snippets; content loads in browser |
| Wykaz nieruchomości | `https://bip.choszczno.pl/dokumenty/2782` | Times out |
| Official city site | `https://choszczno.pl/` | Cross-posts some announcements |

**Results/achieved-price board**: NOT found as a dedicated section. No `informacja o wyniku przetargu` page indexed on bip.choszczno.pl. Results may be embedded in individual auction articles (post-auction update) or posted as separate articles without a structured listing — requires live inspection.

## 3. Format + rendering

- **Platform**: Custom BIP CMS at `bip.choszczno.pl` (not eSotysWeb, not Sputnik — appears to be a custom or less-common system based on URL slug style `/artykul/` and `/dokumenty/`).
- **Content format**: HTML articles — auction text is inline HTML paragraphs (confirmed from listaprzetargow.pl which scraped and displayed full text).
- **Direct fetch**: FAILS — all `bip.choszczno.pl` URLs return empty body on `web_fetch`. This is the primary blocker; either rate-limiting, bot detection, or slow server.
- **Chrome MCP**: Will likely work (pages render fine in browser per listaprzetargow.pl having scraped them). No SPA, no login wall observed.
- **PDF**: No evidence of PDF announcements; text appears inline in HTML.
- **OCR**: Not required.

## 4. Volume + achieved-price stream

- **Flat auction volume**: LOW — estimated 1–3 per year based on visible rounds. The Rycerska 2/4 property went through at least 3 auction rounds (I → Nov 2024, II → Jan 2025, III → Mar 2025) without selling, suggesting thin demand and small pipeline.
- **Achieved prices**: No dedicated results board found. Prices will need to be scraped from per-auction articles if the gmina posts post-auction updates in the same article or as a follow-up article. This is unconfirmed — NEEDS-LIVE-VERIFY.
- **Aggregator signal**: listaprzetargow.pl indexes Choszczno flats; adradar.pl lists the gmina with 34 pages of historical entries (mixed types), confirming the BIP is crawlable in principle.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog**: Similar to other small Zachodniopomorskie gminy (e.g., Drawsko Pomorskie pattern) — BIP HTML scrape, low volume, no structured results feed.

**Blockers**:
1. `bip.choszczno.pl` times out on direct HTTP fetch — need to confirm Chrome MCP can reach it and identify the correct article list URL for przetargi nieruchomości.
2. Results/achieved-price board: no confirmed URL. Must find where post-auction notices are published (same article? separate article series? nowhere?).
3. Low volume (1–3 flats/year) means ROI is low — worth combining with other powiat-choszczeński gminy if building a regional adapter.

**Effort**: Medium — HTML scraping is straightforward once fetch blocker is resolved, but the results stream is unconfirmed and volume is low.

**Verdict**: ~~NEEDS-LIVE-VERIFY~~ → **BUILD** — resolved live 2026-07-06, see below.

## Re-verify 2026-07-06 (LIVE)

All three blockers resolved with live evidence; verdict flips to **BUILD**.

### Access: NOT bot-blocked, NOT JS-rendered — the desk "empty body" was an unfollowed 301

- Every `/dokumenty/<id>` URL returns **301 → `/artykul/<slug>`** with an empty redirect body; the desk spike read that empty body as a block. Following redirects, plain `curl` (even default curl UA, no cookies) gets **HTTP 200 with full server-rendered HTML** (~850 KB/page, huge inline CSS): `/dokumenty/8021` → `/artykul/przetargi-13` (2012 board), `/dokumenty/1039415660` → `/artykul/przetargi-4` (2021 board), `/dokumenty/12932` → the Wyzwolenia 3/1 flat article.
- Caveat: the WebFetch cloud tool gets **403** (its infra IP/UA is blocked), but direct requests from a normal client succeed with any UA tested. Adapter needs only `follow_redirects` + a browser-ish UA to be safe. **needsRender: false** — no Chrome/headless required.

### Board structure (announcements): year tree, one przetargi table per year

`/artykul/ogloszenia` → `/artykul/ogloszenia-<YYYY>-r` (2003–2026) → sub-board "Przetargi" (arbitrary slug — resolve it from the year page's table each run):
- 2026: `/artykul/przetargi-2008` (9 rows as of 2026-07)
- 2025: `/artykul/przetargi-2007` (9 rows)
- 2024: `/artykul/przetargi-14` (20 rows)

Rows are `<tbody><tr><td><a href="/artykul/…">TITLE</td><td>YYYY-MM-DD hh:mm:ss</td>` (note: `</a>` is often missing — parse title up to `</td>`). Article pages are server-rendered HTML with title, attachment list, and full BIP metryka (data wytworzenia/publikacji, osoby). Announcement body is a **PDF attachment** under `/pliki/choszczno/zalaczniki/<id>/…pdf` — scanned with an OCR text layer; `pdftotext` extracts usable text (prices clean, e.g. "230.000,00 zl"; diacritics degraded, e.g. "pizy"/"poloony"). Correction to the desk note: content is NOT inline HTML — recent titles are generic ("…sprzedaż nieruchomości … - Choszczno, ul. X"), so flat-vs-land classification needs the PDF text, not just the title.

### Results board: FOUND — "Informacja o wyborze nabywcy" PDF attached to the same article

No separate results section exists, but achieved prices ARE published: the Rycerska 2/4 V-przetarg article (published 2026-02-04, `/artykul/burmistrz-choszczna-oglasza-piaty-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-stano`) gained a second attachment `informacja-o-wyborze-nabywcy.pdf` on 2026-03-13: auction held 2026-03-06, cena wywoławcza 230 000 zł, wadium 46 000 zł, **achieved price 236 900 zł**, named buyers (znak WNA.6840.17.13.2024.NSz). Achieved-price stream = re-poll recent auction articles for a result attachment (~1 week post-auction). Older articles (e.g. Wyzwolenia 3/1, 2015) lack result attachments — history is thin, but current practice publishes results.

### Flat volume 2024–2026 (live-counted from year boards)

- 2024: 20 auction announcements, flat thread = Rycerska 2/4 (round II 2024-11-14; round I earlier in 2024).
- 2025: 9 announcements, 2 flat rounds — Rycerska 2/4 III (2025-01-31) and IV (2025-04-11); rest is land (obr. Stary Klukom, Korytowo, działki).
- 2026 (to July): 9 announcements, 1 flat round — Rycerska 2/4 V (2026-02-04), **sold 2026-03-06 for 236 900 zł** (lokal nr 4, 53.73 m², 3 rooms, 1st floor — "lokal mieszkalny" confirmed in the announcement PDF text).

Real volume = **~1 distinct flat per 1–2 years** (one flat generated 5 announcements over 18 months); prior flats were 2018 (Wolności 58/2) and 2015 (Wyzwolenia 3/1). Lower than the desk 1–3/yr estimate.

### Verdict: BUILD (Low effort, needsRender: false)

Flat auctions, announcement board, and achieved-price stream all confirmed live; access is plain HTTP for a normal client — the only trap is following the 301s (and WebFetch-style cloud fetchers being 403'd). Adapter = year-tree HTML index + PDF-attachment text extraction; closest analog: other small-gmina BIP year-board scrapers. Accept the volume caveat (very low, ~1 flat/1–2 yrs) — cheap to run, worth bundling with other powiat-choszczeński gminy.
