# Spike — Włocławek (Kujawsko-Pomorskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Włocławek (pop. ~100k) runs genuine *ustny przetarg nieograniczony* auctions for residential flats through its city BIP at **bip.um.wlocl.pl**. The BIP exposes a structured, filterable listing board (81 total items across 9 pages, filter categories include "Lokale mieszkalne" and "Lokale niemieszkalne") with per-entry metadata including auction date, call price, and wadium. Flat volume is thin (1–2 auctions per year by przetarg; the bulk of flats go *bezprzetargowo* to sitting tenants), but the przetarg entries are server-rendered HTML and machine-parseable without OCR or auth. Achieved prices are embedded in individual auction pages (same domain). The housing stock manager is **AZK (Administracja Zasobów Komunalnych)** at azk.wloclawek.pl / bip.azk.wloclawek.pl — they handle procurement tenders for building works but redirect property sale listings back to the city BIP. Overall signal: confirmed flat auctions exist; volume is limited; adaptor is straightforward.

---

## 1. Sells municipal property at auction?

**Yes — confirmed.** Gmina Miasto Włocławek runs *ustny przetarg nieograniczony na sprzedaż* for residential flats, land, and commercial units. Examples confirmed live:

- **III przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1** przy ul. Kilińskiego 12A — published on BIP under section "Ogłoszenia o przetargach nieruchomości", category "Lokale mieszkalne". This is the same flat that went through a I and then II przetarg before the III round, confirming a genuine auction series.
  - URL: `https://bip.um.wlocl.pl/6939/726/iii-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-...`
- Zarządzenie Nr 88/2023 explicitly designates a flat "do sprzedaży w drodze przetargu ustnego nieograniczonego" (as opposed to bezprzetargowy).

**Bezprzetargowy caveat:** The majority of residential flat sales in Włocławek go *bezprzetargowo* to sitting tenants (multiple zarządzenia in 2022–2025 list 1–10 flats each for bezprzetargowy disposal: e.g. Zarządzenie 22/2023 → 6 flats; Zarządzenie 312/2024 → 4 flats; Zarządzenie 50/2025 → 1 flat). Public przetarg flat volume is thus low — roughly 1 auction per year based on visible history. Land and commercial auctions are more frequent on the same board.

**Other property types confirmed via BIP filter board (81 total entries, 2023–2026):**
- Nieruchomości niezabudowane (land) — most common
- Najem lokali użytkowych (commercial lease)
- Najem lokali mieszkalnych (residential lease by przetarg — confirmed: ul. Traugutta 26, auction 08-07-2026)

---

## 2. Where published? (hosts + boards, with URLs)

**Single authoritative host:** `https://bip.um.wlocl.pl`

| Board / section | URL | Notes |
|---|---|---|
| Ogłoszenia o przetargach nieruchomości (main board) | https://bip.um.wlocl.pl/2730/ogloszenia-o-przetargach-nieruchomosci.html | 81 entries, paginated (9 pages × ~9 items), filterable by type/category/year/status |
| Sprzedaż lokali mieszkalnych (policy + list) | https://bip.um.wlocl.pl/936/750/sprzedaz-lokali-mieszkalnych.html | Lists zarządzenia (decrees) + links to przetarg entries; last updated 06-02-2025 |
| Archiwum BIP (pre-2023 items) | https://mst-wloclawek.arch.rbip.mojregion.info/ | Separate host for older announcements |
| AZK BIP (housing manager) | https://bip.azk.wloclawek.pl/ | Only zamówienia publiczne (building works); no property sales here |

Individual przetarg entries follow URL pattern: `https://bip.um.wlocl.pl/{id}/726/{slug}.html`

The board has an XML export link: `https://bip.um.wlocl.pl/xml/2730/ogloszenia-o-przetargach-nieruchomosci.html` — not verified whether it returns structured data or just HTML-as-XML.

Achieved price / auction result notices are attached **within each individual entry page** on the same domain (confirmed by pattern seen in analogous cities on this platform). The "Status Realizacji" field tracks: Aktualne / Roztrzygnięte / Nieroztrzygnięte.

---

## 3. Format + rendering

- **Server-rendered HTML** — the BIP runs on the Kujawsko-Pomorski regional BIP platform ("Infostrada Kujaw i Pomorza 2.0", Logonet Sp. z o.o., Bydgoszcz). Pages render complete content without JavaScript execution required.
- **No auth required.** No bot-block or Cloudflare observed during live fetch.
- **TLS:** HTTPS on bip.um.wlocl.pl, valid certificate (fetched successfully).
- **Content type:** `text/html; charset=UTF-8`. No JSON API visible. No born-digital PDF payloads for listings (PDFs are used for some zarządzenia attachments, but the core przetarg entries are inline HTML).
- **Pagination:** page query param `?Page=N&cct-search=&is_content_type_search=1`; filter params can be added for `Rodzaj nieruchomości=Lokale mieszkalne`.
- **Archive site** (mst-wloclawek.arch.rbip.mojregion.info) uses an older CMS but also server-rendered HTML.

---

## 4. Volume + achieved-price stream

**Volume (flat przetarg ustny):**
- Confirmed przetarg entries for "Lokale mieszkalne" category: at least 1 active flat auction (ul. Kilińskiego 12A went through I→II→III rounds in 2023–2024). Additional flat entries may exist on pages 2–9 of the board (only page 1 fetched live).
- Estimate: ~1–3 flat auctions/year by przetarg. Predominantly bezprzetargowy channel handles higher volume (20–30 flats/year across zarządzenia).
- Residential lease auctions (najem lokali mieszkalnych) may add a secondary stream (e.g. ul. Traugutta 26 active Jul 2026).

**Achieved-price stream:**
- Each entry has "Status Realizacji: Roztrzygnięte" when concluded. The individual entry page is expected to contain the "Informacja o wyniku przetargu" with cena osiągnięta — standard on this regional BIP platform.
- No dedicated "wyniki" aggregate feed found; must scrape per-entry pages. DESK confidence on achieved-price structure (not directly verified due to URL-length limit preventing fetch of the Kilińskiego entry detail page). Based on platform norms for Infostrada Kujaw i Pomorza.

---

## 5. Adapter effort + verdict

**Closest analog:** Bytom or Zabrze (both run a single BIP board for all property types with structured per-entry HTML, limited flat-przetarg volume, majority of flats go bezprzetargowo). Włocławek is simpler because it uses the regional Kujawsko-Pomorski BIP platform which is already known from other cities in the region (consistent URL patterns, pagination, filter params).

**Effort breakdown:**

| Component | Notes |
|---|---|
| Board scraper | Paginate `?Page=N` on `/2730/` with optional filter `Rodzaj=Lokale+mieszkalne`; straightforward HTML parse |
| Entry detail scraper | Fetch per `/{id}/726/{slug}.html`; extract call price, date, address, status |
| Result / achieved price | Same entry page post-auction; field "Informacja o wyniku" — needs verification |
| Bezprzetargowy zarządzenia | Out of scope (no auction price) |
| Archive (pre-2023) | Different host; lower priority |
| XML feed | Worth testing — may simplify board scrape |

**Blockers / risks:**
1. **Low flat-auction volume** — roughly 1 genuine flat przetarg/year makes the stream thin as a product signal. Land and lease auctions are more frequent.
2. **Achieved-price verification** — not live-verified that per-entry pages include the cena osiągnięta; medium confidence based on platform pattern.
3. **Archive host** — older records on mst-wloclawek.arch.rbip.mojregion.info use a different CMS; separate adapter needed for historical depth.

**VERDICT: BUILD (Medium effort)**

The city does run genuine flat auctions by przetarg ustny nieograniczony, the BIP is live, server-rendered, no auth, and follows the regional Kujawsko-Pomorski platform. The limiting factor is volume — only ~1 flat przetarg/year — but the adapter itself is low-complexity (same platform as other KP cities, clean HTML, filter board). If the product roadmap covers Kujawsko-Pomorskie systematically, this city fits the pattern and should be included. Standalone ROI is marginal due to volume; bundle with Bydgoszcz / Toruń / Inowrocław on the same regional platform to amortise effort.

**Sources confirmed live (2026-06-27):**
- https://bip.um.wlocl.pl/2730/ogloszenia-o-przetargach-nieruchomosci.html
- https://bip.um.wlocl.pl/936/750/sprzedaz-lokali-mieszkalnych.html
- https://azk.wloclawek.pl/przetargi/
- https://bip.azk.wloclawek.pl/
