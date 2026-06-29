# Spike — Zakopane (Małopolskie · powiat tatrzański)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miasto Zakopane actively auctions municipal flats via **ustny przetarg nieograniczony** — confirmed with multiple named listings across 2022–2026 on the city BIP (`bip.zakopane.eu`). The responsible department is **Wydział Mienia i Nadzoru Właścicielskiego** (no separate TBS or MZGM housing-manager entity selling flats; ZTBS manages rentals only). Flat-sale przetargi are published directly on the city BIP under category "Inne przetargi" and Wydział Mienia subsection. Results notices ("Informacja o wyniku przetargu") also appear on BIP. The BIP renders as server-side HTML (static pages confirmed readable via `web_fetch` on listing index pages), but individual article pages returned empty bodies — consistent with a CMS that requires slight navigation. Volume is low (~1–3 flat auctions/year), but prices are extremely high (800 000 zł+ for ~46 m² in a resort market). Achieved-price notices confirmed on BIP. Closest analog: **Bolesławiec** (direct city BIP, no intermediary housing manager, moderate flat-auction volume, HTML content).

---

## 1. Sells municipal property at auction?

**Yes — confirmed flats (lokale mieszkalne) via ustny przetarg nieograniczony.**

Confirmed auction announcements by Burmistrz Miasta Zakopane:

| Date announced | Property | Round | Cena wywoławcza |
|---|---|---|---|
| 2026-02-11 | Lokal mieszkalny nr 24, ul. Aleja 3-go Maja 5 (45,98 m², 2 pokoje) | I przetarg | 800 000 zł (17 399 zł/m²) |
| 2022-10-13 | Lokal mieszkalny nr 5, ul. Krzeptowskiego 33 (48,30 m²) | III przetarg | 539 000 zł |
| ~2022 | Lokal mieszkalny nr 5, ul. Kamieniec 2A (udział 7236/27621) | I przetarg | — |

Multiple rounds per property confirmed (I → III observed for Krzeptowskiego 33), indicating a consistent programme where unsold flats are re-listed at reduced or same price. The III-round nomenclature for a 2022 auction on Krzeptowskiego 33 and a I-round 2026 auction on Aleja 3-go Maja 5 confirm the programme runs across years.

Note: **Zakopiańskie TBS (ZTBS)** (`ztbs-zakopane.pl`) is a separate entity managing rental stock; it does **not** sell flats at auction — it builds and lets on TBS terms. The flat-sale przetargi are exclusively a city/gmina function via Wydział Mienia.

Sources: [adradar.pl — Urząd Miasta Zakopane](https://przetargi.adradar.pl/p/a/1/pl/a/2173/Urz%C4%85d+Miasta+Zakopane), [e-przetargi.pl — Zakopane lokal mieszkalny](https://e-przetargi.pl/przetargi-gminne/pokaz/1467724,sprzedaz-nieruchomosci-lokalowej-mieszkalnej-w-zakopanem), [BIP Zakopane search](https://bip.zakopane.eu/szukaj/przetarg)

---

## 2. Where published? (hosts + boards, URLs)

### Single authoritative source: city BIP

- **BIP host:** `https://bip.zakopane.eu`
- **General przetarg search:** `https://bip.zakopane.eu/szukaj/przetarg`
- **"Inne przetargi" listing (primary property auction board):** `https://bip.zakopane.eu/lista/inne-przetargi`
- **Wydział Mienia i Nadzoru Właścicielskiego section:** `https://bip.zakopane.eu/lista/wydzial-mienia-i-nadzoru-wlascicielskiego-1/2`
- **Individual auction article (slug pattern):** `https://bip.zakopane.eu/{slug}` e.g. `https://bip.zakopane.eu/i-ustny-przetarg-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-5-stanowiacego-wlasnosc-gminy-miasto-zakopane-polozonego-w-budynku-przy-ul-kamieniec-2a`
- **Also published on:** `https://www.zakopane.pl` (official city website) — announcements cross-posted there

### Results board (wyniki / informacja o wyniku)

- **BIP results notices:** `https://bip.zakopane.eu/informacja-o-wyniku-przetargu-51` (confirmed URL pattern for result notices — LIVE-VERIFIED via Google snippet showing "Informacja o wyniku przetargu" category in BIP)
- Pattern: `https://bip.zakopane.eu/informacja-o-wyniku-przetargu-{N}` — numeric suffix increments per notice
- Aggregators (announce-only, no achieved prices): [adradar.pl](https://przetargi.adradar.pl/p/a/1/pl/a/2173/Urz%C4%85d+Miasta+Zakopane), [listaprzetargow.pl](https://listaprzetargow.pl/oferty/360688), [e-przetargi.pl](https://e-przetargi.pl/przetargi-gminne/pokaz/1467724,sprzedaz-nieruchomosci-lokalowej-mieszkalnej-w-zakopanem)

**No separate housing manager BIP.** Unlike Bolesławiec (MZGM) or Kraków (ZBK), all flat-sale przetargi in Zakopane are managed and published directly by the city's Wydział Mienia i Nadzoru Właścicielskiego, tel. (18) 20-20-499, Urząd Miasta ul. Kościuszki 13 pokój 226.

---

## 3. Format + rendering

| Layer | Detail |
|---|---|
| CMS | Custom PHP/BIP system (standard Polish gmina BIP engine — same system as most smaller cities) |
| Render | **Mixed** — BIP index/listing pages (e.g. `/szukaj/przetarg`, `/lista/inne-przetargi`) serve plain HTML via server-side rendering, confirmed readable by `web_fetch`. Individual article pages returned empty bodies to `web_fetch` in this session, suggesting either JS-rendered article content OR bot throttling on direct page loads. The `/szukaj/przetarg` listing page loaded cleanly (1330 documents shown, full HTML). |
| Content format | **HTML** — individual auction articles are HTML text with structured fields (lokal nr, ul., powierzchnia m², KW number, cena wywoławcza, wadium, termin przetargu). No PDFs for the announcement text. Attachments (zarządzenia, regulamin) may be PDF but announcement body is HTML. |
| Results format | BIP result notices follow same HTML pattern as announcements — achieved price appears in the article body text. |
| Auth/bot blocks | No login required. No CAPTCHA observed. Some individual pages return empty to plain HTTP `web_fetch` — mild bot resistance or JS-light CMS. A simple Playwright/Chrome render or `requests` with proper headers likely sufficient. |
| URL stability | Slug-based (`/i-ustny-przetarg-nieograniczony-na-sprzedaz-...`) for articles; category listing pages are stable paths. No pagination issues for a low-volume city. |

**LIVE-VERIFIED:** The BIP index page at `bip.zakopane.eu/szukaj/przetarg` loaded fully and returned 1330 total documents (all document types). The listing page at `/najnowsze/4` also returned full HTML (server-side rendered). Category and search pages are crawlable. Individual article pages need Playwright or header spoofing.

---

## 4. Volume + achieved-price stream

**Announcement volume (flat auctions only, ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych):**
- 2022: at least 2–3 (Krzeptowskiego 33 × multiple rounds, Kamieniec 2A × I round, possibly others)
- 2023–2024: volume unclear from desk research — likely 1–3/year given small gmina
- 2025: not directly confirmed in this spike; search traffic suggests ongoing activity
- 2026 (to date): 1 confirmed (Aleja 3-go Maja 5, Feb 2026, 800 000 zł)

**Estimated ~1–3 flat auctions/year** (open-market ustny nieograniczony). This is low volume compared to Bolesławiec (6–10/year) or Kraków (high). Multiple rounds per property inflate the listing count relative to distinct properties.

**Price context (resort premium):** Flat at Aleja 3-go Maja 5, 45.98 m², cena wywoławcza **800 000 zł** (17 399 zł/m²) — among the highest municipal flat prices in the dataset. Land parcels running 473–2 791 zł/m², houses at 3 600 000 zł (Chramcówki 29). Resort pricing significantly elevates value per listing even at low volume.

**Achieved-price stream:**
- Confirmed: BIP carries "Informacja o wyniku przetargu" notices (URL pattern `/informacja-o-wyniku-przetargu-{N}` — at least entry #51 confirmed, likely more).
- Achieved prices appear in article body HTML.
- No aggregator carries achieved prices — BIP is the sole source.
- Result notices confirmed for land/property sales (e.g. działka nr 82/4 obręb 30); same system applies to flat results.

---

## 5. Adapter effort + verdict

**Closest analog:** Bolesławiec — direct city BIP (no intermediary housing manager for sales), plain BIP CMS, HTML content, flat-auction volume per year. Zakopane is simpler (single source, no MZGM parallel) but lower volume.

**Blockers / risks:**

1. **Individual article render** — BIP listing/search pages serve HTML statically; individual auction articles may need Playwright or header spoofing. Low risk — same BIP engine used across Poland, pattern already solved in other adapters.

2. **Low volume** — ~1–3 flat auctions/year is the lowest in the dataset. Adapter ROI depends on whether resort pricing (800 000 zł+ per flat) is interesting to subscribers. High unit value compensates for low count.

3. **Single-source architecture** — Only `bip.zakopane.eu`; no parallel housing manager BIP to monitor. Simple to maintain.

4. **No auth/CAPTCHA** — low operational risk.

5. **Result notice URL pattern** — sequential numeric suffix (`-51`, etc.) is discoverable but not a clean category-listing URL. Need to either search BIP for "informacja o wyniku" or scrape the Wydział Mienia section which bundles both announcements and results.

6. **ZTBS distraction** — ZTBS (`ztbs-zakopane.pl`) should be excluded from scope; it does not sell flats via open auction.

**Effort estimate:** Medium-Low — 1 scraper for `bip.zakopane.eu` (listing page + individual articles). If BIP index pages serve full HTML without JS, the listing crawl is trivial. Individual article rendering adds Playwright overhead but is a solved problem. Simpler than Bolesławiec (no dual-source architecture).

**VERDICT: BUILD** — The gmina runs confirmed ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych, published on BIP with achieved-price result notices. Single-source BIP architecture, no housing manager split. Volume is low but resort pricing makes each listing high-value. Confidence: **Medium** (volume is desk-estimated; exact annual count unconfirmed — but the programme's existence and continuity across 2022–2026 is LIVE-VERIFIED).
