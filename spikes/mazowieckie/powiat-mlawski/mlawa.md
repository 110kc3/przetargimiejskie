# Spike — Mława (Mazowieckie · powiat mławski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (residential disposal is bezprzetargowo na rzecz najemcy; open auctions are land-only).

## TL;DR
Gmina Miejska Mława (~30k, gmina miejska) runs its BIP at **`bip.mlawa.pl`** — a **Drupal-based** server-rendered site (custom `mlawa_bip` theme; `/artykul/`, `/ogloszenie/`, `/node/NNNN`, printable `/vcontent_print/node/NNNN`). The Burmistrz **does** hold `przetarg ustny nieograniczony`, but the confirmed open auctions are for **undeveloped land** (niezabudowana nieruchomość komunalna). **Municipal FLATS are sold bezprzetargowo na rzecz najemcy** (without auction, tenant priority) under **Uchwała Nr XVI/160/2012 Rady Miasta Mława (27.03.2012)** — flats appear only as `wykaz nieruchomości przeznaczonych do zbycia` tenant lists, never as open flat auctions with hammer prices. A housing manager exists (**ZBM I TBS** / **ZBM II TBS Sp. z o.o.**, `tbs-mlawa.pl`) but it does building management + technical-inspection procurement + TBS rental construction, not open flat-sale auctions. **No open flat auction and no flat `informacja o wyniku przetargu` were found.** This is the generic city-BIP land+tenant pattern → NO-BUILD.

## 1. Sells municipal property at auction?
**Land: YES. Flats: NO (tenant sale, no auction).**
- The Burmistrz Miasta Mławy runs `przetarg ustny nieograniczony`, but the live examples are **land**: e.g. *"Burmistrz Miasta Mławy ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż niezabudowanej nieruchomości komunalnej…"* — cena wywoławcza **46 000,00 zł**, wadium 4 600,00 zł (`/vcontent_print/node/3428`). Search-surfaced przetarg articles are likewise unbuilt parcels (ul. Graniczna, ul. Padlewskiego, ul. Gen. W. Andersa land).
- **Flats are disposed of bezprzetargowo.** The standing page *"Sprzedaż lokalu mieszkalnego dla najemcy"* cites **Uchwała Nr XVI/160/2012 Rady Miasta Mława z dnia 27 marca 2012 r. w sprawie zasad sprzedaży bezprzetargowej** and states: *"Pierwszeństwo w nabyciu lokalu przysługuje osobie, która jest najemcą lokalu mieszkalnego, a najem został nawiązany na czas nieoznaczony,"* with **bonifikaty** for the tenant buyer. Flat entries on BIP are `Wykaz nieruchomości przeznaczonych do zbycia` — e.g. **lokal mieszkalny nr 19, ul. Padlewskiego 1/2**; **lokal mieszkalny nr 5, ul. Graniczna 84/1** (52/674 udziału w gruncie dz. 1918/3) — i.e. wykaz → tenant purchase, not an open ustny przetarg.
- Net: **~0 open flat auctions.** The open-auction channel is land; the flat channel is tenant-priority non-auction sale. That is the NO-BUILD signature.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Drupal):**
- Przetargi board: `https://bip.mlawa.pl/artykuly/przetargi`
- Nieruchomości hub: `https://bip.mlawa.pl/artykuly/nieruchomosci`
- Wykazy (sprzedaż / użytkowanie wieczyste / najem / dzierżawa): `https://bip.mlawa.pl/artykuly/wykazy-nieruchomosci-przeznaczonych-do-sprzedazy-do-oddania-w-uzytkowanie-wieczyste`
- Ogłoszenia listing: `https://bip.mlawa.pl/ogloszenia`
- Tenant-sale procedure: `https://bip.mlawa.pl/artykul/sprzedaz-lokalu-mieszkalnego-dla-najemcy`
- Example land auction (printable text): `https://bip.mlawa.pl/vcontent_print/node/3428`
- Example flat wykaz (tenant): `https://bip.mlawa.pl/ogloszenie/wykaz-nieruchomosci-przeznaczonych-do-zbycia-stanowiacej-lokal-mieszkalny-nr-19-w`
- URL shapes: `/artykul/<slug>`, `/ogloszenie/<slug>`, `/node/NNNN`, printable `/vcontent_print/node/NNNN`; older pages paginate via `/node?page=NN`.
- **Mirror:** `nowa.bip.mlawa.pl` (a "nowa" BIP) exists but its TLS cert only covers `*.mlawa.pl`/`mlawa.pl` (SNI mismatch on the `nowa.` host → direct HTTPS fetch fails); the active authoritative source is `bip.mlawa.pl`.

**Housing manager (separate JST, not a sales board):** ZBM I TBS Sp. z o.o. + ZBM II TBS Sp. z o.o. — `https://tbs-mlawa.pl/przetargi/` — carries `zapytania ofertowe` for przeglądy techniczne (kominy, wentylacja) and building services, plus TBS rental construction. No open municipal flat-sale auctions / no achieved-price results board.

Contact: Wydział Gospodarki Nieruchomościami i Planowania Przestrzennego, pok. 13, tel. (23) 654 32 53.

## 3. Format + rendering
- **Server-rendered HTML**, Drupal (custom `mlawa_bip` theme). Notices are HTML articles at `/artykul/` and `/ogloszenie/`; a clean **born-digital text** variant is available at `/vcontent_print/node/NNNN` (used to read node 3428 above). No JS-SPA gate, no auth, no CAPTCHA observed.
- The `/artykuly/przetargi` landing renders as a section shell (child items load under the node hierarchy / listing pages); individual notices are plain HTML — parseable with DOM/regex, `pdfText` only if a notice attaches a born-digital PDF (OCR not indicated).

## 4. Volume + achieved-price stream
- **Open flat-auction volume: effectively zero.** Flats move via wykaz→tenant; open auctions are land parcels (low volume, a handful/year across a mixed sale board).
- **Achieved-price stream: none for flats.** No flat `informacja o wyniku przetargu` (cena osiągnięta / nabywca) found on BIP or via search; the wykazy board (~7 mixed sprzedaż + dzierżawa entries visible, no deep pagination) is a notice list, not a hammer-price results board.
- Because the disposal is bezprzetargowo, there is no bidding and therefore no hammer-price signal to harvest — the core datum this project wants does not exist here.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** bespoke **Drupal** city BIP (server-HTML + `/vcontent_print/` text) — nearest to the WordPress/custom-HTML family (brzeg / nowa-sol shape) rather than any hosted CMS in the analog list; not Logonet/IDcom/bip.info.pl.
- **Effort:** **—** (not applicable — NO-BUILD). The scrape itself would be Low–Medium (clean server HTML), but there is **no open flat-auction / achieved-price stream to scrape**.
- **Blockers / why NO-BUILD:** residential disposal is **only** bezprzetargowo na rzecz najemcy (Uchwała XVI/160/2012); open `przetarg ustny nieograniczony` is land-only; the TBS manager is procurement/rental, not a flat-sale auctioneer; no results board with hammer prices. Textbook generic city-BIP skewing to land + tenant sales with ~0 open flat auctions.

**VERDICT: NO-BUILD** — Mława sells municipal flats bezprzetargowo to sitting tenants (Uchwała XVI/160/2012); its open oral auctions are undeveloped land, with no flat-auction volume and no achieved-price results stream. Larger-seat size did not change the outcome — verified honestly against live BIP.
