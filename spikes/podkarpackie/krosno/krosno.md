# Spike — Krosno (Podkarpackie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort — but volume too thin).

## TL;DR

Gmina Miasto Krosno (pop. ~44 k) does auction municipal flats via *ustny przetarg nieograniczony* — confirmed by a live published announcement (May 2025, ul. Żwirki i Wigury 7/6, 18.67 m²). **However**, the primary disposal route for tenanted flats is *bezprzetargowy* (preferential sale to sitting tenants under art. 34 ust. 1 pkt 3 UGN). Open-market flat auctions are residual — effectively a single small lokal has been cycling through I→III przetarg rounds with "no participants" results. BIP is on the ePatent SaaS platform (`bip.umkrosno.pl`), which blocks `web_fetch` entirely but has clean structured HTML URLs. No dedicated housing manager; the responsible unit is **Wydział Geodezji, Kartografii i Gospodarki Nieruchomościami** within the city hall. Volume is too low to justify a standalone adapter.

---

## 1. Sells municipal property at auction?

**Yes — but predominantly land (działki), with flats as a marginal edge case.**

Confirmed sources:

- **krosno.pl official portal** (sprawa12): "Sprzedaż lokali mieszkalnych stanowiących własność Gminy Krosno na rzecz dotychczasowych najemców prowadzona jest w trybie **bezprzetargowym** zgodnie z art. 34 ust.1 pkt.3 ustawy o gospodarce nieruchomościami oraz Uchwałami Rady Miasta Krosna. W przypadku gdy sprzedaż następuje na rzecz osoby nie będącej najemcą, mają zastosowanie przepisy ogólne (tryb **przetargowy**)." — [source](http://www.krosno.pl/pl/dla-mieszkancow/poradnik-interesanta/geodezja/sprawa12) (DESK; page returned empty to web_fetch)

- **BIP UM Krosna — live flat auction** (I przetarg ustny nieograniczony, May 27 2025): "sprzedaż lokalu mieszkalnego nr 6 o powierzchni 18,67 m2 przy ul. Żwirki i Wigury 7 … Cena wywoławcza 56 010,00 zł … wadium 5 601,00 zł … Bank Pekao S.A." — LIVE-VERIFIED via strefabiznesu.pl reprint of the BIP announcement. URL: [bip.umkrosno.pl/auction/i-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego...](https://bip.umkrosno.pl/auction/i-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-polozonego-w-krosnie-przy-ul-zwirki-i-wigury-7-6-o-powierzchni-1867-m2?m=674&l=2)

- Same lokal reached **III przetarg** (announced March 17, 2026 per search snippets), confirming it failed to sell in rounds I and II — likely due to lack of interest / very low demand for this particular small flat (1 room, no bathroom access, 18.67 m²).

- Land auctions: multiple plots listed (ul. Wspólna, ul. Polna, ul. Suchodół, Bolesława Chrobrego etc.) — some also failing with no participants.

**Conclusion:** Flat auctions exist but are incidental (1 active lokal mieszkalny cycling through failed rounds). The standard route for most sitting tenants is *bezprzetargowy*. No batch of flats offered at open auction.

---

## 2. Where published? (hosts + boards, URLs)

**Primary host — BIP Urzędu Miasta Krosna** on the **ePatent** SaaS BIP platform:
- Main BIP: https://bip.umkrosno.pl/
- Auctions listing (zakładka Przetargi / Gospodarka nieruchomościami): https://bip.umkrosno.pl/auctions/674/przetargi?m=674
- Individual auction page pattern: `https://bip.umkrosno.pl/auction/{slug}?m=674&l=2`
- Ogloszenia section: https://bip.umkrosno.pl/Ogloszenia (also https://bip.umkrosno.pl/articles/675/ogloszenia?m=675)
- Departmental page (Wydział Geodezji, Kartografii i Gospodarki Nieruchomościami): https://bip.umkrosno.pl/Wydzial_Geodezji_Kartografii_i_Gospodarki_Nieruchomosciami

**Physical board**: Tablica ogłoszeń Urzędu Miasta Krosna, ul. Lwowska 28A, Krosno (mandatory 21-day posting per UGN).

**Result notices**: No dedicated "wyniki przetargów" section found on BIP. Results appear to be embedded in or appended to the original announcement page (search snippets mention "no persons interested" outcomes but no separate results sub-page was confirmed). The strefabiznesu.pl / nowiny24.pl press-release channel mirrors some announcements (published via Agencja Ogłoszeń i Reklamy "Podkarpacie" Jerzy Bryła).

**Achieved-price stream**: NOT confirmed. No standalone results page found. Would need live BIP access to confirm whether a protokół z przetargu with cena osiągnięta is posted.

---

## 3. Format + rendering

- **Platform**: ePatent SaaS BIP (`bip.umkrosno.pl`, hosted on epatent.pl infrastructure). This is a commercial BIP CMS used by multiple Polish municipalities.
- **Format**: HTML pages with clean slug-based URLs. Individual auction pages load as standard HTML (not SPA — URL navigation works, individual pages are indexable).
- **Bot protection**: `web_fetch` returned empty body for all `bip.umkrosno.pl` requests (likely Cloudflare or User-Agent block). Chrome MCP navigation also redirected away from the target URL. **Effective bot block confirmed** — requires either a headless browser with real UA, or scraping the mirrored press-release channels (strefabiznesu.pl, nowiny24.pl, naszekomunikaty.pl).
- **Attachments**: Some auction notices reference PDF attachments (e.g., `downloadFile/` paths visible in search results) but the main announcement text is embedded in HTML.
- **Auth**: No login required to view auctions. Block is UA/bot-level, not auth-level.

---

## 4. Volume + achieved-price stream

**Flat auction volume**: Extremely low. Only **1 lokal mieszkalny** (ul. Żwirki i Wigury 7/6, 18.67 m²) identified across I, II, III przetarg rounds (May 2025 → March 2026). No other municipal flat auctions surfaced in searches spanning 2024–2026.

**Land/commercial volume**: Moderate — multiple plots per year (Polanka, Suchodół, ul. Wspólna, ul. Polna) plus commercial lease przetargi (food-truck stands etc.). Likely 5–15 property auctions/year total, mostly działki.

**Achieved prices**: Not published as a structured data stream. No "Informacja o wyniku przetargu" sub-page was found. Results may be buried within individual auction entries or only available as physical protokół documents.

**Adradar.pl signal** (LIVE-VERIFIED): The "Przetargi Urzędów Miast: Krosno" filter on adradar shows zero active municipal flat auctions from Gmina Miasto Krosno (38-400). All residential listings under "Krosno" on adradar are either komornik licytacje, syndyk sales, or spółdzielnia auctions — none from the city.

---

## 5. Adapter effort + verdict

**Closest analog**: None of the existing adapters (Gliwice, Zabrze, Bytom, Kraków, Tarnowskie Góry) is a close match. The nearest structural analog would be a small city with a generic BIP but minimal flat-auction output.

**Blockers**:
1. **Volume too low**: Only 1 flat has gone to open auction in 2+ years. Even if scraped successfully, the signal would be near-zero.
2. **Bot block on BIP**: `bip.umkrosno.pl` (ePatent) blocks automated HTTP fetches. Would need Playwright/Puppeteer or a press-release mirror strategy.
3. **No achieved-price endpoint**: Results are not published in a machine-readable or consistently structured location.
4. **Dominant mode is bezprzetargowy**: Most municipal flat disposals never appear publicly as przetargi.

**Risks**: ePatent platform may implement stricter bot controls; press-release mirrors (strefabiznesu.pl) are not guaranteed to pick up every announcement; result protocols may be offline-only.

**Verdict**: **NO-BUILD**. Krosno auctions municipal flats at open auction in principle, but the actual volume is trivially small (1 lokal in 2 years, repeatedly failing). The city's own policy makes clear that bezprzetargowy sales to tenants are the primary route. Building an adapter would deliver near-zero auction events and would face a confirmed bot block. Monitor passively via adradar or press-release channels; revisit if volume grows.

**Effort if built anyway**: Medium (ePatent bot-block requires Playwright; no structured results feed; low ROI).

---

### Key URLs

| Resource | URL |
|---|---|
| BIP main | https://bip.umkrosno.pl/ |
| Auctions list | https://bip.umkrosno.pl/auctions/674/przetargi?m=674 |
| Ogloszenia | https://bip.umkrosno.pl/Ogloszenia |
| Flat auction (I przetarg, May 2025) | https://bip.umkrosno.pl/auction/i-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-polozonego-w-krosnie-przy-ul-zwirki-i-wigury-7-6-o-powierzchni-1867-m2?m=674&l=2 |
| Wydział GKiGN | https://bip.umkrosno.pl/Wydzial_Geodezji_Kartografii_i_Gospodarki_Nieruchomosciami |
| krosno.pl bezprzetargowy policy | http://www.krosno.pl/pl/dla-mieszkancow/poradnik-interesanta/geodezja/sprawa12 |
| Adradar mieszkania Krosno | https://przetargi.adradar.pl/p/mieszkania/64772/Krosno/a |
| strefabiznesu.pl announcement | https://strefabiznesu.pl/komunikaty/wyciag-z-ogloszenia-o-przetargu-prezydent-miasta-krosna,8279/ |
