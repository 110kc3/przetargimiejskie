# Spike — Świdnik (Lubelskie · powiat świdnicki)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Medium confidence).

## TL;DR

Gmina Miejska Świdnik (Burmistrz Miasta Świdnik) does sell municipal flats at open oral auction (*ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych*), confirmed live. However, volume is very low — roughly 2–4 individual flats per year reaching open auction — and the dominant disposal route is *bezprzetargowy* sale to sitting tenants (6 flats on a single wykaz dated 2026-06-25). The achieved-price stream from open auctions is extremely thin and frequently results in negative outcomes (no bidders). The BIP publishes announcements as **PDF attachments** inside a Lubelskie-platform BIP (umswidnik.bip.lubelskie.pl), with no structured data. A parallel mirror on monitorurzedowy.pl renders the full announcement text as HTML. There is no dedicated housing-manager entity — the city's own Wydział Nieruchomości i Planowania handles everything. Closest analog is a small-volume city like Tarnowskie Góry but with even fewer open-auction flats and heavier reliance on bezprzetargowy tenant sales.

## 1. Sells municipal property at auction?

**Yes — but overwhelmingly bezprzetargowy (tenant-sale route).**

Two parallel streams confirmed:

**Stream A — Bezprzetargowy (dominant):** Burmistrz publishes periodic *wykazy* listing flats for sale to sitting tenants under art. 34 ust. 1 pkt 1/2 UGN. The wykaz dated 2026-06-25 (LIVE-VERIFIED on monitorurzedowy.pl announcement 1709811) listed **6 flats** at ul. Niepodległości 17/84, Witosa 1A/41, Turystyczna 6/26, 3 Maja 6/55, 3 Maja 4/69, Norwida 2/9 — all explicitly labelled *sprzedaż lokalu mieszkalnego w trybie bezprzetargowym na rzecz najemcy*. Prices 168 000–327 000 zł with an 85% bonifikata for one-time payment (per uchwała VII/50/2011).

**Stream B — Przetarg ustny nieograniczony (rare):** Confirmed open flat auctions exist for flats where no tenant-priority claimant stepped forward. Named examples found:
- ul. Skłodowskiej 3 nr 9 — I przetarg (BIP doc WIN-N.7125.5.2020, 2021-05-12; PDF)
- ul. Racławicka 45 nr 15 — II przetarg (2019, cena wywoławcza 129 000 zł; confirmed on listaprzetargow.pl)
- ul. Niepodległości 17 — IV przetarg, 03.12.2025, cena wywoławcza 220 000 zł (reached 4th round = repeated failure)
- ul. Kard. St. Wyszyńskiego 6 nr 1, 52.4 m2 — II/IV przetarg (2024–2025)
- ul. Niepodległości 20 — III przetarg (2025)

Pattern: flats reaching open auction are ones where tenant-priority window expired without a buyer. They tend to cycle through multiple rounds (II, III, IV przetarg) indicating poor uptake. Fourth auction for ul. Niepodległości 17 on 11.03.2025 ended *wynikiem negatywnym* (no bidders). Open-auction volume estimated at **2–4 lots/year**, often cycling the same flat.

**No dedicated housing manager** (TBS/ZGM equivalent). Wydział Nieruchomości i Planowania (formerly Wydział Mienia Komunalnego) at UM Świdnik handles all disposals directly.

## 2. Where published? (hosts + boards, URLs)

**Primary — BIP Lubelskie platform:**
- Auction announcements board: https://umswidnik.bip.lubelskie.pl/index.php?id=372
- Auction results board: https://umswidnik.bip.lubelskie.pl/index.php?id=479
- Individual document detail (example): https://umswidnik.bip.lubelskie.pl/index.php?id=379&p1=szczegoly&p2=1633773
- BIP home: https://umswidnik.bip.lubelskie.pl/

**Secondary — Monitor Urzędowy (full HTML text mirror):**
- City profile: https://monitorurzedowy.pl/office/2414/urzad-miasta-swidnik
- Example wykaz (bezprzetargowy, 2026-06-25): https://monitorurzedowy.pl/announcement/1709811/wykaz
- City portal cross-link: https://e-swidnik.pl/strona-3819-sprzedaz_nieruchomosci.html (mirrors BIP content)

**Physical board:** Tablica ogłoszeń UM Świdnik, Wydział Nieruchomości i Planowania, II piętro, obok pokoju 213.

Result notices (*informacja o wyniku przetargu*) published on the same BIP board (id=479) and on monitorurzedowy.pl. They include: date, auction address, lot description, cena wywoławcza, number of bidders, and whether it concluded positively or negatively. Achieved price is stated when positive; negative results name the reason (nikt nie wpłacił wadium).

## 3. Format + rendering

**BIP (umswidnik.bip.lubelskie.pl):**
- Platform: Lubelskie regional BIP system (lubelskie.pl infrastructure), standard PHP/HTML listing.
- Document index: HTML table with title, date, status range. Each row links to a detail page.
- Detail page: metadata only (title, sign, dates). The actual announcement content is a **PDF attachment** ("Plik źródłowy pdf pobrano: N razy"). Confirmed LIVE on doc 1633773.
- PDF type: text-based PDF (not scanned), confirmed from download count metadata. No OCR needed.
- No auth block observed. No CAPTCHA or bot detection detected on BIP pages.
- SPA: No — standard server-rendered HTML with pagination.

**Monitor Urzędowy (monitorurzedowy.pl):**
- Full announcement body rendered as **HTML text** (no PDF). Complete structured table with all lot details, prices, bonifikata terms. LIVE-VERIFIED on announcement 1709811.
- Clean scraping surface; no auth required for reading. Login only needed to post/subscribe.

**Verdict on format:** BIP listings = HTML index + PDF body (text PDF). monitorurzedowy.pl = HTML full text. The monitorurzedowy.pl mirror is the easier parse target for bezprzetargowy wykazes; BIP PDF download needed for auction announcements.

## 4. Volume + achieved-price stream

**Bezprzetargowy wykazes:** Frequent — multiple per year. June 2026 alone had 1 wykaz with 6 flats. These are NOT open-market auctions (no achieved price relevant for market-price tracking).

**Open auctions (przetarg nieograniczony):**
- Estimated 2–4 distinct flat lots per year entering auction.
- High repeat-round rate: most flats seen at III or IV przetarg, suggesting very few complete with a positive result.
- One confirmed negative result: IV przetarg ul. Niepodległości 17, 11.03.2025 (negative — no bidders).
- One historical positive: ul. Racławicka 45 nr 15, II przetarg, 2019 (confirmed on listaprzetargow.pl, cena wywoławcza 129 000 zł; final achieved price not recovered in search).
- Achieved-price stream: extremely thin. Result notices exist on BIP id=479 and monitorurzedowy.pl but are sparse. Most auctions end negatively, so "achieved price" data points are rare — likely 0–2 per year with a positive outcome.

**Land/commercial auctions:** Separate stream. May 2026 saw 2 open auctions for undeveloped plots (działki nr 212/9, 218/1, 71/18 at Kolonia Krępiec). These are more common and more likely to close successfully, but are not flats.

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry (small-volume city, direct BIP, PDF announcements, no dedicated housing manager) — but Świdnik is even smaller and lower-volume.

**Effort assessment:**
- BIP scraper: Low-medium effort — standard Lubelskie-platform HTML list scrape + PDF download + text extraction. The PDF is text-based, so no OCR needed.
- monitorurzedowy.pl scraper: Low effort for wykazes (clean HTML table).
- Result notice scraper: Medium — need to monitor BIP id=479 separately for informacja o wyniku.
- Achieved-price data value: **Very low** — open auctions are rare and mostly end negatively. The dominant flat-disposal stream is bezprzetargowy (no market price).

**Blockers:**
1. Volume is too low to justify a dedicated adapter. 2–4 open-auction flats/year, mostly failing, yield at best 1–2 achieved-price data points annually.
2. The "interesting" flat-sale data (bezprzetargowy wykazes) does not produce auction prices — it just tells you what the gmina assessed the flat at, minus an 85% bonifikata for tenants. Not comparable to open-market achieved prices.
3. No structured data endpoint; requires PDF parsing per announcement.

**Risks:**
- BIP PDF links may change format (Lubelskie platform upgrades).
- monitorurzedowy.pl is a voluntary mirror; city could stop posting there.
- Low signal-to-noise: scraping cost likely exceeds data value.

**VERDICT: NO-BUILD.** The open-auction flat volume is too low (2–4/year) and the success rate too poor (most end negatively) to produce a meaningful achieved-price stream. The dominant disposal route is bezprzetargowy to tenants — not relevant to open-market price tracking. If the project ever expands to include bezprzetargowy wykaz valuations, revisit; but for auction-price aggregation this city does not qualify.
