# Spike — Wejherowo (Pomorskie · powiat wejherowski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miasta Wejherowa (Prezydent Miasta) actively auctions municipal flats at open oral auctions (*przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego*) — confirmed 69+ entries on the 2025 BIP list alone. Published exclusively on **bip.wejherowo.pl** (city BIP). Auction notices are structured HTML articles; achieved-price notices are PDF attachments appended to the same article after settlement. The housing manager **Wejherowski Zarząd Nieruchomości Komunalnych (WZNK)** organizes viewings and assists, but the BIP publication is run by Wydział Gospodarki Nieruchomościami i Urbanistyki (WGNIU). No auth/bot block on article pages (BIP blocks raw `web_fetch` but Chrome MCP retrieved pages cleanly).

---

## 1. Sells municipal flats at auction?

**YES — confirmed LIVE.** The city conducts *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* regularly. The 2025 BIP list shows 69 entries (pagination: 25/page, 3 pages) as of late 2025, the vast majority being flat-sale auctions at specific addresses. Typical framing: "Prezydent Miasta Wejherowa ogłasza [n]-ty przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr X…"

These are **not** bezprzetargowe sales to tenants — they are open public auctions, repeated up to 5+ rounds on the same flat if it fails to sell. There are also occasional ground plot auctions (*nieruchomości gruntowe*) and commercial unit auctions, but flats dominate the list.

Confirmed examples from 2025:
- ul. Harcerska 11 nr 28 (19.56 m², cena wywoławcza 138 000 zł) — 3rd auction
- ul. Kopernika 11 nr 7 (53.00 m²) — 5th auction
- ul. Osiedle Staszica 1 nr 58 (42.60 m²) — 5th auction
- ul. Świętego Jana 4 nr 2, 3 (35 m², 34 m²) — multiple rounds
- ul. Harcerskiej 8 nr 32 (46.98 m²), ul. 3 Maja 1 nr 16 (56.97 m²)

From 2024 (confirmed via search): ul. Wybickiego 2 nr 11 (37.10 m²), ul. 12 Marca 226 nr 6 (50.58 m²), ul. 12 Marca 194 nr 2 (28.83 m², sold at 153 000 zł vs 125 000 zł wywoławcza).

---

## 2. Where published? (hosts + boards, URLs)

**Primary board — city BIP (Gmina Miasta Wejherowa):**
- Index: https://bip.wejherowo.pl/artykul/przetargi
- Annual sub-pages: https://bip.wejherowo.pl/artykul/przetargi-2025-r, https://bip.wejherowo.pl/artykul/przetargi-2024-r
- Static menu path: https://bip.wejherowo.pl/strony/menu/29.dhtml
- Individual auction articles: slug-based, e.g. `https://bip.wejherowo.pl/artykul/[n]-ty-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-X-...`
- Older items also at: `https://bip.wejherowo.pl/strony/NNNNN.dhtml`

**Result/settlement notices:** Published as PDF attachments (`rozstrzygnięcie przetargów`) added to the same BIP article after the auction date. The article title gains "[PRZETARG ROZSTRZYGNIĘTY]" prefix. There is no separate results board URL.

**Secondary:** wejherowo.pl (city portal) mirrors some announcements as news articles (e.g. https://www.wejherowo.pl/artykuly/prezydent-miasta-wejherowa-oglasza-...) but these are duplicates, not canonical.

**WZNK BIP** (https://bip.wznk.pl/) publishes WZNK's own procurement (repairs, maintenance), not flat-sale auctions — those remain under city BIP.

**WTBS** (https://wtbswejherowo.pl/) is a TBS (social housing company), not a seller of municipal flats via open auction.

---

## 3. Format + rendering

- **HTML articles** on bip.wejherowo.pl (CMS: custom municipal BIP software, not e-PUAP or ezamowienia)
- Article body: plain text in `<article>` element — property description, auction date/time, wadium, contact — fully machine-readable, no JS rendering required
- Pagination: list pages paginate 25 items/page (e.g. "Pozycje od 1 do 25 z 69 łącznie")
- **Announcement PDF** attached to article (e.g. "Harcerska 11 28 ogłoszenie III przetarg (PDF, ~122 KB)") — text PDF, not scanned
- **Result PDF** attached after settlement ("rozstrzygnięcie przetargów (PDF, ~65 KB)") — the achieved price stream
- Bot block: `web_fetch` (curl-based) returns empty body for bip.wejherowo.pl — likely a basic UA filter or Cloudflare-lite. Chrome MCP navigated and scraped cleanly. **Scraping must use a real browser or spoofed UA.**
- No login/auth required for reading

---

## 4. Volume + achieved-price stream

**Volume (2025):** 69 BIP entries in the single 2025 annual page (as of Dec 2025 — year may not be closed). Of these, the clear majority are flat auctions; a handful are ground plots or commercial units. Conservatively ~55–60 flat auctions/year.

**Multiple rounds common:** Many flats go to 4th or 5th round before selling (or failing), so unique flats on offer simultaneously is lower (~10–15 active at any time).

**Achieved price:** Published inside a PDF attachment named "rozstrzygnięcie przetargów" attached to each article post-settlement. The PDF is small (~65 KB), likely text-based (not scanned). Price is not embedded in the HTML article text itself — **parsing the PDF is required to extract achieved price.**

From confirmed examples: ul. 12 Marca 194 nr 2 sold at 153 000 zł (vs. 125 000 zł wywoławcza = +22%); ul. Wybickiego 2 nr 11 and ul. 12 Marca 226 nr 6 ended with negative result (no bidder).

**2024 volume:** Confirmed as similar cadence to 2025 based on search results showing multiple rounds on same flats across the year.

---

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry / Bytom — single city BIP, HTML article list with annual sub-pages, PDF attachments for result notices. Not a JSON API or SPA.

**BUILD path:**
1. Scrape annual index pages (`/artykul/przetargi-YYYY-r`) — paginated list, 25/page — with browser/UA spoofing
2. Filter articles by title keyword "lokalu mieszkalnego" to exclude land/commercial
3. Parse HTML article body for: address, lokal nr, surface, cena wywoławcza, auction date/time, wadium
4. After auction date: re-fetch article to detect "[PRZETARG ROZSTRZYGNIĘTY]" tag and PDF attachment "rozstrzygnięcie przetargów"
5. Download and parse small text-PDF for achieved price

**Blockers / risks:**
- `web_fetch` blocked — need Playwright/Selenium or spoofed `requests` UA (medium complexity, already solved in other adapters)
- Achieved price in PDF only (not inline HTML) — PDF is small and text-based so pdfplumber/pdfminer should work; risk: layout inconsistency across PDFs if format changed year-to-year
- Slug-based article URLs are long but predictable; no API or RSS feed detected (may need to scrape the list page and follow links)
- BIP CMS does not appear to have an RSS or atom feed for przetargi

**Volume:** ~55–60 flat auctions/year, medium cadence (comparable to Bytom/Tarnowskie Góry range)
**Effort:** Medium — browser scraping + PDF parsing for results, but HTML structure is clean

**VERDICT: BUILD — Medium effort, High confidence.**

---

## Sources

- BIP Gmina Miasta Wejherowa — Przetargi 2025: https://bip.wejherowo.pl/artykul/przetargi-2025-r
- BIP Gmina Miasta Wejherowa — Przetargi (index): https://bip.wejherowo.pl/artykul/przetargi
- Individual auction article (LIVE): https://bip.wejherowo.pl/artykul/trzeci-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-28-polozonego-w-budynku
- Resolved auction (ul. Wybickiego 2): https://bip.wejherowo.pl/artykul/rozstrzygniety-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-11-pol
- WZNK homepage: https://wznk.pl/
- WZNK BIP: https://bip.wznk.pl/
- WTBS homepage: https://wtbswejherowo.pl/
- Gmina Miasta Wejherowa BIP main: https://bip.wejherowo.pl/
