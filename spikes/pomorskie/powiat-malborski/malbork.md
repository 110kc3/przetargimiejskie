# Spike — Malbork (Pomorskie · powiat malborski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miasto Malbork (Burmistrz Miasta Malborka) runs **ustny przetarg nieograniczony** on residential flat units (nieruchomości lokalowe) regularly — confirmed from adradar live listings June 2025 and June 2026. Multiple flats at one session is common (e.g. 4 lokale at ul. 17 Marca in one ogłoszenie). Source is the city BIP at **bip.malbork.pl**, which is a JavaScript SPA (no static HTML from web_fetch). Housing manager ZGKiM Malbork runs only najem (rental) auctions, not sales; flat sales go directly through the Burmistrz / city BIP. Result notices ("informacja o wynikach przetargu") are published as separate BIP articles on the settled-auctions board.

---

## 1. Sells municipal flats at auction?

**YES — confirmed LIVE.**

Burmistrz Miasta Malborka runs *ustny przetarg nieograniczony na sprzedaż nieruchomości lokalowej, stanowiącej własność Miasta Malborka*. Not bezprzetargowy to tenants — these are open market auctions. Examples live on adradar (all tagged organizer: Urząd Gminy/Urząd Miasta Malbork, text consistently reads "BURMISTRZ MIASTA MALBORKA"):

| Date | Address | Rounds | Area | Cena wywoławcza |
|---|---|---|---|---|
| 2026-06-10 | ul. Mickiewicza 36/2 | II przetarg | 121 m² / 5 pokoi | 518 479 zł |
| 2026-06-10 | ul. 17 Marca 21 (batch A) | III przetarg | 224 m² / 6 pokoi | 965 522 zł |
| 2026-06-10 | ul. 17 Marca 21 (batch B) | III przetarg | 208 m² / 7 pokoi | 909 080 zł |
| 2026-06-10 | ul. Grunwaldzka 22-23 | IV przetarg | 216 m² / 8 pokoi | 590 000 zł |
| 2025-03-25 | Myszewo 26 / lokal 2 | V przetarg | small / 2 pokoje | ~36 000 zł (wadium 9 000 zł) |

High round numbers (II–V) confirm a recurring programme — these are not one-off disposals. Many properties carry zabytek bonuses (50% bonifikata for registered buildings, art. 68 ust. 3 UGN), which adds a scraped field of interest.

City also auctions single-family houses and land at the same sessions.

ZGKiM Malbork: runs przetarg na najem lokali użytkowych (commercial leases) only. Flat sales do not go through ZGKiM. No PoMBM-equivalent found.

---

## 2. Where published? (hosts + boards, URLs)

**Primary source — Miasto Malbork city BIP:**

- Announcements board: `https://bip.malbork.pl/m,324,przetargi.html`
- Nieruchomości section: `https://bip.malbork.pl/m,48,nieruchomosci.html`
- Settled auctions / result notices board: `https://bip.malbork.pl/o,17,przetargi-rozstrzygniete.html`
- Individual result notice articles (pattern): `https://bip.malbork.pl/a,{id},informacja-o-wynikach-przetargu.html`
  - Confirmed examples: `/a,25313,…` (2021 era) and `/a,28711,…` (later)
- Przetargi otwarte: `https://bip.malbork.pl/o,258,przetargi-otwarte.html`

**Secondary / aggregators:**
- adradar Monitor Przetargów: `https://przetargi.adradar.pl/p/a/72461/Malbork/a` (picks up BIP within ~8 min of publication; full text visible without auth on free tier; paginated — 36 pages of archive as of 2026-06-27)
- listaprzetargow.pl: `https://listaprzetargow.pl/oferty/39552` (thinner coverage)

**NOT the source for flat sales:**
- ZGKiM Malbork `https://zgkim.malbork.pl/` — najem only
- Gmina Malbork wiejska `https://ugmalbork.mojbip.pl/` / `https://gmina.malbork.pl/` — different entity (Gmina wiejska), sells land/budynki gospodarcze, not city flats

---

## 3. Format + rendering

| Aspect | Finding |
|---|---|
| BIP engine | Custom JS SPA — all article content loaded client-side; `web_fetch` returns only a shell (`<title>Biuletyn Informacji Publicznej</title>`, no body text) |
| Actual content | Text-HTML rendered by the browser after JS executes; article text is plain Polish prose embedded in the DOM |
| Attachment type | Announcements appear to be inline HTML text (not PDFs); some older items may attach scanned PDFs (not confirmed for 2024–2026 flat sales — high-round przetargi seen only as text on adradar) |
| Auth / bot blocks | No login required to read BIP articles; no CAPTCHA observed. Chrome MCP can render pages if needed. Adradar mirrors full text without auth wall |
| Article URL pattern | `/a,{numeric_id},{slug}.html` — numeric IDs are not sequential in a simple way; board pages list articles as links |
| Result notices | Separate articles on same BIP, titled "informacja o wynikach przetargu"; pattern confirmed: separate article per auction result |

**Practical scraping route:** Board page `m,324` or `o,258` requires JS execution to list article links. Options: (a) headless browser / Playwright, (b) scrape adradar which already indexes them as static HTML, (c) discover a static RSS/XML feed (not found). Adradar route (b) is lowest friction but introduces a third-party dependency.

---

## 4. Volume + achieved-price stream

**Volume:** Active, recurring programme. On the adradar page for Malbork (36 archive pages), flat-sale przetargi from the Burmistrz appear at roughly 3–6 flat units per quarter. Given that many listings are II, III, IV, or V przetarg rounds, unsold inventory persists and re-enters — meaning the pipeline is not exhausted quickly.

**Achieved-price (wynik) stream:**
- BIP publishes "informacja o wynikach przetargu" as individual articles on the settled-auctions board (`/o,17,przetargi-rozstrzygniete.html`). Two confirmed result-notice URLs found via Google index (a,25313 and a,28711), both for Malbork city property auctions.
- These result notices are standard for Polish gminas under art. 38 UGN — they must state whether the auction resulted in a sale and the achieved price.
- **Limitation:** result notices are rendered by the same JS SPA as announcements; same scraping challenge applies.
- Adradar does NOT appear to index result notices (it mirrors announcement text only, marks old listings ARCHIWALNE without quoting the achieved price).

---

## 5. Adapter effort + verdict

**Closest analog:** Bytom / Gliwice pattern — city BIP (not a dedicated housing manager) publishes flat-sale przetargi as HTML articles on a JS SPA board; result notices are separate articles on same BIP.

**Blockers / risks:**

1. **JS SPA rendering required** — `web_fetch` gives empty shell. Need Playwright/Puppeteer or Chrome MCP for the board listing page to enumerate article links. Individual articles can potentially be fetched via adradar mirror instead. Medium complexity.
2. **Article ID discovery** — the board page (`m,324`) must be rendered to get the list of articles. No static feed found. Board pagination likely works via URL parameter (sort, page), but needs live confirmation.
3. **No achieved-price aggregator** — adradar doesn't carry result notices. Must scrape BIP result-notice articles directly (same JS-render challenge). This is the higher-value data stream and the harder one.
4. **Batch listings** — one ogłoszenie can cover 4 separate lokale (e.g. ul. 17 Marca 21 covers 4 units in one announcement). Parser must handle multi-unit tables inside a single article.
5. **Zabytek bonifikata field** — many flats are in registered buildings; the 50% bonifikata caveat is in-text and may need normalisation.
6. **Round-number tracking** — "III przetarg" language lets you track auction rounds per property (useful for "days on market" proxy), but requires parsing the ordinal from Polish text.

**Effort estimate:** Medium. JS rendering is the main lift; once the board + article scraper works, parsing is standard Polish-BIP prose. No auth wall, no PDFs confirmed for recent flat listings, no geo-blocking observed.

**Verdict: BUILD** — confirmed ustny przetarg nieograniczony na lokale mieszkalne, active volume, result notices present on BIP, low bot-risk. Closest pattern: Bytom (city BIP SPA with HTML articles). Main risk is the JS rendering requirement; mitigable via adradar for announcements though that sacrifices result-notice coverage.

---

## Sources

- adradar Monitor Przetargów — Malbork all: <https://przetargi.adradar.pl/p/a/72461/Malbork/a>
- adradar — ul. Mickiewicza 36/2 listing (BURMISTRZ MIASTA MALBORKA, II przetarg, 2026-06-10): <https://przetargi.adradar.pl/przetarg/mieszkania/Malbork/gmina/17049926>
- adradar — ul. 17 Marca 21 listing (III przetarg, 4 lokale, 2026-06-10): <https://przetargi.adradar.pl/przetarg/mieszkania/Malbork/gmina/17044672>
- adradar — ul. Grunwaldzka 22-23 (IV przetarg, 2026-06-10): <https://przetargi.adradar.pl/przetarg/mieszkania/Malbork/gmina/17049918>
- BIP Urząd Miejski w Malborku — przetargi board: <https://bip.malbork.pl/m,324,przetargi.html>
- BIP — nieruchomości: <https://bip.malbork.pl/m,48,nieruchomosci.html>
- BIP — przetargi rozstrzygnięte: <https://bip.malbork.pl/o,17,przetargi-rozstrzygniete.html>
- BIP — result notice example (2021): <https://bip.malbork.pl/a,25313,informacja-o-wynikach-przetargu.html>
- BIP — result notice example (later): <https://bip.malbork.pl/a,28711,informacja-o-wynikach-przetargu.html>
- ZGKiM Malbork (najem only, not flat sales): <https://zgkim.malbork.pl/>
- ZGKiM — przetargi na lokale: <https://zgkim.malbork.pl/przetargi-na-lokale-garaze/przetarg-nieograniczony-na-najem-lokali-uzytkowych>
