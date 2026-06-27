# Spike — Skierniewice (Łódzkie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low volume; Medium confidence).

## TL;DR

Skierniewice does sell municipal flats at ustny przetarg nieograniczony — confirmed with live page load. However, volume is very low (estimated 2–5 flat auctions per year) and a significant share of flats goes bezprzetargowo to sitting tenants (confirmed: Jagiellońska 2/20 bezprzetargowy). The housing manager ZGM Sp. z o.o. does NOT publish flat-sale przetargi on its own BIP or website; all property auctions are published by the Prezydent Miasta on the city BIP and city news portal. The adapter effort is low-medium technically but signal:noise is too poor to justify a dedicated scraper at this city's volume.

---

## 1. Sells municipal property at auction?

**YES — but mixed model, low flat volume.**

Confirmed flat auction (ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego):
- **Piłsudskiego 23, lok. 3** (96.17 m²) — ogłoszono 2025-06-06, przetarg 2025-07-08, cena wywoławcza 260 000 zł. Source: https://www.skierniewice.eu/aktualnosci/miasto/komunikaty-um/przetarg-ustny-nieograniczony-lokal-mieszkalny-ul-pilsudskiego,556.html (LIVE-VERIFIED, attachment: .doc).

Older confirmed flat auction via ZGM BIP (2018):
- **Kościuszki 6, lokal mieszkalny** — przetarg nieograniczony, wadium 5 763 zł, ogłoszenie ZGM BIP 2018. Source: https://zgmskierniewice.bip.gov.pl/publiccontracts/view/13277

Facebook channel "MiastoOferuje" (ZGM-linked) shows multiple flat przetargi in 2024–2025: ul. Kaszubska, ul. Nowy Świat, ul. Śląska (trzeci przetarg), ul. Mickiewicza, ul. Krzemienna — confirming the pattern is ongoing but sporadic.

**Bezprzetargowy channel confirmed:** Jagiellońska 2 lok. 20 (42.47 m²) sold bezprzetargowo to sitting tenant. Source: https://www.skierniewice.eu/aktualnosci/miasto/komunikaty-um/wykaz-i-informacja-o-wykazie-sprzedazy-nieruchomosci-lokalowej-ul-jagiellonska,652.html

**Conclusion:** City sells flats both ways. Open auction flats are those where tenant does not exercise first-refusal right. Estimated 2–5 flat-specific przetargi per year (city-wide); most property przetargi at bip.um.skierniewice.pl are land/commercial.

---

## 2. Where published? (hosts + boards, URLs)

### Primary sources — LIVE-VERIFIED

| Source | URL | Content |
|---|---|---|
| City BIP — Ogłoszenia i Komunikaty | https://www.bip.um.skierniewice.pl/kategorie/ogloszenia_i_komunikaty | Announcements + result notices; paginated, 28 pages of archive back to 2021 |
| City news portal — Komunikaty UM | https://www.skierniewice.eu/aktualnosci/miasto/komunikaty-um/ | Mirror/companion of BIP announcements; includes result articles |
| ZGM BIP (older only) | https://zgmskierniewice.bip.gov.pl/ | Historic ZGM-issued auctions (2018); current ZGM BIP appears dormant for sales |

### Result notices

Published as separate HTML articles on the same city news portal (skierniewice.eu/aktualnosci/miasto/komunikaty-um/). Confirmed example: Ogrodowa 26 result published 2025-12-23, achieved price 193 800 zł (vs 190 000 zł wywoławcza). Source: https://www.skierniewice.eu/aktualnosci/miasto/komunikaty-um/wynik-przetargu-ustnego-nieograniczonego-na-sprzedaz-zabudowanej-nieruchomosci-przy-ulicy-ogrodowej-26,606.html

**Note:** ZGM Sp. z o.o. own website przetargi page (https://www.zgmskierniewice.com.pl/przetargi) lists only construction contracts, commercial-unit rentals, insurance tenders — NO flat sales. ZGM is the housing manager but the city (Prezydent) issues and publishes all property disposal auctions.

---

## 3. Format + rendering

- **Format:** Standard HTML (static CMS — ALP BIP PLUS by alpanet.pl; city news site by Ideo/edito.pl)
- **Announcement details:** Embedded in HTML article body. Primary content also as downloadable attachment in **.doc or .odt** format (seen both). The HTML body contains the essential text (address, date, price, area).
- **Result notices:** Standalone HTML article with result text embedded; downloadable .odt file as well.
- **No SPA, no JavaScript rendering required.** Pages are server-rendered HTML.
- **Auth / bot-block:** None detected. BIP uses standard alpanet.pl template (same used in many Polish cities); no CAPTCHA, no login wall.
- **BIP category URL scheme:** `https://www.bip.um.skierniewice.pl/kategorie/ogloszenia_i_komunikaty` (paginated: `/1`, `/2`, ... `/27`); also monthly archive: `/2025-07`, `/2025-06`, etc.
- **Article URL pattern:** `https://www.bip.um.skierniewice.pl/artykuly/{ID}` — sequential integer IDs.
- **City news URL pattern:** `https://www.skierniewice.eu/aktualnosci/miasto/komunikaty-um/{slug},{ID}.html`

---

## 4. Volume + achieved-price stream

- **Flat auction volume:** Very low. Estimated ~2–5 per year based on Facebook posts and search results across 2023–2025. No dedicated property-auction category; all mixed into general "Ogłoszenia i Komunikaty".
- **Bezprzetargowy volume:** Unknown but likely higher — many flats go directly to sitting tenants without a public auction. These appear only as "wykaz" notices (pre-sale listing), not przetarg notices.
- **Achieved prices:** Published as separate HTML article on skierniewice.eu within days of auction. Include final price and number of bidders. Example: Ogrodowa 26 — 2 bidders, final 193 800 zł vs 190 000 zł opening (property was land+building, not pure flat).
- **Flat result example:** No dedicated flat-auction result article found in live search for 2024–2025 (the Piłsudskiego 23 Jul 2025 auction result may not yet be archived or indexed). ZGM Facebook (MiastoOferuje page) may carry results informally.
- **No structured data feed** (JSON/RSS for property auctions). BIP has RSS but it covers all announcements, not property-specific.

---

## 5. Adapter effort + verdict

### Closest analog
Closest to **Bytom** pattern: city-BIP-only publication, low volume, mixed flat/land content in single announcement stream, no dedicated property sub-category. Unlike Gliwice/Zabrze (which have ZGM or dedicated property BIP streams), Skierniewice mixes everything into one general announcements board.

### Technical approach (if built)
1. Scrape `bip.um.skierniewice.pl/kategorie/ogloszenia_i_komunikaty` paginated listing (standard alpanet.pl HTML, easy to parse).
2. Filter articles by title keywords: "przetarg", "lokal mieszkalny", "wykaz" (the last for bezprzetargowy pre-sale notices).
3. Fetch article HTML for detail extraction (price, area, address, date).
4. Separately scrape `skierniewice.eu/aktualnosci/miasto/komunikaty-um/` for result notices (same filtering).
5. No .doc/.odt parsing needed if HTML body contains sufficient data (confirmed: HTML body has full text).

### Blockers and risks
- **Volume risk:** With ~2–5 flat auctions/year, this city generates very few records. Very low ROI unless aggregated with other Lodzkie cities.
- **Noise:** The announcements board also carries elections, spatial planning, water rights, etc. — requires keyword filtering.
- **Dual-source complexity:** Announcements on BIP, results on skierniewice.eu — two different domains to monitor.
- **Bezprzetargowy majority:** Many flats never reach open auction; the "interesting" signal (flat available to anyone) is sparse.
- **ZGM historic auctions on separate BIP** (zgmskierniewice.bip.gov.pl) — low activity since 2018, likely not worth monitoring.

### Verdict
**NO-BUILD as standalone.** Volume is too low (~2–5 flat auctions/year) to justify a dedicated adapter. If a Lodzkie voivodeship batch is built that includes Lodz and Piotrkow Trybunalski, Skierniewice could be added at marginal cost (same alpanet.pl BIP scraper reuse) — but the signal:noise ratio and absolute count make it a poor standalone target.

**Effort if bundled:** Low-Medium (2–3 days). alpanet.pl BIP scraper is reusable from other cities; city news portal (ideo/edito.pl CMS) is straightforward HTML. Main complexity is dual-source monitoring and keyword filtering.
