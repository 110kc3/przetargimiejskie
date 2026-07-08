# Spike — Maków Mazowiecki (Mazowieckie · powiat makowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (effort —).

## TL;DR
Gmina miejska Maków Mazowiecki (Urząd Miejski, ul. Moniuszki 6) runs a **bip.net 7.32 / extranet.pl** BIP at `bip.makowmazowiecki.pl` — server-HTML + attached text-PDF. But there is **no open flat-auction stream**. The dedicated "Przetargi/Zamówienia publiczne" board carries **only public procurement** (coal miał for the municipal company JUMA, school-meal catering — no property). Municipal real-estate disposal lives on the "Ogłoszenia" board and in Zarządzenia Burmistrza, and it is **sprzedaż w drodze bezprzetargowej** (to perpetual usufructuary / adjacent owner) plus **dzierżawa/najem w drodze bezprzetargowej** wykazy — leases and no-tender sales, not `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego`. The one "Maków Mazowiecki flat auction" surfaced by search is from the **Spółdzielnia Mieszkaniowa "Jubilatka"** (a housing cooperative selling its own stock, Pułaskiego 2/27) — **not** the gmina. Textbook small-Mazowieckie-seat NO-BUILD: generic city-BIP skewing to land + bezprzetargowo + lease wykazy with ~0 open flat auctions and no results/hammer-price board.

## 1. Sells municipal property at auction?
**NO open flat auctions (and effectively no open sale auctions on the city BIP).** Findings:
- **Procurement board only.** `redir,przetargi` ("Zamówienia publiczne") lists initiated proceedings that are all **dostawy/usługi**: "Dostawa miału M1 z węgla kamiennego ... loco magazyn JUMA" (przetarg nieograniczony, 2026-05), "Przygotowanie i dostawa obiadów dwudaniowych" (zapytanie o cenę), a JUMA Sp. z o.o. coal tender. Zero real-estate sale/auction entries.
- **Property disposal = bezprzetargowo + lease.** On `74,ogloszenia`: "Informacja Burmistrza ... o wywieszeniu ... wykazu nieruchomości przeznaczonych do sprzedaży **w drodze bezprzetargowej**" (2026-07-01, działki 2691/12 i 27/2; also 2024-08, 2025-04 "na rzecz użytkownika wieczystego") and recurring "nieruchomości do oddania **w dzierżawę w drodze bezprzetargowej**" (2026-06, 2025-05, 2025-03, 2024-10 …). All PDF wykazy. No `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego`.
- **The flat auction that search returns is NOT municipal.** "przetarg nieograniczony na sprzedaż lokalu mieszkalnego, Maków Maz., Gen. Pułaskiego 2 m. 27, 29 m², 2 500 zł/m²" is the **Spółdzielnia Mieszkaniowa L-W „Jubilatka"** (kontakt SM „Jubilatka", tel. 29 717 12 65) — a cooperative disposing of its own asset, out of scope.
- **Powiat/Skarb Państwa land** (e.g. `przetarg ustny nieograniczony na sprzedaż zabudowanej nieruchomości ... działka 716`, "Wykaz nieruchomości Skarbu Państwa ... do sprzedaży w drodze przetargu") sits on the **Starostwo Powiatowe** BIP (`bip.powiat-makowski.pl`), not the gmina, and is land — separate JST, out of scope.

## 2. Where published? (hosts + boards, URLs)
**City BIP (bip.net / extranet.pl):** `https://bip.makowmazowiecki.pl/`
- Zamówienia publiczne / Przetargi (procurement only): `https://bip.makowmazowiecki.pl/redir,przetargi` (per-item `redir,przetargi?zamowienie_publiczneID=NN`).
- Ogłoszenia (property wykazy — bezprzetargowo sales + dzierżawa): `https://bip.makowmazowiecki.pl/74,ogloszenia`
- Zarządzenia Burmistrza (wykaz-issuing zarządzenia, PDF): `https://bip.makowmazowiecki.pl/97,zarzadzenia-burmistrza`
- Document/attachment pattern: `/plik,ID,nazwa.pdf`.
- Procurement also mirrored on **platformazakupowa.pl**: `https://platformazakupowa.pl/pn/makowmazowiecki/proceedings`.

**City portal (non-BIP):** `https://www.makowmazowiecki.pl/318,gospodarka-mieszkaniowa`, legacy `.../!old/158,przetargi`.
**Out of scope:** Starostwo Powiatowe `bip.powiat-makowski.pl` / `archiwalny.bip.powiat-makowski.pl/public/?id=873` (Skarb Państwa land); Spółdzielnia „Jubilatka" (cooperative flats).

Contact: Wydział Inwestycji, Spraw Komunalnych, Ochrony Środowiska, Gospodarki Nieruchomościami i Planowania Przestrzennego, ul. Moniuszki 6, 06-200 Maków Mazowiecki, tel. 29 717 10 02.

## 3. Format + rendering
- **CMS:** bip.net 7.32 (extranet.pl hosted BIP) — same family as the `bip.net(extranet.pl)→server-HTML+text-PDF` analog.
- **Rendering:** plain **server-rendered HTML** lists; individual notices/wykazy are **attached PDFs** (`/plik,...`). Announcement text is short "Informacja Burmistrza o wywieszeniu wykazu"; the substance (parcels/prices) is inside the PDF wykaz. No JS-SPA, no auth, no CAPTCHA observed. PDFs are born-digital text (`pdfText`-parseable; OCR unlikely).

## 4. Volume + achieved-price stream
- **Open flat-auction volume: ~0.** No `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` from the gmina on any board. Property flow is a handful of bezprzetargowo sale wykazy + lease wykazy per year.
- **Achieved-price / results board: NONE.** There is no "Rozstrzygnięcia / informacja o wyniku przetargu" board because there are no open sale przetargi to resolve. Bezprzetargowo sales publish only cena in the wykaz; no hammer-price stream.
- **Housing manager:** a "MZGM-TBS" (Miejski Zakład Gospodarki Mieszkaniowej – TBS) name appears in registry search and the city runs a `318,gospodarka-mieszkaniowa` page, but a TBS/ZGM here manages rental stock — it does not publish open flat-sale auctions with hammer prices. Its presence does not create auction volume.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (were it in scope):** bip.net/extranet.pl server-HTML+text-PDF family — but the disposal model here matches the **bipgov.net/Samba small-seat NO-BUILD** pattern (generic city-BIP, land + tenant/bezprzetargowo sales + lease wykazy, zero open flat auctions), not a housing-manager auction city.
- **Effort:** **—** (no adapter warranted). Building would harvest lease/bezprzetargowo wykazy with no open flat auctions and no achieved-price stream — off-target for the dataset.
- **Blockers:** the fundamental one — **no product**: the gmina does not sell flats at open auction; residential disposal is bezprzetargowo (na rzecz najemcy/użytkownika wieczystego) or lease. Reachable and technically trivial to scrape, but nothing worth scraping.

**VERDICT: NO-BUILD** — clean, reachable bip.net BIP, but ~0 open municipal flat auctions: property disposal is sprzedaż bezprzetargowa + dzierżawa/najem wykazy, the only flat "auction" is a housing cooperative (Jubilatka), and there is no results/hammer-price board.
