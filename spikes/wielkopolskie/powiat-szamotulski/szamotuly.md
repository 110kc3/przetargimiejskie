# Spike — Szamotuły (Wielkopolskie · powiat szamotulski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Medium effort — clean JSON API; flats a low-volume minority on a land-dominated board).

## TL;DR
Gmina Szamotuły (miejsko-wiejska; Burmistrz Miasta i Gminy Szamotuły, Wydział Nieruchomości Komunalnych, Rolnictwa i Ochrony Środowiska) **does sell municipal property at open oral auction — including residential flats.** Confirmed live: `I–IV przetarg ustny nieograniczony na zbycie spółdzielczego własnościowego prawa do lokalu mieszkalnego` (ul. Kolarska 9/25, 56,50 m², 3 pokoje). The city BIP `bip.szamotuly.pl` is a **React SPA (webpack) fronting a Symfony JSON API** — server HTML is an empty shell, but the API is directly reachable (no Playwright needed): board lists at `/api/menu/{id}/articles` and full notice bodies (inline HTML) at `/api/articles/{id}`. A **single mixed board (menu 1247 "Przetargi")** carries BOTH announcements (`Przetarg…`) AND achieved-price results (`Informacja o wyniku…`), ~470 archived articles, roughly monthly cadence. Mix is **land-dominated** (≈99/120 sampled = działki/nieruchomości gruntowe across villages: Lipnica, Piotrkówko, Mutowo, Koźle, Przysieczyn), a couple of lokale użytkowe (Rynek 6, Rynek 16/17 former bank), and **~1–2 distinct flats/year** cycling through repeat rounds. Achieved prices published. Closest analog: **Logonet eUrząd crawl shape** (tarnowskie-gory / kędzierzyn-koźle) — same `/api/menu/<id>/articles` pattern — but simpler (notice body is inline JSON HTML, no PDF/OCR). No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. open oral FLAT auctions.** Burmistrz Miasta i Gminy Szamotuły runs `przetarg ustny nieograniczony na zbycie`. Confirmed residential-flat auction:
- **ul. Kolarska 9/25** — `I przetarg ustny, nieograniczony na zbycie spółdzielczego własnościowego prawa do lokalu mieszkalnego`, pow. użytkowa **56,50 m²**, IV piętro, 3 pokoje + kuchnia (KW PO1A/00048624/7). Ran through **I → II → III → IV** rounds (art. 38186 → 38505 → 38805 → 39084) with matching `Informacja o wyniku` result notices — i.e. repeated because unsold, standard cycle.
- A second Kolarska flat cycled I → II earlier (art. 36933 → 37171, results 37286/38350/38698).

Also on the same board (open oral auction, non-flat): **lokal użytkowy Rynek 6** (result 39816, przetarg 12.05.2026) and **lokal użytkowy Rynek 16/17** (former bank, 347,20 m² — arts 26418/27140 on the legacy CMS). The bulk of the board is **land** (nieruchomości gruntowe niezabudowane / działki) across the rural part of the gmina.

**Tenant/bezprzetargowo track exists separately:** a `Wykaz — sprzedaż lokalu mieszkalnego, Nowa 3/20` was published as a *wykaz* (designation) — flats sold `na rzecz najemcy` go via wykaz, not open auction, and are out of open-auction scope. Open **flat** auctions are the spółdzielcze-własnościowe cases above (low volume).

Bidders: natural + legal persons; wadium + dowód tożsamości required. Contact: Wydział Nieruchomości Komunalnych, ul. Dworcowa 24, tel. (61) 29 27 544.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (React SPA + Symfony JSON API):** `bip.szamotuly.pl`
- Human announcements board (active): `https://bip.szamotuly.pl/m,1247,przetargi.html`
- Human archive of same board: `https://bip.szamotuly.pl/o,1247,przetargi.html`
- Parent menus: `m,1013,przetargi-nieruchomosci.html` (id 1013) → `m,1152` "Przetargi" → 759 "Menu podmiotowe" (containers, 0 direct articles).
- Individual notice (human): `https://bip.szamotuly.pl/a,{id},{slug}.html` (e.g. `a,38186,kolarska.html`).
- Legacy CMS URLs still indexed by Google: `https://bip.szamotuly.pl/Article/get/id,{id}.html` (older articles, e.g. Rynek 16/17 id 26418; Nowa 3/20 wykaz id 27863).

**The data path (use this — no Playwright):**
- Board list JSON: `https://bip.szamotuly.pl/api/menu/1247/articles?limit=120&offset=0&archived=1`
  - `archived=1` → full history (**total 470**); without it → only currently-active (total 1 on spike day). Returns `articles[]` each with `id`, `link` (`a,ID,slug.html`), `aliasFields` (title/lead), `columnFields` (incl. date `YYYY-MM-DD HH:MM:SS`). NOTE: a `search=` param is **ignored** (always returns full total) — filter client-side.
- Article detail JSON: `https://bip.szamotuly.pl/api/articles/{id}` → `content` (full notice as inline HTML), `attachments[]` (empty on the flat notices — body is self-contained text), `isArchived`, `mainMenuPath`, dates.
- Backend fingerprint: error bodies reference `/code_data/8.11.8/src/app/Api/Controller/ArticleController.php` (Symfony). Frontend: `webpackJsonplayout-default` React bundle, `/api/` base = `window.location.origin + "/api/"`.

**Do NOT confuse** with the county BIP `bip.powiat-szamotuly.pl` (Starostwo Powiatowe — separate JST, out of scope). Target is the **gmina** (Miasto i Gmina Szamotuły).

## 3. Format + rendering
- **Server HTML is an empty SPA shell** (4 KB, `<div id="root">` only) — do NOT parse the HTML pages. Instead hit the **JSON API** directly (reachable with a browser UA over HTTPS; returns clean UTF-8 JSON). This sidesteps the SPA entirely — **`needsRender` NOT required.**
- Notice body arrives as **inline HTML inside JSON `content`** (HTML entities like `&#380;`, `&nbsp;`, `&oacute;` — unescape + strip tags). Address / powierzchnia użytkowa / cena wywoławcza / wadium / KW number / auction date/time all sit in that inline text; no separate PDF for the flat notices sampled (attachments array empty). Land notices sometimes embed a table (działka/powierzchnia/cena) in `content` HTML.
- No auth, no CAPTCHA, no rate-limit signals observed.

## 4. Volume + achieved-price stream
- **Volume:** Board 1247 = **470 archived articles**, ~monthly cadence (this is announcements **+** results **combined**). Of 120 most-recent sampled: ~**99 land**, ~**2 lokal użytkowy**, ~**10 flat-related** — but those 10 collapse to ~**1–2 distinct residential flats** (spółdzielcze własnościowe prawo do lokalu) each cycling I–IV rounds. So **open FLAT-auction volume is LOW (~1–2 flats/yr)**; land + occasional commercial premises dominate. For the wider land-inclusive dataset the volume is healthy.
- **Achieved-price stream:** YES — `Informacja o wyniku [N] przetargu ustnego nieograniczonego na zbycie…` notices are interleaved on the same board 1247 (e.g. 39816 Rynek 6, 38698/38350 Kolarska flat, plus many land results). Each cites the round, date, and result (cena osiągnięta / nabywca, or wynik negatywny when no bidders). Announcement carries `cena wywoławcza`; result notice carries the hammer price. Both fully parseable from the JSON `content`.

## 5. Adapter effort + verdict (closest analog; blockers)
- **CMS family:** React SPA (webpack) + **Symfony JSON API** ("eBIP"-style, Wielkopolska). Not one of the pure-HTML families — treat as a **JSON-API source**.
- **Closest analog:** **Logonet eUrząd** crawl shape — the guide's Logonet row is literally `/api/menu/<id>/articles` (analogs: `tarnowskie-gory`, `kedzierzyn-kozle`, `skarzysko-kamienna`). Clone that menu→articles paging loop, but drop the PDF/OCR step: here the notice body is **inline HTML in the article JSON**, so parsing is simpler than Logonet's text-PDFs.
- **Effort:** **MEDIUM** (leaning Low). Crawl = page `/api/menu/1247/articles?archived=1&limit&offset` (470 rows, bounded); for each, fetch `/api/articles/{id}`; unescape + strip `content`; classify announcement vs `Informacja o wyniku`; parse address (parseAddress), powierzchnia użytkowa, cena wywoławcza/osiągnięta, wadium, KW, round (I–IV), date; **filter land/dzierżawa/lokal użytkowy out where flats are the sole target** (keep them if the wider dataset ingests land). Single mixed board keeps crawl trivial; the only care-items are the announcement-vs-result split (same board) and HTML-entity decoding.
- **Blockers:** None. SPA shell is bypassed by the JSON API; no auth/CAPTCHA/rate-limit. Use a browser UA. Watch: `search=` param is a no-op (filter client-side); confirm TERYT on first geoportal run.

**VERDICT: BUILD (Medium effort)** — recurring open oral auctions (land + occasional residential flat with an achieved-price results stream) exposed via a clean, directly-reachable Symfony JSON API behind a React SPA; clone the Logonet menu/articles crawl shape minus the PDF step. Flat volume is low but real; land makes the source worthwhile for the wider dataset. No technical blockers.
