# Spike — Międzychód (Wielkopolskie · powiat międzychodzki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina miejsko-wiejska Międzychód (Urząd Miasta i Gminy) publishes property notices on the city BIP `bip.miedzychod.pl` — a vanity front for `miedzychod.bip2.alfatv.pl`, running the **BIP Alfa TV** hosted CMS (Wytwórnia Telewizyjno-Filmowa Alfa, "Biuletyn Informacji Publicznej v89.3.a.2"). Rendering is clean **server-HTML** with inline notice bodies at `/dokumenty/NNNN` — technically trivial. BUT the flat-auction economics fail the build test: the gmina's OPEN `przetarg ustny nieograniczony` stream is dominated by **land (działki)**; municipal **lokale mieszkalne are disposed of `na rzecz najemcy` (bezprzetargowo, to sitting tenants) via `wykaz` lists**, not open auction. The only open FLAT auctions found belong to **MSK AQUALIFT Sp. z o.o.** (the municipal utility spółka selling its OWN buildings — Iczka 5, B. Chrobrego 2), plus one-off gmina cases (Piłsudskiego 33, a historic monument, 2021; 17 Stycznia 125, 2016). No dedicated housing manager (ZGM/ZBM/TBS) — stock is run in-house. Near-zero recurring open flat-auction volume → NO-BUILD.

## 1. Sells municipal property at auction?
**YES for LAND, essentially NO for flats.** The Burmistrz runs `ustny przetarg nieograniczony` (and `ograniczony`) for municipal property, but the recurring subject is **działki**. Evidence from the city portal "Przetargi nieruchomości gminnych" (2021 snapshot): 5 of 6 auctions were land (Bielsko 91/9 & 91/10, Łowyń 323/76+84, Międzychód 60/8+60/36 3.33 mln, Międzychód 253/6), and only **1** touched a residential building — ul. Marszałka Piłsudskiego 33 (II przetarg nieograniczony, 180–200k, a zabytek with mandatory conservation works) — a one-off, not a flat cycle.

Municipal **flats** appear on the Nieruchomości board almost exclusively as **`wykaz nieruchomości … lokal do zbycia na rzecz najemcy`** (sale to the sitting tenant, bezprzetargowo) — e.g. ID 5759 (May 2026) and a decade of similar `na rzecz najemcy` wykazy (2016–2026). That is the classic NO-BUILD residential channel.

Open FLAT auctions do exist but are **not the gmina's housing stock**: **MSK AQUALIFT Sp. z o.o.** (spółka komunalna, water/utilities) periodically auctions its OWN real estate — Iczka 5 lok. 4 (120 m², cena wyw. 220 000 zł, 2018; `/dokumenty/1476`, `/dokumenty/411`) and ul. Bolesława Chrobrego 2 (~2024). These are sporadic, single-asset disposals by a company, not a repeatable municipal flat pipeline.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (BIP Alfa TV CMS):** `bip.miedzychod.pl` → backend `miedzychod.bip2.alfatv.pl`.
- Nieruchomości board (wykazy + property przetargi): `https://bip.miedzychod.pl/dokumenty/menu/32`
- Ogłoszenia (general notices): `https://bip.miedzychod.pl/dokumenty/menu/11`
- Przetargi / zapytania (this is **public procurement**, redirects to `/zamowienia/tryby` — NOT property auctions): `https://bip.miedzychod.pl/dokumenty/menu/4`
- Informacja o stanie mienia komunalnego: `https://miedzychod.bip2.alfatv.pl/dokumenty/menu/23`
- Document URL pattern: `https://bip.miedzychod.pl/dokumenty/NNNN` (e.g. `/dokumenty/1476` AQUALIFT Iczka 5 flat; `/dokumenty/4489` dzierżawa Mierzyn; `/dokumenty/250` ruchomości).

**City portal mirror:** `https://miedzychod.pl/strona/menu/138_przetargi_nieruchomosci_gminnych` (curated auction list) and `https://miedzychod.pl/aktualnosci/...` (news items).

**Do NOT confuse** with the powiat BIP `bip.powiatmiedzychodzki.pl` (Starostwo — Skarb Państwa / powiat land, out of scope).

Contact: Zespół ds. gospodarki nieruchomościami, Urząd Miasta i Gminy, ul. Marszałka Piłsudskiego 2, pok. 304/305/308; tel. 95 748 81 00 w. 313/314/315; `nieruchomosci@miedzychod.pl`.

## 3. Format + rendering
- **Server-rendered HTML** — BIP Alfa TV hosted CMS (v89.3.a.2). Confirmed live: `/dokumenty/1476` renders the full notice body inline (opens `Na podstawie art. 38 ust. 1 i 2 ustawy … o gospodarce nieruchomościami …`), **no PDF/DOC attachment** on that notice.
- **No SPA, no auth, no CAPTCHA.** Plain HTML lists per `menu/NN`; documents at `/dokumenty/NNNN`.
- Some notices may attach a born-digital PDF (`pdfText` if encountered); OCR unlikely on this CMS.
- Format is the EASY case — rendering is not the blocker; **content mix** is.

## 4. Volume + achieved-price stream
- **Open flat-auction volume:** ~0/yr from the gmina. Over 2016–2026 the identifiable open flat/residential-building auctions number a handful of one-offs (Piłsudskiego 33 2021; 17 Stycznia 125 2016) plus AQUALIFT's own assets (Iczka 5 2018, Chrobrego 2 ~2024). The gmina's residential channel is `na rzecz najemcy` wykazy. Open-auction volume is **land**, not flats.
- **Achieved-price stream:** Weak. The Nieruchomości board carries `Rozliczenie przetargu` / `Informacja o przetargu` / `Lista osób zakwalifikowanych` items, but these attach mostly to LAND auctions; there is no dedicated, recurring flat-result board with hammer prices. No housing-manager (ZGM/ZBM/TBS) results feed.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest CMS analog:** **BIP Alfa TV** (Wytwórnia Telewizyjno-Filmowa Alfa) — a distinct hosted family (`*.bip2.alfatv.pl`, `/dokumenty/menu/NN` lists + `/dokumenty/NNNN` docs). Rendering-wise it behaves like the server-HTML analogs (bip.info.pl / bip.net) — list-crawl + inline-body parse would be Low effort IF the content existed.
- **Effort:** **— (no build).** Were flat volume present, a scraper would be Low (crawl `menu/32` → fetch `/dokumenty/NNNN` → regex/DOM parse address/pow. użytkowa/cena wywoławcza/wadium/date/round). But there is no recurring open flat-auction stream to justify it.
- **Blockers / why NO-BUILD:**
  1. Gmina flats go **`na rzecz najemcy` bezprzetargowo** via wykazy — outside the open-auction target.
  2. Open `przetarg ustny nieograniczony` is **land-dominated**; residential auctions are rare one-offs.
  3. Only open flat auctions belong to **AQUALIFT** (utility spółka, own assets) — sporadic, single-asset, not a municipal pipeline.
  4. **No housing manager** (ZGM/ZBM/MZBM/TBS) and **no dedicated flat-result board** with achieved prices.
  A small gmina miejsko-wiejska BIP skewing to land + tenant sales with ~0 open flat auctions = textbook NO-BUILD.

**VERDICT: NO-BUILD** — clean server-HTML BIP Alfa TV BIP, but the gmina disposes of flats to tenants bezprzetargowo and open auctions are land; the only open flat auctions are sporadic AQUALIFT utility-company disposals. No recurring open flat-auction volume, no housing manager, no flat results stream.
