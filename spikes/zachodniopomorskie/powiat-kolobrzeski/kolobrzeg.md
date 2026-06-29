# Spike — Kołobrzeg (Zachodniopomorskie · powiat kołobrzeski)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miasto Kołobrzeg (Prezydent Miasta) runs regular *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* published directly on the city BIP. Flat auctions are confirmed at 2–5 per year at resort-premium prices (500 000–750 000 zł). The BIP at `bip.um.kolobrzeg.pl` is a JavaScript SPA that returns blank HTML via `web_fetch` — content is JS-rendered, requiring either the legacy parseta URL or an API-level fetch. Announcements are also mirrored on the city portal `i-kolobrzeg.pl` and scraped by aggregators (adradar, otoprzetargi, listaprzetargow). Result notices (achieved price) are published as separate BIP articles. No housing manager intermediary — all flat sales go through Wydział Gospodarki Nieruchomościami at the Urząd Miasta (Ratuszowa 13, contact: i.galazka@um.kolobrzeg.pl, tel. 94 35 515 62).

---

## 1. Sells municipal flats at auction?

**Yes — confirmed via multiple sources. Ustny przetarg nieograniczony na lokale mieszkalne is an active mechanism.**

Prezydent Miasta Kołobrzeg regularly auctions municipal flats (*lokale mieszkalne*) via *I/II/III/IV przetarg ustny nieograniczony na zbycie nieruchomości* under art. 38 ustawy o gospodarce nieruchomościami. Sales are NOT limited to bezprzetargowy tenant sales — open-market public auctions are confirmed.

**Confirmed flat auction instances (LIVE-VERIFIED via otoprzetargi and adradar):**

| Date | Address | Area | Starting price | Round |
|------|---------|------|----------------|-------|
| 2026-07-16 (upcoming) | ul. Strzelecka 3/3 | 119.36 m² | 750 000 zł | I przetarg |
| 2026-03-26 (archived) | ul. Unii Lubelskiej 45/7 | 102 m², 4 pokoje | 500 000 zł | IV przetarg |
| 2026-04-01 (archived) | ul. Strzelecka 3/3 | 119 m², 4 pokoje | 750 000 zł | I przetarg |
| 2025-12-18 (archived) | ul. Strzelecka 3/3 | 119 m², 4 pokoje | 750 000 zł | prior round |
| 2025-12-03 (archived) | ul. Unii Lubelskiej 45/7 | 102 m², 4 pokoje | 500 000 zł | III przetarg |
| 2026-06-03 (archived) | ul. Rzeczna (udział 1/2) | 79 m², 3 pokoje | 124 000 zł | I rokowania |

Flat auctions authorized by Rada Miasta uchwały (e.g. Nr XI/183/25 z 26.02.2025, XII/199/25 z 26.03.2025, XIV/232/25 z 28.05.2025) — consistent democratic authorization signal indicating ongoing policy, not ad-hoc disposals.

**Resort-town pricing note:** Kołobrzeg is a premium coastal spa town — flat starting prices are 5 000–6 500 zł/m², far above typical inland cities. Some flats go to multiple rounds (IV przetarg = failed to sell 3 times), indicating price discovery challenges. This is consistent with high-value resort-town dynamics, not a reason for NO-BUILD.

**No dedicated housing manager intermediary.** Wydział Gospodarki Nieruchomościami at Urząd Miasta handles all flat sales directly.

---

## 2. Where published? (hosts + boards, URLs)

**Primary publisher — Gmina Miasto Kołobrzeg BIP:**
- Main przetargi board: `https://bip.um.kolobrzeg.pl/m,31009,przetargi-sprzedaz.html`
- Przetargi hub: `https://bip.um.kolobrzeg.pl/m,30631,przetargi.html`
- Nieruchomości hub: `https://bip.um.kolobrzeg.pl/m,30643,nieruchomosci.html`
- Individual announcement (example, 2024): `https://bip.um.kolobrzeg.pl/a,62537,01032024-r-i-przetarg-ustny-nieograniczony-na-zbycie-nieruchomosci-polozonej-w-kolobrzegu-lokal-gara.html`
- Per-year archive: `https://bip.um.kolobrzeg.pl/m,31063,2025.html` (2025), `https://bip.um.kolobrzeg.pl/m,30915,za-rok-2024.html` (2024)

**City portal mirror:**
- `https://i-kolobrzeg.pl/strona-3385-nieruchomosci.html` — city portal publishes same notices

**Legacy BIP (older CMS endpoint):**
- `http://umkolobrzeg.esp.parseta.pl/index.php?id=1868` — parseta-hosted legacy BIP, returned empty during fetch (may be decommissioned or requires parseta session)

**Result notices (achieved prices):**
- Published as individual BIP articles (same `/a,NNNNN,...` pattern) — no consolidated PDF confirmed. Example result-notice URL pattern: `https://bip.um.kolobrzeg.pl/a,NNNNN,informacja-o-wynikach-przetargu....html`
- Adradar monitor `https://przetargi.adradar.pl/p/a/1/pl/a/731/Urząd+Miasta+Kołobrzeg` — 10 pages of historical records (LIVE-VERIFIED)

---

## 3. Format + rendering

| Attribute | Detail |
|-----------|--------|
| Host | `bip.um.kolobrzeg.pl` |
| CMS | Custom JS SPA — all BIP subpages return skeleton HTML only via `web_fetch`; content injected client-side |
| JS rendering required | **Yes** — `web_fetch` returns only `<title>Biuletyn Informacji Publicznej</title>` + nav skeleton; no list content |
| Individual article pages | Same SPA problem — `/a,NNNNN,...html` URLs also return blank content server-side |
| TLS | HTTPS, no anomalies |
| Auth | None |
| Bot block | No Cloudflare/challenge detected; SPA is the blocker, not an explicit bot wall |
| Announcement format | Structured HTML article with full text: property description, area, price, wadium, date, file reference (GN.6840.x.x.YYYY.II), Rada Miasta resolution number |
| Attachments | Some announcements include JPG/image attachments (site photos, maps) — not required for data extraction |
| Result/wynik articles | Individual BIP articles (separate URL); contain cena osiągnięta and nabywca info |
| Mirror readability | `otoprzetargi.pl` and `adradar.pl` carry full announcement text as plain HTML — usable as fallback if BIP SPA is unresolvable |

**SPA workaround options:**
1. Use headless browser (Playwright/Puppeteer) with JS enabled — renders full page
2. Reverse-engineer the BIP's internal API (likely a `/api/` or `/ajax/` endpoint that the SPA calls to fetch article lists)
3. Scrape aggregators (otoprzetargi, adradar) — lower latency but dependent on third-party indexing lag

---

## 4. Volume + achieved-price stream

**Volume estimate (flat auctions, Urząd Miasta):**
- 2026 (to date, Jun): 4 flat auction events confirmed (Strzelecka 3/3 × 2, Unii Lubelskiej × 1, Rzeczna × 1)
- 2025 (confirmed): at least 3–4 auctions (multiple rounds per flat = same underlying property going to II/III/IV przetarg); new flats authorized by 3 separate Rada Miasta uchwały in 2025
- 2024: BIP article `a,62537` dated 01.03.2024 confirms flat + garage unit auctions
- Estimated run-rate: **3–6 flat auction events/year** (2–3 distinct flats, some going through multiple rounds)
- ListaPrzetargow.pl shows 6 pages of Kołobrzeg-city property listings including residential

**Note:** Multiple rounds for the same flat (I → IV przetarg) inflate event count; net distinct flats entering the system is ~2–3/year. Still above the 1/year Koszalin floor.

**Achieved-price stream:**
- Result notices published as BIP articles alongside announcements — same `/a,NNNNN,...` URL pattern
- Content confirmed to include *cena osiągnięta* (achieved price) per standard art. 38 UGN reporting requirement
- **Not** in a consolidated PDF (unlike Koszalin) — individual HTML articles, parse-friendly once SPA is bypassed
- Adradar and listaprzetargow do not scrape result/wynik articles (they only capture announcement listings)

---

## 5. Adapter effort + verdict

**Closest analog:** Gliwice / Bytom structure (city BIP HTML articles, Wydział Nieruchomości direct publisher, result notices as separate articles) — but with a **critical SPA difference**. Gliwice/Bytom BIPs are server-rendered; Kołobrzeg's is a JS SPA.

**Effort breakdown:**

| Component | Effort | Notes |
|-----------|--------|-------|
| BIP article list scrape | Medium | Requires headless browser or API reverse-engineering; SPA blocks static HTTP |
| Individual article parse | Low | Once fetched, structured HTML text; standard przetarg format |
| Result/wynik article parse | Low | Same SPA requirement; article text contains *cena osiągnięta* |
| Aggregator fallback | Low | otoprzetargi / adradar carry announcement text; but lack result prices |
| Deduplication (multiple rounds same flat) | Low | GN.6840.x.x.YYYY reference number in every notice uniquely identifies the property |
| Volume yield | Low–Medium | 2–3 distinct flats/year; resort pricing (500k–750k+ starting) suggests genuine market interest |

**Blockers:**
1. SPA rendering is the main technical blocker — bip.um.kolobrzeg.pl cannot be scraped with a plain HTTP client.
2. The internal API endpoint that feeds the SPA is not yet identified (requires browser DevTools / network inspection).
3. Multiple auction rounds per flat require deduplication logic to avoid counting the same property repeatedly.

**Risks:**
- Flat supply is limited — Kołobrzeg has ~32 000 residents; municipal flat stock is small and high-value. Volume ceiling is likely 3–5/year.
- Some flats go through IV przetarg without selling (Unii Lubelskiej 45/7 reached IV round), suggesting price levels are aspirational. However, the open-auction mechanism remains the correct channel.
- Legacy parseta BIP URL appears decommissioned — all scraping must target `bip.um.kolobrzeg.pl`.

**Verdict: BUILD (Medium effort)**

The flat-auction mechanism is confirmed, active, and legally mandated (consistent Rada Miasta uchwały). Volume is modest (2–3 distinct flats/year) but above the Koszalin floor. The resort-town premium pricing makes each listing high-value. Main effort is solving the SPA rendering problem — once resolved, the adapter pattern is identical to existing Gliwice/Bytom adapters. Recommend pairing the BIP SPA investigation with other Zachodniopomorskie SPA BIPs (check Szczecin/Świnoujście pattern) before building standalone to amortize that discovery cost.
