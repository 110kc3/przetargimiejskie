# Spike — Pajęczno (Łódzkie · powiat pajęczański)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Pajęczno (Urząd Miejski, gmina miejsko-wiejska seat) **does sell municipal flats at open auction** — confirmed live, not a NO-BUILD land/tenant case. On the day of this spike **three concurrent** *pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* notices were live (ul. Rekreacyjnej 7/20, ul. Rekreacyjnej 3/10, ul. Małej 1/18), all published 15-05-2026, auctions 17-06-2026, with real market start prices (e.g. 220 000 zł net for 30 m²) and 10% wadium — these are genuine open auctions, not *bezprzetargowo na rzecz najemcy*. Two publishing surfaces: the **Sulimo** city portal `www.pajeczno.pl` (clean server-HTML, full-text notices, `/n,ID,slug.html`, dedicated *Ogłoszenia o sprzedaży nieruchomości* board) and the **e-bip.pl** (ABC PRO) BIP `www.e-bip.pl/start/76`, which even carries a dedicated category *Sprzedaż lokali mieszkalnych wraz z udziałem w gruncie* (6 archived). Volume is small but genuinely recurring (wykaz → przetarg pipeline). No SPA / auth / OCR blocker: auction notices are full HTML text; PDFs are supplementary scans. Closest analog: a small server-HTML custom municipal portal (brzeg / nowa-sol class) — clone the list→article HTML crawl.

## 1. Sells municipal property at auction?
**YES — confirmed, flats included.** The Burmistrz Pajęczna runs *przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* for municipal flats. Live-confirmed flat auctions (all "pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego", published 15-05-2026, auction 17-06-2026):
- **ul. Rekreacyjnej 7, lokal nr 20** — III piętro, 1 pokój + kuchnia + przedpokój + łazienka, pow. użytkowa **30,00 m²** + piwnica 2,0 m², udział 0,0320; **cena wywoławcza 220 000,00 zł netto**, wadium 22 000,00 zł (do 10-06-2026). (`n,410660`)
- **ul. Rekreacyjnej 3, lokal nr 10** — I piętro, pow. użytkowa 25,80 m². (`n,410661`)
- **ul. Małej 1, lokal nr 18** — II piętro, pow. użytkowa 32,80 m². (`n,410662`)

Pipeline confirmed: **Ogłoszenie Burmistrza z 31-03-2026** = *wykaz nieruchomości lokalowych przeznaczonych do sprzedaży w trybie przetargu ustnego nieograniczonego* — 3 residential units listed (the 3 flats above). So the cycle is wykaz (list) → przetarg ustny nieograniczony (auction). The board also carries land (6 działki, Niwiska Dolne) and, on the BIP, najem/dzierżawa — but flats are a first-class, recurring, OPEN-auction category, not tenant-only disposal. Both natural and legal persons bid; 10% wadium.

## 2. Where published? (hosts + boards, URLs)
**Primary — city portal (Sulimo CMS), best adapter target:**
- Board *Ogłoszenia o sprzedaży nieruchomości*: `https://www.pajeczno.pl/informator/ogloszenia-o-sprzedazy-nieruchomosci/`
- Article URL pattern: `/informator/ogloszenia-o-sprzedazy-nieruchomosci/n,{ID},{slug}.html`
  - e.g. `.../n,410660,...rekreacyjnej-7...html`, `n,410661` (Rekreacyjnej 3), `n,410662` (Małej 1), `n,400452` (wykaz 31-03-2026).
- `pajeczno.pl` and `www.pajeczno.pl` are the **same** Sulimo portal (assets on `cdn02.sulimo.pl`).

**Secondary — official BIP (e-bip.pl / ABC PRO Sp. z o.o.):**
- BIP root: `https://www.e-bip.pl/start/76`
- *GOSPODARKA NIERUCHOMOŚCIAMI — Ogłoszenia dot. sprzedaży, najmu i dzierżawy nieruchomości Gminy Pajęczno*: `https://www.e-bip.pl/Start/76/InformationModule/1620`
  - Sub-categories with counts (current / archived): **Sprzedaż lokali mieszkalnych wraz z udziałem w gruncie** (0 / **6**), Sprzedaż działek (19 / 19), Najem, dzierżawa (1 / 15). The dedicated flat category = a clean filter for the target.
- Zamówienia publiczne (procurement, out of scope): `https://www.e-bip.pl/start/76/PublicOrders`.

Contact: Referat Nadzoru Komunalnego, Gospodarowania Nieruchomościami Gminy, Ochrony Środowiska i Rolnictwa; Urząd Miejski w Pajęcznie, ul. Parkowa 8/12, pok. 103.
(Do NOT confuse with `powiatpajeczno.biuletyn.net` — that is Starostwo Powiatowe / Powiat Pajęczański, separate JST, out of scope.)

## 3. Format + rendering
- **Server-rendered HTML on both hosts** — no JS SPA, no auth, no CAPTCHA observed.
- **Sulimo portal:** individual przetarg notices are **full HTML text** — every needed field (address, powierzchnia użytkowa, cena wywoławcza, wadium, date/time, round) is inline in the article body (verified on `n,410660`). Each notice also attaches a **scanned PDF** (e.g. `Ogloszenie_przetarg_ustny_...Rekreacyjna_7_m_20.pdf`, ~3.09 MB → clearly a scan) — **supplementary, not needed** because the HTML already carries the text. OCR avoidable.
- **wykaz** notices carry only an HTML preamble; the actual table is a scanned PDF (`Ogloszenie_Burmistrza_z_dnia_31_03_2026_r.pdf`, 1.82 MB). Optional to parse — the per-flat auction notices are the primary data and are HTML.
- **e-bip.pl BIP:** server-rendered ASP.NET (PostBack nav, `InformationModule` paths), categorized; server HTML.

## 4. Volume + achieved-price stream
- **Volume:** Small but genuinely recurring. Live now: **3 first-round flat auctions** (17-06-2026) + a matching 31-03-2026 wykaz + **6 archived flat sales** in the BIP's dedicated *lokale mieszkalne* category. For a small Łódzkie gmina miejsko-wiejska this is an unusually healthy open-flat stream (many peers show ~0). Expect a handful of flats + several land parcels per year, with II/III przetarg repeats when unsold.
- **Achieved-price (hammer) stream:** **Weak / not confirmed.** No dedicated *wynik przetargu* results board was found, and a targeted search for "Pajęczno informacja o wyniku przetargu lokal" returned nothing specific. **cena wywoławcza (start price) is fully present** in every HTML notice; any *informacja o wyniku* would land on the same board and can be swept opportunistically. Treat achieved-price as best-effort, start-price as the reliable field. This is the only real weakness, and it does not sink the build.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** small **server-HTML custom municipal portal** — **brzeg / nowa-sol / bochnia** class (dated list board → article fetch → regex/DOM parse). Sulimo's `/n,{ID},{slug}.html` news pattern with a `/informator/ogloszenia-o-sprzedazy-nieruchomosci/` board is a clean, easy shape; the `e-bip.pl` (ABC PRO) BIP is a categorized cross-source/fallback.
- **CMS family:** Sulimo (city portal, server-HTML) + e-bip.pl / ABC PRO (BIP, ASP.NET server-HTML). Neither is in the standard analog roster; both are plain server-HTML, ADAPTER-GUIDE §3 "custom/WordPress HTML" family.
- **Effort:** **LOW.** Crawl the Sulimo board list → fetch each `n,ID` article → parse HTML (parseAddress; powierzchnia użytkowa, cena wywoławcza, wadium, date, round, `sprzedaż lokalu mieszkalnego` classifier). Drop land/dzierżawa/wykaz. Optionally cross-check the BIP `InformationModule/1620` flat category for backfill (6 archived). No OCR needed for auctions; no SPA/auth/rate-limit signals.
- **Blockers:** None technical. Watch-items: (a) no confirmed hammer-price results board (start prices only, reliably); (b) two portals — prefer Sulimo for full-text HTML, use e-bip.pl category as the tidy filter/backfill; (c) wykaz tables are scanned PDFs (skip or OCR only if list-level data is wanted).

**VERDICT: BUILD (Low effort)** — recurring OPEN flat auctions (*przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego*) on a clean Sulimo server-HTML portal with full-text notices and a dedicated BIP flat category; small volume, start-price stream solid, only hammer-price results uncertain. No technical blockers.
