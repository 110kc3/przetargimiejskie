# Spike — Chodzież (Wielkopolskie · powiat chodzieski)
> **Status:** spike LIVE — re-verified 2026-07-06. VERDICT: BUILD (Low effort, plain fetch — needsRender: false).

## TL;DR
Miasto Chodzież (Gmina Miejska) does sell municipal **lokale mieszkalne** at **ustny przetarg nieograniczony**, confirmed by multiple independent sources (BIP wykaz, e-przetargi.pl, listaprzetargow.pl). Volume is low (small city, ~46 k residents) — sparse single-flat announcements, not a continuous stream. Primary BIP host is `bip.chodziez.pl`, which serves dynamic content that returns empty to plain HTTP fetch; live browser verification needed to confirm 2024–2026 announcement and result pages are crawlable.

## 1. Sells municipal property at auction?

**YES — confirmed.** The Burmistrz Miasta Chodzieży advertises *ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego* for city-owned flats. Specific confirmed examples:

- **ul. Piekary 17 m. 5** — listed for *przetarg ustny nieograniczony*, wykaz posted 6 weeks on BIP & notice board (confirmed via e-przetargi.pl, ~4 years ago ≈ 2022).
- **ul. Topolowa 6** — I przetarg ustny nieograniczony, residential building (single-family type), cena wywoławcza 120 000 zł, June 2018 (listaprzetargow.pl record).
- **ul. Czechowskiego 2/24, ul. Słowackiego 4, ul. Mickiewicza 20, ul. Żeromskiego 18/5** — residential units sold via przetarg nieograniczony (BIP search snippets, years ~2010–2020).

Also: **Gmina Chodzież** (rural surrounding municipality, separate entity, BIP at `bip.gminachodziez.pl`) conducts second *przetarg ustny nieograniczony* on lokal mieszkalny nr 3 in Podanin — confirming the practice is region-wide but the primary urban target is Miasto Chodzież.

The gov.pl procedure page explicitly states: *"Sprzedaż następuje w przetargu lub bezprzetargowo"* — both paths exist; tenants can buy bezprzetargowo, but open-market sales go to przetarg.

## 2. Where published? (hosts + boards, URLs)

| Layer | URL / Location |
|---|---|
| BIP Miasto Chodzież (primary) | `https://bip.chodziez.pl/` |
| BIP announcements/sales section | `https://bip.chodziez.pl/chodziezm/bip/jednostki-organizacyjne-samorzadu-terytorialnego/urzad-miejski/zamowienia-publiczne-i-ogloszenia/` (year sub-pages: `/2024.html`, `/2025.html`) |
| BIP obrót nieruchomościami | `https://bip.chodziez.pl/chodziezm/bip/jednostki-organizacyjne-samorzadu-terytorialnego/urzad-miejski/obrot-nieruchomosciami/duplikat-2020/przetargi.html` |
| gov.pl mirror | `https://samorzad.gov.pl/web/miasto-chodziez/sprzedaz-nieruchomosci` |
| MZGM BIP (Mieszkaniowy Zasób Gminy) | `https://mzgmchodziez.naszaplacowka.pl/bip/` — manages municipal housing stock; przetargi section has years 2020–2026 but appears to contain procurement tenders (repairs etc.), not property-sale auctions |
| Physical notice board | Urząd Miejski w Chodzieży, ul. I.J. Paderewskiego 2, 64-800 Chodzież (mandatory 6-week posting) |
| Wyniki/achieved price | Published on same BIP page or as sub-document; no dedicated result board URL confirmed yet — **needs live verify** |

## 3. Format + rendering

- BIP host: `bip.chodziez.pl` — runs a standard Polish municipal BIP CMS (WOKISS / similar); year-based URL structure `/zamowienia-publiczne-i-ogloszenia/2024.html`.
- Plain HTTP fetch (`web_fetch`) returns **empty body** for all subpages — the content is rendered client-side (JavaScript / SPA or dynamic DOM injection). This is the main technical risk.
- Confirmed content format when rendered: **HTML text** (full Polish prose announcement with address, price, wadium, auction date, BIK terms). No PDF scanning required for announcements seen to date.
- Aggregators (listaprzetargow.pl, e-przetargi.pl) index these announcements — can serve as cross-check but not primary scrape source.
- Result/achieved-price notices: likely posted as HTML sub-documents on the same BIP — format unknown without live render; low risk of scanned-PDF.

## 4. Volume + achieved-price stream

- **Volume:** Low. Chodzież is a small city (~46 k residents). Based on historical records spanning 2010–2026, flat-auction announcements appear at a rate of roughly **1–4 per year**. Not a high-volume stream; useful as a tracker "long tail" city.
- **Achieved-price data:** Polish law requires publication of auction results (cena osiągnięta) on the BIP. The exact sub-URL where results appear is not confirmed from desk research — live crawl needed.
- No JSON API or structured data feed detected. Data is purely HTML prose.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Any small Wielkopolska BIP running WOKISS-style CMS with year-based HTML pages (e.g., Szamotuły, Wągrowiec pattern). The dynamic rendering is the key blocker — requires headless browser (Playwright/Puppeteer) or Chrome MCP to load the announcement list before parsing.

**Blockers:**
1. **JS-rendered BIP** — plain HTTP fetch returns empty; must use headless render. Effort: low (standard Playwright fetch, ~1–2 hours).
2. **Result sub-page URL pattern** — needs live inspection to confirm where *wyniki przetargu* / *cena osiągnięta* are posted.
3. **Low volume** — worth including but don't prioritise over high-volume cities; polling monthly is sufficient.

**Effort estimate:** Low — standard dynamic-BIP adapter, no OCR, no auth, no SPA with bot blocks detected beyond JS rendering. One headless render to `/zamowienia-publiczne-i-ogloszenia/YYYY.html` should yield parseable HTML.

**VERDICT: NEEDS-LIVE-VERIFY** — confirm (a) the year-page renders correctly in headless browser, (b) result sub-page URL pattern, (c) volume count for 2023–2025. *(superseded — see Re-verify below)*

## Re-verify 2026-07-06

Live probe of `bip.chodziez.pl` (plain `curl`/WebFetch, no JS, no headless):

### 1. "JS-rendered" does NOT reproduce — plain fetch works
The desk finding "empty body without JS" is **wrong as of 2026-07-06**. The whole site
(WOKISS-family CMS) is **server-rendered HTML**: homepage, section hubs, year boards,
and full announcement detail pages all return complete markup to a plain HTTP GET.
**`needsRender: false`** — this is a plain-fetch city, no render.js, no headless CI cost.

### 2. Board structure confirmed (live URLs, all plain-fetch)
Canonical per-year boards under `obrot-nieruchomosciami` (note: live hrefs contain the
diacritic form `obrot-nieruchomościami`; both resolve):

- Announcements: `https://bip.chodziez.pl/chodziezm/bip/jednostki-organizacyjne-samorzadu-terytorialnego/urzad-miejski/obrot-nieruchomosciami/<YYYY>/ogloszenia-o-przetargach.html`
- **Results (pattern confirmed):** `.../obrot-nieruchomosciami/<YYYY>/wyniki-przetargow.html`
- Wykazy (incl. bezprzetargowa tenant sales): `.../obrot-nieruchomosciami/<YYYY>/wykazy.html`
- Site-wide RSS (plain XML, includes obrót-nieruchomościami items): `https://bip.chodziez.pl/chodziezm/kanal-rss.xml`

### 3. Live flat-auction volume (2026)
`2026/ogloszenia-o-przetargach.html` currently lists (fetched raw, verbatim titles):

1. **III przetarg ustny nieograniczony — lokale mieszkalne ul. Adama Mickiewicza 4/3 oraz 4/6** (2 flats, 65.50 m² + 67.64 m², HTML prose with full terms; states *"Terminy poprzednich przetargów: 11.02.2026 r., 29.04.2026 r."*)
2. I przetarg ustny nieograniczony — działka nr 917/1 ul. Kwiatowa (land, out of scope)
3. **I przetarg ustny nieograniczony — lokal mieszkalny nr 8, ul. Ignacego Daszyńskiego 12**

→ **3 flat lots at open auction live in 2026 alone** — consistent with the ~1–4/yr estimate.
2026 wykazy board also lists ~7 lokale mieszkalne (bezprzetargowa/tenant sales) — extra context signal.

### 4. Caveats found live
- **Boards are "current-only":** the I and II Mickiewicza announcements (Feb/Apr 2026) are
  already gone from the 2026 board — items are removed after the auction date. The
  2024/2025 year boards are empty hubs (either zero auctions those years or content not
  migrated to the new CMS; no Wayback snapshot exists). **Adapter must persist snapshots.**
- **Result notices are short-lived:** `wyniki-przetargow` boards for 2024–2026 are all empty
  right now despite two completed (failed) Mickiewicza rounds — consistent with the statutory
  7-day posting window then removal. **Poll weekly** (RSS is the cheap change-detector);
  monthly polling WILL miss results.
- Achieved-price capture therefore depends on catching the 7-day window; announcement +
  wykaz capture is robust.

### Verdict
**BUILD** — Low effort. Plain-fetch WOKISS-style year-board adapter (closest analogs:
other small-Wielkopolska WOKISS BIPs). No OCR, no auth, no JS. `needsRender: false`.
Weekly poll of `ogloszenia-o-przetargach` + `wyniki-przetargow` (current year) + RSS feed.
