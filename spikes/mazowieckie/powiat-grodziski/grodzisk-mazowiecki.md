# Spike — Grodzisk Mazowiecki (Mazowieckie · powiat grodziski)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Grodzisk Mazowiecki sells municipal flats (lokale mieszkalne) at ustny przetarg nieograniczony (public oral auction). Announcements and results are published on a dedicated portal `nieruchomosci.grodzisk.pl` (WordPress CMS, structured HTML) AND mirrored on BIP `bip.grodzisk.pl` (SPA, JS-rendered). Volume is solid: plan shows 8 flats in 2026, 5/year in 2027-2030; at least 4 flats already in auction rounds as of mid-2026. Achieved-price data available on BIP result boards. Medium effort due to dual-source structure and SPA BIP requiring JS rendering.

## 1. Sells municipal property at auction?
YES — confirmed. Gmina Grodzisk Mazowiecki (Burmistrz) conducts **ustny przetarg nieograniczony na sprzedaż gminnych lokali mieszkalnych**. Multiple confirmed cases:
- `WGN.6840.3.2011` — I/II/III przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego wraz z oddaniem w użytkowanie wieczyste udziału w nieruchomości gruntowej (BIP archive).
- 2026 active auctions: ul. Pileckiego 4 m.8 (III przetarg), ul. Wólczyńska 10A m.11 (II przetarg), ul. Bałtycka 10 m.26 (I+II przetarg), ul. Bairda 4/28 (I+II przetarg).
- Separate sale mode also exists: **bezprzetargowo** to existing tenants (pursuant to uchwała on mieszkaniowy zasób gminy), but vacant flats go to open auction.
- Plan sprzedaży: 8 lokali w 2026, po 5 lokali rocznie w latach 2027-2030 (confirmed via BIP/search snippet).

## 2. Where published? (hosts + boards, URLs)

### Announcement board
- **Primary portal:** `https://nieruchomosci.grodzisk.pl/` — dedicated WordPress site operated by Wydział Gospodarki Nieruchomościami (WGN). Posts appear under `/sprzedaz/` (current offers) and `/category/planowane/` (planned).
  - Example: `https://nieruchomosci.grodzisk.pl/2026/05/11/sprzedaz-lokalu-mieszkalnego-ul-wolczynska-10a-m-11/`
  - Example: `https://nieruchomosci.grodzisk.pl/2026/04/20/sprzedaz-lokalu-mieszkalnego-ul-baltycka-10-26/`
- **BIP mirror:** `https://bip.grodzisk.pl/m,2042,przetargi.html` → year folders → `Wydział Gospodarki Nieruchomościami` subsection.
  - 2025 WGN: `https://bip.grodzisk.pl/m,5188,wydzial-gospodarki-nieruchomosciami.html`
  - 2026 WGN: `https://bip.grodzisk.pl/m,5545,wydzial-gospodarki-nieruchomosciami.html`
  - Individual auction articles: `https://bip.grodzisk.pl/a,{ID},{slug}.html`

### Result/achieved-price board
- BIP article pages include wynik przetargu (auction result + achieved price) as a follow-up entry in the same WGN section — same slug pattern with "wynik" or "rozstrzygniecie" suffix.
- `nieruchomosci.grodzisk.pl` posts are updated or followed with result posts in same category.

## 3. Format + rendering

| Source | Format | Rendering |
|---|---|---|
| `nieruchomosci.grodzisk.pl` | WordPress HTML, structured posts | Static HTML — `web_fetch` works cleanly |
| `bip.grodzisk.pl` | React/Angular SPA | Empty shell via `web_fetch`; **requires JS rendering** (Chrome MCP or Playwright) |
| BIP attachments | PDF (text-layer, not scanned) | Standard PDF extraction |

The `nieruchomosci.grodzisk.pl` portal is the easier scraping target: standard WordPress with consistent post structure (date in URL, property address in title, price/details in body). No auth, no bot-blocks observed.

BIP is a SPA that fully renders in browser — page text extractable via Chrome MCP `get_page_text` once JS has run. Year-structured navigation: `/m,{ID},rok-{YYYY}.html` → WGN submenu → individual article pages `/a,{ID},{slug}.html`.

## 4. Volume + achieved-price stream

- **Active pipeline 2026:** min. 4 flats already in active auction rounds (I/II/III przetarg) as of mid-2026.
- **Plan:** 8 flats in 2026; 5 flats/year in 2027, 2028, 2029, 2030 = ~28 auctions over 5 years.
- **Achieved-price:** available in BIP result posts under same WGN section; BIP publishes "wynik przetargu" with final price. Adradar (`przetargi.adradar.pl`) also aggregates these for cross-reference.
- Historical records go back to 2009 on BIP, confirming long-running programme.
- No paywall, no registration required to read announcements or results.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Similar to Żyrardów or Piaseczno (Mazowieckie BIP SPA pattern + separate nieruchomości portal).

**Scraping strategy (recommended):**
1. **Primary scraper:** `nieruchomosci.grodzisk.pl` — WordPress REST API or HTML scraper on `/sprzedaz/` feed. Clean, stable, no JS required.
2. **Secondary/result scraper:** BIP WGN year pages — requires JS render (Playwright/Chrome), then extract article list and follow individual pages for przetarg results + achieved prices.

**Blockers / risks:**
- BIP is SPA: needs headless browser for full content (medium complexity).
- `nieruchomosci.grodzisk.pl` is separate from BIP — two sources to maintain, but nieruchomosci is more reliable and scrape-friendly.
- Achieved prices are on BIP (not consistently on nieruchomosci portal) — need BIP scraper for price data.
- Flat numbering convention inconsistent between old WGN codes (WGN.6840.X.YYYY) and new portal posts.

**Effort:** Medium — two sources, one needs JS rendering, but both are well-structured and public.

**VERDICT: BUILD (Medium effort)** — active flat auction programme, 5-8 auctions/year, dual-source HTML (one WordPress, one SPA BIP), achieved prices on BIP result boards, no auth/bot blocks.
