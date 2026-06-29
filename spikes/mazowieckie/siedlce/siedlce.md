# Spike — Siedlce (Mazowieckie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: BUILD (Medium effort).

## TL;DR

Siedlce does conduct **ustny przetarg nieograniczony (licytacja) na sprzedaż lokali mieszkalnych** from its municipal housing stock. Announcements are published on the city portal **siedlce.pl** (open HTML, no auth) and referenced to **bip.siedlce.pl** (session-gated, returns blank body on direct fetch). The effective scraping target is siedlce.pl aktualnosci. Volume is low — roughly 2–4 flat auctions per year visible in search snippets 2022–2024. Achieved-price notices are posted only on the physical noticeboard per §12 of the auction regulation; no online result page was confirmed. Housing manager is **STBS** (Siedleckie Towarzystwo Budownictwa Społecznego), which administers the komunalny stock since 2016 but does **not** publish the flat-sale przetargi — those are issued directly by the Prezydent Miasta via Wydział Geodezji i Gospodarki Nieruchomościami.

---

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** The Prezydent Miasta Siedlce runs oral unlimited auctions (`ustny przetarg nieograniczony / licytacja`) for individual municipal flats (`lokale mieszkalne`). Confirmed examples:

- **ul. Józefa Piłsudskiego 96 nr 16** — 50.37 m², 3 rooms, cena wywoławcza **340 000 zł**. I przetarg 24.04.2024 → wynik negatywny; II przetarg 04.07.2024. Source: [siedlce.pl 2024-06](https://siedlce.pl/aktualnosci/2024/aktualnosci-06-2024/prezydent-miasta-siedlce-oglasza-ii-przetarg-nieograniczony-licytacje-na-sprzedaz-lokalu-mieszkalnego-polozonego-w-siedlcach-przy-ulicy-jozefa-pilsudskiego-96-oznaczonego-nr-16)
- **ul. Jana III Sobieskiego 5 nr 58** — 38.38 m², 3 rooms. I przetarg June 2024. Source: [siedlce.pl 2024-06](https://siedlce.pl/aktualnosci/2024/aktualnosci-06-2024/prezydent-miasta-siedlce-oglasza-przetarg-nieograniczony-licytacje-na-sprzedaz-lokalu-mieszkalnego-polozonego-w-siedlcach-przy-ulicy-jana-iii-sobieskiego-5-oznaczonego-nr-58-z-udzialem-we-wspolwlasnosci-czesci-domu-oraz-urzadzen-ktore-nie-sluza-do-wylacznego-uzytku-wlascicieli-poszczegolnych-lokali-oraz-ulamkowa-czescia-gruntu-sluzacego-do-racjonalnego-korzystania-z-budynku)
- **ul. Henryka Sienkiewicza 17 nr 9** — 29.73 m², 2 rooms, cena wywoławcza **150 000 zł**. II przetarg 02.02.2023. Source: [listaprzetargow.pl/237906](https://listaprzetargow.pl/oferty/237906-przetarg-mieszkanie-siedlce-mazowieckie)

Auctions are conducted as genuine open licytacja under ustawa o gospodarce nieruchomościami, not bezprzetargowo to tenants. Flat-viewing logistics are handled via STBS (tel. 25 644 95 62) but the legal seller is the City.

---

## 2. Where published? (hosts + boards, URLs)

**Primary announcement board (LIVE-VERIFIED):**
- **siedlce.pl/aktualnosci** — open HTML CMS (Vela/ESC SA). Flat-auction announcements are posted here as news items. No auth, no JS gate. Renderable via plain HTTP GET. URL pattern: `https://siedlce.pl/aktualnosci/{YYYY}/aktualnosci-{MM}-{YYYY}/prezydent-miasta-siedlce-oglasza-*`
- The city navigation menu links "Przetargi na zbycie nieruchomości" directly to the BIP gospodarka nieruchomościami section.

**BIP (secondary / authoritative):**
- **bip.siedlce.pl** → `Ogłoszenia i Komunikaty → Gospodarka Nieruchomościami → Ogłoszenia i Informacje` — URL: `https://www.bip.siedlce.pl/index.php?type=4&name=bt241&func=selectsite&value[0]=mnu43&value[1]=14`
- Also `Licytacje i przetargi Urzędu Miasta`: `https://www.bip.siedlce.pl/index.php?type=4&name=bt121&func=selectsite&value[0]=mnu43&value[1]=16`
- **CONFIRMED SESSION-GATED**: both BIP URLs returned empty body on direct fetch. bip.siedlce.pl requires an active browser session (PHP session cookie). BIP is the authoritative source per the auction regulation text but is not reliably scrapable headlessly.
- The auction notice text itself explicitly states: *"zamieszczone zostały w Biuletynie Informacji Publicznej pod adresem www.bip.siedlce.pl w zakładce Ogłoszenia i komunikaty – Gospodarka Nieruchomościami – Ogłoszenia i Informacje"*.

**Result notices (achieved price):**
- Per §12 of the auction regulation: *"Informacja będzie wywieszona na okres 7 dni na tablicy ogłoszeń w Urzędzie Miasta Siedlce."* — **physical noticeboard only**, no confirmed online publication of achieved prices. The BIP result notice page (`bt29` node) also returned blank body on direct fetch.
- One result notice URL was found in search index: `https://bip.siedlce.pl/index.php?type=4&name=bt29&func=selectsite&value[0]=227309` (informacja o wyniku I przetargu nieograniczonego ul. Strumykowa — land parcel, not flat) but returned empty body.
- **Achieved-price stream not confirmed online** — significant gap for the data model.

**STBS (housing manager):**
- stbs.siedlce.pl — manages komunalny stock since 2016, publishes **service procurement** przetargi (snow clearing, TV signal) but **not flat-sale auctions**. Not a scraping target for sale przetargi.
- STBS BIP: `https://stbs-siedlce.bip.gov.pl/`

---

## 3. Format + rendering

| Source | Format | Auth/gate | Notes |
|---|---|---|---|
| siedlce.pl/aktualnosci | HTML (server-rendered, Vela CMS) | None | Full content in HTTP response; no SPA. Announcement text inline as `<p>` tags. Regulation as inline HTML. |
| bip.siedlce.pl | Unknown (returns blank) | PHP session cookie required | Cannot be scraped headlessly without browser session |
| BIP result notices | Unknown | Same session gate | Returns blank on direct fetch |
| STBS przetargi page | HTML, PDFs linked | None | Service procurement only, irrelevant |

The siedlce.pl page LIVE-VERIFIED: full announcement text renders in plain GET including cena wywoławcza, wadium, auction date, property description. Regulation text is embedded inline (not a separate PDF). No OCR required. No JS execution required for content.

One concern: auction notices appear in the general aktualnosci stream mixed with all city news — there is no dedicated, filterable przetarg nieruchomości index page on siedlce.pl. Discovery requires keyword matching across the news feed or polling the BIP (session-gated).

---

## 4. Volume + achieved-price stream

**Volume:** Low. From visible search evidence 2022–2024:
- 2022: at least 1 flat (Sienkiewicza 17 nr 9, I przetarg Dec 2022)
- 2023: at least 1 flat (Sienkiewicza 17 nr 9, II przetarg Feb 2023)
- 2024: at least 2 flats in June 2024 (Piłsudskiego 96 nr 16; Sobieskiego 5 nr 58); likely more not captured in search snippets
- 2025/2026: no flat auction found in snippets (one commercial property at Świętojańska 4 — office building, not a mieszkalny lokal)

Estimated cadence: **~3–6 flat auctions per year**, often as II or III przetarg (repeat auctions after negative first result). High negative-result rate suggests thin buyer pool.

**Achieved-price stream:** Not published online. §12 of the auction regulation mandates only a 7-day physical noticeboard posting. No digital equivalent found. **This is the primary gap** — the adapter would capture `cena wywoławcza` but cannot reliably capture `cena osiągnięta` without accessing the physical board or the session-gated BIP result notices.

---

## 5. Adapter effort + verdict

**Closest analog:** Bytom / Tarnowskie Góry — small-to-medium city, low flat-auction volume, announcements via city portal (not dedicated housing manager board), achieved-price data gap.

**Architecture:**
- **Scrape target:** `siedlce.pl/aktualnosci` — poll monthly, keyword filter for `przetarg nieograniczony` + `lokal mieszkalny` / `licytacja` + `sprzedaż lokalu`
- **Parse:** Plain HTML, structured announcement text. Fields: address, lokal nr, powierzchnia, cena wywoławcza, wadium, postąpienie, data przetargu, sala. All present inline without PDF.
- **BIP workaround:** Session-gated BIP cannot be scraped headlessly. Options: (a) accept siedlce.pl as sole source (some notices may appear only on BIP); (b) use Chrome MCP with cookie persistence; (c) accept data gap.
- **Achieved price:** Not available online. Gap unless BIP result notices become accessible. Could be marked as `cena_osiagnieta: null` pending.

**Blockers:**
1. BIP session gate — primary authoritative source not headlessly scrapable. siedlce.pl mirrors the announcements but may not mirror result notices.
2. No dedicated property/auction index on siedlce.pl — requires general news feed polling.
3. Achieved-price stream absent online.

**Risks:**
- Low volume (~3–6/year) means the adapter has low utility relative to build cost unless combined with other Mazowieckie cities.
- Announcements may sometimes appear only on BIP before appearing on siedlce.pl (timing gap unknown).

**Verdict: BUILD** — flat auctions are confirmed real, open-format HTML on siedlce.pl, no auth needed for announcements, parse is straightforward. Achieved-price gap is acceptable if marked null (same limitation applies to several other confirmed cities). Medium effort due to BIP workaround needed and no dedicated index page.

**Effort: Medium** (2–3 days). Confidence: Medium (volume is low; BIP session gate is a known limitation).
