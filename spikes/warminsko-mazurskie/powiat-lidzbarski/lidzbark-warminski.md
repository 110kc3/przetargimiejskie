# Spike — Lidzbark Warmiński (Warmińsko-Mazurskie · powiat lidzbarski)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR
The Burmistrz of Lidzbark Warmiński (city, ~15 k residents) regularly sells municipal flats via _ustny przetarg nieograniczony_ and publishes both announcements and auction results on a clean HTML BIP at `bip.lidzbarkw.pl`. At least 3 distinct flat auctions confirmed across multiple rounds (Kopernika 10, Rzemieślnicza 9/92.6, Dąbrowskiego 8/2). Achieved prices surface on the same resolved-auctions board. Volume is low-to-medium (small city, occasional flats), but the data is scrape-friendly HTML with no SPA/auth blocks. Closest analog: standard BIP-WM board scraper (same pattern seen in other Warmińsko-Mazurskie cities).

## 1. Sells municipal property at auction?

YES — confirmed. The city conducts _ustny przetarg nieograniczony na sprzedaż_ for residential units (_lokale mieszkalne_). Evidence:

- **ul. M. Kopernika 10, lokal nr 1** — IV przetarg announced (earlier rounds also ran), area 23.90 m², cena wywoławcza 29 814.90 PLN, wadium 3 000 PLN. Published on `bip.lidzbarkw.pl` and aggregated on listaprzetargow.pl.
- **ul. Rzemieślnicza 9/92.6** — III przetarg announcement PDF served directly from BIP (`bip.lidzbarkw.pl/system/obj/2846_...pdf`), confirms flat sold in open auction format. Date: September 5, 2024.
- **ul. Dąbrowskiego 8, lokal nr 2** — 45.53 m², sold at auction for 29 907.06 PLN (achieved price confirmed in search snippets).
- The repeated-round pattern (II/III/IV przetarg) is consistent with the statutory obligation to re-run when no bidder appears — flats are genuinely offered open-market, not exclusively _bezprzetargowo_ to tenants.

## 2. Where published? (hosts + boards, URLs)

| Board | URL | Content |
|---|---|---|
| BIP current auctions (nieruchomości) | `https://bip.lidzbarkw.pl/przetargi/10054/status/` | Active announcements (HTML list) |
| BIP resolved auctions (nieruchomości) | `https://bip.lidzbarkw.pl/przetargi/10054/status/1/` | Results with achieved prices (HTML list) |
| Single resolved record example | `https://bip.lidzbarkw.pl/przetargi/10054/181/GG_6840_3_11_2025_AT/` | Detail page (HTML), ref number format `GG.6840.X.Y.YEAR.AT` |
| BIP alternate host | `https://lidzbarkw-um.bip-wm.pl/public/?id=131876` | Mirror/older BIP-WM platform |
| City main site announcements | `https://lidzbarkw.pl/ogloszenia-o-przetargach/` | Public notices (may duplicate BIP) |
| PDF attachments | `https://bip.lidzbarkw.pl/system/obj/*.pdf` | Text PDFs for detailed auction specs |

Primary scrape target: `bip.lidzbarkw.pl` (modern BIP, HTML, clean URL structure). The BIP-WM mirror (`lidzbarkw-um.bip-wm.pl`) is older and less structured — avoid as primary.

## 3. Format + rendering

- **Announcement list**: Standard HTML table/list on `bip.lidzbarkw.pl`. No SPA, no auth, no bot block observed. Pagination via URL path (`/status/` suffix).
- **Detail pages**: Plain HTML with auction metadata (type, reference number, date, subject). Achieved price likely in the resolved detail page.
- **Attachment PDFs**: Text PDFs (not scanned/OCR) — machine-readable, served at predictable `/system/obj/NNN_filename.pdf` paths. Used for full auction specs; not required for basic aggregation.
- **No JavaScript gating**: BIP-WM platform is server-rendered, historically straightforward to scrape with standard HTTP GET + BeautifulSoup/lxml.

## 4. Volume + achieved-price stream

- **Volume**: Low-medium. City population ~15 k; municipal housing stock is modest. Flats appear at auction sporadically — estimate 3–8 flat auctions/year based on multi-round patterns observed. Mixed with land/commercial auctions on same board.
- **Achieved prices**: Published on the resolved board (`/status/1/`) — same BIP, same HTML format. Individual resolved records (e.g. `GG_6840_3_11_2025_AT`) are HTML pages, likely containing cena uzyskana. This is the achieved-price stream.
- **Confirmation**: Dąbrowskiego 8/2 sold at 29 907 PLN (confirmed via search snippet). Indicates price data is in-HTML, not PDF-only.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog**: Warmińsko-Mazurskie BIP scraper (same `bip-wm.pl`-style or modern `bip.lidzbarkw.pl` platform). If the project already has a BIP-WM adapter (e.g., from Olsztyn or Ełk), this is a light port.

**Effort breakdown**:
- List scraper (current + resolved boards): 1–2 days
- Detail page parser (extract: address, area, cena wywoławcza, cena uzyskana, date, round number): 1 day
- Flat vs. land/commercial filter (from title/description): 0.5 day
- PDF fallback for spec attachments: optional, not critical for MVP
- Deduplication across rounds (same lokal appearing as II/III/IV przetarg): 0.5 day
- Total: **~3 days** → Medium effort

**Blockers**: None identified. No auth, no CAPTCHA, no SPA. Main risk is low absolute volume (may yield sparse data stream). Reference number format `GG.6840.X.Y.YEAR.AT` is parseable.

**Verdict: BUILD** — confirmed flat auctions at open _ustny przetarg nieograniczony_, clean HTML BIP, achieved-price board present. Low scraping friction; medium effort due to mixed-type board filtering and multi-round deduplication.
