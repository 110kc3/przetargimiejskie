# Spike — Słupsk (Pomorskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR
Słupsk (city county, pop. ~90 k) runs open flat auctions (*ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych*) directly via its own BIP at `bip.um.slupsk.pl`. The auction board is server-rendered HTML; individual notice pages are born-digital HTML with full text inline. Result notices ("wynik przetargu") are small PDFs (~30–80 KB, born-digital, not scanned). Volume is solid: 56+ pages of property listings on the board (active as of 2026-06-27) and 232+ result-PDF entries on the archive page. The housing manager PGM Słupsk manages the municipal stock but does NOT publish auctions — all auction notices originate from the *Wydział Zarządzania Nieruchomościami* (Property Management Department) of the city hall and land on the BIP. No JS SPA, no auth wall, no bot blocks observed.

---

## 1. Sells municipal property at auction?

**Yes — confirmed LIVE.** Słupsk sells municipal flats via *przetarg ustny nieograniczony* (open oral auction). Evidence:

- Active listing page at `https://bip.um.slupsk.pl/przetargi/nieruchomosci/` showed (2026-06-27) multiple live flat auctions, e.g.:
  - *I przetarg ustny nieograniczony na sprzedaż części nieruchomości (lokalu mieszkalnego) przy ul. Ludwika Solskiego 19* — 2026-09-02
  - *I przetarg ustny nieograniczony … przy ul. Szarych Szeregów 5* — 2026-09-02
  - *III przetarg ustny nieograniczony … (lokalu mieszkalnego) przy ul. Zygmunta Krasińskiego 13* — 2026-07-09
  - *II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy ul. Stefana Starzyńskiego 1 – Wojska Polskiego 54* — 2026-07-09
- Historical searches returned flat auction entries from at least 2021 through 2025 (ul. Mochnackiego 14, ul. Kopernika 6, ul. Mickiewicza 38, ul. Starzyńskiego 8, etc.).
- The board spans 56+ paginated pages total (mixed: flats, land, commercial, garage).
- Flats are **not** limited to tenant-only (bezprzetargowy) sales — open public auctions confirmed.

---

## 2. Where published? (hosts + boards, with URLs)

**Single authoritative host: `bip.um.slupsk.pl`** (city hall BIP, Urząd Miejski w Słupsku, Plac Zwycięstwa 3, 76-200 Słupsk).

| Board | URL | Content |
|---|---|---|
| Active auction listings | https://bip.um.slupsk.pl/przetargi/nieruchomosci/ | All property auctions (flat, land, commercial), paginated, server-rendered HTML |
| Nieruchomości hub | https://bip.um.slupsk.pl/nieruchomosci/ | Parent section |
| Result notices archive | https://bip.um.slupsk.pl/nieruchomosci/dokumenty/846.html | "Informacja o rozstrzygniętych przetargach" — list of PDF links |
| Individual auction notice (example) | https://bip.um.slupsk.pl/przetargi/2845.html | Full HTML auction notice with all fields inline |
| Individual auction notice (example 2) | https://bip.um.slupsk.pl/przetargi/2883.html | II przetarg Mochnackiego 14, cena wywoławcza 180 000 zł |
| Individual auction notice (example 3) | https://bip.um.slupsk.pl/przetargi/2928.html | Kopernika 6, cena wywoławcza 150 000 zł |

PGM Słupsk (`www.pgm.slupsk.pl`) manages the housing stock under a management agreement but does NOT publish auction notices — the BIP is the sole auction channel.

---

## 3. Format + rendering

**Auction notices:** Server-rendered HTML, born-digital. Full auction text is inline on individual `/przetargi/<id>.html` pages (no JS required, no SPA). Fields present in HTML body: address, flat size, KW number, cena wywoławcza, wadium, postąpienie, auction date/time, location (room 212, Plac Zwycięstwa 3), and contact. Attachments are floor-plan JPGs (not the notice itself).

**Result notices:** Born-digital PDFs (~30–80 KB each) linked from the archive page `https://bip.um.slupsk.pl/nieruchomosci/dokumenty/846.html`. Files served at `https://bip.um.slupsk.pl/file/<id>`. File names are descriptive (e.g. `wynik II przetargu Sierpinka 2/9`, `wynik_przetargu_lokal_Pobożnego`). Not scanned — born-digital, so PDF text extraction is reliable.

**TLS:** HTTPS throughout, no auth, no bot blocks encountered. Standard HTML charset UTF-8. No Cloudflare or CAPTCHA observed.

**Listing index:** Paginated HTML (page selector visible in live page); 56+ pages as of 2026-06-27. No JSON API or GraphQL endpoint visible.

---

## 4. Volume + achieved-price stream

**Volume:**
- 56+ paginated listing pages (~20 items/page = ~1 120+ total auction entries, mixed types). Active flat auctions confirmed present on pages 1–2 live.
- Historical flat entries span multiple years (2021–2026 confirmed by search results).
- Archive result page: **232+ result PDF entries** (all property types, not just flats). Covers a multi-year backlog.

**Achieved-price stream:**
- Result PDFs at `bip.um.slupsk.pl/nieruchomosci/dokumenty/846.html`. Each PDF is titled with street name and round number. PDFs are born-digital — pdftotext/pdfplumber extraction viable.
- Price is embedded in the PDF body text (standard Polish result notice format: cena wywoławcza + cena osiągnięta, or negative-result statement).
- No structured API; scraping required. The archive page lists PDFs as flat HTML links — easy to enumerate.

---

## 5. Adapter effort + verdict

**Closest analog:** Gliwice / Zabrze pattern — city BIP with server-rendered HTML listing index + per-notice HTML pages + small born-digital PDF result files.

**What needs building:**
1. **Listing scraper** — paginate `bip.um.slupsk.pl/przetargi/nieruchomosci/` (56+ pages), extract notice links, filter for `lokal mieszkalny` in title.
2. **Notice parser** — fetch each `/przetargi/<id>.html`, extract: address, KW number, area (m²), cena wywoławcza, wadium, postąpienie, auction datetime, status (aktualne / archiwalne). All fields are inline HTML, no PDF parsing needed for notices.
3. **Result scraper** — enumerate PDFs from `/nieruchomosci/dokumenty/846.html`, download, extract achieved price with pdfplumber. File naming is heuristic (street name + round), not a structured ID — match to notice by street name + round number string.
4. **No auth / no JS rendering needed.** Standard `requests` + BeautifulSoup + pdfplumber stack.

**Blockers / risks:**
- Result PDFs must be correlated to notices by street-name string-matching (no shared numeric ID) — moderate fragility risk, mitigated by descriptive file names.
- Mixed-type board (flats + land + commercial + garages) — title filter on `lokal mieszkalny` will catch most; some listings say "część nieruchomości (lokalu mieszkalnego)" — regex must cover both forms.
- Pagination count may grow; detect last page dynamically.
- PGM Słupsk does not publish — no secondary source to cross-check volumes.

**Effort:** Medium. No auth, no JS, no OCR. Two scrapers (HTML + PDF), one fuzzy-match join. Similar to Gliwice adapter but result notices are small PDFs rather than inline HTML.

**VERDICT: BUILD** — confirmed open flat-auction stream, born-digital HTML + PDF, no technical blockers. Medium effort.

---

*Sources verified live 2026-06-27:*
- https://bip.um.slupsk.pl/przetargi/nieruchomosci/ (listing board, 20 live items page 1, 56+ pages total)
- https://bip.um.slupsk.pl/przetargi/2845.html (individual flat notice: I przetarg Mochnackiego 14, 2025-03-20, cena 210 000 zł)
- https://bip.um.slupsk.pl/przetargi/2883.html (II przetarg Mochnackiego 14, cena 180 000 zł)
- https://bip.um.slupsk.pl/przetargi/2928.html (Kopernika 6, cena 150 000 zł)
- https://bip.um.slupsk.pl/nieruchomosci/dokumenty/846.html (result archive, 232+ PDF entries)
- https://www.pgm.slupsk.pl/pl (PGM Słupsk — housing manager, confirmed not the auction publisher)
