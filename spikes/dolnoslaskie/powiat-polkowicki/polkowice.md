# Spike — Polkowice (Dolnośląskie · powiat polkowicki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (residential = wykaz/tenant sales; ~0 open flat auctions).

## TL;DR
Gmina Polkowice (Urząd Gminy Polkowice, wealthy KGHM copper-region gmina miejsko-wiejska) publishes all property notices on `bip.polkowice.eu`, a **MADKOM eBIP** React SPA backed by a clean Symfony **JSON API** — technically the easiest possible target (born-digital HTML article bodies + PDF attachments, no auth, no OCR). But the CONTENT kills it: the entire property stream is **land sales, land/garage/kiosk/market-stall leases (dzierżawa), and tenant/perpetual-usufruct disposals**. Residential flats are disposed of almost exclusively via **wykaz → bezprzetargowo na rzecz najemcy** (sale to the sitting tenant), NOT open auction. Across the full 700-item `Nieruchomości` archive, **exactly one** open flat auction appears in the entire history (Moskorzyn 3/2). 87 of 93 "lokal mieszkalny" titles are `wykaz` notices. This is the textbook NO-BUILD profile: generic city-BIP skewing to land + tenant sales with ~0 open flat-auction volume. No dedicated housing-manager (ZGM/ZBM/TBS) auction board.

## 1. Sells municipal property at auction?
**YES for LAND — NO for FLATS.** The Burmistrz Polkowic runs `przetarg ustny nieograniczony` regularly, but the auctioned assets are:
- **działki / nieruchomości gruntowe** (building plots, e.g. 78/35 & 78/37 obr. 4; 1280/1 obr. 1; Sucha Górna; Kaźmierzów) — the bulk of the auction stream;
- **dzierżawa** (lease) auctions — garages (Hubala 20ab/28), kiosks & stalls on Hala Targowa (ul. Targowa 8), gospodarcze, the "RELAX" plot 638/2;
- occasional **lokal użytkowy** (commercial premises: Wołodyjowskiego 14P, Głogowska 11A/B).

**Flats (lokale mieszkalne) do NOT go to open auction here.** They appear only as `wykaz nieruchomości do sprzedaży - lokal mieszkalny ul. Paderewskiego / Ratowników …` — i.e. the statutory pre-sale list that precedes a **bezprzetargowa** sale to the sitting tenant. Quantified over the full archive (700 items, ~2018→2026):
- 113 titles contain "przetarg" — all land / dzierżawa / lokal użytkowy.
- 93 titles contain "lokal mieszkalny" — **87 are `wykaz`** (tenant disposals); the rest are results/info notices.
- **1** open flat auction in the entire history: `ogłoszenie o przetargu na sprzedaż lokalu mieszkalnego Moskorzyn 3/2` (+ its `Informacja o wyniku przetargu … lokal mieszkalny Moskorzyn 3/2`). One flat, one village, once.

## 2. Where published? (hosts + boards, URLs)
**Single host — city BIP (MADKOM eBIP):** `https://bip.polkowice.eu`
- Property board "Nieruchomości" (menu id 1023): `https://bip.polkowice.eu/ugpolkowice,m,1023,nieruchomosci.html` — carries przetarg ogłoszenia, wyniki, and wykazy all mixed.
- Generic przetargi landing: `https://bip.polkowice.eu/przetargi.html`
- Article permalink pattern: `ugpolkowice,a,{id},{slug}.html` (e.g. `ugpolkowice,a,62999,informacja-o-wyniku-przetargu-…html`).
- **JSON API** (this is the real integration surface):
  - list: `https://bip.polkowice.eu/api/menu/1023/articles?limit=50&offset=0&sort=publicationDate&sort_dir=desc` (add `&archived=true` for the 700-item back-catalogue; active list `total=8`).
  - article: `https://bip.polkowice.eu/api/articles/{id}` → `{title, content (HTML), attachments:[{fileName,id}], publicationDate,…}`.
  - files: `https://bip.polkowice.eu/api/files/{fileId}`; menu tree: `/api/menu/{id}`.
- No separate housing-manager BIP with a flat-auction stream. Municipal housing stock is managed operationally, but SALES route through the gmina's Nieruchomości board as wykaz/tenant disposals (no ZGM/ZBM/MZBM/TBS przetarg board found).

Contact: Urząd Gminy Polkowice, Rynek 1 / ul. Górna 2, 59-100 Polkowice; Wydział Geodezji i Gospodarki Nieruchomościami.

## 3. Format + rendering
- **JS-SPA (React) + JSON API — MADKOM eBIP.** Raw HTML is a 4 KB CRA shell (`#root`, `webpackJsonplayout-default`, vendor string "Madkom" in bundle); server-side HTML is empty, so scraping must go through `/api/…` (curl works, no JS engine needed once you know the routes).
- **Article bodies are born-digital HTML** in the `content` field (clean text, entity-encoded) — no rendering, no OCR.
- **Attachments are PDFs** (`/api/files/{id}`) — typically born-digital text PDFs (ogłoszenie / wynik). OCR unlikely.
- No auth, no CAPTCHA, no rate-limit signals observed. Symfony backend returns tidy JSON 404s for bad routes.

## 4. Volume + achieved-price stream
- **Open flat-auction volume: effectively ZERO** — 1 in ~8 years. This alone is decisive.
- Land/lease auction volume is healthy (~113 przetarg notices), and there IS a real **results stream** (`Informacja o wyniku przetargu …` carries hammer price / nabywca) — but it is land, not flats.
- Residential turnover is real but flows through `wykaz` → tenant sale (bezprzetargowo), which is out of scope for an open-auction hammer-price dataset.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **MADKOM eBIP** family — **Milicz / Oława** (React SPA + `/api/menu/{id}/articles` + `/api/articles/{id}` JSON). Cloning the transport would be trivial.
- **Technical effort (hypothetical):** LOW — pure JSON, `menu 1023` list → `articles/{id}` body → filter titles for `przetarg … lokal mieszkalny`, pull `attachments`. No blockers of any kind.
- **Real blocker: CONTENT, not tech.** The filter that would define this adapter (`ogłoszenie o przetargu … sprzedaż lokalu mieszkalnego`) matches **one** record in the entire history. There is no recurring open flat-auction stream and no housing-manager auction board to feed one. Building an adapter yields ~0 flat rows/year.
- **Effort field: —** (NO-BUILD; not worth building despite the easy API).

**VERDICT: NO-BUILD** — clean MADKOM eBIP JSON API, but municipal flats are sold to sitting tenants via `wykaz`/bezprzetargowo, not at open auction (~1 open flat auction ever). Auction stream is land + dzierżawa + lokale użytkowe. No open-flat-auction volume → correct call is NO-BUILD.
