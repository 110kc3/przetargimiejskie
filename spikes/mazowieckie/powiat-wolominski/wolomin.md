# Spike — Wołomin (Mazowieckie · powiat wołomiński)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: NO-BUILD (Medium effort if re-evaluated, Low volume).

## TL;DR

Gmina Wołomin (Burmistrz Wołomina, Wydział Geodezji i Gospodarki Nieruchomościami) **does** run *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* — confirmed by a live, actively-running series (Dec 2024 → Mar 2025 → May 2025 rokowania → Mar 2026 → Apr 2026). However, the entire observed volume is a **single package of 4 flats at ul. Chopina 1**, sold jointly in one lot. This is not a multi-unit recurring flat-auction stream; it is a one-off disposal of a distressed block. No dedicated housing manager (ZGL/MZGL) exists for Wołomin — flat auctions are managed directly by the city's geodesy department. Achieved-price notices are not published on the web (BIP article stubs contain only metadata, no body text; no "informacja o wyniku" page found for any recent round). **Low signal-to-noise: technically a flat auction exists, but volume is ~1 event/year involving 4 flats sold as one lot with no scraped price stream. Not worth an adapter at this time.**

## 1. Sells municipal property at auction?

**YES — including flats, confirmed LIVE.**

Burmistrz Wołomina runs *pierwsze/drugie/kolejne ustne przetargi nieograniczone* on residential flats. Confirmed series for ul. Chopina 1 (lokale nr 1, 2, 3, 8):

| Round | Date | Cena wywoławcza | Outcome |
|---|---|---|---|
| 1. przetarg | 2024-12-10 | 420 000 zł (4 lokale łącznie) | bezskuteczny |
| 2. przetarg | 2025-03-26 | 360 000 zł | bezskuteczny |
| Rokowania | 2025-05-14 | 299 000 zł (negocjacje) | unknown (no result notice found) |
| 1. przetarg (new round) | 2026-03-11 | 420 000 zł | bezskuteczny (adradar: ARCHIWALNE) |
| 2. przetarg | 2026-04-28 | announced | status unknown as of spike date |

Also sells land plots (działki, e.g. Nowe Lipiny series Oct 2025 — multiple lots). Land volume > flat volume.

**Critical caveat:** all flat auctions observed are for the **same 4-flat package at Chopina 1**, sold as a single lot. This is not a rolling programme of individual flat sales. No evidence of bezprzetargowe sale (tenant pre-emption) suppressing auction volume — the flats appear uninhabitable/vacant and are being auctioned openly, but the stock is extremely limited.

No separate housing manager (ZGL, TBS, MZGL, etc.) publishing flat-sale przetargi was found for Wołomin. The Miejski Zakład Obsługi Szkół i Przedszkoli (MZOSiP) and PWIK exist but handle schools/utilities, not housing. The `mzowolomin.eb2b.com.pl` platform handles public procurement (works/services), not property sales.

## 2. Where published? (hosts + boards, URLs)

**Primary publication — wolomin.org (city website):**
- Announcements category: `https://wolomin.org/category/aktualnosci/ogloszenia/nieruchomosci-na-sprzedaz/` (JS-rendered WordPress; web_fetch returns empty body)
- Przetarg category: `https://wolomin.org/category/aktualnosci/ogloszenia/przetarg/` (same)
- Individual post example: `https://wolomin.org/wyciag-z-ogloszenia-o-przetargu-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-czterech-lokali-mieszkalnych-stanowiacych-wlasnosc-gminy-wolomin/`

**Secondary — BIP (wolomin.bip.net.pl):**
- Board: `https://wolomin.bip.net.pl/?c=322` (Tablica ogłoszeń → Wydział Geodezji i Gospodarki Nieruchomościami → Zbycie/nabycie mienia)
- BIP articles are metadata stubs only (title, date, responsible officer) — **no body text, no embedded PDF inline**. The BIP article for "VI przetarg — lokale ul. Sikorskiego 88" (2010) and the result notice (2010) both render as empty stubs with only metadata tables. Full announcement content lives on wolomin.org, not BIP.

**Achieved-price notices:** Not found on BIP or wolomin.org for any 2024–2026 round. The 2010-era BIP had a "wynik przetargu" article stub (id=1586) but also body-less. No cena osiągnięta data stream is publicly available online.

**Aggregators:** adradar.pl monitors and republishes these announcements (confirmed: `https://przetargi.adradar.pl/p/a/53750/Wo%C5%82omin/przetargi`); snippet text is usable but adradar is a third party, not the primary source.

## 3. Format + rendering

| Surface | Format | Bot-accessible? |
|---|---|---|
| wolomin.org posts | WordPress, JS-rendered (React/Vue SPA shell) | **NO** — web_fetch returns empty body every attempt; requires JS execution (Chrome MCP or Puppeteer) |
| BIP (wolomin.bip.net.pl) | Server-rendered HTML (Sputnik BIP platform) | **YES** — HTML renders fine but article bodies are empty stubs |
| Attachment PDFs (if any) | Suspected scanned-PDF (older docs) or text-PDF; URL pattern `/przetarg_chopina/` 404s | Unconfirmed — single fetch attempt returned empty |
| adradar.pl | Server-rendered HTML | YES — but third-party aggregator, not primary source |

**Key finding:** wolomin.org is a JavaScript SPA (WordPress with JS rendering). Every direct web_fetch of a wolomin.org post URL returns an empty body. Scraping this source requires headless browser / Chrome MCP. The BIP is reachable but article bodies contain no text content — the BIP serves as a notice board title index only, with full documents on the main site.

## 4. Volume + achieved-price stream

**Volume (flat auctions):** Extremely low. Only 1 active package identified across the entire research window (2024–2026): 4 flats at ul. Chopina 1, sold jointly as 1 lot. The series has run through at least 5 rounds (2 przetargi + rokowania in 2024–2025, then reset in 2026) without a confirmed sale. Compare: land/plot auctions are more frequent (Nowe Lipiny Oct 2025: at least 5 simultaneous lots).

**Achieved-price stream:** NOT AVAILABLE publicly. No "informacja o wyniku przetargu" pages found for 2024–2026 rounds on either wolomin.org or BIP. The 2010 BIP had a wynik-przetargu stub but it was empty. This is a significant gap — there is no machine-readable price-achieved feed.

**Annual cadence estimate:** ~1–2 flat auction batches/year, always the same distressed block, no indication of a broader housing disposal programme.

## 5. Adapter effort + verdict

**Closest analog:** None of the high-volume BUILD targets (Gliwice, Zabrze, Bytom, Kraków, Tarnowskie Góry) is a good match. Wołomin is structurally closest to a very-low-volume single-asset disposal, not a rolling programme.

**Blockers:**
1. **JS-rendered primary source** — wolomin.org requires headless browser to scrape; server-side fetch returns nothing. This adds significant adapter complexity (Chrome MCP dependency or Playwright).
2. **No achieved-price data** — no public wynik/cena osiągnięta page exists. The adapter would only deliver announcements, not price outcomes — half a data point.
3. **Minimal volume** — 1 lot (4 flats bundled) per year, often failing to sell. Not worth pipeline overhead.
4. **BIP content is stubs only** — the BIP board (`?c=322`) is the canonical legal notice location but article bodies are empty; real content is on the JS-only wolomin.org.

**Risks:**
- The Chopina 1 series may conclude (sale or demolition) with no replacement flat-auction programme, leaving the adapter permanently idle.
- Future flat disposals may be done bezprzetargowo to tenants (per standard gmina practice) if/when new stock emerges.

**Verdict: NO-BUILD.** Volume is too low (effectively 1 batch/year, 1 lot), achieved-price stream does not exist publicly, and the primary source requires JS execution. Revisit only if Wołomin announces a broader flat disposal programme (e.g. multiple separate lots across different addresses).

---

### Sources

- `https://wolomin.org/wyciag-z-ogloszenia-o-przetargu-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-czterech-lokali-mieszkalnych-stanowiacych-wlasnosc-gminy-wolomin/` — Wyciąg z ogłoszenia, 1. przetarg Chopina 1 (Dec 2024)
- `https://wolomin.org/drugi-ustny-przetarg-nieograniczony-na-sprzedaz-nieruchomosci-stanowiacych-wlasnosc-gminy-wolomin/` — 2. przetarg Chopina 1 (Mar 2025)
- `https://wolomin.org/rokowania-na-sprzedaz-lokali-mieszkalnych-przy-ul-chopina-1-w-wolominie/` — Rokowania Chopina 1 (May 2025)
- `https://wolomin.bip.net.pl/?c=322` — BIP: Tablica ogłoszeń, Zbycie/nabycie mienia (LIVE-VERIFIED: fetched, HTML renders, bodies empty)
- `https://wolomin.bip.net.pl/?a=1462` — BIP: VI przetarg lokale ul. Sikorskiego 88 (2010 stub, body-less)
- `https://wolomin.bip.net.pl/?a=1586` — BIP: wynik przetargu ul. Reja (2010 stub, body-less)
- `https://przetargi.adradar.pl/p/a/53750/Wo%C5%82omin/przetargi` — Adradar: archiwalne przetargi gm. Wołomin (LIVE-VERIFIED: fetched, HTML renders)
- `https://przetargi.adradar.pl/przetarg/mieszkania/Wo%C5%82omin/miasto/16777815` — Adradar: 1. przetarg Chopina 1 (Mar 2026, 420 000 zł)
- `https://przetargi.adradar.pl/przetarg/mieszkania/Wo%C5%82omin/miasto/15437867` — Adradar: Rokowania Chopina 1 (May 2025, 299 000 zł)
