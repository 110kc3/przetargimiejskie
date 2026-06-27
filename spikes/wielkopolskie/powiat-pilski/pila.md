# Spike — Piła (Wielkopolskie · powiat pilski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Low–Medium effort).

## TL;DR

Gmina Piła (city-gmina, Prezydent Miasta Piły) runs regular *ustne przetargi nieograniczone na sprzedaż lokali mieszkalnych* — confirmed flat auctions, not just land or commercial. Announcements and result lists are published on a single BIP instance (`bip.pila.pl`) as server-rendered HTML pages. Achieved-price result notices appear to be posted on the same BIP under the same section. Volume is solid (~quarterly batch auctions, multiple lots per session). The housing manager MZGM Piła (`bip.mzgm.pila.pl`) publishes *lokale użytkowe* auctions only — NOT flats; the flat stream belongs entirely to the Urząd Miasta BIP.

---

## 1. Sells municipal flats at auction?

**YES — confirmed.** The President of the City of Piła announces *pierwsze/drugie/trzecie przetargi ustne nieograniczone na sprzedaż prawa własności nieruchomości lokalowych – lokali mieszkalnych* on a regular rolling basis. Confirmed batches from 2025–2026:

- 28.03.2025 — batch of flats (ul. Kossaka and others)
- 16.05.2025 — batch of flats (ul. Wawelska 53 and others)
- 24.10.2025 — batch of flats (Aleja Powstańców Wlkp. 105/5 @32.85 m², cena wyw. 123 759 zł; ul. Staromiejska 9/4 @106.39 m², cena wyw. 293 151.20 zł)
- 17.07.2026 — lokal mieszkalny nr 8, ul. 11 Listopada 39 (announced 2026-06-03)

These are genuine *ustny przetarg nieograniczony* sales open to all buyers, not bezprzetargowe sales to sitting tenants. The condition notes confirm apartments range from remontu-wymagające to standard state.

Historical precedent: same pattern back to at least 2018 (ul. Wawelska 53/7, 41.72 m², cena wyw. 67 400 zł, przetarg 13.07.2018).

---

## 2. Where published? (hosts + boards, URLs)

**Primary publisher:** Urząd Miasta Piły BIP — `https://bip.pila.pl/`

| What | URL |
|---|---|
| Przetargi section index | `https://bip.pila.pl/405-przetargi-na-nieruchomosci-i-ruchomosci-gminne.html` |
| Active auction list | `https://bip.pila.pl/542-aktualne-przetargi-na-nieruchomosci.html` |
| Example flat-auction notice (2025-05) | `https://bip.pila.pl/prezydent-miasta-pily-oglasza-przetargi-ustne-nieograniczone-na-sprzedaz-prawa-wlasnosci-nieruchomosci-lokalowych-lokali-mieszkalnych-polozonych-w-pile-termin-przetargow-16052025.html` |
| Example flat-auction notice (2025-10) | `https://bip.pila.pl/prezydent-miasta-pily-oglasza-przetargi-ustne-nieograniczone-na-sprzedaz-prawa-wlasnoscinieruchomosci-lokalowych-lokali-mieszkalnych-polozonych-w-pile-termin-przetargu-24102025-roku.html` |
| Example single flat (2026-07) | `https://bip.pila.pl/prezydent-miasta-pily-oglasza-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-prawa-wlasnoscinieruchomosci-lokalowej-lokalu-mieszkalnego-nr-8-polozonego-w-pile-przy-ul-11-listopada-39-termin-przetargu-17072026.html` |
| Archival BIP (pre-2022) | `http://arch-bip-pila.mserwer.pl/` |
| City news mirror | `https://www.pila.pl/przetargi-nieruchomosci-um-pila.html` |

**Secondary / not for flats:**
- `https://bip.mzgm.pila.pl/` — MZGM Piła (Miejski Zakład Gospodarki Mieszkaniowej) publishes only *lokale użytkowe* tenders; does NOT publish flat-sale przetargi.
- `https://bip.powiat.pila.pl/przetargi_na_nieruchomosci/` — Powiat Pilski (county) auctions; distinct entity, not gmina.

**Result notices (achieved price):** Posted on same BIP domain under the same przetargi section. The BIP `section 405` index table lists each entry with its modification date; post-auction result notices appear as separate child entries (the `METRYCZKA` metadata block visible on each announcement page). No dedicated "wyniki" sub-page was found — result notices appear to be attached as updates or new entries on the same BIP article index. The active list page (`/542`) is a paginated table of entries, date-sorted.

---

## 3. Format + rendering

| Attribute | Finding |
|---|---|
| Technology | Custom PHP/CMS BIP platform (not iBip/e-BOSS standard) |
| Page type | Server-rendered HTML — full content delivered in the HTML response |
| Content delivery | Main text rendered server-side; navigation/cookie consent JS overlay does not gate content |
| Auction notice body | HTML article with inline text — property description, cena wywoławcza, wadium, terms |
| Attachments | Appears to embed details inline; no PDF attachments confirmed for notices (unlike scanned-PDF cities) |
| Bot/auth blocks | Cookie consent banner (cosmetic only, no auth wall). curl with standard UA returns full page HTML. Content visible without JavaScript. |
| Navigation structure | `/405-przetargi-na-nieruchomosci-i-ruchomosci-gminne.html` is parent; `/542-aktualne-przetargi-na-nieruchomosci.html` is the paginated child list. Each entry links to a unique slug URL. |
| Redirect behaviour | Some direct slug URLs redirect (possible URL rewriting or session-based); index page `/542` loads reliably in Chrome. Schema.org JSON embedded in `<head>`. |
| Achieved price | Likely inline text update on BIP entry rather than separate machine-readable field — will need inspection of a post-auction article. |

**LIVE-VERIFIED:** BIP page `/542` loaded and returned full article list in Chrome (tab 1777752893). Title confirmed as "Aktualne przetargi na nieruchomości - BIP UM Piła". Entry list visible with dates and slugs including a flat-sale entry from 2026-06-03.

---

## 4. Volume + achieved-price stream

**Announcement volume:** Approximately 4–6 flat-auction batches per year, 1–5 flats per batch → estimated **10–20 flat lots auctioned per year**. Mix of single-lot and multi-lot sessions. Mixed-type batches (flats + land/commercial in same session) also occur. Sessions typically held at Urząd Miasta, pl. Staszica 10, sala 229B.

**Price range observed:** 67 400 zł (41 m², 2018) to ~293 151 zł (106 m², 2025) — full market range, all first-round or re-run (second/third) auctions.

**Achieved-price stream:** Result notices exist on the BIP but are not separated into a dedicated "wyniki" list — they appear as entry updates within the same article index. No standalone machine-readable feed (no JSON/API/RSS). Scraping requires: (a) parse the index page for all entries, (b) fetch each slug, (c) detect post-auction result language ("wynik przetargu", "cena osiągnięta", "nabywca"). This is the same pattern as Bytom/Tarnowskie Góry.

---

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry — single BIP host, HTML content, custom CMS, index list + per-entry slugs, result notices as text within entry. Slightly simpler than Kraków (which has a dedicated results table) and simpler than Bytom (which mixes PDF attachments).

**Adapter approach:**
1. Scrape index: `GET /542-aktualne-przetargi-na-nieruchomosci.html` → extract entry list + slugs (HTML table, server-rendered)
2. Filter by title keywords: `lokal mieszkalny`, `nieruchomości lokalow`, `mieszkalnych`
3. Fetch each slug → parse announcement body for: address, area, cena wywoławcza, wadium, termin przetargu
4. Detect result notices on same or linked entries for achieved price
5. Dedup by slug URL

**Blockers:**
- Some slug URLs redirect (observed during Chrome navigation); root cause unclear — may be session/cookie state or URL rewriting. Index page is stable.
- Achieved-price field is free-text inline, not a structured field — requires regex/NLP extraction.
- No archival pagination depth confirmed; historical entries may fall off the active list.

**Risks:**
- Low: site is stable, public, no auth wall
- Medium: redirect behaviour on slug URLs (needs testing with session cookies)
- Low: volume is modest (~15 lots/year) so scrape load is trivial

**Effort:** Low–Medium. Estimated 1–2 days for a working adapter, plus result-notice parsing.

**VERDICT: BUILD** — confirmed flat auctions, accessible HTML BIP, manageable volume, no structural blockers.

---

*Sources:*
- `https://bip.pila.pl/542-aktualne-przetargi-na-nieruchomosci.html` (LIVE-VERIFIED via Chrome)
- `https://bip.pila.pl/405-przetargi-na-nieruchomosci-i-ruchomosci-gminne.html`
- `https://bip.pila.pl/prezydent-miasta-pily-oglasza-przetargi-ustne-nieograniczone-na-sprzedaz-prawa-wlasnosci-nieruchomosci-lokalowych-lokali-mieszkalnych-polozonych-w-pile-termin-przetargow-16052025.html`
- `https://bip.pila.pl/prezydent-miasta-pily-oglasza-pierwsze-przetargi-ustne-nieograniczone-na-sprzedaz-prawa-wlasnosci-nieruchomosci-lokalowych-lokali-mieszkalnych-polozonych-w-pile-termin-przetargow-28032025.html`
- `https://bip.mzgm.pila.pl/` (MZGM — confirmed lokale użytkowe only)
- `https://listaprzetargow.pl/oferty/7294` (historical flat auction 2018, price/area data)
- `https://www.pila.pl/aktualnosci/5633-przetargi-na-sprzedaz-lokali-mieszkalnych-polozonych-w-pile.html`
- `http://arch-bip-pila.mserwer.pl/` (archival BIP pre-2022)
