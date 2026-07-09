# Spike — Żary (Lubuskie · powiat żarski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Medium effort).

## TL;DR
**Gmina Żary o statusie miejskim** (town, gmina miejska, ~37k — Burmistrz Miasta Żary) sells municipal property, **including lokale mieszkalne**, via *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych wraz ze sprzedażą ułamkowych części gruntu*. Everything is on the city BIP `bip.zary.pl`, which runs the **SystemDoBIP.pl** hosted CMS (E-LINE Systemy Internetowe, Tadeusz Kozłowski) — clean server-rendered HTML boards with `/<board>/<id>/<slug>/` URLs, and notices delivered as **PDF attachments** (zarządzenia Burmistrza `WA.0050.NN.YYYY`) on HTML stub pages. There are **three dedicated boards**: announcements (`/312/`), wykaz/designations (`/313/`), and a separate **results board** (`/837/`) publishing `Wyniki przetargów przeprowadzonych dnia …`. Flat auctions run on a roughly **monthly cadence** (przetarg dates 21.01, 18.02, 25.03, 22.04, 20.05, 08.07, 16.09.2026 …), each bundling several flats — a healthy, recurring volume. Rental pool is run by **ZGM Żary** (zgmzary.pl) but the sale przetargi are published by the Urząd Miejski (Wydział Gospodarki Nieruchomościami, Architektury i Zasobów Komunalnych). **Closest analog: `gorzow-wielkopolski`** — same voivodeship, same SystemDoBIP `/system/pobierz.php` download shape, same two-board born-digital-PDF pattern, same ZGM-as-rental split. Clone it. Medium (not Low) only because content is in PDF and the ~1.4 MiB results PDFs may be scanned (OCR fallback).

## 1. Sells municipal property at auction?
**YES — confirmed, flats are the core stream.** The Burmistrz Miasta Żary ogłasza *przetargi ustne nieograniczone na sprzedaż z zasobu nieruchomości Gminy Żary o statusie miejskim lokali mieszkalnych wraz ze sprzedażą części ułamkowych gruntów przynależnych do budynków* (confirmed via BIP + Urząd Miejski Facebook post "Przetarg na sprzedaż lokali mieszkalnych — 21 stycznia 2026 r. o godz. 10:00 w sali konferencyjnej"). Open oral unrestricted auctions (natural + legal persons, wadium), NOT land-only and NOT bezprzetargowo-na-rzecz-najemcy.
- Announcement notices are batched by przetarg date, each carrying multiple flats as separate zarządzenie PDFs (e.g. `Przetarg - 22.04.2026 r.` → attachments `WA.0050.27.2026`, `.28.2026`, `.29.2026`).
- Monthly-ish cadence observed on the active board: 15.10, 19.11, 10.12.2025; 21.01, 18.02, 25.03, 22.04, 20.05, 08.07, 16.09.2026 — 16 pages of history.
- Contact: Wydział Gospodarki Nieruchomościami, Architektury i Zasobów Komunalnych, Urząd Miejski w Żarach, pokój 213b, tel. 68 470 83 19. Regulamin przetargów on the same BIP.

**Disambiguation:** target is the **town Gmina Żary o statusie miejskim** → `bip.zary.pl`. Do NOT confuse with the surrounding **rural Gmina Żary** (separate JST) → `gminazary.pl` / `bip.gminazary.pl`, out of scope.

## 2. Where published? (hosts + boards, URLs)
**Host — city BIP `bip.zary.pl` (SystemDoBIP.pl CMS):**
- Announcements ("Przetargi"): `https://bip.zary.pl/312/Przetargi/` — 16 pages; items `https://bip.zary.pl/312/<id>/Przetarg_-_<DATE>_r/` (e.g. `/312/6489/…22_04_2026_r/`).
- Wykaz / designations ("Wyznaczone do sprzedaży"): `https://bip.zary.pl/313/Wyznaczone_do_sprzedazy/` — 30 pages; items `/313/<id>/Nieruchomosci_gminne_wyznaczone_do_sprzedazy_-_<DATE>/` (pre-auction designations — clean addresses, no date/price yet).
- **Results ("Wyniki przetargów"): `https://bip.zary.pl/837/Wyniki_przetargow/`** — 6 pages; items `/837/<id>/Wyniki_przetargow_przeprowadzonych_dnia_<DATE>r/` (e.g. `/837/6645/…20_05_2026r/`), monthly cadence Jun 2025 → May 2026.
- URL shape: `/<boardId>/<articleId>/<slug>/`. Detail pages are HTML stubs; the substance is in **PDF attachments** (zarządzenia Burmistrza, `WA.0050.NN.YYYY`). SystemDoBIP download links follow the E-LINE `/system/pobierz.php`-style pattern (same family as Gorzów).
- CMS confirmed via page footer: **"SYSTEMDOBIP.PL — E-LINE SYSTEMY INTERNETOWE Tadeusz Kozłowski."**

**Housing manager:** ZGM Żary (`zgmzary.pl`, `/sprzedaz-nieruchomosci-22/`) manages the rental/communal pool; zarządzenia are signed by the Burmistrz and published on the city BIP — same split as Gorzów's ZGM. The city BIP is the authoritative source.

## 3. Format + rendering
- **Server-rendered HTML boards** (SystemDoBIP) — dated article lists, numeric-path URLs, simple `?` / path pagination. No SPA, no auth, no CAPTCHA observed.
- **Notices are PDF attachments**, not inline HTML. Announcement PDFs are **zarządzenia Burmistrza** → almost certainly **born-digital text** (Word→PDF) → `pdfText`.
- **Results PDFs are larger (~1.4 MiB)** and may be **scanned/signed tables** → keep `ocrPdf` (tesseract -l pol) as the fallback when `pdfText` returns empty/garbage (exactly the Gorzów playbook).
- Board list HTML gives title + date + article URL; per-article HTML stub gives the attachment hrefs.

## 4. Volume + achieved-price stream
- **Volume:** Healthy/regular. Roughly **one przetarg date per month**, each bundling **several flats** (multiple zarządzenie PDFs per date). 16 pages of announcement history + 30 pages of wykaz → the strongest flat stream signal in a mid-size lubuskie town. Repeat rounds (II/III) appear as re-listed dates.
- **Achieved-price stream: YES — dedicated results board `/837/`** publishing `Wyniki przetargów przeprowadzonych dnia <DATE>` (cena osiągnięta / nabywca, or wynik negatywny) as PDF, roughly monthly. Announcement PDFs carry `cena wywoławcza` + `wadium`; results PDFs carry the hammer price. Both parseable after PDF text extraction (OCR fallback for results if scanned).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog: `gorzow-wielkopolski`** (same voivodeship, `cities/gorzow-wielkopolski/`). Near-identical shape: SystemDoBIP/E-LINE host, `/system/pobierz.php` PDF download, **two boards (announcements + results)** of born-digital PDFs on HTML stub pages, ZGM = rental manager (not sale publisher). Clone crawl/parse and re-point boards: announcements `/312/`, wykaz `/313/`, results `/837/`; paginate `/312/<page>/…` bounded (~16 pages) and `/837/<page>/…` (~6 pages).
- **CMS family:** SystemDoBIP.pl (E-LINE) — in ADAPTER-GUIDE §3 terms the "custom HTML board + PDF attachments" family (Gorzów is the built exemplar).
- **Effort: MEDIUM.** Straightforward HTML board crawl + `parseAddress`/`classifyKind`, but data lives in PDFs: `pdfText` for zarządzenie announcements, and `ocrPdf` fallback for the heavier (possibly scanned) results PDFs. One notice → several flats (one record each). Filter wykaz (no date/price) and any land/dzierżawa. Bounded pagination for the 25-min CI budget.
- **Blockers:** None hard. Watch-items: (1) SystemDoBIP/E-LINE hosts can 403/empty on bot UAs — pass a browser UA via `getText` (as Gorzów already does); (2) verify whether results PDFs are born-digital or scanned on first run (drives pdfText-vs-OCR); (3) three separate boards to wire.

**VERDICT: BUILD (Medium effort)** — recurring monthly municipal flat auctions on a clean SystemDoBIP server-HTML BIP with a dedicated results board; a near-exact clone of the already-built `gorzow-wielkopolski` lubuskie analog, PDF extraction being the only real work.
