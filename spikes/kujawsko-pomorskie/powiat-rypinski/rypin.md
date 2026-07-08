# Spike — Rypin (Kujawsko-Pomorskie · powiat rypiński)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miasta Rypin (Urząd Miasta Rypin, town / gmina miejska) does sell municipal property at *ustny przetarg nieograniczony*, and publishes cleanly on its BIP `bip.rypin.eu` — a server-rendered HTML **Alfa TV / alfatv.pl BIP** platform (footer: "Wytwórnia Telewizyjno-Filmowa Alfa Sp. z o.o.", wer 1.9.5.a.7), with a single "Przetargi - zbycie, dzierżawa, najem mienia komunalnego" board carrying a dated "Lista artykułów" plus inline "Informacja o wyniku przetargu" result notices. **But the open-auction stream is land + commercial only.** Across ~15 months on the board (2025-05 → 2026-07) every open sale auction is either a **lokal użytkowy** (commercial premises) or a **nieruchomość zabudowana/niezabudowana** (land) — plus dzierżawa/najem and pre-auction wykazy. **Zero *lokal mieszkalny* (flat) open auctions.** The only flat open auction found anywhere is an isolated 2019 case (lokal mieszkalny nr 8, ul. Kilińskiego 2/4/6, cena wywoławcza 50 000 zł). Municipal flats are evidently disposed of *bezprzetargowo na rzecz najemcy*, not at open oral auction. Technically scrapeable (Low effort), but ~0 flat auctions/year → NO-BUILD for the flat target.

## 1. Sells municipal property at auction?
**YES at auction — but not flats.** The Burmistrz Rypina (Wydział Nieruchomości i Środowiska) runs `ustny przetarg nieograniczony` for municipal property. Live board content (`przetargi-zbycie-dzierzawa-najem-mienia-komunalnego`) — open **sale** auctions seen:
- Ogłoszenie o przetargu na sprzedaż **lokalu użytkowego** przy ul. Kościuszki 7/9 — planned 10.09.2026 (commercial).
- Ogłoszenie o przetargu na sprzedaż **nieruchomości zabudowanej** przy ul. Kościuszki (dz. 159/11) — 17.06.2026 (land/building).
- Ogłoszenia na sprzedaż **niezabudowanych nieruchomości** przy ul. Piłsudskiego (dz. 2194/1, 2197/5) — 14.01.2026 (land).
- Earlier result: sprzedaż **lokalu użytkowego** (wynik 19.08.2025) — commercial.
- Najem/dzierżawa: lokal użytkowy nr 5, ul. Koszarowej 3 (rental) + recurring dzierżawa/najem wykazy.

**Flats (lokale mieszkalne):** none on the current/recent board. The single historical open flat auction found: **lokal mieszkalny nr 8, ul. Kilińskiego 2/4/6, 28.18 m², cena wywoławcza 50 000 zł, wadium 5 000 zł, 2019** (via listaprzetargow.pl index). That is a one-off ~7 years ago. Municipal residential stock is sold *bezprzetargowo na rzecz najemcy*; the open-auction stream is land + lokale użytkowe. So flats are effectively **out of scope / ~0 per year**.

## 2. Where published? (hosts + boards, URLs)
**Primary — TOWN city BIP (Alfa TV / alfatv.pl BIP CMS):** `https://bip.rypin.eu`
- Property board (announcements + results + wykazy, one combined list): `https://bip.rypin.eu/artykul/przetargi-zbycie-dzierzawa-najem-mienia-komunalnego`
- Przetargi module alias: `https://bip.rypin.eu/?app=przetargi` (403 to generic bot UA; 200 with a browser UA — site gates the bot UA).
- Wydział Nieruchomości i Środowiska: `https://bip.rypin.eu/artykul/wydzial-nieruchomosci-i-srodowiska`
- Article/detail URL shape: `https://bip.rypin.eu/artykul/<slug>` (server-rendered HTML). Attachments under `/pliki/rypin/zalaczniki/<id>/<file>` (e.g. a `.doc` result: `.../630/informacja-mieszkaniowka-koszarowa-brak.doc`).

**Do NOT confuse** with the rural **Gmina Rypin** (gmina wiejska, separate JST) at `https://www.bip.rypin.pl/?app=przetargi` (BIP w JST / bip.gov.pl style) — out of scope. Our target is the town **Gmina Miasta Rypin** (`bip.rypin.eu`). Also distinct: Starostwo Powiatowe w Rypinie (`bip.powiatrypinski.pl`), out of scope.

Contact: Urząd Miasta Rypin, ul. Warszawska 40, 87-500 Rypin, tel. +48 54 280 96 00. (No separate ZGM/ZBM/TBS housing-manager auction stream found — property sales run through the Urząd's Wydział Nieruchomości i Środowiska.)

## 3. Format + rendering
- **Server-rendered HTML** — Alfa TV / alfatv.pl BIP (Bootstrap responsive; footer "BIP zgodny z WCAG 2.2 · wer 1.9.5.a.7 · Wytwórnia Telewizyjno-Filmowa Alfa Sp. z o.o."). Board = "Lista artykułów" table (Tytuł + Data publikacji), each row an `/artykul/<slug>` HTML notice. Confirmed live via curl (browser UA); WebFetch/bot UA gets HTTP 403.
- **No SPA / no auth / no CAPTCHA** (just a bot-UA gate — pass a browser UA, per `getText(url,{userAgent})`).
- Notice bodies are inline HTML; some result/wykaz notices attach a **born-digital `.doc`** (→ `docText`) or PDF (→ `pdfText`). Expired items are kept and labelled "(artykuł stracił ważność)".

## 4. Volume + achieved-price stream
- **Volume (flats):** ~0/year. 15 months of board history (2025-05 → 2026-07) = zero lokal-mieszkalny open auctions; one isolated 2019 flat auction total.
- **Volume (all property):** low — a handful of open sale auctions/year, all lokale użytkowe + land, plus dzierżawa/najem and wykazy.
- **Achieved-price stream:** YES — "Informacja o wyniku przetargu" notices on the same board carry hammer price / nabywca or wynik negatywny (e.g. najem lok. użytkowego Koszarowej 3, wynik 17.06.2026; sprzedaż nieruchomości Kościuszki dz.159/11, wynik 17.06.2026; sprzedaż dz. Piłsudskiego 2194/1 & 2197/5, wynik 14.01.2026). Parseable from HTML / `.doc` attachment — but it covers land + commercial, not flats.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** a small server-HTML `/artykul/<slug>` board with a combined announce+result list and browser-UA gate — WordPress / custom-HTML family (`brzeg` / `nowa-sol` shape) with `getText(url,{userAgent: <browser>})`. Alfa TV BIP is an uncommon CMS in the registry, so no exact clone; the parse shape is nonetheless simple.
- **CMS family:** Alfa TV / alfatv.pl BIP (server-rendered HTML; ADAPTER-GUIDE §3 "WordPress / custom HTML" bucket).
- **Effort:** LOW *technically* — clean HTML, single board, dated list, `.doc`/PDF attachments via existing utils. **But irrelevant:** the flat-auction stream this project targets is ~0.
- **Blockers:** No open *lokal mieszkalny* auctions (flats go bezprzetargowo to tenants); the only auction sales are land + lokale użytkowe. That is the disqualifier. Secondary note: bot-UA 403 (needs browser UA) — trivial if a build were ever warranted.

**VERDICT: NO-BUILD** — Gmina Miasta Rypin publishes a clean, scrapeable server-HTML property board on `bip.rypin.eu` (Alfa TV BIP), but its open auctions are land + commercial (lokale użytkowe) only; flat sales are bezprzetargowo (one isolated 2019 mieszkalny auction, none in 2025–2026). ~0 open flat auctions/year → no usable flat-auction stream.
