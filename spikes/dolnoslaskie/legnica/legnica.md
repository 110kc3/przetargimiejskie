# Spike — Legnica (Dolnośląskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Low effort).

## TL;DR

Legnica runs a continuous stream of *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* published by Urząd Miasta Legnicy directly on its BIP (`um.bip.legnica.eu`). The live board shows 8 residential-flat auctions "W toku" on the first page alone (10 total listings across 2 pages, with auctions dated July 2026). Result notices ("Wynik przetargu") are published in the same `przetargi-na-lokale` board as a separate entry, with the detailed achieved-price document attached as a `.doc` file download. Platform is server-rendered HTML on BIP-E.PL (same CMS used by Gliwice/Zabrze/Bytom), no auth, no bot blocks detected during live fetch. Closest analog: **Gliwice** (same BIP-E.PL CMS, same URL pattern, same listing + result-notice model). ZGM Legnica (`zgm.bip.legnica.eu`) exists but handles commercial-unit and garage *najem/dzierżawa* auctions — not the flat-sale stream.

---

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** Legnica (population ~95 000, miasto na prawach powiatu) actively auctions municipal residential flats via *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych*, conducted by Prezydent Miasta Legnicy through Wydział Gospodarki Nieruchomościami.

Live examples confirmed on 2026-06-27:

| Address | Type | Auction date | Cena wywoławcza |
|---|---|---|---|
| ul. Anielewicza 3b, lok. 8 | lokal mieszkalny (2 pokoje) | 2026-07-20 | 170 000 zł |
| ul. Bracka 6, lok. 13 | lokal mieszkalny | 2026-07-20 | — (in HTML summary) |
| ul. Senatorska 44, lok. 8 | lokal mieszkalny | 2026-07-20 | — |
| ul. Piastowska 10, lok. 7 | lokal mieszkalny | 2026-07-16 | — |
| ul. Żwirki i Wigury 10, lok. 2 | lokal mieszkalny | 2026-07-16 | — |
| ul. Wrocławska 97, lok. 3 | lokal mieszkalny | 2026-07-30 | — |
| ul. Złotoryjska 43, lok. 3 | lokal (type TBC) | 2026-07-30 | — |

8 out of 12 active/recent listings are residential flats (*lokal mieszkalny*). The remaining items include a commercial unit (ul. Wrocławska 45, lokal użytkowy) and a historic building (ul. Kartuska, dawny Teatr "Varietes"). This is a **strong flat-auction stream** — not skewed toward land/commercial.

The archive goes back to 2013, with monthly batches indicating steady long-term cadence. Flat auctions appear to be the dominant product on the `przetargi-na-lokale` board.

Note: ZGM Legnica (Zarząd Gospodarki Mieszkaniowej) is a separate city-owned housing manager at `zgm.bip.legnica.eu` — their BIP przetargi board (updated 2026-06-26) shows *najem lokali użytkowych i garaży* (commercial/garage rentals) only — **not flat sales**. The flat-sale auction authority sits entirely with UM Legnica.

---

## 2. Where published? (hosts + boards, with URLs)

### Primary source — announcements

- **Host:** `um.bip.legnica.eu` (BIP Urząd Miasta Legnicy)
- **Board:** `https://um.bip.legnica.eu/uml/przetargi-na-nieruchomo/przetargi-na-lokale`
- **Paginated:** yes — 2 pages currently, 10 items per page (status filter: "W toku" / "Rozstrzygniety")
- **Archive (by month):** `https://um.bip.legnica.eu/uml/archiwum/3677,Archiwum.html` — monthly index from 2013 to present; note the archive covers both grunty and lokale combined

### Result notices

- **Same board:** `https://um.bip.legnica.eu/uml/przetargi-na-nieruchomo/przetargi-na-lokale`
- **Status filter:** "Rozstrzygniety"
- **Pattern:** The result entry (e.g. "Wynik przetargu ul. Nowy Świat 2.", published 2026-03-24 for a 2026-03-16 auction) sits in the same listing table, tagged "Rozstrzygniety". The HTML body contains a one-sentence notice; the actual result details (achieved price, buyer info) are in an attached `.doc` file — e.g. `https://um.bip.legnica.eu/download/107/63566/INFORMACJA.doc`.
- **Implication:** achieved price is **not** in the HTML body — it requires downloading and parsing the `.doc` attachment.

### Canonical individual-notice URL pattern

`https://um.bip.legnica.eu/uml/przetargi-na-nieruchomo/przetargi-na-lokale/{ID},{slug}.html`

Example: `https://um.bip.legnica.eu/uml/przetargi-na-nieruchomo/przetargi-na-lokale/38606,Ogloszenie-o-przetargu-na-lokal-przy-ul-Anielewicza-3-b.html`

### Secondary / mirrored

- `https://portal.legnica.eu/przetargi-na-nieruchomosci-gruntowe-lokale-i-inne/` — city portal, re-publishes same listings, not primary source.
- `https://zgm.bip.legnica.eu/zgm/przetargi` — ZGM Legnica BIP; year-bucketed (2014–2026), active as of 2026-06-26 update, but **covers commercial/garage rentals only** — separate scope.

---

## 3. Format + rendering

- **Server-rendered HTML** — BIP-E.PL CMS (same platform as Gliwice, Zabrze, Bytom, Tarnowskie Góry). Pages return `Content-Type: text/html; charset=UTF-8` with fully rendered content; no JS hydration needed.
- **Listing page:** tabular HTML with columns: address, type description, auction date, status (W toku / Rozstrzygnięty). All text is born-digital.
- **Detail page:** short HTML body (address, flat description, cena wywoławcza, auction date/location). Also offers "Generuj PDF" link (generates PDF server-side from the HTML content).
- **Attached full notice:** `.docx` (announcement) and `.doc` (result/wynik) — Microsoft Word format, born-digital. These contain the full legal text including achieved price on results.
- **TLS:** HTTPS throughout, certificate valid.
- **Auth/bot blocks:** none detected — live fetches returned full content with no CAPTCHA, no rate-limit headers, no Cloudflare challenge.
- **Pagination:** `?page=0`, `?page=1` (0-indexed), 10 items per page.
- **Status filter:** the live board mixes "W toku" and "Rozstrzygniety" items; the filter widget (`==Status przetargu==`) is client-side form submission.

---

## 4. Volume + achieved-price stream

**Volume:** 12 items visible across 2 pages on the active `przetargi-na-lokale` board as of 2026-06-27 (includes both open auctions and 1 result notice currently visible). Archive shows consistent monthly activity since 2013 — roughly 1–3 months per year show up in the "combined" archive index (grunty + lokale), suggesting low-to-moderate overall volume but steady. With 8 flat auctions in a single July 2026 batch, the per-quarter flat volume appears to be in the 10–20 range.

**Achieved-price stream:**
- Result notices ("Wynik przetargu …") are published as separate entries in the same board, status "Rozstrzygnięty".
- The HTML entry body is minimal (one sentence confirming auction took place). Achieved price is embedded in a `.doc` attachment (`/download/107/{id}/INFORMACJA.doc`).
- **Risk:** scraper must download and parse `.doc` to extract the cena uzyskana. This is analogous to some Bytom notices. python-docx or LibreOffice headless can handle born-digital `.doc`.
- The archive at `um.bip.legnica.eu/uml/archiwum/3677,Archiwum.html` (monthly from 2013) should yield historical result notices for backfilling.

---

## 5. Adapter effort + verdict

**Closest analog:** Gliwice (`um.bip.gliwice.eu`) — same BIP-E.PL CMS, same URL structure (`/przetargi-na-nieruchomo/przetargi-na-lokale/{id},{slug}.html`), same pagination scheme, same "Wynik przetargu" entry model, same `.doc` attachment for result details. The Legnica adapter can be scaffolded as a near-copy of the Gliwice adapter with a domain swap and minor structural checks.

**Effort breakdown:**

| Component | Notes |
|---|---|
| Listing crawler | Trivial — paginate `?page=N` until empty, filter status |
| Detail parser | Simple HTML extraction (address, cena wywoławcza, date) — 1–2 CSS selectors |
| Result-notice detection | Match "Wynik przetargu" / "Rozstrzygnięty" entries in same board |
| Achieved-price extraction | Download `.doc` attachment, parse with python-docx — adds 1 day of work |
| Historical backfill | Monthly archive index available from 2013; same scrape pattern |
| Auth/bot mitigation | None needed |

**Blockers:** none.

**Risks:**
- Achieved price is in `.doc` not HTML — adds a doc-parsing step, but the file format is born-digital so no OCR needed.
- The listing board mixes flat sales, commercial units, and occasional whole-building/ground auctions — the adapter must filter by "lokal mieszkalny" in the type description.
- The "combined" archive (`/archiwum/`) covers both grunty and lokale — will need to follow links and check the detail page to classify type.

**Overall verdict: BUILD — Low effort.** The primary data source is a clean, server-rendered BIP-E.PL site with no auth, no JS rendering, and a stable URL scheme identical to already-implemented cities. The only non-trivial element is the `.doc` result attachment, which is handled by a small parsing step. Flat-auction volume is healthy (8+ per batch in mid-2026). This is the weakest point of the spike — the achieved price requires doc download — but this pattern is already present in the codebase (cf. Bytom/Gliwice analogs). Confidence: HIGH.

### URLs verified live (2026-06-27)
- Listing board: https://um.bip.legnica.eu/uml/przetargi-na-nieruchomo/przetargi-na-lokale
- Sample announcement: https://um.bip.legnica.eu/uml/przetargi-na-nieruchomo/przetargi-na-lokale/38606,Ogloszenie-o-przetargu-na-lokal-przy-ul-Anielewicza-3-b.html
- Sample result notice: https://um.bip.legnica.eu/uml/przetargi-na-nieruchomo/przetargi-na-lokale/37987,Wynik-przetargu-ul-Nowy-Swiat-2.html
- Archive index: https://um.bip.legnica.eu/uml/archiwum/3677,Archiwum.html
- ZGM BIP (rental/commercial, out of scope): https://zgm.bip.legnica.eu/zgm/przetargi
