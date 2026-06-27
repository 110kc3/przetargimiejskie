# Spike — Olsztyn (Warmińsko-Mazurskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: **BUILD** (Low effort).

## TL;DR

Olsztyn runs a regular, active stream of *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* published directly on the city BIP at `bip.olsztyn.eu`. Announcements and result notices are clean server-rendered HTML pages — all key fields (address, cena wywoławcza, najwyższa cena osiągnięta, nabywca) appear inline in page body text, no PDF required for the numbers. Sessions appear to run roughly monthly with batches of 3–6 flats per session. The municipal housing administrator, ZLiBK (Zakład Lokali i Budynków Komunalnych), handles only *najem* (rental) — flat **sales** are conducted directly by Prezydent Olsztyna through the Wydział Geodezji i Gospodarki Nieruchomościami. BIP structure is a straightforward two-section model (announcements + results), each a simple dated list of HTML articles. No JS SPA, no auth, no bot blocks detected on fetch.

---

## 1. Sells municipal property at auction?

**Yes — confirmed LIVE.** Olsztyn (Prezydent Olsztyna / Gmina Olsztyn) sells municipal residential flats via *ustny przetarg nieograniczony* under the Act on Public Property Management (Rozporządzenie Rady Ministrów z dnia 14 września 2004 r., Dz.U. 2021 poz. 2213). Sessions are held at the city hall (plac Jana Pawła II 1, sala 219).

Live result examples from BIP — all confirmed as *lokale mieszkalne*:

**17 April 2026 session** (4 flats tendered):
- ul. Curie-Skłodowskiej 10/2a — wywoławcza 380 000 zł → **osiągnięta 384 000 zł** (nabywca: REM Consulting Sp. z o.o.)
- ul. Curie-Skłodowskiej 10/2 — wywoławcza 460 000 zł → **osiągnięta 464 600 zł** (nabywca: REM Consulting Sp. z o.o.)
- ul. Kasprowicza 5b/13 — wywoławcza 540 000 zł → brak wpłat (unsuccessful)
- ul. Partyzantów 69/8 — wywoławcza 640 000 zł → **osiągnięta 646 400 zł** (nabywca: Szupryczyńscy Sp. z o.o.)

**20 March 2026 session** (confirmed residential flats):
- ul. Bałtyckiej 25B/4 — wywoławcza 250 000 zł → **osiągnięta 252 500 zł**
- ul. Partyzantów 73/6 — wywoławcza 200 000 zł → **osiągnięta 362 000 zł**
- ul. Partyzantów 67/4a — wywoławcza 400 000 zł → **osiągnięta 404 000 zł**

**13 March 2026** and **6 February 2026** sessions also confirmed (result pages exist on BIP).

The stream is mixed: flats (*lokale mieszkalne*), land (*nieruchomości gruntowe*), and built-up plots (*zabudowane*) are published in separate notices — the residential-flat sessions have their own distinct result pages titled explicitly "…na sprzedaż **lokali mieszkalnych**…", making filtering trivial.

**ZLiBK role:** ZLiBK (`zlibk.olsztyn.eu`) is a municipal budget institution managing the city's residential housing stock for *najem* (rental). It does **not** conduct flat sales. ZLiBK is out of scope for this adapter.

---

## 2. Where published? (hosts + boards, with URLs)

| Source | Role | URL |
|---|---|---|
| BIP — auction announcements index | Active and upcoming auctions (flats + land) | https://bip.olsztyn.eu/kategoria/187/informacja-o-przetargach-nieruchomosci.html |
| BIP — auction results index | Post-session result notices (achieved prices) | https://bip.olsztyn.eu/kategoria/188/informacja-o-wynikach-przetargow-nieruchomosci.html |
| BIP — residential flats subfolder (legacy) | Old-style folder view of flat-only listings | http://bip.olsztyn.eu/bip/folder/3729/sprzedaz_lokali_mieszkalnych/ |
| BIP — land subfolder (legacy) | Land plots (separate stream) | http://bip.olsztyn.eu/bip/folder/3733/sprzedaz_dzialek/ |
| BIP — individual result page (example) | Full detail: wywoławcza + osiągnięta + nabywca | https://bip.olsztyn.eu/informacja/2905/informacja-o-wynikach-przetargow-na-sprzedaz-lokali-mieszkalnych-stanowiacych-wlasnosc-gminy-olsztyn-ktore-odbyly-sie-w-dniu-17-kwietnia-2026-r.-w-siedzibie-urzedu-miasta-olsztyna.html |
| BIP — individual announcement page (example) | Flat listing with wywoławcza + auction date | http://www.bip.olsztyn.eu/bip/dokument/351994/ |
| olsztyn.eu main site | Cross-links to BIP — not a data source | https://olsztyn.eu/gospodarka/sprzedaz-i-dzierzawa-nieruchomosci.html |
| umolsztyn.bip.gov.pl | Mirror / legacy BIP on gov.pl — lower priority | https://umolsztyn.bip.gov.pl/sprzedaz-lokali-mieszkalnych/ |

**Primary canonical host:** `bip.olsztyn.eu` — HTTPS, no auth, no bot-blocking observed on direct fetch (Content-Type: text/html; charset=UTF-8 returned cleanly). CSRF tokens present in meta tags but are session cookies for form use — read-only page scraping is unaffected.

**Publisher:** Wydział Geodezji i Gospodarki Nieruchomościami, Urząd Miasta Olsztyna. Contact person per page: e.g. Ewa Wyka (publikacja), Marta Szczepkowska-Sadoch (treść merytoryczna).

---

## 3. Format + rendering

- **Listing index (kategoria/187 and kategoria/188):** Server-rendered HTML table, one row per notice, columns: sequential #, data publikacji (ISO date), tytuł (with hyperlink to detail), kategoria, status (Aktualny/Archiwalny). No JavaScript required to read the list. Pagination appears minimal — the current announcements index (187) shows only 1 active record at time of fetch, suggesting notices are archived quickly after the auction date passes; the results index (188) is the durable store.
- **Detail page (individual result or announcement):** Server-rendered HTML article. All key data in plain prose body text — address, unit number, floor, cena wywoławcza, najwyższa cena osiągnięta w przetargu, nabywca name — all inline in `<p>` or list item text. No table structure needed; regex/text extraction is straightforward. Metryka block at page bottom provides: data publikacji, data zmiany, autor.
- **No PDFs required** for the price data. The result pages are born-digital HTML with all numbers embedded in prose. (Announcement pages may have a PDF scan of the formal notice attached, but the key structured data — address, cena wywoławcza, termin — is also in the HTML body.)
- **No JSON API, no JS SPA.** CMS appears to be a custom Warmińsko-Mazurskie Centrum Nowych Technologii platform (`© 2026 Warmińsko-Mazurskie Centrum Nowych Technologii`), different from SmartSite (Białystok) or the Kraków platform.
- **TLS:** Standard HTTPS on bip.olsztyn.eu. No Cloudflare or CDN bot-blocking observed.
- **URL pattern for results:** `https://bip.olsztyn.eu/informacja/{ID}/…slug….html` — numeric ID increments; slug is a long Polish-language filename from the title. The results index page links directly to each.

---

## 4. Volume + achieved-price stream

- **Session cadence:** Roughly monthly, with separate sessions for residential flats vs. land (confirmed Jan, Feb, Mar, Apr 2026 — at least 4 flat sessions in 5 months).
- **Flats per session:** 3–6 units observed across confirmed sessions (Apr: 4 units; Mar: at least 3 units).
- **Estimated annual flat volume:** ~30–50 individual flat auctions per year.
- **Achieved-price availability:** Confirmed present in every result HTML page. The exact field "najwyższa cena osiągnięta w przetargu" is always stated inline, even for unsuccessful auctions (where "brak wpłat" or bidder count is noted). Purchaser name (nabywca) is also published — an additional data point vs. some other cities.
- **Price range observed (2026):** 200 000 zł – 808 000 zł opening prices; achieved prices generally 1–2% above opening, with occasional outliers (ul. Partyzantów 73/6: +81% over cena wywoławcza).
- **Result notice latency:** ~2–4 weeks after auction date based on Metryka timestamps (April 17 auction → published May 6).
- **Historical depth:** The legacy folder URL (`/bip/folder/3729/sprzedaz_lokali_mieszkalnych/`) suggests a long archive exists; older BIP content also accessible via `umolsztyn.bip.gov.pl`.

---

## 5. Adapter effort + verdict

**Closest analog:** Białystok (Podlaskie) — same pattern: city BIP, separate announcements and results sections, server-rendered HTML detail pages, plain-prose embedding of price data, no PDF required for numbers. Structural complexity is **lower** than Białystok because Olsztyn's result pages have even cleaner prose structure and the residential-flat notices are explicitly titled differently from land notices (easy to filter at index level by title keyword).

**Effort: Low.** Two HTTP GET crawls (index list → each detail page). Title-based filtering at index level separates flat from land auctions. Regex extraction of "cena wywoławcza: X zł" and "najwyższa cena osiągnięta w przetargu: X zł" from prose. No headless browser needed (unlike Białystok's JS paginator). The results index (kategoria/188) archives previous sessions, making backfill straightforward.

**Blockers:** None identified. No auth, no bot blocks, no scanned-PDF dependency for core data.

**Risks:**
1. **Index pagination:** Only 1 active announcement shown on the announcements index at time of fetch — unclear whether old announcements age out quickly. Mitigated by using the results index (kategoria/188) as the primary durable data source.
2. **Dual BIP hosts:** Both `bip.olsztyn.eu` and `umolsztyn.bip.gov.pl` exist. The `.eu` domain appears to be the live primary; the `bip.gov.pl` mirror may be legacy or lower-update-frequency. Adapter should target `bip.olsztyn.eu` only.
3. **Occasional failed auctions:** "Brak wpłat" (no bidders) events appear in result pages — adapter must handle the no-achieved-price case.
4. **Mixed-type sessions:** Some result pages cover land + flats in the same document (title says "nieruchomości" not "lokali mieszkalnych") — filter by page title keyword "lokali mieszkalnych" to stay in scope, or parse all result pages and filter by property type in body text.

**VERDICT: BUILD — active flat-auction stream, born-digital HTML prices, no blockers, Low effort, closest to Białystok adapter (LIVE-VERIFIED).**
