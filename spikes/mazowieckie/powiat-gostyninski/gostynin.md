# Spike — Gostynin (Mazowieckie · powiat gostyniński)

> **Status:** re-spiked LIVE — 2026-07-06. VERDICT: **NO-BUILD** (no recurring open flat-auction stream — one flat total in 2024–2026, twice negative; result publication inconsistent; see Re-verify below).

## TL;DR

Gmina Miasta Gostynina (Mazowieckie, ~20k pop.) runs confirmed *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych* for municipal flats. Both open-auction and *bezprzetargowa* (tenant-buyout) tracks co-exist. The primary publisher is the city BIP at `umgostynin.bip.org.pl` (bip.org.pl-hosted CMS). Announcements and *wykazy* are published as individual HTML child pages. A result-notice board structure exists (`Protokół z przeprowadzonych...` and `Ogłoszenie Burmistrza...` entries visible in the nav tree) but no achieved-price result-notice specifically for flat auctions was LIVE-fetched — deep-link pages exceeded fetch token limits. Volume is low (~2–5 flat-auction lots/year). NEEDS-LIVE-VERIFY to confirm: (a) the result-notice board for property auctions publishes achieved prices in HTML, and (b) the most recent flat auction dates (2024/2025/2026 or only older).

---

## 1. Sells municipal property at auction?

**YES — confirmed for lokale mieszkalne.**

The Burmistrz Miasta Gostynina runs *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych* from the municipal housing stock. Both auction and direct-sale tracks confirmed:

**Open-auction track (przetarg ustny nieograniczony):**
- BIP przetargi index (id/4, `umgostynin.bip.org.pl/przetargi/index/id/4`) contains numbered entries explicitly titled *"Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 11 znajdującego się w budynku mieszkalnym wielorodzinnym nr 1 na terenie Gostynina - Kruka wraz z przynależnym udziałem w działce gruntu"* (entry 45, date 2021-09-10) and matching entry 46 (lokal nr 4, same building). Entry 50 confirms another: *"przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 11 znajdującego się w budynku mieszkalnym wielorodzinnym nr 1 położonym w Gorzewie przy ul. Kruk"*.
- Entry 22 (2004-12-07): *"Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 27 znajdującego się w budynku mieszkalnym wielorodzinnym nr 1 na terenie Gostynina"*.
- Q2 2024 city activity report (`gostynin.pl/790,ii-kwartal-2024`) confirms: *"Burmistrz Miasta Gostynina ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż prawa własności lokalu mieszkalnego oznaczonego numerem 83 w budynku mieszkalnym wielorodzinnym w Gostyninie przy ul. Wojska Polskiego 28B wraz z pomieszczeniem przynależnym, udziałem w częściach wspólnych budynku oraz w gruncie."* — recent (2024) open oral auction for a municipal flat confirmed.

**Bezprzetargowy (tenant-buyout) track — also active:**
- BIP PDF (Zarządzenie Nr 107/2022 Burmistrza, `wykaz_walewski.pdf`): *"z zasobu Gminy Miasta Gostynina przeznacza się do sprzedaży w drodze bezprzetargowej niżej wymieniony lokal mieszkalny wraz z udziałem w działce gruntu, najemcy zamieszkującemu w tym lokalu"* — ul. Parkowa 24, lokal 48.39 m², cena 152,300 zł. This is a parallel track (art. 34 ust. 1 pkt 3 ugn) and will not generate public auction announcements.
- Q2 2024 report also lists bezprzetargowa sales: ul. Polna 12 (lokal nr 16) and ul. Parkowa 3 (lokal nr 5) designated for tenant buyout in the same quarter — confirming both tracks run concurrently.

**Verdict on Q1:** The gmina does auction flats at open oral unrestricted auctions. The open-auction track targets vacant/unclaimed units; the bezprzetargowa track covers sitting tenants. The open-auction track is publicly announced and is the relevant feed for this aggregator.

---

## 2. Where published? (hosts + boards, URLs)

### Primary publisher: Gmina Miasta Gostynina — Wydział Zarządzania i Obrotu Nieruchomościami

| Type | URL | Notes |
|---|---|---|
| BIP root | `https://umgostynin.bip.org.pl/` | bip.org.pl-hosted CMS |
| BIP przetargi (nieruchomości) | `https://umgostynin.bip.org.pl/index//id/4667` | "Przetargi na sprzedaż, najem i dzierżawę nieruchomości" — property-specific auction board |
| Ogłoszenia Burmistrza (obwieszczenia) | `https://umgostynin.bip.org.pl/id/4666` | Announcements tree; contains flat auction sub-entries |
| BIP przetargi legacy index | `https://umgostynin.bip.org.pl/przetargi/index/id/4` | Numbered entry list (numbered sequentially; dates and titles text-searchable) |
| Wykazy nieruchomości przeznaczonych do sprzedaży | `https://umgostynin.bip.org.pl/id/2294` | Property-for-sale wykazes index |
| Wykaz (Zarządzenie 165/2025) bezprzetargowy | `https://umgostynin.bip.org.pl/id/6157` | Dec 2025 — bezprzetargowa (monitoring only, not auction) |
| Wykaz (Zarządzenie 54/2026) | `https://umgostynin.bip.org.pl/id/6316` | June 2026 — dzierżawa (not flat sale; confirms active BIP updates) |
| City activity report (Q2 2024) | `https://www.gostynin.pl/790,ii-kwartal-2024` | Contains narrative of flat auction announcement (ul. Wojska Polskiego 28B lokal 83) |
| Gospodarowanie nieruchomościami (procedural) | `https://umgostynin.bip.org.pl/id/2192` | Describes bezprzetargowa sales procedure for tenants |

### Result/achieved-price board
- The BIP nav tree (under id/4666) contains multiple *"Protokół z przeprowadzonych..."* entries (IDs: 2018, 2225, 2413, 3209) and *"Ogłoszenie Burmistrza Miasta..."* entries. However, the fetched content of those IDs shows they relate to NGO program consultations, NOT property auction results.
- **NOT yet confirmed:** a dedicated property-auction result-notice page (protokół/wynik przetargu na lokal mieszkalny) with achieved price. The BIP structure suggests such pages would be individual child entries under the property auctions board (id/4667) but were not directly fetched with achieved-price content.
- **NEEDS-LIVE-VERIFY**: Navigate to `umgostynin.bip.org.pl/index//id/4667` and check sub-entries for recent flat auction result notices.

### Physical notice board
Per art. 35 ugn, wykazy posted for 21 days at UM Gostynin, ul. Rynek 26. BIP mirrors digitally.

---

## 3. Format + rendering

| Aspect | Finding |
|---|---|
| CMS | bip.org.pl hosted CMS — server-rendered HTML throughout |
| BIP platform | Standard bip.org.pl (shared hosting for many Polish gminy); fully static-HTML pages generated server-side |
| Deep-link behaviour | `?id=` and `/id/NN` URL patterns work directly (no session-cookie redirect observed; unlike Tomaszów Mazowiecki BIP) |
| Content encoding | UTF-8 |
| Announcement format | HTML body text (individual child pages), typical fields: lokal address, lokal nr, area (m²), cena wywoławcza, wadium amount/deadline, auction date/time/venue |
| PDF attachments | Likely for floor-plan annexes and zarządzenia (e.g., `wykaz_walewski.pdf` confirmed as text PDF, scanned-free) |
| Result notices | Structure TBD — NEEDS-LIVE-VERIFY. Likely HTML child pages titled "Informacja o wynikach..." or "Protokół z przebiegu przetargu" (consistent with other bip.org.pl CMS cities). For MOPS procurement a "protokół z przebiegu przetargu" page (id/4769) was found but is for a car sale, not flats. |
| Auth/bot blocks | None observed. bip.org.pl is fully open-access. No Cloudflare, no CAPTCHA, no JS-rendered content. |
| SPA | No — fully server-rendered HTML |
| Pagination | Likely numbered list on legacy index; child pages as individual BIP entries (standard bip.org.pl pattern) |

---

## 4. Volume + achieved-price stream

### Auction volume
Confirmed flat-auction events on BIP (open przetarg track only):
- 2004: lokal nr 27 (entry 22)
- 2021: lokal nr 11 (entry 45) + lokal nr 4 (entry 46) at Kruk/Gorzewo; lokal nr 11 at ul. Kruk Gorzewo (entry 50)
- 2024: lokal nr 83, ul. Wojska Polskiego 28B (confirmed via Q2 2024 city report + BIP wykaz)

Pattern: **2–5 flat-auction lots per year**, with batches when a set of units becomes vacant. Low but consistent — volume dips and surges depending on municipal housing stock turnover. Note that the BIP listing shows sequential entries going back to 2003 with only ~4–5 flat-auction entries across ~20 years, but the Q2 2024 evidence confirms activity is ongoing and not historical-only.

### Achieved-price stream
- **Not directly confirmed** via live fetch of a property-auction result page.
- Structural evidence: bip.org.pl CMS has individual sub-page entries for results, and the nav tree under `id/4666` shows multiple "Protokół z przeprowadzonych..." entries — some of which likely relate to property (not all are NGO consultations). Need to fetch the property-auction result sub-pages specifically.
- **Risk**: If achieved prices are only recorded in signed protokół PDFs (scan) rather than HTML body, extraction requires OCR. Common for older entries; newer cities often post HTML result notices. **NEEDS-LIVE-VERIFY.**

---

## 5. Adapter effort + verdict

### Closest analog
**Sierpc** or similar small Mazowieckie city with bip.org.pl-hosted BIP, low-volume flat auctions, standard HTML structure — or Tomaszów Mazowiecki if the session-free URL behaviour confirms (lower complexity than Tomaszów).

### Architecture sketch
1. **Discovery**: GET `https://umgostynin.bip.org.pl/index//id/4667` → walk child anchor links → filter for "lokal mieszkalny" / "przetarg ustny" titles → enqueue individual announcement pages.
2. **Announcement parser**: BeautifulSoup on HTML body — extract: address, lokal nr, area m², cena wywoławcza, wadium, przetarg date/time. Straightforward for standard bip.org.pl template.
3. **Result-notice discovery**: Poll the property auction board sub-pages for "wynik" / "rozstrzygnięcie" / "protokół z przebiegu przetargu" entries → fetch → extract achieved price.
4. **Wykaz monitoring**: Optionally poll `id/2294` (nieruchomości przeznaczone do sprzedaży) for new wykaz entries (pre-auction pipeline).
5. **Frequency**: Low volume → weekly polling sufficient.

### Blockers / risks
- **NEEDS-LIVE-VERIFY — result-notice format**: Must confirm that property-auction results are in HTML (not scan PDFs). If scan PDFs: add Tesseract OCR layer (~1 day extra).
- **Low volume**: ~2–5 auctions/year. Adapter is lightweight but ROI per city is low. Best combined with a sweep of nearby Mazowieckie small cities using the same bip.org.pl adapter.
- **No pagination needed** at current volume — all entries fit on one board page.
- **Bezprzetargowa dominance**: Most flat sales are private tenant buyouts (never appear as przetarg). Open-auction volume limited by stock of vacant units.

### Effort estimate
- Scraper + announcement parser: 1 day (standard bip.org.pl pattern)
- Result-notice discovery + parser: 0.5–1 day (pending LIVE-VERIFY on format)
- Integration + tests: 0.5 day
- **Total: ~2–2.5 days (Low-Medium effort)** — assuming HTML result notices. +1 day if OCR needed.

### Verdict
**NO-BUILD** (changed from NEEDS-LIVE-VERIFY on 2026-07-06 live re-spike — see `## Re-verify 2026-07-06` below). The format question resolved *in favour* (result notices are server-rendered HTML), but the volume question resolved *against*: exactly one flat offered at open auction across 2024–2026 (twice negative, third result never published), zero flat auctions in 2025 and H1 2026, and all ongoing flat disposals run through the bezprzetargowa tenant-buyout track which never produces public auctions or achieved prices. There is also no stable auction board — the BIP przetargi module is abandoned and announcements live only in the city's chronological news feed.

---

## Re-verify 2026-07-06 (LIVE)

Live session (curl full-HTML fetches of BIP boards + gostynin.pl quarterly news archives 2024-Q1 through 2026-Q2, plus web search). All three desk-open items resolved:

### 1. Recurring flat-auction volume 2024–2026 — **effectively ZERO**

- **2024**: ONE flat — spółdzielcze własnościowe prawo do lokalu nr 83, ul. Wojska Polskiego 28B (37,84 m² + piwnica 3,6 m², III piętro). Auctioned three times:
  - I przetarg 26.06.2024, cena wywoławcza 150 000 zł (announced Q2 2024 news, wykaz on BIP);
  - II przetarg 19.11.2024, cena 180 000 zł → **wynik negatywny** (one wadium payer, no-show; §12 result notice published as HTML news item, Q4 2024);
  - III przetarg 09.01.2025 (announced Q4 2024) → **result never published** in the news stream (checked all of Q1 2025 — no mention of Wojska Polskiego 28B or any flat result).
- **2025**: zero open flat auctions. Land-only przetargi (Kraśnica, Dybanka — mostly negative). Flat activity is exclusively bezprzetargowa tenant buyouts (wykazy: Kościuszki 6 lokale 6/11/19, July 2025).
- **2026 (H1)**: zero open flat auctions. More bezprzetargowa wykazy (Wojska Polskiego 10/8; Kościuszki 6/4).
- Desk estimate of "~2–5 flat lots/yr" was wrong — the BIP archive's 2021-09-10 entries are re-dated imports of 2004–2006 auctions, not 2021 activity. Real rate: ≤1 lot per multi-year period, and the one recent lot failed to sell twice.

### 2. Exact announcement + result boards — **desk-note URLs were wrong**

- `umgostynin.bip.org.pl/index//id/4667` is an **empty stub** (last updated 2021-01-14; no child entries, no board listing).
- The BIP Przetargi module (`/przetargi/index` = ogłoszone, `/przetargi/index/id/2` = rozstrzygnięte, `/przetargi/index/id/3` = unieważnione, `/przetargi/index/id/4` = archiwum) is **abandoned**: ogłoszone/rozstrzygnięte/unieważnione all have empty tables; archiwum's newest entries are dated 2021-09-10 but contain 2003–2006 content.
- **Actual live channel**: the city news feed on `gostynin.pl`, archived quarterly (`/788,i-kwartal-2024`, `/790,ii-kwartal-2024`, … `/911,ii-kwartal-2026-r`, `/918,ii-kwartal-2026-r-cz-2`; full list in `sitemap.xml`). Auction announcements, wykaz notices AND §12 result notices appear there as ordinary news items interleaved with weather alerts, concerts and school news — no dedicated property board, no structured index.
- BIP wykazy board (`/id/2294`) holds only *currently posted* wykazy (2 items as of today, neither a flat auction); items are removed after the statutory posting window, so no history survives on BIP. BIP's site search is non-functional (OR-matches ~2,421 results for any query).

### 3. Result-notice format — **server-rendered HTML (resolved), but stream unreliable**

- §12 result notices ("Informacja dotycząca wyniku przetargu") are plain HTML text inside gostynin.pl news items — not scans, no OCR needed. Confirmed live: 23.10.2024 (Dybanka, negative), 19.11.2024 (lokal 83 WP 28B, negative), 28.11.2024 (Kowalska, negative), 10.06.2025 (Kraśnica, negative), 24.06.2025 (Dybanka, negative); a positive one (16.10.2024, lokal użytkowy rent) does include the achieved price in HTML.
- However publication is **inconsistent** — the 09.01.2025 third flat auction produced no published result at all, and BIP copies are taken down after ~7 days.

### Conclusion

Q3 (format) resolved BUILD-favourable, but Q1/Q2 resolved fatal: no recurring open flat-auction stream (municipal flats go to sitting tenants bezprzetargowo), no stable machine-readable board (chronological mixed news feed only), and no dependable achieved-price stream. **NO-BUILD.** Re-check trigger: if Gostynin revives its BIP Przetargi module or batches vacant-flat auctions (as in 2004/2024), reassess — the scrape itself would be Low effort (static HTML, no auth).

---

## Sources

- BIP przetargi index (DESK — LIVE-fetch token-limited): `https://umgostynin.bip.org.pl/przetargi/index/id/4`
- BIP nieruchomości auction board: `https://umgostynin.bip.org.pl/index//id/4667`
- BIP ogłoszenia / nav tree: `https://umgostynin.bip.org.pl/id/4666`
- BIP wykaz lokalu bezprzetargowego (PDF fetched LIVE): `https://umgostynin.bip.org.pl/pliki/umgostynin/wykaz_walewski.pdf`
- Gostynin Q2 2024 city activity report (LIVE-fetched, confirmed flat auction): `https://www.gostynin.pl/790,ii-kwartal-2024`
- BIP Wydział Zarządzania i Obrotu Nieruchomościami: `https://umgostynin.bip.org.pl/id/184`
- BIP Gospodarowanie nieruchomościami (bezprzetargowa procedure): `https://umgostynin.bip.org.pl/id/2192`
- ListaPrzetargow.pl — Gostynin (housing cooperative SM Polam, NOT municipal): `https://listaprzetargow.pl/oferty/217667`
- WebSearch: "Gostynin Burmistrz ogłasza przetarg lokal mieszkalny" — confirmed Q2 2024 annotation re: Wojska Polskiego 28B lokal 83
