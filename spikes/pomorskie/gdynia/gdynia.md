# Spike — Gdynia (Pomorskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Medium effort to build, but weak/no residential flat auction stream).

## TL;DR

Gdynia runs active *ustny przetarg nieograniczony* auctions for municipal property — but the auction stream is **land/plot-only**. The city has explicitly suspended all communal flat sales since 2016 (council resolution in force through 2026). No *lokal mieszkalny* auction stream exists. The BIP is a JavaScript SPA; auction notices and result records live on `bip.um.gdynia.pl` (JS-gated) and secondary portal `investgdynia.pl` (PDF, partly scanned). Closest peer city is Gdańsk (also land-heavy, but did sell some flats until recently). Analogous to a land-only Kraków pattern — technically buildable but without a flat stream there is minimal product value.

---

## 1. Sells municipal property at auction?

**Yes — but land/plots only; residential flat auctions are formally suspended.**

Gdynia's Wydział Gospodarki Nieruchomościami i Geodezji (WGNiG) runs regular *ustny przetarg nieograniczony* (and occasionally *ograniczony do właścicieli nieruchomości sąsiednich*) for the sale of municipal land. Auctions occur roughly monthly; the most recently indexed result notice is from **24 April 2026** (BIP URL: `bip.um.gdynia.pl/ogloszenia-7,8642/...620744`). The investgdynia.pl wykaz lists at least 15 land/plot auctions published in the 12 months to June 2026.

**Residential flats (lokale mieszkalne): explicitly off the table.**
- ZBILK (Zarząd Budynków i Lokali Komunalnych w Gdyni) — the city's housing manager (successor to ABK units) — publishes on its Wykup page: *"nie przewiduje się sprzedaży lokali komunalnych na rzecz Najemców"* (sale of communal flats to tenants is not planned). Source: [zbilk.gdynia.pl/lokale-mieszkalne/wykup](https://zbilk.gdynia.pl/lokale-mieszkalne/wykup) — live-verified 2026-06-27.
- Legal basis: Uchwała nr XXXIV/1127/21 Wieloletni program gospodarowania mieszkaniowym zasobem Gminy Miasta Gdyni na lata 2022–2026 — sale to tenants suspended; policy originates from 2016. No open-market flat auctions found to replace the tenant-sale route.
- The single "lokale" entry on investgdynia.pl wykaz (Dec 2021 — "Wójta Radkego 43, Orłowska 40") is a commercial/utility premises listing, not residential flats. On PDF inspection it is a scanned document (200 dpi JPEG, single page).

**Conclusion on Q1:** Gdynia does sell nieruchomości at auction, but the mix is **działki (land) + occasional commercial premises only**. Zero confirmed *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* in 2022–2026.

---

## 2. Where published? (hosts + boards, with URLs)

| Publisher | Role | URL | Confirmed |
|---|---|---|---|
| **BIP UM Gdynia** — sekcja "Sprzedaż nieruchomości" | Auction announcements | [bip.um.gdynia.pl/sprzedaz-nieruchomosci,7178](https://bip.um.gdynia.pl/sprzedaz-nieruchomosci,7178) | LIVE-VERIFIED (JS SPA) |
| **BIP UM Gdynia** — sekcja "Ogłoszenia" (8642) | Auction result notices ("wyniki przetargu") | [bip.um.gdynia.pl/ogloszenia-7,8642/](https://bip.um.gdynia.pl/ogloszenia-7,8642/wyniki-przetargu-ustnego-nieograniczonego-na-sprzedaz-nieruchomosci-stanowiacych-wlasnosc-gminy-miasta-gdyni-przeprowadzonego-w-dniu-24-kwietnia-2026-r,620744) | LIVE-VERIFIED (JS SPA) |
| **investgdynia.pl** — Wykazy nieruchomości | Pre-auction property lists (PDF links) | [investgdynia.pl/title,Wykazy,pid,1,dest,Statements.html](https://www.investgdynia.pl/title,Wykazy,pid,1,dest,Statements.html) | LIVE-VERIFIED |
| **ZBILK** — Ogłoszenia o przetargach | Commercial premises rental auctions only | [zbilk.gdynia.pl/lokale-uzytkowe/ogloszenia-o-przetargach](https://zbilk.gdynia.pl/lokale-uzytkowe/ogloszenia-o-przetargach) | LIVE-VERIFIED (currently "brak") |
| **gdynia.pl** — Ogłoszenia | Mirror/cross-links to BIP notices | [gdynia.pl/mieszkaniec/…/ogloszenia](https://www.gdynia.pl/mieszkaniec/1620-1220-2025-09-12-2025-09-25,9115/ogloszenia,590966) | DESK |

**Achieved-price stream:** Result notices published on BIP section 8642 (URL pattern above). Title format: *"Wyniki przetargu ustnego nieograniczonego na sprzedaż nieruchomości stanowiących własność Gminy Miasta Gdyni przeprowadzonego w dniu DD.MM.YYYY r."* Confirmed result notices exist for Oct 2023 and Apr 2026. Content is inside the JS SPA — not readable without JS execution.

**ZBILK** does not sell flats; its "Ogłoszenia o przetargach" section is for rental of commercial premises (lokale użytkowe) and showed zero active auctions on inspection date.

---

## 3. Format + rendering

| Source | Format | Notes |
|---|---|---|
| `bip.um.gdynia.pl` | **JavaScript SPA** (React) | Returns bare HTML with `"You need to enable JavaScript to run this app."` — zero content without JS execution. All auction listings, result notices, and property registers live behind this JS gate. GTM: `GTM-KPX6HRS`. TLS: standard, no bot block observed. |
| `investgdynia.pl` — wykaz property list | **Server-rendered HTML** (Joomla CMS) | List of dated PDF links rendered in HTML; directly parseable. |
| Wykaz PDFs on investgdynia.pl — land/plot auctions | **Born-digital PDF** (PDF 1.4, pdftotext-extractable) | Clean structured table; confirmed on Hodowlana 2026-06-23 and Kolonia 45C 2025-10-31 samples. Address, size, MPZP zone, price all machine-readable. |
| Wykaz PDFs on investgdynia.pl — commercial lokale | **Scanned PDF** (200 dpi JPEG embedded) | Confirmed on "Wykaz lokale.pdf" (Dec 2021). Would require OCR. |
| BIP result notices | **JS SPA** (content behind JS) | Cannot be fetched as plain HTML; need headless browser or Chrome MCP. |

No JSON API or open-data endpoint found. No auth/login required; TLS only.

---

## 4. Volume + achieved-price stream

**Land auction volume:** ~10–15 distinct land/commercial-premises wykaz entries per year on investgdynia.pl; monthly auction batches on BIP (confirmed auction events in Jan, Feb, Apr, May, Oct 2021; Oct 2023; Apr 2026 — at minimum).

**Flat auction volume: zero** for 2022–2026 confirmed. The 2022–2026 housing program (Uchwała XXXIV/1127/21) explicitly bars communal flat sales through at least end-2026. No open-market residential flat auctions found as a substitute channel.

**Achieved-price stream:** BIP result notices (section 8642) publish outcomes. Content inaccessible without JS rendering. URL slugs include the auction date (parseable). No standalone price list; price data is embedded in the notice content.

**Risk — policy expiry:** The 2022–2026 housing program expires at end-2026. A successor program could re-open flat sales. This is worth monitoring if building adjacent Trójmiasto coverage (Gdańsk is a stronger candidate now).

---

## 5. Adapter effort + verdict

**Closest analog:** Kraków (land + commercial property auctions, no residential flat stream, BIP JS SPA). Not similar to Gliwice/Zabrze/Bytom/Tarnowskie Góry (those have ZGM/ZBK flat-auction streams). Not similar to Krakow's volume either — Gdynia auction cadence appears lower.

**Effort if built anyway (land-only adapter):**
- Medium: JS SPA scraper needed for BIP (headless Chrome or Playwright) to list and read auction notices and result pages.
- investgdynia.pl wykaz list is easy (Joomla HTML) and PDFs are born-digital — low-cost extraction for advance notice.
- Achieved-price data requires JS rendering of BIP result notices.
- Scanned PDFs exist for commercial-premises notices (OCR overhead if those are targeted).

**Blockers:**
1. No residential flat stream — the core product value (flat auction aggregation) does not exist in Gdynia as of 2026-06-27.
2. BIP is a JS SPA — no static HTML scraping; requires headless rendering.
3. Flat sale policy suspended through at least end-2026 (risk of wasted build).

**Risks:**
- Policy could change post-2026 program; adapter would need retrofitting.
- Land-only adapter is buildable but low-value for the current product focus.

**VERDICT: NO-BUILD.** Gdynia runs clean, active property auctions on a well-structured BIP, but the residential flat stream is officially zero and policy-locked through end-2026. Building a land-plot scraper only would divert effort from cities with live flat streams (Gdańsk, or Silesian cities). Revisit after the 2026 housing program expires and a successor resolution is published.

---

### Sources
- [bip.um.gdynia.pl — Sprzedaż nieruchomości (sekcja 7178)](https://bip.um.gdynia.pl/sprzedaz-nieruchomosci,7178)
- [bip.um.gdynia.pl — Wyniki przetargu 24 IV 2026](https://bip.um.gdynia.pl/ogloszenia-7,8642/wyniki-przetargu-ustnego-nieograniczonego-na-sprzedaz-nieruchomosci-stanowiacych-wlasnosc-gminy-miasta-gdyni-przeprowadzonego-w-dniu-24-kwietnia-2026-r,620744)
- [bip.um.gdynia.pl — Wyniki przetargu 6 X 2023](https://bip.um.gdynia.pl/ogloszenia-7,8642/wyniki-przetargu-ustnego-nieograniczonego-na-sprzedaz-nieruchomosci-stanowiacych-wlasnosc-gminy-miasta-gdyni-w-dniu-6-pazdziernika-2023-r,589730)
- [investgdynia.pl — Wykazy nieruchomości do pobrania](https://www.investgdynia.pl/title,Wykazy,pid,1,dest,Statements.html)
- [zbilk.gdynia.pl — Wykup (flat sales suspended)](https://zbilk.gdynia.pl/lokale-mieszkalne/wykup)
- [zbilk.gdynia.pl — Ogłoszenia o przetargach (lokale użytkowe)](https://zbilk.gdynia.pl/lokale-uzytkowe/ogloszenia-o-przetargach)
- [bip.um.gdynia.pl — Wydział Gospodarki Nieruchomościami i Geodezji](https://bip.um.gdynia.pl/wydzial-gospodarki-nieruchomosciami-i-geodezji,118/wydzial-gospodarki-nieruchomosciami-i-geodezji,481961)
