# Spike — Starogard Gdański (Pomorskie · powiat starogardzki)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miejska Starogard Gdański (Prezydent Miasta) does auction municipal flats via *przetarg ustny nieograniczony* — confirmed from live HTML on `starogard.pl/obwieszczenia`. Volume is low (2–4 flat auctions/year). The primary public BIP (`bip.starogard.pl`) is a JavaScript SPA that returns a blank shell to web_fetch; however, announcement text is mirrored on the static `starogard.pl/obwieszczenia` page (fully readable HTML). Results board exists at `bip.starogard.pl/m,447,wyniki-przetargow.html` (SPA — requires JS render). No separate housing manager (ZNM/TBS); property disposal handled directly by Wydział Gospodarki Gruntami, Geodezji i Rolnictwa. Closest analog: **Bytom** (low-volume city BIP with separate results page, direct Prezydent announcements).

---

## 1. Sells municipal property at auction?

**YES — confirmed flat auctions (przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych).**

Live-fetched from `starogard.pl/obwieszczenia` (static HTML, no JS needed):

| Date | Address | Area | Mode |
|---|---|---|---|
| Nov 2020 | ul. Chojnicka 45 | 94.98 m² | przetarg ustny nieograniczony |
| Sep 2020 | ul. Osiedlowa 5B/3 | 33.45 m² (udział 3/4) | przetarg |
| Mar 2021 | ul. Skarszewska 2C/14 | 49.02 m² | przetarg |
| Mar 2021 | ul. Piłsudskiego 10/8 | 49.08 m² | przetarg |

Separately confirmed via search snippet: auction held **12 March 2025** (room 101, UM Starogard Gdański) for a lokal mieszkalny. Also confirmed: a specific BIP article URL indexed by Google — `bip.starogard.pl/a,26175,i-przetarg-ustny-nieograniczony-nasprzedaz-lokalu-mieszkalnego-polozonego-wstarogardzie-gdanskim-prz.html`.

Mixed disposal policy: some flats sold *bezprzetargowo* to existing tenants (e.g. ul. ks. Ściegiennego 3A/18, Apr 2025; ul. Chojnicka 28/2, Jan 2020). Tenantless or atypical flats go to open auction. Both streams exist; adapter targets only the auction stream.

**No dedicated housing manager.** The Spółdzielnia Mieszkaniowa "Kociewie" (ul. Sobieskiego 7) runs its own cooperative member flat auctions — those are separate, not gmina property.

---

## 2. Where published? (hosts + boards, URLs)

### Announcement board (ogłoszenia przetargów)

| Channel | URL | Readable? |
|---|---|---|
| BIP przetargi (SPA) | `https://bip.starogard.pl/m,32,przetargi.html` | No — JS SPA, blank via web_fetch |
| BIP article (example) | `https://bip.starogard.pl/a,26175,i-przetarg-ustny-nieograniczony-nasprzedaz-lokalu-mieszkalnego-polozonego-wstarogardzie-gdanskim-prz.html` | No — same SPA shell |
| City obwieszczenia (static HTML) | `https://starogard.pl/obwieszczenia/` | **YES — fully readable, no JS** |
| City przetargi mirror | `https://starogard.pl/przetargi.html` | No — empty on web_fetch |

### Results board (wyniki przetargów / achieved price)

| Channel | URL | Readable? |
|---|---|---|
| BIP wyniki (SPA) | `https://bip.starogard.pl/m,447,wyniki-przetargow.html` | No — JS SPA |

### Key observation

`starogard.pl/obwieszczenia` is the **practical scraping target**: it publishes wykaz nieruchomości przeznaczonych do zbycia (the pre-auction notice) as plain HTML. Each zarządzenie (mayoral order) is posted as a text block with the flat address, area, KW number, and disposal mode. The full przetarg announcement with date/time/wadium/cena wywoławcza is then published on `bip.starogard.pl` (SPA only — requires headless browser). Achieved-price results are also on the BIP SPA results page.

Department contact: Wydział Gospodarki Gruntami, Geodezji i Rolnictwa, ul. Gdańska 6, pok. 204, tel. (58) 530-6075 / 530-6076.

---

## 3. Format + rendering

- **`starogard.pl/obwieszczenia`**: plain HTML, single scrollable page with all announcements in reverse-chronological order. Each entry is a text block under a date heading. No pagination observed. Attachments referenced as "Pliki do pobrania" (no visible link hrefs in fetched output — likely relative or JS-injected). **DESK-readable, no auth, no bot block detected.**
- **`bip.starogard.pl`**: React/Angular SPA. `web_fetch` returns only a bare `<html>` shell with nav links; zero article content. Requires JS execution (Playwright/Puppeteer). Individual article URLs follow pattern `a,{ID},{slug}.html` — crawlable by ID increment if the SPA renders them server-side (unconfirmed; Google has indexed at least one article, so they are in the Google index, suggesting server-side render or static prerender may exist).
- **Results page**: SPA (same BIP engine) — no confirmed static fallback.
- **No PDF/scan observed** for announcement text; wykazs are inline HTML text on obwieszczenia page.
- **No auth required** on either public-facing channel.
- **No bot-block signals** detected on `starogard.pl`.

---

## 4. Volume + achieved-price stream

- **Announcement volume**: approximately 2–4 flat auctions per year (DESK estimate from obwieszczenia archive spanning 2020–2021, plus one confirmed 2025 auction). Low volume relative to Śląsk cities.
- **Mix**: roughly 50/50 split between open-auction flats and bezprzetargowo-to-tenant sales based on obwieszczenia sample.
- **Achieved-price stream**: exists at `bip.starogard.pl/m,447,wyniki-przetargow.html` but behind JS SPA — not directly fetchable. No static mirror of results confirmed. This is the **primary blocker** for a price-tracking adapter.
- **Price range** (komornik auctions in city for context, not gmina — DESK from adradar.pl): flat prices in the city cluster at ~3 500–5 600 zł/m²; gmina lots likely similar or slightly below market (bezprzetargowo discounts apply, but auction lots priced at estimated value).

---

## 5. Adapter effort + verdict

### Closest analog: Bytom

Both are mid-size cities with:
- Low flat-auction volume (2–5/year)
- Direct Prezydent/Prezydium announcements rather than a dedicated housing manager
- BIP as primary official channel
- A secondary static HTML mirror for pre-auction notices

### Differences from analog

| Factor | Bytom | Starogard Gdański |
|---|---|---|
| BIP engine | Static HTML or light JS | Full JS SPA (blank on fetch) |
| Static mirror | BIP is static | `starogard.pl/obwieszczenia` (wykaz only, not full przetarg) |
| Results page | BIP HTML | BIP SPA (not fetchable) |
| Volume | ~5–10/year | ~2–4/year |

### Blockers

1. **BIP is a JS SPA**: full przetarg announcement (cena wywoławcza, wadium, termin, warunki) lives only in the SPA. The `starogard.pl/obwieszczenia` page gives only the wykaz (preliminary notice listing address + disposal mode) — not the full auction details.
2. **Results not accessible without JS**: achieved price stream requires headless render of the BIP results page. No static fallback confirmed.
3. **Low volume**: 2–4 auctions/year makes the ROI marginal unless combined with other Pomorskie cities.

### Mitigations

- The BIP SPA may support server-side rendering (Google has indexed at least one article URL). A targeted Playwright fetch of individual article IDs (incrementing from known base) could work.
- `starogard.pl/obwieszczenia` can act as a trigger detector: when a new lokal mieszkalny appears there with "przetarg" mode, fetch the corresponding BIP article via headless browser.
- Volume shortfall can be offset by bundling with nearby Tczew, Kwidzyn, or Chojnice in a Pomorskie batch.

### Verdict

**BUILD — Medium effort.**

- Source 1 (trigger): `starogard.pl/obwieszczenia` — static HTML scrape, trivial.
- Source 2 (detail + results): `bip.starogard.pl` SPA — requires Playwright; effort is moderate but the pattern is reusable across all Polish BIPs using this engine.
- Volume is low but real; flat auctions are confirmed to occur (not land-only).
- Confidence: **High** on auction existence; **Medium** on results-page accessibility (SPA render unconfirmed headless).

---

## Sources

- `https://starogard.pl/obwieszczenia/` — LIVE-FETCHED; full obwieszczenia archive 2020–2021 with flat auction examples
- `https://bip.starogard.pl/m,32,przetargi.html` — BIP przetargi index (SPA, blank fetch)
- `https://bip.starogard.pl/m,447,wyniki-przetargow.html` — BIP wyniki (SPA, blank fetch)
- `https://bip.starogard.pl/a,26175,i-przetarg-ustny-nieograniczony-nasprzedaz-lokalu-mieszkalnego-polozonego-wstarogardzie-gdanskim-prz.html` — indexed BIP flat-auction article (SPA, blank fetch; confirms article URL pattern)
- `https://przetargi.adradar.pl/p/mieszkania/73196/Starogard+Gda%C5%84ski/a` — LIVE-FETCHED; komornik auctions in city (not gmina, but confirms city flat price range)
- Search snippets: confirmed March 2025 przetarg ustny nieograniczony held at UM; April 2025 bezprzetargowo flat to tenant
