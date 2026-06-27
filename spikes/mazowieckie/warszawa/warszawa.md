# Spike — Warszawa (Mazowieckie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (High effort).

## TL;DR

Warszawa actively sells municipal flats at open *przetarg ustny nieograniczony*. The
primary aggregation point is the city-wide **Elektroniczna Tablica Ogłoszeń (ETO)**
at `eto.um.warszawa.pl`, which publishes both auction announcements and achieved-price
result notices for all 18 dzielnice. Individual dzielnica portals (e.g. Śródmieście,
Żoliborz) host the underlying HTML announcement pages; result detail sometimes
redirects to `bip.warszawa.pl/web/<dzielnica>/`. Auction notices frequently carry a
linked `.docx` attachment containing the full terms sheet. Volume is real but
fragmented: scraping the single ETO category feed (`/category/165/`) gives a
near-complete view. Effort is high versus a single-site city, but the ETO aggregator
makes it tractable as one primary scrape target. Closest analog: **Kraków** (single
portal aggregates across units; per-unit deep links for price data).

---

## 1. Sells municipal property at auction?

**Yes — confirmed LIVE.** Warszawa runs *przetarg ustny nieograniczony na sprzedaż
lokali mieszkalnych* under:

- Art. 38(1) of the Act of 21 August 1997 on Real Estate Management
- Regulation of the Council of Ministers of 14 September 2004 on auction/negotiation
  procedures
- Zarządzenie nr 4919/2013 Prezydenta m.st. Warszawy z dn. 30.08.2013 — specific
  Warsaw presidential order mandating flat sales via auction

Confirmed live examples fetched 2026-06-27:

| Announcement | Dzielnica | Type |
|---|---|---|
| Nr 8944/2026 (04-05-2026) | Śródmieście | Wynik — lokal mieszkalny nr 11, ul. Okrąg 2 |
| Nr 8936/2026 (04-05-2026) | Śródmieście | Wynik — lokal mieszkalny nr 2a, ul. Noakowskiego 10 |
| Nr 8108/2026 (22-04-2026) | Śródmieście | Ogłoszenie — lokale nr 17 i 18, ul. Noakowskiego 4 (auctions 9.07.2026) |
| Nr 8148/2026 (27-04-2026) | AMW (Agencja Mienia Wojskowego) | Lokal nr 9, ul. Smocza 4 |
| Nr 6610/2026 (09-04-2026) | AMW | Lokal nr 1, ul. Bałuckiego 5 |
| Nr 4671/2026 (12-03-2026) | AMW | Lokal nr 78, ul. Grójeckiej 66 |
| III przetarg, Żoliborz (earlier in 2026) | Żoliborz | Lokal nr 11, ul. Mickiewicza 18C |

**Important nuance:** most residential sales go *bezprzetargowo* to sitting tenants
(standard PL law); the auctions cover units **not occupied by a statutory-right
tenant** — a subset, but a consistent and ongoing stream. Additionally, State Treasury
flats managed by ZMSP (Zarząd Mienia Skarbu Państwa) publish a separate *wykaz*
stream (`zmsp.bip.warszawa.pl`), running ~81 wykazów through 2024 (low auction
conversion expected). AMW (Agencja Mienia Wojskowego) also uses ETO for Warsaw
military-flat auctions.

Land and commercial properties are more numerous on ETO `/category/158/` (Sprzedaż),
but flat auctions in `/category/165/` are confirmed real and ongoing.

---

## 2. Where published? (hosts + boards, with URLs)

### Primary aggregator — single scrape entry point

| Board | URL | Content |
|---|---|---|
| ETO "Wykup lokalu, przetargi" | https://eto.um.warszawa.pl/category/165/announcement | All flat auction announcements + result notices across all dzielnice. RSS available. ~7 active items in May 2026 window. |
| ETO "Sprzedaż" (land/buildings) | https://eto.um.warszawa.pl/category/158/announcement | Land + commercial. Separate from flat stream. |
| ETO root — Lokale mieszkalne | https://eto.um.warszawa.pl/category/149 | Parent category; shows sub-category counts |

### Per-dzielnica deep links (source of announcement HTML + docx)

Each dzielnica portal hosts the actual auction detail page; ETO links out to these.
Confirmed active publishers of flat auctions:

| Dzielnica | URL pattern | Notes |
|---|---|---|
| Śródmieście | `https://srodmiescie.um.warszawa.pl/przetargi-na-sprzedaz` | Active; lists current flat auctions; also `https://srodmiescie.um.warszawa.pl/-/przetargi-na-sprzedaz-nieruchomosci` |
| Żoliborz | `https://zoliborz.um.warszawa.pl/` (individual article URLs) | Confirmed flat auctions |
| Bielany | `https://bielany.um.warszawa.pl/nieruchomosci-na-sprzedaz` | Land-focused in live page; redirects to ETO |
| Mokotów | `https://mokotow.um.warszawa.pl/przetargi` | Points to BIP search for property notices |
| All dzielnice (general) | `https://<dzielnica>.um.warszawa.pl/` | Uniform Liferay CMS across all 18 dzielnice |

### Result notices (achieved price)

- ETO `/category/165/` announces result notices directly ("Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego…")
- Result links point to `bip.warszawa.pl/web/<dzielnica>/-/<slug>` — these timed out on direct fetch; likely same Liferay CMS, server-rendered

### ZMSP (State Treasury flats — separate pipeline)

- BIP: https://zmsp.bip.warszawa.pl/wykazach-lokali-mieszkalnych-na-sprzedaz
- Only 2 published wykazów visible (Oct 2024, Nov 2024); auction conversion unconfirmed
- Separate institution; probably low-volume and out of scope for MVP

### Supporting references

- City nieruchomości map/portal: https://um.warszawa.pl/nieruchomosci (redirects to `mapa.um.warszawa.pl`)
- Auction venue: Biuro Mienia Miasta i Skarbu Państwa, ul. T. Chałubińskiego 8, sala 446 (also per-dzielnica venues e.g. Śródmieście uses Nowogrodzka 43)
- Contact dept: Wydział V BMiSP, tel. 22 44 32 034

---

## 3. Format + rendering

| Layer | Format | Notes |
|---|---|---|
| ETO listing page | Server-rendered HTML | Liferay CMS; list of announcements with title + publication period. No JS SPA. Paginated. RSS feed available per category. |
| Announcement detail (dzielnica portal) | Server-rendered HTML (Liferay) | Live fetch confirmed on `srodmiescie.um.warszawa.pl`. Clean HTML with article body text. |
| Auction terms document | **DOCX attachment** | Śródmieście announcement links to `.docx` file on CDN (`cdn.um.warszawa.pl/documents/…`). Key structured fields (address, floor, area, cena wywoławcza, wadium, date) are in the DOCX, not the HTML body. This is the main parsing challenge. |
| Result notice detail | Server-rendered HTML on `bip.warszawa.pl` | Direct fetch timed out; likely same Liferay stack. Achieved price presumed in HTML body text. |
| TLS/auth | TLS, no auth, no bot block | All pages fetched without any auth. No Cloudflare. Standard UA sufficient. |
| API / JSON | None found | No open REST API for property listings. `api.um.warszawa.pl` exists for city data but no nieruchomości endpoint confirmed. |

**Key format risk:** the primary detail data (lokal number, area m², cena wywoławcza,
wadium amount) appears in the linked `.docx` rather than the HTML body of the ETO
announcement. Adapter must fetch and parse DOCX (python-docx or similar) in addition
to the HTML page.

---

## 4. Volume + achieved-price stream

**Volume estimate:** ETO `/category/165/` showed 7 items active in a ~30-day window
(April–May 2026), covering a mix of announcement + result notices. Extrapolating: ~3–5
fresh flat auctions per month city-wide. This is low-to-medium absolute volume but
meaningful for a capital-city entry. Śródmieście alone ran 2 result notices + 2
upcoming auctions within a single 6-week window.

AMW (military agency) contributes ~3–5 additional Warsaw flat auctions per month
via the same ETO board — these are a bonus stream, distinct institution.

**Achieved-price stream:** CONFIRMED. ETO publishes "Informacja o wyniku przetargu
ustnego nieograniczonego na sprzedaż lokalu mieszkalnego" notices with short
publication windows (e.g. 04-05-2026 to 12-05-2026 — only 8 days). **Scraping must
run frequently (daily) or price data will be missed.** The actual price figure is
presumably in the linked `bip.warszawa.pl` page body — not confirmed on live fetch
(timed out), but this is standard PL practice.

ZMSP stream: separate; 2 wykazów in ~2 months (Oct–Nov 2024) — pre-auction listings,
not auction results. Low signal; deprioritize for MVP.

---

## 5. Adapter effort + verdict

### Closest analog

**Kraków** — both have a single portal aggregating multi-unit announcements into one
listing board (ETO here, BIP przetargi for Kraków), with per-unit deep links for full
detail. Key difference: Warszawa's flat notices attach a `.docx`; Kraków uses inline
HTML. Warszawa is meaningfully harder.

### Architecture

```
ETO /category/165/ (HTML list, RSS)
  └─ per-announcement URL (HTML on dzielnica portal OR bip.warszawa.pl)
       └─ .docx attachment link (CDN) → parse with python-docx
            └─ structured fields: address, lokal nr, area m², cena wywoławcza, wadium, date
  └─ result notice URL → achieved price in HTML body (bip.warszawa.pl)
```

### Blockers / risks

1. **DOCX parsing required** — most structured data (price, area, address) lives in
   the `.docx` attachment, not the HTML. Need a DOCX parsing step; not needed for any
   existing city adapters. Medium complexity.
2. **Short result-notice windows** — 8-day publication on ETO means daily polling is
   mandatory to capture achieved prices. A weekly run would miss ~80% of them.
3. **18-dzielnica fragmentation** — ETO `/category/165/` appears to aggregate all
   dzielnice, so a single feed is viable. However, some dzielnice may post to their
   own portals and not cross-post to ETO (not yet confirmed). Needs monitoring.
4. **AMW co-mingling** — Agencja Mienia Wojskowego posts to the same ETO category.
   Filter by "Śródmieście/Żoliborz/…" in title vs "Agencja Mienia Wojskowego" is
   needed; AMW flats can be included or excluded based on scope decision.
5. **bip.warszawa.pl fetch latency** — direct fetch timed out at 180s. May need
   retry logic or browser-rendered fetch for result pages. CDN-hosted DOCX fetched
   fine.
6. **Volume is modest** — ~3–5 city-owned flat auctions/month + ~3–5 AMW. Worth it
   given Warszawa's profile and price levels (cena wywoławcza seen at 965,000 zł and
   1,182,000 zł — highest-value listings in the project).

### Effort rating

**High** — relative to Gliwice/Zabrze/Bytom (single HTML page, inline data, no DOCX).
Comparable to or slightly above Kraków. Breakdown:
- ETO list scraper: 1–2 days
- Per-announcement HTML parser: 1 day
- DOCX parser (python-docx, field extraction): 2–3 days
- Result-notice parser + achieved-price extraction: 1–2 days
- Daily polling infra + dedup: 1 day
- Testing across dzielnice + AMW filtering: 1–2 days

**Total estimate: ~7–10 dev days.**

### VERDICT: BUILD

Strong signal: confirmed active flat auction stream with achieved-price notices,
single ETO aggregator covering all dzielnice, server-rendered HTML (no JS SPA, no
auth). The DOCX step adds effort but is solvable. Warszawa's high flat values make
it the most commercially interesting city in the project. Recommend scheduling after
Kraków (shared portal architecture) to reuse lessons learned.

---

### Source URLs (live-fetched 2026-06-27)

- https://eto.um.warszawa.pl/category/165/announcement — ETO "Wykup lokalu, przetargi" (LIVE)
- https://eto.um.warszawa.pl/category/158/announcement — ETO "Sprzedaż" (LIVE)
- https://eto.um.warszawa.pl/category/149 — ETO Lokale mieszkalne parent (LIVE)
- https://srodmiescie.um.warszawa.pl/przetargi-na-sprzedaz — Śródmieście flat auction board (LIVE)
- https://srodmiescie.um.warszawa.pl/-/ul-noakowskiego-4-przetargi-ustne-nieograniczone-na-sprzedaz-lokali-mieszkalnych-nr-17-i-18 — live flat auction announcement (LIVE)
- https://zmsp.bip.warszawa.pl/wykazach-lokali-mieszkalnych-na-sprzedaz — ZMSP State Treasury wykazy (LIVE)
- https://bielany.um.warszawa.pl/nieruchomosci-na-sprzedaz — Bielany dzielnica (LIVE)
- https://mokotow.um.warszawa.pl/przetargi — Mokotów dzielnica (LIVE)
- https://bip.warszawa.pl/web/srodmiescie/-/srodmiescie-informacja-o-wyniku-... — result notice (TIMED OUT, not verified)
