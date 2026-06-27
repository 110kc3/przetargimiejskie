# Spike — Zielona Góra (Lubuskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low–Medium adapter effort, but very low flat-auction volume = weak signal stream).

## TL;DR

Zielona Góra does run *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* — at least one confirmed open-auction flat in 2025 (przetarg 19/2025, ul. Grottgera 11, 175 m², cena wywoławcza 190,000 zł, result PDF published) and at least one historically (28/2016). However, the dominant mode for municipal flats is *bezprzetargowo* (pre-emption for sitting tenants), published in a separate wykaz-nieruchomości section. The auction board is overwhelmingly land plots (~25–27 out of ~28 annual auctions in 2025). The BIP is a clean server-rendered HTML platform; result-price PDFs are attached to each listing. Adapter is technically straightforward, but estimated flat-auction cadence is 1–3/year — too thin for a useful product stream.

## 1. Sells municipal property at auction?

**Yes — but open residential flat auctions are rare.** The Prezydent Miasta Zielona Góra publishes property auctions at `bip.zielonagora.pl` under Nieruchomości → Przetargi. Two sale channels coexist:

**Channel A — Przetarg (open auction, our target):**
- *Przetarg ustny nieograniczony* confirmed for flats:
  - Przetarg **19/2025**: lokal mieszkalny nr 1, ul. Artura Grottgera 11, 175 m², cena wywoławcza 190,000 zł; held 2025-05-06; "Informacja o wyniku przetargu (PDF, 38.1 KiB)" published 2025-05-14. LIVE-VERIFIED.
  - Przetarg **28/2016**: lokal mieszkalny (confirmed by URL in search index). DESK.
  - Lokal mieszkalny nr 3, ul. Krakusa 12 — referenced in wykaz-nieruchomości as destined for przetarg ustny nieograniczony. DESK.
- *Przetarg pisemny nieograniczony* — used for large commercial land (multimillion PLN plots). Not relevant for flats.

**Channel B — Bezprzetargowy (pre-emption, NOT our target):**
- Dominant channel for residential flats going to sitting tenants at fixed valuation.
- Published at `/71/Sprzedaz_nieruchomosci/` and specifically `/71/7984/Wykaz_nieruchomosci_przeznaczonych_do_sprzedazy_w_drodze_bezprzetargowej_-_lokale_mieszkalne/`.
- No competitive pricing — not useful for a price-discovery product.

**Volume (2025):** ~28 numbered property auctions total. Live inspection of the 20 most-recent resolved auctions (covering 2025-09 through 2026-06-24) showed: all land plots (działki niezabudowane/zabudowane) plus 1 garage. One flat auction confirmed for full 2025 (19/2025). Estimated open flat-auction rate: **1–3 per year**.

**Municipal housing manager:** ZGM (Zakład Gospodarki Mieszkaniowej), `gm.zgora.pl` — manages the residential stock but does NOT publish its own auction board. All przetargi originate from Urząd Miasta, Wydział Rozwoju Miasta, Biuro Obrotu Nieruchomościami, ul. Podgórna 22. (Legacy entity ZGKiM reorganized; old BIP at `bipold.zgkim.zgora.pl`.)

## 2. Where published? (hosts + boards, with URLs)

**Primary host:** `https://bip.zielonagora.pl` (no hyphen — `bip.zielona-gora.pl` is NOT the live domain).

| Board | URL | Notes |
|---|---|---|
| Przetargi aktualne | `https://bip.zielonagora.pl/przetargi/366/status/` | All live auctions |
| Przetargi rozstrzygnięte | `https://bip.zielonagora.pl/przetargi/366/status/1/` | Completed + result status |
| Nieruchomości oferowane do zbycia | `https://bip.zielonagora.pl/367/Nieruchomosci_oferowane_do_zbycia/` | Summary index |
| Sprzedaż nieruchomości (wykazy) | `https://bip.zielonagora.pl/71/Sprzedaz_nieruchomosci/` | Includes bezprzetargowe flats |
| Bezprzetargowe lokale mieszkalne | `https://bip.zielonagora.pl/71/7984/Wykaz_nieruchomosci_przeznaczonych_do_sprzedazy_w_drodze_bezprzetargowej_-_lokale_mieszkalne/` | Pre-emption sales only |
| Example flat auction (19/2025) | `https://bip.zielonagora.pl/przetargi/0/880/Przetarg_o_numerze_3A_19_2F2025_2C_ogloszony_przez_3A_Prezydent_Miasta_Zielona_Gora/` | Grottgera 11, LIVE-VERIFIED |

**Result notices (achieved price):** Published as PDFs attached to the same individual przetarg listing page — confirmed on 19/2025: "Informacja o wyniku przetargu (PDF, 38.1 KiB)" uploaded ~8 days after the auction. No separate "wyniki" board.

**No secondary publishers.** ZGM does not operate its own przetarg board. The Urząd Miasta BIP is the sole source for open flat auctions.

## 3. Format + rendering

- **Platform:** Standard Polish BIP (server-rendered HTML). LIVE-VERIFIED via Chrome MCP `get_page_text` — page content extracted cleanly as structured text, no JS rendering required.
- **Listing board:** HTML table — columns: Lp, Data ogłoszenia, Data i godzina przetargu, Dotyczy (free-text description), Cena wywoławcza, Wynik, Załączniki.
- **Individual listing page:** Key-value HTML block (przetarg nr, ogłaszający, rodzaj, dotyczy, data przetargu, miejsce, KW, cena wywoławcza, wadium, informacje dodatkowe) + PDF attachment list with file sizes and upload timestamps.
- **Attachments:** Born-digital PDFs (ogłoszenie ~80–150 KiB; mapa terenu ~300–650 KiB; wynik ~38 KiB). Standard Polish auction-notice layout — text-extractable, no OCR needed.
- **TLS/auth/bots:** HTTPS, valid cert. No auth, no CAPTCHA, no bot-blocking observed.
- **Filtering:** UI filter controls (7/14/30 days, all entries; by rodzaj: Sprzedaż nieruchomości / Dzierżawa). Flat detection: grep "lokal mieszkalny" in "Dotyczy" field.
- **Pagination:** `/strona/N/` URL pattern does NOT work (redirects to homepage). Use "Wszystkie wpisy" + date-range filter or re-scrape entire `/status/1/` page.
- **URL pattern for individual listings:** `/przetargi/0/{ID}/Przetarg_o_numerze_3A_{NR}_2F{YEAR}_2C_ogloszony_przez_3A_Prezydent_Miasta_Zielona_Gora/`

## 4. Volume + achieved-price stream

| Metric | Value | Confidence |
|---|---|---|
| Total property auctions / year | ~25–30 | LIVE-VERIFIED (28 numbered in 2025) |
| Open flat auctions / year | 1–3 | DESK (1 confirmed 2025, 1 in 2016, gap in between) |
| Land / commercial auctions / year | ~25–28 | LIVE-VERIFIED |
| Bezprzetargowe flat sales / year | Unknown, likely >10 | DESK |
| Achieved-price PDF published | Yes, per listing | LIVE-VERIFIED (19/2025) |
| Achieved price in structured HTML | No — PDF only | LIVE-VERIFIED |
| Lag: auction date → result PDF | ~8 days | LIVE-VERIFIED (19/2025) |

**Signal thinness is the core issue.** At 1–3 flat auctions/year, the city would contribute fewer than one listing per quarter. Compare: Gliwice (ZGM Gliwice) and Kraków (both via dedicated housing-manager boards) run 20–50+ flat auctions/year — the gap is an order of magnitude.

## 5. Adapter effort + verdict

**Closest analog:** Bytom — land-heavy BIP board, occasional flat auctions, no dedicated housing-manager publisher. Bytom is marginal in the portfolio for the same reason.

**Technical effort: Low–Medium.**
- Single BIP, clean server-rendered HTML, no auth, no JS.
- Scraper: HTTP GET `/przetargi/366/status/` + `/status/1/`, parse HTML table, filter `"lokal mieszkalny"` in Dotyczy.
- PDF fetch: trivial — URL from attachment link on listing page.
- PDF text extraction: born-digital, standard pdfplumber/pdfminer — no OCR.
- Achieved-price parsing: from "Informacja o wyniku przetargu" PDF — standard Polish format.
- Pagination workaround: "Wszystkie wpisy" mode or date-range iteration.

**Blockers:** None technical. Blocker is product viability.

**Risks:**
- Flat auction frequency is sporadic — possibly 0 in some years (long gap visible between 28/2016 and 19/2025 in search index, though intermediate auctions may exist and were not indexed).
- Bezprzetargowe sales dominate the flat pipeline but carry no competitive-price signal.
- Pagination `/strona/N/` is broken — archive traversal requires workaround.
- ZGM (`gm.zgora.pl`) does not publish its own przetarg board; no secondary source.

**VERDICT: NO-BUILD**

The BIP is technically clean and an adapter would be Low–Medium effort to write. The decision is product-side: estimated 1–3 open flat auctions per year is below the minimum viable volume for meaningful market-intelligence output. The city routes most flat disposals bezprzetargowo. Build only if the product expands to (a) include land auctions, (b) cover bezprzetargowe wykaz listings with a different value framing, or (c) bundles Zielona Góra with Gorzów Wielkopolski (Lubuskie pair) to reach combined viable volume — both share this BIP platform architecture.
