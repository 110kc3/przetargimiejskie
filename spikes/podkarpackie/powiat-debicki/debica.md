# Spike — Dębica (Podkarpackie · powiat dębicki)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Medium confidence).

## TL;DR

Two separate entities auction flats in Dębica: **Gmina Miasto Dębica** (via Burmistrz/Urząd Miejski) and **Spółdzielnia Mieszkaniowa w Dębicy**. The gmina track has historically auctioned municipal flats (potwierdzone: 4 rounds on ul. 1 Maja 3A in 2017–2018, all negative), but zero gmina flat auctions have appeared since 2019 — recent gmina activity is exclusively land (działki) and commercial space. The SM track is active (4–5 flat przetargi/year, 2024–2025 confirmed), but SM auctions are cooperative-ownership conversions (ustanowienie odrębnej własności), not gmina disposals of komunalne stock. Neither entity publishes a machine-readable feed or achieved-price result notices in a scrapable form; the SM site has no auction archive at all.

---

## 1. Sells municipal property at auction?

**Gmina Miasto Dębica** (Burmistrz): YES historically, but dormant on flats since 2019.

- Only one flat auction confirmed: lokal mieszkalny nr 3, ul. 1 Maja 3A, 32.74 m², cena wywoławcza 91 000 zł. Ran 4 ustny przetarg nieograniczony rounds (04.08.2017, 19.10.2017, 08.03.2018, 20.07.2018), all negative. No sale achieved.
- From 2019–2026 (confirmed via adradar.pl full archive): **zero gmina flat auctions**. Gmina przetargi in this period = land plots at Kosynierów Racławickich, Wielopolska, Szkolna, Saperów, and two large commercial objects at Metalowców and Akademicka.
- Gmina appears to follow the "bezprzetargowy" path for remaining tenant-occupied stock or simply has depleted its auctionable komunalne flat inventory.

**Spółdzielnia Mieszkaniowa w Dębicy** (ul. Kolejowa 29, tel. 14 681-37-20): ACTIVE — but NOT a gmina entity.

- Runs przetarg ustny (licytacja) on residential flats at approximately 4–5/year cadence:
  - Tuwima 7/84, 61.94 m², 4 pok., 260 000 zł — 11.07.2024
  - Cmentarna, 58 m², 3 pok., 315 000 zł — 19.03.2024
  - Głowackiego, 46 m², 2 pok., 230 000 zł — 11.06.2025
  - Robotnicza, 32 m², 2 pok., 150 000 zł — 30.09.2025
- Legal basis: ustanowienie odrębnej własności do lokalu (cooperative separation, not Article 34 komunalne disposal). This is SM stock, not municipal stock.

**Bottom line on Q1:** The gmina does NOT currently run flat auctions at meaningful volume. The only active flat-przetarg source (SM) is a cooperative, outside the project's scope of gmina/municipal auctions.

---

## 2. Where published? (hosts + boards, URLs)

### Gmina Miasto Dębica (Burmistrz)

- **Primary BIP:** `https://debica.bip.gov.pl/ogloszenia-o-przetargi-na-sprzedaz-nieruchomosci/`
  - The gov.pl BIP for Urząd Miejski w Dębicy. Section "Ogłoszenia o przetargi na sprzedaż nieruchomości" confirmed live but **stale**: last visible entries are from 2016–2017. The BIP appears to have migrated or stopped being updated at this URL.
  - Legacy BIP: `http://bip.umdebica.pl/index.php?strona=zamowienia&podstrona=92` (old system, likely same archive)
  - City portal mirror: `http://debica.pl/strony/przetargi-na-sprzedaz-nieruchomosci`
- **Aggregators that track gmina przetargi:**
  - `https://przetargi.adradar.pl/p/a/2785/Urząd+Miejski+w+Dębicy` — full gmina archive 2022–2026, confirmed active
  - `https://listaprzetargow.pl/oferty/przetargi/mieszkania/debica`
  - `https://debica.tv/` (local TV site republishes gmina announcements occasionally)
- **No dedicated "wynik przetargu" / achieved-price page** found for gmina. Result notices, if published, would appear on the BIP as separate articles — no section found.

### Spółdzielnia Mieszkaniowa w Dębicy

- **Own website:** `https://www.sm-debica.pl/index.php/przetargi` — **does NOT list flat-sale przetargi**; only shows contractor procurement (energy efficiency project). Flat auctions are announced ad-hoc.
- **Flat sale page:** `https://www.sm-debica.pl/index.php/mieszkania-na-sprzedaz` — currently shows "BRAK MIESZKAŃ NA SPRZEDAŻ" (empty). Past listings not archived there.
- **De facto publication channel:** aggregators only — `https://przetargi.adradar.pl/p/a/57710/Dębica/spoldzielnia_mieszkaniowa` and `https://listaprzetargow.pl/oferty/przetargi/mieszkania/debica` capture SM announcements.
- **No result/wynik notices found** on any SM page.

---

## 3. Format + rendering

**Gmina BIP (debica.bip.gov.pl):**
- Standard gov.pl BIP CMS, server-side rendered HTML.
- Listing page: plain HTML table/list (article titles + dates + "więcej" links).
- Individual articles: inline HTML text. The 2017–2018 flat auction announcement was full HTML prose (no PDF), directly fetchable.
- No JS rendering required for listing page. No auth observed.
- **Risk:** the gov.pl BIP listing appears frozen at 2016–2017 entries. Actual current przetargi may be published elsewhere (city portal, city hall bulletin board) without appearing in BIP at this URL.

**SM website (sm-debica.pl):**
- Joomla CMS, server-side HTML. Simple static pages.
- Flat-sale przetargi are NOT reliably published on the SM site. Announcements reach aggregators via unknown path (likely physical board → aggregator reporter, or email).
- The "mieszkania-na-sprzedaz" page is manually maintained; the "przetargi" page shows only contractor-tender PDFs.

**Aggregators (adradar.pl, listaprzetargow.pl):**
- JavaScript-heavy SPAs; adradar renders listing without JS (confirmed — served full HTML). Content is scrapable.
- These are secondary sources: they republish, not originate.

---

## 4. Volume + achieved-price stream

**Gmina flat auctions:**
- Confirmed: 1 flat (2017–2018, 4 rounds, 0 sales). No flat auctions found 2019–2026.
- Volume: effectively **zero** in current window.
- Achieved prices: none to report (all rounds ended negative).

**SM flat auctions:**
- Volume: ~4–5 per year (2024: 2 confirmed; 2025: 2 confirmed). Small city (~46 000 inhabitants), mid-size SM stock.
- Price range: 150 000 – 315 000 zł (2024–2025 sample), 32–62 m², 4 198–5 422 zł/m².
- **Achieved-price stream: NOT AVAILABLE.** No result notices found on sm-debica.pl or in aggregators. Adradar and listaprzetargow.pl show cena wywoławcza only, not achieved price. The SM publishes no protokół/wynik page.

---

## 5. Adapter effort + verdict

**Closest analog among existing adapters:** None of the existing adapters (Gliwice, Zabrze, Bytom, Kraków, Tarnowskie Góry) is a direct match. The SM pattern (small cooperative, ad-hoc announcements, no structured archive) is closest to the Tarnowskie Góry cooperative secondary path — but weaker because announcements don't appear on the SM's own site at all.

**Blockers:**
1. **Gmina flat supply is essentially zero** since 2019. Building a gmina BIP adapter would harvest land/commercial only — outside project scope.
2. **SM is not a gmina entity**. Project scope is gmina/municipal auctions; SM auctions are cooperative-ownership conversions.
3. **No reliable publication URL for SM flat przetargi.** The sm-debica.pl site does not list them. They only appear on third-party aggregators, which are themselves secondary/scraped sources with unknown freshness.
4. **No achieved-price data stream.** Neither gmina BIP nor SM website publish result notices with achieved prices. This is a hard blocker for the "achieved price" feature.
5. **Gmina BIP appears stale** at the known URL. Current gmina property przetargi may be published via city portal or physical board only, requiring deeper URL discovery before any adapter could be built.

**Risks:**
- SM might publish announcements on sm-debica.pl in the future but there is no structural guarantee.
- Gmina may resume flat auctions if new komunalne stock becomes available; historical pattern shows willingness (2017–2018) but near-zero inventory since.
- Adradar/listaprzetargow.pl as scraping targets is legally and technically fragile (ToS, JS, paywalled premium results).

**Effort:** Medium (2–3 days) to build a gimna BIP adapter for land/commercial only — but that is out of scope. High effort (3–5 days) to build a reliable SM flat-auction adapter given no stable publication URL. The achieved-price requirement is unblockable without a source.

**VERDICT: NO-BUILD.**
The gmina (Burmistrz Miasta Dębicy) has not held a flat auction since 2018 and current adradar evidence through 2026 shows zero gmina flat przetargi. The only active flat-auction entity (SM w Dębicy) is out of scope as a cooperative, and publishes no structured web feed or achieved-price data. City population (~46 000) and low gmina flat-auction volume make this a poor ROI target even if a scraper were possible.

---

### Sources

- BIP Urząd Miejski w Dębicy — ogłoszenia przetargi: https://debica.bip.gov.pl/ogloszenia-o-przetargi-na-sprzedaz-nieruchomosci/
- Adradar — Urząd Miejski w Dębicy (gmina auctions 2022–2026): https://przetargi.adradar.pl/p/a/1/pl/a/2785/Urz%C4%85d+Miejski+w+D%C4%99bicy
- Adradar — SM w Dębicy flat auctions: https://przetargi.adradar.pl/p/a/57710/D%C4%99bica/spoldzielnia_mieszkaniowa
- ListaPrzetargow — flat przetarg ul. 1 Maja 3A (gmina, 2018): https://listaprzetargow.pl/oferty/7419
- ListaPrzetargow — SM flat przetarg ul. Tuwima 7 (2024): https://listaprzetargow.pl/oferty/364014
- SM w Dębicy — mieszkania na sprzedaż: https://www.sm-debica.pl/index.php/mieszkania-na-sprzedaz
- SM w Dębicy — przetargi: https://www.sm-debica.pl/index.php/przetargi
