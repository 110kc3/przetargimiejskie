# Spike — Sławno (Zachodniopomorskie · powiat sławieński)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miasto Sławno (Urząd Miejski, Burmistrz Miasta Sławno) runs a clean, structured **Logonet** BIP at `bip.slawno.pl` with a dedicated `przetarg-nieruchomosci` registry — labeled fields (Typ przetargu, Rodzaj nieruchomości, Cena wywoławcza, Data przetargu, Wadium), pure server-rendered HTML, ideal to scrape. The problem is scope, not technique: the entire property-auction stream is **land**. Across the whole registry (57 auctions, dates 2023→2026) exactly **1 is a lokal mieszkalny** (Gdańska 25/4, cena wyw. 38.000 zł, przetarg 29.08.2023) and 1 a lokal użytkowy (Matejki 14/5) — the other 55 are działki. No dedicated municipal housing-manager auction board; flats are handled by the UM Wydział and go overwhelmingly *bezprzetargowo na rzecz najemcy*. There is **no achieved-price (cena osiągnięta) stream** on the registry — announcements carry cena wywoławcza only, no wyniki board. Recurring open flat auctions ≈ 0/yr → NO-BUILD on the flat criterion, despite an otherwise best-case scrapeable source.

## 1. Sells municipal property at auction?
**YES for land; effectively NO for flats.** Burmistrz Miasta Sławno runs *ustny przetarg nieograniczony* for sale of municipal property, confirmed live on the structured registry. But the mix is almost entirely land:
- **55 działki** (e.g. ul. Chełmońskiego, Pocztowa, Al. Zachodnia, Dworcowa, Leśna, Polanowska, Iwaszkiewicza) — the bulk of the stream.
- **1 lokal mieszkalny** — "Lokal mieszkalny nr 4, pow. 20,66 m², ul. Gdańska 25": Typ przetargu = **Przetarg ustny nieograniczony**, Rodzaj = Lokal mieszkaniowy, Cena wywoławcza 38.000,00 zł, Data przetargu 29.08.2023 10:00. Fully confirmed open oral flat auction — but a one-off.
- **1 lokal użytkowy** — ul. Matejki 14/5.
- On the decommissioned legacy host (see §2) an older flat auction is indexed (ul. Rapackiego 3/7, ~19 m²) — again isolated, years apart.

So open flat auctions occur roughly **once every few years**; the recurring, high-volume municipal stream is land + occasional lokal użytkowy. Flats are otherwise disposed of bezprzetargowo to sitting tenants. Fails the "recurring open flat-sale auction" test.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Logonet CMS, current authoritative host):** `https://bip.slawno.pl`
- Property-auction registry / board: `https://bip.slawno.pl/artykuly/nieruchomosci-na-sprzedaz` (paginated `?page=2`…`?page=6`).
- Individual auction detail: `https://bip.slawno.pl/przetarg-nieruchomosci/<slug>` — e.g. the flat: `https://bip.slawno.pl/przetarg-nieruchomosci/lokal-mieszkalny-nr-4-o-pow-20-66-m2-ul-gdanska-25`.
- Tablica ogłoszeń: `https://bip.slawno.pl/artykuly/tablica-ogloszen`; Zamówienia publiczne (procurement, out of scope): `https://bip.slawno.pl/artykuly/zamowienia-publiczne` (`/przetarg/p-...` slugs).
- Site search (POST): `https://bip.slawno.pl/szukaj`. CMS footer: **"CMS i hosting: Logonet Sp. z o.o. w Bydgoszczy"**.

**Legacy host (decommissioned):** `http://um.slawno.ibip.pl` (ibip.pl / ZETO Koszalin) — now returns *"BIP został zablokowany"* on `?id=` pages (e.g. old flat id=93065, archiwum id=111708). Do not target; superseded by `bip.slawno.pl`.

**Do NOT confuse:**
- Rural **Gmina Sławno** (separate JST, wójt) → `http://ug.slawno.ibip.pl` (still on ibip.pl). Out of scope.
- **Powiat sławieński** (Starostwo) → `https://bip.powiatslawno.pl`. Out of scope.
- Sławno in wielkopolskie/łódzkie — unrelated.

## 3. Format + rendering
- **Server-rendered HTML, structured** — Logonet `przetarg-nieruchomosci` module. Each detail page exposes labeled fields (Typ przetargu, Rodzaj nieruchomości, Cena wywoławcza, Data przetargu, Wadium, address in the slug + body). No JS gate, no auth, no CAPTCHA. Confirmed live via curl.
- Board is filterable (Typ przetargu incl. *Przetarg ustny nieograniczony*; Rodzaj incl. *Lokal mieszkaniowy / użytkowy / niezabudowana / zabudowana*; Rok publikacji 2022+) — but filters POST to `/szukaj`; the plain paginated board (`?page=N`) already lists every auction, so no form logic needed.
- **No PDF dependency** for the core notice; full text is inline HTML. (HTTPS cert on the legacy `*.ibip.pl` host mismatches `bip3.ibip.pl` — moot, that host is dead.)

## 4. Volume + achieved-price stream
- **Flat volume:** ~**0–1 open flat auction over the full 2023→2026 registry** (1 lokal mieszkalny + 1 lokal użytkowy vs 55 działki). Effectively zero recurring flat volume.
- **Land volume:** healthy — ~55 land auctions over ~3.5 years (~15/yr), if the project scope ever went land-inclusive.
- **Achieved-price stream:** **NO.** The registry publishes cena **wywoławcza** only; no cena osiągnięta / nabywca field on detail pages and no separate "informacja o wyniku przetargu" board found (site search returns none). No hammer-price data.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** a Logonet structured-registry BIP (same `/przetarg-nieruchomosci/<slug>` + `/artykuly/<board>?page=N` shape). Technically the *easiest* class of source we've seen — labeled fields, no PDF, no OCR.
- **Effort IF flats were in scope:** LOW. But flat throughput is ~0/yr, so a flat-only adapter would extract essentially one record.
- **Blockers to a useful flat build:** the data itself — municipal flats are sold bezprzetargowo to tenants, not at open auction; and there is no achieved-price stream. Both of the project's value signals (recurring open flat auctions; cena osiągnięta) are absent.

**VERDICT: NO-BUILD** — Miasto Sławno's open-auction stream is ~99% land (55/57 registry entries); open flat auctions occur roughly once every few years and there is no cena-osiągnięta stream. The `bip.slawno.pl` Logonet registry is a best-case scrapeable source, so revisit as a trivial **Low-effort** build only if/when scope broadens to municipal land sales; on the current flat-centric criterion it fails.
