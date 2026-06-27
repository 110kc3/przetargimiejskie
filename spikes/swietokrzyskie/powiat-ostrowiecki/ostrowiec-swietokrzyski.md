# Spike — Ostrowiec Świętokrzyski (Świętokrzyskie · powiat ostrowiecki)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (High confidence).

## TL;DR

Gmina Ostrowiec Świętokrzyski does NOT auction municipal flats publicly. All 235 przetarg-nieruchomości entries on the BIP across its entire machine-readable XML history break down as: 188 nieruchomość niezabudowana, 42 nieruchomość zabudowana, 5 lokal użytkowy — zero lokal mieszkalny. Municipal flat sales are handled bezprzetargowo (direct sale to sitting tenants with statutory priority right, per Uchwała Nr XV/99/2015 i Zarządzenie Nr IV/437/2015). The TBS entity (OTBS) has sold a small stock of new-build flats (ul. Kopernika 34A/34B, now exhausted as of 2021), but this is not an open przetarg ustny nieograniczony stream. This city is land/commercial-only.

## 1. Sells municipal property at auction?

**Yes — but land and commercial only. No residential flats (lokale mieszkalne) at open auction.**

- **Gmina BIP przetargi-nieruchomości** (bip.um.ostrowiec.pl): Full XML scan of all 235 historical entries confirms **zero "Lokal mieszkalny"** entries. Property types auctioned: land plots (188), built-up properties/commercial/industrial (42), commercial premises/garages (5).
- **Municipal flat sales mechanism:** Bezprzetargowo to tenants (statutory first-right-of-refusal under art. 34 ust. 1 pkt 3 Ustawy o Gospodarce Nieruchomościami). Published as a public announcement listing (wykaz) with 21-day priority window for tenants; no competitive bidding. Confirmed by PDF document at https://bip.um.ostrowiec.pl/attachments/download/23506 (2016, listing 8 flats across Kilińskiego 22A, Cegielniana 2/4, Starokunowska 1, Tylna 1/5, Stodolna 15, Osiedle Stawki 48 — all direct tenant sales).
- **OTBS (Ostrowieckie TBS Sp. z o.o.):** City-owned social housing company that sold new-build flats at ul. Kopernika 34A/34B. Currently "brak wolnych lokali" (no stock available as of 2021). OTBS BIP "Mieszkania – sprzedaż" section shows a single static notice: sold out. OTBS przetargi (page 12 of their site) show one historic "PRZETARG USTNY NIEOGRANICZONY – os. Ogrody 28" for a building, but this is TBS selling its own asset, not a regular gmina flat auction stream.
- **ZUM (Zakład Usług Miejskich, ul. Żabia 23):** Municipal services company managing 1,067 residential units (38,950 m² total). ZUM handles **rental** of municipal flats and maintenance, not sales. Their przetargi section (zum-ostrowiec.4bip.pl) covers only service contracts (e.g., mulczowanie działek gminnych).

**Conclusion on Q1:** The gmina does NOT conduct "ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych" at open competitive auction. Flat sales are bezprzetargowo to tenants only.

## 2. Where published? (hosts + boards, URLs)

| Source | URL | Content |
|---|---|---|
| Gmina BIP – przetargi nieruchomości (list) | https://bip.um.ostrowiec.pl/przetargi-nieruchomosci/3037 | Land + commercial auctions only |
| Gmina BIP – XML feed | https://bip.um.ostrowiec.pl/przetargi-nieruchomosci/xml/1/100 | Machine-readable, 3 pages × 100 records |
| Gmina BIP – individual auction | https://bip.um.ostrowiec.pl/przetarg-nieruchomosci/xml/{id}/1 | Per-item XML endpoint |
| UM Ostrowiec main site | https://um.ostrowiec.pl/przetargi.html | Mirror/cross-post of BIP auctions |
| ZUM BIP | https://www.zum-ostrowiec.4bip.pl/ | Service contracts only |
| OTBS BIP | https://www.otbsostrowiec.4bip.pl/ | TBS construction procurements + flat rental |
| OTBS "Mieszkania – sprzedaż" | https://www.otbsostrowiec.4bip.pl/index.php?idg=7&id=22&x=2 | TBS flat sales (currently exhausted) |

**Result notices:** The BIP system posts an "ogłoszenie o wyniku przetargu" on the same article page with a "PRZETARG ROZSTRZYGNIĘTY" status tag. No separate results board found; result price is included in the status update on the same article. The BIP explicitly states per RODO that entries are **removed** 7 days after an oral auction (art. 5(1)(e) RODO), making scraping a live-or-nothing window.

## 3. Format + rendering

- **BIP przetargi-nieruchomości list page:** Standard HTML, server-side rendered (Logonet CMS, CMS version 2.9.0). Paginated table (10/page default, configurable 5–25). Filter form with GET params (`?rodzaj=`, `?typ_przetargu=`, `?rok=`, `?status=`). No auth/bot blocking observed.
- **XML feed:** Native machine-readable endpoint (`/przetargi-nieruchomosci/xml/{page}/{per_page}`) returning structured XML with `<adres-nieruchomosci>`, `<przetarg-na>`, `<typ-przetargu>`, `<rodzaj-nieruchomosci>`, `<cena-wywolawcza>`, `<data-przetargu>`. Clean, no auth needed.
- **Individual auction detail:** HTML page with structured `<table>` (key-value rows). PDF attachments for full announcement text (application/pdf). PDFs are text-based (not scanned), directly extractable.
- **OTBS BIP:** 4bip.pl platform (AkcessNet). HTML, JS disabled warning shows, content available without JS. Static articles.
- **ZUM site:** Joomla CMS, HTML, standard scraping-friendly.
- No SPA, no login/auth wall, no CAPTCHA observed on any source.

**Critical limitation:** The BIP system **deletes** closed auction pages 7 days after the oral auction (RODO compliance notice explicitly states this). Achieved-price result notices appear to be included in the same page before deletion. This means a near-real-time poller is required — no historical archive is accessible.

## 4. Volume + achieved-price stream

- **Gmina flat auctions:** Volume = 0. No stream exists.
- **Gmina land/commercial auctions:** ~235 entries since 2020 visible in XML (pages 1–3 × 100 max). Roughly 40–50 per year based on page count (24 HTML pages × 10 = ~235 total). All land or built property.
- **Achieved price:** The BIP marks entries as "PRZETARG ROZSTRZYGNIĘTY" and result notices (wynik przetargu) with achieved price are linked from the individual BIP article. However, these pages are **removed 7 days post-auction**. No persistent result archive found on the BIP.
- **OTBS flat sales:** Ad-hoc, small volume (one building, ~20–30 units at ul. Kopernika 34A/34B, sold 2020–2021; stock exhausted). Not a recurring stream.

## 5. Adapter effort + verdict

**Closest analog:** None of the existing adapters (Gliwice, Zabrze, Bytom, Kraków, Tarnowskie Góry) is a good match — those cities either auction flats through a dedicated housing manager BIP or through the city BIP with lokal mieszkalny type. Ostrowiec has no such stream.

**Blockers:**
1. **No flat auctions exist.** The fundamental precondition for a flat-auction adapter is absent. All municipal flat disposals go bezprzetargowo to tenants.
2. **RODO deletion policy** removes BIP entries 7 days post-auction, preventing archival scraping — a real-time poller would be required even if content existed.
3. **OTBS stock exhausted** — TBS flat sales are not a reliable recurring source.

**Risks:** Low risk of false negative — full XML scan of 235 entries confirms zero lokal mieszkalny ever auctioned by the gmina. The 2016 PDF document directly confirms the bezprzetargowy mechanism for tenant sales.

**Verdict: NO-BUILD.** This city auctions only land and commercial property publicly. Municipal flats are sold direct-to-tenant (bezprzetargowo). No adapter warranted; revisit only if city policy changes (e.g., new uchwała authorising open flat auctions).

---
*Sources consulted:*
- https://bip.um.ostrowiec.pl/przetargi-nieruchomosci/3037 (BIP przetargi list — LIVE)
- https://bip.um.ostrowiec.pl/przetargi-nieruchomosci/xml/1/100 (XML feed pages 1–3 — LIVE, full scan)
- https://bip.um.ostrowiec.pl/attachments/download/23506 (2016 bezprzetargowy flat sales PDF — LIVE)
- https://bip.um.ostrowiec.pl/attachments/download/47820 (2025 land auction PDF — LIVE, confirmed not flats)
- https://www.otbsostrowiec.4bip.pl/index.php?idg=7&id=22&x=2 (OTBS "Mieszkania – sprzedaż" — LIVE)
- https://www.otbsostrowiec.4bip.pl/index.php?idg=8&id=37&x=5&y=96 (OTBS przetargi 2025 — LIVE)
- http://zum.ostrowiec.pl/przetargi (ZUM przetargi — LIVE)
- https://um.ostrowiec.pl/130-wydzial-mienia-komunalnego.html (Wydział Mienia Komunalnego)
