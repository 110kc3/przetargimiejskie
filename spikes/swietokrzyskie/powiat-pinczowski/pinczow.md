# Spike — Pińczów (Świętokrzyskie · powiat pińczowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (residential = bezprzetargowo na rzecz najemcy; gmina open auctions are land only).

## TL;DR
Gmina Miejsko-Wiejska Pińczów (Urząd Miasta i Gminy) does run `przetarg ustny nieograniczony`, but the open-auction stream is **land** (działki, nieruchomości gruntowe/zabudowane, occasional building). Municipal **flats are disposed of bezprzetargowo to sitting tenants** with bonifications (Uchwała RM XXXVI/386/2021) — the gminny zasób mieszkaniowy is *shrinking* precisely because tenants buy their occupied lokale, not because flats go to open auction. There is **no housing-manager company** (no ZGM/ZBM/MZBM/TBS): flats are run by a *Referat Gospodarki Lokalami Mieszkalnymi* inside the urząd. The one "lokal mieszkalny · przetarg ustny nieograniczony" hit in Pińczów is the **Spółdzielnia Mieszkaniowa w Pińczowie** (a housing cooperative — separate legal entity, out of scope). Active BIP `bip.pinczow.com.pl` runs **2ClickPortal®**; sale announcements ship their body as **.docx attachments** on a messy mixed board (procurement + electoral + admin notices + land + lease). Open flat-auction volume ≈ **0**. Textbook small-Świętokrzyskie-seat NO-BUILD.

## 1. Sells municipal property at auction?
**YES for land / NO for flats.** The Burmistrz publishes `przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiących własność Gminy`, but every sale notice inspected concerns **land or a whole building**, never a separated lokal mieszkalny:
- "Burmistrz … ogłasza (pierwszy/VI) przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiących własność Gminy" — body carried in `ogloszenie_I_przetarg.docx` / `ogloszenie_VI_przetarg.docx`; subject = działki (nieruchomości gruntowe).
- Legacy notice: building at **ul. 3 Maja 40** (użytkowanie wieczyste, market value 831 720 PLN) — a whole property, not a flat.
- 2026 board top items: land **dzierżawa** (ul. Kluka) + public-procurement postępowania (Targowisko, Orlik, kanalizacja, usługi transportowe) — no flat sales.

**Residential = tenant sales, not auctions.** Uchwała RM w Pińczowie XXXVI/386/2021 sets rules for selling municipal lokale to najemcy with bonifikata; the town reported ~68 lokale komunalne + 76 socjalne, with the komunalny pool declining as tenants buy out their flats bezprzetargowo. Flats excluded from sale (Uchwała 26.10.2016) simply stay rented. There is **no open flat-auction pipeline**.

## 2. Where published? (hosts + boards, URLs)
**Primary — active city BIP (2ClickPortal):**
- Przetargi hub: `https://bip.pinczow.com.pl/82-przetargi.html`
- Aktualne przetargi (mixed): `https://bip.pinczow.com.pl/aktualne-przetargi.html`
- By year: `.../aktualne-przetargi-2026.html`, `.../aktualne-przetargi-2025.html`, `.../aktualne-przetargi-2024-r.html`
- Archiwum: `https://bip.pinczow.com.pl/150-archiwum-przetargow.html`
- Sample sale notice: `https://bip.pinczow.com.pl/burmistrz-miasta-i-gminy-pinczow-oglasza-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-stanowiacych-wlasnosc-gminy.html`
- URL shape: SEO slug `<title>.html` (some prefixed with numeric id, e.g. `1841-...html`).

**Legacy host — deprecated:** `https://www.bip.gminy.com.pl/pinczow/` (gminy.com.pl CMS; `przetargi.php`, `przetarg.php?id=NNNN`, `drukuj_przetarg.php?id=NNNN`, archive `przetargiarch.php` ~3 805 hist. entries). Banner: *"Od dnia 08.08.2023 r. aktualne przetargi umieszczane są na stronie bip.pinczow.com.pl"* — read-only history only.

**Out of scope:** `Spółdzielnia Mieszkaniowa w Pińczowie` flat auctions (e.g. Grunwaldzka 12/30, M-3 47,45 m², 142 500 PLN) — cooperative, not the gmina. Contact for gmina sales: Wydział Ochrony Środowiska i Gospodarki Nieruchomościami, ul. 3 Maja 10, tel. 41 357 38 71 w. 313.

## 3. Format + rendering
- **Server-rendered HTML** on **2ClickPortal®** ("Portale nowej generacji"), no JS gate / auth / CAPTCHA.
- **Announcement body = attached `.docx`** (e.g. `ogloszenie_I_przetarg.docx` ~20 kB). The HTML page is a stub: *"Treść ogłoszenia o przetargu dostępna jest w załączniku poniżej."* Parsing would require **docx text extraction** (not inline HTML, not PDF) — an extra, brittle step vs. clean-HTML BIPs.
- Board is a **generic mixed stream** — property sales lumped with procurement, electoral, and administrative obwieszczenia; no property-only or flats-only board.

## 4. Volume + achieved-price stream
- **Open FLAT auctions: ~0/yr** from the gmina. Confirmed early per the go/no-go heuristic — none found across 2024–2026 boards or the legacy archive.
- **Open LAND auctions:** low, a handful/yr (działki + occasional building).
- **Achieved-price stream:** weak. `Informacja o wyniku przetargu` notices appear (e.g. dzierżawa ul. Kluka), but there is **no dedicated flat results board**, and cena osiągnięta would sit inside .docx attachments. No hammer-price flat stream to harvest.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** none from the built roster — 2ClickPortal is a distinct family, and the substance matches the **generic city-BIP NO-BUILD bucket** (cf. `bipgov.net`/Samba small-seat pattern): land + tenant sales, ~0 open flat auctions.
- **CMS family:** 2ClickPortal® (server-HTML slugs) + deprecated gminy.com.pl legacy; sale bodies in `.docx`.
- **Effort if forced:** Medium-High for near-zero yield — docx extraction + heavy classification to strip procurement/electoral/lease/land noise, only to surface land auctions and near-zero flats.
- **Blockers:** (1) **No open flat-auction volume** — residential disposal is bezprzetargowo na rzecz najemcy (Uchwała XXXVI/386/2021). (2) **No housing manager** (Referat inside UM, no ZGM/ZBM/TBS). (3) Body-in-.docx + mixed board raise cost. (4) The only flat auctions are the Spółdzielnia Mieszkaniowa's — out of scope.

**VERDICT: NO-BUILD** — Pińczów's gmina open auctions are land-only; municipal flats leave the stock via bezprzetargowa sprzedaż to tenants, not auctions. No housing-manager auction pipeline, no flat results board, ~0 open flat-auction volume. Small Świętokrzyskie seat, as expected.
