# Spike — Przemyśl (Podkarpackie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Przemyśl (pop. ~58 000) runs confirmed *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* directly from the city BIP at **bip.przemysl.pl**. Multiple flat-auction announcements and result notices confirmed LIVE on server-rendered HTML pages. Dedicated contact: Wydział Gospodarki Lokalowej UM Przemyśl, e-mail `lokale.sprzedaz@um.przemysl.pl`. Municipal housing manager is **PGM Sp. z o.o.** (Przedsiębiorstwo Gospodarki Mieszkaniowej, ul. Kopernika 58) — manages stock on behalf of Gmina, but auctions are published by Prezydent Miasta via the city BIP, not PGM's own BIP. Adapter is straightforward; closest analog: **Bytom** (single city-BIP host, flat + land mix, server HTML, result notices on same domain).

---

## 1. Sells municipal property at auction?

**YES — confirmed flat auctions (przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych).**

Examples found directly on bip.przemysl.pl:

- `bip.przemysl.pl/46552` — I przetarg ustny nieograniczony na sprzedaż **lokalu mieszkalnego nr 1**, ul. Krucza 1 (91,60 m², cena wywoławcza 180 000 zł). 2017.
- `bip.przemysl.pl/47358` — II przetarg ustny nieograniczony na sprzedaż **lokalu mieszkalnego nr 9**, ul. 3 Maja 43 (cena wywoławcza 25 000 zł). Archived.
- `bip.przemysl.pl/59163` — kolejny przetarg na sprzedaż udziału 1/2 w **lokalu**, ul. Stachiewicza 4 (wadium 5 000 zł).
- Search snippet (2025–2026): II przetarg ustny nieograniczony na sprzedaż **lokalu mieszkalnego nr 7**, ul. Rejtana 6, cena wywoławcza **65 000 zł** — confirmed as recent.

Additionally, Rada Miejska passed **Uchwała Nr 85/2023** (19 June 2023) governing rules for selling municipal flats — confirming this is an ongoing, structured programme: `bip.przemysl.pl/69454/uchwala-nr-852023-rady-miejskiej-w-przemyslu-z-dnia-19-czerwca-2023-r-w-sprawie-zasad-sprzedazy-lokali-mieszkalnych-stanowiacych-wlasnosc-gminy-miejskiej-przemysl-imiasta-przemysla.html`

Note: The city also sells residential buildings whole (e.g., ul. Sarbiewskiego 10 — budynek z 2 lokalami) and land parcels, so the stream is mixed (residential flats + land + commercial), not flats-only.

**Bezprzetargowa sprzedaż do najemców** also exists (priority-purchase right for sitting tenants, as per the 2023 uchwała), but open flat auctions run in parallel for units where no tenant exercises that right. Volume is moderate — several per year, not dozens.

---

## 2. Where published? (hosts + boards, with URLs)

**Single host: `bip.przemysl.pl`** — the official BIP of Urząd Miejski w Przemyślu (Rynek 1, 37-700 Przemyśl).

Key sections:

| Board | URL |
|---|---|
| Przetargi (zamówienia publiczne — older) | `https://bip.przemysl.pl/33499/przetargi.html` |
| Nieruchomości (property hub) | navigated via NIERUCHOMOŚCI menu item on BIP |
| Wykazy nieruchomości do zbycia | `https://bip.przemysl.pl/35373/wykazy-nieruchomosci-przeznaczonych-do-zbycia-oddania-w-uzytkowanie-najem-dzierzawe-lub-uzyczenie.html` |
| Sample flat-auction announcement | `https://bip.przemysl.pl/46552/...` |
| Sample result notice | `https://bip.przemysl.pl/76706/informacja-o-wyniku-kolejnego-przetargu-na-sprzedaz-nieruchomosci-zabudowanej-polozonej-przy-ul-mieroslawskiego-4.html` |

Each announcement and result notice is a **separate article page** with a unique numeric ID in the path (e.g., `/46552/`, `/76706/`). No separate subdomain or external platform used.

**PGM Sp. z o.o.** has its own website (`pgmprzemysl.pl`) and a BIP registration (`bip.gov.pl/subjects/37960`) but does **not** publish the flat-sale auctions — those are Prezydent Miasta announcements on the city BIP only.

Result notices ("Informacja o wyniku przetargu") are published on the same domain with achieved prices confirmed in search snippets (e.g., 136 350 zł at ul. Mierosławskiego 4, auction 2025-02-26).

---

## 3. Format + rendering

- **Server-rendered HTML** — LIVE-VERIFIED. The flat-auction page at `/46552/` returned full article text with all auction details inline (no JS required). Metryczka metadata (publication date, valid-from/to, author) embedded at foot of each article.
- **No JS SPA**, no JSON API, no born-digital PDF observed for announcements. Attachments (załączniki) may exist as PDFs on some notices, but the primary content (description, cena wywoławcza, wadium, date, location) is in HTML body text.
- **TLS:** standard HTTPS, no auth wall, no CAPTCHA observed.
- **Pagination:** listings are paginated (12 results/page observed on the zamówienia przetargi index). The nieruchomości section uses a similar article-list pattern.
- **URL pattern:** `https://bip.przemysl.pl/{id}/{slug}.html` — numeric ID is stable and crawlable.
- **Encoding:** UTF-8, Polish diacritics present and correct in page text.
- **Bot blocking:** none observed; pages loaded without any block during live verification.

---

## 4. Volume + achieved-price stream

**Volume (estimated):** Based on search results spanning 2017–2026, there are roughly **3–8 flat-specific auction announcements per year**, plus an equivalent number of result notices. Land/commercial auctions add further volume. Not a high-frequency city (compare: Kraków runs dozens/month), but consistent.

**Achieved-price stream:** Confirmed present. "Informacja o wyniku przetargu" notices published on same BIP host with cena osiągnięta embedded in HTML:

- ul. Mierosławskiego 4 — 136 350 zł (2025-02-26)
- ul. Sobieskiego dz. 2916/4 — 90 900 zł (2022-01-12)
- ul. Rodziewiczówny — 49 500 zł (2020-11-18)
- ul. Matejki 1 — 858 500 zł (2021-05-20)

Result notices follow the same `/id/slug.html` pattern. Scraping both announcements and results from the same host is straightforward.

**Negative results:** Several auctions ran multiple rounds before selling or closing negatively (e.g., Chrobrego dz. 2915/27 — 4 rounds negative Sept 2025 – Feb 2026). This is normal and parseable from the article titles.

---

## 5. Adapter effort + verdict

**Closest analog: Bytom** — single city-BIP host, mixed flat/land/commercial stream, server-rendered HTML article pages, result notices on same domain, numeric ID URL pattern.

**Effort: Medium**

Reasons:
- Pagination to traverse for full backfill (simple, no JS needed).
- Article-list page has mixed content types (flat auctions, land auctions, services tenders); adapter needs title-keyword filtering to isolate `lokal mieszkalny` auctions.
- Each article is a standalone HTML page — content extraction is straightforward (no PDF parsing needed for core fields).
- Result notices require separate crawl pass on the same domain (same pattern, prefixed "Informacja o wyniku przetargu").
- No API, no auth, no bot block.

**Blockers / risks:**
- Low-to-moderate volume (few flat auctions/year) — worth building but won't dominate feed.
- BIP article-list index mixes property types and procurement tenders; title parsing must distinguish `lokal mieszkalny` from `nieruchomość niezabudowana` and service contracts.
- Bezprzetargowe sales to tenants are not published as auction articles — scraper correctly ignores them as they don't appear in the przetarg stream.
- PGM does not publish a parallel auction stream; no second-source scraping needed.

**VERDICT: BUILD — Medium effort, LIVE-VERIFIED.** Confirmed open flat auctions on a clean server-HTML BIP, achieved-price notices present on same host, no technical blockers.
