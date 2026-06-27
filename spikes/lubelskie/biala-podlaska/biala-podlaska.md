# Spike — Biała Podlaska (Lubelskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

ZGL Biała Podlaska (Zakład Gospodarki Lokalowej Sp. z o.o.) is the dedicated housing manager for the city's municipal residential stock. It runs **przetarg ustny (aukcja) w trybie Kodeksu cywilnego** — open oral auctions — on flats where a sitting tenant declined to buy or no tenant exists. These are published directly on `zglbp.pl`, not the city BIP. The dominant sale mode is bezprzetargowa (to tenants at 25–90% bonifikata), but genuine open auctions of lokale mieszkalne occur — verified live: two 2025 auctions for Kopernika 7 lok. 9 (330 000 PLN wywoławcza). Volume is low (~1–3 open flat auctions per year) but the data is clean HTML, no auth, no bot blocks. No achieved-price field is published on-site; result notice absent from web.

---

## 1. Sells municipal property at auction?

**YES — confirmed open flat auctions, but low volume.**

Two distinct sale flows:

| Flow | Mode | Volume |
|---|---|---|
| Bezprzetargowa sprzedaż najemcom | Tenant buys with bonifikata (up to 90% at 20+ years tenancy) — governed by Zarządzenie Nr 15/2015 Dyrektora Naczelnego ZGL | Very high — ~4–8 "wykaz" notices per year, each covering 1–6 buildings with multiple flats |
| Przetarg ustny (aukcja) KPC | Open auction to anyone when tenant declines or flat is vacant | Low — ~1–3 events per year confirmed |

**Confirmed open flat auctions (live-verified):**
- Kopernika 7 lok. 9 (77,80 m², 2 pokoje) — **I przetarg 2025-07-30**, cena wywoławcza 330 000 PLN — status: zakończone (likely failed — no buyer at I przetarg is common)
- Kopernika 7 lok. 9 — **II przetarg 2025-08-22**, cena wywoławcza 330 000 PLN — status: zakończone
- Earlier auctions visible on pages 2–45 of `zglbp.pl/przetargi` (going back to 2010), predominantly land/commercial but with sporadic flat auctions

The "przetarg ustny w trybie Kodeksu cywilnego" phrasing (not the standard ustawa o gospodarce nieruchomościami procedure) is used because ZGL is a Sp. z o.o. (city-owned company), not the gmina itself — so it operates under civil-code auction rules, not municipal property law. This is analogous to how some Śląsk managers handle company-owned stock.

---

## 2. Where published? (hosts + boards, URLs)

**Primary publisher: ZGL Biała Podlaska**
- **Przetargi listing (all types):** https://www.zglbp.pl/przetargi
- **Sprzedaż lokali (flat sales — bezprzetargowe wykazy):** https://www.zglbp.pl/przetargi/sprzedaz-lokali
- **Individual auction detail page example:** https://www.zglbp.pl/przetarg-ustny-aukcja-w-trybie-kodeksu-cywilnego-na-sprzedaz-lokalu-mieszkalnego-oznaczonego-nr-9-polozonego-na-ii-pietrze-iii-kondygnacji-budynku-wielorodzinnego-przy-ul--kopernika-7-w-bialej-podlaskiej-,r4250241

**City BIP (secondary — public procurement only, NOT property sales):**
- https://umbialapodlaska.bip.lubelskie.pl/index.php?id=79
- BIP "przetargi" section covers zamówienia publiczne (construction, services), not nieruchomości. Property auctions are delegated entirely to ZGL.

**No city UM.bialapodlaska.pl or BIP nieruchomości section for flat auctions was found.** The city's `um.bialapodlaska.pl` page (id=375) links back to ZGL context.

**Announcement board:** Also posted physically at ZGL headquarters (ul. Żeromskiego 5, Biała Podlaska). Online is the canonical channel.

---

## 3. Format + rendering

**LIVE-VERIFIED: Clean static HTML, no auth, no bot blocks.**

| Attribute | Detail |
|---|---|
| Page type | Server-rendered HTML (CMS by netcoding.pl / Drimo) |
| Listing page | Simple paginated list (`/przetargi/page,N`) with title, dates (announced / deadline), status badge |
| Detail page | Flat HTML with all key fields inline: address, floor, area (m²), cena wywoławcza (PLN), wadium, auction date/time/location, PDF link for "Warunki przetargu" |
| PDFs | Present as attachments (e.g., `warunki-przetargu-ustnego-*.pdf`) — text PDF, not scanned |
| Auth / login | None |
| Bot protection | None observed (no Cloudflare, no CAPTCHA) |
| JavaScript required | No — full content in static HTML |
| Filter/search | Basic dropdown filters (status, type, year, last N days) — GET params, scrapeable |
| Pagination | `/przetargi/page,0` … `/page,45` (46 pages at ~10 items each = ~460 total records across all categories since 2010) |

The "Sprzedaż lokali" bezprzetargowe page is a long single-page HTML list (no pagination on that subpage) with `.xlsx` attachments per building (flat-by-flat details — area, floor, cena wywoławcza per unit). These .xlsx files contain the primary data for the bezprzetargowe stream.

---

## 4. Volume + achieved-price stream

**Auction volume (open przetargi — flat + land/commercial combined):**
- ~460 total records since 2010 across all categories (estimate from 46 pages × ~10)
- Flat auctions: low — roughly 1–3 open flat auction events per year
- 2025 confirmed: at least 2 flat auction events (both for same unit, Kopernika 7 — I przetarg → II przetarg sequence is standard when first round fails)
- Also 2 land/ground parcel auctions in 2025 (ul. Brzeska 36)
- Commercial unit auction in 2026 (Plac Wolności 12 lok. 14 — in-toku as of 2026-06-16)

**Bezprzetargowe wykazy (tenant-sale stream):**
- Very active: ~4–6 "wykaz" posts per year, 2020–2026 confirmed on `zglbp.pl/przetargi/sprzedaz-lokali`
- Each wykaz covers 1–6 buildings; data in .xlsx (machine-readable)
- NOT auctions — these are pre-agreed sales to tenants at bonifikata

**Achieved price / wynik przetargu:**
- **NOT published on zglbp.pl.** Auction detail pages show status "zakończone" but no achieved price, no "informacja o wynikach przetargu" sub-page found.
- The standard Kodeks Cywilny auction procedure does not legally require public disclosure of achieved price (unlike GN act).
- To recover achieved prices would require monitoring notarial acts or KW (land registry) — no public feed.
- This is a **significant gap** vs. cities using the uGN procedure (which requires posting "informacja o wyniku").

---

## 5. Adapter effort + verdict

**Closest analog:** Zabrze / Bytom pattern — a city-owned sp. z o.o. manager (ZGL) rather than a Wydział Nieruchomości inside the gmina. Similar to how some Śląsk adapters scrape a company site rather than a BIP.

**BUILD decision rationale:**
- Confirmed open flat auctions exist (not purely bezprzetargowe)
- Clean HTML, no auth, no JS rendering, pagination is GET-based — standard scraper
- ZGL is the single canonical source; no need to merge multiple feeds
- Data fields available inline: address, lokal nr, area, cena wywoławcza, wadium, auction date

**Blockers / risks:**

| Risk | Severity | Note |
|---|---|---|
| Low open-auction volume | Medium | ~1–3 flat open auctions/year; most flat activity is bezprzetargowe to tenants. Adapter will often return 0 new items. |
| No achieved-price field | High | ZGL does not publish wynik/cena osiągnięta. This stream will be **announcement-only**, no price-realized data. If the project needs achieved prices, this city cannot deliver that. |
| Kodeks Cywilny vs. uGN mode | Low-Medium | No legal obligation to publish results publicly; ZGL could stop posting without notice |
| CMS URL structure | Low | Slugs are very long (full title + `,rNNNNN` ID suffix). ID-based fetch (`/przetargi/page,N`) is stable; title slugs may change on edits |
| bezprzetargowe .xlsx stream | Low-Medium | If the project ever wants to track tenant-buyout activity (not auctions), .xlsx parsing is needed per-building — doable but extra scope |

**Effort estimate: Medium**
- ~1–2 days for scraper: paginated listing + detail page parser
- No PDF parsing needed for core fields (detail page is HTML)
- Achieved-price stream: not feasible without external source
- Recommend: index the open przetargi only; skip bezprzetargowe wykazy unless tenant-sale tracking is in scope

**VERDICT: BUILD** — open flat auctions confirmed and scrapeable, but operator should be aware this is a **low-volume, announcement-only** source (no achieved prices). Suitable as a completeness signal for Lubelskie coverage, not a high-yield feed.

---

## Sources (live-verified 2026-06-27)

- ZGL przetargi listing: https://www.zglbp.pl/przetargi
- ZGL sprzedaż lokali (bezprzetargowe): https://www.zglbp.pl/przetargi/sprzedaz-lokali
- Kopernika 7 lok. 9 — II przetarg 2025-08-22: https://www.zglbp.pl/przetarg-ustny-aukcja-w-trybie-kodeksu-cywilnego-na-sprzedaz-lokalu-mieszkalnego-oznaczonego-nr-9-polozonego-na-ii-pietrze-iii-kondygnacji-budynku-wielorodzinnego-przy-ul--kopernika-7-w-bialej-podlaskiej-,r4250241
- Kopernika 7 lok. 9 — I przetarg 2025-07-30: https://www.zglbp.pl/przetarg-ustny-aukcja-w-trybie-kodeksu-cywilnego-na-sprzedaz-lokalu-mieszkalnego-oznaczonego-nr-9-polozonego-na-ii-pietrze-iii-kondygnacji-budynku-wielorodzinnego-przy-ul--kopernika-7-w-bialej-podlaskiej-,r12647097
- City BIP (zamówienia publiczne, not property): https://umbialapodlaska.bip.lubelskie.pl/index.php?id=79
- City UM portal: https://um.bialapodlaska.pl/ps/375
