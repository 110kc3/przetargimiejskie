# Spike — Oleśnica (Dolnośląskie · powiat oleśnicki)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Medium effort if reconsidered).

## TL;DR

Gmina Miasto Oleśnica does sell municipal **flats by open auction** (ustny przetarg nieograniczony) but the volume is very low — confirmed examples are Rynek 33/1 and 33/2 (Oct 2020), plus one mixed residential/commercial building at Rzemieślnicza 3a (May 2026). The dominant channel for flat disposal is **bezprzetargowy** (wykazy published at high frequency — 14+ numbered wykazy in 2026 alone), meaning the bulk of lokal mieszkalny transactions go directly to sitting tenants under art. 34 ugnieruchomości. Open-auction flat volume appears to be 1–3 units per year at most. The city does also sell land plots and commercial premises by open auction at moderate volume (~10–20 per year). ZBK Oleśnica (housing manager) handles only **najem** (rental) and tenant wykup administration — it does not run its own property-sale auctions. Achieved-price notices are not published on the main olesnica.pl board; no result-notice stream was found.

---

## 1. Sells municipal property at auction?

**Yes, but flats are rare.** Confirmed dual-track system:

- **Bezprzetargowy (dominant for flats):** WYKAZ notices published multiple times per year — at least 14 numbered wykazy in 2026 (WYKAZ 2/2026 through 14/2026 confirmed), covering lokale mieszkalne sold to existing tenants under art. 34 u.g.n. These are NOT open auctions; they are pre-emption + negotiated-price sales to incumbents. WYKAZ 9/2026 and 8/2026 explicitly describe "budynek mieszkalny w którym znajdują się lokale mieszkalne" (ul. Poniatowskiego 10a etc.).
- **Przetarg ustny nieograniczony (rare for flats):** Confirmed for Rynek 33/1 and Rynek 33/2 (I-przetarg, Oct 2020, starting price 165 000 PLN each). These are outlier flats — historic tenement units in poor condition sold when no pre-emption claimant takes up the wykaz offer, or when the gmina decides to liquidate via open market. Also Rzemieślnicza 3a (May 2026) — mixed building with ground-floor lokal użytkowy + residential unit above. WYKAZ 10/2026 confirms at least one 2026 property going "w drodze przetargowej."
- **Land/commercial auctions (primary open-auction stream):** Active and high volume — confirmed I/II/III/IV-przetarg sequences for działki (ul. Holenderska, Grecka/Lucień, etc.) throughout 2024–2026. This is where the city's auction activity is concentrated.

**Conclusion:** Open flat auctions exist but are occasional one-offs, not a regular cadence. The main lokal mieszkalny flow is bezprzetargowy. This is the classic tenant-city pattern that typically yields NO-BUILD.

---

## 2. Where published? (hosts + boards, URLs)

**Primary announcement board (Miasto Oleśnica — Urząd Miasta):**
- `https://www.olesnica.pl/urzad/ogloszenia-burmistrza` — "Ogłoszenia Burmistrza — WYKAZY / PRZETARGI"
  - 547 total announcements (55 pages), paginated 10/page
  - RSS feed available: `https://www.olesnica.pl/rss`
  - Covers both bezprzetargowe wykazy AND open przetargi; not separated by type on the listing

**Official BIP (Biuletyn Informacji Publicznej — Urząd Miasta Oleśnicy):**
- `https://idumolesnica.bip.gov.pl/` — main BIP portal
- `https://idumolesnica.bip.gov.pl/nieruchomosci/sprzedaz-kupno/` — property sale section (confirmed contains flat auction announcements incl. Rynek 33/2)
- `https://idumolesnica.bip.gov.pl/zamowienia-publiczne/` — public procurement (separate)

**Legacy BIP (archived, pre-2020):**
- `http://bip.um.olesnica.pl/` — old system, archiwum przetargów at `/article/archive/46/300`

**ZBK (Zakład Budynków Komunalnych) — housing manager:**
- `https://bip.zbk.olesnica.pl/przetargi/index` — ZBK's own BIP, przetargi section
- ZBK runs **najem** auctions (lokal użytkowy rental) and administers wykup mieszkań for tenants
- ZBK does NOT hold independent flat-sale auctions; sales go through the Burmistrz/UM directly
- `https://zbk.olesnica.pl/zarzadzanie/wykup-mieszkan` — tenant buyout info page

**Achieved-price / result notices:**
- No dedicated result-notice section found on olesnica.pl or idumolesnica.bip.gov.pl
- "Informacja o wyniku przetargu" pages were NOT found for Oleśnica in web search
- Result information (if published) likely appears as individual posts on the same olesnica.pl board, but no confirmed stream found — DESK gap

---

## 3. Format + rendering

**olesnica.pl board:** Standard HTML listing page. Pagination via `?strona=N`. Each item is a titled link with date and short excerpt. No JavaScript SPA — static-HTML rendered (IntraCOM.pl CMS). No auth/bot block observed; web_fetch succeeded on the main page and one detail page. No CAPTCHA.

**Detail pages:** HTML with embedded text summary + attached PDF file. The auction announcement text is partly in the HTML body AND partly/fully in a linked PDF (e.g., `BIP_-I_przet_Holenderska-dz-246,2297.pdf`). Example structure from idn:2576 (Nov 2024):
- Short HTML description with key fields (address, date, notes)
- Table listing attached PDF (filename, size, download count)
- PDFs are text-PDFs (generated, not scanned) — confirmed by filenames and context (official BIP documents)

**idumolesnica.bip.gov.pl:** Gov.pl unified BIP platform. HTML pages; detail pages appear to return empty body on web_fetch (possible SSR/JS issue) — timed out or empty on direct fetch. Announcements also cross-posted to olesnica.pl board.

**No scanned PDFs confirmed.** No JSON API. No SPA framework detected on the main announcement board.

---

## 4. Volume + achieved-price stream

**Open przetarg volume (all property types, olesnica.pl board):**
- 547 total announcements across all years (board spans ~10+ years)
- Recent cadence (2026 alone, page 1 of board): 6+ open przetarg announcements in ~2 months (May–Jun 2026), all for land/mixed, not pure flats
- I/II/III/IV przetarg sequences (repeated rounds when no buyer) inflate the count

**Flat-specific open-auction volume:**
- Confirmed examples: Rynek 33/1, Rynek 33/2 (2020); Rzemieślnicza 3a (2026, mixed)
- Estimated: 1–3 flat/mixed-building open auctions per year at most
- Bezprzetargowy wykazy: 14+ in 2026 (through May), meaning the city is actively liquidating flats bezprzetargowo at high frequency — these are the real flat-sale volume

**Achieved-price stream:**
- NOT FOUND on olesnica.pl or idumolesnica.bip.gov.pl
- No "informacja o wyniku przetargu" pages indexed for Oleśnica
- Achieved price is not published in a structured way; likely buried in ad-hoc posts if at all
- This is a significant gap for the aggregator's achieved-price feature

---

## 5. Adapter effort + verdict

**Closest analog:** Similar to smaller Silesian cities (Tarnowskie Góry pattern) — city BIP board publishes HTML listings with PDF attachments, mixed property types, low flat-auction volume.

**Verdict: NO-BUILD**

**Rationale:**
1. Flat-auction volume is too low (1–3/year open auction) to justify a dedicated adapter.
2. The dominant flat-disposal mechanism is bezprzetargowy wykaz — these are pre-emption sales to tenants, not market auctions, and are not useful for the aggregator's purpose.
3. No achieved-price stream found — the aggregator's price-tracking value proposition cannot be delivered for Oleśnica.
4. The active auction stream (land plots) is useful only if the aggregator covers działki, which is out of scope for lokal mieszkalny focus.

**Blockers:**
- Low flat-auction signal-to-noise: scraping 547 posts to find ~1–3 flat auctions/year is inefficient.
- Achieved price not published → half the value prop missing.
- PDF attachment required to get full auction details (HTML summary is partial).

**Risks if reconsidered:**
- PDF parsing needed (text-PDF, manageable).
- No auth barriers — scraping is straightforward.
- olesnica.pl board is paginated HTML with RSS — low technical risk.
- Medium effort if scope expands to include land/commercial auctions.

**Confidence: Medium** — flat-auction volume is desk-estimated from search snippets; a full crawl of the 547-item board archive could reveal more flat auctions hidden in generic titles. Achieved-price gap is confirmed absent from indexed content.

---

### Key URLs

| Resource | URL |
|---|---|
| Ogłoszenia Burmistrza (main board) | https://www.olesnica.pl/urzad/ogloszenia-burmistrza |
| BIP Urząd Miasta Oleśnicy | https://idumolesnica.bip.gov.pl/ |
| BIP nieruchomości sprzedaż | https://idumolesnica.bip.gov.pl/nieruchomosci/sprzedaz-kupno/ |
| RSS feed | https://www.olesnica.pl/rss |
| BIP ZBK Oleśnica (housing manager) | https://bip.zbk.olesnica.pl/przetargi/index |
| ZBK wykup mieszkań | https://zbk.olesnica.pl/zarzadzanie/wykup-mieszkan |
| Example flat auction (Rynek 33/2, 2020) | https://idumolesnica.bip.gov.pl/nieruchomosci/sprzedaz-kupno/ogloszenie-o-i-przet-na-sprzedaz-nieruchomosci-poloz-w-olesnicy-przy-ul-rynek-33-2.html |
| Example flat auction (Rynek 33/1) | https://olesnica.pl/urzad/ogloszenia-burmistrza/Ogloszenie-I-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-polozonej-w-Olesnicy-przy-ul.-Rynek-331/idn:398 |
| Example WYKAZ bezprzetargowy (9/2026) | https://www.olesnica.pl/urzad/ogloszenia-burmistrza/WYKAZ-NR-92026-o-przeznaczeniu-nieruchomosci-do-sprzedazy-na-terenie-miasta-Olesnicy-w-drodze-bezprzetargowej/idn:3055 |
| Sprzedaż nieruchomości gminnych (invest page) | https://www.olesnica.pl/invest-in-olesnica/sprzedaz-nieruchomosci-gminnych |
