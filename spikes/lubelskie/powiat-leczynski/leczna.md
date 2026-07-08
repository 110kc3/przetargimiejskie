# Spike — Łęczna (Lubelskie · powiat łęczyński)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (effort —).

## TL;DR
Gmina Łęczna (Urząd Miejski, miasto-wiejska gmina; target seat = miasto Łęczna) **does** run *przetarg ustny nieograniczony na sprzedaż nieruchomości* — but the entire visible stream is **LAND**: undeveloped/building plots (Chełmska, Polna, al. Jana Pawła II, Cichy Zakątek). Across 2018→2025 I found **zero** open flat auctions (*lokal mieszkalny*) run by the gmina. The only flat auctions surfacing in Łęczna are a **Spółdzielnia Mieszkaniowa** (private housing co-op — out of scope) and a **komornik** (bailiff e-licytacja — out of scope). The gmina's housing stock is administered by **PGKiM Łęczna sp. z o.o.** (100% gmina-owned), but its BIP carries only *zamówienia publiczne* — no flat-sale auctions. Municipal flat disposal here follows the standard Polish pattern: *bezprzetargowo na rzecz najemcy* with bonifikata, not open auction. Property notices are published on the **leczna.pl** news serwis (WordPress-style HTML, `/aktualnosci/<slug>/`) and the regional **umleczna.bip.lubelskie.pl** (Wrota Lubelszczyzny). No dedicated flat-auction board, no results board with hammer prices for flats. Textbook Lubelskie NO-BUILD.

## 1. Sells municipal property at auction?
**YES for land — NO for flats.** The Burmistrz Łęcznej regularly runs *przetarg ustny nieograniczony na sprzedaż nieruchomości*, but every confirmed lot is a plot of land, not a *lokal mieszkalny*:
- ul. Chełmska/Polna — I przetarg ustny nieograniczony, cena wyw. 645 000 zł netto, wadium 64 500 zł, 26.10.2018 (building/service plots).
- al. Jana Pawła II — przetarg ustny, niezabudowana nieruchomość 0,1039 ha, cena wyw. 300 000 zł + VAT, wadium 15 000 zł, 09.04.2024.
- ul. Cichy Zakątek — przetarg, cena wyw. 470 000 zł + VAT, wadium 50 000 zł, 26.03.2024.
- ul. Chełmska, dz. 2585/74 (0,1319 ha) — cena wyw. 250 000 zł netto, wadium 25 000 zł, 23.09.2025.

Flat auctions found in Łęczna are **not** the gmina:
- **Spółdzielnia Mieszkaniowa im. St. Batorego** — przetarg na lokal ul. Staszica 4/59 (co-op internal sale) — out of scope.
- **Komornik** — e-licytacja mieszkania ul. Górnicza (cena wyw. 217 392,75 zł, kwiecień 2026) — bailiff, out of scope.

No *"przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego"* by Gmina Łęczna exists in the record. Municipal flats are disposed *bezprzetargowo na rzecz najemcy* (bonifikata), the disqualifying pattern for this project.

## 2. Where published? (hosts + boards, URLs)
**Property notices — city news serwis (primary in practice):**
- `https://leczna.pl/aktualnosci/` — announcements posted as news articles, e.g.
  - `https://leczna.pl/aktualnosci/przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-polozonych-w-r/` (Chełmska/Polna, land)
  - `https://leczna.pl/aktualnosci/przetarg-ustny-na-sprzedaz-nieruchomosci-polozonej-w-m-leczna6375/` (Jana Pawła II, land)
  - `https://leczna.pl/aktualnosci/przetarg-na-sprzedaz-nieruchomosci-polozonej-w-m-leczna-przy-ul-chelmskiej6812/` (Chełmska dz. 2585/74, land)
- **No dedicated "nieruchomości/przetargi" category** — notices sit in the generic *Aktualności* stream.

**Statutory BIP — Wrota Lubelszczyzny:**
- `https://umleczna.bip.lubelskie.pl/` — menu: Urząd, Burmistrz, Rada, Budżet, **Zamówienia publiczne** (`/index.php?id=487`), Informacje dla mieszkańców (`/index.php?id=410`). **No `wykaz nieruchomości`, no `przetargi na nieruchomości`, no `sprzedaż lokali` board** in the navigation.

**Housing manager:** PGKiM Łęczna sp. z o.o., ul. Krasnystawska 54 — BIP `https://pgkim.nowybip.pl/` (CMS: NowyBIP.pl). Administers 6 wspólnoty + gmina flats, but publishes only *zamówienia publiczne* — **no flat-sale auctions**.

Referat Planowania Przestrzennego i Gospodarowania Mieniem Gminnym, Plac Kościuszki 5 pok. 1, tel. 81 53-58-651, pgm@um.leczna.pl.

## 3. Format + rendering
- **leczna.pl** — server-rendered HTML news serwis (WordPress/custom-HTML family), clean `/aktualnosci/<slug>/` article pages; notice body is inline HTML text. Fully fetchable, no JS gate, no auth.
- **umleczna.bip.lubelskie.pl** — regional **bip.lubelskie.pl / Wrota Lubelszczyzny** platform (`index.php?id=NNN`, server HTML / DataTables). Fetchable.
- **pgkim.nowybip.pl** — NowyBIP.pl CMS, server HTML.
- No SPA, no CAPTCHA, no scanned-PDF/OCR dependency observed. Rendering is trivial — but there is no flat-auction content to render.

## 4. Volume + achieved-price stream
- **Open flat-auction volume (gmina): 0.** Multiple property auctions per year, but 100% land (plots for housing/service development). Not a single *lokal mieszkalny* przetarg by Gmina Łęczna across 2018–2025.
- **Achieved-price / results stream:** No dedicated *"informacja o wyniku przetargu"* board on either the serwis or BIP; land results, when posted, land in the generic news feed. No hammer-price stream for flats (there are no flat auctions to report).
- The recurring, high-frequency flat auctions this project needs simply do not exist here.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** other Lubelskie seats on **bip.lubelskie.pl / Wrota Lubelszczyzny** that spiked NO-BUILD (generic city-BIP skewing to land + tenant sales, ~0 open flat auctions). Also mirrors the "land-only przetarg + bezprzetargowo-na-najemcę flats" pattern seen across the voivodeship.
- **CMS family:** leczna.pl = WordPress/custom-HTML serwis; statutory BIP = bip.lubelskie.pl (Wrota Lubelszczyzny); housing co = NowyBIP.pl. All server-HTML, all trivially scrapeable.
- **Effort:** **—** (not applicable). Technically LOW to scrape, but there is nothing in-scope to scrape.
- **Blockers:** The disqualifier is **content, not tech** — no open municipal flat auctions, no housing-manager auction board, no flat results/hammer-price stream. Building an adapter would yield only land auctions (a different dataset) plus co-op/komornik noise that isn't the gmina.

**VERDICT: NO-BUILD** — Gmina Łęczna auctions land only; municipal flats go *bezprzetargowo na rzecz najemcy*, the housing manager (PGKiM) runs no flat auctions, and the only flat auctions in town are a private co-op and a bailiff. Zero open flat-auction volume = NO-BUILD.
