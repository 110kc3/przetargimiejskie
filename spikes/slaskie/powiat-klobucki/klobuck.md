# Spike — Kłobuck (Śląskie · powiat kłobucki)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Low effort). **Built + registered 2026-07-13** (8/8 parse test; TERYT 240405_3 best-effort). ⚠️ PUBLIC-TIER (Śląskie, blocks CI) → crawl.js triple-bounded (MAX_PAGES/DETAILS/FETCHES), never throws; live smoke = 47 fetches, 10/10 results parse cleanly. Analog wolow/kolbuszowa. Live corrections to DESK: (1) the `bip.gminaklobuck.pl` IntraCOM mirror serves a **BROKEN TLS cert** (hostname mismatch) → the town portal **gminaklobuck.pl** is the source of record, discovered off `/ogloszenia?page=N`; (2) the detail-page `<h1>` is a **useless generic "Ogłoszenie"** → routing keys on the URL SLUG (only sale + result pages fetched); (3) two parse bugs fixed — the flat address grabbed the "Nr" label into the street ("Rómmla Nr" → "Rómmla"), and the buyer regex died on the Polish "Nabywcą" (ASCII \w → Polish class). Low flat volume (one recurring ul. Rómmla unit, unsold I/II → SOLD III at 222 200 zł) + repeat-round land (Pokrzyńskiego 80 Libidza I→IV, Srebrne). source:'html', browser UA, no PDF/OCR.

## TL;DR
Gmina Kłobuck runs *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* — confirmed
multiple rounds in 2024 on a single flat. Volume is low (1 flat observed, 3 rounds).
Announcements and result notices live on a plain-HTML IntraCOM.pl CMS with no auth or SPA.
Achieved-price stream exists via "informacja o wyniku" pages. Low scraping effort.

## 1. Sells municipal property at auction?

YES — confirmed. Burmistrz Kłobucka announces *ustny przetarg nieograniczony na sprzedaż
lokalu mieszkalnego stanowiącego własność Gminy Kłobuck*. Observed case: lokal mieszkalny Nr 42,
ul. Rómmla 4, Kłobuck (45.64 m², 4th floor, block from 1966). Went through at minimum a 1st,
2nd (19.03.2024, cena wywoławcza 230 000 zł → negative), and 3rd (04.06.2024, cena wywoławcza
220 000 zł) przetarg round. Not bezprzetargowo-only. Also sells land and built plots at auction,
but flat sales confirmed.

## 2. Where published? (hosts + boards, URLs)

**Announcement board (dual publication):**
- Main site CMS: `https://gminaklobuck.pl/ogloszenie/<slug>` — full announcement text in HTML
- BIP board: `http://bip.gminaklobuck.pl/urzad_miejski/ogloszenia_dotyczace_sprzedazy.html`
  (paginated listing, 123 entries total as of fetch; powered by IntraCOM.pl BIP engine)
  - Page 2: `…/str:2.html`, page 3: `…/str:3.html` etc.

**Result/achieved-price board:**
- Same CMS: `https://gminaklobuck.pl/ogloszenie/informacja-o-wyniku-przetargu-<id>`
  and `…/informacja-o-wyniku-i-przetargu-ustnego-nieograniczonego-…`
- Pattern confirmed for both flats and land (e.g. Jan 2026 land result at `/ogloszenie/…-180`)
- Results include outcome (positive/negative), date, and presumably cena osiągnięta when positive

**Press excerpt:** also placed in powiat-level press (per announcement text), but web source is
sufficient.

## 3. Format + rendering

- **gminaklobuck.pl**: static HTML pages served by a PHP/WordPress-style CMS; full announcement
  body inline in page HTML, no JavaScript rendering required, no auth, no bot blocks observed.
- **bip.gminaklobuck.pl**: IntraCOM.pl BIP engine — standard Polish BIP HTML, listing pages with
  `więcej:` links to detail pages. Clean server-side HTML.
- No PDF attachments detected for the flat announcements (full text inline in HTML).
- No scanned PDFs, no JSON API, no SPA.
- Pagination on BIP listing is simple numeric (`/str:N.html`).

## 4. Volume + achieved-price stream

- **Volume:** Low. Single residential flat tracked across 3+ auction rounds in 2024. Municipality
  may release additional flats over time but stock appears thin.
- **Achieved-price stream:** Result notices published at `gminaklobuck.pl/ogloszenie/…` with
  "informacja o wyniku" in slug/title. Observed outcomes have been negative (no bidders) in
  multiple rounds, but the result page format exists and would carry cena osiągnięta on a
  successful sale.
- **Historical depth:** BIP board has 123 entries spanning multiple years; older entries go back
  to at least 2021.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Any small IntraCOM.pl BIP municipality already scraped (e.g. pattern used in
other Śląskie spikes). Two-endpoint scraper: BIP paginated listing → detail pages on gminaklobuck.pl
or BIP, plus result-notice pages for achieved prices.

**Effort:** Low.
- BIP listing: paginate `/str:N.html`, extract `więcej:` links.
- Detail page: extract announcement body from HTML (single `<div>` block, no nested frames).
- Result page: match by slug pattern `informacja-o-wyniku*`, extract price and outcome.
- No auth, no JS rendering, no CAPTCHA, no PDF parsing needed.

**Blockers:** None identified. Rate-limit on web_fetch hit during spike (HTTP 429 from Cowork
proxy), but the underlying site returned fine in earlier fetches — not a site-level block.

**Verdict: BUILD — Low effort.**
