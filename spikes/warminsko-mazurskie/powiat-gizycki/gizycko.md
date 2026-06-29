# Spike — Giżycko (Warmińsko-Mazurskie · powiat giżycki)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miejska Giżycko actively auctions municipal residential flats (*lokale mieszkalne*) via *przetarg ustny nieograniczony* directly through the city BIP at `bip.gizycko.pl`. Volume is moderate: ~4–6 flat-auction notices per year (often the same flat re-run 2–5 times before selling). Announcements are full HTML text — no PDFs to scrape for the notice body itself. Result notices (*informacja o wyniku przetargu*) are attached as PDF files to the same announcement entry. The site runs on IDcom.pl BIP engine (standard across many Polish gminas) with no auth/bot blocks observed. Closest analog: **Tarnowskie Góry** (similar IDcom engine, mid-size city, HTML notices, PDF results attached to announcement). VERDICT: BUILD.

---

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** The Burmistrz Miasta Giżycka publishes *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych* (unrestricted oral auction for sale of residential units) directly through the municipal BIP. Examples live-verified on 2026-06-29:

- **Obwieszczenie nr 53/2025** — I przetarg ustny nieograniczony, two flats at Dąbrowskiego 6 (12B: 27 m², cena wywoławcza 250 000 zł; nr 9: 68,20 m², cena wywoławcza 743 000 zł). Auction date: June–July 2025.
  URL: https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/818013/obwieszczenie__nr_532025__i_przetarg_ustny_nieograniczony_na_spr

- **Obwieszczenie nr 92/2025** — III przetarg na sprzedaż lokalu Dąbrowskiego 6/12B (same flat, third attempt).
  URL: https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/845322/obwieszczenie_nr_922025__iii_przetarg_na_sprzedaz_lokalu_dabrows

- **Obwieszczenie nr 90/2025** — I przetarg na sprzedaż lokalu Warszawska 15/9.
  URL: https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/844725/obwieszczenie_nr_902025__i_przetarg_na_sprzedaz_lokalu_warszawsk

- **Obwieszczenie nr 77/2025** — II przetarg, lokal mieszkalny Dąbrowskiego 6/12B.

- **2024 examples**: nr 66/2024 Bohaterów Westerplatte 11/5 (I przetarg); nr 70/2024 V przetarg Dąbrowskiego 6 (lokale 12B i 9 — fifth run of same flats); nr 76/2024 Warszawska 15/9 (I przetarg); nr 111/2024 Bohaterów Westerplatte 11/5; nr 113/2024 Warszawska 15/9 (II przetarg).

- **Earlier years**: 2023 — Staszica 4/6, Warszawska 24/8, Bohaterów Westerplatte 11/5 (multi-flat notices); 2022 — Mickiewicza 20/4, Traugutta 14/11, 1 Maja 4/65; 2021 — Mazurska 5/7, Dąbrowskiego 6/14; 2020 — multi-flat batch.

The city does NOT appear to sell flats exclusively bezprzetargowo to tenants — flats are put to open public auction (nieograniczony). The "ograniczony" type appears only for land plots.

The responsible department is **Wydział Mienia / Wydział Gospodarki Nieruchomościami**, contact: natalia.zadzilko@gizycko.pl, room 121, Urząd Miejski w Giżycku, Al. 1 Maja 14, tel. 87 732 41 11 wew. 5. No separate housing manager / TBS entity publishes these — it is the gmina directly.

---

## 2. Where published? (hosts + boards, URLs)

**Single host, single board:**

| Board | URL | Contents |
|-------|-----|----------|
| Przetargi – sprzedaż (list) | https://bip.gizycko.pl/wiadomosci/11525/lista/1/przetargi__sprzedaz | All sale announcements, filterable by year; 16 pages total (all years) |
| Year filter 2025 | https://bip.gizycko.pl/wiadomosci/11525/lista/1/2025 | Current-year notices |
| Year filter 2024 | https://bip.gizycko.pl/wiadomosci/11525/lista/1/2024 | 2 pages, ~15 entries |
| Individual announcement | https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/{ID}/{slug} | Full text + PDF attachments (result notice) |
| Wykazy – sprzedaż | https://bip.gizycko.pl/wiadomosci/16271/lista/2/ | Pre-auction property lists (wykazy) — informational only |
| BIP root | https://bip.gizycko.pl/ | IDcom.pl engine |

Result notices (*informacja o wyniku przetargu*) are **attached as PDF files to the same announcement entry** — not posted on a separate board. The changelog for nr 53/2025 shows: PDFs `informacja_o_wyniku_przetargu.pdf` and `informacja_o_wyniku_przetargu_1.pdf` were added 2025-07-24, then removed 2025-11-17 (standard BIP lifecycle: posted, then pruned after statutory period). The achieved price is therefore in those PDFs.

No second publication venue detected (no separate housing manager BIP, no Zabrze-style municipal company portal).

---

## 3. Format + rendering

- **Announcement body**: Full HTML text on the BIP page. Content is structured: numbered sections (I Przedmiot przetargu, II Skutki nieprzystąpienia, III Pozostałe informacje). Machine-readable with standard HTML parsing — no OCR needed. LIVE-VERIFIED via web_fetch returning full text.
- **Result notice**: PDF file attached to the same announcement entry (filename pattern: `informacja_o_wyniku_przetargu.pdf`). File URL pattern: `https://bip-v1-files.idcom-jst.pl/sites/3080/...`. File type is almost certainly a generated/text PDF (IDcom.pl produces these programmatically), but not directly fetched and confirmed — classify as text-PDF until verified.
- **Platform**: IDcom.pl JST BIP engine (`meta-author: IDcom.pl`; `meta-idcom_validation` header present). Standard server-rendered HTML, no JavaScript SPA. No login, no CAPTCHA, no bot-block observed.
- **Pagination**: list pages at `.../lista/{page}/{year}` — simple numeric pagination.
- **XML endpoint**: each announcement has a `/xml` variant (e.g. `https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/818013/xml`). May offer structured data — worth probing in adapter.

---

## 4. Volume + achieved-price stream

**Announcement volume (sale board, all types):**
- 2025 (YTD to ~June 2026): at least 9 entries on page 1 visible; year filter shows ~9 entries on p.1 + continuation
- 2024: 2 pages, ~15 total entries (includes land plots + flats)
- Earlier years: similar rate; archive goes back to 2018+

**Flat-specific volume estimate (lokale mieszkalne only):**
- 2024: at least 5 flat-auction notices (Dąbrowskiego 6/12B, Dąbrowskiego 6/9, Warszawska 15/9, Bohaterów Westerplatte 11/5 — each with multiple re-runs)
- 2025: at least 5 flat-auction notices through mid-2025
- Underlying unique flats: ~3–5 distinct flats per year enter the market; each may re-run 2–5 times before selling, inflating notice count

**Achieved-price stream:**
- Result PDFs confirmed to exist (attached to same announcement entry, lifecycle: posted ~3 weeks after auction, may be removed after statutory period)
- Achieved price is inside the result PDF (standard statutory format under Rozporządzenie RM 2004 r.)
- Volatility: PDFs can be removed post-period — a timely scraper will capture them; a delayed scraper may miss them

---

## 5. Adapter effort + verdict

**Closest analog: Tarnowskie Góry** — same IDcom.pl engine, same HTML notice structure, mid-size city, no separate housing manager, result PDFs attached inline. Secondary analog: Bytom (also IDcom, but larger volume).

**Adapter components needed:**

| Component | Notes |
|-----------|-------|
| List crawler | GET `https://bip.gizycko.pl/wiadomosci/11525/lista/{page}/przetargi__sprzedaz`, pagination over `lista/{n}` until empty; or year-filtered `lista/1/{year}` | 
| Filter: flats only | Title contains "lokal mieszkalny" or "lokal" + street — simple regex/string match on list title |
| Detail fetcher | GET individual announcement URL, parse HTML body — sections I/II/III, extract: address, area (m²), cena wywoławcza, wadium, termin przetargu, form (ustny nieograniczony vs ograniczony) |
| Result PDF fetcher | Poll same URL for attachment `informacja_o_wyniku_przetargu*.pdf`; download from `bip-v1-files.idcom-jst.pl`; parse PDF for cena osiągnięta |
| XML probe | Try `/xml` endpoint on detail pages — may return structured data, reducing parsing complexity |

**Blockers / risks:**
- Result PDFs have a lifecycle (added ~3 weeks post-auction, removed after statutory period ~3–6 months) — need timely polling
- Some notices bundle multiple flats in one entry (e.g. nr 53/2025 covers two flats) — parser must handle multi-flat announcements
- Flat volume is moderate (~5 unique flats/year) — not high-volume, but steady and consistent back to 2018
- No API, no structured feed — HTML scraping required
- IDcom.pl engine is well-known and stable; no anti-bot measures observed

**Overall effort**: Medium. HTML parsing is clean (structured sections, consistent templates). Result PDFs are the main complication but follow a predictable filename pattern. Re-run tracking (same flat appearing I/II/III/IV/V przetarg) needs deduplication by address.

**VERDICT: BUILD** — confirmed flat auctions via ustny przetarg nieograniczony, clean HTML, standard IDcom engine, moderate volume, result PDFs present. Effort comparable to Tarnowskie Góry adapter.
