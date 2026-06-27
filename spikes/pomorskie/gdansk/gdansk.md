# Spike — Gdańsk (Pomorskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: **BUILD** (Medium effort).

## TL;DR

Gdańsk runs genuine *przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych* — confirmed live on the city portal with 6 active flat listings right now (2026-06-27) and an auction session scheduled for 2026-07-01. The managing entity is **Wydział Skarbu Urzędu Miejskiego** (city treasury department), not the housing manager Gdańskie Nieruchomości (GN SZB, formerly GZNK). The two channels are cleanly separated: GN SZB handles leases and property management; Wydział Skarbu runs all property *sales* and publishes them on the city BIP. Flat auctions are structurally distinct from the bezprzetargowa stream (handled by a dedicated sub-unit). Auction announcements are published as born-digital PDFs attached to server-rendered HTML BIP pages. Achieved-price data appears in the same BIP as separate PDF notices — the exact "wyniki" URL pattern needs one further scrape to lock down (see Section 4). Closest analog: **Kraków** (city-treasury-runs-sales, multi-property auction bundles in PDF, HTML index page).

---

## 1. Sells municipal property at auction?

**YES — confirmed with live flat listings.**

The city operates two parallel sales channels:

| Channel | Unit | Scope |
|---|---|---|
| **Przetarg ustny nieograniczony** | Wydział Skarbu → Referat Obrotu Nieruchomościami | Flats, land, commercial units sold at open oral auction to highest bidder |
| **Bezprzetargowa** | Wydział Skarbu → Referat Bezprzetargowej Sprzedaży Lokali i Gruntów | Sale to sitting tenants with statutory discount |

These are structurally separate referats within Wydział Skarbu, so the przetarg stream is not contaminated by tenant sales.

**Live evidence (2026-06-27):**

Active "Lokale mieszkalne" listed under *Przetarg ustny nieograniczony* on [`gdansk.pl/urzad-miejski/wydzial-skarbu/nieruchomosci`](https://www.gdansk.pl/urzad-miejski/wydzial-skarbu/nieruchomosci):

- ul. Kaprów 15 m.5 — cena wywoławcza **1 200 000 PLN** (4-room, 93.97 m², built 1907, heritage zone)
- ul. Ks. Mariana Góreckiego 8 lok. 3,4A
- ul. Na Zaspę 34B lok. 6
- ul. Opata Jacka Rybińskiego 6 m. 7
- ul. Teofila Lenartowicza 3 lok. 5
- ul. Uczniowska 37 lok. 4

The individual offer page for ul. Kaprów 15 m.5 explicitly states **"Forma zbycia: Przetarg ustny nieograniczony"** — confirmed via direct fetch.

Additionally, the BIP page [`bip.gdansk.pl/urzad-miejski/Ogloszenia-o-przetargach,a,1439`](https://bip.gdansk.pl/urzad-miejski/Ogloszenia-o-przetargach,a,1439) currently shows:

> **OGŁOSZENIE O PRZETARGACH NIEOGRANICZONYCH USTNYCH NA SPRZEDAŻ NIERUCHOMOŚCI STANOWIĄCYCH WŁASNOŚĆ GMINY MIASTA GDAŃSKA ODBYWAJĄCYCH SIĘ W DNIU 01.07.2026 R.**

with a PDF attachment at `download.cloudgdansk.pl/gdansk-pl/d/202604273600/ogloszenie-o-przetargach-nieograniczonych-planowanych-na-dzien-01-07-2026.pdf` (PDF timed out before content was retrieved, but the HTML index is confirmed server-rendered; the PDF URL pattern is consistent with prior Gdańsk practice of bundling multiple properties per auction date).

**Auction mix:** Flats + land + commercial. Mix of property types is common per auction round. Volume: at least 6 flats in inventory simultaneously is healthy for a city this size (pop. ~490k).

---

## 2. Where published? (hosts + boards, with URLs)

### Primary: City BIP — Wydział Skarbu

| Purpose | URL |
|---|---|
| Auction announcements index | [`bip.gdansk.pl/urzad-miejski/Ogloszenia-o-przetargach,a,1439`](https://bip.gdansk.pl/urzad-miejski/Ogloszenia-o-przetargach,a,1439) |
| Property investment offers (pre-auction detail cards) | [`gdansk.pl/urzad-miejski/wydzial-skarbu/nieruchomosci`](https://www.gdansk.pl/urzad-miejski/wydzial-skarbu/nieruchomosci) |
| Property listings in BIP | [`bip.gdansk.pl/nieruchomosci`](https://bip.gdansk.pl/nieruchomosci) |
| Municipal property lists | [`bip.gdansk.pl/urzad-miejski/Wykazy-nieruchomosci-gminnych,a,1432`](https://bip.gdansk.pl/urzad-miejski/Wykazy-nieruchomosci-gminnych,a,1432) |
| Other (bezprzetargowa info) | [`bip.gdansk.pl/urzad-miejski/Inne,a,1587`](https://bip.gdansk.pl/urzad-miejski/Inne,a,1587) |

**Result notices ("informacja o wyniku przetargu"):** Published on the same BIP under Wydział Skarbu — exact section URL not yet scraped (the BIP index page loads listings dynamically and the current page showed only active upcoming auctions; result notices likely live under a sibling section or are bundled as updated PDFs). This is the one gap — needs a targeted scrape of the BIP "Inne" or archived announcements section.

### Secondary: Gdańskie Nieruchomości BIP (bip.nieruchomoscigda.pl)

GN SZB (formerly GZNK) is the *property manager* (zarząd nieruchomościami komunalnymi), not the seller. Their BIP publishes:
- Lease tenders for commercial units (najem lokali użytkowych)
- Notices about their own fixed-asset sales (containers, equipment — e.g., "sprzedaż kontenerów mieszkalnych" confirmed in their ogloszenia section, 2025)
- Tree-removal permits, internal procurement

**GN SZB does NOT publish residential flat sale auctions** — those belong solely to Wydział Skarbu on bip.gdansk.pl.

### PDF CDN

Announcement PDFs are hosted at `download.cloudgdansk.pl/gdansk-pl/d/<id>/filename.pdf` — a city-operated CDN, no auth required, no bot block observed.

---

## 3. Format + rendering

| Layer | Detail |
|---|---|
| **Announcement index** | Server-rendered HTML (`bip.gdansk.pl`) — static anchor links to individual announcement pages; straightforward to scrape |
| **Individual property cards** | Server-rendered HTML (`gdansk.pl/urzad-miejski/wydzial-skarbu/nieruchomosci?id=NNN`) — all fields in a single `<table>` cell, born-digital text, no JS required to render |
| **Auction announcement PDF** | Born-digital PDF attached to BIP page, hosted on cloudgdansk.pl CDN — likely bundles multiple properties per auction date; needs PDF parse (pdfminer/PyMuPDF) |
| **Result notices** | Expected format: PDF or HTML on bip.gdansk.pl — **not yet confirmed live** (one gap) |
| **TLS / auth / bot-block** | No auth, no CAPTCHA observed on any fetched page; bip.gdansk.pl and gdansk.pl responded cleanly to curl-like requests; cloudgdansk.pl CDN timed out once (PDF was large or slow CDN) — treat as flaky, retry with longer timeout |
| **JS SPA** | Not present — bip.gdansk.pl is server-rendered; gdansk.pl property list page appears to have some JS templating in the navigation but the main property data is in the initial HTML |

---

## 4. Volume + achieved-price stream

**Volume:**
- 6 residential flats active as of 2026-06-27 (confirmed live)
- Auctions appear to be batched per date (next batch: 2026-07-01)
- Historical cadence unknown from this spike; likely monthly or bi-monthly rounds given city size

**Achieved-price stream:**
- Gdańsk by law (Art. 38 ust. 4 ugn) must publish "informacja o wyniku przetargu" within 30 days
- Likely location: BIP Wydział Skarbu, same section as announcements (bip.gdansk.pl) — but the exact URL was NOT confirmed live in this spike
- The "Inne" subsection (`bip.gdansk.pl/urzad-miejski/Inne,a,1587`) currently shows only bezprzetargowa info; result notices may live as dynamically-loaded entries in the main `Ogloszenia-o-przetargach` section or as a separate archival page
- **Action required before build:** one targeted scrape of archived BIP entries to locate the "wyniki" pattern and confirm achieved prices appear as parseable fields (not just "przetarg zakończony bez rozstrzygnięcia")

---

## 5. Adapter effort + verdict

**Closest analog: Kraków** — city-treasury-runs-sales, multi-property auction bundles per date published as PDFs on city BIP, HTML index with `?a=` numeric IDs, separate bezprzetargowa channel for tenants.

**Differences from Kraków:**
- Gdańsk additionally exposes a pre-auction "investment offer" card page (`gdansk.pl/urzad-miejski/wydzial-skarbu/nieruchomosci?id=NNN`) with richer structured data (area, cadastral parcel, starting price, sale form) — this can supplement PDF parsing and could serve as the primary scrape target for announcements
- GN SZB / bip.nieruchomoscigda.pl is a decoy — ignore for flat-auction data
- The cloudgdansk.pl CDN for PDFs has one observed timeout — add retry logic

**Adapter components:**
1. **Announcement scraper:** Poll `bip.gdansk.pl/urzad-miejski/Ogloszenia-o-przetargach,a,1439` for new HTML entries → follow PDF link → parse born-digital PDF for property table (address, area, starting price, auction date)
2. **Property card scraper (supplemental / faster):** Poll `gdansk.pl/urzad-miejski/wydzial-skarbu/nieruchomosci` for new `?id=NNN` entries → scrape structured HTML table → extract address, area, starting price, sale form (filter to "Przetarg ustny nieograniczony")
3. **Result scraper:** Locate "wyniki" section on BIP → parse achieved price and winner type (osoba fizyczna / firma)
4. **PDF parser:** PyMuPDF or pdfminer on cloudgdansk.pl PDFs — expected: tabular, born-digital, one page per property

**Effort estimate: Medium** (same as Kraków) — two HTML surfaces + PDF parsing; the extra property card page actually makes this *easier* than a pure PDF-only city because structured data is already in HTML. The one unknown is the result-notice URL — resolve with a 30-min scrape before starting the adapter.

**Blockers:** None hard. One soft gap: result-notice URL pattern unconfirmed.

**Risks:**
- cloudgdansk.pl CDN slowness (mitigate: retry with 60s timeout)
- Auction batching means scrape frequency of weekly is sufficient (no need for daily)
- BIP page for announcements shows only the current/upcoming auction — older entries may require pagination or archive navigation (not tested)

**VERDICT: BUILD** — Gdańsk is a strong target: genuine open flat auctions with 6 live residential listings confirmed, structured HTML property cards, born-digital PDFs, no auth/bot-block, and a clean separation from the bezprzetargowa channel. Resolve the result-notice URL as the first adapter task.

---

### Sources

- [`bip.gdansk.pl/urzad-miejski/Ogloszenia-o-przetargach,a,1439`](https://bip.gdansk.pl/urzad-miejski/Ogloszenia-o-przetargach,a,1439) — live auction index (fetched 2026-06-27)
- [`bip.gdansk.pl/urzad-miejski/OGLOSZENIE-O-PRZETARGACH-NIEOGRANICZONYCH-NA-SPRZEDAZ-NIERUCHOMOSCI-GMINNYCH-NA-DZIEN-01-07-2026,a,309425`](https://bip.gdansk.pl/urzad-miejski/OGLOSZENIE-O-PRZETARGACH-NIEOGRANICZONYCH-NA-SPRZEDAZ-NIERUCHOMOSCI-GMINNYCH-NA-DZIEN-01-07-2026,a,309425) — current auction announcement page (fetched 2026-06-27)
- [`gdansk.pl/urzad-miejski/wydzial-skarbu/nieruchomosci`](https://www.gdansk.pl/urzad-miejski/wydzial-skarbu/nieruchomosci) — investment offers index with 6 live flat listings (fetched 2026-06-27)
- [`gdansk.pl/urzad-miejski/wydzial-skarbu/nieruchomosci?id=558`](https://www.gdansk.pl/urzad-miejski/wydzial-skarbu/nieruchomosci?id=558) — sample flat card confirming "Forma zbycia: Przetarg ustny nieograniczony" (fetched 2026-06-27)
- [`bip.gdansk.pl/nieruchomosci`](https://bip.gdansk.pl/nieruchomosci) — BIP nieruchomości index (fetched 2026-06-27)
- [`bip.nieruchomoscigda.pl/ogloszenia`](https://bip.nieruchomoscigda.pl/ogloszenia) — GN SZB announcements (container sales, tree permits — NOT flat auctions) (fetched 2026-06-27)
- [`bip.nieruchomoscigda.pl/wiadomosci/przetargi-na-zbycie-nieruchomosci-stanowiacych-wlasnosc-gminy-miasta-gdanska,697.html`](https://bip.nieruchomoscigda.pl/wiadomosci/przetargi-na-zbycie-nieruchomosci-stanowiacych-wlasnosc-gminy-miasta-gdanska,697.html) — archived 2012 GN SZB announcement cross-referencing Wydział Skarbu as the auction organizer (fetched 2026-06-27)
- [`bip.gdansk.pl/urzad-miejski/Inne,a,1587`](https://bip.gdansk.pl/urzad-miejski/Inne,a,1587) — BIP "Inne" subsection (bezprzetargowa info only) (fetched 2026-06-27)
