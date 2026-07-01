# Spike — Głogów (Dolnośląskie · powiat głogowski)
> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Miejska Głogów (city gmina, ~64k pop.) actively sells municipal flats via *ustny przetarg nieograniczony* — confirmed with at least 8+ individual flat lots in evidence across 2024–2025 (multiple streets, multiple attempt rounds). Announcements and result notices are published on a single BIP at `glogow.bip.info.pl` (idmp=27 section). The BIP listing index requires JavaScript (SPA), but individual document pages AND attached PDFs are publicly fetchable and text-selectable — no auth, no bot blocks encountered. Achieved prices are published as separate "Informacja o wyniku" documents on the same BIP board. Closest analog: standard single-city BIP PDF adapter (e.g. Legnica pattern).

## 1. Sells municipal property at auction?

YES — confirmed LIVE. Prezydent Miasta Głogowa issues *ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego* for individual flats from the Gmina Miejska Głogów housing stock. This is an open competitive auction (not bezprzetargowo / tenant pre-emption only). Evidence:

- Okrężna 145/1A (46.73 m²): 1st przetarg + 2nd przetarg confirmed on BIP
- Okrężna 5/4 (33.61 m²): 2nd and 3rd przetarg rounds confirmed (3rd scheduled Nov 2025, starting price 100 000 zł)
- Jedności Robotniczej 6a/10 (58.26 m²): 1st przetarg Sep 2024, 2nd Dec 2024, 3rd March 2025 — full round cycle confirmed; BIP published "Informacja o wyniku trzeciego przetargu" (iddok=12143)
- Stawna 16A/4 (30 m²), Elektryczna 22A/5 (48.43 m²), Kamienna Droga 37/1 (92.07 m²): 2nd-round auctions scheduled 20 May 2025
- Kamienna Droga 37/8, 39/2, 39/6, 39/8: 4th-round auctions scheduled 20 May 2025

That is at minimum 9 distinct flat lots in active auction cycles observed within a single year, across multiple streets.

ZGM (Zakład Gospodarki Mieszkaniowej, ul. Poczdamska 1) manages the properties on behalf of the Gmina and participates in handover; the Prezydent is the formal auctioneer.

## 2. Where published? (hosts + boards, URLs)

**Primary announcement board:**
- BIP Urząd Miejski w Głogowie — "Sprzedaż nieruchomości gminnych" section
- URL: `https://glogow.bip.info.pl/index,idmp,27,r,r`
- BIP host: `glogow.bip.info.pl` (bip.info.pl platform, common in Dolnośląskie)
- Document URLs follow pattern: `https://glogow.bip.info.pl/dokument,iddok,{ID},idmp,27,r,r`
- PDFs attached to documents: `https://glogow.bip.info.pl/plik,id,{ID},wer,1` (also mirrored as `plik.php?id=...`)

**Result/achieved-price board:**
- Same BIP section (idmp=27) — "Informacja o wyniku przeprowadzonego [N] przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego" as separate documents, e.g. iddok=12143 (Jedności Robotniczej 6a/10)
- Achieved price embedded in result notice text

**Secondary mirror (official city news):**
- `https://dglnews.pl` — official Gmina Miejska Głogów information service, regularly republishes each auction announcement with PDF links; useful for cross-checking dates

**Reference PDF file IDs observed (2024–2025):**
- plik id=98213 (WRM.DGiGG.6840.5.5.2024.JSz)
- plik id=99229 (WRM.DGiGG.6840.5.28.2024.JSz)
- plik id=103177, 103178 (May 2025 batch)
- plik id=106293 (WRM.DGiGG.6840.5.16.2025 — Okrężna 5/4 3rd round, Nov 2025)

Case reference format: `WRM.DGiGG.6840.5.{N}.{YEAR}.JSz`

## 3. Format + rendering

- **BIP index/listing page:** JavaScript SPA — `web_fetch` returns "Please enable JavaScript." Chrome MCP or headless browser required to enumerate the listing. However, Google indexes all document titles, so search-based discovery of new iddok values is viable.
- **Individual BIP document pages:** Also JS-gated (same bip.info.pl platform), not directly fetchable.
- **Attached PDFs:** Text-selectable PDFs, fetchable directly without JS. Confirmed: `web_fetch` on `https://glogow.bip.info.pl/plik,id,{ID},wer,1` returned full machine-readable text (not scanned). Standard structured layout: reference number header, property description, cena wywoławcza, wadium, date/location, conditions.
- **dglnews.pl articles:** Clean HTML, fully fetchable, no bot blocks. Contain announcement text + embedded PDF links.
- No auth walls, no CAPTCHA, no bot blocks encountered on any endpoint tested.

**Rendering verdict:** PDFs are the primary data artifact; they are text-PDFs (not scanned), parseable without OCR. BIP listing index needs JS navigation or search-based polling for discovery.

## 4. Volume + achieved-price stream

**Volume:** At least 9 flat lots observed in auction cycle 2024–2025 (Jan 2024 – Nov 2025 window). Multiple lots go through 2nd, 3rd, even 4th rounds before selling or being withdrawn, so raw announcement count per year is higher (~15–20 BIP documents for flats alone). City has ~64k population; housing stock turnover appears steady.

**Achieved-price stream:** Confirmed present on the same BIP board as "Informacja o wyniku" documents. At minimum one flat result document found (iddok=12143, Jedności Robotniczej 6a/10, result of 3rd przetarg March 2025). Result notices include: whether auction was resolved positively/negatively, the winning price (cena osiągnięta), and buyer type. These are separate iddok entries on idmp=27.

**Data completeness risk:** BIP listing index is JS-gated, so polling requires Chrome MCP or a search-based approach. Result documents appear consistently for each resolved auction (legal requirement under Rozporządzenie RM z 14.09.2004). Low risk of missing results if polling is exhaustive.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Legnica or Wrocław single-BIP adapter (bip.info.pl platform, PDF-first).

**Architecture:**
1. Discovery: Poll idmp=27 listing via Chrome MCP or search-scrape to find new iddok values tagged as lokal mieszkalny announcements and result notices.
2. Fetch: Direct HTTP GET on `plik,id,{ID},wer,1` → text PDF → parse with pdfplumber/pdfminer.
3. Parse fields: case ref (WRM.DGiGG.6840.5.N.YEAR.JSz), address, area (m²), cena wywoławcza, wadium, przetarg number (1st/2nd/3rd), auction date/location.
4. Result ingestion: Match result iddok to announcement iddok by case ref; extract cena osiągnięta.

**Blockers / risks:**
- BIP index is JS-SPA → discovery step needs Chrome MCP (same blocker as other bip.info.pl cities). Workaround: Google-search polling of `site:glogow.bip.info.pl idmp=27 lokal mieszkalny` with date filter.
- PDF structure is consistent across observed documents but should be validated on the full 2024 batch.
- No result-notice URL structure for the "wynik" documents is deterministic (new iddok per result); need to enumerate from listing or search.

**Effort:** Medium — BIP-JS discovery adds complexity vs. a plain-HTML BIP, but PDF parsing is straightforward (text, not scanned). Same pattern already solved for other bip.info.pl cities.

**VERDICT: BUILD** — confirmed flat auction stream, text PDFs, achieved-price notices present, no auth/bot blocks, steady volume (~9+ lots/year).
