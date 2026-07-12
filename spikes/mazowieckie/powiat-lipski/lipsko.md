# Spike — Lipsko (Mazowieckie · powiat lipski)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Low effort). **Built + registered 2026-07-12** (15/15 parse test). ⚠️ Corrections: NOT a SPA, but a **mixed inline-HTML + SCANNED-PDF (OCR)** publisher — 2025+ notices are scanned `/attachment/<uuid>` images (OCR), 2024 are inline `editor-content`. **Land-dominated** with **real achieved prices** (better than the wolow analog's unsold-only inference); the one live flat is bezprzetargowa (out of scope) so the flat path is implemented-but-unverified. Discovery via `/mapa-strony` sitemap (the `/przetargi` page is public procurement). Classify on the "na sprzedaż <subject>" clause (incidental "garaż blaszak" mislabels a whole-body classify). analog wolow×brzeg. teryt 140903_3.

## TL;DR
Miasto i Gmina Lipsko runs ustny przetarg nieograniczony for both flats and land. At least one confirmed flat auction (ul. Słoneczna 21, 49 m², cena wywoławcza 120 000 PLN, 2020/2021). Result boards with achieved prices are published on the same host. Publication channel is a standard Liferay CMS page on samorzad.gov.pl — plain HTML, no auth, no SPA. Volume is low (~1–3 flat auctions/year) for a small gmina (~14k residents). Parallel bezprzetargowo-to-tenant track also exists (Daniszów 19) but does not preclude the public auction track.

## 1. Sells municipal property at auction?
Yes — confirmed. The Burmistrz Miasta i Gminy Lipsko announces ustny przetarg nieograniczony na sprzedaż for residential units (lokale mieszkalne). Evidence:
- "Ogłoszenie o przetargu na sprzedaż lokalu mieszkalnego położonego przy ul. Słonecznej 21 w Lipsku" on lipsko.eu (also mirrored to samorzad.gov.pl).
- MojeLipsko.info also covered this auction independently.
- BIP (lipsko2.bip.gmina.pl, id=365) lists a registry of properties for sale including residential units in buildings at Daniszów 22 and Iłżecka 5.
- Second oral auctions (II przetarg) also recorded, indicating standard re-auction-on-failure cycle.
- A separate bezprzetargowo list (Daniszów 19) co-exists — tenants-right sales — but does not eliminate the public auction stream.

## 2. Where published? (hosts + boards, URLs)

### Announcement board
- **Primary:** `https://samorzad.gov.pl/web/miasto-i-gmina-lipsko/przetargi` — Liferay-based portal, HTML article list.
- **Secondary:** `https://lipsko2.bip.gmina.pl/index.php?id=365` — older BIP host (bip.gmina.pl platform), also HTML.
- **Municipal news site:** `https://www.lipsko.eu` — echoes auction announcements (e.g. article id=1563).

### Result / achieved-price board
- `https://samorzad.gov.pl/web/miasto-i-gmina-lipsko/` — "Informacja o wyniku przetargu" articles published on the same Liferay host. Confirmed example: działka ewid. 392/3 w Wólce, cena wywoławcza 56 600 PLN, cena osiągnięta 57 170 PLN net.
- Results for flat auctions expected on the same board (no separate URL pattern observed).

## 3. Format + rendering
- **samorzad.gov.pl** (primary): Liferay CMS, server-rendered HTML. Article list + individual article pages. No login, no bot challenge observed. Standard `requests` + `BeautifulSoup` sufficient.
- **lipsko2.bip.gmina.pl** (secondary BIP): older bip.gmina.pl platform, also server-rendered HTML with `index.php?id=` routing. Same scraping approach.
- **lipsko.eu**: Joomla-style CMS, HTML, article IDs in URL path. Cross-check source only.
- No scanned PDFs, no JSON endpoints, no SPA identified on any of these hosts for auction content.
- Achieved-price data appears inline in HTML article text (not in a structured table), requiring regex or text extraction.

## 4. Volume + achieved-price stream
- Confirmed flat auctions: at least 1 (ul. Słoneczna 21; also a "przypomnienie" re-post suggests it ran twice). Land/plot auctions also present (Wólka, Lipa Miklas, Lipsko plots).
- Expected annual volume: **1–3 flat auctions/year** given gmina size (~14k residents, small municipal housing stock).
- Achieved-price stream: confirmed — "Informacja o wyniku przetargu" pattern on samorzad.gov.pl. Land result confirmed with exact price (57 170 PLN). Flat result articles expected by same mechanism.
- Historic depth: samorzad.gov.pl/przetargi board likely holds several years of articles; lipsko.eu also archives.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** any small Mazowieckie gmina using samorzad.gov.pl (Liferay) — identical CMS, identical URL patterns. Pattern already likely resolved in prior adapters (e.g. other powiat seats on the same platform).

**Effort breakdown:**
- Scraper: list page pagination on samorzad.gov.pl/przetargi → article detail → regex for address, area, cena wywoławcza, date. Low.
- Result scraper: same host, "wynik przetargu" keyword filter → extract cena osiągnięta. Low.
- BIP secondary: optional cross-check; same low effort.
- No auth, no CAPTCHA, no PDF-OCR needed.

**Blockers:** none identified. Volume is low so deduplication logic is trivial.

**Verdict: BUILD — Low effort.** Standard Liferay HTML adapter, achieved-price stream confirmed, flat auctions verified DESK.
