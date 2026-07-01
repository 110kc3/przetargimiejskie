# Spike — Iława (Warmińsko-Mazurskie · powiat iławski)
> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Miejska Iława actively sells municipal flats (lokale mieszkalne) via ustny przetarg nieograniczony. BIP is a standard systemdobip.pl-family HTML site at `bip.umilawa.pl`. Announcements and result notices are on the same section page (`/77/`). Achieved prices are disclosed in PDF/DOC attachments on each result page — not inline HTML. Volume is low-to-medium (≈2–4 flat lots/year visible, across multiple round I/II/III auctions). No bot blocks, no auth, no SPA.

## 1. Sells municipal property at auction?
**YES — confirmed LIVE.** Burmistrz Miasta Iławy conducts ustny przetarg nieograniczony na sprzedaż for:
- Lokale mieszkalne (e.g. lokal nr 1, ul. Plażowej 5 — ran to III przetarg, 2025–2026)
- Budynki mieszkalne (e.g. ul. Dąbrowskiego 17 — ran to II przetarg, 2026)
- Budynki mieszkalne wielorodzinne (e.g. ul. Wojska Polskiego 24A — I przetarg, 2025)
- Land plots and commercial (ul. Pileckiego, ul. Mazurskiej, ul. Piaskowej, ul. Lubawskiej, etc.)

No evidence of bezprzetargowa sprzedaż as the dominant channel — flat auctions are clearly run publicly.

## 2. Where published? (hosts + boards, URLs)

| Board | URL |
|---|---|
| Announcements (active) | https://bip.umilawa.pl/77/Przetargi_-_mienie_komunalne/ |
| Archive | https://bip.umilawa.pl/77/1/archiwum/Przetargi_-_mienie_komunalne/ |
| Wykaz nieruchomości | https://bip.umilawa.pl/58/Wykaz_nieruchomosci/ |
| Mienie komunalne root | https://bip.umilawa.pl/58/Mienie_komunalne/ |

BIP platform: `systemdobip.pl` family (hosted as `bip.umilawa.pl`). URL scheme: `/77/{numeric-id}/{slug}/`.

Result/achieved-price notices: published on the same `/77/` board as separate entries titled "Ogłoszenie o wyniku…" or "Informacja o wyniku…". The achieved price is inside a PDF (≈45 KiB) and DOC attachment linked from the result page — not rendered inline in HTML.

## 3. Format + rendering

- **Listing page:** plain server-rendered HTML, paginated (active board: 12+ pages; archive: 6 pages). No JavaScript rendering required. No auth, no CAPTCHA observed.
- **Detail page (announcement):** HTML with metadata (date, author) + PDF/DOC attachment links. Body text of the announcement is NOT in the HTML — it is only in the attachments.
- **Result page:** Same structure as detail page. Achieved price is in the attached PDF (format: `Pobierz treść informacji (PDF, ~45 KiB)`).
- **PDF format:** Standard text PDF (not scanned/OCR required, based on file size ~45 KiB). DOC mirror also provided.
- **No SPA, no auth, no bot-detection observed.**

Adapter needs: HTML scraper for the listing index → per-entry URL; PDF fetch + parse for achieved price on result pages.

## 4. Volume + achieved-price stream

- **Active board:** 12+ pages of entries (mix of announcements + results; flats visible in top entries as of 2026-06-30).
- **Archive:** 6 pages of historical entries going back several years.
- **Flat-specific volume:** ≈2–4 flat/residential lots per year; some run multiple rounds (I→II→III przetarg), generating 3–6 BIP entries per property.
- **Achieved-price disclosure:** YES — result notices published promptly (e.g. wynik II przetargu ul. Dąbrowskiego 17 published 2026-05-27). Price is in the PDF attachment.
- **Stream cadence:** sporadic but consistent; not a high-frequency city. Sufficient for a basic adapter.

## 5. Adapter effort + verdict (closest analog; blockers)

**Verdict: BUILD — Medium effort.**

**Closest analog:** Any systemdobip.pl-family city with PDF-in-attachment result pattern (e.g. similar to other small Warmińsko-Mazurskie cities on this platform).

**Effort breakdown:**
- Listing scraper: Low — paginated HTML, stable URL pattern `/77/Przetargi_-_mienie_komunalne/?page=N`
- Entry classifier: Low — title strings clearly distinguish flats (`lokal mieszkalny`, `budynek mieszkalny`) from land/commercial
- Result/price extraction: Medium — requires PDF fetch + parse per result entry; price not inline in HTML
- Archive ingestion: Low — same structure, `/77/1/archiwum/` path

**Blockers / risks:**
- Achieved price only in PDF/DOC attachment (not in HTML body) — requires reliable PDF text extraction
- Volume is low (≈2–4 flat auctions/year); may not justify standalone adapter unless batched with other powiat-ilawski cities or similar-platform cities
- No wyniki board separate from announcements board — must classify by title pattern on the shared `/77/` listing
