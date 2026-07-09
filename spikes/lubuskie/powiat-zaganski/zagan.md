# Spike — Żagań (Lubuskie · powiat żagański)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Żagań o statusie miejskim (Urząd Miasta Żagań, town gmina ~25k) sells municipal property — including **lokale mieszkalne** — via *nieograniczony przetarg ustny na sprzedaż*. Everything is on the town BIP `bip.zagan.pl`, which runs the **SystemDoBIP.pl / E-LINE SYSTEMY INTERNETOWE** hosted CMS: clean server-rendered HTML, numeric-path notices (`/przetargi/344/<id>/<slug>/`), a dedicated auctions board (`/przetargi/344/status/`) plus a "Nieruchomości" section for wynik notices. Confirmed live flat auction: ul. Żelazna 16/3, 30.00 m² lokal mieszkalny, cena wywoławcza 135 000 zł, III przetarg 16.12.2025 (I 22.07.2025 + II 07.10.2025 both negatywny). Current active board is all-land (10 grunt parcels, przetarg 14.07.2026) — flats cycle in and out rather than staying permanently open. Closest analog is already built: **Gorzów Wielkopolski** (same voivodeship, same SystemDoBIP/E-LINE CMS) — clone that adapter shape. No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Urząd Miasta Żagań (Wydział Rozwoju, Gospodarki Komunalnej i Nieruchomości) runs `nieograniczony przetarg ustny` (open oral auction) for sale of municipal property owned by *Gmina Żagań o statusie miejskim*. Confirmed lokal-mieszkalny sale auctions (OPEN oral, not bezprzetargowo na rzecz najemcy):
- **ul. Żelazna 16, lokal nr 3** — 30.00 m² + 20.10 m² pomieszczenia przynależne (piwnica/komórka), 197/1000 udziału, KW ZG1G/00039027/5. Cena wywoławcza 135 000 zł, wadium 13 500 zł. III przetarg 16.12.2025; I (22.07.2025) i II (07.10.2025) zakończone wynikiem negatywnym. (`/przetargi/344/599/3_/`)
- **ul. II Armii Wojska Polskiego 2-3-4, lokal nr 3** + **ul. Piastowska 4, lokal nr 9** — przetarg 07.10.2011 (historic, shows recurring flat stream).
- **ul. Warszawska 22-23-24, lokal nr 1** — I nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego, 16.02.2011 (historic).

The active "Przetargi aktualne" board on the day of this spike carried **10 land parcels** (ul. Asnyka, Krótka, Narutowicza, Szkolna, Środkowa; ceny wywoławcze 7 650–214 000 zł; przetarg 14.07.2026) — i.e. the mix skews land at any given moment, and flat auctions appear periodically (often as II/III przetarg when unsold). Both natural and legal persons bid; standard 10% wadium.

## 2. Where published? (hosts + boards, URLs)
**Primary — town BIP (SystemDoBIP.pl / E-LINE CMS):**
- Auctions board (Przetargi aktualne): `https://bip.zagan.pl/przetargi/344/status/` (paginated, 2 pages at spike time)
- Individual notice pattern: `https://bip.zagan.pl/przetargi/344/<id>/<slug>/` — e.g. Żelazna 16/3 at `/przetargi/344/599/3_/`
- Resolved auctions (Przetargi rozstrzygnięte): same `/przetargi/344/...` tree, older `<id>` (e.g. `/przetargi/344/519/23_/`, `/przetargi/344/589/2_/`)
- Nieruchomości section (ogłoszenia + informacja o wyniku): `https://bip.zagan.pl/152/Nieruchomosci/` and `https://bip.zagan.pl/203/Nieruchomosci/`

**Do NOT confuse** with:
- `bip.gminazagan.pl` — the rural **Gmina Wiejska Żagań** (separate JST), out of scope.
- `bip.powiatzaganski.pl` — the **powiat** (starostwo), out of scope.
Our target is the **town Gmina Żagań o statusie miejskim** = `bip.zagan.pl`.

Contact: Wydział Rozwoju, Gospodarki Komunalnej i Nieruchomości, UM Żagań, Plac Słowiański 17, pok. 8 (parter), tel. 68 477 10 41. (Legacy self-reference in older notices: `bip.wrota.lubuskie.pl/umzagan` — now redirected/superseded by `bip.zagan.pl`.) No dedicated ZGM/ZBM/TBS housing-manager BIP found selling flats separately; sales run through the Urząd Miasta directly.

## 3. Format + rendering
- **Server-rendered HTML** — SystemDoBIP.pl hosted CMS (footer signature "E - LINE SYSTEMY INTERNETOWE"). Board = dated HTML table of notices; each notice is a full HTML document at `/przetargi/344/<id>/<slug>/`. Confirmed live via fetch (plain server HTML, no JS gate).
- **No SPA, no auth, no CAPTCHA** observed.
- Notice body is inline HTML text (address, powierzchnia, KW, cena wywoławcza, wadium, terminy, round number all in prose) — some may attach a born-digital PDF; handle with `pdfText` if encountered (OCR unlikely on this CMS).

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest. Property board runs a steady flow (10 land parcels currently open in one batch); **flat** auctions are periodic — a handful per year at most, frequently repeated as II/III przetarg. Expect a few lokal-mieszkalny auctions/year mixed into a land-heavy stream.
- **Achieved-price stream:** PARTIAL/YES. Notices carry `cena wywoławcza` + wadium. Final hammer price/buyer is published as `informacja o wyniku przetargu` in the **Nieruchomości** section (`/152/` , `/203/`) rather than inline on the auction card; the "Przetargi rozstrzygnięte" state marks negative/closed rounds. Parse the wynik notices from server HTML to recover cena osiągnięta / nabywca (same as the Gorzów Wielkopolski flow).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **Gorzów Wielkopolski** — *same voivodeship (lubuskie), same SystemDoBIP.pl / E-LINE CMS*, already **built** in-repo (`pipeline/src/cities/gorzow-wielkopolski/`). Clone that adapter: same `/przetargi/<board>/status/` list → `/przetargi/<board>/<id>/<slug>/` notice pattern. Also matches the lubuskie SystemDoBIP cluster (Świebodzin, Krosno Odrzańskie, Sulęcin, Strzelce Krajeńskie, Wschowa).
- **CMS family:** SystemDoBIP.pl (E-LINE) hosted BIP — server-rendered HTML tables/articles (ADAPTER-GUIDE §3 plain-HTML family).
- **Effort:** **LOW.** Point board id `344` list → notice fetch → regex/DOM parse (address via parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, terminy, round via "pierwszy/drugi/trzeci przetarg"); second pass over Nieruchomości/rozstrzygnięte for cena osiągnięta. Filter land/dzierżawa where flats are the target (land also in-scope for the wider dataset). Reuse Gorzów's SystemDoBIP selectors near-verbatim.
- **Blockers:** None. No rate-limit/auth/CAPTCHA signals. Only watch-items: wynik price lives in the Nieruchomości section (not on the auction card), and a land-heavy mixed stream (classify + drop non-flat when flats are the target).

**VERDICT: BUILD (Low effort)** — recurring municipal flat auctions on a clean SystemDoBIP.pl server-HTML BIP (`bip.zagan.pl`), with an already-built same-CMS same-voivodeship analog (Gorzów Wielkopolski) to clone; no blockers.
