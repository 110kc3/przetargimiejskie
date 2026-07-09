# Spike — Wieliczka (Małopolskie · powiat wielicki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (land/commercial-only; no open flat-auction stream). Source is clean server-HTML if land is ever wanted → effort Low.

## TL;DR
Gmina miejsko-wiejska Wieliczka (Urząd Miasta i Gminy, ~23k, Kraków suburb) **does** sell municipal property by `przetarg ustny nieograniczony`, but the live and recent stream is **land parcels + occasional lokal użytkowy / garaż / agricultural** — **no `lokal mieszkalny` (flat) auctions** were found on the current announcements board or the completed-auctions (results) board. The affluent-suburb hypothesis holds: little/no municipal flat stock is sold at open auction. The dedicated housing manager **ZBK Wieliczka** (Zarząd Budynków Komunalnych) only rents/manages housing (najem lokali mieszkalnych/użytkowych) — it runs no flat-sale auctions; any flat disposals would go `bezprzetargowo na rzecz najemcy`. Publication is clean **server-rendered HTML on the city portal `www.wieliczka.eu`** (IDcom-family CMS, `/pl/<board>/<id>/…` URLs) with a dedicated results board — NOT the `bip.malopolska.pl` JS-SPA. So technically trivially buildable, but there is no flat product to extract → **NO-BUILD** on the flat-auction target.

## 1. Sells municipal property at auction?
**YES for land/commercial — NO flat auctions found.** Burmistrz Miasta i Gminy Wieliczka runs `I/II przetarg ustny nieograniczony` (and occasional `ustny ograniczony` for adjacent-owner plots) for sale of gmina property. Live board (day of spike) carried only land: Sułków dz. 169/5 & 169/6 (nieruchomość niezabudowana, przetarg 10.02.2026); Wieliczka obr. 3 dz. 418/2 (0.0064 ha, przetarg ustny ograniczony 13.04.2026); Wieliczka obr. 1 dz. 772/3, 780/1 (niezabudowane). Completed-auctions (results) board back to Jan 2025 shows **lokal użytkowy (e.g. pawilon handlowy Chorągwica ~72 m²), garaże, działki ewidencyjne, nieruchomość rolna — but no `lokal mieszkalny`.** Housing manager **ZBK Wieliczka** (`zbk-wieliczka.wieliczka.eu`) publishes only najem (rental) notices + nabór wniosków o najem — no sale auctions. Conclusion: municipal flat stock is not disposed via open oral auction here (classic Kraków-suburb land-only profile).

## 2. Where published? (hosts + boards, URLs)
**Primary — city portal `www.wieliczka.eu` (server-rendered HTML, IDcom-family):**
- Przetargi na nieruchomości (hub): `https://www.wieliczka.eu/pl/49468/0/Przetargi_na_nieruchomosci.html`
- Ogłoszenia o przetargach (announcements): `https://www.wieliczka.eu/pl/49954/0/Ogloszenia_o_przetargach.html` (also reachable as `/pl/201436/0/ogloszenia-o-przetargach.html`)
- **Wyniki — Przetargi zakończone (informacja o wyniku):** `https://www.wieliczka.eu/pl/64244/0/Przetargi_zakonczone.html` (individual notices at `/pl/201531/<ID>/…`)
- Wykazy nieruchomości (sprzedaż / dzierżawa / najem / zamiana / aport / użyczenie) — separate boards under the same hub.
- Per-notice URL pattern: `https://www.wieliczka.eu/pl/<board-id>/<doc-id>/<slug>.html`.

**Secondary — official BIP on `bip.malopolska.pl/umigwieliczka` (JS-SPA):** mirrors the same auctions, e.g. `.../umigwieliczka,a,1635629,...-i-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci.html`. Content is rendered client-side (empty HTML shell) — would need `core/render.js`. **Prefer `wieliczka.eu`** (plain server HTML) to avoid Playwright entirely.

Contact: Urząd Miasta i Gminy w Wieliczce, ul. Powstania Warszawskiego 1; Wydział Gospodarki Nieruchomościami / Geodezji. Do NOT confuse with **Gmina Wieliczki** (`bip.wieliczki.pl`, warmińsko-mazurskie) — different JST.

## 3. Format + rendering
- **Server-rendered HTML** on `www.wieliczka.eu` — dated announcement lists, per-notice HTML pages, printable variants; born-digital PDF attachments (wykazy, maps) likely on some notices → `pdfText`. No JS gate, no auth, no CAPTCHA observed.
- The `bip.malopolska.pl` mirror is the Małopolska **JS-SPA** (needs render.js) — avoidable by using the city portal.
- CMS family: **IDcom-style** portal (`/pl/<catid>/<docid>/<slug>.html`) — analog to `tczew`/`gniezno` shape but delivered as clean in-band HTML here.

## 4. Volume + achieved-price stream
- **Volume:** Modest, and **land/commercial-dominated**. A handful of oral auctions per year (unbuilt plots, adjacent-owner plots, occasional pawilon/garaż/rolna). **Flat-auction volume: effectively zero** (none on current or completed boards).
- **Achieved-price stream:** YES — dedicated **"Przetargi zakończone"** results board publishes `informacja o wyniku przetargu` (cena osiągnięta / najwyższa cena / nabywca, or wynik negatywny), chronological back to Jan 2025; cena wywoławcza appears on the announcement/wykaz side. Fully parseable from server HTML — but the priced items are land/commercial, not flats.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if built for land):** IDcom-family server-HTML portal — clone the `tczew`/`gniezno` board→doc shape, pointed at `wieliczka.eu` boards (`49954` announcements, `64244` results) with `/pl/<catid>/<docid>/` doc URLs; results board gives achieved prices. Would be **LOW** effort technically (no SPA needed).
- **CMS family:** IDcom-style city portal, server-rendered HTML (ADAPTER-GUIDE §3 "IDcom" / "WordPress/custom HTML" territory). BIP mirror is bip.malopolska.pl SPA — not needed.
- **Blocker for the flat target:** **No municipal flat-auction stream.** Everything sold at open auction is land / lokal użytkowy / garaż / rolna; flats (if any) go `bezprzetargowo na rzecz najemcy` via ZBK. For a flat-auction dataset there is nothing to extract → NO-BUILD. Reclassify to BUILD (Low) only if the project decides to ingest land/commercial auctions for affluent suburbs.

**VERDICT: NO-BUILD** — Wieliczka publishes a clean, results-backed server-HTML auction stream on `www.wieliczka.eu`, but it is land + commercial only; no open `lokal mieszkalny` auctions and a rent-only housing manager (ZBK). Low-effort to build for land if ever in scope, but out of scope for municipal flat auctions.
