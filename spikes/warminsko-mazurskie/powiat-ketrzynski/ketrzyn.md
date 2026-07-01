# Spike — Kętrzyn (Warmińsko-Mazurskie · powiat kętrzyński)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Low effort).

## TL;DR
Both Miasto Kętrzyn and Gmina Kętrzyn run *ustny przetarg nieograniczony na sprzedaż* for **lokale mieszkalne**. Two separate BIP hosts each publish a structured table of announcements + result PDFs. Format is HTML index + typed (non-scanned) PDF attachments. Volume is modest (~2–4 flat auctions/year per entity, ~4–8 combined). Achieved prices are available via "Informacja o wyniku przetargu" PDF attached to each entry. No auth/SPA blocks observed.

## 1. Sells municipal property at auction?
**YES — confirmed for both entities.**

- **Miasto Kętrzyn** (city): runs *ustny przetarg nieograniczony* for lokale mieszkalne regularly. Confirmed examples:
  - lokal nr 9 (21.20 m², ul. Adama Asnyka 5) — auction 2021-08-10, wynik Pozytywny
  - lokal nr 8 (38.75 m², ul. Marii Curie-Skłodowskiej 11) — auction 2021-06-17, wynik Pozytywny
  - lokal nr 1 (ul. Gen. Sikorskiego 72A) — auction 2025-11-21, wynik rozstrzygnięty
  - lokal nr 3 (12.6 m², ul. Chopina 7, cena wyw. 16 000 zł) — auction 2025-09-30, also announced for 2026-01-15
  - lokal nr 6 (ul. Kasztanowej 4, cena wyw. 155 000 zł) — 2025, wynik rozstrzygnięty
- **Gmina Kętrzyn** (rural): also runs *ustny przetarg nieograniczony* for lokale mieszkalne in villages:
  - lokal nr 2 (47.76 m², Kruszewiec 30, cena wyw. 100 000 zł)
  - lokal nr 1 (26.50 m², Nowa Wieś Kętrzyńska 8) — second auction (2023)

The city does NOT restrict sales exclusively to tenants (*bezprzetargowo*); open oral auctions are the primary mode for municipal flats.

## 2. Where published? (hosts + boards, URLs)

### Miasto Kętrzyn
- **Announcement board:** `https://bip.miastoketrzyn.pl/nieruchomosci/przetargi` (date-slug entries, e.g. `/20251103`, `/20251013`)
- **Przetargi aktualne:** `https://bip.miastoketrzyn.pl/przetargi/10006/status/`
- **Przetargi rozstrzygnięte:** `https://bip.miastoketrzyn.pl/przetargi/10006/status/1/`
- **Przetargi unieważnione:** `https://bip.miastoketrzyn.pl/przetargi/10006/status/2/`

### Gmina Kętrzyn
- **Przetargi aktualne:** `https://bip.gminaketrzyn.pl/przetargi/10001/status/`
- **Przetargi rozstrzygnięte:** `https://bip.gminaketrzyn.pl/przetargi/10001/status/1/`

### Wykazy nieruchomości (pre-auction property lists)
- `https://bip.miastoketrzyn.pl/wykaz-nieruchomosci/` — lists individual properties before formal auction is scheduled (e.g. lokal nr 30, ul. Chrobrego 17A; lokal nr 1, ul. Sikorskiego 67A)

Both BIPs appear to be running the same CMS (eSesja/similar) given the URL path structure (`/przetargi/10006/status/`).

## 3. Format + rendering

- **Index pages:** HTML tables with columns: Lp / Data ogłoszenia / Data i godzina przetargu / Dotyczy / Cena wywoławcza / Wynik / Załączniki. Rendered as plain HTML — no SPA, no auth, no JS-gating observed.
- **Announcement PDFs:** typed/digital PDF (not scanned), attached as "Treść ogłoszenia (PDF)". Size ~470–810 KiB — likely contains full legal text with property description, terms, wadium.
- **Result PDFs:** "Informacja o wyniku przetargu (PDF)" ~280–400 KiB — contains achieved price and buyer information.
- **Wykazy:** direct PDF links from `/wykazy_nieruchomosci/` slugs.
- No JSON API detected. No Captcha/bot blocks observed in search results or fetch attempts.
- web_fetch hit rate limits during this spike (429s) — retry interval needed in production scraper; underlying pages are standard HTTP.

## 4. Volume + achieved-price stream

- **Miasto Kętrzyn:** ~3–5 flat auctions/year visible (2021–2026 sample). Achieved prices available via "Informacja o wyniku przetargu" PDF on each settled entry. The HTML table shows "Wynik: Pozytywny/Negatywny" at the list level; actual price is in the PDF attachment.
- **Gmina Kętrzyn:** ~1–2 flat auctions/year (rural flats in villages like Kruszewiec, Nowa Wieś Kętrzyńska). Same PDF result structure.
- Combined volume: ~4–7 flat auctions/year across both entities.
- **Price stream:** present via PDF attachments — requires PDF text extraction per result entry. Not exposed in the HTML table directly.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Biskupiec, Bartoszyce, Mrągowo (same Warmińsko-Mazurskie BIP CMS pattern, `/przetargi/NNNNN/status/` structure).

**Effort breakdown:**
- Two scrapers (Miasto + Gmina), same CMS pattern — one scraper class covers both with different entity IDs.
- HTML index parsing: trivial (table rows, standard columns).
- PDF download + text extraction for achieved prices: needed but standard (pdfplumber/pdfminer; typed PDFs, not OCR).
- Deduplicate second/third auctions for same property.
- Rate-limit handling for BIP host (429s observed — add delay/retry).

**Blockers:** none hard. Rate limiting on BIP host is the only friction.

**Verdict: BUILD — Low effort.** Standard Warmia-Mazury BIP CMS. Two entities, both confirmed active with flat auctions. Achieved prices available in typed PDFs. ~4–7 events/year combined is modest but real signal.
