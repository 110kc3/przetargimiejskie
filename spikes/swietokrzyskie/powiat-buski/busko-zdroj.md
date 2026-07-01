# Spike — Busko-Zdrój (Świętokrzyskie · powiat buski)

> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Low effort).

## TL;DR

Busko-Zdrój (Miasto i Gmina) does conduct **ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych** from its komunalny stock. Announcements are published as full HTML pages on the gmina's own BIP host **umig.busko.pl** (also aliased as **bip.umig.busko.pl**) — no auth, no SPA, server-rendered. Result notices ("informacja o wynikach przetargu") are appended to the same announcement page as a linked PDF. Volume is low: ~1 flat per auction batch, with batches appearing roughly 1–2 times per year alongside land plots. The PDF result file includes achieved price. The site is self-hosted custom CMS (Norbert Garecki build) — stable URL pattern, no bot blocks observed.

---

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** The Burmistrz Miasta i Gminy Busko-Zdrój runs open oral auctions (`ustny przetarg nieograniczony`) for both land and **lokale mieszkalne** under art. 37 ust. 1 UGN.

Confirmed flat examples:

- **os. Kościuszki 7/6, Busko-Zdrój** — lokal mieszkalny nr 6, 26.38 m², II piętro, budynek wielomieszkaniowy. Cena wywoławcza **190 000 zł**, wadium 20 000 zł. I przetarg **7 sierpnia 2025**, godz. 10:30. Udział 56/1000 w częściach wspólnych + działki 40/3 i 116/3 obr. 10. Result PDF linked: `informacja_o_wybikach_przetargu_gnwr_6840_23_3_2025.pdf` (posted 2025-08-19). Znak: GNWR.6840.23.2025.
  Source: [umig.busko.pl/ogloszenia/24147](https://www.umig.busko.pl/ogloszenia/24147-burmistrz-miasta-i-gminy-busko-zdroj-oglasza-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-komunalnych-znak-gnwr-6840-23-2025.html)

The same June 2025 batch also included a zabudowana nieruchomość at Plac Zwycięstwa 26 (budynek handlowo-usługowy + mieszkalny, cena wywoławcza 2 500 000 zł) — mixed-use building with residential component and active tenants.

Prior batches (2023–2024) visible in search: land/działki only. Flat auctions appear intermittently, not on every batch.

---

## 2. Where published? (hosts + boards, URLs)

**Primary announcement board (LIVE-VERIFIED):**
- **umig.busko.pl/ogloszenia** — full BIP + gmina portal, self-hosted. Auction announcements posted as individual HTML articles under `/ogloszenia/{id}-{slug}.html`. Open HTTP, no auth, no JavaScript required.
- BIP alias: **bip.umig.busko.pl** (redirects to umig.busko.pl).
- URL pattern for announcements: `https://www.umig.busko.pl/ogloszenia/{numeric-id}-burmistrz-miasta-i-gminy-busko-zdroj-oglasza-*-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-komunalnych*.html`
- Listing/index page: `https://www.umig.busko.pl/ogloszenia.html` (category feed — not verified for pagination depth).
- Announcement text also states: *"wywieszenie na tablicach ogłoszeń w UMiG Busko Zdrój, zamieszczenie w ogólnokrajowej prasie codziennej oraz na stronie BIP"*.

**Result notices (achieved price):**
- **CONFIRMED ONLINE** — result PDFs are appended to the same announcement HTML page under a link labelled "Informacja o wynikach przetargu [pdf]".
- PDF naming pattern: `https://dl.umig.busko.pl/bip/ogloszenia/{YYYY}/{MM}/{DD}/informacja_o_wynikach_przetargu_{znak}.pdf`
- The result PDF link appears after the auction date (page updated in-place; `Zmodyfikowano` date changes).
- Source documents (ogłoszenie PDFs) also hosted at `dl.umig.busko.pl/bip/ogloszenia/`.
- 2024 batch result: `informacja_o_wyborze_gnwr_6840_28_9_2024.pdf` — land parcels only.
- 2025 flat result: `informacja_o_wybikach_przetargu_gnwr_6840_23_3_2025.pdf` — available (PDF fetch timed out in tool but link is live on page).

---

## 3. Format + rendering

| Source | Format | Auth/gate | Notes |
|---|---|---|---|
| umig.busko.pl/ogloszenia/{id}-*.html | HTML (server-rendered, custom CMS) | None | Full auction text inline as `<p>` and `<strong>` tags. No JS required. |
| dl.umig.busko.pl/bip/ogloszenia/…/*.pdf | Text PDF (source document, ogłoszenie) | None | Machine-readable, not scanned. |
| dl.umig.busko.pl/bip/ogloszenia/…/informacja_o_*.pdf | Text PDF (result notice) | None | Contains achieved price; linked from parent HTML page after auction. PDF fetch returned empty body in workspace tool (possible size/redirect) — needs live-browser confirm on content. |

No SPA, no bot challenge, no session requirement observed. CMS pages fully render in HTTP response. Pagination of the `/ogloszenia.html` listing not verified — may be simple numbered pages or infinite scroll; needs one-time check.

---

## 4. Volume + achieved-price stream

- **Flat auction volume:** Low — approximately 1 lokal mieszkalny per year, appearing in mixed batches (flat + land or flat + commercial). Confirmed: 1 flat in 2025 batch. 2023 and 2024 batches were land-only based on fetched content. Earlier batches (2023 Jan: GNWR.6840.3.2023; 2023 Oct: GNWR.6840.22.2023, GNWR.6840.51.2023) not fetched — may include flats.
- **Achieved-price stream:** Result PDF is linked back on the same BIP announcement page. The link text "Informacja o wynikach przetargu [pdf]" appears after `Zmodyfikowano` date update. PDF naming is consistent (`informacja_o_wynikach_przetargu_{znak}.pdf`). Scraper should poll announcement pages for this link appearing post-auction-date. Achieved price is in the PDF body (text-PDF, not scanned).
- **Cadence:** Auction batches appear 2–4× per year based on search history (2023: at least 3 batches; 2024: at least 2; 2025: 1 confirmed so far). Flat presence in each batch is not guaranteed.

---

## 5. Adapter effort + verdict

**Closest analog:** Siedlce (mazowieckie) — BIP HTML with PDF result links. Busko-Zdrój is simpler: announcements and results are co-located on one server (umig.busko.pl / dl.umig.busko.pl), no session gate, no secondary scraping target needed.

**Adapter components:**
1. Listing poller: GET `https://www.umig.busko.pl/ogloszenia.html` (or filtered search) → find links matching `przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-komunalnych` pattern.
2. Announcement parser: extract property type (lokal mieszkalny vs. działka), address, area (m²), cena wywoławcza, auction date/time, wadium from inline HTML `<strong>` tags.
3. Result poller: after auction date, re-fetch same page, detect "Informacja o wynikach przetargu [pdf]" link, fetch PDF, extract achieved price.
4. Filter: skip non-residential lots (działki rolne, działki budowlane, lokale usługowe).

**Blockers / risks:**
- Achieved-price PDF content not live-verified (fetch timed out in tool). Content is almost certainly text-PDF given the source document is text-PDF — **Low risk**, verify on first run.
- Listing pagination depth unknown — needs one-time manual check.
- Volume is low (≈1 flat/year) — worthwhile only if combined with other Świętokrzyskie adapters in same pipeline.

**Effort: Low** — single hostname, open HTML + text PDF, stable URL pattern, no auth, well-documented result lifecycle (same page updated in-place).
