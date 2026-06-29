# Spike — Brodnica (Kujawsko-Pomorskie · powiat brodnicki)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: NO-BUILD (Low effort to confirm; High confidence).

## TL;DR

Gmina Miasta Brodnica (Urząd Miejski w Brodnicy, Burmistrz Brodnicy) does occasionally sell municipal flats at ustny przetarg nieograniczony — confirmed one live case (ul. Mickiewicza 5/3, Sept 2021). However, the volume is extremely low: **1 flat auction found across ~5 years of Adradar archive** for the city organizer, with no flat auctions visible since 2022. The current municipal auction activity from the city is focused on **działki gruntowe** (land plots). No dedicated housing manager handles city flat auctions; the flat sale in 2021 used Brodnickie TBS Sp. z o.o. only for physical access. The BIP at bip.brodnica.pl blocks direct web fetching; the published auctions are text-HTML pages but the site appears to use a session/JS-gated CMS. **NOT worth building an adapter** at this volume.

Note: "Gmina Brodnica" (rural — bip.brodnica.ug.gov.pl / brodnica.biuletyn.net) is a separate entity (Wójt Gminy Brodnica) that does auction lokale mieszkalne, but at very low volume (2 flats found 2023–2024: Gorczenica and Karbowo) and is also outside the city boundary. This spike covers **Gmina Miasta Brodnicy** (the powiat seat city, ~22 000 inhabitants) per the brief.

---

## 1. Sells municipal property at auction?

**YES — occasionally, but extremely low volume for flats.**

Confirmed flat auction by Urząd Miejski w Brodnicy (city):
- **2021-09-29**: I przetarg ustny nieograniczony — lokal mieszkalny nr 3, ul. Mickiewicza 5, Brodnica, 52.95 m², cena wywoławcza 85 800 zł. Published on bip.brodnica.pl + brodnica.pl. Source: Adradar ID 8688680. [LIVE-VERIFIED via adradar.pl]

Current city auction pattern (2024–2026): **działki gruntowe** (land plots) only. Recent city auctions:
- 2026-06-22: działka ul. Polna, 921 m², 107 625 zł — Urząd Miejski w Brodnicy [Adradar 17277669]
- 2026-03-27: działka ul. Polna, 921 m², 107 625 zł — Urząd Miejski w Brodnicy [Adradar 16872803]
- 2023-09-14: lokal użytkowy nr 8 (commercial), ul. gen. Józefa Hallera 3-5, 82.70 m², 554 000 zł [Adradar 12055499]

Confirmed **no city flat auctions visible 2022–2026** in Adradar's multi-source archive. Adradar note at mieszkania/Brodnica/przetargi shows "1 aktualny przetarg nieruchomości (mieszkania, brodnicki pow.)" which is a syndyk auction (not city), behind paywall.

The 2021 announcement explicitly says: "Możliwość obejrzenia lokalu istnieje po wcześniejszym kontakcie telefonicznym pod numerem (56) 4982056 z Brodnickim TBS Sp. z o.o." — Brodnickie TBS manages the buildings on behalf of the city but the **Burmistrz Brodnicy** is the auction organizer.

Flat sale policy: The Rada Miejska resolution (Uchwała Nr XXVII/237/2021 of 29 June 2021) governs managing residential units. Sales do happen but tenant buyouts appear to be the dominant channel (bezprzetargowo); open auctions are rare exceptions.

**Verdict on Q1**: City does hold ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych, but frequency is ~0–1 per year and may now be zero. NO dedicated housing manager publishes a separate auction board. Generic city-BIP/property pattern confirmed.

---

## 2. Where published? (hosts + boards, URLs)

**Primary BIP (city — Urząd Miejski w Brodnicy):**
- Main BIP: https://bip.brodnica.pl/
- Przetargi section: https://bip.brodnica.pl/index.php?type=4&name=bt204&func=selectsite&value[0]=mnu10&value[1]=1
- Nieruchomości / Wykaz nieruchomości do sprzedaży przetarg: https://bip.brodnica.pl/index.php?type=4&name=bt259&func=selectsite&value[0]=mnu11&value[1]=2
  - Also seen as: https://bip.brodnica.pl/index.php?type=4&name=bt229&func=selectsite&value[0]=mnu11&value[1]=2 and https://bip.brodnica.pl/index.php?type=4&name=bt203&func=selectsite&value[0]=mnu11&value[1]=2
- Wykaz lokali mieszkalnych: https://bip.brodnica.pl/index.php?type=4&name=bt181&func=selectsite&value[0]=mnu11&value[1]=4
- City portal mirror: https://www.portal.brodnica.pl/strona-578-przetargi_nieruchomosci.html

**2021 auction announcement text confirms publication chain:**
> "Ogłoszenie o przetargu zamieszczone zostało na stronie internetowej Urzędu Miejskiego w Brodnicy w Biuletynie Informacji Publicznej, https://brodnica.pl, https://bip.brodnica.pl oraz wywieszone zostało w siedzibie Urzędu Miejskiego w Brodnicy na tablicy informacyjnej."

**Result notices (wyniki przetargów)**: Published on the same BIP. BIP URL structure for results is a sub-page of the Nieruchomości section. No separate dedicated results board identified. Achieved prices would be embedded in the result notice text posted to bip.brodnica.pl.

**Secondary / rural gmina (NOT the city — for reference):**
- bip.brodnica.ug.gov.pl → cid=111 (mienie komunalne, przetargi bieżące) + cid=112 (wyniki)
- brodnica.biuletyn.net → cid=1224 (sprzedaż, dzierżawa)

---

## 3. Format + rendering

**City BIP (bip.brodnica.pl):**
- CMS appears to be a PHP-based municipal BIP system (biuletyn.net-style or custom)
- All web_fetch attempts to bip.brodnica.pl returned **empty body** — the site uses session cookies, JavaScript rendering, or IP/UA filtering that blocks headless fetching
- Pages render as HTML in a real browser (visible in Adradar metadata: og:description snippets confirm plain-text announcement content within HTML pages)
- Individual announcement text is plain HTML paragraphs (no PDF confirmed for flat auctions; 2021 and 2023 ads were fully text in Adradar scrape)
- No JSON API detected
- **Bot block: YES** — direct web_fetch returns empty. Would require Chrome MCP / Selenium or periodic scraping with session management

**Rural gmina BIP (bip.brodnica.ug.gov.pl):**
- Standard biuletyn.net-compatible CMS
- Listings are HTML pages; individual announcement pages have text content
- Web_fetch NOT tested (out of scope for city spike)

---

## 4. Volume + achieved-price stream

**City (Urząd Miejski w Brodnicy / Burmistrz Brodnicy):**
- Flat auctions: **~1 confirmed in 5 years** (2021); none found 2022–2026
- Land auctions: ~2–4/year (active in 2026)
- Commercial auctions: ~1 found (2023)
- Achieved-price stream: Result notices exist on bip.brodnica.pl but volume is negligible for flats; no structured data

**Estimated annual flat-auction volume: 0–1 per year.** This is below any meaningful BUILD threshold.

---

## 5. Adapter effort + verdict

**Closest analog:** None of the reference cities (Gliwice, Zabrze, Bytom, Kraków, Tarnowskie Góry) is a close match due to volume. Structurally closest to **Tarnowskie Góry** (small city, occasional residential auctions, BIP-only publication) but even lower volume.

**Blockers:**
1. **Volume too low** — 0–1 flat auctions per year from city; currently zero. No viable signal stream to monitor.
2. **BIP anti-scraping** — bip.brodnica.pl blocks direct HTTP fetching (empty response). Would need Chrome/Playwright session to parse pages.
3. **No result-price page** — achieved prices buried in unstructured text notices, no dedicated endpoint.
4. **Ambiguity risk** — bip.brodnica.pl (city) and bip.brodnica.ug.gov.pl (rural gmina) are distinct entities with overlapping search results; any adapter must target city BIP specifically.

**Risks:**
- City may have stopped selling flats entirely (no auction found 2022–2026)
- Flat stock likely depleted or sold bezprzetargowo to tenants
- BIP CMS may change URL structure (bt-prefixed parameters are fragile)

**VERDICT: NO-BUILD**

Brodnica (Gmina Miasta) shows confirmed capability to hold flat przetargi but current volume is effectively zero (no city flat auction in 4+ years). The city's active auction output is land plots only. No dedicated housing manager produces a separate feed. Building a scraper against a bot-blocking BIP for 0–1 flat auctions per year delivers no value.

If the rural gmina (Wójt Gminy Brodnica, bip.brodnica.ug.gov.pl) were the target instead, the answer would be similar — 1–2 flat auctions per year — still below BUILD threshold.

**Confidence: High.**

---

## Sources

- Adradar Monitor Przetargów — Brodnica mieszkania: https://przetargi.adradar.pl/p/mieszkania/3849/Brodnica/przetargi
- Adradar — Brodnica all auctions: https://przetargi.adradar.pl/p/a/3849/Brodnica/a
- Adradar — 2021 city flat auction (Mickiewicza): https://przetargi.adradar.pl/przetarg/mieszkania/Brodnica/miasto/8688680
- Adradar — 2023 city commercial auction (Hallera): https://przetargi.adradar.pl/przetarg/komercyjne/Brodnica/gmina/12055499
- BIP Urząd Miejski w Brodnicy (main): https://bip.brodnica.pl/
- BIP Urząd Miejski w Brodnicy (przetargi): https://bip.brodnica.pl/index.php?type=4&name=bt204&func=selectsite&value[0]=mnu10&value[1]=1
- BIP Urząd Miejski w Brodnicy (wykaz nieruchomości sprzedaż): https://bip.brodnica.pl/index.php?type=4&name=bt259&func=selectsite&value[0]=mnu11&value[1]=2
- BIP Urząd Miejski w Brodnicy (wykaz lokali mieszkalnych): https://bip.brodnica.pl/index.php?type=4&name=bt181&func=selectsite&value[0]=mnu11&value[1]=4
- BIP Gmina Brodnica (rural, reference): https://bip.brodnica.ug.gov.pl/?bip=1&cid=111&bsc=N
- Portal Brodnica (przetargi nieruchomości): https://www.portal.brodnica.pl/strona-578-przetargi_nieruchomosci.html
- jakiwniosek.pl — wykup mieszkania komunalnego Brodnica: https://jakiwniosek.pl/wnioski/nieruchomosci/wykup-mieszkania-komunalnego/brodnica
