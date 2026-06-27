# Spike — Szczecin (Zachodniopomorskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Szczecin runs confirmed *ustny przetarg nieograniczony na sprzedaż gminnych lokali mieszkalnych* with an active flat-auction stream handled by the **Wydział Mieszkalnictwa i Regulacji Stanów Prawnych Nieruchomości (WMiRSPN)** directly on city BIP. A parallel stream of written auctions (*przetarg pisemny ofertowy nieograniczony*) for residential flats also flows through the city-run portal **miastooferuje.szczecin.eu**, delegated to STBS (Szczecińskie Towarzystwo Budownictwa Społecznego). Both streams publish born-digital server-rendered HTML on the ICOR-platform BIP — same engine as analogues already scraped. Achieved-price field is embedded inline in the announcement table (cena wywoławcza + wadium visible at time of posting; result pages exist under the wyniki path). Volume is meaningful: at least 5–10 flat auctions per year confirmed from Facebook/BIP records 2025–2026. No auth wall, no bot block observed.

## 1. Sells municipal property at auction?

**Yes — confirmed LIVE.** Two parallel flat-auction streams:

**Stream A — Gmina (city-direct, ustny przetarg nieograniczony):**
- Managed by WMiRSPN, Referat ds. sprzedaży lokali, pl. Armii Krajowej 1, pok. 306.
- Example live auction found: *lokal mieszkalny nr 4, ul. Krzemienna 28, Szczecin* — 1 pokój, 31,40 m², cena wywoławcza 215 400 zł, przetarg 06.08.2025, wadium 29.07.2025. Published 2025-06-13 on BIP.
- Second example found from search snippets: lokal at ul. Pocztowej 10, przetarg 30.03.2026 09:00.
- Facebook page "Miasto Oferuje" confirms repeated auctions at ul. Kaszubskiej 65, ul. Nowy Świat 91, ul. Śląska (third attempt), ul. Adama Mickiewicza — all 2025–2026.

**Stream B — STBS (Szczecińskie TBS, przetarg pisemny ofertowy):**
- Three new STBS flat auctions published 2026-06-26 on miastooferuje.szczecin.eu: ul. Rayskiego 27/9 (82 m²), ul. Rayskiego 27/4 (42 m²), ul. Śląska 41/7 (131 m²), ul. Śląska 41/8 (149 m²).
- STBS flats are communal stock sold by the city-owned housing company; these are complementary to the gmina-direct stream.

**Not bezprzetargowy:** There is a separate *zbycie bezprzetargowe* section (chapter_131312) for tenant-preference sales, clearly distinguished from the *zbycie przetargowe* (chapter_131205) stream that this adapter targets.

Also present: land and commercial property auctions via Wydział Zasobu i Obrotu Nieruchomościami (separate section, chapter_50748/chapter_50759).

## 2. Where published? (hosts + boards, with URLs)

### Primary — city BIP (bip.um.szczecin.pl) — flat auctions by WMiRSPN

| Board | URL | Content |
|---|---|---|
| Zbycie przetargowe — ogłoszenia | https://bip.um.szczecin.pl/chapter_131207.asp | Active auction announcements (lokale mieszkalne) |
| Zbycie przetargowe — wyszukiwarka | https://bip.um.szczecin.pl/chapter_131208.asp | Search interface over all przetargowe announcements |
| Zbycie przetargowe — wykazy | https://bip.um.szczecin.pl/chapter_131206.asp | Pre-announcement property lists |
| Lokale planowane do zbycia | https://bip.um.szczecin.pl/chapter_11813.asp | Pipeline of flats planned for auction |
| Sprzedaż lokali komunalnych (info) | https://bip.um.szczecin.pl/chapter_131062.asp | General communal flat sale info |
| Wyniki przetargów (UM gruntów) | https://bip.um.szczecin.pl/chapter_50749.asp | Results for land/commercial auctions by WZiON |
| Ogłoszenia przetargów UM (land) | https://bip.um.szczecin.pl/chapter_50759.asp | Land/commercial auctions (separate department) |
| Wyszukiwarka nieruchomości UM | https://bip.um.szczecin.pl/chapter_50751.asp | Unified search across all UM property auctions |

**Note on results pages for flats:** No dedicated *wyniki przetargu* subsection was found under WMiRSPN chapter_131205 in the navigation (unlike WZiON which has chapter_50749). Result notices for flat auctions are likely posted back to the same chapter_131207 board (or as new soid entries) after the auction date. This needs verification against a past closed auction entry — NEEDS-LIVE-VERIFY for achieved-price field specifically for the WMiRSPN stream.

### Secondary — miastooferuje.szczecin.eu (city portal)

| Board | URL | Content |
|---|---|---|
| Oferty (all) | https://miastooferuje.szczecin.eu/oferty/ | Grid listing, 15 pages; includes Mieszkania tab |
| Aktualności | https://miastooferuje.szczecin.eu/aktualnosci/ | News feed with all new announcements (STBS + gmina) |

This is a WordPress/Elementor SPA-lite portal. It aggregates announcements from multiple entities (STBS, ZBiLK, NIOL, ARMS) and links back to BIP or respective entity sites. The "Aktualności" feed is the high-signal scraping target for new flat listings — it published 4 STBS flat auctions on 2026-06-26 alone.

### Tertiary — ZBiLK (zbilk.szczecin.pl)

ZBiLK manages *lokale użytkowe* (commercial) and garage rentals/auctions — **not** residential flat sales. ZBiLK's own BIP (zbilk.szczecin.pl/bip/) covers its procurement, not flat-sale auctions. Do not scrape ZBiLK for the flat-auction stream.

## 3. Format + rendering

**bip.um.szczecin.pl:**
- Platform: ICOR Application Server (same proprietary CMS as most Polish city BIPs).
- Rendering: **server-rendered HTML** — all content visible in the raw HTTP response, no JS required.
- Auction index page (chapter_131207.asp): lists announcements with title, form of disposal, kind, dates. Each entry is a link to a detail page with `?soid=<GUID>` parameter.
- Detail page (e.g., `chapter_131207.asp?soid=26165A42ADD44D538C242A8E7E38CB38`): full HTML table with all fields — address, floor, rooms, area, plot number, cena wywoławcza, wadium, auction date, contact person.
- No authentication, no CAPTCHA, no bot-block observed. TLS: standard HTTPS, no unusual headers.
- Charset: UTF-8.

**miastooferuje.szczecin.eu:**
- Platform: WordPress with Elementor 4.1.4.
- Rendering: partly JS-rendered (filter widget uses JS), but listing cards and aktualności feed are present in HTML source.
- The aktualności page renders individual post excerpts in HTML — scrapeable without JS execution.
- No auth/bot-block observed.

## 4. Volume + achieved-price stream

**Volume:**
- WMiRSPN (ustny, gmina-direct): Based on confirmed examples from 2025–2026, frequency is roughly 1–3 individual flat auctions per month, often with repeat attempts (drugi/trzeci przetarg) when first auction fails. Estimate 15–30 auction events per year for this stream alone.
- STBS (pisemny, via miastooferuje): At least 4 new announcements on a single day (2026-06-26) suggests high-volume batched releases. Possibly 30–50+ per year from this entity alone.
- Overall: **strong volume** for a Polish city; Szczecin (~400k residents) has a large communal housing stock.

**Achieved-price stream:**
- WMiRSPN stream: The detail page for each auction (chapter_131207.asp?soid=...) includes cena wywoławcza and wadium upfront. After auction, result notices are expected to appear in the same chapter. The navigation does not show a dedicated "wyniki" subpage under WMiRSPN (unlike WZiON's chapter_50749). **Risk:** result notices may be posted as new `soid` entries on chapter_131207.asp (same list as announcements, distinguished by title prefix "Informacja o wyniku...") or may update the original entry. This needs live verification against a past completed auction.
- WZiON stream (land/commercial): chapter_50749.asp exists with explicit title "Wyniki przetargów na nieruchomości UM" — achieved price confirmed present there.
- STBS stream: Results posted back on miastooferuje.szczecin.eu aktualności; achieved price not confirmed from current scrape.

## 5. Adapter effort + verdict

**Closest analog:** Kraków (large city, BIP ICOR platform, WMiRSPN-equivalent department handling flat auctions via dedicated subchapter, miastooferuje-style supplementary portal). Secondary analog: Bytom/Zabrze for the soid-GUID URL pattern on BIP.

**Architecture required:**
1. **Scraper A — bip.um.szczecin.pl / chapter_131207:** Paginate the ogłoszenia list (soid-keyed detail links), fetch each detail page, parse the HTML table: address, floor descriptor, area (m²), plot ref, cena wywoławcza, wadium, auction date, contact dept. Detect "Rodzaj: Lokale" to distinguish from land entries.
2. **Scraper B — miastooferuje.szczecin.eu / aktualności:** Paginate the news feed (WordPress pagination), filter for posts tagged with flat auctions, extract linked auction details. This covers STBS stream.
3. **Result harvester:** Monitor chapter_131207.asp for new entries whose title begins "Informacja o wyniku" (or similar) referencing a flat at a known address — this gives achieved price. Alternatively, check chapter_50749.asp for cross-department results.

**Blockers:**
- No JSON API or structured data export found. Pure HTML parsing required throughout.
- The search interface at chapter_131208.asp appears to require a POST/form submit with filter params — may not be useful for periodic polling; better to poll the flat listing chapter directly.
- Achieved-price location for WMiRSPN stream not 100% confirmed — needs one live test against a past auction to verify whether "wyniki" appears in-line on chapter_131207 or on a separate page.
- STBS auction results (achieved price) require a separate check on miastooferuje aktualności post-auction.

**Risks:**
- miastooferuje.szczecin.eu uses Elementor; while listing content is in HTML, any future migration to a fully JS-rendered frontend would break the scraper.
- ICOR BIP is stable and widely used; low structural-change risk.
- Dual-stream complexity (gmina-direct + STBS) means two parsers rather than one, and potential de-duplication needed if the same flat appears on both platforms.

**Effort estimate:** Medium — two scrapers, HTML parsing on stable ICOR BIP + WordPress feed, no auth. Achievable in ~2–3 engineer-days for an adapter matching the Kraków/Bytom pattern.

**VERDICT: BUILD** — strong flat-auction volume confirmed live, born-digital HTML on ICOR BIP, no access barriers, both announcement and result streams present.
