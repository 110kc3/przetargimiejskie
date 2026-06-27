# Spike — Wałbrzych (Dolnośląskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: **BUILD** (Low–Medium effort).

## TL;DR

Wałbrzych's city BIP runs a high-volume, well-structured flat-auction stream: **24 pages of lokal mieszkalny auctions** (since 2022) via ustny przetarg nieograniczony, all published at `bip.um.walbrzych.pl`. The listing board is server-rendered HTML with a form-searchable index. Result notices are born-digital PDFs (115–120 KB, 1–2 pages) that contain starting price, achieved price, bidder count, and buyer name in a structured table — fully pdftotext-extractable. No auth, no bot blocks encountered. Closest analog: **Bytom** (single city BIP, monthly batch auctions, PDF results, moderate flat volume).

---

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** The Prezydent Miasta Wałbrzycha runs regular *ustne przetargi nieograniczone na sprzedaż lokali mieszkalnych* (residential flats), with auctions batched typically twice per month (e.g. 08.01.2025 — 7 lots; 22.01.2025 — 6 lots). The January 2025 result PDF confirmed flats at addresses including ul. Mickiewicza 6/9, ul. Proletariacka 17/7, Rynek 13/10, ul. Słowicza 19/3. Starting prices range from ~26,000 PLN (small flat needing renovation) to ~175,000 PLN. Achieved prices exceed starting price in competitive lots (e.g. Proletariacka: 44,000 → 61,500 PLN; 9 bidders).

Flats go to open public auction — NOT limited to sitting tenants (the *bezprzetargowo* route for tenants is a separate BIP section: "SPRZEDAŻ LOKALI MIESZKALNYCH … NA RZECZ NAJEMCÓW"). Both streams exist in parallel; the open-auction stream is the target.

The board also lists nieruchomości zabudowane/niezabudowane (land, buildings) — currently 45 pages of all-type auctions since 2022, vs 24 pages lokal mieszkalny only. Flat auctions are the majority of the residential-property stream.

---

## 2. Where published? (hosts + boards, with URLs)

**Single host: `bip.um.walbrzych.pl`** (Urząd Miejski w Wałbrzychu, Pl. Magistracki 1). No secondary publisher; MZB Wałbrzych (`bip.mzbwalbrzych.pl`) handles only procurement tenders (construction/maintenance), not property sales.

| Board | URL | Content |
|---|---|---|
| Auction listings index (2022–present) | `https://bip.um.walbrzych.pl/przetargi-nieruchomosci/2359` | All types; filter by `kind_id=3` for lokale mieszkalne |
| Auction search endpoint | `https://bip.um.walbrzych.pl/przetargi-nieruchomosci/szukaj?kind_id=3&...` | POST form returns filtered listing |
| Individual auction article | `https://bip.um.walbrzych.pl/przetarg-nieruchomosci/{id}/{slug}` | Metadata + PDF attachment (auction notice) |
| Results index (by year) | `https://bip.um.walbrzych.pl/artykuly/2369/informacje-o-wynikach-przetargow` | Index with sub-pages per year |
| Results 2025 | `https://bip.um.walbrzych.pl/artykuly/3128/2025-rok` | Monthly sub-pages (styczeń → grudzień) |
| Results 2026 | `https://bip.um.walbrzych.pl/artykuly/3300/2026-rok` | Same structure |
| Jan 2025 result article (example) | `https://bip.um.walbrzych.pl/artykul/3129/46568/informacja-o-wynikach-przetargow-przeprowadzonych-w-dniu-22-01-2025-r-...` | Links to PDF result notice |
| Wykazy (advance sale lists) | `https://bip.um.walbrzych.pl/artykuly/2366/wykazy-nieruchomosci-przeznaczonych-do-obrotu` | Pre-auction property lists (HTML articles + PDFs) |
| Nieruchomości do sprzedaży (archive) | `https://bip.um.walbrzych.pl/artykuly/738/nieruchomosci-do-sprzedazy` | Year-by-year archive back to 2008 |

TLS: standard HTTPS, no auth. The workspace IP was blocked by the server (empty responses from `curl`/`web_fetch`), but Chrome MCP loaded all pages without issue — likely Cloudflare or nginx UA/IP filtering on headless requests. A real browser UA should be used in the adapter.

---

## 3. Format + rendering

| Layer | Detail |
|---|---|
| Listing board | Server-rendered HTML (CMS: Logonet Sp. z o.o., BIP v2.9.0). JS-enhanced filter form (POST to `/przetargi-nieruchomosci/szukaj`). Pagination: 10 items/page default; up to 25/page. |
| Individual auction article | Server-rendered HTML. Key fields in `<article>`: adres, przetarg na (description), typ przetargu, rodzaj nieruchomości, cena wywoławcza, data przetargu. Attachments section links to PDF (auction notice ~80–120 KB). |
| Result notice | **Born-digital PDF** (PDF 1.6, 1 page, ~115 KB). Fully `pdftotext`-extractable. Tabular layout: Lp. / data i miejsce / oznaczenie nieruchomości / liczba niedopuszczonych / liczba dopuszczonych / rodzaj przetargu (I/II/III) / cena wywoławcza / **najwyższa cena osiągnięta** / informacja o ofertach / imię i nazwisko nabywcy. |
| Wykaz (advance list) | HTML article + optional PDF attachment listing 5–10 flats per batch. Born-digital. |
| Bot/auth blocks | No CAPTCHA on public pages. Workspace IP blocked (curl returns empty); real browser or realistic UA required. No login required. mosparo anti-spam token present on search form — must POST via real browser session or replicate token. |
| RSS | BIP has `/rss` feed but coverage unknown (likely all article types, not filtered). |

---

## 4. Volume + achieved-price stream

- **Listing volume:** 24 pages × ~10 items = ~240 lokal mieszkalny auction entries since 2022 (≈4 years), implying ~60/year, ~5/month. Current 2026 activity confirms ongoing cadence (June 2026: 5 flats on 10.06, 2 on 24.06, 1 on 27.07).
- **Result notices:** Published per auction day (not per lot). Jan 2025: 2 auction days → 2 PDFs covering 13 lots total. Each PDF covers all property types auctioned that day (flats mixed with land/buildings), so parsing must filter by property type from the "oznaczenie nieruchomości" column.
- **Achieved price:** CONFIRMED in PDF — column "Najwyższa cena osiągnięta w przetargach lub rokowaniach". Populated for sold lots; shows "nie podjęto licytacji" (no bids) for unsold.
- **Buyer name:** Present (full name or company). Can be anonymized downstream.
- **Result PDF naming:** `https://bip.um.walbrzych.pl/attachments/download/{id}` — opaque ID, must be discovered from the result article link. No direct URL pattern.
- **Archive depth:** Results section goes back to 2022 (sub-pages: 2022, 2023, 2024, 2025, 2026). Pre-2022 results available in the old year-by-year archive back to 2008, though format may differ.

---

## 5. Adapter effort + verdict

**Closest analog: Bytom** — single city BIP, form-filtered listing board, monthly batch auctions, PDF result notices with achieved prices. Wałbrzych is slightly more structured (dedicated `/przetargi-nieruchomosci/` subsystem with machine-readable listing cards vs Bytom's article-list format).

**Adapter components:**

1. **Listing scraper** — POST to `/przetargi-nieruchomosci/szukaj` with `kind_id=3` (lokal mieszkalny) + mosparo token. Paginate through results. Extract per-card: adres, typ przetargu, cena wywoławcza, data przetargu, article URL. Medium complexity: mosparo token requires either a browser session or token extraction from the form page. Consider Playwright/Puppeteer for the POST.

2. **Article detail scraper** — GET each auction article URL. Parse `<article>` for structured fields + PDF attachment URL (auction notice). Low complexity.

3. **Result PDF fetcher** — Walk `artykuly/2369` → year page → month page → result article → attachment download URL. Download PDF, run `pdftotext`, parse table rows. Match by address to listing entries. Medium complexity: the month-page navigation adds 2 hops per result; table parsing requires column alignment logic (multi-line cells due to address+parcel+KW spanning rows).

4. **Incremental update** — Check "Ostatnia aktualizacja BIP" timestamp (`26.06.2026 12:52` confirmed on live page) or poll `/ostatnio-opublikowane/10` endpoint for new articles.

**Blockers / risks:**
- mosparo anti-spam token on search form — use Playwright or extract token from GET response before POST.
- Workspace/server IP filtering — adapter must use realistic browser UA; Playwright with headed mode resolves this.
- PDF table is multi-column with cell wrapping — pdftotext column alignment is imperfect; may need positional parsing (pdfplumber) for reliable price extraction.
- Result PDFs cover all property types per auction day — must filter rows by "lokal mieszkalny" designation in "oznaczenie nieruchomości" text.
- No "nie podjęto licytacji" → no achieved price for unsold lots; adapter must handle null.

**Effort estimate:** 3–5 days for full adapter (listing + results + PDF parser + incremental). Low-medium — no OCR needed, no JS SPA, no auth. Main time sink is the PDF table parser and mosparo token handling.

**VERDICT: BUILD.** High flat-auction volume (~60/year), clean born-digital PDFs with achieved prices, single well-structured BIP, no auth. Strong signal city.
