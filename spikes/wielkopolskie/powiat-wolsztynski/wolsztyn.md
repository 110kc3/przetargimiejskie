# Spike — Wolsztyn (Wielkopolskie · powiat wolsztyński)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (land/tenant-sale stream; no open flat-auction volume).

## TL;DR
Gmina Wolsztyn (miejsko-wiejska, Urząd Miejski w Wolsztynie) **does** sell municipal property by `przetarg ustny nieograniczony na sprzedaż` — but the auction stream is **land-dominated** (nieruchomości gruntowe niezabudowane in Kębłowo, Komorowo, Obra, ul. Parkowa) plus the occasional whole `nieruchomość zabudowana` (e.g. a house in Stary Widzim 59A, 80 m² budynek mieszkalny — a building, not a `lokal mieszkalny`). Municipal **flats (lokale mieszkalne) are sold bezprzetargowo na rzecz najemcy** (statutory tenant right of first refusal); a flat only reaches an oral auction rarely, after a separate Council resolution when the tenant declines. There is **no dedicated ZGM/ZBM/TBS housing manager publishing flat auctions** — new housing runs through **SIM KZN Wielkopolska**, and the gmina's own flat disposals are tenant sales. Technically the source is clean and easily scrapeable — the BIP `bip.wolsztyn.pl` is a **React SPA (Nefeni "layout-default" family)** with a plain JSON API (`/api/menu/<id>/articles`, `/api/articles/<id>`) — but the load-bearing signal (open flat-auction volume) is effectively **zero**. Classic generic-city-BIP-skews-to-land + tenant-sale NO-BUILD.

## 1. Sells municipal property at auction?
**YES for land / whole buildings — NO meaningful open FLAT auctions.** The Burmistrz Wolsztyna runs `I/II przetarg ustny nieograniczony na sprzedaż` for municipal property. Confirmed live notices (via BIP JSON API + Google index):
- **Stary Widzim 59A** — I przetarg ustny nieograniczony na sprzedaż `nieruchomości zabudowanej` budynkiem mieszkalnym o pow. użytkowej 80 m², dz. nr 249, 0.0400 ha (`Article/get/id,19010`). A **whole house on a plot**, not a `lokal mieszkalny`.
- **Komorowo** — pierwszy przetarg ustny na sprzedaż nieruchomości **gruntowej** (`id,19722`).
- **Kębłowo** — I / II przetarg ustny nieograniczony na sprzedaż nieruchomości **niezabudowanych** (`id,19486`, `id,20048`).
- **ul. Parkowa, Wolsztyn** — II przetarg na sprzedaż nieruchomości (`id,15968`).
- Older: Obra (przetarg ustny ograniczony dla właścicieli sąsiednich), grunty komunalne (uchwały nr 109/2011, 174/2015).

**Flats:** the BIP explicitly documents the standard statutory path — *"jeżeli najemca nie skorzysta z prawa pierwszeństwa nabycia lokalu mieszkalnego, nieruchomość może zostać sprzedana w drodze przetargu po odrębnej uchwale Rady"* — i.e. flats go **bezprzetargowo na rzecz najemcy** first; an open flat auction is the rare exception, not a recurring board. No stream of `przetarg ustny … na sprzedaż lokalu mieszkalnego nr X` was found.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (React SPA, JSON-backed):** `https://bip.wolsztyn.pl`
- Ogłoszenia o przetargach (property, under Gospodarka nieruchomościami): `https://bip.wolsztyn.pl/o,58,ogloszenia-o-przetargach.html`
- Gospodarka nieruchomościami (menu 222): `https://bip.wolsztyn.pl/m,222,gospodarka-nieruchomosciami.html`
- Wykaz nieruchomości do zbycia (pre-auction designations): `https://bip.wolsztyn.pl/v,2278,wykaz.html`
- Przetargi board under **Zamówienia publiczne** (menu 115) is **public-procurement tenders** — 525 items, NOT property sales: `https://bip.wolsztyn.pl/m,115,przetargi.html`
- Article detail (server route, but SPA-rendered): `https://bip.wolsztyn.pl/Article/get/id,<ID>.html` and list-link form `a,<ID>,slug.html`.
- **JSON API (the real data path):**
  - Article list per menu: `https://bip.wolsztyn.pl/api/menu/<menuId>/articles` (paginated: `{limit,offset,total,articles[]}`)
  - Single article: `https://bip.wolsztyn.pl/api/articles/<ID>` → `{title, content(HTML), attachments[], publicationDate, mainMenuPath, …}`
  - Nav tree: `https://bip.wolsztyn.pl/api/menu/<id>`
- **Housing:** no ZGM/ZBM/TBS BIP for flat auctions. New housing = **SIM KZN Wielkopolska** (`https://simkzn-wielkopolska.pl/wolsztyn/`, uchwała RM XIX/204/2025) — construction/allocation, not sales. Oświata unit BIP is separate (`gzoeiawolsztyn.bipweb.pl`).
- Do NOT confuse with the **powiat** BIP `bip2.wokiss.pl/wolsztynp/` (Starostwo Powiatowe — county land, out of scope) or `powiatwolsztyn.pl`.

## 3. Format + rendering
- **React SPA — Nefeni "layout-default" family.** Raw HTML is a ~4 KB shell (`<div id="root">`, `webpackJsonplayout-default`, chunked `/static/js/*.chunk.js`); no content without JS. **But** all content is served by a clean, unauthenticated **JSON API** (`/api/menu/<id>/articles` + `/api/articles/<id>`) — so **no Playwright/render.js needed**; fetch the JSON directly.
- Article `content` is inline HTML (entity-encoded Polish, `<br/>`/`<p>` markup) — strip tags and regex-parse. Some notices carry born-digital PDF `attachments[]` (handle with `pdfText` if present; the Stary Widzim notice was inline HTML, 0 attachments).
- No auth / CAPTCHA / rate-limit signals observed. Menu 115 total=525 confirms deep pagination is available.

## 4. Volume + achieved-price stream
- **Flat-auction volume: ~0/yr.** Property auctions are grunty niezabudowane + occasional zabudowana (house); `lokal mieszkalny` flat auctions are effectively absent (tenant sales instead). This is the disqualifier.
- **Land/building auction volume:** low-to-modest — a handful of oral auctions per year across the gmina's villages + town.
- **Achieved-price stream:** the same board carries `informacja o wyniku przetargu` (cena osiągnięta / nabywca or wynik negatywny) for the land/building auctions, retrievable via the same `/api/articles/<id>` JSON. Announcements carry `cena wywoławcza` + `wadium`. So a price stream exists — but for **land, not flats**.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** a **JSON-API SPA** BIP — fetch the API directly (`/api/menu/<id>/articles` → `/api/articles/<id>`) rather than the render.js path used by `chrzanow`/`warszawa`. In ADAPTER-GUIDE §3 terms this is the "JS SPA (no server HTML)" row, but with a clean REST backend it is effectively a low-effort HTML/JSON parse.
- **CMS family:** Nefeni "layout-default" React SPA + JSON API (Wielkopolska municipal BIP pattern).
- **Effort (if ever built):** would be **Low** technically — clean paginated JSON, inline-HTML content, entity-decode + regex. But **no flat stream to extract**.
- **Blockers:** the substantive one — **no open municipal flat-auction stream**. Flats are sold bezprzetargowo na rzecz najemcy; the auction board is land/building-only. Building this adapter would add land notices, not the flat-auction rows the dataset targets.

**VERDICT: NO-BUILD** — clean, scrapeable JSON-API BIP, but the municipal-property auction stream is land + whole-building sales; flats go bezprzetargowo to sitting tenants and reach auction only exceptionally. No dedicated ZGM/TBS flat-auction source. Revisit only if a `sprzedaż lokali mieszkalnych w drodze przetargu` board appears.
