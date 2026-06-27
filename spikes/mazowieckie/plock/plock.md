# Spike — Płock (Mazowieckie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Płock runs flat auctions — but through a specialist city-owned company, **ARS Sp. z o.o. (Agencja Rewitalizacji Starówki)**, not through MZGM or the main BIP. ARS publishes "publiczny przetarg ustny na sprzedaż lokalu mieszkalnego" notices and result protocols on its own website (ars.plock.pl), with pages served as server-rendered HTML and PDFs attached. Achieved-price protocols are also published there. Volume is low (roughly 2–4 flat sales per year) but real and open-to-public. The main BIP covers land/bezprzetargowy sales to tenants; MZGM covers rental-only auctions (garages, commercial). ARS is the sole flat-sale auction publisher.

---

## 1. Sells municipal property at auction?

**Yes — residential flats at open oral auction (przetarg ustny nieograniczony), confirmed LIVE.**

Two separate streams exist:

| Actor | Type of auction | Properties sold |
|---|---|---|
| **ARS Sp. z o.o.** (Agencja Rewitalizacji Starówki) | Publiczny przetarg ustny (open oral auction) | Residential flats (lokale mieszkalne) in Old Town buildings |
| **Gmina-Miasto Płock BIP** (Wydział Obrotu Nieruchomościami) | Przetarg ustny nieograniczony | Land (nieruchomości niezabudowane), built plots — not flats |
| **MZGM-TBS** | Przetarg ustny nieograniczony | Rental of garages and commercial units — **not sales** |

Live evidence for ARS flat-sale auctions:
- **Publiczny przetarg ustny na sprzedaż lokalu mieszkalnego nr 9, ul. Synagogalna 13** (46,02 m², cena wywoławcza 299 130 zł), ogłoszony 15-04-2026; przetarg odbył się 29-04-2026. Source: [ars.plock.pl/przetargi/140](http://www.ars.plock.pl/pl/przetargi/140/Publiczny-przetarg-ustny-na-sprzedaz-lokalu-mieszkalnego-nr-9_-polozonego-w-budynku-mieszkalnym--zlokalizowanym-w-Plocku-przy-ul_Synagogalna-13_)
- Earlier round of the **same flat** (przetarg 04-03-2026): [ars.plock.pl/przetargi/132](http://www.ars.plock.pl/pl/przetargi/132/Przetarg-ustny-na-sprzedaz-lokalu-mieszkalnego-nr-9-w-budynku-Synagogalna-13-w-Plocku-wraz-z-pomieszczeniem-przynaleznym)
- Result protocol published: "Protokół: Sprzedaż lokalu mieszkalnego nr 9, ul. Synagogalna 13 (46,02 m²)" — 20-03-2026. Source: [ars.plock.pl/Auction/Details/135](http://www.ars.plock.pl/pl/Auction/Details/135)
- Earlier sale result: "Protokółu z licytacji sprzedaży lokalu mieszkalnego przy ul. Synagogalnej 13" — 29-04-2026. Source: [ars.plock.pl/przetargi/142](http://www.ars.plock.pl/pl/przetargi/142/Protokolu-z-licytacji-sprzedazy-lokalu-mieszkalnego-przy-ul_Synagogalnej-13_)

The main BIP's "Zbycie nieruchomości Gminy Płock" section (live-fetched 2026-06-27) shows only land sales and bezprzetargowy tenant flat lists — **no open flat auctions from city hall directly**.

Caveat: volume is low. ARS manages Old Town revitalisation stock; it has been selling individual flats in buildings on ul. Synagogalna, Jerozolimska, Kwiatka, Sienkiewicza. Rough annual rate: 2–5 flat or building auction events per year based on the paginated archive (8 pages of announcements going back several years).

---

## 2. Where published? (hosts + boards, with URLs)

### Primary source — ARS Sp. z o.o.

| Board | URL | Content |
|---|---|---|
| Ogłoszenia o przetargach | http://www.ars.plock.pl/pl/przetargi/ogloszenia-o-przetargach | Open auction notices (paginated, 8 pages) |
| Wyniki przetargów | http://www.ars.plock.pl/pl/przetargi/wyniki-przetargow | Result protocols + sale protocols (paginated, 6 pages) |
| Unieważnienia przetargów | http://www.ars.plock.pl/pl/prztargi/uniewaznienia-przetargow | Cancelled auctions |
| ARS BIP sub-page | http://bip.ump.pl/index.php?show_cat=kT6Utm4x | BIP mirror (minimal, links back to ars.plock.pl) |

### Secondary source — City BIP (land / bezprzetargowy only)

| Board | URL | Content |
|---|---|---|
| Zbycie nieruchomości Gminy Płock | https://nowybip.plock.eu/komunikaty/nieruchomosci | Land sales, bezprzetargowy tenant flat lists, property swaps |
| Zbycie nieruchomości Skarbu Państwa | https://nowybip.plock.eu/komunikaty/skarb | State Treasury land — not municipal flats |

### Non-source for flat sales — MZGM-TBS

| Board | URL | Content |
|---|---|---|
| Przetargi i aukcje | http://www.mzgm-plock.pl/pl/48_przetargi_i_wybory_ofert/49_przetargi_i_aukcje | Rental auctions only (garages, commercial), no flat sales |

---

## 3. Format + rendering

**ARS website (ars.plock.pl):**
- Server-rendered HTML (ASP.NET MVC / "Powered by Tiny MCE"); no JS SPA, no React.
- Listing pages are paginated HTML with item titles, dates, and "czytaj dalej" links.
- Individual announcement pages contain a short HTML blurb + PDF attachment links.
- **PDFs are born-digital** (machine-readable text confirmed via live fetch of Ogloszenie.pdf for przetarg 140 — full text extracted cleanly). Attachments served at `/pl/AttachmentGallery/GetAttachment/{id}`.
- Result protocol PDFs: live fetch of protokol.pdf for przetarg 135 returned empty text (scanned/image PDF — one result confirmed OCR-required). Mixed: some protocols are text PDF, some are scanned.
- No auth, no bot block observed. TLS present (HTTPS on main site). HTTP also works (redirects).
- No JSON API or structured data endpoint.

**City BIP (nowybip.plock.eu):**
- Server-rendered HTML. CSRF meta token present but not enforced for GET. Content loads fully server-side.
- Announcements are plain HTML text blocks (no PDFs for the main listing).

---

## 4. Volume + achieved-price stream

**Volume:** Low but real. From the paginated archives:
- ARS "Ogłoszenia" section: 8 pages (~10 items/page) going back several years. Mix of flat sales + building sales + renovation procurement + commercial rentals. Estimated 2–5 open flat-sale auctions per year.
- ARS "Wyniki" section: 6 pages of results. Recent flat-sale result protocols confirmed: Synagogalna 13 lokal nr 9 sold March 2026 and again (new attempt) April 2026.

**Achieved-price stream:** Partially available. ARS publishes "Protokół z licytacji" PDFs as result notices. The March 2026 protocol PDF (GetAttachment/563) was scanned/image-only — no extracted price in machine-readable form. The April 2026 licytacja protocol (przetarg/142) is a separate HTML-linked PDF. Scraping achieved price requires PDF text extraction; OCR fallback needed for scanned protocols.

City BIP does not publish achieved prices for its land sales in the "Zbycie nieruchomości" section — only wykazy (lists).

---

## 5. Adapter effort + verdict

### Closest analog

**Bytom (TBS Bytom)** — also a city-owned company publishing flat auctions on its own non-BIP website, with paginated HTML listings and PDF attachments for individual notices. ARS Płock maps almost identically: same structure (ogłoszenia + wyniki sections, individual pages with PDF links, server-rendered HTML).

### Adapter design

1. **Scraper A — ARS listings** (`ars.plock.pl/pl/przetargi/ogloszenia-o-przetargach?page=N`): paginate HTML, extract title + date + detail URL. Filter for "sprzedaż lokalu mieszkalnego".
2. **Scraper B — ARS detail page**: fetch HTML, extract PDF attachment URL(s).
3. **PDF extractor**: download Ogloszenie.pdf, extract text (pdfplumber / pdfminer). Born-digital PDFs yield full text. Fall back to OCR (pytesseract) for scanned protocol PDFs.
4. **Scraper C — ARS wyniki** (`ars.plock.pl/pl/przetargi/wyniki-przetargow?page=N`): match result protocols to source announcements by flat address; parse achieved price from protocol text/OCR.
5. **City BIP** (nowybip.plock.eu/komunikaty/nieruchomosci): secondary scraper for land/general property — low priority, no flat auctions.

### Blockers / risks

- **OCR dependency**: some result protokoły are scanned PDFs — achieved price extraction unreliable without OCR pipeline.
- **Volume is low**: ~2–5 flat-sale events/year; may not justify standalone adapter vs. shared "small-city" template.
- **ARS is a single-building manager**: only Old Town revitalisation stock. No city-wide flat stock goes through open auction — MZGM flats go bezprzetargowo to tenants (confirmed: city BIP WZN-06 procedure grants discount to sitting tenants).
- **URL structure is stable** (sequential numeric IDs in `/przetargi/{id}/` and `/Auction/Details/{id}`), making incremental scraping feasible.
- **No rate limiting or bot blocks observed** during live fetches.

### Verdict

**BUILD — Medium effort.** ARS Płock is a clean, accessible target: server-rendered HTML, born-digital PDFs for announcements, sequential numeric IDs, no auth. The limiting factor is low volume and partial OCR dependency for achieved-price protocols. Worth building as a lightweight adapter — estimated 2–3 days scraper + OCR fallback. Comparable to a Bytom/Zabrze-tier adapter.

---

*Sources verified live 2026-06-27:*
- [ARS ogłoszenia](http://www.ars.plock.pl/pl/przetargi/ogloszenia-o-przetargach) — live-fetched
- [ARS wyniki](http://www.ars.plock.pl/pl/przetargi/wyniki-przetargow) — live-fetched
- [ARS przetarg 140 detail](http://www.ars.plock.pl/pl/przetargi/140/Publiczny-przetarg-ustny-na-sprzedaz-lokalu-mieszkalnego-nr-9_-polozonego-w-budynku-mieszkalnym--zlokalizowanym-w-Plocku-przy-ul_Synagogalna-13_) — live-fetched
- [ARS PDF Ogloszenie (przetarg 140)](http://www.ars.plock.pl/pl/AttachmentGallery/GetAttachment/569) — live-fetched, born-digital PDF confirmed
- [ARS wynik przetarg 135](http://www.ars.plock.pl/pl/Auction/Details/135) — live-fetched, scanned PDF noted
- [City BIP Zbycie nieruchomości Gminy Płock](https://nowybip.plock.eu/komunikaty/nieruchomosci) — live-fetched
- [MZGM przetargi i aukcje](http://www.mzgm-plock.pl/pl/48_przetargi_i_wybory_ofert/49_przetargi_i_aukcje) — live-fetched
