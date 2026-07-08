# Spike — Opole Lubelskie (Lubelskie · powiat opolski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (effort —).

## TL;DR
Gmina Opole Lubelskie (Urząd Miejski, Burmistrz) is a small lubelskie seat. It **does** dispose of municipal property via *przetarg ustny nieograniczony na sprzedaż*, and a genuine open **lokal mieszkalny** auction is confirmed (lokal nr 2, Stare Komaszyce 38, 35,02 m², własność Gminy Opole Lubelskie). But the disposal stream is overwhelmingly **land/grunty + KOWR-agricultural + a few lokale użytkowe** — flat auctions are effectively ~1 in ~2 years. There is **no municipal housing manager** (no ZGM/ZBM/MZBM/TBS); the gmina sells directly. Published on the standard **Wrota Lubelszczyzny** BIP `umopolelubelskie.bip.lubelskie.pl` (bip.lubelskie.pl CMS: DataTables board + born-digital PDF ogłoszenia), plus a marketing mirror on the official serwis `opolelubelskie.pl`. Closest analog: the generic **bip.lubelskie.pl / Wrota Lubelszczyzny** NO-BUILD pattern seen across lubelskie seats. Open-flat-auction volume is far below the BUILD threshold → **NO-BUILD**.

## 1. Sells municipal property at auction?
**YES for property in general; effectively NO for flats at volume.** The Burmistrz Opola Lubelskiego runs `I/II przetarg ustny nieograniczony na sprzedaż nieruchomości`, held at Urząd Miejski, ul. Lubelska 4, sala konferencyjna (parter). Confirmed disposals:
- **Lokal mieszkalny nr 2, Stare Komaszyce 38** — I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego, 35,02 m² + udział w częściach wspólnych i w gruncie, własność Gminy (wadium płatne do 18.08.2021; re-listed later). This is the ONLY genuine open flat-sale auction surfaced.
- Land examples: dz. 337/7 ul. Cmentarna (0,1299 ha, cena wyw. 30 000 zł, wadium 3 000 zł, przetarg 06.11.2020); dz. 645 (0,0128 ha, przetarg 18.12.2025); dz. 132 Stare Komaszyce (0,56 ha).
- Independent aggregator (adradar, ~06/2024–03/2026, mixed sources incl. KOWR): **~9 land, ~4 lokal użytkowy, 1 house, 1 flat**. Residential flats ≈ 7% of an already-thin stream.

No housing manager was found (no ZGM/ZBM/MZBM/ZGL/TBS entity). Flat disposals are one-off, mostly rural inherited units (Stare Komaszyce), not a recurring townhouse-flat pipeline.

## 2. Where published? (hosts + boards, URLs)
**Primary — Wrota Lubelszczyzny BIP (bip.lubelskie.pl CMS):** `https://umopolelubelskie.bip.lubelskie.pl`
- Przetargi na zbycie nieruchomości: `https://umopolelubelskie.bip.lubelskie.pl/index.php?id=326`
- Ogłoszenie wykazu nieruchomości (wykaz lists): `https://umopolelubelskie.bip.lubelskie.pl/index.php?id=327`
- Przetargi (general board, statuses aktualne/archiwalne/unieważnione/rozstrzygnięte): `https://umopolelubelskie.bip.lubelskie.pl/index.php?id=83`
- Detail-page pattern: `.../index.php?id=83&p1=szczegoly&p2=NNNNN` (e.g. `&p2=71992`, `&p2=71991`, `&p2=71990`).

**Secondary — official serwis (marketing mirror, links back to BIP):** `https://opolelubelskie.pl`
- `https://opolelubelskie.pl/aktualnosc/og%C5%82oszenia-o-przetargach` and `/aktualnosc/og%C5%82oszenie-o-przetargu-N` — teaser cards whose "więcej" links resolve to `umopolelubelskie.bip.lubelskie.pl/index.php?id=83&p1=szczegoly&p2=...`.

Contact: sekretariat@opolelubelskie.pl, tel. +48 81 827-72-01, ul. Lubelska 4. (NB: do not confuse with **Opole** in opolskie — `bip.um.opole.pl` — a different, much larger city.)

## 3. Format + rendering
- **CMS:** bip.lubelskie.pl / **Wrota Lubelszczyzny** hosted BIP (regional multi-tenant platform).
- **Board:** server-rendered HTML table with a **DataTables**-style filter widget (Lp / Symbol przetargu / Data ogłoszenia / Tytuł / Termin składania ofert / Opcje) and status tabs. Rows are JS/DataTables-populated — a plain markdown fetch of `id=326` returned the header shell with empty rows (classic DataTables JSON hydration).
- **Detail page:** the announcement body **is** server-rendered HTML (address, plot, powierzchnia, cena wywoławcza, wadium, date/time all inline) **plus** an attached **born-digital text PDF** ("Ogłoszenie o przetargu"). No scan/OCR needed; no auth/CAPTCHA observed.
- So: **server-HTML detail + DataTables JSON list + born-digital PDF attachment.**

## 4. Volume + achieved-price stream
- **Open flat auctions:** ~1 confirmed over multiple years (Stare Komaszyce 38). Far below any recurring threshold — this is the "~0 open flat auctions" NO-BUILD profile.
- **Overall property auctions:** thin — a handful/year, dominated by land (municipal + KOWR agricultural) and occasional lokale użytkowe.
- **Achieved-price stream:** the general board exposes a **"rozstrzygnięte"** status filter (informacja o wyniku), so hammer prices exist in principle, but flat-specific results are essentially non-existent given the volume. adradar reports the single flat at ~177 500 zł. No dedicated, populated results board worth an adapter.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** generic **bip.lubelskie.pl / Wrota Lubelszczyzny** lubelskie seat (DataTables board + PDF ogłoszenia) — the pattern flagged as *often NO-BUILD*. Same platform as neighbouring lubelskie gmina BIPs.
- **Technical effort (if built):** Medium — DataTables JSON endpoint for the `id=326`/`id=83` board + `pdfText` on born-digital ogłoszenie PDFs, with heavy classification to strip land/KOWR/dzierżawa/lokal użytkowy. But it would yield ~1 flat every couple of years.
- **Blockers to value (not tech):** negligible open-flat-auction volume; no housing manager; no meaningful flat achieved-price stream; disposal skews to land + tenant/commercial. Nothing here clears the BUILD heuristic (recurring OPEN flat-sale auctions + manager and/or hammer-price results board).

**VERDICT: NO-BUILD** — Wrota Lubelszczyzny city BIP with a thin, land-dominated disposal stream and ~1 open flat auction in years; no ZGM/TBS, no populated flat results board. Effort would be Medium for near-zero flat yield — not worth an adapter.

```json
{"city_slug":"opole-lubelskie","voivodeship":"lubelskie","powiat_slug":"powiat-opolski","status":"no-build","effort":"—","confidence":"LIVE","note":"no housing manager; Wrota Lubelszczyzny bip.lubelskie.pl DataTables board id=326/id=83 + born-digital PDF; ~1 open flat auction (Stare Komaszyce 38) in years, stream is land+KOWR+lokal uzytkowy; generic lubelskie NO-BUILD analog","host":"umopolelubelskie.bip.lubelskie.pl","cms":"bip.lubelskie.pl / Wrota Lubelszczyzny"}
```
