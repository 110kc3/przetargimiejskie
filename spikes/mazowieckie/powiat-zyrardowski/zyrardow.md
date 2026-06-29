# Spike — Żyrardów (Mazowieckie · powiat żyrardowski)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miasto Żyrardów does sell municipal flats at open auction (*przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych*), confirmed in 2023, 2024, and Feb 2025. Volume is low (~1 flat per auction cycle, repeat of the same unit until sold). Announcements are published on two parallel BIP systems: the current SPA-based `bip.zyrardow.pl` (JavaScript-rendered, scraper-hostile) and an older static mirror at `archiwum.bip.zyrardow.pl` (proper HTML). Result notices (achieved price) appear on the same BIP under "Zakończone." The housing manager PGM Żyrardów Sp. z o.o. publishes its own BIP at `bip.pgm.zyrardow.pl` but only posts procurement (zamówienia publiczne), not flat-sale auctions — those stay with the city. Closest analog: **Bytom** (single-flat auctions cycled repeatedly, SPA BIP requiring headless fetch).

---

## 1. Sells municipal property at auction?

**YES — confirmed flat (lokal mieszkalny) auctions via przetarg ustny nieograniczony.**

Evidence (LIVE-VERIFIED via web search + page fetches):

- **2023-04-18 announcement** — `ul. Fryderyka Chopina 2 m. 4`, 93.51 m², zabytek, price wywoławcza **470 250 zł** (1% bonifikata). Auction date: 15 June 2023 at Centrum Kultury, Pl. Jana Pawła II 3. Source: [zyrardow.pl portal post](https://www.zyrardow.pl/wyjatkowo-atrakcyjne-mieszkanie-na-sprzedaz/), BIP link `bip.zyrardow.pl/a,113192,...`
- **2024-07-31 announcement** — same flat (Chopina 2 m. 4), same price 470 250 zł. Auction: 29 August 2024. Source: [zyrardowski24.pl](https://zyrardowski24.pl/20240731338179/przetarg-na-sprzedaz-lokalu-mieszkalnego-w-zyrardowie-juz-29-sierpnia-art-180)
- **2025-02 announcement** — same flat, price wywoławcza **444 510 zł** (reduced). Auction: 13 February 2025. Source: web search snippet (bip.zyrardow.pl current BIP).
- **Archival multi-flat auction (≥2013)** — `.doc` file on archiwum.bip.zyrardow.pl: `ogloszenie-przetarg-ustny-sprzedaz-lokali-mieszkalnych-przy-ul-1-maja-76-m-28-i-ul-sloneczna-2-m-58.doc` — confirms multiple flats offered in single auction in earlier years.
- **2013 result** — lokal nr 17 at ul. 1 Maja 82, auction completed 9 Oct 2013. Source: archiwum BIP "Zakończone."
- **2014 result** — lokal nr 26 at ul. Bolesława Limanowskiego 56. Source: archiwum BIP `4133,zakonczone`.

The gmina does **not** exclusively sell bezprzetargowo to tenants — open auctions are the norm for vacant/renovated flats. Some tenant buyouts likely occur separately under uchwała Rady Miasta but are not the primary channel observed.

---

## 2. Where published? (hosts + boards, URLs)

### Primary — City BIP (current)

- **Host:** `bip.zyrardow.pl` (also aliased as `bipumzyrardow.nv.pl`)
- **Announcements board (rozpoczęte):** `https://www.bip.zyrardow.pl/m,5805,rozpoczete.html`
- **Results board (zakończone):** `https://www.bip.zyrardow.pl/m,4936,zakonczone.html`
- **Year index 2025:** `https://www.bip.zyrardow.pl/m,5820,2025-r.html`
- **Year index 2024:** `https://www.bip.zyrardow.pl/m,5715,2024-r.html`
- **Przetargi ustne section:** `https://www.bip.zyrardow.pl/1061,ogloszenia-przetargi-ustne-pisemne-w-ramach-ustawy-o-gospodarce-nieruchomosciami`
- Individual auction pages use pattern: `https://www.bip.zyrardow.pl/a,NNNNNN,<slug>.html`
- **⚠ CRITICAL:** All above URLs return an empty HTML shell (`<title>Biuletyn Informacji Publicznej</title>`, no body content) — the site is a **React/Vue SPA** that requires JavaScript execution to render. Confirmed by web_fetch returning only `[Home] | [Calculators]` with no content.

### Secondary — Archival BIP (static HTML, fully scrapeable)

- **Host:** `archiwum.bip.zyrardow.pl`
- **Przetargi root:** `https://archiwum.bip.zyrardow.pl/1428,przetargi-ustne-pisemne-w-ramach-ustawy-o-gospodarce-nieruchomosciami`
- **Year subsections:** 2008–2022 all present with Zakończone subpages (e.g. `5281,2021-r`, `5332,2022-r`)
- **Renders:** proper static HTML, fully parseable without JS.
- **Coverage gap:** archival BIP ends at ~2022; 2023+ auctions are only on the SPA BIP.

### Tertiary — City portal

- `https://www.zyrardow.pl/ogloszenie-o-przetargu/` and `https://www.zyrardow.pl/nieruchomosci-na-sprzedaz/` — WordPress site, mirrors some announcements as news posts (not comprehensive).

### PGM Żyrardów BIP

- **Host:** `bip.pgm.zyrardow.pl`
- **Role:** municipal housing manager (zarządzanie zasobem komunalnym, administration)
- **Does NOT publish flat-sale auctions** — only zamówienia publiczne (procurement). Flat-sale auctions stay with Urząd Miasta / Wydział Gospodarki Nieruchomościami.

---

## 3. Format + rendering

| Source | Format | JS required | Notes |
|--------|--------|-------------|-------|
| `bip.zyrardow.pl` (current) | **SPA** (React or similar) | YES — returns empty shell without JS | Individual auction pages (`a,NNNNNN`) also empty without JS |
| `archiwum.bip.zyrardow.pl` | Static HTML | No | Classic Polish BIP CMS (ibip-style), proper DOM, tables |
| `archiwum.bip.zyrardow.pl` attachments | `.doc` / `.pdf` files | No (direct download) | Older auctions use Word .doc format for announcement body |
| `www.zyrardow.pl` portal | WordPress HTML | No | Human-readable news posts, not structured |

**Bot-blocking / auth:** No CAPTCHA or auth observed on archiwum. The current SPA BIP may load via public API endpoints (standard for Polish BIPs built on iBIP/eSesja stack) — worth checking XHR traffic with headless browser. No Cloudflare or rate-limit signals found.

---

## 4. Volume + achieved-price stream

**Volume:** LOW — roughly **1 flat offered per year**, often the same flat re-listed multiple times until sold (Chopina 2 m. 4 appeared in 2023, 2024, 2025 — same unit, three cycles). Earlier years (2013, 2014) had individual flat auctions too. Some batches with 2 flats exist (1 Maja 76 m. 28 + Słoneczna 2 m. 58 in archival .doc). Annual cadence is 1–3 auctions/year.

**Achieved price stream:**
- Result notices ("wynik przetargu" or "informacja o wyniku") are published under "Zakończone" on the BIP. Archival examples: lokal 1 Maja 82 m. 17 (2013), Limanowskiego 56 m. 26 (2014).
- For 2023–2025 auctions the results would be under `bip.zyrardow.pl/m,4936,zakonczone.html` — SPA-blocked for direct scraping.
- **No achieved prices retrieved in this spike** — the archival pages confirmed result notices exist but exact hammer prices not captured (archiwum BIP lists results by address without embedding the final price in the page title/snippet visible to search).

---

## 5. Adapter effort + verdict

**Closest analog: Bytom** — single-unit flat auctions, low volume, SPA-blocked current BIP, archival HTML available.

### Architecture

Two-phase adapter needed:

1. **Phase A — Archival (easy):** Scrape `archiwum.bip.zyrardow.pl` with standard HTTP + BeautifulSoup. Yields 2008–2022 history. HTML is clean, standard ibip DOM.

2. **Phase B — Current (hard):** `bip.zyrardow.pl` requires headless browser (Playwright/Puppeteer) to render the SPA and extract current announcements and result notices (2023+). This is the main blocker.

   Alternative: inspect XHR calls when the SPA loads — many Polish iBIP/eUrząd SPA instances call a JSON REST API (e.g. `/api/articles?category=przetargi`) that can be hit directly without JS rendering. Worth a 30-minute dev investigation before committing to full headless.

### Blockers / risks

- **SPA BIP** is the primary risk. If no public JSON API is discoverable, Playwright adds ~1 week of setup and ongoing fragility.
- **Low volume** (≤3 flats/year) means the data signal is thin — likely not worth building if the platform needs meaningful listing density. However, the same Chopina 2 flat has been re-listed 3x, so each listing cycle is a genuine auction event.
- **No result prices in this spike** — the achieved-price stream existence is confirmed (pages exist under Zakończone) but prices themselves need a headless fetch to confirm structure and extract value.
- Wydział Gospodarki Nieruchomościami contact for clarification: tel. 46 880 06 25 / 46 880 06 21, room 2.16, ul. B. Limanowskiego 44.

### Verdict

**BUILD** — flat auctions are real, regular, and open (not bezprzetargowo). The SPA blocker is solvable (XHR API probe first; Playwright fallback). Low volume is a minor concern given the re-listing pattern. **Medium effort** (SPA API probe + archival scraper + result parser).

---

## Sources

- BIP Urząd Miasta Żyrardowa (current, SPA): https://www.bip.zyrardow.pl/1061,ogloszenia-przetargi-ustne-pisemne-w-ramach-ustawy-o-gospodarce-nieruchomosciami
- BIP Urząd Miasta Żyrardowa (archiwum, static HTML): https://archiwum.bip.zyrardow.pl/1428,przetargi-ustne-pisemne-w-ramach-ustawy-o-gospodarce-nieruchomosciami
- Portal UMŻ — 2023 auction announcement: https://www.zyrardow.pl/wyjatkowo-atrakcyjne-mieszkanie-na-sprzedaz/
- Portal UMŻ — current przetarg page: https://www.zyrardow.pl/ogloszenie-o-przetargu/
- zyrardowski24.pl — 2024 auction announcement: https://zyrardowski24.pl/20240731338179/przetarg-na-sprzedaz-lokalu-mieszkalnego-w-zyrardowie-juz-29-sierpnia-art-180
- BIP PGM Żyrardów (housing manager, procurement only): https://bip.pgm.zyrardow.pl/
- PGM main site: https://pgm.zyrardow.pl/
- Archiwum BIP — 2013 results (Zakończone): https://archiwum.bip.zyrardow.pl/3832,zakonczone
- Archiwum BIP — 2014 results: https://www.bip.zyrardow.pl/4133,zakonczone?tresc=28020
- Archiwum BIP — multi-flat announcement .doc: https://archiwum.bip.zyrardow.pl/plik,2926,ogloszenie-przetarg-ustny-sprzedaz-lokali-mieszkalnych-przy-ul-1-maja-76-m-28-i-ul-sloneczna-2-m-58.doc
