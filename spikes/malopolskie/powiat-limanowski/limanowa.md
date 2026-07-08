# Spike — Limanowa (Małopolskie · powiat limanowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Miasto Limanowa (gmina miejska, Burmistrz — distinct from surrounding gmina wiejska Limanowa) does run `przetarg ustny nieograniczony`, but the **sale-by-auction** stream is a thin trickle of **land plots** plus a single distressed building, while the residential stream is essentially all **dzierżawa/najem (lease)** and **bezprzetargowo** (sitting-tenant). Over a 420-post property board (2022→2026) there are **zero individual `sprzedaż lokalu mieszkalnego` (flat) auctions** — the only "lokal mieszkalny" hits are annual tenant-waiting-lists for najem. The one residential-building sale is ul. Kościuszki 558/1 (a pre-war building with 2 flats under a **demolition order**), re-auctioned repeatedly at a falling price. There is a municipal housing manager (**MZGKiM Sp. z o.o.**), but it manages/rents stock — it does not sell flats at auction. This is the textbook NO-BUILD profile: generic city-BIP skewing to land + tenant/lease, ~0 open flat auctions.

## 1. Sells municipal property at auction?
**YES for land / occasional buildings, NO for flats.** Confirmed live from the WordPress property board (category "Gospodarka Nieruchomościami", 420 posts). Actual sale-by-auction events:
- **działka 34/15 obr 6** — I przetarg ustny nieograniczony na sprzedaż, *rozstrzygnięty* 2026-06-05 (LAND).
- **działki 55/2, 57/2 obr 1** — przetarg na sprzedaż zakończony *wynikiem negatywnym* 2025-03-24 (LAND, unsold).
- **ul. Kościuszki 558/1** — nieruchomość zabudowana budynkiem mieszkalnym z **2 lokalami mieszkalnymi**, przedwojenny, decyzja o **wyłączeniu z użytkowania / rozbiórce**. I przetarg 2026-01-29 @ 800 000 zł → III przetarg 2026-07-30 @ **550 000 zł** (falling price, still unsold). One distressed asset, not a stream.
- Historic: budynek targowiska "Mój Rynek" (2023, land+building), ul. J. Marka 14 budynek użytkowo-mieszkalny (2017-18), działka 941 (2021).

Everything else on the board is **lease/rental**: recurring `przetarg ustny nieograniczony na najem` of a **lokal użytkowy** (e.g. ul. Matki Boskiej Bolesnej 10A, 67.54 m², III przetarg 2026-08-06, repeatedly wynik negatywny), dozens of `wykaz … do dzierżawy`, and `najem w drodze bezprzetargowej`. Residential sale to occupants is done **bezprzetargowo** (`wykaz … do sprzedaży w trybie bezprzetargowym`, 2024-2025), i.e. no auction. **No `przetarg … na sprzedaż lokalu mieszkalnego` exists.**

## 2. Where published? (hosts + boards, URLs)
- **Official BIP (SPA):** `https://bip.malopolska.pl/umlimanowa` — standard bip.malopolska.pl Liferay portal, **empty without JavaScript** (raw HTML is just the skip-nav shell). Procurement board e.g. `bip.malopolska.pl/umlimanowa,m,45084,zamowienia-publiczne-ogloszenia.html`.
- **Practical mirror (WordPress, server-rendered):** `https://miastolimanowa.pl` — category **"Gospodarka Nieruchomościami"** = cat id **77** (420 posts). Board: `https://miastolimanowa.pl/kategoria/inwestycje-i-gospodarka/gospodarka-nieruchomosciami/` (front-end uses JS infinite-scroll). Clean enumeration via WP REST: `https://miastolimanowa.pl/wp-json/wp/v2/posts?categories=77&per_page=100&page=N`. Individual posts (e.g. `/2026/06/ogloszenie-o-przetargu-18/`) are **server-rendered HTML with the full notice text** in the body.
- **Housing manager BIP:** MZGKiM Sp. z o.o. — `https://bip.malopolska.pl/mzgkimszoo` (also `mzgkim.limanowa.pl`), ul. Rzeczna 7. Manages ~20 residential complexes + communal premises for the city; **not a flat-sale seller**.
- **Local mirror:** `limanowa.in/urzedy/…` re-posts the same ogłoszenia (secondary).
- Contact: UM Limanowa, ul. Jana Pawła II 9, Wydział Gospodarki Nieruchomościami, tel. 18/506 58 53, 18/506 58 65.

## 3. Format + rendering
- **Official BIP = JS-SPA** (bip.malopolska.pl / Liferay) → would need render.js (chrzanow analog).
- **miastolimanowa.pl = server-rendered HTML** (WordPress). Full ogłoszenie text sits in the post body (verified: address, `558/1`, `cena wywoławcza`, `wadium`, `przetarg ustny` all present in raw curl). WP REST API gives dated title/link enumeration cleanly (note: `content.rendered` came back empty via REST for some posts — a page-builder quirk — so parse the front-end HTML, not the REST content field). Occasional **born-digital PDF map** attachments (`/wp-content/uploads/…/Mapa-zalacznik-do-ogloszenia.pdf`), not required for structured fields. No OCR, no auth, no CAPTCHA.
- If built, miastolimanowa.pl (WordPress custom HTML + REST enum) is the low-friction source and avoids the SPA entirely.

## 4. Volume + achieved-price stream
- **Open FLAT auctions: 0.** No individual lokal-mieszkalny sale auction in the entire visible history (2017→2026).
- **Sale-by-auction (any object): a trickle** — roughly 1-3 land plots/year plus rare buildings; several close `wynikiem negatywnym`. The residential-building case (Kościuszki 558/1) is one distressed asset repeatedly re-auctioned.
- **Achieved-price stream: weak.** `Ogłoszenie o zakończeniu przetargu` / `w sprawie rozstrzygnięcia …` notices exist and are parseable, but in 2026 they overwhelmingly report **wynik negatywny** on lease auctions (lokal użytkowy) — no hammer-price stream for flats. No ZGM/MZGKiM flat-sale results board.
- Dominant content = dzierżawa/najem wykazy + bezprzetargowo najem + tenant waiting-lists.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** Małopolskie WordPress/custom-HTML gmina — **bochnia / olkusz / trzebinia** pattern (server-HTML, REST-enumerable) for the miastolimanowa.pl mirror; the official SPA would instead map to **chrzanów (render.js)**. Housing-manager BIP is on bip.malopolska.pl like the umlimanowa portal.
- **CMS family:** official = bip.malopolska.pl JS-SPA (Liferay); practical = WordPress (server-rendered HTML) + WP REST.
- **Effort if content existed:** LOW (clean WP HTML). But content is the blocker, not tech.
- **Blocker (decisive):** No product. The target dataset is open flat-sale auctions with achieved prices; Limanowa disposes of residential stock via **lease and sitting-tenant (bezprzetargowo)**, not auction, and its auction stream is sparse land + one demolition-bound building. Building an adapter would yield near-zero in-scope flat records.

**VERDICT: NO-BUILD** — gmina miejska with a municipal housing manager (MZGKiM) but a residential stream that is all najem/dzierżawa + bezprzetargowo and ~0 open flat-sale auctions; sale-by-auction is a thin land trickle plus one distressed building. Sources are fine (WordPress server-HTML mirror of a bip.malopolska.pl SPA), but there is no open flat-auction / hammer-price stream to justify an adapter.
