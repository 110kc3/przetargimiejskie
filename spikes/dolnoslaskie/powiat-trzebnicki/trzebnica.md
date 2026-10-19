# Spike — Trzebnica (Dolnośląskie · powiat trzebnicki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Trzebnica (miejsko-wiejska, seat) sells municipal property — **including lokale mieszkalne** — via *przetarg ustny nieograniczony*. Everything is published on the city BIP `bip.trzebnica.pl`, which runs the **Logonet eUrząd** CMS (footer: "Wersja systemu: 2.9.0 CMS i hosting: Logonet Sp. z o.o. w Bydgoszczy"). Clean server-rendered HTML: a dedicated "Przetargi nieruchomości" board (`/przetargi-nieruchomosci/36`, **37 pages** deep) with each notice at `/przetarg-nieruchomosci/<id>/<slug>`; short inline HTML summary (typ, cena wywoławcza, date) + a `.doc/.docx` attachment (`/attachments/download/<id>`) carrying full terms. Achieved prices published as `informacja o wyniku przetargu` documents (same attachments store). Volume is healthy — GGN P/NN numbering runs to ~35–75 przetargi/year, mixed land + flats; flats recur (Rynek 12, Bochenka 22/1, Witosa 12, Boleścin). Closest analog: **tarnowskie-gory** (Logonet eUrząd family). No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** Gmina Trzebnica (Wydział Geodezji i Gospodarki Nieruchomościami, symbol **GGN**) runs `przetarg ustny nieograniczony` for sale of municipal property. Notices are numbered `GGN P/NN/RRRR`. Confirmed **lokal mieszkalny** auctions:
- Trzebnica, ul. Rynek 12 — I przetarg ustny nieograniczony nr **GGN P/6/2026** (lokal mieszkalny; `/przetarg-nieruchomosci/3111/przetarg-ggn-p-6-2026`).
- Trzebnica, ul. Ks. W. Dz. Bochenka 22/1 — lokal mieszkalny, pow. użytkowa 73,77 m² (2 pokoje, kuchnia przechodnia, łazienka z WC), cena wywoławcza 210 000 zł.
- Trzebnica, ul. W. Witosa 12 — lokal mieszkalny.
- Boleścin — I przetarg ustny nieograniczony nr GGN P/5/2026.

The board mixes flats with land (`nieruchomość niezabudowana`, e.g. Kobylice GGN P/35/2025, cena wyw. 165 000 zł — a IV przetarg / repeat round) and occasional lokale użytkowe. Flats cycle in and out rather than being permanently open; both natural and legal persons may bid (standard 10% wadium).

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Logonet eUrząd):**
- Przetargi nieruchomości (announcements board): `https://bip.trzebnica.pl/przetargi-nieruchomosci/36` — paginated, 37 pages, 5/10/15/20/25 per page.
- Individual notice: `https://bip.trzebnica.pl/przetarg-nieruchomosci/<id>/<slug>` (e.g. `/2890/przetargggnp352025`, `/2515/przetargggnp12025`, `/3111/przetarg-ggn-p-6-2026`).
- Wykazy nieruchomości (WYKAZ before each przetarg): `https://bip.trzebnica.pl/artykuly/41/wykazy-nieruchomosci`.
- Attachments (full terms + result docs): `https://bip.trzebnica.pl/attachments/download/<id>` (e.g. `5675` Przetarg_GGN_P_35_2025.doc; `4580` = "informacja o wyniku przetargu GGN P/31/2024").
- BIP root: `https://bip.trzebnica.pl/`.

**Secondary (promo, not authoritative):** `trzebnica.pl` publishes yearly round-ups (e.g. `trzebnica.pl/5990/przetargi-nieruchomosci-w-gminie-trzebnica-2022-rok.html`) — use BIP as source of truth.

Contact: Urząd Miejski w Trzebnicy, pl. Marszałka J. Piłsudskiego 1 (also ul. Piłsudskiego), 55-100 Trzebnica; Wydział Geodezji i Gospodarki Nieruchomościami (GGN). **No dedicated ZGM/TBS housing manager** publishing separately — sales run centrally through the UM/GGN board (typical for a Logonet miejsko-wiejska gmina).

## 3. Format + rendering
- **Server-rendered HTML** — Logonet eUrząd (Wersja systemu 2.9.0). Board and notice pages are plain server HTML, no JS gate, no auth, no CAPTCHA. Confirmed live via fetch of the board + notice + attachment listing.
- **Notice body** = short inline HTML summary (typ przetargu, cena wywoławcza, data/godzina, właściciel Gmina Trzebnica, round I/II/III/IV) + **`.doc/.docx` attachment** (`/attachments/download/<id>`, ~160 KB Word) holding full terms (powierzchnia, wadium, KW, warunki).
- **Parsing note:** full powierzchnia/wadium often live in the **Word attachment**, not the HTML — need `.doc/.docx` extraction (antiword/`textutil`/docx unzip) rather than pdfText for the deep fields. Cena wywoławcza + address + date are extractable from HTML alone for the common case.
- Printable/clean variants available through the Logonet article view.

## 4. Volume + achieved-price stream
- **Volume:** Healthy for a town — GGN P numbering reaches ~35–75 items/year (GGN P/75/2022, GGN P/35/2025 seen), and the board is 37 pages deep (~370 historical notices). Mixed land + flats + lokale użytkowe; expect a **few flats/year** among the stream, some as II/III/IV przetarg (repeat when unsold).
- **Achieved-price stream:** YES — `informacja o wyniku przetargu GGN P/NN/RRRR` documents are published (confirmed `attachments/download/4580` for P/31/2024). These land as attachments (Word/PDF) associated with the board / wykazy rather than on a separate "Rozstrzygnięcia" board, so the results pass keys on the GGN P/NN reference. Announcement carries cena wywoławcza; result doc carries cena osiągnięta / nabywca (or wynik negatywny).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **tarnowskie-gory** (Logonet eUrząd family; also `kedzierzyn-kozle`, `skarzysko-kamienna`). Same platform: `/artykul(y)/<board>/<id>` + `/przetarg-nieruchomosci/<id>/<slug>` article shapes, `/attachments/download/<id>` documents, `/api/menu/<id>/articles` menu endpoints. Clone that shape.
- **CMS family:** Logonet eUrząd (ADAPTER-GUIDE §3 row 1) — server-rendered HTML lists + born-digital doc attachments; result notices as attachments keyed by GGN P/NN.
- **Effort:** **LOW.** Paginate `/przetargi-nieruchomosci/36` (or the Logonet `/api/menu/36/articles` JSON if present) → fetch each `/przetarg-nieruchomosci/<id>` → parse HTML for typ/cena wywoławcza/date/address + pull `.doc/.docx` attachment for powierzchnia/wadium → classify (flat vs land/dzierżawa/lokal użytkowy) → second pass matches `informacja o wyniku` docs by GGN P/NN for cena osiągnięta. Backfill via the 37-page archive (bounded).
- **Blockers:** None. Only watch-items: (1) full deep fields sit in **Word (.doc/.docx)** attachments → wire doc extraction, not just pdfText; (2) results are attachments (no dedicated results board) → key on the P/NN number; (3) mixed land/flat stream → classify and filter (land also in-scope for the wider dataset).

**VERDICT: BUILD (Low effort)** — recurring municipal flat auctions on a clean Logonet eUrząd server-HTML BIP with published achieved-price docs; direct tarnowskie-gory analog, no blockers.

## Partial source/asset audit — 2026-10-19 (Codex)

The [official XML board](https://bip.trzebnica.pl/przetargi-nieruchomosci/xml/1/1)
is reachable and declares four pages; isolated enumeration sees 374 unique
records. The board directly identifies residential premises and land sales and
oral-auction procedures. Current land example: record 3522, Biedaszków Wielki,
3 November 2026, 1,516,100 zł. A historical flat example is record 3489,
Boleścin, II auction on 21 September 2026; exact board elements for 3489/3490
are retained in the remediation fixtures. This is a source observation, not a
claim that all asset/procedure/result streams are completely implemented.

Captured resolved property/land outcomes may be skipped. Archived announcements
remain eligible for later result attachments. A healthy board may
therefore yield no *new* property rows while new land rows appear. The crawler
now requires valid page identity/counts, complete pagination, successful detail
and attachment handling, and no unparsed rows before confirming an empty current
stream. Current records are never skipped merely because their URLs are known.
Incomplete result discovery is carried explicitly to refresh metadata. Local
regressions cover later-page failure, malformed rows, duplicate pages, wrong
record responses and failed attachment extraction. Full source/asset review and
hosted acceptance remain open; the previous full-review deadline is retained.

Incremental land output now merges with the retained parcel ledger. Unparsed
historical identities can use their announcement PDFs (at most 12 uncached
identity extractions per pass, with cached documents outside that cost cap).
The exact XML/PDF 3489 evidence also reproduces a decimal-dot amount with trailing
whitespace (`149.450.00 `); parsing now yields 149,450 zł rather than 14,945,000 zł.
Remaining unsupported identities keep discovery visibly incomplete.

Result PDFs [7167](https://bip.trzebnica.pl/attachments/download/7167) and
[7396](https://bip.trzebnica.pl/attachments/download/7396) explicitly identify
Boleścin building 50/unit 2 and negative outcomes for 10 August/21 September 2026,
both at a 149,450 zł starting price. Their exact text is retained in remediation
fixtures. Canonical `source_pdf` provenance prevents the archived announcements
from winning deduplication. February announcement PDF 6341 also prints 50/2.
Only those three date/announcement-URL identities are migrated from the old
unknown-building key, preserving the watch alias when unambiguous. Other rows
are left untouched; no February outcome is inferred. The linked cancellation
attachment 6342 is a remaining source-review item, not a parsed result claim.
