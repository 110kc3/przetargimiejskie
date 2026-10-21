# Spike — Kwidzyn (Pomorskie · powiat kwidzyński)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Low effort). **Built + registered 2026-07-11** (12/12 parse test). ⚠️ 3 spike errors corrected live: (1) result PDFs are **SCANNED** → OCR, not born-digital text; (2) site IS a React **SPA** but backed by a clean Logonet/Madkom **JSON API** the crawler drives directly (no render.js/Playwright); (3) real property board is **"Gospodarka Nieruchomościami" (menu 13536)**, not the procurement board the spike cited. Land is OCR-mangled (flats are the reliable stream). teryt 220501_1 best-effort.

## TL;DR
Miasto Kwidzyn (Burmistrz) runs a continuous programme of *ustny przetarg nieograniczony na sprzedaż* of **lokale mieszkalne** from the communal stock. Announcements and "informacja o wyniku przetargu" PDFs are published on BIP at `bip.kwidzyn.pl`, cross-posted on the city news portal `kwidzyn.pl`. Volume is low-to-medium (~2–6 flat auctions per year across multiple rounds). Closest analog: standard small-city BIP pattern (HTML index + PDF attachments). No auth/SPA block detected. Low build effort.

## 1. Sells municipal property at auction?
**YES — flat auctions confirmed.**

- Multiple *przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* confirmed across at least 2022–2026:
  - ul. Sztumska 12/2 — 1st and 4th auctions (multiple rounds = slow sell, typical for worn stock)
  - ul. Chopina 34/8 — 1st auction (announced Feb 2026, result posted Apr 2026)
  - ul. Grudziądzka 13/5 — bezprzetargowa *or* przetarg (announcement found on kwidzyn.pl)
  - ul. Zamiejska 13 — 2nd auction, residential building (77 000 PLN cena wywoławcza)
  - ul. Jesienna, ul. Zielna, ul. Koszykowa — *przetarg ustny nieograniczony* confirmed
- Authority: Burmistrz Miasta Kwidzyna, acting under Ustawa o gospodarce nieruchomościami (21.08.1997).
- Flats sold individually (lokal mieszkalny nr X), not whole buildings.

Bezprzetargowe sprzedaże to najemców also occur (Grudziądzka ogłoszenie bezprzetargowe found), so the city uses both paths — the auction path for units where no tenant has pre-emption right. Both are worth capturing.

## 2. Where published? (hosts + boards, URLs)

**Primary — BIP Miasto Kwidzyn:**
- Base: `https://bip.kwidzyn.pl/`
- Przetargi index (all years): `https://bip.kwidzyn.pl/m,14800,przetargi.html`
- Year sub-pages:
  - 2022: `https://bip.kwidzyn.pl/m,15117,przetargi-2022.html`
  - 2023: `https://bip.kwidzyn.pl/m,15425,przetargi-2023.html`
  - 2024: `https://bip.kwidzyn.pl/m,15923,przetargi-2024.html`
  - 2025: `https://bip.kwidzyn.pl/m,16261,przetargi-2025.html`
  - 2026: `https://bip.umkwidzyn.nv.pl/m,16261,przetargi-2025.html` (mirror URL also seen)
- Individual announcement: `https://bip.kwidzyn.pl/a,43604,ogloszenie-o-przetargu-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego-przy-ul-chopina-348-w-kwidzyn.html`
- Property management section: `https://bip.kwidzyn.pl/o,13536,gospodarka-nieruchomosciami.html`

**Results / achieved-price board:**
- "Informacja o wyniku przetargu" published as PDF attached to BIP article (confirmed April 2026 for Chopina 34/8, 48 KB PDF).
- Same year-indexed przetargi pages contain result entries alongside announcements.
- Monitor Urzędowy mirrors: `https://monitorurzedowy.pl/announcement/1654699/wyciagi-z-ogloszen-o-przetargach`

**Secondary cross-post:**
- `https://kwidzyn.pl/ogloszenia-o-przetargach-41270/` — city news portal, HTML summaries with links back to BIP PDFs.

## 3. Format + rendering

| Layer | Format | Notes |
|---|---|---|
| BIP index pages | **HTML** | Standard nv.pl CMS; table/list of article links, year-indexed |
| Announcement articles | **HTML** + **PDF attachment** | Article gives summary; full notice is PDF |
| Result notices | **PDF** (machine-generated, ~48 KB) | "Informacja o wyniku przetargu" — likely text-PDF (not scanned), given small file size |
| kwidzyn.pl summaries | **HTML** | Supplementary; may duplicate BIP content |

- No SPA, no login/auth wall detected.
- nv.pl BIP CMS is widely used and well-understood (same CMS as other BUILD cities).
- PDF results are small (<50 KB) → almost certainly digitally generated text-PDFs, not scans → no OCR needed.

## 4. Volume + achieved-price stream

- **Announcements:** ~3–8 property auctions per year total; flat (lokal mieszkalny) subset estimated **2–5 per year** based on 2022–2026 evidence. Several properties go to 2nd, 3rd, 4th round (slow clearance).
- **Achieved-price stream:** YES — "informacja o wyniku przetargu" PDF confirmed on BIP (April 2026). This gives final cena osiągnięta, purchaser type (not named), and date.
- Volume is low-to-medium. Worthwhile given clean data and low scraping difficulty.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Malbork / Starogard Gdański (small Pomorskie city, nv.pl BIP, similar volume, HTML+PDF pattern).

**Adapter plan:**
1. Scrape year-indexed BIP przetargi page (HTML list) → extract article links containing "lokal mieszkalny" in title.
2. Fetch each article (HTML) → parse metadata (address, cena wywoławcza, date, round number) + download attached PDF.
3. Parse text-PDF for full announcement details.
4. Poll same year pages for "wynik" / "informacja o wyniku" entries → parse result PDF for cena osiągnięta.

**Blockers:** None identified. Standard nv.pl BIP CMS. PDF appears text-based (no OCR path needed). kwidzyn.pl cross-posts are a useful fallback but not required.

**Effort:** Low — HTML scraper + PDF text extractor. No auth, no SPA, no OCR.

**VERDICT: BUILD (Low effort)**


## Partial source/asset audit — 2026-10-20 (Codex)

This live check supersedes the desk-only HTML/text-PDF assertions above. The
anonymous [property menu API](https://bip.kwidzyn.pl/api/menu/13536) links year
16626 (2026, 30 entries) and 16265 (2025, zero entries), plus earlier archives.
The current/prior-year crawler deliberately does not establish full historical
coverage. Result PDFs are additional attachments on announcement articles.

Two current flat notices are already OCR-cached but were skipped merely because
their announcement URLs existed in published history. Article
[44282](https://bip.kwidzyn.pl/api/articles/44282), attachment 131119, sells
**Hallera 15/15, 22.10 m², 41,108 zł**, second round; article
[44281](https://bip.kwidzyn.pl/api/articles/44281), attachment 131118, sells
**Chopina 34/8, 116.70 m², 350,000 zł**, fourth round. Both auctions are
**23 October 2026**. The existing exact OCR caches retain the source texts;
previous-round, viewing and deposit dates are not the current auction dates.

The crawler now always classifies cached bodies before applying a known-result
shortcut; current announcements remain eligible. Known resolved URLs include
both property and land history. Both meaningful PDF-text and OCR caches bypass
the 24-uncached extraction cap; tiny form-feed artifacts do not. Cached OCR is
read directly without redownloading its source PDF. Changed/failed/repeated or
capped article pages, bad article identity, missing attachments, extraction
failures, skipped older years and unparsed result bodies keep result discovery
explicitly incomplete. The rolling land stream also declares incompleteness.

An actual isolated refresh retains **6 property keys / 3 plot keys**, all prior
listing dates, and both current flats. Strict integrity passes. The property
check recovers; land and results remain degraded. Thirteen result documents still have unsupported scanned land tables. For example,
[attachment 131434](https://bip.kwidzyn.pl/e,pobierz,get.html?id=131434), visually
checked against its scan, describes four separate Sosnowa lots with a 9 October
auction and explicit unsold outcome. Parcel 45/3 is a fractional road interest
in two lots, not the primary sale. The retained first-parcel-only land rows and
the historical Hallera row missing its flat number need source-backed identity
repair; this slice does not relabel or delete them. Full land-table extraction,
archive traversal and retained-ledger migrations remain accepted follow-up work.

Official municipal TERC is **220701_1**, as recorded in the canonical official
ledger; the adapter's old `220501_1` was incorrect. Hosted scheduled publication
`1bd92093e` confirmed the current-flat retention live: **6 properties / 3 plots**,
property stream healthy, active auctions = 2 (Hallera 15/15 and Chopina 34/8).
Thirteen scanned land result tables and older archives remain degraded. No
full-review deadline is promoted by this check.
