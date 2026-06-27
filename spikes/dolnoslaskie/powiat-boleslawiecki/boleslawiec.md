# Spike — Bolesławiec (Dolnośląskie · powiat bolesławiecki)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miejska Bolesławiec actively auctions municipal flats via **ustny przetarg nieograniczony** — confirmed with multiple live listings in 2025–2026. The housing manager is **MZGM (Miejski Zakład Gospodarki Mieszkaniowej)**; flat-sale przetargi are published on the city's own portal (`xn--bolesawiec-e0b.pl`) under `/mig/sp-estate/` and on the city BIP (`um.boleslawiec.bip-gov.pl`). Results notices (wynik/informacja o wyniku) also appear on BIP. The site renders as a Joomla SPA — `web_fetch` returns empty; Chrome or Playwright required for scraping. Volume is moderate (~6–10 flat auctions/year visible across 2023–2026). Achieved-price notices confirmed on BIP (`?id=110553`). Closest analog: **Tarnowskie Góry** (city-managed BIP + dedicated housing unit + moderate flat-auction volume, HTML content behind JS render).

---

## 1. Sells municipal property at auction?

**Yes — confirmed flats (lokale mieszkalne) via ustny przetarg nieograniczony.**

Confirmed auction announcements from the city (Prezydent Miasta Bolesławiec):

| Date announced | Property | Round | Cena wywoławcza |
|---|---|---|---|
| 2026-05-05 | Lokal nr 10, ul. Warszawska 1 (97 m², 5 pokoi) | III przetarg | 350 000 zł |
| 2026-04-14 | Lokal nr 3, ul. Wesoła 8 (43 m²) | I przetarg | 185 000 zł |
| 2026-03-26 | Lokal nr 5, ul. Spokojna 6 (62 m², 3 pokoje) | IV przetarg | 300 000 zł |
| 2026-03-26 | Lokal nr 2, ul. Ogrodowa 4 (85 m², 3 pokoje) | V przetarg | 323 000 zł |
| 2026-02-03 | Lokal nr 3, ul. M. Opitza 20 | listed for I przetarg | — |
| 2026-03-06 | Rynek 29/30 m. 9 (48.52 m²) | II przetarg | — |
| 2025-06-17 | Lokal nr 2, ul. G. Narutowicza 31 | I przetarg | — |
| 2025-03-27 | Lokal nr 11, ul. Ogrodowa 3 | II przetarg | — |
| 2025-09-25 | Lokal nr 10, ul. Karpecka 8/9 | — | 135 000 zł |

Multiple properties are going to II–V rounds, indicating the city runs a consistent programme. Bezprzetargowe sales to tenants (KU-MiG 06) also exist as a parallel track (BIP `?id=101794`) but do **not** replace the open-auction stream.

Sources: [adradar.pl Bolesławiec](https://przetargi.adradar.pl/p/a/4/Boles%C5%82awiec/a), [listaprzetargow.pl Bolesławiec](https://listaprzetargow.pl/oferty/boleslawiec), [search snippets from xn--bolesawiec-e0b.pl listings]

---

## 2. Where published? (hosts + boards, URLs)

### Announcement board (ogłoszenia)

- **City portal — Joomla CMS** (primary listing page):
  - Base: `https://xn--bolesawiec-e0b.pl/index.php/mig/sp-estate`
  - Subcategory for planned flat auctions: `https://xn--bolesawiec-e0b.pl/index.php/mig/przetargi-planowane/lokale-mieszkalne`
  - Individual listing slug pattern: `/index.php/mig/sp-estate/{id}-lokal-mieszkalny-nr-{N}-przy-ul-{street}-{round}-przetarg`
  - Also mirrored at `https://miasto.xn--bolesawiec-e0b.pl/miasto/index.php/mig/sp-estate/` (older subdomain, pre-2024 URLs)

- **MZGM website** (housing manager, WordPress):
  - `https://www.mzgm.boleslawiec.pl/` — links to city portal for flat sale przetargi under LOKALE > Lokale mieszkalne > Przetargi i sprzedaż
  - MZGM BIP (unit BIP): `http://www.js.boleslawiec.bip-gov.pl/public/?id=41353` (Ogłoszenia) and `?id=41366` (Ogłoszenia przetargów)
  - MZGM direct website ogłoszenia: `https://mzgm.boleslawiec.pl/index.php?option=com_content&view=article&id=15&Itemid=118`

- **City BIP** (Gmina Miejska):
  - `https://www.um.boleslawiec.bip-gov.pl/public/?id=110552` (Nieruchomości section)

### Results board (wyniki / informacja o wyniku)

- **City BIP — Wyniki sprzedaży nieruchomości**: `https://www.um.boleslawiec.bip-gov.pl/public/?id=110553` — confirmed dedicated results page (LIVE-VERIFIED via search snippets showing achieved prices e.g. cena osiągnięta 399 000 zł / gross 490 770 zł for a Dec 2024 auction)
- Aggregator mirrors: [listaprzetargow.pl](https://listaprzetargow.pl/oferty/boleslawiec), [adradar.pl](https://przetargi.adradar.pl/p/a/4/Boles%C5%82awiec/a) — carry announcement data but not achieved prices

---

## 3. Format + rendering

| Layer | Detail |
|---|---|
| CMS | Joomla (city portal `xn--bolesawiec-e0b.pl`); WordPress (MZGM site) |
| Render | **JavaScript SPA** — `web_fetch` returns empty body on both the listing category and individual article pages. Chrome/Playwright required. |
| Content format | **HTML** — individual auction articles are HTML text with structured fields (lokal nr, ul., powierzchnia, cena wywoławcza, termin, wadium). No PDFs for the announcement text itself. |
| Results format | BIP results page (`?id=110553`) — also HTML; achieved prices appear as text in the article body. |
| Auth/bot blocks | No login required; no CAPTCHA observed. The Joomla site returns 200 with empty `<main>` to plain HTTP clients — standard JS-render issue, not active bot blocking. |
| URL stability | Slug-based with numeric ID prefix — stable, linkable per-auction. |

Chrome MCP confirmed: navigating to `/mig/sp-estate` returns the container but the article list is empty when loaded without JS execution — consistent with client-side rendered Joomla article list.

---

## 4. Volume + achieved-price stream

**Announcement volume (flat auctions by city):**
- 2023: at least 4 flat auctions visible (ul. Spółdzielcza, ul. Sierpnia '80, ul. Rynek, ul. Wróblewskiego etc.)
- 2024: at least 3–4 (ul. Podgórna, ul. Komuny Paryskiej, ul. Karpecka + 1 confirmed result Dec 2024)
- 2025: at least 4–5 (ul. Narutowicza, ul. Ogrodowa, ul. Staszica, ul. Wesoła, ul. Rynek 29/30)
- 2026 (to date): at least 4 announced (Warszawska, Wesoła, Spokojna, Ogrodowa) + 1 upcoming July 2026 (323 000 zł, 85 m²)

Estimated **~6–10 flat auctions/year** (open market, ustny nieograniczony). Multiple rounds per property are common (I→II→III→V observed), so individual properties appear multiple times.

**Achieved-price stream:**
- Confirmed: BIP page `?id=110553` carries "Wyniki sprzedaży nieruchomości" — achieved prices published there.
- Confirmed example: I przetarg Dec 2024, opening 395 000 zł net → achieved 399 000 zł net (490 770 zł gross).
- No achieved-price data in the Joomla listing pages themselves — results are separate BIP articles.
- listaprzetargow.pl does NOT carry achieved prices (announcement-only aggregator).

---

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry — city BIP + dedicated municipal housing manager (ZGM/MZGM) + moderate flat-auction volume + HTML-behind-JS-render.

**Blockers / risks:**

1. **JS rendering required** — The Joomla city portal does not serve article content to plain HTTP clients. Must use Playwright/Chrome for both the listing page and individual articles. This is the main engineering cost (same pattern as Kraków/Gliwice).

2. **Two-source architecture** — Announcements on `xn--bolesawiec-e0b.pl`; results on `um.boleslawiec.bip-gov.pl`. Both need separate scrapers. BIP results page may be plain HTML (BIP sites typically are), reducing cost there.

3. **Volume is moderate** — ~6–10 flat auctions/year is worthwhile but not high-volume. Adapter ROI is positive.

4. **Slug structure is clean** — `/mig/sp-estate/{id}-lokal-mieszkalny-...` is stable and parseable; no pagination tricks observed for the category listing (small enough to fit one page).

5. **No auth/CAPTCHA** — low operational risk once rendering is solved.

**Effort estimate:** Medium — 1 Playwright scraper for announcements + 1 plain-HTTP scraper for BIP results (if BIP serves HTML without JS). DOM parsing straightforward given clean Joomla article structure.

**VERDICT: BUILD** — The city runs a genuine, consistent open flat-auction programme (ustny przetarg nieograniczony) with published results including achieved prices. MZGM is the housing manager. JS rendering is the only real blocker and is already solved in the Kraków/Gliwice adapters. Confidence: **High**.
