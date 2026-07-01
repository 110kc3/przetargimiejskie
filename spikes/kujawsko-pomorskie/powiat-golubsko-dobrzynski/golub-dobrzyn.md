# Spike — Golub-Dobrzyń (Kujawsko-Pomorskie · powiat golubsko-dobrzyński)
> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR

Two separate entities in Golub-Dobrzyń both sell lokale mieszkalne via ustny przetarg nieograniczony:
- **Starostwo Powiatowe** at `bip.golub-dobrzyn.com.pl` — confirmed active residential flat auctions at ul. PTTK 5 (multiple rounds 2024–2026), achieved price published on BIP
- **Gmina Miasto Golub-Dobrzyń** at `bip.golub-dobrzyn.pl` — confirmed flat auction activity in 2025 (Zarządzenie nr 79/2025 z 05.08.2025 powołuje Komisję Przetargową do sprzedaży lokalu mieszkalnego), Resolution XXXVI/178/2020 authorised sale by przetarg of flat at ul. 17 Stycznia

Both BIPs are standard `bip.net` v7 (extranet.pl) CMS — HTML, no SPA, no auth, no bot blocks. Results pages are plain HTML text.

## 1. Sells municipal property at auction?

YES — confirmed on both levels:

**Powiat (Starostwo Powiatowe):**
- Third ustny przetarg nieograniczony on lokal mieszkalny nr 3, ul. PTTK 5 held 2026-04-30; achieved price 81,810 PLN (buyer: Andrzej Jankowski). Result published on BIP.
- Third przetarg on lokal mieszkalny nr 5, ul. PTTK 5 also conducted (earlier round, 2025/early 2026).
- Pattern: multiple round series (1st → 2nd → 3rd przetarg) for individual flats — the same building (PTTK 5) yields ≥2 lots per disposal cycle.

**Gmina Miasto (Burmistrz):**
- Zarządzenie nr 79/2025 z dnia 05.08.2025 — Komisja Przetargowa do przeprowadzenia przetargu na sprzedaż lokalu mieszkalnego.
- Uchwała Rady Miasta nr XXXVI/178/2020 — zgoda na sprzedaż w drodze przetargu lokalu mieszkalnego przy ul. 17 Stycznia.
- City BIP has explicit "Sprzedaż nieruchomości" sub-section at `bip.golub-dobrzyn.pl/760,sprzedaz-nieruchomosci`.
- City also confirmed ustny przetarg nieograniczony on lokal użytkowy (ul. Zamkowa 3, 2025) — shows auction infrastructure is in active regular use.

Both entities do NOT restrict flat sales exclusively to bezprzetargowy tryb for tenants; open auction is the standard mechanism.

## 2. Where published? (hosts + boards, URLs)

**Powiat BIP (Starostwo):**
- Announcement board: `https://www.bip.golub-dobrzyn.com.pl/` → przetargi section; individual pages e.g. `/7080,...` (announcement) and `/8339,...` / `/redir,8339` (result)
- Results also posted physically on notice board of Starostwo, Plac Tysiąclecia 25, for 7 days
- CMS: bip.net (extranet.pl), same engine as many other powiat BIPs seen in this project

**Miasto BIP (Burmistrz):**
- Main przetargi index: `https://bip.golub-dobrzyn.pl/583,przetargi`
- Sprzedaż nieruchomości sub-page: `https://bip.golub-dobrzyn.pl/760,sprzedaz-nieruchomosci`
- Announcements also appear under "Ogłoszenia Burmistrza" by year: e.g. `https://bip.golub-dobrzyn.pl/993,ogloszenia-2025-rok`
- CMS: bip.net v7.32 (extranet.pl) — identical CMS family to powiat

**No third-party portal dependency** — both publish natively on own BIPs. adradar.pl and monitorurzedowy.pl index some of these but are not the canonical source.

## 3. Format + rendering

- Both BIPs: standard bip.net HTML — server-rendered, no JavaScript required for content
- Auction announcements: plain HTML text pages, announcement body embedded directly (not PDF-only)
- Result pages: plain HTML text with achieved price, buyer name, date — machine-readable
- Some zarządzenia are PDF attachments, but the auction announcements themselves (ogłoszenia) are HTML
- No auth wall, no bot detection observed; `web_fetch` retrieved pages cleanly (large nav boilerplate inflates page size but content is extractable)
- Page structure: consistent `bip.net` template — content sits in `#wrapperSectionPageContent` after large nav block

## 4. Volume + achieved-price stream

**Volume:**
- Powiat: at least 2 flat lots active in recent cycle (PTTK 5 lokal nr 3, lokal nr 5); multiple auction rounds per lot = ≥4–6 announcement+result pages per lot per disposal
- Miasto: at least 1 flat lot in 2025 (Zarządzenie 79/2025), likely more given ongoing housing stock management (95/2025 on rent rates, multi-year housing programme)
- Combined estimate: ~2–6 flat auctions/year across both publishers — LOW to MEDIUM volume for a small powiat seat (~12 000 inh.)

**Achieved-price stream:**
- CONFIRMED: powiat publishes "Informacja o wyniku przetargu" with exact achieved price and buyer name on same BIP
- Example: lokal nr 3 PTTK 5 → 81,810 PLN achieved (vs 81,000 PLN starting price), buyer name published
- City BIP: result pages expected in same "Sprzedaż nieruchomości" or "Ogłoszenia" section (not separately confirmed for city but standard bip.net behaviour)

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** any other `bip.net` powiat BIP already implemented (e.g. Wąbrzeźno, Brodnica style). The HTML structure, URL pattern (`/{id},{slug}`), and listing/detail separation are identical across all bip.net instances.

**Effort breakdown:**
- Announcement scraper: Low — standard bip.net HTML parse, same as existing adapters
- Result/achieved-price scraper: Low — same CMS, result pages are plain text
- Two publishers to handle (powiat + miasto): Medium — doubles the feed but same technology
- Volume polling: monthly cadence sufficient given low-medium deal flow
- No blockers: no auth, no CAPTCHA, no SPA, no PDF-only content for announcements

**Verdict: BUILD — Medium effort**
- Two separate BIP feeds (powiat + miasto) both confirmed publishing flat auctions via ustny przetarg nieograniczony
- Standard bip.net HTML, achieved price confirmed in result notices
- Effort is "Medium" only because of dual-publisher setup; each individual feed is Low
- Recommend implementing powiat feed first (higher confirmed volume, result pages verified), then city feed
