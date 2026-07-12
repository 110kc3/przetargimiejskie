# Spike — Kamienna Góra (Dolnośląskie · powiat kamiennogórski)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Low effort). **Built + registered 2026-07-11** (19/19 parse test; **TERYT 020701_1 geoportal-CONFIRMED**, not best-effort). Analog walbrzych (born-digital PDF + browser-UA gate) × wolow (slug discovery, classify-on-body). Corrections: bot UA returns an empty body → needs browser UA; discovery via sitemap.xml (year-index URLs are context-unstable). Real flat stream with sold+unsold achieved prices. NB: the repo's own klodzko/config.js teryt (0207) is mis-coded — 0207 is powiat kamiennogórski; Kłodzko is 0208 (left untouched — separate fix).

## TL;DR
Gmina Kamienna Góra (UM) actively auctions municipal flats at *ustny przetarg nieograniczony na zbycie lokalu mieszkalnego*. Announcements and result notices are published as individual HTML pages on bip.kamiennagora.pl under clean, crawlable slug URLs. Volume is solid — 10+ flat wykazs and multiple przetarg rounds indexed for 2024–2025 alone. Achieved-price stream confirmed via *informacja o wyniku* pages. No auth/bot block detected; web_fetch timed out (likely rate-limit on lightweight fetch), but Google indexes the pages cleanly.

## 1. Sells municipal property at auction?
**YES — lokale mieszkalne at ustny przetarg nieograniczony.**

Direct evidence from Google-indexed BIP pages:
- `bip.kamiennagora.pl/i-przetarg-ustny-nieograniczony-na-zbycie-lokalu-mieszkalnego-nr-17a-polozonego-w-kamiennej-gorze-przy-ul-wiejskiej-4.html`
- `bip.kamiennagora.pl/i-przetarg-ustny-nieograniczony-na-zbycie-lokalu-mieszkalnego-nr-3-polozonego-w-obrebie-nr-5-miasta-.html` (Jeleniogórska 53)
- Multiple "wykaz nieruchomości przeznaczonych do zbycia — lokal mieszkalny" entries at Plac Wolności 7, T. Kościuszki 50, Piotra Ściegiennego 7, Aleja Wojska Polskiego 2, Stefana Okrzei 1, Marii Skłodowskiej-Curie 20, Bohaterów Getta 11 & 26, and others.

Also auctions land parcels (działki) and commercial units (lokale użytkowe) — flats are not the only category.

## 2. Where published? (hosts + boards, URLs)

**Announcements board (ogłoszenia):**
- `https://bip.kamiennagora.pl/` — main BIP of Urząd Miasta Kamienna Góra
- Year index pages: `https://bip.kamiennagora.pl/2025.html`, `https://bip.kamiennagora.pl/762-2024.html`
- Individual auction pages: slug-based HTML, pattern `bip.kamiennagora.pl/<i|ii|...>-przetarg-ustny-nieograniczony-na-zbycie-lokalu-mieszkalnego-<desc>.html`
- Wykaz pages: `bip.kamiennagora.pl/wykaz-nieruchomosci-przeznaczonych-do-zbycia-lokal-mieszkalny-<desc>.html`

**Results board (wyniki / achieved-price):**
- *Informacja o wyniku* pages confirmed on same BIP host, e.g.:
  `bip.kamiennagora.pl/informacja-o-wyniku-i-przetargu-ustnego-nieograniczonego-na-najem-garazu-polozonego-przy-ul-szkolnej.html`
- Pattern mirrors announcement slugs; same domain, separate slug prefixed with `informacja-o-wyniku-`.
- Flat-sale result page confirmed for Wiejska 4 (Nov 2023).

**No separate portal** — everything on bip.kamiennagora.pl.

## 3. Format + rendering

- **HTML pages** with clean slug-based URLs — standard BIP CMS layout.
- No SPA, no login/auth required for public auction pages.
- `web_fetch` returned empty body on two attempts (possible lightweight-response for non-browser UA or transient timeout); Google indexes the content fully, suggesting standard HTML served to real browsers.
- No scanned-PDF or OCR requirement evident from URL patterns. Attachments (e.g., maps, floor plans) may be PDFs but the auction text/price data appears inline HTML.
- Closest analog in existing codebase: any standard BIP HTML adapter (e.g., Jelenia Góra, Wałbrzych pattern).

## 4. Volume + achieved-price stream

- **Flat auction volume:** 10+ individual lokal mieszkalny wykazs indexed in 2024–2025; multiple I/II/IV przetarg rounds per property (re-listed when no buyer), indicating a steady active pipeline.
- **Achieved-price stream:** CONFIRMED. *Informacja o wyniku* pages published on same BIP, with achieved price and winner info. Pattern consistent with other Dolnośląskie cities already built.
- Frequency: appears roughly monthly based on index breadth.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Jelenia Góra or Wałbrzych BIP HTML adapters (slug-based, flat HTML, same region).

**Effort:** Low.
- Standard BIP CMS — slug extraction from year-index page + HTML parse of auction notice.
- Result scrape: same domain, `informacja-o-wyniku-*` slug pattern.
- No auth, no JS rendering required.
- One blocker to verify live: `web_fetch` returned empty — need Chrome MCP or headed browser to confirm page structure and extract selector paths before coding. Likely just UA filtering by the BIP host.

**VERDICT: BUILD (Low effort)** — active flat auctions, clean HTML BIP, confirmed results stream, low parse complexity.
