# Spike — Wyszków (Mazowieckie · powiat wyszkowski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (land-only stream, no flat auctions).

## TL;DR
Gmina Wyszków (miejsko-wiejska, ~27k) sells municipal property via `przetarg ustny nieograniczony`, published in-band on the city BIP `bip.wyszkow.pl` (custom PHP BIP CMS, URL shape `index.php?cmd=zawartosc&opt=pokaz&id=NNNN`; clean server-rendered HTML, dedicated "Informacja o wyniku przetargu" result notices exist). But the entire auction stream is **land** — nieruchomości gruntowe niezabudowane (ul. Przemysłowa, Graficzna, Szpitalna building plots) — plus a handful of `bezprzetargowo` direct sales (tenant / neighbour lot regularisations). The standing wykaz "Nieruchomości przeznaczone do sprzedaży lub zamiany" is 100% land; no separate board for lokale, no ZGM/TBS/MZBM housing manager surfaced, and no `lokal mieszkalny` sold at open oral auction found across current + archive + search. Fails the flat-auction heuristic → NO-BUILD. Source is technically clean and cloneable if flats ever appear, but there is no flat volume to justify a build.

## 1. Sells municipal property at auction?
**YES for land; NO for flats.** The Urząd Miejski w Wyszkowie (Aleja Róż 2 / Al. Róż; sale-referat contact room 125, tel. (29) 743-77-17) runs `PRZETARG USTNY NIEOGRANICZONY na sprzedaż` — confirmed live examples are all undeveloped land:
- ul. Przemysłowa building plots — III przetarg ustny nieograniczony, parcels 207/10-12, 209/10-12 (1,001–1,085 m²), ceny wywoławcze 120,120–130,200 zł, wadium ~18–19k (id=26248).
- ul. Graficzna — przetarg ustny nieograniczony na sprzedaż niezabudowanych nieruchomości gruntowych (id=5989).
- Further Przemysłowa / 1,563 m² / 1,070 m² notices (id=26006, 26747, 26750).

The standing wykaz **"Nieruchomości przeznaczone do sprzedaży lub zamiany"** (id=21707) lists ~11 items — every one is a **działka/grunt**, several marked `bezprzetargowo` (Tumanek 100 m², Strumykowa 14 m², plots 1079/4 etc. — classic tenant/neighbour lot regularisation), the rest land offered `sprzedaż lub zamiana`. **Zero lokale mieszkalne.** The "Aktualne oferty" board (id=56, ~19 items) is dominated by `dzierżawa nieruchomości gruntowej` (land lease) + a few bezprzetargowo sales. No flat ever found at open auction.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (custom PHP BIP CMS):**
- Sprzedaż nieruchomości → Aktualne oferty: `https://bip.wyszkow.pl/index.php?cmd=zawartosc&opt=pokaz&id=56`
- Sprzedaż nieruchomości → Archiwum (yearly 2019–2026 subpages): `https://bip.wyszkow.pl/index.php?cmd=zawartosc&opt=pokaz&id=396`
- Standing wykaz sprzedaż/zamiana: `https://bip.wyszkow.pl/index.php?cmd=zawartosc&opt=pokaz&id=21707`
- Sample auction notice (land): `https://bip.wyszkow.pl/index.php?cmd=zawartosc&opt=pokaz&id=26248`
- **Result / achieved-price notice** ("Informacja o wyniku przetargu"): `https://bip.wyszkow.pl/index.php?cmd=zawartosc&opt=pokaz&id=22454`
- Document URL pattern: `index.php?cmd=zawartosc&opt=pokaz&id=NNNN` (sequential integer ids).
- Mirror/promotional (non-BIP): `https://www.wyszkow.pl/info/zawartosc/NN/` and `www.wyszkow.eu` (same content, less structured).
- **CMS family:** bespoke/custom PHP BIP (`cmd=zawartosc&opt=pokaz&id=` query-string CMS; same engine as `bip.powiat-wyszkowski.pl`). Server-rendered HTML, no SPA/JS gate, no auth/CAPTCHA observed.

No dedicated ZGM/ZBM/MZBM/TBS housing-manager BIP found for Wyszków — communal-flat matters appear handled in-house by the Urząd; no `sprzedaż lokali mieszkalnych` przetarg stream exists to scrape.

## 3. Format + rendering
- **Server-rendered HTML**, in-band. Notices are full HTML text on `...&id=NNNN` pages with creation/update metadata; confirmed live via fetch of the auction, wykaz, and result pages (all plain server HTML). No PDF-only notices observed on the sampled pages (occasional born-digital PDF attachment possible → `pdfText` if encountered).
- No SPA, no auth, no CAPTCHA. Parseable with `getText` + DOM/regex.

## 4. Volume + achieved-price stream
- **Flat volume:** effectively **zero.** No `lokal mieszkalny` open-auction sales in current offers, the standing wykaz, the archive, or search — the sale stream is entirely undeveloped land + a few bezprzetargowo tenant/lot sales.
- **Land volume:** low-to-modest (a handful of land auctions/yr, several as II/III przetarg — repeats on ul. Przemysłowa building plots that keep failing to sell).
- **Achieved-price stream:** YES for land — `Informacja o wyniku przetargu` notices are published (id=22454; some record `przetarg nie dał rezultatu`). Announcement pages carry `cena wywoławcza` + `wadium`; result notices carry the hammer price / negative result. But it is a **land** price stream, not flats.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** a custom query-string PHP BIP — treat like the WordPress/custom-HTML family (ADAPTER-GUIDE §3): list board (id=56 / archive id=396) → article fetch on `...&id=NNNN` → regex/DOM parse (address via parseAddress, powierzchnia, cena wywoławcza, wadium, date, round) → second pass over result notices. Technically LOW effort *if there were flats*.
- **Blockers:** the disqualifying one — **no municipal flat-auction stream.** Gmina Wyszków disposes of land at auction and flats/lots `bezprzetargowo na rzecz najemcy`, which is out of scope for the flat-auction dataset. No dedicated housing manager to widen the net.
- **Effort:** — (not built).

**VERDICT: NO-BUILD** — clean, cloneable custom-PHP BIP with a working result-notice stream, but the municipal disposal stream is land-only (+ bezprzetargowo tenant sales); no lokale mieszkalne sold at open oral auction and no ZGM/TBS housing manager. Nothing in-scope to scrape. Re-verify only if a `sprzedaż lokali mieszkalnych w drodze przetargu` stream appears.
