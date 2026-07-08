# Spike — Pyrzyce (Zachodniopomorskie · powiat pyrzycki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD — land/vehicle auctions only; flats disposed bezprzetargowo to sitting tenants.

## TL;DR
Gmina Pyrzyce (Urząd Miejski w Pyrzycach, Burmistrz Pyrzyc) does run *ustne przetargi nieograniczone* — but only for **land** (nieruchomości niezabudowane/zabudowane, działki) and **movable property** (a much-recycled ROSENBAUER fire truck). Across the full 2024 and 2025 auction boards there are **zero `sprzedaż lokalu mieszkalnego` open auctions**. Municipal **flats are disposed off-auction** (`bezprzetargowo na rzecz najemcy`) via wykazy — e.g. Wykaz nr 18/2026 (Apr 2026) sells a lokal mieszkalny to the sitting tenant. The BIP is a government-hosted `bip.pyrzyce.um.gov.pl` platform (article/`dokumenty`/`pliki` URL scheme, plus a structured `/nieruchomosci` real-estate module that is currently empty). Server-rendered HTML, but bot-UA gated (403 without a browser UA). There IS an in-band achieved-price stream ("INFORMACJA … dotycząca wyniku … przetargu"), but only for land. Open flat-auction volume ≈ 0/yr → NO-BUILD.

## 1. Sells municipal property at auction?
**YES for land/movables, NO for flats.** The Burmistrz Pyrzyc issues zarządzenia ogłaszające `I/II ustny przetarg nieograniczony … na sprzedaż nieruchomości stanowiącej własność Gminy Pyrzyce` — but every confirmed instance is a **działka / nieruchomość** or a fire truck, never a lokal mieszkalny.

Evidence from the yearly auction boards (both fetched live):
- **Przetargi 2025 r** — 4 items total: działka 92/8 Giżyn, działka 92/7 Giżyn, działka 72/3 Okunica (all `I ustny przetarg nieograniczony na sprzedaż nieruchomości`), + VIII przetarg on the ROSENBAUER fire truck. **No flats.**
- **Przetargi 2024 r** — land auctions (I/II ustny przetarg nieograniczony + one ustny przetarg **ograniczony** on `sprzedaż nieruchomości`), the same fire truck (przetargi II–VI), and a result notice `INFORMACJA … dotycząca wyniku pierwszego ustnego przetargu nieograniczonego na sprzedaż nieruchomości zabudowanej, działka nr 18/9`. **No flats.**

Flats reach the market **off-auction**: the WebSearch surfaced **Wykaz nr 18/2026** (13 Apr 2026) — a lokal mieszkalny owned by Gmina Pyrzyce designated for sale `bezprzetargowo` to the current najemca (sitting tenant). That is the flat-disposal channel here — no open oral auction for flats.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (government `*.um.gov.pl` platform):** host `bip.pyrzyce.um.gov.pl`.
- Yearly auction board 2025: `https://bip.pyrzyce.um.gov.pl/artykul/przetargi-2025-r`
- Yearly auction board 2024: `https://bip.pyrzyce.um.gov.pl/artykul/przetargi-2024-r`
- "Pozostałe przetargi" parent board: `https://bip.pyrzyce.um.gov.pl/artykul/pozostale-przetargi`
- Single "Informacja o przetargu" article (ODT attachment): `https://bip.pyrzyce.um.gov.pl/artykul/informacja-o-przetargu`
- **Structured real-estate module "Obrót nieruchomościami":** `https://bip.pyrzyce.um.gov.pl/nieruchomosci` — has tabs Archiwalne / Bieżące / Przyszłe and a filter (`Typ nieruchomości`: Lokal mieszkalny / Lokal użytkowy / Nieruchomość …; `Rodzaj transakcji`: Sprzedaż / … ) posting to `/szukaj`. On the spike day **all three tab panels and the "oczekujące na przetarg" list were empty** — the register carried no active/future/archived property auctions.
- Document detail URL shape: `/dokumenty/<id>` (e.g. `/dokumenty/9171`, `/dokumenty/356`); attachments `/pliki/pyrzyce/zalaczniki/<id>/<file>` (e.g. the `informacja-o-przetargu.odt`).
- Aktualności mirror on the town portal: `https://pyrzyce.um.gov.pl/aktualnosci/dzial/125`.

**CMS family:** bespoke government-hosted BIP on the `*.um.gov.pl` platform — `/artykul/<slug>` boards, `/dokumenty/<id>` documents, `/pliki/<slug>/zalaczniki/<id>/…` attachments, `/szukaj` search, "eWrota / BIPy jednostek". Server-HTML article/dokument family (like the WordPress/custom-HTML analogs in ADAPTER-GUIDE §3), NOT one of the standard analogs.

**Do NOT confuse** with the powiat: `bip.pyrzyce.pl` / `www.pyrzyce.pl` = **Starostwo Powiatowe w Pyrzycach** (county, separate JST — out of scope). Our target is the town **Gmina Miejska Pyrzyce** at `bip.pyrzyce.um.gov.pl`. No separate ZGM/ZBM/TBS housing-manager BIP surfaced; the gmina has an SIM (Społeczna Inicjatywa Mieszkaniowa) rental programme, not a flat-sale-at-auction stream.

## 3. Format + rendering
- **Server-rendered HTML** — board pages are `<main>` article lists with title + publication timestamp; individual notices are HTML documents at `/dokumenty/<id>` plus ODT/PDF attachments under `/pliki/…/zalaczniki/`.
- **Bot-UA gated:** WebFetch returned **HTTP 403**; a browser User-Agent via curl succeeds. An adapter would need a browser UA (like bytom/wejherowo).
- **No SPA for the boards** (server HTML). The `/nieruchomosci` obrót module renders tab panels server-side but was empty; a real build would depend on that module actually being populated, which it isn't.
- No CAPTCHA/auth beyond the UA gate.

## 4. Volume + achieved-price stream
- **Open flat auctions/year: ≈ 0.** 2024 + 2025 boards combined show land auctions (a handful/yr) + one endlessly-repeated fire-truck sale; **no lokal mieszkalny auctions**. Flats leave the stock `bezprzetargowo` to tenants (wykazy).
- **Achieved-price stream: YES but land-only.** Result notices are published in-band on the same boards (`INFORMACJA BURMISTRZA PYRZYC … dotycząca wyniku … ustnego przetargu nieograniczonego na sprzedaż nieruchomości …`). Useful for land, irrelevant for the flat dataset we target.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** a WordPress/custom-HTML server-HTML gmina board (ADAPTER-GUIDE §3 "WordPress / custom HTML" row) with a browser-UA fetch — but the `um.gov.pl` `/artykul`+`/dokumenty` scheme has no existing analog and would need its own crawl.
- **Effort:** — (not applicable; no-build).
- **Blockers / why NO-BUILD:** the load-bearing signal — recurring OPEN flat-sale auctions — is absent. Municipal flats are sold off-auction to sitting tenants; only land + a fire truck reach open oral auction. Building here would yield essentially no `lokal mieszkalny` records. Re-check in a year only if the `/nieruchomosci` module starts carrying `Lokal mieszkalny / Sprzedaż` auction entries.

**VERDICT: NO-BUILD** — Gmina Pyrzyce auctions only land + movables at open oral przetarg; flats are disposed `bezprzetargowo na rzecz najemcy` (Wykaz 18/2026). 2024–2025 boards on `bip.pyrzyce.um.gov.pl` show zero flat auctions; ~0 open flat-auction volume/yr.
