# Spike — Gryfice (Zachodniopomorskie · powiat gryficki)
> **Status:** spike LIVE — re-verified 2026-07-06. VERDICT: NO-BUILD (no open flat-auction stream; flats go bezprzetargowo to tenants).

## TL;DR

Gmina Gryfice does sell municipal **lokale mieszkalne** at *ustny przetarg nieograniczony* — confirmed by official announcements on gryfice.eu and BIP. Volume is low (est. 1–3 flats per round, ~3–4 rounds/year). A bezprzetargowy track for sitting tenants also exists in parallel but does not preclude open auctions. The BIP (`bip.gminagryfice.pl`) consistently blocked web_fetch (timeouts on every attempt); Chrome MCP or a headless browser will be required to scrape reliably. Achieved-price results are published on the same BIP. NEEDS-LIVE-VERIFY on the fetch strategy before committing to an adapter.

## 1. Sells municipal property at auction?

**YES — lokale mieszkalne go to ustny przetarg nieograniczony.**

- gryfice.eu news: *"Burmistrz Gminy Gryfice ogłasza: Lokale mieszkalne i niemieszkalne na sprzedaż"* — explicit residential-unit sale announcements.
- gryfice.eu: *"Burmistrz Gryfic ogłasza przetargi ustne nieograniczone na sprzedaż nieruchomości"* — open oral auctions confirmed.
- BIP index confirms a batch for 22 May 2024 that included *"udziału w wysokości 447/1000 w budynku mieszkalnym przy ul. Armii Krajowej 11"* alongside land plots.
- Nov 2025 batch: 2 non-residential at przetarg ograniczony + 1 residential *bezprzetargowo* to tenant — shows mixed-mode. Not every flat goes to open auction; sitting-tenant preference applies first.
- Bottom line: open flat auctions do occur regularly, coexisting with the bezprzetargowy tenant track.

## 2. Where published? (hosts + boards, URLs)

| Board | URL | Notes |
|---|---|---|
| BIP announcements index | `https://bip.gminagryfice.pl/artykul/ogloszenia-burmistrza-gryfic-o-przetargach-na-zbycie-nieruchomosci` | Primary listing of all przetarg announcements |
| BIP nieruchomości menu | `https://bip.gminagryfice.pl/strony/menu/42.dhtml` | Section landing for property sales |
| BIP wyniki przetargów | `https://bip.gminagryfice.pl/strony/11870.dhtml` | Achieved-price results board (confirmed in search index) |
| BIP article pages | `/artykul/...` slug pattern | Per-round announcement detail pages |
| BIP legacy pages | `/strony/NNN.dhtml` | Older announcements use numeric ID pattern |
| gryfice.eu news | `https://gryfice.eu/aktualnosci/` | Municipality news mirroring auction notices |
| PDF mirror | `https://gryfice24.online/wp-content/uploads/YYYY/MM/*.pdf` | Third-party local news uploads official PDF ogłoszenia |
| Powiat przetargi | `https://www.gryfice.pl/przetargi.html` | Powiat (not gmina) — separate entity, Skarb Państwa land only |

Achieved prices: published as "Informacja Burmistrza Gryfic o wynikach przetargów" on BIP `/strony/11870.dhtml` (and equivalent per-round pages). Includes final prices and buyer info.

## 3. Format + rendering

- **BIP pages**: HTML served by the SIDAS/eSesja BIP platform used across many Zachodniopomorskie gminy. Renders as standard HTML with property details embedded in article body text (not a structured table/JSON).
- **PDF attachments**: Official ogłoszenia are also published as text-PDF (not scanned) — confirmed by gryfice24.online PDF upload. OCR not needed.
- **Fetch blocker**: `bip.gminagryfice.pl` consistently returned empty responses to direct `web_fetch` on every attempt (5/5 timeouts). This is a crawl-hostile server (likely Cloudflare or rate-limiting proxy). **Chrome MCP is required** to render and extract content.
- **No SPA/auth**: Content is publicly accessible, no login required, no JavaScript SPA — just slow/blocked for headless HTTP.
- **Pagination**: BIP listing pages are paginated; each auction round gets its own article. Depth is manageable.

## 4. Volume + achieved-price stream

- **Frequency**: ~3–4 auction rounds/year (Jan/Feb, May/Jun, Sep/Oct, Nov batches observed).
- **Flat volume per round**: 1–3 lokale mieszkalne — this is a small gmina (~16k pop.), municipal housing stock is limited.
- **Annual flat auction estimate**: ~4–8 flats/year going to open auction; remaining go bezprzetargowo to tenants.
- **Mixed batches**: Each round bundles land plots + commercial + occasional flats — adapter must filter by `lokal mieszkalny` / `budynek mieszkalny` type.
- **Achieved-price stream**: Confirmed present on BIP. Results page names final bid price per lot. This is the key value for the aggregator.
- **Closest analog**: Similar mixed-batch, low-volume BIP structure to other small Zachodniopomorskie gminy (e.g., Kamień Pomorski pattern).

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog**: Kamień Pomorski / Stargard — small gmina BIP, mixed auction batches, HTML extraction, wyniki on BIP.

**Effort: Medium** — the fetch blocker is the main risk.

| Item | Assessment |
|---|---|
| Announcement discovery | BIP listing page → paginate → filter flat items — straightforward once fetch works |
| Detail extraction | HTML body parsing, semi-structured text — regex/heuristic, moderate effort |
| Results / achieved price | Separate wyniki pages on BIP — same fetch blocker applies |
| Fetch strategy | **BLOCKER**: web_fetch times out consistently. Must use Chrome MCP (`mcp__Claude_in_Chrome__get_page_text` or `navigate` + extract). Adds operational dependency. |
| PDF fallback | Text-PDFs available via gryfice24.online mirrors — usable as fallback but not canonical |
| Volume justification | Low (4–8 flats/year) — marginal ROI, but achieved-price data makes it worthwhile if Chrome MCP is already in stack |
| Deduplication | Flats appear in both gryfice.eu news and BIP — must deduplicate on canonical BIP URL |

**VERDICT: NEEDS-LIVE-VERIFY** — confirm Chrome MCP can successfully render `bip.gminagryfice.pl` pages before committing. If Chrome MCP works → BUILD (Medium effort). If blocked there too → NO-BUILD (insufficient data access).

## Re-verify 2026-07-06

Live re-check via WebFetch + WebSearch (2 fetch attempts on BIP host, per polite-retry rule).

**1. Fetch blocker re-tested — anti-bot, not total.**
- `bip.gminagryfice.pl` now returns **HTTP 403 Forbidden** on both the announcements index (`/artykul/ogloszenia-burmistrza-gryfic-o-przetargach-na-zbycie-nieruchomosci`) and the results page (`/strony/11870.dhtml`) — changed from the 2026-06-30 timeouts, so the SIDAS block is anti-bot/UA-based, not a network outage. Search engines index the BIP fully (article + `/strony/*.dhtml` pages surface in results), so the block is not total; a browser-mode/UA fetch (core/fetch.js browserMode, Zabrze-WAF precedent) or render.js would likely pass.
- **`gryfice.eu` mirror is plain-fetchable** (200, full article HTML) and mirrors every auction announcement — the fetch path is NOT the blocker anymore.

**2. Volume re-checked — the 4–8 flats/yr estimate does NOT hold for *open* auctions.** Concrete 2024–2026 evidence:
- **22 May 2024 batch** (BIP `/artykul/...-41`): land plots (Spacerowa, Wierzbowa, Niepodległości, Nadrzeczna, Rotnowo, Rzęskowo) + **udział 447/1000 w budynku mieszkalnym, Armii Krajowej 11** + lokal użytkowy Niechorska 19A. One residential *building share*, no self-contained flats.
- **25 Nov 2025 batch** (gryfice.eu, pub. 2025-10-24): the **same** land plots + the **same unsold Armii Krajowej 11 share** + the same Niechorska 19A lokal użytkowy — the sole residential item is a re-listed leftover, not new supply.
- **Oct 2025 wykaz** (gryfice.eu "Lokale mieszkalne i niemieszkalne na sprzedaż"): **1 lokal mieszkalny — bezprzetargowo na rzecz najemcy**; 2 lokale niemieszkalne — przetarg *ograniczony*. Flats route to sitting tenants, not open auction.
- **9 Apr 2026 batch** (gryfice.eu, pub. 2026-03-06, full prices): 6 land plots (86k–173k PLN) + Niechorska 19A lokal użytkowy (95k PLN). **Zero residential items** (the AK 11 share no longer listed).
- **Jun 2026 batch**: land only per search index.
- Aggregator check (listaprzetargow.pl, Gryfice mieszkania): **0 municipal flat auctions 2024–2026**; only a 2019 housing-co-op sale.

**3. Conclusion.** Realized open flat-auction volume is ~0–1 residential item/yr, and that one item was a fractional building share re-auctioned across 18 months. Gmina Gryfice's flats are disposed bezprzetargowo to tenants; the open-auction stream is land + commercial. This is exactly the README heuristic's "generic city-BIP property section skewing to land + tenant sales" profile. The desk TL;DR's "4–8 flats/yr to open auction" conflated wykaz/bezprzetargowy items with auction lots.

**VERDICT: NO-BUILD** — no usable open flat-auction stream; volume ≈0 regardless of fetch strategy. Revisit only if a future batch shows self-contained lokale mieszkalne at przetarg ustny nieograniczony (if so: gryfice.eu mirror is plain-fetchable, BIP needs browser-mode fetch; effort would be Low–Medium).
