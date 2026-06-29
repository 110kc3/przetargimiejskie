# Spike — Świecie (Kujawsko-Pomorskie · powiat świecki)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: NO-BUILD (Medium confidence).

## TL;DR

Gmina Świecie holds a municipal housing stock managed by ZGM Sp. z o.o. (100%-owned by the gmina). All flat sales to the public via *ustny przetarg nieograniczony* appear to have ended around 2009 (last confirmed example: VII przetarg pisemny ograniczony, ul. Gen. J. Hallera 19, lokal nr 1, 47.54 m², cena wywoławcza 71 370 PLN). The current BIP board (23 pages, spanning 2021–2026-06-29) contains zero flat-sale auction entries — only land plots (działki), leases (dzierżawa), and Vistula Park I industrial-zone plots. ZGM's przetargi page covers commercial-unit *najem* (rent) only. Housing-stock flats are sold *bezprzetargowo* to sitting tenants or not sold at all — consistent with the national heuristic: no open flat-sale auctions = NO-BUILD.

---

## 1. Sells municipal property at auction?

**Land and commercial: YES, occasionally.** The BIP "Gospodarka nieruchomościami" board publishes *przetarg ustny nieograniczony* notices for undeveloped plots (działki gruntowe), industrial-zone parcels (Vistula Park I/II), and resolved-auction results (*informacja o wyniku przetargu*) — all for land.

**Flats (lokale mieszkalne): NO — not since ~2009.** The single confirmed flat-sale auction in the indexed record is the "VII przetarg pisemny ograniczony dla mieszkańców Gminy Świecie" for 1 flat at ul. Gen. J. Hallera 19 (archived at `archiwum.bip.swiecie.eu`, `?bip_id=5336&cid=233`). No *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* appears anywhere in the current BIP (pages 1–23, 2021–2026). The housing manager ZGM runs only commercial-unit tendering. Flat disposals almost certainly proceed *bezprzetargowo* (Art. 37 ust. 2 pkt 1 u.g.n.) to sitting tenants, with the gmina setting price by Zarządzenie Burmistrza (cf. zarządzenie 970/26: *określenia ceny i sposobu zapłaty za nieruchomość stanowiącą własność gminy Świecie* — likely a flat, sold directly without auction).

---

## 2. Where published? (hosts + boards, URLs)

| What | Host | URL |
|---|---|---|
| BIP main (current) | `bip.swiecie.eu` | <https://bip.swiecie.eu/artykuly/197/gospodarka-nieruchomosciami> |
| BIP paginated board | `bip.swiecie.eu` | `https://bip.swiecie.eu/artykuly/197/{page}/15/gospodarka-nieruchomosciami` (pages 1–23) |
| BIP archive (old system) | `archiwum.bip.swiecie.eu` | <https://archiwum.bip.swiecie.eu/> |
| ZGM przetargi (commercial only) | `zgm-swiecie.com.pl` | <https://www.zgm-swiecie.com.pl/przetargi/lokale-uzytkowe> |
| ZGM BIP | `zgm-swiecie.multibip.pl` | <http://zgm-swiecie.multibip.pl> |
| ZGM ogłoszenia (tenancy notices) | `zgm-swiecie.com.pl` | <https://www.zgm-swiecie.com.pl/ogloszenia/lokale-gminne> |

**Result notices (achieved price):** Published on the main BIP board as individual articles titled *Informacja o wyniku przetargu* (e.g., `https://bip.swiecie.eu/artykul/197/10696/informacja-o-wyniku-przetargu-na-sprzedaz-dzialki-nr-170-17-...`). Content body is empty in web-fetch (text lives in a linked PDF or renders via JS). The "Save to PDF" button generates `https://bip.swiecie.eu/artykul/pdf/197/{id}/1` but returns binary — not plain-text extractable via `web_fetch`.

---

## 3. Format + rendering

- **Board index:** standard HTML, server-side rendered, no SPA. Paginated at 15 items/page via URL parameter (`/197/{page}/15/`). Clean `<h2>` + `<a>` structure. **Scrapable without JS.**
- **Individual article pages:** HTML shell with metryczka metadata table; actual announcement content is either (a) inline HTML text or (b) attached PDF. Web-fetch returns the shell but the body text appears empty in several tested examples — content may be rendered into the DOM after JS execution or embedded in an attached file.
- **Result notices:** Similar pattern. The `artykul/pdf/{section}/{id}/1` endpoint generates a PDF on-demand (binary, not text/html). Confirmed PDF path exists but requires PDF parsing (pdfminer/pdfplumber).
- **Auth/bot blocks:** None observed. No CAPTCHA, no session requirement, no Cloudflare. `meta-robots: index,follow,all`. Fetches return 200 with full HTML.
- **RSS feed:** Available at `https://bip.swiecie.eu/rss` — not verified whether it covers the nieruchomości section specifically.

---

## 4. Volume + achieved-price stream

**Flat auction volume: ~0 per year** (current regime). No flat-sale przetarg posted on the main BIP board in the 2021–2026 window (345+ articles, all pages checked). The single archived flat auction is from 2009 (a *VII* edition implies a long, exhausted series).

**Land/commercial auction volume:** Approximately 3–6 przetarg or rokowania notices per year visible across 23 pages (est. ~8 land auctions/year including Vistula Park industrial plots). This is low absolute volume.

**Achieved-price stream:** Result notices (*informacja o wyniku*) are posted on the same BIP board. Content is in PDF attachments — not inline HTML. Extracting achieved prices would require PDF parsing. For land parcels (the only current auction type), result notices appear 1–2 times per quarter.

---

## 5. Adapter effort + verdict

**Closest analog among known adapters:** None. Most similar to a stripped-down Tarnowskie Góry (also generic city-BIP property board, low volume) but without any flat-sale stream.

**Blockers:**
1. **No flat-sale auctions.** The primary target object type (lokal mieszkalny sold at open auction) does not exist in the current publication regime. Building an adapter would produce zero flat results.
2. **PDF content.** Announcement bodies and result notices live in PDF attachments, not inline HTML — requires an additional PDF parsing layer.
3. **Low total volume.** Even land auctions are sparse (~8/year); no dedicated high-volume stream worth monitoring.

**Risks if a flat auction ever reappears:** The BIP board structure is clean and scrapable; an adapter could be built quickly if the gmina resumes open flat auctions. ZGM has no BIP-published flat-sale stream. The housing stock is managed by ZGM Sp. z o.o. (ul. Ciepła 4, 86-100 Świecie; REGON 340106181) — any policy change would appear on `bip.swiecie.eu/artykuly/197/` or via Zarządzenie Burmistrza.

**VERDICT: NO-BUILD.** Świecie does not run open flat-sale auctions. The BIP board is land/commercial only. ZGM runs commercial-unit rental tenders, not flat sales. Flat disposals are bezprzetargowy to tenants. No signal of imminent policy change. If the project later expands to land auctions or *bezprzetargowy* sales tracking, the BIP board is technically accessible (HTML, no bot-block, paginated URL pattern).

**Effort if reversed to BUILD:** Low-Medium (BIP HTML scraping is straightforward; PDF parsing adds one dependency; flat volume = 0 so ROI is nil until policy changes).
