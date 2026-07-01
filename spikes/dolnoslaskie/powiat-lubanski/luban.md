# Spike — Lubań (Dolnośląskie · powiat lubański)

> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR

Miasto Lubań actively auctions municipal flats via **ustny przetarg nieograniczony** — confirmed with multiple live listings across 2024–2026 (individual flat auction articles on `luban.pl`, including II/III/IV rounds per property). Announcements are published on the **city's main portal** (`luban.pl`) under a "Nieruchomości" section, and on **city BIP** (`bip.um-luban.dolnyslask.pl`). A dedicated property hub exists at `luban.pl/1333`. Przetarg results (negative outcomes) appear inline in subsequent announcement articles; positive achieved-price notices likely on BIP but not yet directly fetched. Site appears to be standard HTML CMS (not observed to be JS-heavy SPA from search snippets). Volume is **moderate-to-low** (~4–8 flat auctions/year, multiple rounds common). Bezprzetargowe sales to sitting tenants likely co-exist but do NOT replace the open-auction stream. Closest analog: **Kamienna Góra** (small Dolnośląskie city, city-portal HTML announcements, moderate flat-auction volume).

---

## 1. Sells municipal property at auction?

**Yes — confirmed flats (lokale mieszkalne) via ustny przetarg nieograniczony.**

Confirmed auction announcements from Burmistrz Miasta Lubań:

| Date / round | Property | Round | Cena wywoławcza |
|---|---|---|---|
| 2026 (upcoming) | ul. Zawidowska 32/6 | III przetarg | — |
| 2026-06-09 | ul. Zawidowska 32/6 | II przetarg | ended negative (no bidder appeared) |
| 2026-03-27 | ul. Zawidowska 32/6 | I przetarg | ended negative (no interested parties) |
| 2026-05-26 | ul. Warszawska 4/8 | III przetarg | — |
| 2026-02-19 | ul. Warszawska 4/8 | II przetarg | ended negative |
| 2025-10-20 | ul. Warszawska 4/8 | I przetarg | ended negative |
| 2026-04-27 | ul. Leśna 11/4 | III przetarg | — |
| 2026-02-25 | ul. Leśna 11/4 | II przetarg | ended negative |
| 2025-10-24 | ul. Leśna 11/4 | I przetarg | ended negative |
| 2026 | ul. Leśna 44D/5 | przetarg | — |
| 2025-01-22 | lokal mieszkalny (unspecified address) | I przetarg | 11 600 zł (opening) |
| 2025-04-01 | lokal mieszkalny | — | 150 000 zł |
| 2024-07-23 | lokal nr 2, ul. Rynek 13 | przetarg | — |
| 2019 (archival) | lokal nr 8 (Leśna 38A) | IV przetarg | — |

Multiple properties running to III+ rounds confirms a sustained programme. Note: many auctions ending negative (brak zainteresowanych) — city reduces price and re-publishes, which increases total announcement volume per property.

A separate bezprzetargowy track (sales to sitting tenants) likely exists per standard Polish municipal practice but search results show no evidence it has replaced the open-auction stream.

Sources: [luban.pl artykuł 125758](https://m.luban.pl/artykul/125758/burmistrz-miasta-luban-oglasza-pierwszy-przetarg-ustny-nieograniczony), [luban.pl artykuł 125958](https://m.luban.pl/artykul/125958/burmistrz-miasta-luban-oglasza-czwarty-przetarg-ustny-nieograniczony), [luban.pl artykuł 126039](https://m.luban.pl/artykul/126039/burmistrz-miasta-luban-oglasza-trzeci-przetarg-ustny-nieograniczony), [luban.pl artykuł 126171](https://m.luban.pl/artykul/126171/przetarg-na-mieszkanie-przy-ul-zawidowskiej), [luban.pl artykuł 126396](https://m.luban.pl/artykul/126396/przetarg-lokal-lesna-44d5), [listaprzetargow.pl Lubań mieszkania](https://listaprzetargow.pl/oferty/12261), [adradar.pl Lubań](https://monitor.adradar.pl/przetargi/mieszkania/1164/Luba%C5%84/all)

---

## 2. Where published? (hosts + boards, URLs)

### Announcement board (ogłoszenia)

- **City portal — primary listing** (`luban.pl`):
  - Property hub/landing: `https://luban.pl/1333` (Nieruchomości Miasta Lubań)
  - Individual articles follow pattern: `https://luban.pl/artykul/{id}/{slug}` (also accessible via `m.luban.pl`, `miastoluban.pl`, `e.luban.pl` mirror subdomains — all resolve to the same content)
  - Auction articles titled "Burmistrz Miasta Lubań ogłasza {N} przetarg ustny nieograniczony" or "Przetarg [na mieszkanie/lokal] [street]"
  - Auction venue always: ul. 7 Dywizji 14, I piętro, sala Nr 11 (City Hall)
  - Housing manager key collection: Miejska Administracja Mieszkaniowa (MAM), Plac Szarych Szeregów 4, Lubań

- **City BIP** (`bip.um-luban.dolnyslask.pl`):
  - Main menu page: `http://bip.um-luban.dolnyslask.pl/index.php?idmp=23&r=r`
  - BIP serves as legal publication point; individual przetarg notices linked from BIP property section
  - Archive BIP: `http://archiwum.luban.bip.net.pl/m,325,przetargi.html`

- **Dedicated przetarg portal** (possibly aggregator/redirect): `https://przetargi.luban.pl/` — noted in search results but not deeply verified

### Results board (wyniki / informacja o wyniku)

- **luban.pl articles** — subsequent round announcements include inline statement of prior round outcome (negative result, reason: "brak zainteresowanych" or "uprawniony uczestnik nie przystąpił") — provides partial result data
- **BIP results notices** — expected on BIP property section (`bip.um-luban.dolnyslask.pl`) per standard Polish statutory requirement (Rozporządzenie w sprawie sposobu i trybu przeprowadzania przetargów) but specific URL for the results board NOT directly fetched (web_fetch rate-limited; BIP main page identified but inner structure not scraped)
- **Achieved prices**: Not confirmed via live fetch. Known opening prices (e.g. 59 000 zł, 134 000 zł, 150 000 zł, 11 600 zł) from search snippets. Positive auction outcomes (cena osiągnięta) likely on BIP but require live verification.

---

## 3. Format + rendering

| Layer | Detail |
|---|---|
| CMS | Unknown exact CMS; `luban.pl` articles appear to be standard server-rendered HTML based on search snippet content (full article text visible to crawlers — article body text returned in search results) |
| Render | Likely **plain HTML** — article content visible in Google snippets without JS execution. No SPA behaviour observed in search results. Needs live verification via Chrome MCP. |
| Content format | **HTML text** — individual auction articles contain structured fields: lokal address, surface area (m²), cena wywoławcza, wadium, termin przetargu, conditions. No PDF announcements found in search results (unlike some other cities). |
| Results format | Negative results embedded in next-round announcement text. Positive results (BIP notices) — format unverified (likely HTML on BIP). |
| Auth/bot blocks | No login required; no CAPTCHA observed in search results. Site appears publicly accessible. |
| URL stability | Article-ID-based slugs (`/artykul/{id}/`) — stable and directly linkable. Multiple mirror subdomains (m., e., abk4., lr.) — canonical appears to be `luban.pl`. |
| BIP | Legacy ASP.NET BIP (`bip.um-luban.dolnyslask.pl`, `?idmp=` params) — typically serves plain HTML, no JS rendering. |

**NEEDS-LIVE-VERIFY on format**: `web_fetch` was rate-limited during this spike; article HTML structure and BIP inner URLs not directly confirmed. High confidence from search snippet behaviour that it is plain HTML, but scraper DOM selectors need one live pass.

---

## 4. Volume + achieved-price stream

**Announcement volume (flat auctions):**
- 2024: at least 1–2 (ul. Rynek 13/2, archival Leśna)
- 2025: at least 3–4 (Warszawska 4/8 I, Leśna 11/4 I, Leśna 44D/5, unnamed lokal Jan 2025)
- 2026 (to date): at least 5+ round-articles visible (Zawidowska 32/6 I–III, Warszawska 4/8 II–III, Leśna 11/4 II–III, Leśna 44D/5)

Because each round is a separate article, raw article count overestimates unique properties. Estimated **~4–6 distinct flat properties auctioned per year**, generating **~8–15 articles/year** (including negative-round re-posts).

**Achieved-price stream:**
- No confirmed positive outcomes in current search window (multiple properties going through II–III rounds without sale)
- BIP statutory results notices expected but URL for results board not confirmed
- The low sale rate (many negatives) means achieved-price events are infrequent — possibly 1–3 successful sales/year
- Opening prices range: ~11 600 zł (small/non-standard unit) to ~150 000 zł (standard flat) — mid-market for Dolnośląskie

---

## 5. Adapter effort + verdict

**Closest analog:** Kamienna Góra (small Dolnośląskie powiat-seat city, city-portal HTML announcements, moderate flat-auction volume, BIP as legal publication point).

**Blockers / risks:**

1. **BIP inner structure unverified** — `bip.um-luban.dolnyslask.pl` property section URLs not scraped due to web_fetch rate limit. Need one live Chrome pass to map the BIP przetarg and wyniki pages. Low risk: BIP pattern is standard.

2. **Results board URL unknown** — achieved-price notices exist per statute but specific BIP URL not confirmed. Blocker for price-stream feature; mitigable by scraping BIP property section index.

3. **Mirror subdomain fragmentation** — announcements appear under `m.luban.pl`, `e.luban.pl`, `abk4.luban.pl`, `lr.luban.pl` in addition to canonical `luban.pl`. Canonical should be confirmed; scraper should use `luban.pl/1333` as entry point.

4. **Low sale volume** — many auctions end negative across multiple rounds. Achieved-price events rare. Adapter still worthwhile for announcement tracking but price-stream value is limited.

5. **Format confidence high** — search snippet behaviour strongly suggests plain HTML (no SPA), which means no Playwright overhead. This is the main cost reducer vs. Bolesławiec.

**Effort estimate:** Medium — 1 plain-HTTP scraper for `luban.pl` announcement articles (from `/1333` index) + 1 BIP scraper for results page (URL to confirm in one live pass). DOM parsing straightforward given article-based structure. No JS rendering expected.

**VERDICT: BUILD** — The city runs a genuine, sustained open flat-auction programme (ustny przetarg nieograniczony, confirmed 2024–2026). Plain HTML format (no JS rendering) reduces adapter cost. One live verification pass needed to confirm BIP results URL and DOM selectors. Confidence: **Medium** (flat auctions confirmed; format and results-board URL need live check).
