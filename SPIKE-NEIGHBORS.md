# Spike — neighbouring-voivodeship cities (build go/no-go sweep)

> **Status:** spike complete — **knowledge, not code.** No adapter, no
> `extension/` change → no version bump (per [CLAUDE.md](./CLAUDE.md)).
> Live-verified **26 June 2026** by 7 parallel per-city investigation agents,
> one per candidate, each following the methodology in
> [EXPANSION.md](./EXPANSION.md) and [SPIKE-TARNOWSKIE-GORY.md](./SPIKE-TARNOWSKIE-GORY.md):
> answer the three load-bearing questions — (1) does the gmina sell municipal
> property at auction, (2) where is it published, (3) in what format — then a
> BUILD / NO-BUILD verdict with an effort estimate and the closest existing
> analog.
>
> **Why these cities:** all 10 current cities are in **Śląskie**. This sweep is
> the first to look **outside** it — at gminas in the two neighbouring
> voivodeships that hug the existing cluster: **Małopolskie** (east — Chrzanów,
> Trzebinia, Olkusz, Oświęcim, plus the marquee Kraków) and **Opolskie** (west —
> Kędzierzyn-Koźle, Opole). None overlaps the existing 10.

---

## TL;DR

**All 7 candidates sell municipal property at auction — none is a dead end.** The
sweep yields **5 BUILDs** and **2 NEEDS-LIVE-VERIFY** (no outright NO-BUILD):

- **4 clean BUILDs** with both an active-sale stream *and* a confirmed
  achieved-price (result-notice) stream: **Kędzierzyn-Koźle, Kraków, Trzebinia,
  Chrzanów.**
- **1 BUILD** on the offer side, achieved-price stream unconfirmed: **Olkusz.**
- **2 NEEDS-LIVE-VERIFY**, each gated on a single check: **Oświęcim** (are the
  attachment PDFs scanned → OCR, or text?) and **Opole** (is a sold-price result
  notice published anywhere, or announcements only?).

**Two findings make this cheaper than expected:**

1. **Kędzierzyn-Koźle runs the same CMS vendor as Tarnowskie Góry** — Logonet
   eUrząd (K-K footer "Wersja systemu 2.9.0"); both expose the
   `/api/menu/<id>/articles` model and serve **born-digital text PDFs**.
   (Human-facing URL + download shapes differ by version — K-K
   `/artykul/<board>/<id>` + `/attachments/download/<id>` vs TG's
   `a,<id>,<slug>.html` + `/api/articles/<id>` + `/e,pobierz,get.html`.) So the
   Tarnowskie Góry adapter is a near re-skin: reuse its parser family + API
   model, swap in new URL templates, host, board IDs, and two filter rules.
2. **Kraków — the marquee target EXPANSION left unspiked — is a clean BUILD,** not
   the feared mega-project: a bespoke server-rendered HTML BIP with the
   achieved-price stream *in-band* in the page body, dedicated sale-vs-rental
   boards, and per-board RSS feeds for delta ingestion. No SPA, no OCR.

**The one recurring obstacle (and why it isn't a blocker):** the four Małopolskie
gminas all carry a **`bip.malopolska.pl/<gmina>` mirror that is a client-rendered
SPA** — `web_fetch` returns an empty shell for its article and download
endpoints. But every one of them also publishes the **same full text on its own
fetchable host** (Chrzanów `www.chrzanow.pl`, Trzebinia `trzebinia.pl`, Olkusz
`umig.olkusz.pl`, Oświęcim `bip.oswiecim.um.gov.pl`), so the SPA is redundant. If
a build ever needs the BIP itself, the JS-render / JSON-API path is a one-time
unblock shared across the whole Małopolskie cohort.

---

## Verdict table

| City | Voivodeship | Sells at auction? | Host(s) | Format / platform | Sold-price stream? | Closest analog | Effort | Verdict |
|---|---|---|---|---|---|---|---|---|
| **Kędzierzyn-Koźle** | Opolskie | yes | `bip.kedzierzynkozle.pl` | Logonet eUrząd v2.9.0 — server-rendered HTML tables + born-digital **text** PDFs (dual text/skan) | **yes** | **Tarnowskie Góry** (same CMS) | **Low-Med** | **BUILD** |
| **Kraków** | Małopolskie | yes | `bip.krakow.pl` (Wydz. Skarbu Miasta) | Bespoke BIP (ACK Cyfronet) — server-rendered HTML body; achieved prices in-band; RSS feeds | **yes** | Tarnowskie Góry / Bytom | **Low-Med** | **BUILD** |
| **Trzebinia** | Małopolskie | yes | `trzebinia.pl` (Joomla) + bip.malopolska.pl mirror | Server-rendered HTML + inline price **tables**, no OCR | **yes** | Bytom | **Low-Med** | **BUILD** |
| **Chrzanów** | Małopolskie | yes | `www.chrzanow.pl` (Ideo) + bip.malopolska.pl mirror (SPA) | Server-rendered HTML index; bodies on SPA / text PDFs | **yes** (Wyniki board) | Tarnowskie Góry | **Low-Med** | **BUILD** |
| **Olkusz** | Małopolskie | yes | `umig.olkusz.pl` (WordPress) + bip.malopolska.pl mirror | WordPress server-rendered HTML posts, no OCR | unclear (offer yes; achieved not found) | Tarnowskie Góry | **Low-Med** | **BUILD** |
| **Oświęcim** | Małopolskie | yes | `bip.oswiecim.um.gov.pl` (REKORD SI) + oswiecim.pl mirror | HTML list/detail + attachment PDFs that **appear scanned** (OCR) | unclear (notices exist but scanned) | Gliwice / Bielsko-Biała | **Med** | **NEEDS-LIVE-VERIFY** |
| **Opole** | Opolskie | yes | `bip.um.opole.pl` (SISCO) | SSR HTML article bodies behind a SPA list shell, no OCR | unclear (no positive wynik notices found on web) | Bytom | **Low-Med** | **NEEDS-LIVE-VERIFY** |

---

## Cross-cutting findings

- **A new platform family enters the fleet with zero new parser cost:**
  Kędzierzyn-Koźle is **Logonet eUrząd**, identical to Tarnowskie Góry. That
  adapter's PDF regex set (same office boilerplate — *"Cena wywoławcza … wynosiła
  … cena osiągnięta … wyniosła …"*, the `§ 12 Rozporządzenia … Dz.U. 2021 poz.
  2213` anchor) should transfer almost verbatim.
- **`bip.malopolska.pl` is a shared SPA, not a per-city quirk.** It recurs across
  Chrzanów / Trzebinia / Olkusz / Oświęcim (rural) / and the Skarb-Państwa
  streams. `web_fetch` can't render it. Treat it as **one** shared unblock
  (headless render or its internal article/`/api/files/<id>` JSON), not four — and
  in every Małopolskie case here the gmina's own host already carries the full
  text, so the SPA is optional.
- **The housing-authority "rentals trap" held in every city.** As EXPANSION
  predicted, the ZGM/MZN/MZLK/ZBK-style authority runs **najem/dzierżawa**
  (rentals); municipal **sales** are run by the city/gmina hall (Wydział
  Gospodarki Nieruchomościami / Mienia / Skarbu Miasta) and published on the
  gmina BIP. Every agent located the sale stream on the city side and correctly
  set the rental authority aside (Trzebinia's `mzn-trzebinia.pl`, Kraków's
  `zbk-krakow.pl`, Opole's MZLK, etc.).
- **Out-of-scope sibling streams to exclude at build time:** the **powiat /
  starostwo** and **Skarb Państwa** (Nadleśnictwo, Marshal's Office,
  `bip.malopolska.pl/muw`) publish their *own* property sales on the same portals.
  These are different owners — filter to the gmina/miasto. (Olkusz's only
  result-notice hit was Nadleśnictwo Olkusz; Kraków's `bip.malopolska.pl` carries
  only Skarb Państwa, not Gmina Miejska Kraków.)
- **Achieved-price stream is the real differentiator,** not whether sales exist.
  Four cities publish a clean *"informacja o wyniku przetargu"* (cena wywoławcza →
  cena osiągnięta → nabywca, or *wynikiem negatywnym*); the two NEEDS-LIVE-VERIFY
  cities are gated precisely on this signal (Oświęcim has it but scanned; Opole's
  couldn't be found on the web).
- **Adding any of these crosses a voivodeship boundary for the first time.** The
  README's "several Silesian cities" framing, the extension `manifest.json` host
  list, and `data/index.json` would each gain a non-Śląskie entry — a downstream
  build note, not a spike blocker.

---

## Recommended build order

Ordered by certainty × cost (each is independently spike-gated and ships with a
test fixture, per house practice):

1. **Kędzierzyn-Koźle (Opolskie) — first.** Same Logonet platform as Tarnowskie
   Góry; both streams confirmed live; clean text PDFs. Lowest effort, highest
   certainty — mostly a re-skin of the Tarnowskie Góry Logonet adapter (new URL
   templates, host, board IDs 85/127, + "skip `skan` PDF" and "skip dzierżawa
   rows").
2. **Trzebinia (Małopolskie).** Friendliest format in the sweep — inline
   server-rendered HTML price tables on a single fetchable host
   (`trzebinia.pl`), no OCR, both streams confirmed. Analog: Bytom.
3. **Kraków (Małopolskie).** Highest-value marquee; server-rendered HTML +
   in-band achieved prices + RSS. "Med" only for archive volume and prose-parsing
   variety, not platform risk.
4. **Chrzanów (Małopolskie).** BUILD with a dedicated *Wyniki przetargów* board.
   Sequence after Trzebinia so the shared `bip.malopolska.pl` render-path
   decision (if needed) is already made.
5. **Olkusz (Małopolskie).** Clean offer-side BUILD on WordPress; **verify the
   achieved-price stream on the BIP at build** — if absent, it yields
   cena wywoławcza + negative-result inference only.
6. **Oświęcim (Małopolskie) — verify first.** Pull 3–5 `MK.6840*`
   announcement/result PDFs through a real text extractor. Text → BUILD (Low-Med),
   REKORD list/detail reuses the Bielsko-Biała plumbing. Scanned (as 3/3 empty
   fetches suggest) → BUILD but Gliwice-grade OCR (Med-High).
7. **Opole (Opolskie) — verify first.** Confirm whether *any* sold-price result
   notice is published (transient WGN posting, `rejestr-zmian`, or wykazy board).
   If yes → BUILD; if announcements-only, decide whether cena-wywoławcza-only
   coverage is in scope.

---

## Per-city findings

## Kędzierzyn-Koźle (Opolskie)

**TL;DR:** Clean BUILD. Gmina Kędzierzyn-Koźle sells municipal property (flats,
commercial units, land) at `przetarg ustny nieograniczony` and publishes the full
pipeline — wykaz → ogłoszenie → wynik — on its own BIP at `bip.kedzierzynkozle.pl`.
The CMS is **Logonet Sp. z o.o. (eUrząd, "Wersja systemu: 2.9.0")**, the
**identical vendor/platform to Tarnowskie Góry**, the cleanest existing adapter.
The achieved-price stream is confirmed: result notices give cena wywoławcza + cena
osiągnięta + nabywca, or *wynikiem negatywnym*. The department posts **two PDFs per
result — a born-digital text PDF and a scanned copy** — and the text PDF extracts
perfectly. Reuse the Tarnowskie Góry parser family; the one new rule is to prefer
the non-`skan` attachment.

**1. Sells at auction? YES (live evidence):**
- **Land, sold (positive result):** dz. 450/7, o. Sławięcice, rejon ul. Roberta
  Kocha, 0,0494 ha. I przetarg 01.10.2025. **Cena wywoławcza 60 000,00 zł → cena
  osiągnięta 60 600,00 zł (netto); nabywca: Teresa Foltys-Błach i Łukasz Błach.**
  PDF: `bip.kedzierzynkozle.pl/attachments/download/73247`
- **Land, negative result:** dz. 1756/5,9,10, o. Kędzierzyn, ul. Grunwaldzka,
  0,0745 ha. XIV przetarg 17.06.2026. **Cena wywoławcza 80 000,00 zł; "Przetarg
  zakończony został wynikiem negatywnym."** PDF: `…/attachments/download/78414`
- **Flats at auction:** ul. Grunwaldzka 51/1, Zwycięstwa 6/6, Piastowska 4/5-6,
  Targowa 7/5 — I/II przetarg, 10.12.2025, each with linked wykaz / ogłoszenie /
  wynik. Index: `…/artykul/85/27668/…rok-2025`; results: `…/artykul/127/29314/…`
- Run by **Urząd Miasta, Wydział Gospodarki Nieruchomościami i Planowania
  Przestrzennego, ul. Piastowska 17** — in-scope city-hall signal.

**2. Where published:** Host `bip.kedzierzynkozle.pl` (Opolskie; TERYT 160301_1;
**not** bip.malopolska.pl). **Two parallel boards:** menu **85**
("Gospodarowanie… obrót nieruchomościami") holds year-indexed **master tables**
(l.p. | adres | Wykaz | Ogłoszenie | Termin wadium | Termin przetargu | Wynik) —
the ideal crawl anchor, years 2023–2026; menu **127** ("Sprzedaż, dzierżawa,
obciążanie…") holds the **article pages** where the PDFs hang. Board 127 also
carries **dzierżawa** → filter to sprzedaż + przetarg ustny nieograniczony. The
powiat BIP sells separately → out of scope.

**3. Format / platform:** **Logonet eUrząd, footer "Wersja systemu: 2.9.0"** —
same vendor/platform as **Tarnowskie Góry**. URL grammar: `/artykuly/<menu>/<slug>`,
`/artykul/<board>/<id>/<slug>`, `/attachments/download/<file_id>`, print-PDF
`/artykul/pdf/<board>/<id>/1`, plus an `/api/menu/<id>/articles` route.
**Server-rendered HTML works fully via web_fetch** — no SPA gate. **Load-bearing
PDF nuance:** each result is posted as **two attachments** — a **born-digital text
PDF** (clean extraction, verified verbatim) and a **scanned `… skan.pdf`**
(OCR-garbled). Adapter rule: drop filenames containing `skan`, parse the sibling
text PDF; OCR-fallback only where a scan is the sole copy.

**4. Volume + achieved-price stream:** 2025 flats/commercial master table alone
lists **~41 numbered rows** (many re-auctions II–XIV across a smaller asset set);
plus separate land tables and prior years → **dozens of events/year, low-hundreds
of records total**. **Achieved-price stream: YES**, both positive and negative
examples verified; prices quoted netto.

**5. Adapter effort + verdict:** Closest template **Tarnowskie Góry** (same
Logonet). Parser: crawl board-85 master tables → follow to board-127 articles →
select non-`skan` PDF → regex result/announcement fields. Watch-items: board split
(85 vs 127), dzierżawa noise, dual-PDF selection, occasional multi-asset notices;
the `/api/menu/<id>/articles` JSON couldn't be confirmed via web_fetch (empty
body) but the HTML fallback is sufficient. **VERDICT: BUILD — Low-Med.**

Sources: `…/artykul/85/27668/…rok-2025` · `…/artykul/85/27666/…gruntowych…rok-2025`
· `…/artykul/127/30095/informacje-o-wynikach-przetargow` · `…/attachments/download/73247`
(sold) · `…/attachments/download/78414` (negative, clean text PDF).

## Kraków (Małopolskie)

**TL;DR.** Kraków sells municipal real estate at auction and publishes it on a
single, well-structured, **server-rendered HTML** portal (`bip.krakow.pl`,
bespoke CMS by ACK Cyfronet AGH). Both announcements and result notices are
full-text HTML prose — starting price, address, district, area, auction date,
achieved price, and named buyer all in the page body, with a structured *Metka*
footer. No SPA, no JSON-API-behind-shell, no OCR for the core fields (PDF/map
attachments are supplementary). Dedicated boards cleanly separate sales from
rentals, and there's a long results archive (~55 pages) carrying the
achieved-price stream. ZBK runs only rentals — correctly out of scope. Among the
**easiest** sources to adapt; complexity is volume/text-parsing, not platform.

**1. Sells at auction?** Yes — result notice of **15 Apr 2026**
(`bip.krakow.pl/?news_id=249643`): garage G12, ul. Królewska 69, 17 m², Krowodrza
— **cena wywoławcza 114 000 zł → osiągnięta 130 000 zł → nabywca: Pani Zuzanna
Markiewicz**; same notice item 2: a 2/6 land share, dz. 169/16, Podgórze, ul.
Łagiewnicka, 47 700 zł brutto → *wynikiem negatywnym*. Matching announcement
(`?news_id=245809`): "Prezydent Miasta Krakowa ogłasza przetargi ustne
nieograniczone na sprzedaż nieruchomości stanowiących własność Gminy Miejskiej
Kraków." Publisher: WYDZIAŁ SKARBU MIASTA.

**2. Where published?** Single host **`bip.krakow.pl`**, hub *Finanse i Mienie →
Majątek Gminy → Nieruchomości → Przetargi na Nieruchomości* (`?dok_id=16407`),
split into boards: **`?dok_id=30626`** przetargi nieograniczone/rokowania na zbycie
(in scope; archive `102895`, ~58 pp.); **`132928`** przetargi ograniczone (in
scope); **`30630`** *informacje o wynikach przetargów* — **gold** (archive
`102899`, ~55 pp.); `30627`/`30628`/`30629` zamiana/użytkowanie/dzierżawa — out of
scope. **Per-board RSS** exists (`/feeds/rss/komunikatynowe/30626`, `…/30630`) — a
clean delta path. ZBK (`zbk-krakow.pl`) = rentals; `bip.malopolska.pl` = Skarb
Państwa only — neither is the Gmina stream. Caveat: board 30630 mixes the rare
dzierżawa-result, so filter on "na sprzedaż / zbycie".

**3. Format / platform.** Bespoke BIP (footer "© 2003-2025 … ACK Cyfronet AGH").
**Not** FINN/eUrząd/Logonet/SISCO/Wrota, **not** a SPA. URL shape: list `?dok_id=N`
(`&strona=N` pagination), article `?news_id=N`. Body = clean Polish prose with
consistent boilerplate ("Cena wywoławcza wynosi: …", "Nabywcą … ustalona została
…", "zakończył się wynikiem negatywnym") + a *Metka* metadata block. Attachments
(maps/floorplans) hold no economic data → **no PDF/OCR for core fields.** web_fetch
reached every page; no anti-bot/JS wall.

**4. Volume + achieved-price stream + asset mix.** Moderate-to-high: announcement
archive ~58 pp., results ~55 pp. (~10 items/page since ~2007–08), each notice
bundling 2–6 properties; roughly monthly sessions. **Achieved-price stream: YES,
structured.** Asset mix predominantly **flats** (Basztowa, Grodzka, Kalwaryjska,
Długa 31, Słowackiego 50…) plus a real **land/fractional-share** tail and
occasional **garaże**; many are second auctions.

**5. Adapter effort + verdict.** Closest template **Tarnowskie Góry** (parser
family: clean text, achieved prices in-band, no OCR) + **Bytom** (crawl shape:
paginated server-rendered list → article body). Parser: HTML list crawler + body
field-extractor + Metka dates; two passes (announcements + results) joined on
address + auction date. No platform blockers; real work is prose-parsing variety,
sale-vs-rental filtering on the shared results board, and back-archive volume; RSS
gives a clean forward delta. **VERDICT: BUILD — Low-Med.** High-value, low-risk,
fully verified live.

Sources: hub `?dok_id=16407` · announcements `?dok_id=30626` (archive `102895`) ·
results `?dok_id=30630` (archive `102899`) · live announcement `?news_id=245809` ·
positive result `?news_id=249643` · negative result `?news_id=244873` · RSS
`/feeds/rss/komunikatynowe/30626`.

## Trzebinia (Małopolskie)

**TL;DR.** A clean BUILD. The gmina hall (Burmistrz Miasta Trzebini, Wydział
Geodezji i Gospodarki Nieruchomościami) runs "przetarg ustny nieograniczony na
sprzedaż" for flats, land, and buildings, and publishes the **full announcement as
inline server-rendered HTML** on `trzebinia.pl` — including a structured HTML table
carrying cena wywoławcza, wadium, and termin przetargu. An **achieved-price
result-notice stream** is on the same board. Harvest entirely from `trzebinia.pl`;
never touch the un-fetchable `bip.malopolska.pl`. The MZN rental trap is cleanly
separable. Closest analog Bytom; no OCR/PDF parsing — easier than most of the
existing 10.

**1. Sells at auction? YES — live:**
- **Land:** "I przetarg … niezabudowanej działki przy ul. Robotniczej" — dz. 3620,
  0,1418 ha, obr. Góry Luszowskie, **cena wywoławcza 137 000,00 zł (z VAT)**, wadium
  10 000 zł, przetarg 20.01.2026 09:00, KW KR1C/00046961/0, własność Gminy Trzebinia.
  `trzebinia.pl/administracja-miasto-i-gmina/tablica-ogloszen/ogloszenia/11856-…`
- **Flat:** "II przetarg … lokalu mieszkalnego nr 41, bud. 2, ul. Gwarków, 26,65
  m², własność Gminy Trzebinia". `…/ogloszenia/11859-…`
- Plus działki przy Fabrycznej (Bolęcin), Ogrodowej / nr 3582, Słonecznej, and
  the "wykaz nieruchomości przeznaczonych do sprzedaży" stream.

**2. Where published — host split.** **Primary (harvestable): `trzebinia.pl`** →
*Administracja, miasto i gmina → Tablica ogłoszeń → Ogłoszenia*
(`/administracja-miasto-i-gmina/tablica-ogloszen/ogloszenia`), a paginated list of
full-HTML articles — where full text, price tables, and result notices were
verified. **Mirror: `bip.malopolska.pl/umtrzebinia`** (board `,m,120881,`) — mixes
property sales with public-procurement notices, and is the un-fetchable SPA.
**TRAP (separable): `mzn-trzebinia.pl`** (Miejski Zarząd Nieruchomości) — its entire
"Przetargi" archive is **rentals** ("na najem"), different host, easy to exclude.

**3. Format / platform.** **Joomla** (SEF URLs, `?tmpl=component&print=1` print
views, meta-generator "BlueCoyote Administration"). **Server-rendered HTML, not a
SPA** — web_fetch returns the full body, including a structured `<table>`:
Oznaczenie działki | Cena wywoławcza z VAT | Wadium | Termin wniesienia wadium |
Termin przetargu. **No PDF, no OCR, no .doc/.rtf** for the body — the easiest
parser class in the project. `bip.malopolska.pl` returns an empty body (SPA);
redundant here, so not used.

**4. Volume + achieved-price stream.** Moderate, steady (~33k pop.). The tablica
ogłoszeń is a **mixed board** (KOWR, komunikaty, zarządzenia, sale przetargi
interleaved) → filter by title ("przetarg ustny nieograniczony na sprzedaż" /
"o wynikach przetargu" / "wykazu … do sprzedaży"). ~6–8 distinct sale auctions
across 2024–25 (several with II/III rounds) + wykazy + result notices; low-tens of
records/year. **Achieved-price stream: YES** — "Informacja Burmistrza … o wynikach
przetargu": confirmed dz. Lgota 1080/34, **cena wywoławcza 7 000 zł → osiągnięta
7 100 zł, nabywca Sylwester Piasny** (`…/ogloszenia/9562-…`); a second hit (54 500
zł + VAT) corroborates.

**5. Adapter effort + verdict.** Closest template **Bytom**, even cleaner (price
table is inline HTML, no .doc/catalog). Parser: paginated HTML list crawler +
per-article HTML/table extractor + title-keyword classifier to split sale / wyniki
/ wykazy from the noisy board and the MZN rental trap. Watch-outs: mixed board
needs the title filter; `/en/` locale variants (pin PL canonical); confirm
pagination depth for backfill. **VERDICT: BUILD — Low-Med.** Single fetchable host
covers announcements, wykazy, and results; friendliest format in the portfolio.

Sources: `…/ogloszenia/11856-…` (land, full text+table) · `…/ogloszenia/11859-…`
(flat) · `…/ogloszenia/9562-…` (result + buyer) · board `…/tablica-ogloszen/ogloszenia`
· BIP mirror `bip.malopolska.pl/umtrzebinia,m,120881,…` (un-fetchable) ·
`mzn-trzebinia.pl/category/przetargi/` (rental trap, out of scope).

## Chrzanów (Małopolskie)

**TL;DR — BUILD, Low-Med.** Chrzanów's Urząd Miejski (Burmistrz Miasta Chrzanowa)
runs `przetarg ustny nieograniczony na sprzedaż` and publishes a clean, structured
stream: separate boards for **land**, **buildings + flats**, and — critically — an
**achieved-price results board** (*Wyniki przetargów*). Adds flats, developed
nieruchomości, and land, plus a genuine sold-/negative-result history. Closest
analog **Tarnowskie Góry**, with the wrinkle that the *full announcement text* lives
on the **bip.malopolska.pl SPA** (web_fetch can't render it) — so the adapter reads
titles/teasers from the server-rendered `www.chrzanow.pl` and fetches full bodies
via the BIP article route or attachment PDFs.

**1. Sells at auction? YES.** Live, structured:
- **Flat:** lokal mieszkalny nr 4, bud. 15, ul. Oświęcimska — **cena wywoławcza
  185 000 zł**, 35,74 m², KW KR1C/00076204/5, termin 28.10.2024 13:00; body records
  the prior round ("5.09.2024 … wynikiem negatywnym").
- **Building plots:** Ogłoszenie Burmistrza z 9.10.2025 — dwie działki ul.
  Borowcowa (obr. Pogorzyce), **205 000 / 217 000 zł** (+23% VAT), termin
  19.11.2025, MPZP MN1. Każda KW Dział II = **"Gmina Chrzanów"** (municipal, not
  Skarb Państwa).
- Live boards show ~5 active land items + the Oświęcimska flat.

**2. Where published — two reinforcing surfaces.** **City portal (index):**
`www.chrzanow.pl/zbycie-nieruchomosci/` with sub-boards
`…/ogloszenia-o-przetargach/nieruchomosci-niezabudowane` (land),
`…/nieruchomosci-niezabudowane-i-lokale` (buildings + flats — slug mislabeled),
`…/wyniki-przetargow` (**results**), `…/wykazy-…` (wykazy). Each item is a stub
linking to the BIP article. **BIP (full text):**
`bip.malopolska.pl/umchrzanow` under *Ogłoszenia różne*, foldered by year. Rentals
(*Użyczenia, dzierżawy, najem*) are a separate branch → exclude; the powiat /
`bip.malopolska.pl/muw` carry Skarb Państwa → exclude.

**3. Format / platform.** **City portal = Ideo CMS, fully server-rendered HTML**,
numeric node IDs, fetches cleanly — the reliable enumeration layer.
**`bip.malopolska.pl/umchrzanow` = shared Małopolska BIP SPA — web_fetch returns an
EMPTY body** for `,a,<id>,…` articles and `e,pobierz,get.html?id=` downloads (the
one real blocker; legal body + price table render via JS). Workarounds: (a)
JS-render / the BIP internal article API; (b) full text mirrored on
`otoprzetargi.pl` / `przetargi-komunikaty.pl` (verified — whole table + clauses);
(c) **text** PDF attachments (mirror copies are text, so originals almost certainly
text, not scanned). No TLS/auth/robots wall on `www.chrzanow.pl`.

**4. Volume + achieved-price stream.** Modest but real (~37k-pop. powiat seat).
Active ~5–6 sale ogłoszenia (5 land + 1 flat) + wykazy; BIP IDs span 2022→2026,
mirrors carry Chrzanów sales back to 2012–13 → dozens-to-low-hundreds historical.
**Achieved-price stream: YES** — dedicated *Wyniki przetargów* board (Balin,
Borowcowa, Główna/Armii Krajowej, Oświęcimska 15/3, Bereska…), standard cena
wywoławcza → osiągnięta → nabywca shape.

**5. Adapter effort + verdict.** Closest template **Tarnowskie Góry** (clean
server-rendered, per-asset-type boards + a distinct results board). Parser: HTML
list scrape on `www.chrzanow.pl` (titles, node IDs, board → asset type) → resolve
each to its BIP article → extract body via **either** JS-render/BIP article-JSON
**or** text-PDF extraction (no OCR). The legal table is regular →
straightforward field extraction, same family as Bytom/Tarnowskie Góry. Blockers:
the bip.malopolska.pl SPA render-path decision (shared across the Małopolskie
cohort — solve once); filter rentals + powiat/Skarb-Państwa; don't infer asset type
from the mislabeled slug. **VERDICT: BUILD — Low-Med** (the sale + results streams
are verified via the server-rendered portal and full-text mirrors; only the BIP
article render is unconfirmed, so make that the first build probe).

Sources: `www.chrzanow.pl/zbycie-nieruchomosci/…/nieruchomosci-niezabudowane` ·
`…/nieruchomosci-niezabudowane-i-lokale` · `…/wyniki-przetargow` ·
`bip.malopolska.pl/umchrzanow,a,2872372,…` (Oświęcimska 15/3, SPA) · full-text
mirrors otoprzetargi.pl / przetargi-komunikaty.pl.

## Olkusz (Małopolskie)

**TL;DR.** Olkusz (gmina miejsko-wiejska) regularly sells municipal real estate at
auction — flats, share-in-building/townhouse, and undeveloped land — under
"przetarg ustny nieograniczony na sprzedaż" (Wydział Geodezji i Gospodarki
Mieniem). The cleanest fully-fetchable source is the gmina's own **WordPress site
`umig.olkusz.pl`**, which renders each announcement's complete body as inline HTML
(no PDFs, no OCR) and exposes a paginated archive index (~22 pages) where SALE vs.
dzierżawa/najem is visible in the post title. The shared `bip.malopolska.pl/umigolkusz`
mirror didn't render to web_fetch (redundant). The one genuine gap: no published
*"informacja o wyniku przetargu"* with cena osiągnięta + nabywca for a *gmina* sale
was found; announcements cite only prior-auction dates. Closest analog Tarnowskie
Góry. **BUILD — Low-Med**, with the achieved-price stream flagged for build-time
verification.

**1. Sells at auction? Yes** — confirmed with full announcements:
- **V przetarg, niezabudowana dz. 638/25 (3 137 m²), KW KR1O/00023702/2, ul.
  Wapienna — cena wywoławcza 627 400 zł; 11.04.2025** (`umig.olkusz.pl/index.php/2025/02/07/7-lutego-2025-3/`)
- **IV przetarg, udział 0,892 w zabudowanej dz. 2603, ul. K.K. Wielkiego 44
  (kamienica, 9 lokali) — 970 000 zł; 25.10.2024** (`…/2024/08/23/23-sierpnia-2024/`)
- **VI przetarg, ~1,92 ha rejon ul. Rabsztyńskiej — 4 600 000 zł; 15.09.2023**
  (`…/2023/07/07/07-07-2023-ogloszenie/`); plus historic Januchty (141 000 zł),
  Zederman (700 000 zł), and a spółdzielcze prawo do lokalu.

**2. Where published.** The mandatory disclosure paragraph names three channels:
tablica UMiG (Rynek 1); **`www.umig.olkusz.pl` dział "Nieruchomości"** (the
WordPress site — fully fetchable); **`bip.malopolska.pl/umigolkusz`** under
"zamówienia publiczne i ogłoszenia różne" (formal BIP of record). Dzierżawa/najem
wykazy share the stream but are titled distinctly → filterable.
`platformazakupowa.pl/pn/olkusz` is procurement → out of scope.

**3. Format / platform.** **WordPress 7.0** (LiteSpeed). Each announcement is a
dated post `/index.php/YYYY/MM/DD/<slug>/` with the **entire legal text as clean
inline HTML** — no PDF, no scan, no OCR; predictable phrasing ("Cena wywoławcza do
przetargu wynosi:", "Przetarg odbędzie się w dniu …"). Paginated archive at
`/index.php/author/adminolkusz/page/N/` (~22 pp.), each item title + summary, SALE
vs rental visible in the title — ideal crawl seed. **Mirror `bip.malopolska.pl/umigolkusz`:**
shared Małopolska BIP, **empty to web_fetch on all attempts** (JS/anti-bot);
redundant since WordPress carries the full text. Not FINN/Logonet/SISCO; primary is
plain WordPress (WP REST `/wp-json/wp/v2/posts` would likely also serve it).

**4. Volume + achieved-price stream.** Moderate/steady — the same parcels recur as
I–VI przetargi (Rabsztyńska→VI, Wapienna→V, K.K.Wielkiego→IV) across 2021–25, i.e.
a handful of distinct objects/year + re-runs; ~22 author-pages back to 2023, plus
an older Joomla `archiwum.umig.olkusz.pl` for pre-2023. **Achieved-price stream:
unclear/likely thin** — announcements record prior-auction *dates* only; **no live
gmina "informacja o wyniku" with cena osiągnięta + nabywca** found (the one result
notice was Nadleśnictwo Olkusz — out of scope). The reliable signal is cena
wywoławcza per round; negative-result inference via re-listing number is possible.

**5. Adapter effort + verdict.** Closest template **Tarnowskie Góry** (clean
HTML/text, no OCR); list-crawl resembles Bytom (paginated WP archive). Parser:
HTML-list (filter "na sprzedaż"/"przetarg ustny nieograniczony"; exclude
dzierżawa/najem/wykaz-do-dzierżawy) → HTML-detail regex (cena wywoławcza, wadium,
działka/KW, ul., dates). No PDF/OCR/SPA. Watch-items: **achieved-price stream
unconfirmed** (verify on the BIP at build); bip.malopolska.pl not fetchable here;
pre-2023 history on a separate Joomla archive; handle "udział w nieruchomości".
**VERDICT: BUILD — Low-Med** (strong clean offer-side coverage; the single open
item is the sold stream, which keeps it Low-**Med** not Low).

Sources: `umig.olkusz.pl/index.php/2025/02/07/7-lutego-2025-3/` ·
`…/2024/08/23/23-sierpnia-2024/` · `…/2023/07/07/07-07-2023-ogloszenie/` ·
`…/index.php/author/adminolkusz/page/2/` (archive index) ·
`bip.malopolska.pl/umigolkusz,m,173386,…` (not fetchable).

## Oświęcim (Małopolskie)

**TL;DR.** The **City of Oświęcim** (Gmina Miasto Oświęcim — distinct from the rural
"Gmina Oświęcim") actively sells municipal real estate at auction and publishes on
its own BIP at **`bip.oswiecim.um.gov.pl`** (a **REKORD SI**-family BIP, host
`bip2.umoswiecim.rekord.com.pl`), with a full WordPress mirror at `oswiecim.pl`.
Board structure is clean and scrapable: a server-rendered HTML list (`/5987`
Nieruchomości, 114 pages) with Symbol + date + title, and `/5987/dokument/NNNNN`
detail pages exposing an attachment table linking PDFs via `…/api/download/file?id=NNNNN`.
**The blocker is the PDFs:** the substantive content (street, cena wywoławcza,
działka, area, and the result/cena osiągnięta) lives inside attachment PDFs, and
every announcement/result PDF tested returned **no machine-readable text** —
i.e. they appear to be **scanned images requiring OCR** (Gliwice pattern). Result
notices clearly exist, but in the same scanned form. Verdict: **NEEDS-LIVE-VERIFY**
— almost certainly buildable, but confirm PDF text-vs-scan before committing (that
fact swings effort between Low-Med and Med-High).

**1. Sells at auction? YES (city, not rural gmina).** Every document reads
"własność Gminy Miasto Oświęcim":
- Przetarg na sprzedaż, ul. Zwycięstwa — Symbol `MK.6840.18.2025.IV`, posted
  2026-06-11 (later "Odwołanie przetargu"). `…/5987/dokument/54918`
- Przetarg na sprzedaż, ul. Krasińskiego — `MK.6840.2.2025.IV`. `…/dokument/54915`
- Wykaz — lokal mieszkalny ul. Budowlanych 35/3 — `MK.6840.5.2026.XI`. `…/dokument/54912`
- Worked example (older HTML post): II przetarg, lokale Mały Rynek 9/4–9/6, e.g.
  9/4 = 61,19 m², **cena wywoławcza 120 792,00 zł**, prior round "wynikiem
  negatywnym" (`oswiecim.pl/przetarg-na-sprzedaz-lokali-mieszkalnych-8/713/`).
  Run by **Wydział Mienia Komunalnego — Referat Gospodarki Nieruchomościami**
  (symbol `MK.6840` = sales; `MK.6845` = dzierżawa → filter out).

**2. Where published.** Primary `bip.oswiecim.um.gov.pl` → **Nieruchomości** board
`/5987` (sales, wykazy, results, odwołania) and broader **Ogłoszenia** `/5683`;
detail `/5987/dokument/NNNNN`; attachments `/api/download/file?id=NNNNN`; pagination
`/5987/strona/N` (114 pp.); archive `/6829`. Mirror `oswiecim.pl/urzad-miasta/ogloszenia/`
(WordPress 6.9.4, `?p=NNNNN`) carries the same items + result-notice posts. The
**rural Gmina Oświęcim** publishes on `bip.malopolska.pl/ugoswiecim` → out of scope
(filter by host / "Gmina Miasto Oświęcim").

**3. Format / platform.** **REKORD SI** BIP (redirect host
`bip2.umoswiecim.rekord.com.pl` — same vendor family as Bielsko-Biała). Not
FINN/Logonet/SISCO/SPA. List + detail = plain server-rendered HTML (Symbol + date +
title; metadata + a *Pliki* PDF table) — trivial to parse. **Documents: attachment
PDFs that appear scanned** — 3/3 fetched (ul. Zwycięstwa announcement, ul.
Krasińskiego, 2025 ul. Gospodarcza result) returned **no machine-readable text** →
OCR almost certainly required. Older (pre-~2015) items sometimes carry full HTML
body on the WordPress mirror, but the 2025–26 pattern is metadata + scanned PDF.
(Caveat: web_fetch's extractor can misreport a valid text PDF as empty; the 3/3
failure makes scanned-image the strong call but is the one thing to verify
hands-on.)

**4. Volume + achieved-price stream.** Healthy — Nieruchomości board = **114 list
pages** (mixes sales/wykazy/dzierżawa/results); after filtering `MK.6840*`, a
meaningful active set + deep multi-year archive, comparable to mid-tier Śląskie
cities. **Achieved-price stream: present but degraded** — "informacja o wyniku
przetargu" notices are published (ul. Gospodarcza confirmed; B. Prusa, Obozowa,
Nadwiślańska indexed) carrying cena wywoławcza + osiągnięta/nabywca or wynik
negatywny — but as **scanned PDFs**, so not cleanly extractable without OCR.

**5. Adapter effort + verdict.** Closest template **Gliwice** (HTML list/detail +
OCR-required PDFs) for parsing reality; **Bielsko-Biała** for the REKORD
list/detail/`api/download/file` plumbing (already in-fleet → list half near-free).
Parser: HTML list+detail → PDF fetch → **text extraction with OCR fallback**;
filter `MK.6840*`, drop `MK.6845*` + rural-gmina hosts. Blockers: **scanned PDFs**
(the effort driver), city-vs-rural disambiguation, interleaved results. **VERDICT:
NEEDS-LIVE-VERIFY — Med.** Pull 3–5 `MK.6840*` PDFs through a real extractor: text →
**BUILD (Low-Med)**; scanned → **BUILD (Med-High)** Gliwice-style OCR. Don't
green-light as plain BUILD until that check is done.

Sources: board `bip.oswiecim.um.gov.pl/5987` · detail `…/5987/dokument/54918` ·
attachment `…/api/download/file?id=54920` · mirror `oswiecim.pl/urzad-miasta/ogloszenia/`
· result `oswiecim.pl/informacja-o-wyniku-przetargu-ul-gospodarcza-8/76925/`.

## Opole (Opolskie)

**TL;DR.** Opole (Opolskie capital) sells municipal property at oral auction and
publishes rich, full-text announcements on `bip.um.opole.pl` under `/przetargi,9`.
The CMS is **SISCO** (editore.pl) — a JS SPA whose **individual article pages are
server-rendered and fetch cleanly as structured HTML** (title, cena wywoławcza,
wadium, date/time/room, deadlines, KW, MPZP, + a Metadane table). One of the
cleaner announcement targets — closest to **Bytom** (server-rendered HTML, no
PDF/OCR). The catch: **no positive result notices** ("informacja o wyniku
przetargu" with cena osiągnięta + nabywca) found anywhere on the web BIP; negatives
appear only inline inside the next re-listing, and the menu has no "Wyniki
przetargów" node. Achieved-price stream **unconfirmed → NEEDS-LIVE-VERIFY**.

**1. Sells at auction? Yes** — live, dated, priced:
- **Land (mega-lot):** rejon ul. Wrocławskiej-Brzeskiej, 8,8193 ha, obr. Wrzoski —
  **cena wywoławcza 12 630 200,00 zł + 23% VAT**, 20.02.2025. `bip.um.opole.pl/przetargi,9_2025-2_225`
- **Flat:** lokal mieszkalny nr 2, ul. Rynek 3, 68,38 m², zabytek — **624 000,00
  zł**, 28.01.2026 (`…,9_2026-1_390`; prior round 607 000 zł `…,9_2024-6_159`).
- **Developed building:** ul. ks. K. Damrota 12 (budynek biurowy, zabytek) —
  **350 000,00 zł**, 16.10.2024 (`…,9_2024-10_195`). Negative inline:
  "I przetargu … który zakończył się wynikiem negatywnym" (`…,9_2025-1_208`).
  Owner: **Wydział Gospodarki Nieruchomościami**; MZLK only handles flat viewings
  (rentals/stock).

**2. Where published.** Single host **`bip.um.opole.pl`**, board **`/przetargi,9`**;
scraper-friendly hierarchy: year `,9_2025` → month `,9_2025-2` → article
`,9_2025-2_225` (trailing token = article ID). **No asset-type split** — all on one
board. `bip.opolskie.pl` (Marshal's Office) is the regional government → out of
scope.

**3. Format / platform.** **SISCO** (footer "© SISCO", meta-Author "editore.pl
Wrocław"). **List/index pages are SPA-rendered** (board root returns only chrome to
a non-JS fetcher) — but **every individual article page is server-rendered** and
web_fetch returned the complete body as clean HTML; in all 6 articles the Załączniki
table was empty (announcement text inline) → **zero attachment-parsing burden** for
announcements. Crawl: enumerate via year→month index (IDs in SSR breadcrumbs / `site:`
indexing / sequential probing / the underlying SISCO AJAX endpoint), then fetch each
`…_<id>`. No exposed JSON API confirmed.

**4. Volume + achieved-price stream + asset mix.** Modest-to-moderate (~125k pop.,
commercial/land-leaning). Month-page enumeration shows a handful of sale auctions
per month, often re-runs (I→II→III). Archive 2022→2026. **Asset mix:** skewed to
**land** (Wrzoski 8,8 ha, Berylowa, Broniewskiego…) and **commercial/zabytek
buildings** (Damrota 12), with a thinner but real **flat** stream (Rynek 3, Plac
Jana Kazimierza 1, Plebiscytowa 36…). **Achieved-price (sold) stream: NOT found on
the web** — no "informacja o wyniku" with cena osiągnięta + nabywca locatable; only
**negative** outcomes, inline in the re-listing. (Beware the boilerplate "Cena
osiągnięta w przetargu … może zostać obniżona o 30%" — that's the monument-discount
clause, not a result.)

**5. Adapter effort + verdict.** Closest template **Bytom** (server-rendered HTML
list + per-item article pages; no OCR) — arguably cleaner on the body, but lacking
a results stream. Parser: HTML/DOM extractor over `…/przetargi,9_<year>-<month>_<id>`
(anchor on bold labels "Cena wywoławcza … wynosi:", "wadium:", "Przetarg odbędzie
się …", title prefix "I/II/III PRZETARG …"); index discovery via the SISCO AJAX
call or ID-probing (the one engineering unknown). Blockers: **no web-published
sold-price stream** (gold signal absent); SPA list pages need the AJAX endpoint or
ID-probing; minor HTML artefacts. **VERDICT: NEEDS-LIVE-VERIFY — Low-Med.** The
announcement side alone would be a confident BUILD at Low-Med; the open item is
whether Opole posts a result notice anywhere (transient WGN posting, `rejestr-zmian`,
or wykazy board). Until confirmed, not a plain BUILD.

Sources: `bip.um.opole.pl/przetargi,9_2025-2_225` (land) · `…,9_2026-1_390` (flat) ·
`…,9_2024-10_195` (building) · `…,9_2026-3_411` (current land) · `…,9_2025-1_208`
(inline negative).

---

## Caveats

- **Point-in-time, 26 June 2026.** Counts/boards are live snapshots; archives were
  sampled, so class-level volumes are lower bounds.
- **`bip.malopolska.pl` was not rendered.** Per the spike's web-fetch-only
  constraint, the shared Małopolska BIP SPA returned empty shells and was not
  routed around. In every Małopolskie case the gmina's own host carried the full
  text, so verdicts don't depend on it — but the BIP's internal article/JSON path
  is unverified and is the first thing to probe if a build needs the BIP itself.
- **Two NEEDS-LIVE-VERIFY items each hinge on one hands-on check** (Oświęcim: PDF
  text-vs-scan; Opole: existence of a result-notice stream). Neither can be settled
  with web_fetch alone.
- **No code was written or changed.** This is a knowledge deliverable; building any
  city remains spike-gated and would add the first non-Śląskie host(s) to the
  extension manifest and `data/index.json`.

---

*Generated 26 June 2026 from a 7-agent parallel per-city source spike of
neighbouring-voivodeship gminas (Małopolskie + Opolskie). Doc-only — no
`extension/` or adapter change, so no version bump (per CLAUDE.md).*
