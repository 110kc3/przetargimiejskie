# Spike — Będzin (Śląskie · powiat będziński)

> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Będzin sells municipal flats via *ustny przetarg nieograniczony* published on the city BIP (`bedzin.bip.info.pl`). MZBM Sp. z o.o. manages the housing stock and coordinates viewings but the sale przetargi are published directly by the Prezydent Miasta on the BIP. Volume: ~3–5 flat auctions/year. BIP delivers plain HTML with PHP query-string URLs; the index page is bot-accessible (LIVE-VERIFIED). Closest analog: **Tarnowskie Góry** (small-volume BIP-HTML adapter).

## 1. Sells municipal property at auction?

YES. Confirmed *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* (unrestricted oral auctions for flat sales):

- Lokal nr 16, ul. S. Małachowskiego 35, 61.96 m², 3 rooms — auction 30 Oct 2023
- Lokal nr 224, ul. S. Skalskiego 2, 52.72 m², 3 rooms, cena wywoławcza 185 311 zł, wadium 18 500 zł — auction 24 Apr 2024
- Lokal nr 44, ul. Kolejowa 26, 33.97 m², 1 room, — auction 5 Mar 2025

Housing manager **MZBM Sp. z o.o., ul. 1 Maja 2a, Będzin** (KRS 0000002882) is the communal housing administrator (coordinates viewings, `mzbm.bedzin.pl`), but does NOT publish flat-sale auctions — those go through the gmina BIP exclusively. MZBM's own "Przetargi" page lists only zamówienia publiczne (service procurement, last entry 2022), not flat sales.

Sales confirmed NOT purely bezprzetargowy — bezprzetargowa sprzedaż exists for some land/property but flat auctions are a separate, recurring stream.

Contact for auction info: Referat Nieruchomości UM Będzin, tel. (032) 267-91-36.

## 2. Where published? (hosts + boards, URLs)

**Announcement board (active):**
- `https://bedzin.bip.info.pl/index.php?idmp=450&r=r` — Przetargi Nieruchomości (current)
- `https://bedzin.bip.info.pl/index.php?idmp=943&r=r` — Ogłoszenia przetargowe (sub-section, flat auctions here)
- City portal mirror: `https://www.bedzin.pl/strona-250-przetargi_na_sprzedaz_mieszkan.html`

**Archive / result notices:**
- `https://bedzin.bip.info.pl/index.php?idmp=484&r=r` — Archiwum Przetargi Nieruchomości (6+ pages, post-auction notices incl. achieved prices)

**Individual document format:**
- `https://bedzin.bip.info.pl/dokument.php?iddok={ID}&idmp={section}&r=r`

No dedicated result-notice URL pattern isolated yet; results appear in the same BIP archive section mixed with pre-auction announcements.

## 3. Format + rendering

- **HTML** — plain server-rendered HTML via PHP query-string URLs (LIVE-VERIFIED on index page, idmp=450 fetched successfully)
- BIP platform: `bip.info.pl` (shared SaaS BIP provider used across many Polish gminas — same engine as several Silesian cities)
- Document links use `?iddok=NNNNN` incremental IDs; comma-format URLs (e.g. `index,idmp,450,r,r`) appear to be canonical slugs that redirect but return empty on direct web_fetch (may require JS or cookies for the comma-slug form)
- **No auth / bot block** on the index listing page (fetched clean HTML with table of announcements)
- No PDF, no OCR, no SPA — standard HTML table listing with title + date + doc link
- Individual documents likely HTML with inline text (one example confirmed via search engine snippet showing full auction details in plain text)

## 4. Volume + achieved-price stream

- Estimated ~3–5 flat auctions/year based on 3 confirmed auctions across 2023–2025 from search results + listaprzetargow.pl aggregator entries
- Archive section (idmp=484) has at least 6 paginated pages going back to 2021, mixing land and flat records
- Achieved-price notices: present in the BIP archive section per search results (DESK — not independently verified from a specific wynik document URL)
- Low-to-medium volume city (population ~57 000); comparable to Tarnowskie Góry in auction cadence
- ListaPrzetargow.pl indexes Będzin municipal flat auctions, confirming ongoing stream

## 5. Adapter effort + verdict (closest analog among gliwice/zabrze/bytom/tarnowskie-gory; blockers)

**Closest analog: Tarnowskie Góry** — small-volume, BIP-HTML, single-gmina publisher, same bip.info.pl SaaS engine likely.

**Adapter approach:**
1. Scrape listing page `idmp=450` (or `idmp=943` if flat-specific) — HTML table, paginated
2. Filter titles containing "lokal mieszkalny" / "OGŁOSZENIE O PRZETARGU NA SPRZEDAŻ LOKALU"
3. Fetch individual `dokument.php?iddok=N` pages — parse HTML for: address, area, rooms, cena wywoławcza, wadium, date/time of auction
4. Scrape archive `idmp=484` for result notices — look for "wynik przetargu" / "informacja o wyniku" to extract achieved price

**Blockers / risks:**
- Comma-slug URL format (`index,idmp,943,r,r`) returns empty on direct fetch — may need `?`-query-string equivalent or session cookie; low risk since `?idmp=` form works
- Result notices are mixed into the general archive with land entries — will need title-pattern filtering
- No structured data; all parsing is HTML text extraction
- Volume is low (3–5/year) — adapter is low-maintenance once built

**Effort: Medium** — BIP-HTML scraper is well-understood pattern, but result-notice linkage to original auction needs investigation (no explicit wyniki sub-section found; DESK risk).
