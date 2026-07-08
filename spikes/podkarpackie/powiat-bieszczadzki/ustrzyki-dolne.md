# Spike — Ustrzyki Dolne (Podkarpackie · powiat bieszczadzki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Ustrzyki Dolne (Urząd Miejski, ~9k, powiat seat) **does** dispose of municipal property via *publiczny przetarg ustny nieograniczony na sprzedaż* on its city BIP `bip.ustrzyki-dolne.pl` — a clean **server-rendered SAM3 CMS** (footer: CONCEPT Intermedia / sam3.pl; `strona-NNN-*.html` boards, `dokument-NNNN-*.html` docs, `dokumenty_rodzaj-NN-*.html` categories). **But the stream is land, not flats.** The przetarg boards are dominated by działki (unbuilt parcels in surrounding villages) plus procurement (zapytania ofertowe: coal, waste, C.O. installs). Flats (lokale mieszkalne) appear only **occasionally and bundled** into multi-item notices, in rural villages (Ustjanowa Górna, Równia), often as repeat rounds (IV przetarg = unsold). The local housing manager **ZGM (Zarząd Gospodarki Mieszkaniowej)** only runs *najem lokali użytkowych* (commercial LEASE), never flat sales. Town-proper flats surface as *wykaz* designations (Plac Chopina 1/2, 35.2 m², 88 123 zł) with method unstated → likely tenant sale. No recurring open-flat-auction stream. **NO-BUILD.**

## 1. Sells municipal property at auction?
**YES for property in general, effectively NO for flats.** Burmistrz Ustrzyk Dolnych runs genuine `publiczny przetarg ustny nieograniczony na sprzedaż`, but the inventory is overwhelmingly land:
- Closed board (`dokumenty_rodzaj-33`, ~30 pages) across ~14 months (Feb 2025–Apr 2026): notice after notice of działki in Leszczowate, Bandrów Narodowy, Ropienka, Brzegi Dolne, Krościenko, Wojtkówka, Ustrzyki Dolne — plus dzierżawa (lease) parcels.
- **Flat auctions found (bundled, rural, repeat rounds):**
  - `dokument-5437` — II/IV przetarg ustny: land plots (Równia) + a house + **lokal mieszkalny nr 2, bud. 97, Ustjanowa Górna, 61,00 m², IV przetarg** (4th round → chronically unsold). Carries a "Wyniki przetargu" PDF.
  - 2025-08-05 notice — sale/dzierżawa mix incl. **lokal mieszkalny nr 2, Ustjanowa Górna** + land parcels.
- **Housing manager ZGM Ustrzyki Dolne** publishes only `publiczny ustny przetarg nieograniczony na NAJEM lokali użytkowych` (commercial-unit LEASE) — no flat sales.
- Town-proper big-ticket items are land/buildings, not flats — e.g. former przedszkole, ul. 29 Listopada, dz. 1240/2, 0,5096 ha, cena wyw. 2 200 000 zł.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (SAM3 CMS):** `bip.ustrzyki-dolne.pl`
- Przetargi wszczęte (active/initiated): `https://bip.ustrzyki-dolne.pl/strona-441-przetargi_wszczete.html`
- Przetargi zakończone (closed, ~30 pp.): `https://bip.ustrzyki-dolne.pl/dokumenty_rodzaj-33-przetargi_zakonczone.html`
- Wykazy nieruchomości (designations): e.g. `https://bip.ustrzyki-dolne.pl/dokument-696-wykaz_nieruchomosci_stanowiacej.html` (flat Plac Chopina 1/2, 35,20 m² + 6,60 m² piwnica, 88 123 zł — designation only, disposal method not stated → likely bezprzetargowo na rzecz najemcy).
- URL patterns: boards `strona-NNN-slug.html`; docs `dokument-NNNN-slug.html`; category listings `dokumenty_rodzaj-NN-slug.html`; pagination `strona-N`.

**Legacy archive host:** `strona-443-przetargi_archiwalne.html` 302-redirects to the old CMS `archiwum.bip.ustrzyki-dolne.pl/index.php?page=group.php&grp=34` (home.pl shared hosting, wildcard-cert mismatch → needs `-k`).

**Do NOT confuse** with the county `cuwustrzykidolne.bip.gov.pl` (CUW procurement) or the promo site `ustrzyki-dolne.pl` (aktualności). Target JST is the town Gmina Ustrzyki Dolne.

Contact: UM, Zofia Karpijewicz, tel. 13 460-80-26, um@ustrzyki-dolne.pl.

## 3. Format + rendering
- **Server-rendered HTML** — SAM3 CMS by CONCEPT Intermedia (footer `www.sam3.pl`). No SPA, no JS gate, no auth/CAPTCHA. Confirmed live via curl + WebFetch of the boards and docs.
- Individual notices = inline HTML text **plus a born-digital PDF attachment** ("Pobierz plik"); some docs also carry a **"Wyniki przetargu" PDF** with the achieved price/nabywca. Parse HTML first, `pdfText` for the attachment (OCR unlikely).
- Legacy archive is a different old CMS (`index.php?page=group.php&grp=34`) on home.pl hosting — cert-broken, low value.

## 4. Volume + achieved-price stream
- **Open-flat-auction volume: essentially nil.** ~2–3 flat instances in 14 months, all **bundled** into land notices, all **rural villages** (Ustjanowa Górna, Równia), several as II/IV rounds (unsold and re-listed) — not a real recurring flat-sale pipeline. The board is a land + procurement board.
- **Achieved prices:** exist but only as **per-document "Wyniki przetargu" PDF attachments**, not a dedicated results/rozstrzygnięcia board — so extracting hammer prices would mean crawling each doc's attachment across a land-dominated feed for near-zero flat payoff.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** bespoke server-rendered HTML → WordPress/custom-HTML family (**brzeg / nowa-sol / bochnia** shape); SAM3/CONCEPT Intermedia is a distinct Podkarpackie BIP CMS with clean `dokument-NNNN-*.html` URLs, technically easy to parse.
- **Why NO-BUILD:** per the heuristic — a city-BIP skewing to **land + rural bundled/tenant flat disposals with ~0 standalone open flat auctions**, and a housing manager (ZGM) that only **leases** commercial units, is a NO-BUILD. There is no recurring open flat-sale auction stream and no results board to justify an adapter. Technically buildable, but the data payoff (municipal flats sold at open auction) is absent.
- **Blockers:** none technical (clean HTML). The blocker is subject-matter: no flat-auction volume.

**VERDICT: NO-BUILD** — SAM3/CONCEPT-Intermedia city BIP (`bip.ustrzyki-dolne.pl`) with a land-and-procurement przetarg board; flats appear only bundled, rural, unsold-repeat, and the ZGM only leases — no recurring open flat-sale auction stream to adapt.
