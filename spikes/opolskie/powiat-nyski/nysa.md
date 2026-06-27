# Spike — Nysa (Opolskie · powiat nyski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Low effort).

## TL;DR

Gmina Nysa (Burmistrz Nysy) holds *ustne przetargi nieograniczone na sprzedaż lokali mieszkalnych* directly via its own BIP at **bip.nysa.pl**. Result notices including achieved prices are posted on the same BIP page as PDFs. The site renders as clean server-side HTML with PDF attachments — no SPA, no auth wall, no bot block encountered during live fetch. Volume is small-to-medium (handful of flats per year), directly comparable to Tarnowskie Góry / Bytom pattern. No separate housing manager (ZGK/TBS) is involved — the Urząd Miejski owns the pipeline end-to-end.

---

## 1. Sells municipal property at auction?

**YES — confirmed flat auctions (ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych).**

Live-verified examples:

- **ul. Moniuszki 1/27** (33.10 m², V piętro) — "kolejny przetarg ustny nieograniczony", auction 17-12-2024. Result: 5 bidders, cena wywoławcza 145 000 zł → **cena osiągnięta 165 000 zł**. Nabywca: Stanisława i Andrzej Szewczyk. Source: [BIP article ?a=8934](https://bip.nysa.pl/?a=8934) + result PDF [?p=document&action=show&id=23554](https://bip.nysa.pl/?p=document&action=show&id=23554&bar_id=8934).
- **ul. Moniuszki 4/10** (82.45 m², I piętro) — "I przetarg ustny nieograniczony", auction 15-05-2024. Result notice PDF attached. Source: [BIP article ?a=7800](https://bip.nysa.pl/?a=7800).
- Additional archived flats: ul. Krzywoustego, ul. Ligonia 1/3, ul. Armii Krajowej 2, ul. Prudnicka, ul. Mariackiej 21/3, Hajduki Nyskie 24 — visible in search index and BIP archive.

Auctions are announced by **Burmistrz Nysy** via Zarządzenie (e.g. Zarządzenie nr 1275/2026 and 1274/2026, May 2026 for upcoming rounds). No *bezprzetargowa* exclusivity on flats detected — the same BIP section covers both residential and land, and auctions appear to be the standard route for flats not sold to current tenants on prior rounds.

---

## 2. Where published? (hosts + boards, URLs)

| Channel | URL | Notes |
|---|---|---|
| BIP — active listings | https://bip.nysa.pl/?c=280 | "Sprzedaż, dzierżawa nieruchomości" — current/open auctions |
| BIP — archive | https://bip.nysa.pl/?c=318 | "Archiwum - sprzedaż" — completed auctions incl. result PDFs |
| Per-article pattern | `https://bip.nysa.pl/?a={id}` | Each flat gets its own article; attachments served via `?p=document&action=show&id={doc_id}&bar_id={art_id}` |
| City portal listing | https://www.nysa.eu/pl/dla-mieszkanca/wykaz-lokali-i-nieruchomosci-na-sprzedaz/ | Wykaz (property list) — secondary, links back to BIP |
| RSS | https://bip.nysa.pl/?p=new-articles&rss=1 | Full-site RSS; not filtered by category |

**No secondary portal** (e.g. platformazakupowa.pl) for flat auctions — those are procurement only. No Starostwo involvement for gmina flats (starostwo has its own BIP at bip.powiat.nysa.pl for county land).

Announcement board: announcements and results are on the same BIP article (result PDF appended after auction date). Result field is a structured PDF table with columns: data, opis nieruchomości, liczba osób dopuszczonych, cena wywoławcza, **cena osiągnięta w przetargu**, imię nabywcy.

---

## 3. Format + rendering

- **Listing page** (`?c=280`, `?c=318`): server-rendered HTML, article list. Straightforward `<ul>` of `<a>` links. LIVE-VERIFIED via web_fetch — no JavaScript rendering required, no auth.
- **Article page** (`?a={id}`): server-rendered HTML. Body text contains address, area, auction date. Attachments table links to PDFs. LIVE-VERIFIED.
- **Announcement attachment**: PDF (`?p=document&action=show&id={id}`) — typically 100–200 kB, text-PDF (born-digital, not scanned). LIVE-VERIFIED: fetched raw PDF bytes, extracted as plain text with full table structure intact.
- **Result attachment**: PDF (same pattern) — structured table, text-PDF. LIVE-VERIFIED: `Informacja o wyniku przetargu` fetched and parsed successfully as plain text.
- **No SPA / JS required.** No bot-block or CAPTCHA observed. No auth required.
- Engine: Sputnik Software BIP system (meta-author field). Same family as several other Polish BIPs.

---

## 4. Volume + achieved-price stream

- **Volume**: Small-to-medium. Search returns ~8–12 distinct flat auction articles across the archive (ul. Moniuszki, ul. Krzywoustego, ul. Ligonia, ul. Armii Krajowej, ul. Prudnicka, ul. Mariackiej, Hajduki Nyskie, Goświnowice, ul. Wróblewskiego area). Gmina Nysa is a mid-size town (~40k residents, significant municipal housing stock from communist era).
- **Cadence**: Multiple auction rounds per flat (I przetarg → kolejny przetarg) suggest turnover of ~3–8 flats per year actively auctioned.
- **Achieved-price stream**: Confirmed. Result PDF is uploaded to the same BIP article after the auction and contains a structured table with: starting price, achieved price, number of bidders, buyer name. Example: Moniuszki 1/27 → 145 000 → 165 000 zł (2024-12-17).
- **Data richness**: address, area (m²), floor, building type, land registry number (KW), auction date, starting price, achieved price, number of admitted bidders, buyer name.

---

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry / Bytom — direct Urząd BIP, no housing manager intermediary, text-PDFs, result notices on same article page.

**Adapter design:**

1. Crawl `?c=280` and `?c=318` for article links (`?a={id}`) — simple HTML parse.
2. For each article: extract announcement body (address, area, date) from HTML. Download announcement PDF + result PDF via `?p=document&action=show` URLs.
3. Parse result PDF as text (born-digital, no OCR needed) — extract table row: cena wywoławcza, cena osiągnięta, liczba osób, nabywca.
4. No RSS filtering needed; scraping the category pages is cleaner.

**Blockers:** None identified. No login, no JS rendering, no scanned PDFs, no anti-bot.

**Risks:**
- BIP article IDs are non-sequential (gap in integers); must crawl category pages, not enumerate IDs.
- RSS feed is site-wide, not per-category — cannot use as sole trigger; must diff category page on each run.
- "kolejny przetarg" pattern means multiple BIP articles per property (each round gets its own entry or is appended to the same article — both patterns seen). De-duplication by address + KW number needed.
- Volume is low (~5–10 auctions/year active), so scraper runs infrequently with low noise.

**Effort estimate:** Low. Two HTTP fetches per property (HTML article + result PDF), no OCR, no auth, well-structured PDFs. One afternoon to write + test adapter.

**VERDICT: BUILD — Low effort, High confidence.**

---

### References (live-verified URLs)

- [BIP Nysa — Sprzedaż, dzierżawa nieruchomości (active)](https://bip.nysa.pl/?c=280)
- [BIP Nysa — Archiwum sprzedaż](https://bip.nysa.pl/?c=318)
- [Lokal Moniuszki 1/27 — article](https://bip.nysa.pl/?a=8934)
- [Lokal Moniuszki 1/27 — result PDF](https://bip.nysa.pl/?p=document&action=show&id=23554&bar_id=8934)
- [Lokal Moniuszki 4/10 — article](https://bip.nysa.pl/?a=7800)
- [Wykaz nieruchomości — nysa.eu](https://www.nysa.eu/pl/dla-mieszkanca/wykaz-lokali-i-nieruchomosci-na-sprzedaz/)
