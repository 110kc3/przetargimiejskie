# Spike — Włodawa (Lubelskie · powiat włodawski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (thin open-auction stream; no results; AJAX registry — Medium effort, low yield).

## TL;DR
Gmina Miejska Włodawa (Urząd Miejski we Włodawie, town gmina — **not** the rural Gmina Włodawa) does run open oral flat auctions — confirmed live: *pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 25, ul. Żeromskiego 20, 68,70 m², cena wywoławcza 185 000 zł, termin 14.07.2026*. But the stream is thin and mostly out of scope: the property registry (`umwlodawa.bip.lubelskie.pl`, **Wrota Lubelszczyzny** CMS) holds 394 records over ~2015-2026, of which only ~4 genuine OPEN oral flat *przetargi* (all in 2025) + 1 in 2026; the rest of the "lokal mieszkalny" items are *sprzedaż w trybie **bezprzetargowym*** (tenant sales — out of scope), and the bulk (274) are dzierżawa/najem leases + 94 land sales. **No `wynik przetargu` / achieved-price stream** exists in the registry. The list is a DataTables document registry whose rows are NOT in server HTML — they load via a JSON endpoint (`?id=99&action=list-ajax`, directly fetchable, so no Playwright needed), with notice bodies in attached PDFs. Technically buildable at Medium effort, but the yield (≈1-4 in-scope flat auctions/yr, no results, heavy lease noise) doesn't justify it. Matches the Lubelskie/Wrota-Lubelszczyzny NO-BUILD skew.

## 1. Sells municipal property at auction?
**YES for flats, but sparsely — and mostly bezprzetargowo (out of scope).**
- Confirmed OPEN oral flat auction (in scope): **ul. Żeromskiego 20 m.25**, 68,70 m² (4 rooms, IV floor), *I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego*, cena wywoławcza **185 000 zł**, wadium 10%, termin **14.07.2026** (registry doc id 2329753, ogłoszone 2026-06-08).
- Registry (id=99 "Informacje o wykazach nieruchomości", 394 records ~2015→2026) classification:
  - **dzierżawa / najem: 274** (leases — out of scope)
  - **land sales: 94**
  - **lokal mieszkalny sale/wykaz items: ~19 total across 11 years** — but of these only the genuine open *przetargi na sprzedaż lokalu mieszkalnego* count: **3 in 2025** (2025-05-06, 2025-07-30, 2025-09-16) + **1 in 2026** (Żeromskiego). The majority of "lokal" entries are *"Wykaz lokali mieszkalnych przeznaczonych do sprzedaży w trybie **bezprzetargowym**"* = tenant sales (na rzecz najemcy), which the project excludes.
- **No dedicated housing manager (ZGM/TBS)** publishing flat auctions — sales run directly by the Urząd Miejski (Wydział Gospodarki Komunalnej / referat nieruchomości).
- **Disambiguation:** target is the **TOWN** Gmina Miejska Włodawa → `umwlodawa.bip.lubelskie.pl`. The rural **Gmina Włodawa** (`ugwlodawa.bip.lubelskie.pl`, Al. Jana Pawła II 22 — Orchówek/Okuninka/Korolówka land) is a separate JST, out of scope.

## 2. Where published? (hosts + boards, URLs)
**Primary — town BIP on Wrota Lubelszczyzny (bip.lubelskie.pl CMS):** `umwlodawa.bip.lubelskie.pl` (upload/alias host `umwl.bip.lubelskie.pl`).
- Property board (wykazy + ogłoszenia o przetargu): **`https://umwlodawa.bip.lubelskie.pl/index.php?id=99`** ("Informacje o wykazach nieruchomości"), parent shell `?id=735` ("Wykazy nieruchomości i ogłoszenia").
- General announcements: `?id=507` (OGŁOSZENIA — only 9 records, procurement-ish).
- `PRZETARGI 2022` (`?id=571`) and `?id=496` are **zamówienia publiczne** (procurement, "Termin składania ofert") — NOT property sales; procurement also lives on `platformazakupowa.pl/pn/wlodawa`.
- **Row data is AJAX (DataTables server-side).** The `?id=99` page renders only column headers + a search form in server HTML; rows come from **`https://umwlodawa.bip.lubelskie.pl/index.php?id=99&action=list-ajax`** → JSON `{aaData:[{id_dokumentu,data_utworzenia,tresc,wprowadzajacy,...}]}` (394 records, directly fetchable with a browser UA; notice PDFs attach per `id_dokumentu`).
- **No `Rozstrzygnięcia` / `wynik przetargu` board** — zero result records found in the registry.
- Secondary (announcements only, no results): town WordPress site `wlodawa.eu` / `archiwum.wlodawa.eu` carries occasional flat-auction posts (e.g. `archiwum.wlodawa.eu/przetarg-na-sprzedaz-lokalu-mieszkalnego-2/`) — not systematic, no achieved prices.

## 3. Format + rendering
- **CMS family:** Wrota Lubelszczyzny (`bip.lubelskie.pl`) — Bootstrap shell + **DataTables JSON registry**. Body is server-HTML *chrome only*; the article table is JS/AJAX (`action=list-ajax`). Not a clean server-rendered board.
- **Mitigation:** the JSON endpoint is reachable via plain HTTP (browser UA), so a build would **not** need `core/render.js`/Playwright — hit the JSON, then fetch each notice's attached **PDF** (born-digital → `pdfText`; scanned → `ocrPdf`) for cena wywoławcza / powierzchnia / adres / termin.
- No CAPTCHA/auth; TLS OK from PL IP.

## 4. Volume + achieved-price stream
- **In-scope open flat auctions:** very low — ~**3 in 2025, 1 in 2026**, and effectively 0-1/yr before that (small town, ~13k residents). Most "lokal mieszkalny" registry entries are **bezprzetargowo** tenant wykazy (excluded). Overwhelmingly leases (274) + land (94).
- **Achieved-price stream: ABSENT.** No `informacja o wyniku przetargu` / `cena osiągnięta` / `nabywca` records in the registry (`wynik_result` = 0 of 394). Only `cena wywoławcza` (in announcement PDFs) is available; no hammer prices.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** a Wrota-Lubelszczyzny JSON-registry city (bip.lubelskie.pl DataTables) — no exact clean analog in-repo; nearest shape is JSON-list + PDF-attachment extraction (REKORD-style `/api` fetch pattern for the list, then `pdfText`/`ocrPdf` per notice). Would need a new list-ajax fetch helper.
- **Effort:** **Medium** — JSON endpoint (easy) + per-notice PDF text/OCR + heavy filtering to drop 274 dzierżawa + 94 land + all bezprzetargowo tenant wykazy, leaving ~1-4 flat auctions/yr and no results to enrich them.
- **Blockers / why NO-BUILD:** (1) in-scope open-auction volume too thin; (2) **no achieved-price/results stream** — the dataset's core value (starting vs hammer price) is unobtainable here; (3) target category dominated by out-of-scope leases + bezprzetargowo tenant sales. AJAX rendering is *not* the blocker (JSON is fetchable); the data value is.

**VERDICT: NO-BUILD** — Gmina Miejska Włodawa does hold occasional open oral flat auctions, but on a thin, lease-dominated Wrota-Lubelszczyzny registry with no achieved-price stream; Medium effort for ~1-4 in-scope flats/yr and zero results is not worth it. Revisit only if a `wynik przetargu` stream appears or flat-auction cadence rises.
