# Spike — Poddębice (Łódzkie · powiat poddębicki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort) — marginal.

## TL;DR
Gmina Poddębice (Urząd Miejski, gmina miejsko-wiejska, seat ~7.7k) **does** run `przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej` for municipal **flats** — confirmed live, and one is active right now (ul. Przejazd 18, przetarg 7 lipca 2026). All property notices sit on the single city board **"Ogłoszenia Burmistrza Poddębic"** (`bip.poddebice.pl`, id=102, 279 docs) which runs the **devcomm "bipv45"** CMS. The list is served as a clean **DataTables JSON endpoint** (`&akcja=pobierz_dokumenty_ajax` → 279 rows, one call, title+date+ids); each notice's terms (cena wywoławcza, powierzchnia, wadium, date) live in an attached **born-digital text-PDF** (pdftotext works, no OCR). Extraction is genuinely cheap. BUT: no housing manager (ZGM/TBS), **no results/wynik board → no achieved (hammer) price stream**, flats are a minority of a land-dominated board, and open flat auctions went dormant 2022–2025 (flats sold to tenants via wykaz) before resuming in 2026. Marginal BUILD: core criterion (recurring, currently-active open flat auctions) is met, but value is thin.

## 1. Sells municipal property at auction?
**YES — incl. flats, at open oral auction.** The Burmistrz publishes `Ogłoszenie ... w sprawie przeprowadzenia przetargu ustnego nieograniczonego na sprzedaż nieruchomości lokalowej usytuowanej w budynku mieszkalnym wielorodzinnym ... wraz ze sprzedażą ułamkowej części gruntu`. Confirmed open flat-sale auctions (natural + legal persons; wadium 10%):
- **ul. Przejazd 18** — przetarg ustny nieograniczony, ogł. 29.05.2026, **przetarg 7 lipca 2026** (active this spike). Detail id p2=10065722.
- **ul. Południowa 1A** — I (21.09.2021) i II (30.11.2021) przetarg ustny nieograniczony.
- **ul. Targowej 16/18** — multiple units 2020 (m.9, m.32 + others), incl. one przetarg odwołany 15.05.2020.
- **ul. Grunwaldzkiej 2 + Narutowicza 6/8** — przetargi 27.10.2020.
- **ul. Przejazd 12** (03.2020), **ul. Przejazd 16** (10.04.2019).

The same board also carries heavy **land** auctions (~73 notices: gruntowe/niezabudowane, ustny nieograniczony + ograniczony) and many **wykaz** lists — including flat wykazy (`wykaz nieruchomości lokalowych`) that in 2022–2025 fed tenant (bezprzetargowo na rzecz najemcy) disposals rather than auctions.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (devcomm bipv45 CMS):** `https://bip.poddebice.pl`
- Board "Ogłoszenia Burmistrza Poddębic": `https://bip.poddebice.pl/index.php?id=102` (property auctions + wykazy + MPZP live here; 279 docs).
- **List JSON API (born-structured):** `https://bip.poddebice.pl/index.php?id=102&akcja=pobierz_dokumenty_ajax&chwila=1` → DataTables JSON `{iTotalRecords, aaData:[[…]]}`; row cols: `[_, autor, TITLE, znak, autor, DATE(YYYY-MM-DD), docId, …, …, p2Id(row[9]), menuId=102, …]`.
- **Notice detail:** `https://bip.poddebice.pl/index.php?id=102&p1=szczegoly&p2=<row[9]>` → HTML shell + source PDF link.
- **Source PDF:** `https://bip.poddebice.pl/upload/pliki/<name>.pdf` (holds the actual auction terms).
- Related boards: Obwieszczenia (id=97), Informacje (id=108), Wykaz zamówień publicznych (id=93, procurement — out of scope).
- **Legacy/archive (2018-):** `https://poddebice.bip.gov.pl/` (SSDIP, data to 10.02.2018) and `http://archiwumbip.poddebice.pl/` (to 29.05.2014, currently NXDOMAIN). Not needed — 2018→now is all on bip.poddebice.pl.
- **Do NOT confuse:** `poddebice.biuletyn.net` = Starostwo **Powiatowe** (county), separate JST, out of scope.

Owner: Referat Gospodarki Nieruchomościami i Urbanistyki, Urząd Miejski w Poddębicach, ul. Łódzka 17/21, 99-200 Poddębice, pok. 101/106, tel. 43 8710778 / 43 8710728.

## 3. Format + rendering
- **Server-rendered HTML shell + AJAX-JSON list + born-digital text-PDF details.** No SPA gate, no auth, no CAPTCHA; reachable from PL IP via curl.
- **List = JSON** (DataTables `aaData`) — one request returns all 279 announcements with title, `YYYY-MM-DD` date and doc ids. No pagination scraping needed.
- **Detail page** shows only title + date + a `upload/pliki/*.pdf` link; the ogłoszenie body is **not** inline HTML. Auction terms (cena wywoławcza, powierzchnia, wadium, `Przetarg odbędzie się w dniu…`) are inside the PDF.
- **PDF is born-digital text** — verified: `pdftotext -layout` on `OGLOSZENIE_o_przetargu_na_lokale.pdf` returned ~4.5 KB of clean text incl. the Wadium/Postąpienie/cena-wywoławcza table. **No OCR required.**
- CMS = **devcomm "bipv45"** (meta author `devcomm`; template origin: Środa Śląska e-usługi RPO project, reused).

## 4. Volume + achieved-price stream
- **Open flat auctions per year:** 2019 → 2, 2020 → 10 (Targowa 16/18 multi-unit run), 2021 → 3, **2022–2025 → 0** (flats went to sitting tenants via `wykaz nieruchomości lokalowych`, bezprzetargowo), **2026 → 2** (resumed: 19.03 multi-flat ogłoszenie + Przejazd 18). Bursty/intermittent, currently active. Land auctions dominate (~73).
- **Achieved-price stream: NONE.** Zero `informacja o wyniku przetargu` on the board — no results/rozstrzygnięcia board exists. Only **cena wywoławcza** is available (inside the PDF); no hammer price / nabywca published. This is the main value gap.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Effort: LOW.** One JSON call (`&akcja=pobierz_dokumenty_ajax`) → filter titles for `przetarg ustny * na sprzedaż * lokalow*/lokal * mieszk*` (drop land/dzierżawa/wykaz/MPZP) → for each, hit `p1=szczegoly&p2=row[9]`, grab the `upload/pliki/*.pdf`, `pdfText` parse (address via parseAddress from title, powierzchnia użytkowa, cena wywoławcza, wadium, date/round). Title alone already yields address + type + round (I/II/III).
- **Closest analog:** no exact devcomm-bipv45 twin in the repo yet; shape is a hybrid — **JSON list like MADKOM eBIP (milicz/olawa)** but **content in text-PDF like bip.net/extranet.pl** (server-HTML + text-PDF). Treat as "JSON-list index + per-doc born-digital PDF."
- **Blockers:** none technical. Watch-items: (a) single mixed board — must classify flats out of a land/tenant/planning-heavy stream; (b) **no hammer prices** — asking-price-only dataset; (c) thin, intermittent volume (~2–3 flat auctions/yr in active years, 4-yr gap 2022–2025); (d) small Łódzkie seat, no ZGM/TBS.

**VERDICT: BUILD (Low effort) — marginal.** Recurring, currently-active open flat auctions on a cheap-to-parse JSON+text-PDF BIP satisfy the core criterion, but the absence of any achieved-price stream plus thin/intermittent land-dominated volume make this a low-priority build; deprioritize behind cities that publish hammer prices.

```json
{"city_slug":"poddebice","voivodeship":"lodzkie","powiat_slug":"powiat-poddebicki","status":"build","effort":"Low","confidence":"LIVE","note":"open flat auctions (Przejazd 18, przetarg 7.07.2026; Południowa 1A, Targowa 16/18) on single 'Ogłoszenia Burmistrza' board id=102, 279 docs; list=DataTables JSON (&akcja=pobierz_dokumenty_ajax), detail=born-digital text-PDF (no OCR); NO manager, NO results/hammer board, land-dominated, 0 flat auctions 2022-25 then resumed 2026; marginal build; analog=JSON-list(MADKOM)+text-PDF(bip.net)","host":"bip.poddebice.pl","cms":"devcomm bipv45 (DataTables JSON list + PDF attach)"}
```
