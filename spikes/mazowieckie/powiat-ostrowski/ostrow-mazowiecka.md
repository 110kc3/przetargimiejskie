# Spike — Ostrów Mazowiecka (Mazowieckie · powiat ostrowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miejska Ostrów Mazowiecka (Urząd Miasta, Wydział Planowania i Gospodarki Nieruchomościami — PGN) runs its own BIP at `www.bip.ostrowmaz.pl` — a bespoke server-rendered PHP BIP (`/public/?id=NNNN` routing). It **does** sell municipal property at *przetarg ustny nieograniczony*, but the stream is **LAND (działki)**: recent auctions are even *przetarg ustny **ograniczony*** (restricted, farmland-style). Residential disposal is the classic NO-BUILD shape — the "Mieszkania" section offers only **"Sprzedaż lokali mieszkalnych stanowiących własność gminy na rzecz ich najemców"** (flats sold *bezprzetargowo* to sitting tenants) plus municipal-rental allocation. Open **flat** auctions barely exist: the only two (al. Wyzwolenia 4, ul. Śląska — a *trzeci* / third failed round) surface only on a Facebook marketing page ("MiastoOferuje"), never as durable BIP articles. No housing manager (no ZGM/ZBM/MZBM/TBS). On top of that the BIP has real technical friction: broken TLS chain (needs `-k`), and **concluded przetarg articles get unpublished — old IDs 302-redirect to the homepage**, so there is no durable archive and no backfill. ~0 open flat-auction volume → NO-BUILD.

## 1. Sells municipal property at auction?
**YES for land, effectively NO for flats.** The city (Burmistrz Miasta Ostrów Mazowiecka) runs *przetarg ustny nieograniczony* per its `Regulamin przetargów na sprzedaż, oddanie w użytkowanie wieczyste, dzierżawę lub najem` (`/public/?id=181403`); procedure page `Zbywanie nieruchomości w drodze przetargów` (`/public/?id=788`): 21-day wykaz on the tablica ogłoszeń → przetarg.
- **What actually goes to auction = LAND.** BIP site-search + year-folder scan returns only działki: ul. Bolesława Prusa 1717/6, ul. Zielna 2170/7 (dz.), ul. Kawaleryjska 675/12, ul. Leśna. The current 2026 property auctions are **przetarg ustny OGRANICZONY** (restricted): `Ogłoszenie o trzecim przetargu ustnym ograniczonym na sprzedaż nieruchomości komunalnej` (`?id=209196`), `Lista osób zakwalifikowanych do trzeciego przetargu ograniczonego` (`?id=209503`), `Informacja o wyniku trzeciego przetargu ograniczonego` (`?id=209505`).
- **Flats are sold to tenants, not auctioned.** "Mieszkania" section (`/public/?id=637`) → **`Sprzedaż lokali mieszkalnych stanowiących własność gminy na rzecz ich najemców`** (`?id=789`, bezprzetargowo) + `Przyznanie mieszkania komunalnego` (`?id=790`, rental).
- **Open flat auctions = 2 episodic, off-BIP.** Only evidence: Facebook `MiastoOferuje` — "przetarg ustny nieograniczony na lokal mieszkalny przy alei Wyzwolenia 4" and "trzeci przetarg ustny nieograniczony na lokal mieszkalny przy ul. Śląskiej" (a third round = failed to sell twice). Neither is retrievable as a live BIP article.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (`www.bip.ostrowmaz.pl`, bespoke PHP `/public/?id=`):**
- Nieruchomości (procedures only): `https://www.bip.ostrowmaz.pl/public/?id=638`
- Mieszkania (tenant sale + rental): `https://www.bip.ostrowmaz.pl/public/?id=637`
- Ogłoszenia i Obwieszczenia Burmistrza (active board): `https://www.bip.ostrowmaz.pl/public/?id=2730` → year folders 2026 `?id=208810`, 2025 `?id=205639`, 2024 `?id=165981` (mostly środowiskowe/planistyczne decisions; sparse land auctions).
- **Sprzedaż Nieruchomości board** `?id=80830` and **Ogłoszenia o przetargach** archive `?id=1161` (both linked from the city portal) → **currently DEAD: 302 → homepage.**
- Doc download: `/public/get_file.php?id=NNN`; printable `/public/print/?id=NNN`; change-log `/public/rejestrzmian/?page=NNN`.
- City portal directory (links out to BIP): `https://www.ostrowmaz.pl/dla-mieszkanca/miasto/inwestycje/ogloszenia-i-przetargi`
- Off-BIP flat auctions: Facebook `facebook.com/MiastoOferuje`.

**Do NOT confuse** (shared/adjacent names): `bip.gminaostrowmazowiecka.pl` = the **rural Gmina Ostrów Mazowiecka** (Wójt) — separate JST; `bip.powiatostrowmaz.pl` = Starostwo Powiatowe. And this is **Ostrów Mazowiecka (mazowieckie)**, NOT Ostrów Wielkopolski (`bip.ostrowwielkopolski.pl`) — powiat-ostrowski slug is shared.

## 3. Format + rendering
- **Server-rendered HTML** — bespoke PHP BIP, jQuery 1.7.1 + accessibility scripts, no SPA, no JSON API, no CAPTCHA/login. Category/article pages both at `/public/?id=NNNN`; content lives in `div.content`.
- **TLS chain broken** — the cert fails default verification (WebFetch errors "unable to verify the first certificate"); scraping requires `curl -k` / relaxed TLS.
- **Attachments** via `get_file.php?id=` — typically PDF (born-digital vs scanned not verified; moot here).

## 4. Volume + achieved-price stream
- **Open FLAT auctions: ~0** on BIP (2 lifetime, Facebook-only, one a 3rd failed round). Residential disposal is bezprzetargowo-to-tenant + rental allocation.
- **Property auctions overall: low and LAND-dominated** — a handful of działka auctions/year buried in a board otherwise full of decyzje środowiskowe and lokalizacja inwestycji celu publicznego; the freshest are *przetarg ograniczony*.
- **Achieved-price stream:** exists **only for land** (`Informacja o wyniku przetargu…`, e.g. `?id=209505`, `?id=203257`) — and it is **not durable**: concluded przetarg articles get unpublished and their IDs 302-redirect to the homepage (verified across 2016–2025 IDs: 145734, 192226, 203257, 206105, 80830, 1161). No stable archive, no flat hammer-price feed.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** none of the catalogued CMS families — this is a **bespoke municipal PHP BIP** (`/public/?id=` + `get_file.php` + `rejestrzmian`), server-HTML like the WordPress/custom-HTML group but on its own scheme. Even if built, it would be a single-city bespoke parser.
- **Effort:** **— (not worth building).** The scrapable surface is land auctions inside a noisy general-obwieszczenia board, no flat stream to target.
- **Blockers (all NO-BUILD-reinforcing):** (1) **~0 open flat-auction volume** — flats go to tenants bezprzetargowo; (2) no housing manager (ZGM/ZBM/MZBM/TBS); (3) recent property auctions are *ograniczony* land; (4) **no durable archive** — expired przetarg IDs redirect to homepage, killing backfill and the results feed; (5) broken TLS chain. Textbook "generic city-BIP skewing to land + tenant sales."

**VERDICT: NO-BUILD** — residential disposal is bezprzetargowo-na-rzecz-najemcy + municipal rental; open flat auctions are two off-BIP Facebook one-offs; the BIP stream is land (partly restricted) with no durable archive. Fails the OPEN-FLAT-AUCTION-VOLUME test.

```json
{"city_slug":"ostrow-mazowiecka","voivodeship":"mazowieckie","powiat_slug":"powiat-ostrowski","status":"no-build","effort":"—","confidence":"LIVE","note":"no housing mgr; bespoke PHP BIP /public/?id; flats sold bezprzetargowo na rzecz najemcy (id=789); open auctions=LAND dzialki, recent ones ograniczony; 2 flat auctions Facebook-only; concluded przetarg IDs 302->home (no archive); TLS chain broken; ~0 open flat volume","host":"www.bip.ostrowmaz.pl","cms":"bespoke PHP BIP (/public/?id=)"}
```
