# Spike — Gryfice (Zachodniopomorskie · powiat gryficki)
> **Status:** spike DESK — 2026-06-30. VERDICT: NEEDS-LIVE-VERIFY (Medium effort).

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
