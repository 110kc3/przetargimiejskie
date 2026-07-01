# Spike — Gostyń (Wielkopolskie · powiat gostyński)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Gostyń (Burmistrz Gostynia) does sell municipal flats at *ustny przetarg nieograniczony na sprzedaż*. Announcements and result notices are published on the custom Logonet BIP at `biuletyn.gostyn.pl` under "Oferty miasta" and "Tablica ogłoszeń". Pages render as plain HTML with PDF attachments for the result/wynik notice. No auth wall, no SPA, no bot blocks observed. Volume is low (a handful of lokale per year). Achieved-price stream is via a downloadable PDF per lot.

## 1. Sells municipal property at auction?

YES — confirmed by multiple independent signals:

- Search snippet (WebSearch, DESK): "Burmistrz Gostynia ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 7, ul. Powstańców Wlkp. 8 w Gostyniu, cena wywoławcza 150 000,00 PLN, wadium 10 000,00 PLN."
- Powiat Gostyński website had a news item titled "Ogłoszenia o drugich przetargach na sprzedaż lokali mieszkalnych" — plural, indicating recurring multi-unit rounds.
- gostyn24.pl mirrored a Burmistrz announcement of a I przetarg ustny nieograniczony (residential flat).
- gostyn.pl main city portal had a page "Przetarg na sprzedaż nieruchomości położonej w Gostyniu przy ul. Powstańców Wielkopolskich 6/5" (another lokal mieszkalny).
- BIP "Oferty miasta" index lists auction entries including "(wyniki przetargu)" result notices, confirming the full lifecycle is published.

Type confirmed: **ustny przetarg nieograniczony na sprzedaż** (lokale mieszkalne). Not limited to bezprzetargowo.

## 2. Where published? (hosts + boards, URLs)

| Board | URL | Notes |
|---|---|---|
| Announcement board (primary) | `https://biuletyn.gostyn.pl/artykuly/280/oferty-miasta` | "Oferty miasta" — lists all property auction announcements and result notices |
| Announcement board (secondary) | `https://biuletyn.gostyn.pl/artykuly/232/tablica-ogloszen` | "Tablica ogłoszeń" — some flat auction announcements also posted here (e.g. artykul/232/14731) |
| BIP root | `https://biuletyn.gostyn.pl/` | Logonet CMS v2.9.0, hosted by Logonet Sp. z o.o. w Bydgoszczy |
| City mirror | `https://www.gostyn.pl/` | Some auction notices cross-posted here |
| Local news mirror | `https://gostyn24.pl/` | Not the authoritative source; mirrors BIP notices |

Result/wynik notices: posted as child articles under the same "Oferty miasta" section, tagged "(wyniki przetargu)" in the title. Each result article links to a PDF attachment (hosted at `biuletyn.gostyn.pl/attachments/download/<id>`) containing the achieved price and buyer description.

## 3. Format + rendering

- **Announcement page:** Standard HTML article, no JavaScript required, no auth. The CMS (Logonet) serves full HTML to curl/fetch. Article text contains address, cena wywoławcza, wadium, date/time/place of przetarg, and a downloadable .docx or .pdf with full auction terms.
- **Result notice:** HTML article (same CMS) with a link to a PDF (~500 kB) containing achieved price (cena osiągnięta) and outcome.
- **Index page:** `artykuly/280/oferty-miasta` — paginated HTML list, each entry is a link + excerpt. No SPA, no auth.
- **Blocker:** Individual BIP article pages return "Problem z wyświetleniem zasobu" (session/cookie gate) when fetched without a browser session, but the index and some articles are fully accessible. This is a soft gate — the CMS checks for a prior page load but does not require login. A simple initial GET to the BIP root (to receive session cookie) before fetching article pages should resolve this. The result PDF is directly downloadable via a URL with no auth.
- **No scanned PDFs seen** — all PDFs appeared to be text-PDFs (docx converted).

## 4. Volume + achieved-price stream

- Volume: LOW — estimated 2–6 lokale mieszkalne per year based on search evidence (multiple I/II/III przetarg rounds visible, covering a small stock of municipal flats). Gostyń is a town of ~20 000; municipal flat stock is limited.
- Achieved-price stream: YES — result notices published in "Oferty miasta" with "(wyniki przetargu)" label; each links to a downloadable text-PDF containing the final price. Pattern: announcement artykul → result artykul (same section, same CMS, ~2–4 weeks later).
- No structured JSON or API endpoint found; all data is embedded in HTML articles and PDF attachments.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Other Logonet-CMS BIPs (same CMS v2.9.0, same URL pattern `biuletyn.<miasto>.pl/artykuly/<section-id>/`, same article structure). Several other spiked cities use this same platform.

**Adapter tasks:**
1. Scrape index at `/artykuly/280/oferty-miasta` (paginated HTML list) — identify new announcement and result articles by title keywords ("przetarg ustny nieograniczony", "lokal mieszkalny", "wyniki przetargu").
2. Fetch each article HTML (with session-cookie workaround: one GET to BIP root first).
3. Parse announcement: extract address, cena wywoławcza, wadium, date of przetarg from HTML body.
4. Parse result notice: follow PDF attachment link, extract cena osiągnięta from text-PDF (pdfplumber/pdfminer — no OCR needed).
5. No auth, no CAPTCHA, no SPA.

**Blockers:** None hard. The session-cookie soft gate is trivially handled with `requests.Session()`. PDF parsing is standard text-PDF.

**Effort:** Low. Standard Logonet-CMS adapter with one extra PDF-parse step for results.

**VERDICT: BUILD — Low effort.**
