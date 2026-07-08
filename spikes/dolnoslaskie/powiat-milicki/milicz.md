# Spike — Milicz (Dolnośląskie · powiat milicki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (land-dominated board, ~<1 open flat/yr, no housing manager).

## TL;DR
Gmina Milicz (Urząd Miejski, gmina miejsko-wiejska seat) **does** sell municipal property at `przetarg ustny nieograniczony`, and flats (`lokal mieszkalny`) **do** occasionally reach open oral auction. But the property board is overwhelmingly **LAND**: of 1047 lifetime notices on the real-estate board, **936 (~89%) are nieruchomości gruntowe**, and only ~12 unique flats appear across the entire ~10-year platform history (several of those were `ustny ograniczony` — restricted, not open). In the recent ~200-notice window there is exactly **one** unique open flat (Rynek 30 lok. 4, offered as I + II przetarg). There is **no housing manager** (no ZGM/ZBM/MZBM/TBS) — the Referat Gospodarki Nieruchomościami of the Urząd Miejski handles disposals directly. The BIP `bip.milicz.pl` runs the **MADKOM SA eBIP React JS-SPA**, but it is backed by a clean unauthenticated **JSON REST API**, so rendering is *not* a blocker — the killer is volume. This is the textbook NO-BUILD profile: generic city-BIP skewed to land with ~0–1 open flat auctions/year and near-zero flat results.

## 1. Sells municipal property at auction?
**YES — but flats are marginal.** Burmistrz Gminy Milicz runs `publiczny przetarg ustny nieograniczony na sprzedaż` of municipal property. Flats confirmed at OPEN auction over history (from the live API, board 472):
- **Rynek 30 lok. 4** — I + II publiczny przetarg nieograniczony, 18,3 m² + komórka 13,7 m² (dz. 47/1 & 47/3 AM 6) — the only flat in the recent window.
- **Lwowska 6 lok. 4** (22,25 m²), **1 Maja 4 lok. 7** (11,98 m²), **Lwowska 18 lok. 3** (15,9 m²), **Polska 1 lok. 3** (19,4 m²), **Szewska 1 lok. 1** (26,8 m²), **Kuźnicza 2 lok. 2** (33,7 m²), **Długa 5 lok. 1** (24,9 m²), **Rynek 35a lok. 1** (30,23 m²) — all `ustny nieograniczony`.
- Several were `ustny **ograniczony**` (restricted, effectively to tenants/neighbours): **Cicha 4 lok. 6** (22 m², re-offered ~5×), **Wałowa 6 lok. 2**, **Kościelna 1 lok. 5**.

So genuine OPEN unique flats ≈ 9 over ~10 years ≈ **<1/year**, all tiny (11–34 m²) substandard leftover units. The board is dominated by land (działki niezabudowane in Sułów, Sławoszowice, Kaszowo, Milicz, Duchowo, Godnowa…) and a smattering of dzierżawa/najem and perpetual-usufruct sales.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP `bip.milicz.pl` (MADKOM eBIP):**
- Przetargi (parent): `https://bip.milicz.pl/m,438,przetargi.html`
- Ogłoszenia o przetargach: `https://bip.milicz.pl/m,463,ogloszenia-o-przetargach.html`
- **Przetargi na nieruchomości i pozostałe** (main property board, 1047 items): `https://bip.milicz.pl/m,472,przetargi-na-nieruchomosci-i-pozostale.html`
- **Wyniki o przetargach na nieruchomości i pozostałe** (results, 250 items): `https://bip.milicz.pl/m,765,wyniki-o-przetargach-na-nieruchomosci-i-pozostale.html`
- Article URL pattern: `a,NNNNN,slug.html`; menu pattern `m,NNN,slug.html`; attachment download `e,pobierz,get.html?id=NNNN`.

**JSON API (the real scrape surface — discovered from the bundle):** base = `window.location.origin + "/api/"`.
- Menu tree: `https://bip.milicz.pl/api/menu/{id}` (e.g. `/api/menu/472`).
- Article list (paginated): `https://bip.milicz.pl/api/menu/{id}/articles?limit=200&offset=0` → `{total, articles:[{id, link, aliasFields[title], columnFields[body/date]}]}`.
- Article detail: `https://bip.milicz.pl/api/articles/{id}` → `{content, attachments:[{id, name, extension, link:"e,pobierz,get.html?id=..."}]}`.

**Do NOT confuse** with `bip.milicz-powiat.pl` (Starostwo Powiatowe / **Powiat Milicki** — separate JST, out of scope) or `milicz.pl` (promotional city site, not BIP).

Contact: Urząd Miejski w Miliczu, Referat Gospodarki Nieruchomościami (editor "Ania Macherzyńska" on the notices), ul. Trzebnicka 2, Milicz.

## 3. Format + rendering
- **CMS:** **MADKOM SA eBIP** — React **JS-SPA**. Raw HTML is a ~4 KB shell (`<div id="root">`, `webpackJsonplayout-default`, chunked `/static/js/*.chunk.js`); all `.html` routes return the same shell (client-side routing). Bundle carries `madkom.pl/biuletyn-informacji-publicznej`.
- **Not a blocker:** the SPA is fed by a **clean unauthenticated JSON REST API** (see §2). No auth, no CAPTCHA, no rate-limit signal observed. So this is effectively a **JSON-API** source despite the SPA front-end.
- **Where the data actually lives:** the API `content` field only repeats the title. The substantive auction terms (`cena wywoławcza`, `wadium`, przetarg date/time) and results (`cena osiągnięta` / `wynik negatywny`) sit in **attachments — born-digital `.doc` (binary MS Word)** files (e.g. `Ogłoszenie o I przetargu nieograniczonym..doc`, 1.18 MB; `Wynik przetargu negatywny.doc`). Extraction would need `.doc`→text (antiword / LibreOffice / mammoth), occasionally `.pdf`. No OCR needed (born-digital).

## 4. Volume + achieved-price stream
- **Volume (flats):** negligible. Full-history counts from the live API — board 472: **1047** notices total, **936 land**, **19 flat title-hits → ~12 unique flats → ~9 genuinely OPEN**, over ~10 years. Recent 200-notice window: **1** unique open flat. Trend ≈ 0.
- **Achieved-price stream:** a real **Wyniki** board exists (menu 765, 250 results, all `Wynik ... przetargu ustnego nieograniczonego`) — but only **1** concerns a flat, and many land results are `negatywny` (no bidders). Hammer prices, where present, are inside the `.doc` attachment, not the JSON. For flats specifically the achieved-price stream is essentially empty.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Technical effort (if ever built):** Low–Medium — clean JSON list/detail API, easy pagination (`limit/offset`), no auth; the only cost is `.doc`/`.pdf` attachment text-extraction for the auction terms. MADKOM eBIP is a distinct CMS family (React-SPA + `/api/menu/{id}/articles` + `/api/articles/{id}`) worth codifying if another MADKOM town is ever a BUILD.
- **Blocker to BUILD:** not technical — **open flat-auction volume**. Land 89% of the board, ~<1 open flat/year and effectively 1 flat in the recent window, no ZGM/ZBM/TBS housing-manager pipeline, flat results ~nil. This is exactly the NO-BUILD signature in the brief ("generic city-BIP skewing to land … with ~0 open flat auctions").
- **Closest analog:** none needed as a BUILD; as a data point it resembles other small Dolnośląskie land-heavy gmina BIPs (Zgorzelec-style board mix but on MADKOM instead of bip.info.pl), just without the recurring flat cadence.

**VERDICT: NO-BUILD** — flats reach open oral auction only sporadically (<1/yr, ~0 recently) on a land-dominated MADKOM eBIP board with no housing manager and near-empty flat-results stream; the clean JSON API does not rescue a source with almost no flat volume.

```json
{"city_slug":"milicz","voivodeship":"dolnoslaskie","powiat_slug":"powiat-milicki","status":"no-build","effort":"—","confidence":"LIVE","note":"Urząd Miejski (no ZGM/housing mgr); MADKOM eBIP React JS-SPA w/ clean JSON API (/api/menu/{id}/articles, /api/articles/{id}); terms in .doc attachments; board 472 = 1047 notices, 936 land vs ~9 unique OPEN flats over ~10yr, 1 flat in recent 200; wyniki board 765 (250) only 1 flat, many negatywny; land-dominated → NO-BUILD","host":"bip.milicz.pl","cms":"MADKOM eBIP (React JS-SPA + JSON REST API)"}
```
