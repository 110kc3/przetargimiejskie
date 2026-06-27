# Spike — Zawiercie (Śląskie · powiat zawierciański)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (High confidence).

## TL;DR

Gmina Zawiercie does not run public flat-sale auctions (ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych). The city BIP's property-sale board is exclusively land plots. The two flat-related entries in the SPRZEDAŻ section are bezprzetargowe sales of co-ownership shares to existing co-owners (Wykaz notices, fixed price, no bidding). ZGM Zawiercie — the dedicated housing manager — runs przetargi only for commercial-unit rental (najem lokali użytkowych), not flat sales. No achieved-price stream exists for flat auctions because there are no flat auctions.

---

## 1. Sells municipal flats at auction?

**No.** Confirmed NO-BUILD trigger.

The PRZETARGI NA NIERUCHOMOŚCI board at zawiercie.bip.net.pl has three subcategories:
- **ZBYCIE NIERUCHOMOŚCI** (years 2022–2026): 100% land plots (nieruchomości gruntowe niezabudowane/zabudowane). Verified across 2023 (20+ entries), 2026 (10 entries YTD) — all land.
- **DZIERŻAWA**: lease of land.
- **SPRZEDAŻ**: only 2 articles total (2024-11-26 and 2025-05-22), both bezprzetargowe sales of a ½ co-ownership share (udział) in a flat to the other co-owner (Wykaz notices, 21-day posting period, no auction). Confirmed by reading the actual PDF attachment (Wykaz, Zarządzenie 464/2025 Prezydenta Miasta Zawiercia).

The only archival record of a flat ustny przetarg nieograniczony on the city BIP is from 2010 (spółdzielcze własnościowe prawo, archived URL `http://www.zawiercie.bip.net.pl/?a=4654`); the page now redirects empty. No repeat of that pattern since.

**ZGM Zawiercie** (Zakład Gospodarki Mieszkaniowej, ul. Towarowa 30) is the gmina's housing manager. Their BIP przetargi board (bip.zgm-zawiercie.pl) lists 90+ entries spanning 2015–2026 — every single one is "Przetarg na najem lokali użytkowych" (commercial-unit lease auctions), never flat sales. LIVE-VERIFIED.

Flat auctions in Zawiercie that do exist come from the private-sector **Spółdzielnia Mieszkaniowa "Hutnik"** (cooperative, not gmina), e.g. a 41 m² flat at ul. Przechodnia 17 auctioned in Aug–Sep 2023 for 155,100 PLN. These are cooperative przetargi on ustanowienie odrębnej własności — entirely outside gmina scope.

---

## 2. Where published? (hosts + boards, URLs)

| Board | URL | Content |
|---|---|---|
| City BIP — PRZETARGI NA NIERUCHOMOŚCI | https://zawiercie.bip.net.pl/kategorie/55-przetargi-na-nieruchomosci | Parent category |
| City BIP — ZBYCIE NIERUCHOMOŚCI | https://zawiercie.bip.net.pl/kategorie/160-zbycie-nieruchomosci | Land-plot auctions only |
| City BIP — SPRZEDAŻ | https://zawiercie.bip.net.pl/kategorie/851-sprzedaz | Bezprzetargowe flat share sales (Wykaz only) |
| ZGM BIP — Przetargi | https://www.bip.zgm-zawiercie.pl/kategorie/przetargi_179 | Commercial-unit rental auctions |
| ZGM public site — przetargi najmu | https://www.zgm-zawiercie.pl/kategorie/przetargi-na-najem-lokali-uzytkowych | Same, public mirror |

No result-notice (informacja o wyniku przetargu) board was found for flat sales — consistent with there being no flat auctions to report results for.

---

## 3. Format + rendering

- **City BIP** (zawiercie.bip.net.pl): Next.js SPA (CMS: Nefeni Sp. z o.o.). Article listing loads via client-side JS. Category pages render server-side HTML with article list; article bodies may require JS. Attachments are machine-readable PDFs served from `zawiercie-api.bip.net.pl` / `zawiercie-docrepo-api.bip.net.pl` — directly fetchable (no auth). Confirmed: attachment 10283 (Wykaz.pdf, 129.6 KB) fetched cleanly as text-PDF.
- **ZGM BIP** (bip.zgm-zawiercie.pl): Classic PHP BIP (alpanet.pl system). Server-rendered HTML, fully crawlable, no JS required. Paginated listing (10/page, 10 pages = ~100 entries). No auth, no bot blocks observed.
- No JSON API discovered. No scanned-PDF observed (only text-PDFs as attachments).
- City BIP article bodies themselves may be SPA-rendered (body content appears in JS-loaded sections marked "Wczytywanie..."); article metadata and PDF attachments are accessible without JS.

---

## 4. Volume + achieved-price stream

- **Gmina flat auctions**: zero volume. No przetarg listings for lokale mieszkalne since at least 2022 on the current BIP; the archival 2010 record is the last known instance.
- **Land-plot auctions** (city BIP, ZBYCIE): active — ~10 entries in H1 2026 alone (YTD through June 2026), primarily unbuilt plots (nieruchomości gruntowe niezabudowane). Potentially scrapeable but out of scope for flat aggregator.
- **ZGM commercial-unit rental auctions**: ~8–10 per year, consistently "najem lokali użytkowych". Not flat sales.
- **Achieved-price stream**: none exists for flat auctions. The Wykaz notices for bezprzetargowe share sales carry a fixed cena (e.g. 45,450 PLN for ½ share at ul. Borowa 24), but these are not auction results.

---

## 5. Adapter effort + verdict

**Closest analog:** None of the reference cities (gliwice/zabrze/bytom/krakow/tarnowskie-gory) maps well — those all have active gmina flat-auction streams. Zawiercie is structurally similar to a city that has moved entirely to bezprzetargowe sales to tenants/co-owners.

**Blockers:**
- No ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych exists on any gmina-controlled board.
- ZGM is commercial-lease only; no flat-sale mandate visible.
- The only flat auctions in the city come from a private cooperative (SM Hutnik), which is outside gmina scope and would require a separate, cooperative-BIP adapter.

**Risks / future watch:**
- Policy could change: if gmina ever restarts flat-auction disposals, the city BIP SPRZEDAŻ category (https://zawiercie.bip.net.pl/kategorie/851-sprzedaz) is the natural publication point and the PDF attachments are machine-readable. Re-check annually.
- SM Hutnik auctions (bip not found; announcements via third-party aggregators like listaprzetargow.pl) could be a future add-on if the app expands to cooperative przetargi.

**VERDICT: NO-BUILD** — gmina Zawiercie does not auction municipal flats. The city BIP is active for land, the ZGM BIP is active for commercial-unit rental. No flat-auction data stream to scrape. Effort is moot. (High confidence — LIVE-VERIFIED across city BIP 2022–2026 and ZGM BIP full archive.)
