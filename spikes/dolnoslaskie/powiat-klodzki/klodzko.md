# Spike — Kłodzko (Dolnośląskie · powiat kłodzki)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miejska Kłodzko actively sells municipal flats at **ustny przetarg nieograniczony**. The Burmistrz publishes both announcements and result notices (with achieved price) in a single BIP category at `um.bip.klodzko.pl`. The housing manager is **ZAMG** (Zakład Administracji Mieszkaniami Gminnymi Gminy Miejskiej Kłodzko Sp. z o.o.), but auctions are run and published by the city hall directly. Pages are rendered as plain HTML with inline text — no PDF, no SPA, no auth wall. Volume is low-to-moderate (~4–10 flats/year). Closest analog: **bytom** (single BIP, city hall publishes both notice + result in same category, low volume).

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** As of 2026-06-27 the active listing page (`um.bip.klodzko.pl/index.php?n=i&sort=1&menu=346`) shows 4 current items, including:

- *"Burmistrz Miasta Kłodzka ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego zlokalizowanego w Kłodzku przy ul. A. Mickiewicza 3/2, pow. 44,90 m2"*
- *"Burmistrz Miasta Kłodzka ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego zokalizowanego w Kłodzku przy ul. Wojska Polskiego 8/1, pow. 76,95 m2"*

The third entry is a non-residential lokal (przeznaczenie inne niż mieszkalny) and one is a zabudowana nieruchomość (built land plot). So the mix is flats + other; flats are clearly present and frequent.

Historical examples confirmed by search:
- ul. Waleriana Łukasińskiego 51 m. 3 (27,97 m²) — I przetarg 2021
- ul. dr Janusza Korczaka 49 — II przetarg ustny nieograniczony
- ul. Stefana Okrzei 26/II m. 19 (24,81 m²) — cena wywoławcza 84 000 zł
- ul. Świętego Wojciecha 17/II m. 8 (37,10 m²) — cena wywoławcza 105 000 zł
- ul. Czeska 32 — pustostan, I przetarg
- ul. Romualda Traugutta 5/1 (111,59 m²) — I przetarg, sold April 2025 for 282 800 zł

**No bezprzetargowy-only pattern detected.** The city does not appear to restrict flat sales to tenants only; it runs open oral auctions.

## 2. Where published? (hosts + boards, URLs)

**Single source: Urząd Miasta w Kłodzku BIP**

| Purpose | URL |
|---|---|
| Listing board (active) | https://um.bip.klodzko.pl/index.php?n=i&sort=1&menu=346 |
| Listing board (sort by date) | https://um.bip.klodzko.pl/index.php?n=i&sort=1&menu=346 |
| Archive board | https://um.bip.klodzko.pl/index.php?n=i&menu=346&arch=1 |
| Individual item (announcement) | https://um.bip.klodzko.pl/index.php?n=i&id={ID}&akcja=info&menu=346 |
| Result notice example (April 2025) | https://um.bip.klodzko.pl/index.php?n=i&id=16332&akcja=info&menu=346 |
| Wykazy nieruchomości (pre-auction lists) | https://um.bip.klodzko.pl/index.php?n=i&menu=348 |

**Key point:** Result notices ("INFORMACJA BURMISTRZA O WYNIKU PRZETARGU") are published in the **same BIP category** (menu=346) as announcements, not a separate board. The `id` parameter is a monotonically increasing integer — scraping by incrementing IDs or walking the listing page is feasible.

**ZAMG BIP** (housing manager) has its own BIP at `zamg.bip.klodzko.pl` and website at `zamg.klodzko.pl`, but it does **not** publish auction notices — that is exclusively the city hall BIP's role. ZAMG is mentioned in announcement text as the building manager/contact (tel. 74 647 21 37).

**Secondary aggregators** (for cross-check only, not primary source):
- https://listaprzetargow.pl/oferty/9038-przetarg-mieszkanie-klodzko-dolnoslaskie
- https://monitorurzedowy.pl/announcement/1644047/przetarg-gn6840562024np
- https://dkl24.pl (local news site, occasionally reposts BIP extracts)

## 3. Format + rendering

**LIVE-VERIFIED — plain HTML, inline text, no auth.**

- The BIP runs on a custom PHP CMS (url pattern: `index.php?n=i&menu=346&akcja=info&id=NNN`).
- Announcement content is rendered as inline HTML text in `<main>` — fully readable by `get_page_text` / HTTP GET with no JS required.
- Each listing page contains the full announcement body: address, area (m²), cena wywoławcza, wadium, auction date/location, legal descriptions.
- Result notices contain: data przetargu, rodzaj przetargu, dane nieruchomości, liczba uczestników, cena wywoławcza, nabywca (name), **cena nabycia** (achieved price).
- PDFs exist as "pliki powiązane" attachments (~280 KB for result notice, ~2.5 MB for announcement) but are **supplemental** — the full text is also in the HTML body. No OCR needed.
- **No bot block observed** — Chrome MCP fetched pages successfully on first attempt. Standard `requests` + `BeautifulSoup` scrape should work.
- No login, no CAPTCHA, no SPA (no JS rendering needed).
- No pagination on active board (currently 4 items); archive board URL pattern confirmed (`arch=1` param) but returned empty on direct web_fetch (possibly JS-dependent tab switch, but Chrome MCP handles it).

## 4. Volume + achieved-price stream

**Volume estimate: LOW-MODERATE (~5–10 flat auctions/year)**

- Active board on 2026-06-27: 4 items total, 2 of which are lokale mieszkalne.
- Search evidence confirms flat auctions in 2021, 2022, 2023, 2024, 2025 — consistent annual activity.
- Result notice confirmed for April 2025 (ul. Traugutta 5/1, 282 800 zł achieved).
- Earlier result notices confirmed by search snippet (ul. Wandy 3/9, 15,73 m², May 2024).
- Cena wywoławcza range observed: 50 000 – 280 000 zł; achieved prices typically close to or slightly above cena wywoławcza (Traugutta: +1%).
- Both announcements and results are in the same category (menu=346) — **achieved price is scrapable** from result-notice HTML without any secondary source.

**Achieved-price data: YES, inline in BIP HTML result notices.**

## 5. Adapter effort + verdict

**Closest analog: bytom** — single city-hall BIP, both announcement and result in one category, low-moderate volume, plain HTML.

**Adapter design:**
1. `GET https://um.bip.klodzko.pl/index.php?n=i&sort=1&menu=346` → parse listing; extract `id` params from item links.
2. For each `id`: `GET /index.php?n=i&id={id}&akcja=info&menu=346` → parse HTML body.
3. Classify as announcement vs. result notice by presence of "INFORMACJA O WYNIKU" in title.
4. Parse fields: address, area, cena_wywoławcza, data_przetargu, (for results) cena_nabycia, nabywca.
5. Archive sweep: `arch=1` param on listing — may need Chrome/Selenium if JS tab-switched; alternatively walk ID range from last known ID downward.

**Blockers / risks:**
- Archive listing tab (`arch=1`) may not work via plain HTTP — only Chrome MCP returned data in live tests; a Playwright/Selenium fallback for archive discovery may be needed.
- ID gaps (non-sequential items in menu=346 from land/commercial) require title-level classification — straightforward string match on "lokal mieszkalny".
- Volume is low (maybe 10–15 items/year including results + announcements), so no performance concern.
- No deduplication complexity: announcement IDs and result IDs are distinct.

**Effort: Medium** — the HTML is clean and the schema is consistent, but the archive access pattern needs one verification pass with a real HTTP client (or Playwright) before declaring full automation. The achieved-price stream is a bonus that most other cities don't expose in the same category.

**VERDICT: BUILD** — confirmed flat auctions, clean HTML BIP, result notices with cena nabycia in same board, no auth/bot wall, low-moderate volume, Medium effort.

---

**Sources verified LIVE (Chrome MCP, 2026-06-27):**
- https://um.bip.klodzko.pl/index.php?n=i&sort=1&menu=346 — active listing board
- https://um.bip.klodzko.pl/index.php?n=i&id=12507&akcja=info&menu=346 — announcement detail (Łukasińskiego 51/3)
- https://um.bip.klodzko.pl/index.php?n=i&id=16332&akcja=info&menu=346 — result notice (Traugutta 5/1, April 2025)

**DESK sources:**
- https://zamg.bip.klodzko.pl/ — ZAMG BIP (housing manager, no auction notices)
- https://www.zamg.klodzko.pl/ — ZAMG website
- https://listaprzetargow.pl/oferty/9038-przetarg-mieszkanie-klodzko-dolnoslaskie
