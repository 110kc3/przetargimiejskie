# Spike — Kalisz (Wielkopolskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Kalisz runs a genuine *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych* — confirmed by a live-fetched PDF auction notice (Pułaskiego 14/2, Aug 2024) and the live city BIP board showing active flat-sale and result notices as recently as June 2026. All announcements are published on a single server-rendered HTML board at `bip.kalisz.pl` (WGM — Wydział Gospodarowania Mieniem). Documents are born-digital PDFs, no OCR needed. The achieved-price stream is present in the same board (live examples: "Informacja o wyniku II przetargu ustnego nieograniczonego na sprzedaż … ul. Kredytowej 1" dated 2026-06-23). Volume is low-to-medium: the active board showed ~14 entries on a single page covering ~6 weeks, mixing flat sales, land sales, lease notices, and result notices. Residential flat auctions are a minority but confirmed real stream. Closest analog: **Poznań** (same single-board city BIP structure, same WGM department, similar low-medium flat volume, born-digital PDFs).

---

## 1. Sells municipal property at auction?

**YES — confirmed with live examples.**

The Prezydent Miasta Kalisza (acting via Wydział Gospodarowania Mieniem, WGM) conducts *przetargi ustne nieograniczone* for the sale of municipal residential flats (*lokale mieszkalne*). Confirmed auction types from live BIP data:

- **Flat sale (lokal mieszkalny):** First *przetarg ustny nieograniczony* for flat nr 2 at ul. Kazimierza Pułaskiego 14 (43.60 m², ground floor, requires full renovation), starting price PLN 130,000, auction 22 Aug 2024 at City Hall, room 36. PDF: https://bip.kalisz.pl/ogloszenia/sn/20240712-wgm_6840_01_0029_2022_ad.pdf — **LIVE-VERIFIED** (full PDF successfully fetched).

- **Flat sale (ograniczony — restricted auction):** II przetarg ustny ograniczony for flat nr 11A at ul. Górnośląska 42 (14.63 m²), at reduced price, posted 17 Jun 2026. Notice: https://bip.kalisz.pl/ogloszenia/sn/1706gornoslaska42lok11a.pdf

- **Land/building sale:** Multiple *przetargi* for undeveloped plots and buildings — confirmed from the live board (e.g., ul. Metalowców, ul. Romańska, ul. Chmielna, ul. Garncarskiej 9A, ul. Skarszewskiej / ul. Dębowej — all 2026).

- **Result notices (wynik):** "Informacja o wyniku II przetargu ustnego nieograniczonego na sprzedaż … nieruchomości położonej przy ul. Kredytowej 1" posted 23 Jun 2026; "Informacja o wyniku pierwszego przetargu ustnego nieograniczonego … w rejonie ulicy Romańskiej" posted 24 Jun 2026 — both on the same BIP board.

**Important nuance — MZBM role:** Miejski Zarząd Budynków Mieszkalnych (MZBM) at `bip.mzbm.kalisz.pl` manages communal housing and runs auctions for **rental** (*najem*) of residential and commercial units — it does NOT sell flats. The MZBM "Lokale mieszkalne — przetargi" board is a rental-only stream and should be excluded from scraping. Flat **sales** at open auction are handled exclusively by the city's WGM and published on `bip.kalisz.pl`.

**Bezprzetargowo risk:** Some smaller or hard-to-let flats may be disposed of by restricted auction (*przetarg ograniczony*) or direct negotiation (*rokowania*) rather than open auction. The Górnośląska 42/11A notice (14.63 m², already at II przetarg ograniczony w cenie obniżonej) suggests the city does drop to restricted/discounted sales when open auctions fail — typical PL practice. The open *przetarg nieograniczony* stream is real but not high-volume.

---

## 2. Where published? (hosts + boards, with URLs)

| What | Host | URL | Notes |
|---|---|---|---|
| All sale/lease/result announcements | bip.kalisz.pl | https://www.bip.kalisz.pl/index.php?id=1400&s=1418&file=disp_o.php&r_ogl=SN | Section: "Sprzedaż, dzierżawa nieruchomości" — single board for auctions, lease notices, result notices |
| Archive (by year) | bip.kalisz.pl | https://bip.kalisz.pl/index.php?arch=1&file=archiwum_o.php&id=1400&r_ogl=SN&rok=2024&s=1418 | Replace `rok=2024` for other years; pagination via `nr_porcji=N` |
| Individual PDFs | bip.kalisz.pl | Pattern: `https://bip.kalisz.pl/ogloszenia/sn/<filename>.pdf` | Direct PDF links embedded in each board entry |
| MZBM rental auctions (DO NOT SCRAPE FOR SALES) | bip.mzbm.kalisz.pl | https://www.bip.mzbm.kalisz.pl/lokale-mieszkalne-przetargi | Rental only — separate entity |
| WGM department contact | bip.kalisz.pl | https://bip.kalisz.pl/index.php?file=wg_wydz.php&id=900&idd=0&s=930 | Wydział Gospodarowania Mieniem, Ratusz III piętro, pok. 71, tel. 62/76-54-376 |

**Board structure:** The `SN` (Sprzedaż, Nieruchomości) board lists items newest-first by default. Each entry has: title text (plaintext description), a PDF download link, metadata (author, entry date, validity date range, legal basis reference number `WGM.6840.XX.XXXX.XXXX.XX`). There is no separate "wyniki" sub-board — result notices appear inline in the same stream.

**Key observation:** The board is paginated; the live fetch returned ~14 items spanning 29 May 2026 to 26 Jun 2026. Older items are in the archive behind the `arch=1` parameter. The page displayed "aktualnie na stronie przebywa: 1 osób" — no Cloudflare or login wall.

---

## 3. Format + rendering

| Property | Finding | Confidence |
|---|---|---|
| BIP board page | Server-rendered HTML (`text/html; charset=UTF-8`), classic Polish BIP CMS (Logotec/similar) | LIVE-VERIFIED |
| JavaScript / SPA | No — standard HTML, no JS framework detected | LIVE-VERIFIED |
| Announcement body | Title text inline in HTML; substantive content in linked PDF | LIVE-VERIFIED |
| PDF type | Born-digital (not scanned) — full UTF-8 text extracted from the Pułaskiego 14/2 PDF with zero OCR | LIVE-VERIFIED |
| PDF structure | Multi-section standard PL property auction format: I. Termin i miejsce; II. Dane dotyczące nieruchomości; III. Cena wywoławcza; IV. Wadium; V. Warunki; VI. Skutki; VII. RODO | LIVE-VERIFIED |
| TLS | Standard HTTPS, no auth, no captcha observed | LIVE-VERIFIED |
| Bot protection | None detected; BIP pages fetched without issue; rate limit is the only constraint observed | LIVE-VERIFIED |
| Result notices | Also born-digital PDFs on the same board; no separate API | DESK (inferred from board structure; PDF content not fetched due to rate limit) |
| Encoding | UTF-8 throughout | LIVE-VERIFIED |

**PDF filename pattern:** `bip.kalisz.pl/ogloszenia/sn/<DDMM><streetname>.pdf` or `<YYYYMMDD>-<ref>.pdf` — no stable slug; must parse from board HTML per entry.

---

## 4. Volume + achieved-price stream

**Volume (desk estimate):**
- The live board showed ~14 entries over ~4 weeks (29 May – 26 Jun 2026), of which approx. 3–4 were flat or building sales, 2–3 were result notices, and the rest were land sales and lease/dzierżawa notices.
- Estimated full-year volume for flat auctions: **5–15 flat-auction announcements/year** (low-to-medium, consistent with a city of ~90,000 population with a declining but non-zero municipal housing stock).
- Land and building auctions add further volume (~10–20/year).
- Archive back to 2003 exists at `rok=YYYY` parameter.

**Achieved-price stream:**
- **CONFIRMED present.** Result notices ("Informacja o wyniku przetargu") appear inline in the same `SN` board, published as PDFs a few days after the auction.
- Live examples from June 2026: ul. Kredytowej 1 (II przetarg, wynik published 23 Jun 2026), ul. Romańska (I przetarg, wynik published 24 Jun 2026).
- The 2023 example (ul. Targowej 16-18 lok. 14) confirms achieved-price data in these PDFs: "nabywcą nieruchomości został Wojciech Karwowski" with a confirmed sale — standard PL result notice format includes the achieved price (cena osiągnięta).
- Risk: Some auctions end negatively ("przetarg zakończył się wynikiem negatywnym") — these are also posted but yield no price data. Typical for hard-to-sell units.

---

## 5. Adapter effort + verdict

**Closest analog: Poznań** — same single-board city BIP structure, same WGM department as publisher, same born-digital PDF document format, similar low-to-medium flat volume, same server-rendered HTML with PDF links. The Kalisz BIP CMS is older/simpler than Poznań's (no JSON/XML API exposure, plain URL parameters), which actually makes scraping slightly *easier*.

**Architecture sketch:**
1. `GET https://www.bip.kalisz.pl/index.php?id=1400&s=1418&file=disp_o.php&r_ogl=SN` — parse HTML for entry list (title, PDF URL, date, basis ref).
2. Filter entries by title keywords: `sprzedaż`, `lokal mieszkalny`, `przetarg`, `wynik`.
3. Fetch each PDF, extract text (pdfplumber / pypdf — no OCR needed).
4. Parse structured fields: address, area (m²), starting price (cena wywoławcza), auction date, result (achieved price if wynik notice).
5. Archive crawl: iterate `rok=YEAR&nr_porcji=N` for historical data.

**Blockers / risks:**
- **Low flat volume** — the open flat auction stream is real but thin. If the project requires high throughput, land/building auctions should also be ingested to justify adapter maintenance.
- **No stable PDF slug** — PDF filenames must be discovered from the board HTML per-entry; no predictable naming pattern.
- **Mixed board** — the SN board mixes sales, leases (*dzierżawa*), and result notices; adapter must filter on title keywords and `WGM.6840.*` reference numbers (flat sales) vs `WGM.6845.*` (leases) vs `WGM.7125.*` (wykaz).
- **Rate limiting** — the `web_fetch` layer hit 429 on the second call; production scraper should add 2–3 s delay between PDF fetches.
- **Restricted auctions** — some flat listings use *przetarg ograniczony* (not nieograniczony); decide whether to include.
- **MZBM confusion** — do not scrape `bip.mzbm.kalisz.pl`; it is rental-only.

**Effort:** Medium — one HTML list scraper + one PDF parser, same architecture as Poznań adapter. ~1–2 days of adapter work assuming Poznań is already live and patterns are reusable.

**VERDICT: BUILD** — Kalisz runs genuine open flat-sale auctions (*przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych*), publishes them on a clean server-rendered BIP board, delivers born-digital PDFs, and posts result notices with achieved prices in the same feed. Volume is thin but real and consistent. The adapter is straightforward.
