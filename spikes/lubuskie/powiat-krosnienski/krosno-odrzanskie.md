# Spike — Krosno Odrzańskie (Lubuskie · powiat krośnieński)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Low effort). **Built + registered 2026-07-12** (16/16 parse test). Analog **wschowa** (SYSTEMDOBIP `/przetargi/202/status` — same td-title row engine, inline Cena+Wynik + born-digital result PDFs). Flats-only; every live flat 2024–26 closed Negatywny/brak oferentów (matches spike's "keeps failing to sell"). browser-UA required (bot UA 403). Result PDFs mislabel kind ("lokal użytkowy") → anchored on the board "Dotyczy" not the doc. teryt 080206_3 high-confidence.

## TL;DR
Gmina Krosno Odrzańskie runs *pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* — residential flat auctions confirmed active in 2025 and 2026. BIP on SYSTEMDOBIP platform at `bip.krosnoodrzanskie.pl`. Structured HTML pages with predictable URLs; separate result-announcement board includes achieved prices. Low adapter effort — same SYSTEMDOBIP engine used by other Lubuskie gminas already spiked.

## 1. Sells municipal property at auction?
YES. Flat auctions confirmed:
- **9/GN/2026** (June 2026): *Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* — ul. B. Chrobrego 26/3, 78.19 m², wadium deadline 2026-06-03, wynik published 2026-06-11.
- **19/GN/2025**: Lokal mieszkalny, wieś Brzózka — resolved 2025.
- Numbering pattern `NN/GN/YYYY` covers all real-estate auctions (flats + land + commercial); flats appear regularly.
- Both open oral unlimited auctions (*ustny nieograniczony*) and limited ones observed. Flat auctions use the unlimited form.

## 2. Where published? (hosts + boards, URLs)
| Board | URL |
|---|---|
| Aktualny przetargi (current) | `https://bip.krosnoodrzanskie.pl/przetargi/202/status/` |
| Rozstrzygnięte (resolved) | `https://bip.krosnoodrzanskie.pl/przetargi/202/status/1/` |
| Unieważnione (cancelled) | `https://bip.krosnoodrzanskie.pl/przetargi/202/status/2/` (inferred) |
| Ogłoszenia o przetargach (article board) | `https://bip.krosnoodrzanskie.pl/269/Ogloszenia_o_przetargach/` |
| Wyniki przetargu (achieved-price board) | `https://bip.krosnoodrzanskie.pl/270/Ogloszenia_o_wyniku_przetargu/` |
| Lubuskie mirror | `https://bip.wrota.lubuskie.pl/ugkrosnoodrzanskie/przetargi/202/status` |

Individual auction detail URL pattern: `https://bip.krosnoodrzanskie.pl/przetargi/202/{numeric_id}/{url_encoded_slug}/`

PDF attachments (formal announcement scan, floor plan) linked from each detail page; formal text also reproduced in HTML body.

## 3. Format + rendering
- **Platform**: SYSTEMDOBIP (E-LINE Systemy Internetowe) — same engine seen in other Lubuskie BIPs.
- **Listing page**: Standard HTML table, no auth, no SPA, no JS-gated content. Static server-side render.
- **Detail page**: HTML with property fields (address, area, cena wywoławcza, wadium, termin) embedded in page body. Auctions also link a scanned-PDF announcement but the HTML already contains all structured data.
- **Result announcement**: Separate article in section 270; likely HTML text with achieved price (cena osiągnięta) and buyer identifier.
- **Bot blocks**: None detected. Standard HTTP GET, no Cloudflare or CAPTCHA observed.
- **XML export**: SYSTEMDOBIP pages have an XML download option — potential bonus for clean parsing.

## 4. Volume + achieved-price stream
- 2025: Auction sequence reached at least 23/GN/2025 by year-end (all property types). Flats confirmed at 19/GN/2025; likely 2–5 flat auctions per year based on numbering density.
- 2026 YTD: 9/GN/2026 already resolved by June 11 — on pace for similar annual volume.
- **Achieved-price stream**: Board `/270/` publishes *Ogłoszenia o wyniku przetargu* as separate HTML articles after each auction closes. Confirmed present for 2026 auction. This gives the price-achieved data needed for the aggregator.
- Overall volume is low-to-medium (small powiat seat, ~11 000 inhabitants) — expect ~3–6 flat auction events per year.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog**: Any existing SYSTEMDOBIP adapter (e.g. another Lubuskie gmina on the same engine). URL schema and page structure are identical.
- **Scrape path**: `GET /przetargi/202/status/` → parse listing → filter slugs containing `lokal_mieszkalny` → fetch detail → extract fields. Result price from `/270/` board filtered by matching auction number.
- **Blockers**: None identified. HTML is clean, no auth, no rate-limit signals encountered (429 above was workspace rate-limit, not target-site block).
- **Effort**: Low — reuse SYSTEMDOBIP parser; add gmina config entry. Estimated 0.5–1 day.
- **VERDICT: BUILD (Low effort).**
