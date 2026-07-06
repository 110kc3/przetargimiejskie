# Spike — Lesko (Podkarpackie · powiat leski)
> **Status:** spike LIVE — re-verified 2026-07-06. VERDICT: NO-BUILD (no achieved-price stream; ~1-2 distinct flats/yr, mostly unsold repeat rounds).

## TL;DR
Gmina Lesko sells municipal flats via *ustny przetarg nieograniczony na sprzedaż* — confirmed by a residential unit (ul. Smolki 7/91) that went through at least 4 auction rounds in 2024–2025, with a starting price of 210,000 PLN. Published on the standard dobrybip.pl BIP at `bip.lesko.pl`. Volume is low (small town, ~5,500 residents, ~1–3 flat auctions/year). Achieved-price result posts not confirmed in search — live check of the BIP result board needed before committing the adapter.

## 1. Sells municipal property at auction?
**YES — flats included.** Confirmed signals:
- "PRZETARG – Sprzedaż lokalu mieszkalnego" news post on lesko.pl (May 2025): `https://www.lesko.pl/aktualnosci/gmina/2025/05/przetarg-sprzedaz-lokalu-mieszkalnego`
- "Zamieszkaj na Osiedlu Smolki w Lesku – mieszkanie na sprzedaż!" (August 2025): `https://www.lesko.pl/aktualnosci/gmina/2025/08/zamieszkaj-na-osiedlu-smolki-w-lesku-mieszkanie-na-sprzedaz`
- The same flat (Smolki 7/91, ~210,000 PLN starting price, wadium 21,000 PLN) reached a **IV (fourth) round** of open oral auction — indicates repeat listings when no buyer is found, consistent with the standard municipal auction process under the 1997 Ustawa o Gospodarce Nieruchomościami.
- Also sells land (Postołów plots, Plac Konstytucji 3 Maja) and commercial space (ul. Kazimierza Wielkiego 3) at *ustny przetarg nieograniczony*.
- No evidence of exclusive *bezprzetargowo* tenant-only sales for this flat; the public auction route is used.

## 2. Where published? (hosts + boards, URLs)
- **BIP host:** `https://bip.lesko.pl` — platform: dobrybip.pl (same engine used by many Podkarpackie gminas).
- **Announcement board (gospodarka nieruchomościami):** `https://bip.lesko.pl/lista/gospodarka-nieruchomosciami`
- **BIP search (przetarg):** `https://bip.lesko.pl/szukaj/przetarg/`
- Individual announcements use descriptive slug URLs (e.g. `/burmistrz-miasta-i-gminy-lesko-oglasza-drugi-przetarg-ustny-nieograniczony-na-sprzedaz-...`).
- Municipal news also mirrors auction notices: `https://www.lesko.pl/aktualnosci/gmina/` (lesko.pl = separate CMS, not BIP).
- **Result/achieved-price board:** NOT confirmed from search. The BIP gospodarka-nieruchomościami board likely carries wynik posts, but no dedicated result URL was surfaced — **requires live verification**.
- Archive BIP: `http://archiwumbip.lesko.pl/Przetargi` (older records).

## 3. Format + rendering
- **HTML** — individual BIP pages rendered as standard HTML on dobrybip.pl. No evidence of PDF-only announcements or scanned-PDF content.
- No SPA, no auth/bot blocks observed.
- URL pattern: descriptive human-readable slugs (not numeric IDs), making list scraping via the board at `/lista/gospodarka-nieruchomosciami` the entry point.
- Attachments (`/zalacznik/NNNNN`) may carry PDF supplements, but the main announcement text is inline HTML.
- dobrybip.pl platform is already handled by analogs elsewhere in the project — adapter complexity is low.

## 4. Volume + achieved-price stream
- **Volume:** Low. Lesko is a small urban-rural gmina (~5,500 residents, seat of powiat leski). Estimated ~1–3 flat auctions/year, plus ~2–5 land/commercial. Repeat rounds on a single flat are common (Smolki 7/91 ran ≥4 rounds).
- **Achieved-price stream:** Unconfirmed from desk research. Standard dobrybip.pl gminas publish "informacja o wyniku przetargu" as a separate BIP entry. A live visit to `/lista/gospodarka-nieruchomosciami` is needed to verify that result posts appear and contain the final hammer price.
- No JSON API or structured data feed observed.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** Any other dobrybip.pl gmina already spiked (same platform, same HTML structure, same slug-based list board).
- **Effort: Low** — list page scrape → slug-based detail fetch → parse inline HTML for property type, address, starting price, auction date, wadium. Standard pattern.
- **Blockers:**
  1. Achieved-price result posts not confirmed — need one live BIP visit to `/lista/gospodarka-nieruchomościami` to confirm wynik entries exist with final prices before building the result-harvesting half of the adapter.
  2. Volume is low; may not justify a standalone adapter unless bundled with other powiat-leski gminas.
- **Verdict: NEEDS-LIVE-VERIFY** — flat auctions are real and the BIP is scrape-friendly, but the result/price stream requires one live confirmation before BUILD. *(superseded — see Re-verify 2026-07-06 below)*

## Re-verify 2026-07-06 (LIVE)

Live checks against `bip.lesko.pl` resolved all three open items:

**1. List URL works, server-rendered.** `https://bip.lesko.pl/lista/gospodarka-nieruchomosciami` renders as plain HTML (dobrybip.pl), 10 entries/page, 7 pages. Pagination is path-based: `/lista/gospodarka-nieruchomosciami/2` … `/7` (a `?page=N` query param is ignored). Detail pages are inline HTML with the terms in a table + PDF attachments (e.g. Waryńskiego 17 building: cena wywoławcza 190 000 PLN, wadium 19 000 PLN, auction 2026-06-12) — format confirmed scrape-friendly.

**2. Result/wynik board: DOES NOT EXIST.** Walked board pages 1–3 covering **Sep 2024 → May 2026 (~20 months)**: every entry is an "ogłasza … przetarg ustny nieograniczony" announcement (or one odwołanie/cancellation) — **zero "informacja o wyniku przetargu" posts**. BIP label search for `wynik` / `wynik przetargu` returns "Nie znaleziono dokumentów". No `/lista/przetargi` board (404); `/lista/ogloszenia` carries only obwieszczenia (building-condition decisions), no results. A legacy result-module URL surfaced by Google (`/?c=mdPrzetargi-cmPokazWynik-375-1020`) just falls through to the BIP homepage — dead old-CMS module. Result info evidently stays on the physical office notice board only. **No achieved-price stream on this BIP.**

**3. Recurring flat volume 2024–2026: very low, mostly the same unsold objects re-listed.** Distinct residential objects seen across the 20-month window:
- **Smolki 7/91 flat** — rounds II (2025-03-18), ~III (2025-06-27), IV (2025-09-24), V (2025-12-01), still re-listed 2026-03-30: one flat cycling unsold for over a year.
- **Bieszczadzka 6 multi-family building** — 2024-09-20, 2024-11-29 (repeat rounds), 2025-03-28 (second auction).
- **Waryńskiego 17 residential building (poor condition)** — drugi przetarg 2026-05-12.
- One mixed "lokale użytkowe i mieszkalne" announcement 2024-12-20.

Net: ~1–2 *distinct* residential objects per year, high re-list ratio, low sale completion — and even completed sales leave no published hammer price.

**Conclusion:** the announcement stream is real and technically trivial to scrape (dobrybip analog), but the project's core deliverable — achieved/hammer prices — cannot be harvested here, and the flat volume is marginal even for announcements. **NO-BUILD.** Revisit only if bundling all powiat-leski gminas into one dobrybip adapter, or if the gmina starts posting wynik entries.

- **Verdict: NO-BUILD** — no achieved-price (wynik) stream anywhere on bip.lesko.pl over 20 months of board history; ~1–2 distinct flats/yr dominated by repeat rounds of the same unsold unit.
