# Spike — Łańcut (Podkarpackie · powiat łańcucki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miejska Łańcut (Urząd Miasta Łańcuta, distinct from the surrounding rural gmina Łańcut) does sell municipal property at *przetarg ustny nieograniczony*, and it even publishes a clean achieved-price results stream — **but every open auction 2022–2025 is LAND** (undeveloped plots at ul. Polnej / ul. Przemysłowej / ul. Wandy Rutkiewicz, plus one whole ex-police building at Plac Sobieskiego). **Residential stock is disposed of ONLY `bezprzetargowo na rzecz najemcy`** (tenant sales via Zarządzenie, no auction). Across four years of the full property board there is **not a single `przetarg na sprzedaż lokalu mieszkalnego`**. A housing manager exists (Miejski Zarząd Budynków), but it only does najem/dzierżawa/administracja — not flat sales. This is the textbook Podkarpackie-seat NO-BUILD: land + tenant sales, ~0 open flat auctions. Tech would be trivial (server-HTML biuletyn.net + born-digital text-PDF), so the blocker is purely the absence of flat-auction volume.

## 1. Sells municipal property at auction?
**YES for land / whole buildings — NO for flats.** The Burmistrz Miasta Łańcuta runs `przetarg ustny nieograniczony` (and occasionally `ograniczony`) on the Nieruchomości→Sprzedaż board. Confirmed live auctions (all non-residential):
- **ul. Polnej** — recurring `przetarg ustny nieograniczony na sprzedaż nieruchomości NIEZABUDOWANYCH` (I/II/III/kolejny tura across 2022–2024; industrial P/U plots). Results PDF (04.01.2024): działki 6027/1+134/2, cena wywoławcza 2 287 480 zł, cena osiągnięta 2 310 355 zł, Nabywca CIS Sp. z o.o. — i.e. commercial/industrial land.
- **ul. Przemysłowej** — `przetarg ustny nieograniczony na sprzedaż nieruchomości NIEZABUDOWANEJ` + wynik (2025).
- **ul. Wandy Rutkiewicz** — `przetarg ustny OGRANICZONY na sprzedaż nieruchomości niezabudowanej` + wynik (2025).
- **dz. 1665/2, ul. Polnej** — `przetarg` na sprzedaż prawa użytkowania wieczystego gruntu + własności budowli (2022).
- **Plac Sobieskiego** — active town-site listing: `przetarg ustny nieograniczony na sprzedaż nieruchomości ZABUDOWANEJ` (former police building — one whole building, not a flat).

**Residential = no auction.** All lokal-mieszkalny disposal is `Wykaz … do sprzedaży NA RZECZ NAJEMCY w trybie bezprzetargowym` (e.g. Zarządzenia 233/2022, 253/2022) — statutory tenant sales, no open bidding. Site search `site:lancut.biuletyn.net przetarg "lokalu mieszkalnego"` returns zero real auctions.

## 2. Where published? (hosts + boards, URLs)
**Primary — town BIP (`lancut.biuletyn.net`):**
- Property root: `http://lancut.biuletyn.net/?bip=1&cid=36&bsc=N` (Nieruchomości)
- **Sprzedaż board** (auctions + wykazy + wyniki, all together): `?bip=1&cid=101&bsc=N`, split into year sub-cats: 2026 `cid=1151`, 2025 `cid=1094`, 2024 `cid=1022`, 2023 `cid=981`, 2022 `cid=952`.
- Current vs archive split: live view `&bsc=N` (auto-empties as notices expire); full listings under **Archiwum** `&bsc=T` (e.g. `?bip=1&cid=1094&bsc=T`, pagination `&pg=1`).
- Article permalink: `?bip=2&cid=<catid>&id=<artid>` (e.g. `?bip=2&cid=1094&id=6951`).
- Documents (PDFs): `…/fls/bip_pliki/YYYY_MM/BIPF<hash>Z/<file>.pdf`.
- Other property boards (all non-sale): Dzierżawa `cid=102`, Najem `cid=103`, Użyczenie `cid=804`.
- Public-procurement (works/services, not property): `?bip=1&cid=35&bsc=N`.

**Housing manager — Miejski Zarząd Budynków w Łańcucie (MZB):** `http://mzb.lancut.biuletyn.net/` — ul. Kościuszki 17A, tel. 17 225 2815, mzbm@post.pl. Boards: Ogłoszenia `cid=71`, **Najem i dzierżawa mienia jednostki** `cid=53`. Manages/rents the municipal housing+utility stock; **no flat-sale przetarg board**.

Contact (sales): Urząd Miasta Łańcuta, Plac Sobieskiego 18, 37-100 Łańcut; symbol spraw GPM./WGN.
**Do NOT confuse** with the rural **Gmina Łańcut** at `bip.gminalancut.pl` (separate JST, Wójt, out of scope).

## 3. Format + rendering
- **Server-rendered HTML** — biuletyn.net INTERmedi@ "CMS - BIP 3.0". Query-string category pages; article lists carry `Data wytworzenia` + title link + attachment link. No SPA, no JS gate, no auth, no CAPTCHA.
- **Attachments = born-digital text-PDF.** Verified: `Informacja_wynik_przetargu.pdf` (207 KB, PDF 1.7) extracts a clean text layer via pdftotext (cena wywoławcza / cena osiągnięta / Nabywca all machine-readable). No OCR needed. Some ogłoszenia bundle a `.zip` of załączniki + a `.pdf` mapka.
- One quirk to handle: the "recommend page" hidden field embeds an escaped `<!DOCTYPE HTML>…Zapraszam do obejrzenia strony…` blob — don't mistake it for content; real listings are in the `Treść zakładki` region / archive view.

## 4. Volume + achieved-price stream
- **Open FLAT auctions: ZERO** across 2022–2025 (full board reviewed). This is the load-bearing finding.
- **Open auctions total:** low — roughly a handful/year, and all **land or whole-building** (Polnej repeated as unsold I→II→III rounds; Przemysłowej; Wandy Rutkiewicz; ex-police building). Buyers are companies (CIS Sp. z o.o.) — industrial/commercial land.
- **Achieved-price stream: YES but wrong asset class.** `Informacja o wyniku przetargu` PDFs publish cena wywoławcza, cena osiągnięta, wadium, Nabywca — clean and parseable — but only for land. No flat hammer prices exist to harvest.
- Residential throughput is entirely tenant `bezprzetargowo` wykazy (many per year), which carry a fixed valuation, not an auction result.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (were it in-scope):** biuletyn.net INTERmedi@ town BIP — same family as other `*.biuletyn.net` seats; `bip.net`-adjacent server-HTML + text-PDF shape. Tech effort would be **LOW**.
- **Why NO-BUILD:** the product target is a recurring stream of OPEN flat auctions with hammer prices; Łańcut has none. Residential disposal is 100% tenant `bezprzetargowo`; every open auction is land/commercial. Building an adapter here yields land + tenant-wykaz noise and zero flat-sale signal — exactly the NO-BUILD profile in the heuristic ("generic city-BIP skewing to land + tenant sales with ~0 open flat auctions").
- **Blockers:** none technical — this is a data/business-fit blocker (no flat-auction volume). MZB confirmed as manager but sells nothing at auction.

**VERDICT: NO-BUILD** — Miasto Łańcut (biuletyn.net INTERmedi@ BIP) runs only LAND / whole-building open auctions; municipal FLATS are disposed of solely `bezprzetargowo na rzecz najemcy`. Four years of the full Sprzedaż board show ZERO `przetarg na sprzedaż lokalu mieszkalnego`. Clean text-PDF results stream exists but carries land prices only. Classic Podkarpackie-seat NO-BUILD.
