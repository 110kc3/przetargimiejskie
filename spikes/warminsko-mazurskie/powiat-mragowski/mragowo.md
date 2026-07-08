# Spike — Mrągowo (Warmińsko-Mazurskie · powiat mrągowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Miasto Mrągowo (Burmistrz, tourist town ~21k) sells municipal **lokale mieszkalne** via *przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* — confirmed live and recurring. Notices and results are published on the city BIP `bipmragowo.warmia.mazury.pl`, which runs the **Warmińsko-Mazurskie Centrum Nowych Technologii** regional BIP CMS (the `*.warmia.mazury.pl` / "Wrota Warmii i Mazur" family): clean server-rendered HTML, dated category listings, `/NNNN/slug.html` article URLs, plus a `/informacja/NNNN/...` results stream. The property board **Gospodarka nieruchomościami** (`/kategoria/1050/…`) carries wykazy + auctions + `informacja o wyniku przetargu` in one mixed feed. Volume is low-to-modest (small flat pool, many re-offered as II/III/IV przetarg) but genuine open flat auctions cycle continuously with published outcomes. Closest analog: **Braniewo** (already BUILT, same voivodeship, same CMS, `bipbraniewo.warmia.mazury.pl/kategoria/5/…`) — near-identical clone. No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats, recurring.** The Burmistrz Miasta Mrągowa runs `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` (open oral auction on the sale of a residential flat), usually bundled with `oddanie w użytkowanie wieczyste udziału w działce gruntu`. Live/near-live flat auctions confirmed via BIP + search index:
- **ul. Mrongowiusza 31/5** — I przetarg ustny nieograniczony, pow. użytk. 35.45 m² (+ piwnica 4.50 m²), cena wywoławcza **210 000 zł**, wadium 42 000 zł, aukcja **08.01.2026 11:00** (`/8288/…`). Re-offered: cena spadła do 160 000 zł, **III przetarg zakończony negatywnie** (brak uczestników) — `/8499/`.
- **ul. Wolności 20D/12** — **IV** przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego (`/8080/`).
- **ul. Mrongowiusza 75/1** — II przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego + użytkowanie wieczyste udziału w gruncie (`/5099/`).
- **ul. Królewiecka 16/5** — przetarg na sprzedaż lokalu mieszkalnego (`/6841/`).

Repeat rounds (II/III/IV) show a persistent municipal flat-disposal pipeline, not a one-off. Both osoby fizyczne i prawne may bid; wadium typically 10–20% ceny wywoławczej. The board also carries `przetarg ustny ograniczony` (to adjacent owners / tenants) and plenty of land + dzierżawa, but **open flat auctions are a standing recurring category**.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Gmina Miasto Mrągowo), warmia.mazury.pl CNT CMS:**
- Property board **Gospodarka nieruchomościami**: `https://bipmragowo.warmia.mazury.pl/kategoria/1050/gospodarka-nieruchomosciami.html` (79 rekordów / 4 strony; wykazy + przetargi + wyniki + dzierżawa mixed)
- Related subcat (procedura): `https://bipmragowo.warmia.mazury.pl/kategoria/1060/zalatwianie-spraw-gospodarka-nieruchomosciami.html`
- Article URL pattern: `/NNNN/slug.html` (e.g. `/8288/`, `/6841/`, `/5099/`, `/8080/`)
- Results stream: `informacja o wyniku przetargu` at `/informacja/NNNN/…` and plain `/NNNN/informacja-o-wyniku-przetargu.html` (e.g. `/8545/`, `/8544/`, `/8536/`, `/8499/`, `/8340/`)
- Mirror on official city www (some wykazy/ogłoszenia): `https://www.mragowo.pl/oferta-inwestycyjna/wykaz-nieruchomosci-przeznaczonych-do-sprzedazy-lub-wydzierzawienia`

Contact: Urząd Miejski w Mrągowie, ul. Królewiecka 60A, 11-700 Mrągowo; tel. 89 741-90-00 (wadium/pokój 56).

**Do NOT confuse** with:
- `bipgmmragowo.warmia.mazury.pl` → rural **Gmina Mrągowo** (separate JST, out of scope; its board is `/kategoria/1112/ogloszenia-na-sprzedaz-nieruchomosci.html`).
- `www.bip.powiat.mragowo.pl` / `www.powiat.mragowo.pl` → **Starostwo Powiatowe** (county, out of scope).
- `archiwalnybip.warmia.mazury.pl/mragowo_gmina_miejska/…` → old archived BIP (legacy, still indexed).

## 3. Format + rendering
- **Server-rendered HTML** — W-M CNT BIP CMS (footer credit "© Warmińsko-Mazurskie Centrum Nowych Technologii"). Category pages are dated HTML article lists; individual notices are inline HTML documents at `/NNNN/slug.html`. Confirmed live via fetch of the property board + a flat-auction notice + a wynik notice — all plain server HTML.
- **No SPA, no auth, no CAPTCHA, no PDF gate.** The Mrongowiusza 31/5 notice full text renders inline as HTML (no attachment). Occasional born-digital PDFs may attach on longer notices — handle with `pdfText` if seen; OCR unlikely on this CMS.
- Pagination via `?page=N` on category listings.

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest. Small flat pool for a ~21k town, but continuously active — same flats re-offered as I→II→III→IV przetarg with stepped-down cena wywoławcza (210k→160k observed). Expect a handful of distinct flats/year plus repeat rounds; land + dzierżawa dominate the raw board count, so classify + filter to lokal mieszkalny.
- **Achieved-price stream: YES.** Dedicated `informacja o wyniku przetargu` notices publish outcome inline HTML — cena osiągnięta / nabywca on success, or `wynik negatywny (brak uczestników)` when unsold (e.g. Mrongowiusza 31/5 III przetarg, `/8499/`). Announcement carries cena wywoławcza + wadium; result carries hammer price. Both parseable from server HTML.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog: Braniewo (BUILT)** — same voivodeship, same warmia.mazury.pl CNT CMS, identical URL shape: `https://bipbraniewo.warmia.mazury.pl/kategoria/5/gospodarka-nieruchomosciami.html` + `/NNNN/slug.html` articles + `informacja o wyniku`. Olsztyn (`bip.olsztyn.eu`) is also W-M but a different platform — Braniewo is the true template. Adapter = clone Braniewo, swap host → `bipmragowo.warmia.mazury.pl`, category id → `1050`.
- **CMS family:** Warmińsko-Mazurskie CNT regional BIP (server-rendered HTML; plain HTML article/table family in ADAPTER-GUIDE terms).
- **Effort: LOW.** List `/kategoria/1050/…` (paginate `?page=N`) → article fetch → regex/DOM parse (address via parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round I–IV); second pass over `informacja o wyniku przetargu` for cena osiągnięta / negatywny. Filter out land, dzierżawa, and `przetarg ustny ograniczony` where open flats are the target.
- **Blockers:** None. No rate-limit / auth / CAPTCHA signals. Watch-items: (1) mixed board — must classify lokal mieszkalny vs land/dzierżawa/ograniczony; (2) three sibling hosts share `warmia.mazury.pl` — pin the town host `bipmragowo` (not `bipgmmragowo`, not powiat).

**VERDICT: BUILD (Low effort)** — recurring open municipal flat auctions on a clean warmia.mazury.pl server-HTML BIP with an inline achieved-price results stream; near-clone of the already-built Braniewo adapter, no blockers.
