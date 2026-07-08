# Spike — Lipno (Kujawsko-pomorskie · powiat lipnowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (leases + wykaz only; no open flat-sale auction stream).

## TL;DR
Miasto Lipno (Urząd Miejski, Plac Dekerta 8, 87-600 Lipno) does **not** publish a recurring "przetarg ustny na sprzedaż lokalu mieszkalnego" stream. Its BIP `umlipno.bipgov.net` (bipgov.net / Samba-AnaCom CMS, server HTML) carries: a **/przetargi** board dominated by public-procurement (roads, waste, thermomodernisation) plus the occasional **dzierżawa/najem** (lease) auction; a **wykaz** (sale-designation list) of residential+land properties; and a general **/ogłoszenia** board of council/admin notices. No actual open auctions to SELL a flat were found across the przetargi board, the ogłoszenia board, or search. Residential disposal here skews to sitting-tenant (bezprzetargowo) + wykaz designations + leases — the classic generic-small-city pattern with no dedicated housing-manager auction stream. NO-BUILD.

## 1. Sells municipal property at auction?
**Not as open flat auctions.** The Burmistrz Miasta Lipna manages municipal property, but the auction activity that reaches the BIP is:
- **Lease auctions** — e.g. "przetarg ustny nieograniczony na najem lokali użytkowych" (22.05.2026). (najem = rental, out of scope.)
- **Sale designations (wykaz)** — menu item "Wykaz nieruchomości lokalowych i gruntowych przeznaczonych do sprzedaży" (a designation list, **not** an auction; typically resolves to tenant/bezprzetargowo sales or later land przetargi).
- No **"przetarg ustny na sprzedaż lokalu mieszkalnego"** appears on any board checked. The /przetargi board (100+ items) was ~all zamówienia publiczne + 1 lease; /ogłoszenia was council-sessions + admin notices (0 flat sales).

This matches the project heuristic: a generic city-BIP property section skewing to land + tenant sales + leases, with no ZGM/ZBM/MZBM housing manager running open flat auctions.

## 2. Where published? (hosts + boards, URLs)
**Target city BIP (Miasto Lipno, 87-600):** `https://umlipno.bipgov.net/`
- Przetargi (procurement + occasional lease): `https://umlipno.bipgov.net/przetargi.html`
- Ogłoszenia (council/admin notices): `https://umlipno.bipgov.net/ogloszenia.html`
- Wydziały / Gospodarka nieruchomościami: `https://umlipno.bipgov.net/p,wydzialy,38,39.html`
- Attachments under `/userfiles/...pdf`.

**Do NOT confuse** with the other Lipno JSTs (all separate, out of scope for this seat):
- **Gmina Lipno** (rural, kuj-pom) — `bip.uglipno.pl` / `uglipno.pl`.
- **Powiat Lipnowski** — `bip.lipnowski.powiat.pl`.
- Unrelated same-name places surfaced by search: **Lipiany** (zachodniopomorskie, `bip.lipiany.pl`) and **Gmina Lipno** in Wielkopolska (`lipno.pl`, 64-111) — ignore.

## 3. Format + rendering
- **Server-rendered HTML** — bipgov.net "Samba-AnaCom" municipal BIP template. Dated lists, `p,<name>,<id>.html` / `<name>.html` URLs, PDF attachments under `/userfiles/`. No SPA/auth. (Format is fine to parse — the problem is the absence of flat-sale content, not the tech.)

## 4. Volume + achieved-price stream
- **Open flat-auction volume:** effectively **zero** observed. Lease auctions + wykaz designations only.
- **Achieved-price stream:** N/A — no flat-sale auctions → no cena osiągnięta stream to harvest.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Analog:** would be a bipgov.net/Samba-AnaCom HTML BIP, but moot — no flat-sale stream to build against.
- **Verdict driver:** the three load-bearing questions fail Q1 (no municipal flat SALE auctions), so Q2/Q3 (host known, HTML parseable) don't rescue it.
- **Re-check trigger:** if a future wykaz entry converts to an actual "przetarg ustny na sprzedaż lokalu mieszkalnego" on the przetargi board, re-open as VERIFY. For now the stream doesn't exist.

**VERDICT: NO-BUILD** — Miasto Lipno's BIP publishes lease (dzierżawa/najem) auctions and wykaz sale-designation lists only; no recurring open flat-sale auction stream, so no parseable achieved-price flat data to extract.
