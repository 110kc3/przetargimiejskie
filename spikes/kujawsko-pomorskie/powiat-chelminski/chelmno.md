# Spike — Chełmno (Kujawsko-Pomorskie · powiat chełmiński)
> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Miasto Chełmno actively sells municipal flats at ustny przetarg nieograniczony via a clean Logonet-platform BIP. 11 pages of historical listings visible; flat auctions confirmed in 2023–2026. Achieved-price is embedded in each listing's `Rozstrzygnięcie` field — machine-readable in-page HTML. An XML feed exists per-page. No SPA, no auth, no bot blocks observed. Closest analog to any other Logonet-based BIP city (same CMS as e.g. Golub-Dobrzyń). Low adapter effort.

## 1. Sells municipal property at auction?

YES — confirmed flat sales at przetarg ustny nieograniczony, operated by Burmistrz Miasta Chełmna under art. 37/38/39/40 ustawy o gospodarce nieruchomościami.

Recent flat auction examples (lokal mieszkalny, ustny nieograniczony):
- ul. Wodna 34/9 (25.89 m²) — I przetarg 08.01.2026, II 19.02.2026, III 16.04.2026, cena wywoławcza 65 000–70 000 zł; all three negative (nikt nie przystąpił)
- ul. Św. Ducha 21/5 — przetargi in 01.2024, 06.2024, 10.2024, 12.2024, 04.2025
- ul. Toruńska 8/7 (27.67 m²) — I–VIII przetarg 03.2023–08.2024; sold 06.08.2024 at 29 290 zł

Also sells nieruchomość zabudowana (multi-family buildings as whole, e.g. ul. Kamionka 2) and occasional przetarg ustny ograniczony for ancillary rooms (pomieszczenia przynależne).

## 2. Where published? (hosts + boards, URLs)

**Announcement board (ogłoszenia):**
- `https://bip.chelmno.pl/przetargi-nieruchomosci/781` — paginated listing (11 pages × 10 per page = ~110 entries; years 2020–2026)
- Individual announcement: `https://bip.chelmno.pl/przetarg-nieruchomosci/{ID}/{slug}`
- XML variant of each page: `https://bip.chelmno.pl/przetargi-nieruchomosci/xml/{page}/1`
- XML variant per item: `https://bip.chelmno.pl/przetarg-nieruchomosci/xml/{ID}/1`

**Result/achieved-price data:**
- Embedded in the same individual listing page under a `Rozstrzygnięcie` section (plain HTML text, e.g. "Nabywcą nieruchomości został Pan X za cenę 29.290,00 zł." or "Nikt nie przystąpił do przetargu. Przetarg zakończył się wynikiem negatywnym.")
- Status column on listing page shows: Aktualne / W trakcie rozstrzygania / Rozstrzygnięte / Unieważnione
- No separate results board — resolution text is on the same record.

**Physical notice board:** ul. Dworcowa 1 Chełmno (mandatory per ustawa, not machine-readable).

**Contact for property dept:** mieszkania@chelmno.pl, tel. 56 677-17-14, pok. 110.

## 3. Format + rendering

- **CMS:** Logonet Sp. z o.o. Bydgoszcz, system v2.9.0 — standard server-rendered HTML, no SPA
- **Listing page:** static paginated HTML table (no JS required to render rows); pagination via URL path `/przetargi-nieruchomosci/{page}/{per-page}`
- **Individual record:** clean HTML article with structured metadata table (fields: Adres, Przetarg na, Typ przetargu, Rodzaj nieruchomości, Cena wywoławcza, Data przetargu) + free-text announcement body + Rozstrzygnięcie block
- **PDF export:** each record has "Zapisz do PDF" link (`/przetarg-nieruchomosci/pdf/{ID}/1`) — not needed for scraping
- **XML feed:** `Content-Type: application/xml` confirmed (binary/text); may allow structured parsing — worth testing
- **No auth, no CAPTCHA, no bot blocks** observed across three fetches; robots meta = `index,follow,all`
- **Filter UI on listing page:** type dropdown (przetarg ustny nieograniczony etc.), rodzaj nieruchomości dropdown (lokal mieszkalny etc.), rok publikacji, status — these are HTML form filters that submit GET params, so filterable scrapes are possible

## 4. Volume + achieved-price stream

- **Total listings:** 11 pages × 10 = ~110 records visible in BIP (going back to at least 2020; year filter shows 2020–2026)
- **Flat-specific (lokal mieszkalny):** estimated ~30–40 of the ~110; mix of nieograniczony and ograniczony
- **Auction cadence:** roughly 1–2 flat auctions active at any given time; each flat may run 3–8+ rounds (very hard-to-sell stock)
- **Achieved-price stream:** YES — embedded in Rozstrzygnięcie field of each resolved record; includes winner name and final price or negative result statement. Field updates in-place on the same URL (no separate results page).
- **Price range observed:** 29 000–85 000 zł for small municipal flats (20–28 m², often requiring major renovation); multi-family building whole: 87 000–380 000 zł

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** any other Logonet BIP city (same CMS, same URL scheme, same field layout). If the project already has a Logonet adapter, this is near-zero marginal work.

**Scraping approach:**
1. Paginate `https://bip.chelmno.pl/przetargi-nieruchomosci/{page}/25` (25 per page, filter: `rodzaj=lokal+mieszkalny`)
2. For each listing row, extract: address, przetarg type, rodzaj, cena wywoławcza, data przetargu, URL
3. Fetch individual record for full text + Rozstrzygnięcie (achieved price or negative result)
4. Optionally use XML feed variant for structured parsing

**Blockers:** None identified. No JS rendering needed, no auth, no bot protection.

**Effort rating: Low** — standard HTML scrape, Logonet CMS identical to other spiked cities in this voivodeship. One possible complication: achieved-price resolution text is free-form Polish prose (regex or NLP needed to extract numeric price vs. negative result).

**VERDICT: BUILD**
