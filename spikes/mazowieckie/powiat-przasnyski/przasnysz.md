# Spike — Przasnysz (Mazowieckie · powiat przasnyski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (effort —).

## TL;DR
Gmina Miasta Przasnysza (Burmistrz Przasnysza) does run `ustny przetarg nieograniczony`, but the whole property stream is **land + cemetery-stall leases + one commercial-premises lease** — **zero open-auction sales of lokale mieszkalne**. The town BIP `przasnysz.biuletyn.net` (CMS-BIP 3.0 / biuletyn.net = bip.net/extranet.pl family, server-HTML + text/inline notices) has a single board "Przetargi na zbycie i najem nieruchomości" (cid=1128) whose live+archive contents are: sale of unbuilt/land parcels (ul. Przyjemna, ul. Szpitalna), dzierżawa of land (Sieraków), and udostępnienie/dzierżawa of market stalls at the cemetery, plus a `najem lokalu użytkowego` (Rynek 1). The only *flat* auctions in Przasnysz belong to the **private housing co-op** "ZWAREK" (Spółdzielnia Mieszkaniowa Lokatorsko-Własnościowa) — ustanowienie odrębnej własności lokalu for member units, held at the MZGKiM building — **not** municipal disposals. Municipal flats here go **bezprzetargowo na rzecz najemcy**. No results/rozstrzygnięcia board, no hammer-price stream. Textbook small-Mazowieckie NO-BUILD. Closest CMS analog (if it were ever built): bip.net/biuletyn.net server-HTML towns.

## 1. Sells municipal property at auction?
**Land — YES. Flats — NO.** The Burmistrz of the **town** (Gmina Miasta Przasnysza, distinct from the rural Gmina Przasnysz) runs `przetarg ustny nieograniczony`, but every notice on the property board is land or a lease:
- "Ogłoszenie o pierwszym/drugim przetargu ustnym nieograniczonym na **sprzedaż nieruchomości**, położonej w Przasnyszu przy **ul. Przyjemnej**" — land.
- "Ogłoszenie o pierwszym przetargu ustnym nieograniczonym na **sprzedaż nieruchomości**, położonej w Przasnyszu przy **ul. Szpitalnej**" — land.
- "Burmistrz Przasnysza ogłasza I ustny przetarg **ograniczony do właścicieli działek sąsiednich** na sprzedaż nieruchomości" — restricted land sale (not open).
- "Ogłoszenie o pierwszym przetargu ustnym nieograniczonym na **dzierżawę** części nieruchomości, położonej w **Sierakowie**" — land lease.
- Multiple "…na **dzierżawę / udostępnienie miejsc handlowych** przy cmentarzu komunalnym/parafialnym" — cemetery market-stall leases.
- "Burmistrz Przasnysza ogłasza II ustny przetarg nieograniczony na **najem lokalu użytkowego**, ul. Rynek 1" (art. 7733) — commercial-premises lease.

**No `sprzedaż lokalu mieszkalnego` from the town appears anywhere** (live board or archive). The recurring "lokal mieszkalny" auctions found in Przasnysz are the **Spółdzielnia Mieszkaniowa "ZWAREK"** co-op auctions (e.g. lokal nr 50, ul. Osiedlowa 3, cena 174 530 zł, 2025; lokal nr 62, 2024) — a private co-op establishing separate ownership of its own units, hosted at MZGKiM's building (ul. Kacza 9). Those are **not** gmina disposals. Municipal stock (mieszkania komunalne) is disposed to sitting tenants bezprzetargowo.

## 2. Where published? (hosts + boards, URLs)
**Target = TOWN (Gmina Miasta Przasnysza):**
- Property auction board: `http://przasnysz.biuletyn.net/?bip=1&cid=1128&bsc=N` (bieżące) / `&bsc=T` (archiwum) — "Przetargi na zbycie i najem nieruchomości".
- Article URL pattern: `http://przasnysz.biuletyn.net/?bip=2&cid=1128&id=NNNN` (e.g. id=7733 Rynek 1 najem). Recent article ids on this board: 8542, 9194, 9216, 9527, 9896, 10021, 10145, 10336, 10463, 11074.
- Public-facing mirror / news: `https://przasnysz.um.gov.pl/asp/...` (gov.pl "Aktualności", same content).
- No dedicated "Rozstrzygnięcia / informacja o wyniku przetargu" board found — results, when posted, land inline on cid=1128.

**Do NOT confuse (out of scope):**
- `www.bip.przasnysz.pl` / `www.przasnysz.pl` — rural **Gmina Przasnysz** (Wójt), a separate JST.
- `bip.powiat-przasnysz.pl` / `powiat-przasnysz.pl` — **Starostwo Powiatowe** (county).
- `mzgkimprzasnysz.pl` — MZGKiM (municipal water/sewage/waste + housing admin); manages rental stock, hosts co-op auctions — no municipal flat-sale auctions of its own.
- `zwarek` / Spółdzielnia Mieszkaniowa Lokatorsko-Własnościowa — private co-op.

Contact: Urząd Miasta Przasnysz, ul. Jana Kilińskiego 2, 06-300 Przasnysz.

## 3. Format + rendering
- **Server-rendered HTML** — biuletyn.net **CMS-BIP 3.0** (bip.net / extranet.pl hosted-BIP family). Notice bodies are inline HTML text; the fetched Rynek 1 notice (id=7733, ~46 KB) carried **no PDF attachment** — plain HTML. Some notices may attach a born-digital text-PDF (`pdfText` if seen); OCR not expected.
- No SPA, no JS gate, no auth/CAPTCHA. Server is **slow** (curl needs generous timeouts; naive pipelines hang) — the only mild watch-item.
- Printable/`drukuj.asp` variants exist for clean text.

## 4. Volume + achieved-price stream
- **Open flat-auction volume by the town: 0.** The board is low-volume overall and skews land + cemetery-stall/lease + occasional commercial-premises lease. A few land sales per year (Przyjemna, Szpitalna); no `lokal mieszkalny` sales.
- **Achieved-price stream: none.** No rozstrzygnięcia/wynik board; announcements carry `cena wywoławcza` only. Nothing to parse for hammer prices.
- Co-op "ZWAREK" flat auctions exist but are private-sector and off-target for a municipal-disposal dataset.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (hypothetical only):** bip.net/biuletyn.net server-HTML town (extranet.pl family — server-HTML + text-PDF), URL shape `?bip=1&cid=NN` list → `?bip=2&cid=NN&id=NNNN` article. Trivial to parse *if there were flat auctions*.
- **Effort: —.** No adapter warranted. Building it would yield land + cemetery-stall leases only, and no achieved-price stream — outside the flat-auction thesis.
- **Blockers / why NO-BUILD:** (1) ~0 open-auction sales of lokale mieszkalne by the gmina; residential disposal is bezprzetargowo na rzecz najemcy. (2) Board dominated by land sales + dzierżawa/najem leases — matches the explicit NO-BUILD profile ("generic city-BIP skewing to land + tenant sales with ~0 open flat auctions"). (3) No results board / no hammer-price stream. (4) The only flat auctions are a private co-op, not the municipality. Small Mazowieckie seat, as expected.

**VERDICT: NO-BUILD** — the town of Przasnysz runs only land sales, cemetery-stall/land leases and a commercial-premises lease at open auction; zero municipal flat auctions and no achieved-price board. Residential stock moves bezprzetargowo to tenants; the recurring flat auctions belong to the private "ZWAREK" co-op, not the gmina.
