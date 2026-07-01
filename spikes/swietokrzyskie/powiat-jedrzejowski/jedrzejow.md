# Spike — Jędrzejów (Świętokrzyskie · powiat jędrzejowski)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Jędrzejów actively sells municipal flats (lokale mieszkalne) via *ustny przetarg nieograniczony*. Announcements and auction-result notices (informacja o wyniku) are published on the current BIP at `bip.jedrzejow.eu` (Otwarty BIP / eBiuletyn SaaS platform). The old eobip.pl domain still exists as a mirror/archive but returns empty bodies. Volume is low (typically 2–4 flats per round, 2–3 rounds/year). Result notices include the achieved price. Format is HTML with possible PDF attachments. No auth/bot blocks detected. Closest analog: similar small-town Świętokrzyskie BIP setups (e.g., Włoszczowa, Pińczów).

## 1. Sells municipal property at auction?

YES — confirmed. The Burmistrz of Jędrzejów regularly conducts *przetarg ustny nieograniczony na sprzedaż nieruchomości komunalnych* that include **lokale mieszkalne**. Concrete examples found:

- Lokal nr 20, ul. 11 Listopada 111, 33.00 m² + 6.84 m² pomieszczenie przynależne
- Lokal nr 47, ul. Armii Krajowej 1, 42.32 m² + 3.27 m² pomieszczenie przynależne
- Lokal nr 5, ul. Armii Krajowej 7, 48.62 m² + 2.40 m²
- Auction rounds confirmed: 2024-11-28, 2025-10-16, 2026-02-19 (result notice confirmed)

Not bezprzetargowo-only — open public auctions with wadium (20% of opening price), standard ustawa o gospodarce nieruchomościami procedure.

## 2. Where published? (hosts + boards, URLs)

**Primary / current BIP:**
- Announcement board: `https://bip.jedrzejow.eu/wiadomosci/3/lista/przetargi`
- Year-filtered lists: `https://bip.jedrzejow.eu/wiadomosci/3/lista/1/{YEAR}` (e.g., `/1/2025`, `/1/2024`)
- Platform: Otwarty BIP / eBiuletyn (modern SaaS, clean URL routing, no JSP)

**Legacy / archive BIP (do not scrape — returns empty bodies):**
- `jedrzejow.eobip.pl` and `www.jedrzejow.eobip.pl` — old JSP-based system, now mirrors with blank content

**Result notices ("informacja o wyniku"):**
- Published in the same przetargi board on bip.jedrzejow.eu
- Result confirmed: 2026-02-19 notice explicitly titled "Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości komunalnych"

**Aggregators (secondary, not scraped):**
- `listaprzetargow.pl/oferty/38545` (mirrors some notices)
- `przetargi.adradar.pl/przetargi/all/80389/Jędrzejów/all`

## 3. Format + rendering

- **HTML** — primary format; announcement text published inline in the BIP article body
- **PDF attachments** — likely for formal ogłoszenie documents (common in ebiuletyn-class platforms); not confirmed via direct fetch due to rate limits, but search snippets reference both HTML and PDF
- **No SPA / no auth** — standard server-rendered HTML list + article pages
- **No bot blocks detected** — standard public BIP, no CAPTCHA or login wall observed
- **Old eobip.pl domain** — returns empty HTTP bodies (200 with no content); scraper must target `bip.jedrzejow.eu` exclusively

## 4. Volume + achieved-price stream

- **Volume:** Low — typically 2–4 lokale mieszkalne per auction round, 2–3 rounds per year → ~4–8 flats/year
- **Opening prices seen:** 55,000 PLN (small flat), 91,450 PLN (48.62 m²) — consistent with small Świętokrzyskie town valuations
- **Result notices:** Published post-auction on the same BIP board with "informacja o wyniku" title; search evidence confirms these exist for 2024, 2025, and 2026 rounds
- **Achieved price in result notices:** Standard practice under art. 38 ustawy o gospodarce nieruchomościami requires publishing final price — confirmed notice structure from search results. Direct page fetch blocked by rate limit; NEEDS-LIVE-VERIFY for exact field names.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Włoszczowa or Pińczów (other small Świętokrzyskie powiat seats on eBiuletyn-class BIPs with low-volume flat auctions).

**Effort: Medium**

- List scraper: straightforward — paginated HTML list at `/wiadomosci/3/lista/1/{YEAR}`, filter by keyword "lokal mieszkalny" or "nieruchomości komunalnych"
- Article parser: inline HTML body; extract address, area, opening price, date
- Result parser: match "informacja o wyniku" articles; extract final price — field label to be confirmed live
- PDF handling: may need fallback PDF parser if some announcements are PDF-only attachments
- Volume too low for a standalone priority build, but low adapter cost makes it viable as part of a batch Świętokrzyskie wave

**Blockers / risks:**
1. PDF attachment format for formal ogłoszenia — not confirmed (live fetch rate-limited)
2. Exact field name for "cena osiągnięta" in result notices — needs one live page read
3. Old eobip.pl archive not accessible — historical data pre-~2022 may be lost

**Recommendation:** BUILD as part of Świętokrzyskie batch; low scraping complexity, confirmed flat auction stream with result notices.
