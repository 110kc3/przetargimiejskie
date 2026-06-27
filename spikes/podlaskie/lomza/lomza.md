# Spike — Łomża (Podlaskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort to confirm; no adapter target exists).

## TL;DR

Łomża sells municipal flats exclusively **bezprzetargowo** — directly to sitting tenants at a 70% discount off market value, no open competitive auction. The city BIP property board (lomza.bip.net.pl) contains only land-plot and commercial/built-property przetargi. Neither the city BIP nor MPGKiM/ZGM publishes *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych*. There is no achieved-price stream for flat auctions because flat auctions do not happen here.

---

## 1. Sells municipal flats at auction?

**No.** Confirmed bezprzetargowy model only.

- The city sells lokale mieszkalne to najemcy (tenants) at **30% of appraised market value** (70% bonifikata), governed by Uchwała nr 179/XXII/2012 z dnia 21 marca 2012 r.
- Conditions: najemca must hold an indefinite-term lease for ≥ 5 years, no rental arrears, no other owned dwelling.
- The process goes through Wydział Gospodarowania Nieruchomościami (Stary Rynek 14, pok. 211, tel. 86 2156824) — not through a public auction.
- In February 2022 the city President proposed *eliminating* the bonifikata entirely (project uchwały), citing housing shortage (977 units in stock, 997 families waiting), and noting that the existing bezprzetargowy channel was depleting the municipal stock. As of the spike date the proposal status is unresolved but the mode remains bezprzetargowy.
- **No instance of *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych*** found on the BIP, in search results, on MPGKiM's site, or in any news coverage.

Sources:
- [Kup mieszkanie komunalne na własność — um.lomza.pl](http://www.um.lomza.pl/index.php?wiad=5886)
- [Miasto nie będzie sprzedawało mieszkań komunalnych za ułamek wartości? — mylomza.pl (2022-02-11)](https://mylomza.pl/artykul/miasto-nie-bedzie-sprzedawalo-n1274532)
- [Wykup mieszkania komunalnego Łomża 2026 — jakiwniosek.pl](https://jakiwniosek.pl/wnioski/nieruchomosci/wykup-mieszkania-komunalnego/lomza)

---

## 2. Where published? (hosts + boards, URLs)

Property auctions that *do* exist (land, nieruchomości gruntowe) are published on:

| Board | URL | Content |
|---|---|---|
| BIP UM Łomża — Przetargi na nieruchomości | https://lomza.bip.net.pl/kategorie/332-przetargi-na-nieruchomosci- | Land/commercial przetargi + lease notices |
| BIP UM Łomża — Wyniki przetargów | https://lomza.bip.net.pl/kategorie/333-wyniki-przetargow- | Results for land/commercial auctions |
| Archival BIP (pre-2024 system) | http://www.um.lomza.pl/bip/ → http://www.lomza.pl/bip/ | Historical przetargi, land only |
| MPGKiM ZGM site | https://mpgkim.lomza.pl/category/zgm/ | Housing management news; no sales przetargi |
| MPGKiM BIP | https://bip-lomza.pl/mpgkim/ | Org info only; no property auctions |

No flat-sale przetargi appear on any of these boards. The 10 most recent entries on the main przetargi board (as of 2026-06-27) are: 6× wykaz do najmu (lease listings), 2× land plots for auction (działki), 1× State Treasury property for lease, 1× przetarg ustny ograniczony for land at ul. Farnej 5/7 (built plot, not a lokal). The results board (7 entries, going back to 2025-09) is all *nieruchomości gruntowe*.

---

## 3. Format + rendering

LIVE-VERIFIED via web_fetch.

- **CMS:** lomza.bip.net.pl runs the **Nefeni BIP v2** platform (Next.js SPA). Category listing pages render via client-side JS (`Wczytywanie...` placeholder while loading); web_fetch captures the pre-rendered HTML list correctly. Individual article pages render as standard HTML.
- **Article content:** Plain HTML text within article pages. Announcements appear to embed inline text or link to PDF attachments (seen on old BIP: `lomza.pl/bip/zalaczniki/art/…pdf`).
- **No auth/login required** for reading.
- **Bot risk:** moderate — Next.js SPA means the category list content is injected after page load, but web_fetch captures the SSR-rendered list correctly. No Cloudflare or CAPTCHA observed.
- **MPGKiM site:** WordPress + Elementor, plain HTML, easy to scrape.

---

## 4. Volume + achieved-price stream

- **Flat auctions:** zero volume — none published, none historical.
- **Land/commercial auctions:** low volume. The results board shows **7 results total** spanning ~9 months (2025-09 to 2026-01); all are land plots. Active przetargi board shows ~2 land plots pending as of April 2026. City population ~60,000 — small municipal property disposal programme.
- **Achieved prices:** present in the "Wyniki przetargów" board for land, but irrelevant since target asset class (lokale mieszkalne) is absent.
- **Bezprzetargowy flat sales volume:** As of Feb 2022, 688 city-owned flats remained in 59 housing communities (out of 2,318 total units); hundreds already sold since 2018. But these sales generate no przetarg record and no public price notice.

---

## 5. Adapter effort + verdict

**Closest analog:** none of the existing adapters (Gliwice/Zabrze/Bytom/Kraków/Tarnowskie Góry) — all of those have *ustny przetarg nieograniczony* flat auctions published on their BIPs. Łomża is structurally similar to cities where flats have been exhausted or are sold bezprzetargowo (no public analog in current portfolio).

**Blockers:**
1. No *lokal mieszkalny* auction data exists to scrape — the fundamental precondition for an adapter is absent.
2. Even if bezprzetargowy sale records existed publicly (they do not), they would not carry a competitive achieved-price (the price is formula-derived: appraised value × 0.30).
3. If the 2022 bonifikata-elimination proposal passed, the city may have stopped selling flats altogether, further reducing relevance.

**Risks:** none from a build perspective (decision is not to build); the only risk is that the city quietly resumes open-format flat auctions in the future — worth a re-check annually.

**VERDICT: NO-BUILD.** Łomża sells municipal flats exclusively bezprzetargowo to sitting tenants; no *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* exists or has ever appeared on the city BIP. Land-only przetargi are present but low-volume and outside scope. Effort to confirm: Low (data absence is definitive).
