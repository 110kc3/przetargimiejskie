# Spike — Kluczbork (Opolskie · powiat kluczborski)
> **Status:** spike LIVE — re-verified 2026-07-06. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Kluczbork does conduct *ustny przetarg nieograniczony na sprzedaż* for municipal **lokale mieszkalne**. Confirmed auctions: ul. Zamkowa 15/14 (25.11.2025), ul. Zamkowa + ul. Curie-Skłodowskiej batch (announced 22.10.2025, auction date 30.01.2026). A dedicated results board (`/690,informacje-o-wynikach-przetargow`) exists and appears to contain achieved-price documents. BIP is on the standard `bip.kluczbork.eu` host (nowoczesnagmina/dedicated BIP). Format is likely HTML listing + attached PDFs — needs live page inspection to confirm scrape path and PDF vs inline text.

## 1. Sells municipal property at auction?
**YES.** Multiple confirmed flat auctions via *ustny przetarg nieograniczony* in 2023–2026:
- ul. Zamkowa 15/14 — auction 25.11.2025 (ref. GNP.6840.46.2025.JK or similar)
- ul. Curie-Skłodowskiej 3 — wykaz 22.10.2025, auction 30.01.2026 (batch with ul. Zamkowa)
- ul. Drzymały 8/1 — appeared in results board (earlier cycle)
- ul. Zamkowa + ul. Sybiraków + działka ks. Skargi — batch auction 30.11.2023

Also sells bezprzetargowo to tenants (separate wykaz board at `/453`) but flat auctions are clearly running in parallel — this is NOT land/commercial-only.

## 2. Where published? (hosts + boards, URLs)
| Board | URL |
|---|---|
| Announcement board (sprzedaż + dzierżawa) | https://www.bip.kluczbork.eu/452,przetargi-na-sprzedaz-i-dzierzawe-nieruchomosci |
| Results / achieved-price board | https://www.bip.kluczbork.eu/690,informacje-o-wynikach-przetargow |
| Wykazy nieruchomości (pre-auction lists) | https://www.bip.kluczbork.eu/453,informacja-o-wykazach-nieruchomosci |
| BIP root | https://www.bip.kluczbork.eu/ |
| Mirror URL pattern | https://www.kluczbork.eu/bip/452,... |

BIP host: `bip.kluczbork.eu` — appears to be a dedicated BIP instance (not UM main site subdirectory). Mirror at `kluczbork.eu/bip/` confirmed in search snippet URLs.

No evidence of auth wall or bot-block. Standard BIP HTML navigation pattern.

## 3. Format + rendering
- **DESK inference** (web_fetch rate-limited; not directly fetched): standard BIP HTML article list with per-announcement sub-pages. Announcement pages likely embed inline HTML text OR link to attached PDFs.
- Results board (`/690`) — individual result documents are likely PDFs attached to BIP articles (common pattern). Need live check whether "cena osiągnięta" is in HTML text or only in the PDF attachment.
- No SPA indicators; no JS-auth signals from search results. Pages appear to be static HTML served by a PHP-based BIP CMS (nowoczesnagmina or equivalent).
- **Risk:** announcements may use scanned-PDF attachments (occasional for older cycles). Recent auctions (2025–2026) more likely text-PDF or HTML inline.

**Live verification needed** to confirm: (a) HTML vs PDF content, (b) whether results board publishes achieved price in structured text or only in document body.

## 4. Volume + achieved-price stream
- **Volume:** ~3–6 flat auctions per year estimated (batches of 1–3 units per round, 2–4 rounds/year). Evidence: at least 4 distinct auctions found across 2023–2026 (confirmed via search snippets). Low-medium volume city (~24 k inhabitants, powiat seat).
- **Achieved-price stream:** dedicated results board exists at `/690,informacje-o-wynikach-przetargow`. Search confirmed it contains result documents for flat auctions (ul. Drzymały 8/1 cited). Whether price is machine-readable (HTML text) or buried in PDF requires live inspection.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Olesno or Brzeg — small Opolskie powiat seat, standard BIP CMS, low-medium volume, HTML+PDF mix.

**Effort: Medium** — driven by uncertainty on PDF vs HTML for results and potential need for PDF extraction on achieved-price documents.

**Build path:**
1. Fetch `/452` listing → parse article links → per-announcement page scrape (HTML text expected)
2. Fetch `/690` results board → per-result page → extract achieved price (HTML or PDF text layer)
3. If PDFs: use pdftotext / pdfplumber; watch for scanned-PDF fallback (OCR needed in worst case)

**Blockers / open questions:**
- ~~Are result PDFs text-based or scanned?~~ RESOLVED 2026-07-06: text-based (see Re-verify below)
- ~~Does `/452` paginate or use a flat list?~~ RESOLVED: flat list back to 2013, no pagination
- The 30.01.2026 auction was partly cancelled (residential portion) — need to understand cancellation notice pattern for de-duplication logic

## Re-verify 2026-07-06

Live re-check (WebFetch against bip.kluczbork.eu + local pdftotext on downloaded PDFs). No rate-limiting encountered this time. All three questions resolved:

**(1) Boards live.** All three confirmed reachable and current:
- `/452,przetargi-na-sprzedaz-i-dzierzawe-nieruchomosci` — flat list back to 2013, no pagination, newest-first. Article links are `redir,452?tresc=NNNNN` sub-pages.
- `/690,informacje-o-wynikach-przetargow` — results board live, entries 2016→2026, `redir,690?tresc=NNNNN` pattern, no pagination.
- `/453,informacja-o-wykazach-nieruchomosci` — live and **active in 2026**: 29.06.2026 wykazy "nieruchomości lokalowej przeznaczonej do sprzedaży w drodze przetargu" for ul. Zamkowa 15 and Bogdańczowice 2D → new flat-auction rounds incoming H2 2026.

**(2) Flat volume 2024–2026 confirmed, but LOW (~1–3 lots/yr, not 3–6):**
- 2024: GNP.6840.34.2024.JK — lokal ul. Drzymały 8/1 (auction 18.10.2024)
- 2025: GNP.6840.39.2025.JK — lokal ul. Zamkowa 15/14 (25.11.2025) — **wynik negatywny** (no bidders; cena wywoławcza 187 400,00 zł, achieved: n/a)
- 2026: GNP.6840.46.2025.JK batch (Zamkowa + Curie-Skłodowskiej, 30.01.2026) — residential portion **cancelled** 30.12.2025; NEW wykazy 29.06.2026 re-listing Zamkowa 15 + Bogdańczowice 2D for przetarg
- Stream is recurring (failed lots get re-listed) but recent rounds ended negative/cancelled, so achieved-price yield will be thin.

**(3) Format resolved: PDF-attachment-only, text layer present (no OCR needed).**
- Announcement articles (`/452` sub-pages) carry NO inline body — just title + attachments. Main doc e.g. `plik,22249,gnp-6840-39-2025-jk-ogloszenie-przetargu-pdf.pdf`; pdftotext extracts cleanly ("Cena wywolawcza - 187 400,00 zl. brutto wadium - 18 740,00 zl", address, area 139,03 m², auction date).
- Result articles (`/690` sub-pages) same pattern: metadata page + single PDF (e.g. `plik,22458,informacja-o-wyniku-przetargu-...pdf`). pdftotext extracts the standard §12 rozporządzenie result template incl. "cena wywolawcza", "najwysza cena osignita w przetargu", nabywca fields.
- Note: extracted text has degraded Polish diacritics (ą/ę/ł dropped by font encoding) — regexes must be diacritic-insensitive (`wywo.awcza`, `osi.gni.ta`).
- Boilerplate PDFs (oświadczenia, regulamin) attached alongside — filter by filename (`ogloszenie-przetargu` / `informacja-o-wyniku`).

**Verdict: BUILD — Medium effort.** Standard BIP (redir/tresc + plik URL scheme), text-PDF extraction for both announcements and results, closest analog Olesno/Brzeg. Effort drivers: PDF-only content (no inline HTML), diacritic-lossy text layer, cancellation/negative-result handling and re-list de-duplication. Low volume means low payoff per year but near-zero ongoing maintenance.
