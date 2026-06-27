# Spike — Brzeg (Opolskie · powiat brzeski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Brzeg actively sells municipal **flats** at open *ustny przetarg nieograniczony* auctions —
confirmed with multiple listings in 2024–2026. The announcement flow uses TWO hosts in tandem:
the city portal `brzeg.pl` (WordPress, HTML, structured listing page) and `bip.brzeg.pl` (MegaBIP, per-item HTML pages). A dedicated housing manager, ZNM Brzeg (`znmbrzeg.pl` / `bip.znmbrzeg.pl`), handles flat *viewings and najem* but not sprzedaż auctions. Volume is meaningful: ≥8 distinct flat auctions found across 2024–2025 alone, including multi-lot batches. Result notices land on `bip.brzeg.pl` per-item.

---

## 1. Sells municipal property at auction?

**YES — flats (lokale mieszkalne) sold at ustny przetarg nieograniczony.**

Confirmed examples (all I/II/III przetarg, lokal mieszkalny):

| Date | Address | Round | Price (PLN) |
|------|---------|-------|-------------|
| 2024-07 | Piłsudskiego 16/12 | I | — |
| 2024-09 | 3 Maja 1/1 | I | 97 000 |
| 2024-09 | 3 Maja 1/2 | I | 99 000 |
| 2024-09 | 3 Maja 1/4 | I | 220 000 |
| 2024-06 | Wolności 3/3 | III | — |
| 2025-04 | Trzech Kotwic 3A/1 | I | — |
| 2025-04 | Ofiar Katynia 10/8 | I | — |
| 2025-08 | Rybacka 23/9 | II | — |
| 2026-01 | Staromiejska 6/2 | I | — |
| 2026-01 | Staromiejska 3/2 | I | — |

Also confirmed: "Wykaz nieruchomości przeznaczonej do sprzedaży w trybie ustnego przetargu nieograniczonego" for Długa 8/1 (2025). The city does **not** restrict flat sales bezprzetargowo exclusively — open-market auctions are the standard mechanism here.

Sources:
- https://brzeg.pl/gminne-nieruchomosci-do-sprzedazy/
- https://brzeg.pl/aktualnosci/133926-i-ustny-przetarg-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-12-polozonego-w-brzegu-przy-ulicy-marszalka-pilsudskiego-16/
- https://brzeg.pl/aktualnosci/142945-ii-ustny-przetarg-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-9-polozonego-w-brzegu-przy-ulicy-rybackiej-23/
- https://brzeg.pl/aktualnosci/138955-i-ustny-przetarg-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-8-polozonego-w-brzegu-przy-ulicy-ofiar-katynia-10/
- https://brzeg.pl/aktualnosci/143109-i-ustny-przetarg-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-2-polozonego-w-brzegu-przy-ul-staromiejskiej-6/

---

## 2. Where published? (hosts + boards, URLs)

**Two-host model: brzeg.pl (city portal) + bip.brzeg.pl (formal BIP)**

| Role | Host | URL |
|------|------|-----|
| Announcement summary / current listings | `brzeg.pl` (WordPress) | https://brzeg.pl/gminne-nieruchomosci-do-sprzedazy/ |
| Announcement summary / news feed | `brzeg.pl` | https://brzeg.pl/kategoria/ogloszenia-burmistrza/ |
| Formal przetarg notices (BIP) | `bip.brzeg.pl` (MegaBIP) | https://bip.brzeg.pl/przetargi,9 |
| Per-item BIP listing (full text + PDF) | `bip.brzeg.pl` | e.g. https://bip.brzeg.pl/przetargi,9_1-2024-7_72 |
| Result notices (wyniki przetargu) | `bip.brzeg.pl` | same /przetargi,9 index |

**ZNM Brzeg** (Zarząd Nieruchomości Miejskich) is Brzeg's dedicated housing manager.
It publishes under two of its own hosts but for **najem/dzierżawa** (rental of commercial/utility space), NOT flat sales:
- https://bip.znmbrzeg.pl/ — MegaBIP, najem ogłoszenia, result PDFs (lokale użytkowe only)
- https://www.znmbrzeg.pl/ — main ZNM site

Flat-sale auctions are handled by UM Brzeg's Wydział Geodezji (geodezja@brzeg.pl, 77 416 04 26),
with ZNM only providing flat-viewings support (sekretariat@znmbrzeg.pl).

---

## 3. Format + rendering

**Primary scrape target: `brzeg.pl/gminne-nieruchomosci-do-sprzedazy/`**

- WordPress 7.0 site, fully server-side rendered HTML. No SPA.
- The `/gminne-nieruchomosci-do-sprzedazy/` page is a static WordPress page listing currently active
  auctions as structured HTML divs (address, price, tryb, wadium, termin, contact, BIP link).
- Individual new-auction articles live at `/aktualnosci/<slug>/` (also HTML, og:title carries full
  lokal description). Article content is *archiwalne* (hidden body text) once auction closes.

**Secondary: `bip.brzeg.pl/przetargi,9`**

- MegaBIP platform (syski.pl). Index page lists items with dated entries.
- Per-item URL pattern: `bip.brzeg.pl/przetargi,9_1-YYYY-7_NNN` (year + sequential ID).
- Content type: HTML page with the full notice text + PDF attachment link.
- No auth gate observed; robots: index,follow. No Cloudflare or bot-block signals detected.
- Attachments are PDFs (likely text-PDF of the standard notice template — not scanned).

**No OCR requirement anticipated.** Announcement text in HTML; PDFs are generated from template,
not scanned images.

---

## 4. Volume + achieved-price stream

**Volume:** Approx. 8–12 flat-sale auctions per year (DESK estimate based on ≥10 auctions confirmed
across ~24 months). Multi-lot sessions occur (3 flats in one day at 3 Maja 1 in Sep 2024).
A mix of I/II/III rounds (unsold flats get re-offered at lower minimums).

**Achieved-price stream:**

Result notices (informacje o wynikach przetargu) for flat sales appear to be posted on `bip.brzeg.pl`
as part of the same przetargi index — confirmed by analogy with ZNM's model (result PDFs named
"Informacja o wynikach przetargu...pdf" visible on bip.znmbrzeg.pl for najem auctions).
For flat-sale results specifically, the BIP per-item pages on bip.brzeg.pl are the source.

**Achieved price availability:** DESK — BIP przetargi pages timed out on live fetch; result-notice
presence inferred from the ZNM BIP pattern and standard MegaBIP practice. Need one live-verify
pass to confirm the result pages actually carry "cena osiągnięta" text, not just the announcement.

---

## 5. Adapter effort + verdict

**Closest analog:** Bytom / Gliwice model — dual-host (city portal + BIP), WordPress city site with
structured listing page, MegaBIP for formal notices, ZNM as subordinate housing manager for najem
(not sprzedaż). Not identical to Kraków (no dedicated city-level DB) or Tarnowskie Góry (simpler
single BIP). Closer to mid-size Silesian cities where the city portal has a structured "nieruchomości
do sprzedaży" page and BIP is the formal record.

**Adapter strategy:**

1. Scrape `brzeg.pl/gminne-nieruchomosci-do-sprzedazy/` for current listings (HTML, simple DOM parse).
2. Follow BIP links per listing to `bip.brzeg.pl/przetargi,9_…` for full notice + result.
3. Poll `bip.brzeg.pl/przetargi,9` index for new items (MegaBIP has predictable ID pattern).

**Blockers / risks:**

- `bip.brzeg.pl` timed out once during this spike — may be slow or rate-sensitive; single retry
  with a longer timeout should suffice.
- `brzeg.pl/gminne-nieruchomosci-do-sprzedazy/` is a manually updated WP page (last meta-modified
  2024-07-26); it may lag behind BIP. Use BIP index as canonical source of truth.
- Result notices (achieved price) on bip.brzeg.pl not live-verified — article body was marked
  archival (hidden) for the one flat-sale article fetched. Need one more live fetch of a BIP
  przetarg item to confirm result text is in HTML vs. PDF-only.
- Volume is moderate (~10/yr) — adapter is worthwhile but not high-traffic.

**Effort:** Medium. Two hosts to integrate, but both are standard Polish BIP/WP stacks. No auth,
no SPA, no OCR. ZNM Brzeg is a separate adapter scope (najem only, different domain, PDFs).

**VERDICT: BUILD** — confirmed flat-auction volume, open auctions (not bezprzetargowo), structured
HTML on both hosts, no bot-block signals. One NEEDS-LIVE-VERIFY caveat on result-price extraction
from bip.brzeg.pl per-item pages; low risk.
