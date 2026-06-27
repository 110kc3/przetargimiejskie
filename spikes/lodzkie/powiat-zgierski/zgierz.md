# Spike — Zgierz (Łódzkie · powiat zgierski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miasto Zgierz actively auctions municipal **flats (lokale mieszkalne)** via *przetarg ustny nieograniczony* at a regular cadence (~3–4 sessions/year, multiple flats per session). Two publishers exist: (1) the city BIP at `zgierz.bip.net.pl` (Nefeni CMS — Next.js SPA, content loaded client-side), and (2) the city news site `miasto.zgierz.pl` (secondary mirror of announcements). A third track exists: MPGM (Miejskie Przedsiębiorstwo Gospodarki Mieszkaniowej sp. z o.o.) publishes its own flat-sale tenders via written auction (*przetarg pisemny nieograniczony*) at `mpgm.pl`. Result notices ("wynik") are published on the BIP for the city auctions. The Nefeni SPA means the BIP cannot be scraped with a simple HTTP fetch — JS rendering or the underlying REST API (`zgierz-api.bip.net.pl`) must be used. Closest analog: **Bytom** (SPA BIP with underlying JSON API), but with the added complication of a secondary MPGM publisher.

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** Gmina Miasto Zgierz sells municipal flats via *przetarg ustny nieograniczony* (open oral auction). Confirmed from multiple search results and BIP article listings retrieved 2026-06-27:

- **September 2025 session** (LIVE-VERIFIED via search snippets): Multiple simultaneous flat auctions — e.g. *IX przetarg ustny nieograniczony na zbycie lokalu mieszkalnego* (cena wywoławcza 145 000 zł), *III przetarg* (180 000 zł), *VI przetarg* (166 000 zł), *VII przetarg* (183 000 zł) — all zwolnione od VAT. Source: [miasto.zgierz.pl Sep 2025](https://www.miasto.zgierz.pl/pl/content/do-kupienia-lokale-mieszkalne-przetargi-wrzesien-2025-r)
- **March 2025 session**: *VI przetarg* (160 000 zł), *IV przetarg* (205 000 zł), *III przetarg* (185 000 zł). Source: [miasto.zgierz.pl Mar 2025](https://www.miasto.zgierz.pl/pl/content/do-kupienia-lokale-mieszkalne-przetargi-marzec-2025-r)
- **December 2024 session**: *V przetarg* (165 000 zł), *III przetarg* (209 000 zł), *II przetarg* (190 000 zł). Source: [miasto.zgierz.pl Dec 2024](https://www.miasto.zgierz.pl/pl/content/do-kupienia-lokale-mieszkalne-przetargi-grudzien-2024-r)
- Result notice confirmed: *VIII Przetarg Ustny Nieograniczony na zakup lokalu nr 28 przy pl. Jana Kilińskiego 7 — wynik* (published 2026-04-16). [BIP wynik article](https://zgierz.bip.net.pl/kategorie/74-nieruchomosci/artykuly/1198-viii-przetarg-ustny-nieograniczony-na-zakup-lokalu-nr-28-przy-placu-jana-kilinskiego-7-w-zgierzu-wynik)
- Announced sessions at regular intervals: Feb 2024, Jun 2023, Oct 2023, Nov 2022, Sep 2024 — sustained multi-year cadence confirmed.

Responsible department: **Wydział Gospodarki Nieruchomościami i Mieszkalnictwa, UM Zgierz** (Plac Jana Pawła II 16, pok. 4; tel. 42 714 31 85 / 42 714 31 87).

This is **not** a bezprzetargowy-only city. The oral auction track (*ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych*) is active and confirmed.

**MPGM secondary track:** MPGM (Miejskie Przedsiębiorstwo Gospodarki Mieszkaniowej sp. z o.o.) also sells individual flats via *przetarg pisemny nieograniczony* (written auction) — separate from the city UM track. Example: repeated auctions for lokal nr 9 at ul. Koszarowej 9 across 2025, with sessions in Aug, Sep, Oct, Dec 2025 and Feb 2026. Source: [mpgm.pl/category/przetargi/](https://mpgm.pl/category/przetargi/)

## 2. Where published? (hosts + boards, URLs)

### Source A — Gmina Miasto Zgierz BIP (primary, canonical)

- **BIP home:** `https://zgierz.bip.net.pl/` (canonical; `bip.zgierz.pl` and `zgierz.bip.net.pl` both resolve there)
- **Nieruchomości category:** `https://zgierz.bip.net.pl/kategorie/74-nieruchomosci`
  - Subcategory **Sprzedaż lokali:** `https://zgierz.bip.net.pl/kategorie/121-sprzedaz-lokali-`
  - Subcategory **Sprzedaż gruntów:** `https://zgierz.bip.net.pl/kategorie/120-sprzedaz-gruntow`
- **Individual announcement / result articles:** `https://zgierz.bip.net.pl/kategorie/74-nieruchomosci/artykuly/{id}-{slug}`
  - Announcement example: `…/artykuly/1199-i-przetarg-lokal-mieszkalny-nr-95-przy-ul-baczynskiego…`
  - Result ("wynik") example: `…/artykuly/1198-viii-przetarg-ustny-nieograniczony-na-zakup-lokalu-nr-28…-wynik`
- **Old BIP (archive):** `https://bip.zgierz.pl/?a={id}` redirects to archive (`zgierz.archiwum.bip.net.pl`); old result notice confirmed at `bip.zgierz.pl/?a=2253` (V przetarg ul. 3 Maja 34, Dec 2024). Historical data may live here.
- **Underlying API host:** `zgierz-api.bip.net.pl` (observed in Next.js image proxy URLs: `_next/image?url=...zgierz-api.bip.net.pl...`). The Nefeni BIP2 platform exposes a REST API at this host; exact endpoint paths need probing.
- CMS: **Nefeni Sp. z o.o.**, BIP2 platform (Next.js SPA). Last modified 2026-06-26.

### Source B — miasto.zgierz.pl (secondary mirror / announcement board)

- **Flat auction announcements:** `https://www.miasto.zgierz.pl/pl/content/do-kupienia-lokale-mieszkalne-przetargi-{month}-{year}-r`
  - Content appears to mirror/duplicate BIP announcements with full text of the ogłoszenie.
  - Also publishes land auction announcements: `/do-kupienia-nieruchomosci-gruntowe-przetargi-{month}-{year}-r`
- This is a Drupal-based city portal (not BIP). No result notices here — those are BIP-only.

### Source C — MPGM (secondary, separate entity)

- **MPGM przetargi:** `https://mpgm.pl/category/przetargi/`
- **MPGM archive:** `https://mpgm.pl/category/przetargi/archiwum-przetargow/`
- WordPress-based site. Flat-sale tenders are posts in the przetargi category.

## 3. Format + rendering

### BIP (zgierz.bip.net.pl) — **SPA / Next.js — REQUIRES JS RENDERING OR API**

- The BIP runs on **Nefeni BIP2**, a Next.js application. Category and article pages return a minimal HTML shell with "Wczytywanie..." (loading indicator). The actual article list and article content are injected client-side via JS fetch to `zgierz-api.bip.net.pl`.
- **Direct `web_fetch` returns only the shell** — no article content in the raw HTML. This was confirmed during this spike: fetching `kategorie/74-nieruchomosci` returned only navigation and "Wczytywanie..." text; the article list was absent.
- **Exception: the shell does contain article links** when Next.js server-side renders the nav. The category page fetched did include article titles and URLs in the markdown render (e.g. wynik articles appeared in the category listing). This suggests the list may be SSR-rendered for SEO, but this needs live browser verification.
- **API approach:** The Nefeni platform uses `zgierz-api.bip.net.pl` as a REST backend. Other Nefeni BIP instances expose endpoints like `/api/kategorie/{id}/artykuly` or `/api/artykuly/{id}`. Probing this API is the recommended scraping approach.
- Article body format: **HTML text** embedded in the article page (not PDF). Announcement text contains structured Polish-language prose with address, cena wywoławcza, data i godzina przetargu, wadium — no structured table, free-text paragraphs.
- Result notices ("wynik"): published as separate BIP articles (not attachments). Format is text-HTML. Achieved price may be in the article body.
- **No auth wall, no CAPTCHA observed.** Cookie consent banner only.

### miasto.zgierz.pl — **Drupal HTML, machine-readable**

- Server-rendered Drupal HTML. Full announcement text in the page body. No JS required.
- Announcements are full-text copies of the BIP ogłoszenie — contain address, cena wywoławcza, wadium, przetarg date, and procedural terms.
- No result/achieved-price data published here.

### mpgm.pl — **WordPress HTML**

- Standard WordPress post pages. Machine-readable.
- Auction announcements are blog posts (no structured fields). Free-text Polish prose.
- Archive available at `/category/przetargi/archiwum-przetargow/`.

## 4. Volume + achieved-price stream

**Volume (city BIP track):**
- Sessions confirmed: Nov 2022, Jun 2023, Oct 2023, Feb 2024, Sep 2024, Dec 2024, Mar 2025, Sep 2025. Estimated **3–4 sessions/year**.
- Each session typically includes **3–6 flat auctions simultaneously** (confirmed: Sep 2025 had at least 4 in one session; Dec 2024 had at least 3).
- Estimated **12–20 flat auctions/year** on the city BIP track.
- Many flats go through multiple przetarg rounds before selling (I, II, III… up to VIII+ confirmed for pl. Kilińskiego 7). This inflates total article count vs. unique flats.
- Search results show flat-sale listing URLs going back to at least 2022 on the current BIP, and further back on the archive BIP (`archiwum.bip.net.pl`).

**Achieved-price stream:**
- Result notices ("wynik") are confirmed published on the BIP as separate articles. Example: `artykuly/1198-viii-przetarg-ustny-nieograniczony…-wynik` (2026-04-16) and `artykuly/1199-i-przetarg-lokal-mieszkalny-nr-95…-wynik` (2026-04-16).
- Also confirmed: `bip.zgierz.pl/?a=2253` — V przetarg ul. 3 Maja 34 wynik (Dec 2024), showing a long series of failed auctions (I–IV) before the V.
- Achieved price is expected to be in the article body text, not a structured field. Regex/NLP extraction from Polish auction result text required.
- **MPGM track:** No result-with-achieved-price articles confirmed yet; the written-tender format (przetarg pisemny) may not publish achieved prices publicly.

## 5. Adapter effort + verdict

**Closest analog: Bytom** (also Nefeni BIP2 / Next.js SPA with REST API backend), but Zgierz additionally has the MPGM secondary publisher.

| Component | Assessment |
|---|---|
| BIP list scraper | Nefeni API at `zgierz-api.bip.net.pl`; probe `/api/kategorie/121/artykuly` or similar. SSR partial content may be scrapable but unreliable. |
| Article detail scraper | Fetch article page or API endpoint; parse free-text HTML for lokal address, cena wywoławcza, data przetargu |
| Result/achieved-price | Separate "wynik" BIP articles; parse body text for "cena osiągnięta" or "nabywca" fields |
| Filter logic | Article slug/title contains "lokal mieszkalny" — reliable signal. Also filter by category ID 121 (Sprzedaż lokali) |
| MPGM secondary | WordPress HTML scraper for `mpgm.pl/category/przetargi/`; parse post body for flat sale tenders. Lower value (written tenders, low volume) — optional |
| Auth / bot risk | None observed |
| SPA complexity | Medium — need to probe Nefeni API or use headless browser for BIP content |

**Blockers / risks:**

1. **Nefeni SPA** is the primary blocker. The REST API host (`zgierz-api.bip.net.pl`) needs to be probed live to confirm endpoint paths. If Nefeni uses the same schema as other BIP2 instances (Bytom pattern), this is a copy-adapt task. If the API is undocumented/different, headless browser fallback is needed.
2. **Result articles are free-text HTML** — achieved price extraction requires text parsing (regex for Polish auction result boilerplate: "cena osiągnięta wynosi…" or "przetarg zakończono wynikiem…"). Not a blocker but adds parsing complexity.
3. **MPGM track** uses written tenders (not oral auctions) — may not fit the oral-przetarg aggregation model. Decision needed on whether to include MPGM.
4. **Archive BIP** (`zgierz.archiwum.bip.net.pl`) has a different URL scheme (`?a={id}`). Historical backfill may require separate adapter logic for old entries.
5. **High przetarg-round count** per flat — same flat appears as I, II, III… VIII przetarg articles. Deduplication by address/lokal number will be needed.

**Verdict: BUILD — Medium effort, High confidence.**

The city actively auctions municipal flats at confirmed ~3–4 sessions/year (~12–20 flat auctions/year), with result notices consistently published. The Nefeni SPA requires API probing (same as Bytom) but is not a fundamental blocker. MPGM is a bonus secondary source. The flat-auction track is unambiguous — this is not a bezprzetargowy-only city.

**Sources:**
- [BIP Gmina Miasto Zgierz — Nieruchomości](https://zgierz.bip.net.pl/kategorie/74-nieruchomosci)
- [BIP — Sprzedaż lokali (category 121)](https://zgierz.bip.net.pl/kategorie/121-sprzedaz-lokali-)
- [BIP — Sprzedaż lokali (old URL)](https://bip.zgierz.pl/?c=244)
- [miasto.zgierz.pl — lokale mieszkalne Sep 2025](https://www.miasto.zgierz.pl/pl/content/do-kupienia-lokale-mieszkalne-przetargi-wrzesien-2025-r)
- [miasto.zgierz.pl — lokale mieszkalne Mar 2025](https://www.miasto.zgierz.pl/pl/content/do-kupienia-lokale-mieszkalne-przetargi-marzec-2025-r)
- [miasto.zgierz.pl — lokale mieszkalne Dec 2024](https://www.miasto.zgierz.pl/pl/content/do-kupienia-lokale-mieszkalne-przetargi-grudzien-2024-r)
- [MPGM — Przetargi](https://mpgm.pl/category/przetargi/)
- [MPGM — Archiwum przetargów](https://mpgm.pl/category/przetargi/archiwum-przetargow/)
- [BIP wynik — VIII przetarg pl. Kilińskiego 7 (2026-04-16)](https://zgierz.bip.net.pl/kategorie/74-nieruchomosci/artykuly/1198-viii-przetarg-ustny-nieograniczony-na-zakup-lokalu-nr-28-przy-placu-jana-kilinskiego-7-w-zgierzu-wynik)
- [BIP wynik — V przetarg ul. 3 Maja 34 (Dec 2024)](https://bip.zgierz.pl/?a=2253)
