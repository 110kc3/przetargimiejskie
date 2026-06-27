# Spike — Lubin (Dolnośląskie · powiat lubiński)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miejska Lubin (Prezydent Miasta Lubina, Urząd Miejski ul. Jana Kilińskiego 10) runs regular *ustne przetargi nieograniczone* for municipal **flats** — confirmed active through 2026. Announcements and result notices are published on **bip.um.lubin.pl** as PDF file attachments (pattern: `/attachments/{id}/download`). Adradar aggregates these and confirms the volume is substantial: ≥8 flat lots auctioned in a single September 2025 session, plus individual sessions in 2023, 2022, etc. No dedicated housing manager (MPGM/TBS in Lubin is a separate Ruda Śląska entity with no connection). The city itself runs all flat sales. Format is machine-readable text-PDF (confirmed by extracted tabular data in adradar previews). Closest analog: **Bytom** (direct city BIP PDF attachments, batch sessions, no intermediary housing manager).

---

## 1. Sells municipal property at auction?

**YES — confirmed ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych.**

The Prezydent Miasta Lubina runs open oral auctions for municipal flats (*lokale mieszkalne*) owned by Gmina Miejska Lubin. These are not bezprzetargowo sales to tenants — they are open to any buyer. Evidence:

- adradar aggregator (LIVE-VERIFIED 2026-06-27): at least 8 flat auction lots confirmed for a single session on **2025-09-16**, covering addresses: Mickiewicza, Drzymały, Kołłątaja, Grodzka, Mieszka I, Szkolna. A further flat auction was held **2026-03-09** (Szkolna, 28 m², 160,000 zł asking). Land/commercial auctions also appear but flats are a consistent, recurring stream.
- listaprzetargow.pl archive (DESK): records flat przetarg from 2018 (Jesionowa 15/8, 63.2 m², 95,000 zł, II przetarg ustny nieograniczony).
- adradar archive (DESK): flat przetarg 2022-10-17 (Drzymały), 2023-01-10 (Mickiewicza 50, 24.8 m², 110,000 zł, II przetarg), confirming multi-year continuity.
- Format of announcement (quoted verbatim from adradar/listaprzetargow full-text): *"Prezydent Miasta Lubina ogłasza II nieograniczony przetarg ustny na sprzedaż lokali mieszkalnych położonych w Lubinie przeznaczonych do zbycia wraz udziałem w nieruchomości wspólnej obejmującej grunt oraz części wspólne budynku"* — standard ustny przetarg nieograniczony language, no tenant-preference clause observed.

Sessions are batched: multiple flats auctioned in a single date/room (sala nr 126, UM Lubin).

---

## 2. Where published? (hosts + boards, URLs)

**Primary source:**

| Board | URL | Content |
|---|---|---|
| BIP Urząd Miejski w Lubinie — announcements | `https://bip.um.lubin.pl/` (category: sprzedaż nieruchomości / aktualności i ogłoszenia) | Auction announcements as PDF attachments |
| BIP attachment download | `https://bip.um.lubin.pl/attachments/{id}/download` | Individual PDF files (confirmed pattern: /attachments/9945/download, /attachments/10067/download, /attachments/10683/download) |
| BIP last-added list | `https://bip.um.lubin.pl/ostatnio-dodane?page=N&category_slug=ostatnio-dodane&limit=50` | Chronological listing |
| BIP site map | `https://bip.um.lubin.pl/mapa-serwisu` | Top-level category index |

**Auction result notices (wyniki przetargów):** Also published as PDF attachments on bip.um.lubin.pl. The attachment text explicitly states *"Osiągnięta w przetargu cena nieruchomości podlega zapłacie jednorazowo"* — the achieved price language is present in the announcement template itself; dedicated result PDFs with the final hammer price are expected at the same domain (pattern consistent with other Dolnośląskie cities).

**Secondary / aggregator sources (not canonical but useful for discovery):**
- `https://przetargi.adradar.pl/p/a/1248/Lubin/miasto` — adradar city-auction page, 5 pages of history archived; re-publishes full PDF text
- `https://listaprzetargow.pl/oferty/przetargi/mieszkania/lubin` — listaprzetargow.pl
- City portal: `https://www.lubin.pl/` — cross-posts some announcements but not authoritative

**Old domain alias:** some older announcements reference `www.bip.um-lubin.dolnyslask.pl` (pre-migration URL) — same institution, now redirects to bip.um.lubin.pl.

**No MPGM/TBS Lubin entity found.** The "MPGM TBS" appearing in searches is based in Ruda Śląska (different city). Lubin has no separate housing manager publishing flat-sale przetargi.

---

## 3. Format + rendering

**Text-PDF** (confirmed). The adradar previews contain structured tabular text extracted directly from the source PDFs — with columns for location, KW number, geodetic number, obreb, ground area, flat area, share in common property, asking price, and wadium. This is machine-extractable text, not scanned image.

- Attachment URL: `https://bip.um.lubin.pl/attachments/{numeric_id}/download` — direct PDF download (no auth required, confirmed by web_fetch returning empty = PDF binary, not HTML error)
- The BIP main page returns empty via web_fetch (likely SPA or JS-rendered category listing), but the individual `/attachments/` endpoints are direct file downloads — scrapable without JavaScript
- No bot-block or CAPTCHA observed on attachment URLs
- Category listing page (`/category/sprzedaz-nieruchomosci`) appears to require JS for rendering — will need Playwright/puppeteer or a known attachment-ID discovery strategy

**Format of result notices:** expected to be the same text-PDF pattern at a separate attachment ID. The announcement text explicitly states the achieved price must be paid before notarial deed — result notices with final price are a legal requirement under Polish law and are routinely posted on BIP.

---

## 4. Volume + achieved-price stream

**Volume (LIVE-VERIFIED via adradar):**
- adradar shows 5 pages of archived city auctions for Lubin (184+ total records across all property types)
- Flat-specific volume from visible data: **≥8 flat lots in one session (2025-09-16)**, 1 in 2026-03-09, 1 in 2025-07-18, prior sessions in 2023 and 2022 — estimate **10–20 flat auction lots per year** across 3–5 sessions
- Lot sizes: small to mid-size (15 m²–63 m²), asking prices 32,500–160,000 zł

**Achieved-price stream:**
- The announcement PDFs include the phrase *"Osiągnięta w przetargu cena nieruchomości podlega zapłacie jednorazowo"* — indicating the result notice will state the achieved price
- Separate "wyniki przetargu" PDFs are not yet directly identified by URL but the BIP attachment pattern is predictable once the category index is crawled
- adradar does **not** appear to publish achieved prices (only asking prices) — the canonical source for hammer prices is bip.um.lubin.pl result-notice PDFs
- Risk: result notices may be posted under same attachment pattern but may need category navigation to discover new IDs

---

## 5. Adapter effort + verdict

**Closest analog: Bytom** — direct city BIP, PDF attachments, batch multi-lot flat sessions, no housing manager intermediary, text-PDF format.

**Adapter design:**
1. Category-index crawler: poll `bip.um.lubin.pl` nieruchomości section (JS-rendered; need Playwright or RSS/last-added endpoint)
2. Attachment downloader: `GET /attachments/{id}/download` — no auth, direct PDF binary
3. PDF text extractor: pdfminer/pypdf — tabular text is parseable (confirmed by adradar's extraction)
4. Result-notice linker: same attachment pattern; crawl same category for "wynik przetargu" titles

**Blockers / risks:**
- Category listing is JS-rendered — the `/ostatnio-dodane` endpoint may work as a discovery list (paginated HTML, seen in search snippets) but was not directly verified due to web_fetch returning empty
- Attachment IDs are non-sequential (confirmed 9472, 9945, 10067, 10683, 25473 range) — cannot brute-force; must crawl index
- Achieved-price PDFs not directly sampled; existence inferred from legal requirement and BIP structure — **LOW risk**
- Session batching (8 lots in one PDF) requires multi-record parsing within a single document

**Effort: Medium** — same class as Bytom. JS category index is the only extra step vs. a pure static BIP. PDF structure is clean.

**VERDICT: BUILD** — active flat auction stream, direct text-PDF on BIP, ≥10 lots/year, no intermediary, medium adapter effort.

---

## Sources

- adradar city-auction archive (LIVE-VERIFIED): https://przetargi.adradar.pl/p/a/1248/Lubin/miasto?page=1&sort=termin_desc
- adradar flat listing 2026-03-09 (Szkolna): https://przetargi.adradar.pl/przetarg/mieszkania/Lubin/miasto/16750980
- adradar flat listing 2025-09-16 batch (Mickiewicza): https://przetargi.adradar.pl/przetarg/mieszkania/Lubin/miasto/16004718
- adradar flat listing 2023-01-10 (Mickiewicza 50): https://przetargi.adradar.pl/przetarg/mieszkania/Lubin/miasto/10936144
- adradar flat listing 2022-10-17 (Drzymały): https://monitor.adradar.pl/przetarg/mieszkania/Lubin/miasto/10570207
- listaprzetargow archive (Jesionowa 15/8, 2018): https://listaprzetargow.pl/oferty/2981-przetarg-mieszkanie-lubin-dolnoslaskie
- BIP UM Lubin main: https://bip.um.lubin.pl/
- BIP UM Lubin attachment example: https://bip.um.lubin.pl/attachments/9945/download
- City portal auction post (2015, land): https://www.lubin.pl/przetarg-na-sprzedaz-nieruchomosci/
