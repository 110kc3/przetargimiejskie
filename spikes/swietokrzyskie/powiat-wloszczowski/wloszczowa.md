# Spike — Włoszczowa (Świętokrzyskie · powiat włoszczowski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (effort —).

## TL;DR
Gmina Włoszczowa (miejsko-wiejska, seat town Włoszczowa, ~9–10k) does sell municipal property via *przetarg ustny nieograniczony*, but the open-auction stream is **land-only** — działki niezabudowane in outlying localities (Motyczno, Konieczno, Wola Wiśniowa, Kurzelów). **Flats are disposed of the out-of-scope way**: the Burmistrz publishes wykazy of *lokal mieszkalny przeznaczony do sprzedaży w trybie bezprzetargowym na rzecz najemcy* (sale to the sitting tenant, no auction). The only open flat auction found is from 2008 (spółdzielcze prawo do lokalu, ul. Wiśniowa 13/8) — not a recurring stream. No dedicated municipal housing manager (ZGM/ZGKiM/TBS) running flat auctions. Publishing splits across a legacy BIP `wloszczowa.eobip.pl` (eobip.pl CMS, DNS-unreachable from this Pi) and the current town portal `wloszczowa.pl` (**2ClickPortal**), where each property notice is a **stub HTML page + PDF wykaz attachments** ("Szczegóły w załączonych plikach") — the auction data (address, powierzchnia, cena wywoławcza, wadium, date) lives entirely inside PDFs. No open flat-auction volume + PDF-gated details + tiny gmina → NO-BUILD.

## 1. Sells municipal property at auction?
**YES for LAND, NO for flats (open auction).** The Burmistrz Gminy Włoszczowa runs `przetarg ustny nieograniczony na sprzedaż nieruchomości` under art. 35+38 ustawy o gospodarce nieruchomościami, and publishes both wykazy and wynik-przetargu notices (e.g. *informacja o wyniku pierwszego ustnego przetargu nieograniczonego*, conducted 21.08.2023, UG ul. Partyzantów 14). But the subject matter is **undeveloped land**:
- Wykaz "Motyczno" — nieruchomość gruntowa Gminy Włoszczowa do sprzedaży w trybie przetargu ustnego nieograniczonego.
- adradar aggregator for gm. Włoszczowa: listings are overwhelmingly **działki** (Konieczno, Wola Wiśniowa, Kurzelów, Radków; plus Starostwo/KOWR/PKP land) — **no lokale mieszkalne** in the current/archived set.

**Flats → bezprzetargowo na rzecz najemcy.** A confirmed wykaz (posted 06–27.07.2023 on the UG tablica ogłoszeń) covers a *lokal mieszkalny przeznaczony do sprzedaży w trybie bezprzetargowym na rzecz najemcy* — i.e. flats leave the stock via tenant right-of-first-refusal, not open oral auction. The only open flat auction located is from **2008** (ustny przetarg nieograniczony na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 8, ul. Wiśniowa 13) — historical, not a live recurring source. No ZGM/ZGKiM/TBS housing operator surfaced for the gmina.

## 2. Where published? (hosts + boards, URLs)
Split across two hosts (the town migrated its news to a modern portal; BIP legacy remains):
- **Current town portal (2ClickPortal):** `https://wloszczowa.pl/` — property notices under `/aktualnosci/`, e.g.
  - `https://wloszczowa.pl/aktualnosci/sprzedaz-w-trybie-przetargu-ustnego-nieograniczonego-wykaz-nieruchomosci.html` (wykaz Motyczno, land)
  - `https://wloszczowa.pl/aktualnosci/przetarg-ustny-nieograniczony-wyjkaz-nieruchomosci-do-sprzedazy.html`
  - `https://wloszczowa.pl/aktualnosci/przetarg.html`
  - Each page is a short stub ("Szczegóły w załączonych plikach") with PDF attachments (e.g. `10. Wykaz-Motyczno.pdf`); no dedicated przetargi/nieruchomości category in nav — notices sit in general Aktualności.
- **Legacy BIP (eobip.pl CMS):** `https://wloszczowa.eobip.pl/bip_wloszczowa/` — "Ogłoszenia, informacje" category `news_cat_id=163`, list URL `.../index.jsp?place=Menu02&news_cat_id=163&layout=1&page=0`. **DNS-unreachable (getaddrinfo ETIMEOUT) from this Pi** on repeated tries — could not live-open; confirmed only via search index (carries the 2008 flat auction + land wykazy/wyniki).
- **Powiat (out of scope, separate JST):** `bip.powiat-wloszczowa.pl` / `powiat-wloszczowa.pl` — Starostwo land/dzierżawa auctions; do not confuse with the gmina.

## 3. Format + rendering
- **Stub HTML + PDF attachments** — this is the fatal shape. On `wloszczowa.pl` (2ClickPortal) the notice body is a one-line "details in attached files" pointer; all structured auction fields (adres, pow., cena wywoławcza, wadium, termin) are inside PDF wykazy. Would require per-notice PDF fetch + `pdfText`/OCR, with no HTML fallback.
- Legacy eobip.pl BIP is server-rendered HTML (`index.jsp?...news_cat_id=`) but **unreachable from the scraper host** and being superseded.
- No SPA/auth/CAPTCHA observed on the portal; the blocker is content location (PDF), not access.

## 4. Volume + achieved-price stream
- **Open flat-auction volume: ~0/yr.** Recurring open auctions are land plots; flats exit bezprzetargowo to tenants. Tiny gmina — a handful of property notices/year total, dominated by działki.
- **Achieved-price stream:** exists in principle — the Burmistrz publishes `informacja o wyniku przetargu` (e.g. 21.08.2023), but for land and, like the announcements, likely as PDF/stub. Not a clean HTML price feed, and not for flats.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** none worth cloning — a small świętokrzyskie land-only gmina on a 2ClickPortal news feed with PDF wykazy; the useful (flat) stream simply doesn't exist as open auctions.
- **CMS family:** mixed — legacy **eobip.pl** BIP (server-HTML, `index.jsp?news_cat_id=`) + current **2ClickPortal** town site (stub HTML + PDF). Neither offers a parseable flat-auction table.
- **Effort:** — (not building).
- **Blockers (any one is decisive):** (1) **no open flat auctions** — flats sold bezprzetargowo na rzecz najemcy; (2) open stream is **land-only**; (3) **details locked in PDF attachments** (stub-HTML portal) — even a land-only build would be OCR/pdfText-heavy for near-zero flat yield; (4) legacy BIP host **DNS-unreachable** from the scraper Pi; (5) very small gmina, negligible volume.

**VERDICT: NO-BUILD (effort —)** — Gmina Włoszczowa auctions only land; municipal flats leave the stock bezprzetargowo to sitting tenants, and what little is published is PDF-gated on a 2ClickPortal/eobip split with no flat-auction stream to scrape.
