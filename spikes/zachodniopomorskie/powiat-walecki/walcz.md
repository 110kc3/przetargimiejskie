# Spike — Wałcz (Zachodniopomorskie · powiat wałecki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Miejska Wałcz (Urząd Miasta Wałcz) actively sells municipal property — **including lokale mieszkalne** — via *pierwszy/… ustny przetarg nieograniczony na sprzedaż*. On the day of this spike the live "Przetargi aktualne" board carried **6 open oral flat auctions** (Chełmińska 29/31 — spółdzielcze własnościowe prawo, Wojska Polskiego 57/3, Bydgoska 3/6, Bydgoska 3/5, Leśna 1/1, + Sienkiewicza 8/3 from a prior round) alongside ~5 land plots — high, recurring flat volume. The BIP `bip.walcz.pl` runs a **Joomla!** CMS (GovArticle BIP template): clean server-rendered HTML, dated slug-path articles, a dedicated **"Przetargi aktualne"** board and a separate **"Przetargi zakończone"** results board carrying `Informacja o wyniku przetargu` notices (achieved-price stream). Wrinkle: the full notice body (cena wywoławcza, powierzchnia, wadium, godzina) lives in a **born-digital PDF attachment**, not inline HTML — so title parse + `pdfText` on the attachment. Closest analog: an IDcom-style HTML-list + PDF-attachment gmina (tczew / gniezno flow) or a WordPress/custom-HTML gmina (brzeg). No technical blockers. **Disambiguate from rural Gmina Wałcz (`bip.gminawalcz.pl`) — out of scope.**

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats, OPEN oral (nieograniczony) auctions.** The Urząd Miasta Wałcz runs `ustny przetarg nieograniczony na sprzedaż` for municipal property. These are open unrestricted oral auctions (any natural/legal person may bid, 10% wadium), **not** *bezprzetargowo na rzecz najemcy* tenant sales. Live "Przetargi aktualne" board at spike time (11 notices) included these **flat** auctions:
- ul. Chełmińska 29 lok. 31 — I ustny przetarg nieograniczony na sprzedaż **spółdzielczego własnościowego prawa do lokalu mieszkalnego**, termin 02.09.2026.
- ul. Wojska Polskiego 57 lok. 3 — I ustny przetarg nieograniczony na sprzedaż **lokalu mieszkalnego**, 02.09.2026.
- ul. Bydgoska 3 lok. 6 — I ustny przetarg na sprzedaż lokalu mieszkalnego, 02.09.2026.
- ul. Bydgoska 3 lok. 5 — I ustny przetarg na sprzedaż lokalu mieszkalnego, 02.09.2026.
- ul. Leśna 1 lok. 1 — I ustny przetarg na sprzedaż lokalu mieszkalnego, 02.09.2026.
- ul. Sienkiewicza 8 lok. 3 — II ustny przetarg na sprzedaż lokalu mieszkalnego (prior round, via search index).

Plus ~5 land plots (niezabudowane/zabudowane nieruchomości gruntowe: dz. 5469/21, 5661/103, 5508/1, 3951/2+3952/1, 5654/124+125). So the stream is **mixed flats + land**, with a genuine, currently-heavy flat component (6 flats live at once).

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Joomla / GovArticle):** `https://bip.walcz.pl`
- Property root: `https://bip.walcz.pl/nieruchomosci`
  - Przetargi na sprzedaż/dzierżawę: `https://bip.walcz.pl/nieruchomosci/przetargi-na-sprzedaz-dzierzawe-nieruchomosci`
  - **Przetargi aktualne** (announcements): `…/przetargi-na-sprzedaz-dzierzawe-nieruchomosci/przetargi-aktualne`
  - **Przetargi zakończone** (results / `Informacja o wyniku`): `…/przetargi-na-sprzedaz-dzierzawe-nieruchomosci/przetargi-zakonczone`
  - Wykaz nieruchomości przeznaczonych do sprzedaży (designations): under `/nieruchomosci`
- Article/detail URL pattern: `…/przetargi-aktualne/<full-title-slug>` (e.g. `/przetargi-aktualne/pierwszy-ustny-przetarg-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-ulicy-lesnej-1-lok-nr-1-termin-przetargu-02-09-2026-r`). Each detail page exposes an **Załączniki** block with a `.pdf` download (the full ogłoszenie).
- Legacy host (older notices, still indexed): `https://archiwumbip.walcz.pl/` (old `content*.html?cms_id=NNNN||m=M` shape) — pre-migration archive; new authoritative source is `bip.walcz.pl`.

**Do NOT confuse** with `https://bip.gminawalcz.pl` (`dokumenty/menu/12` etc.) — that is the rural **Gmina Wałcz** (separate JST), out of scope. Target here is the town **Gmina Miejska Wałcz**.

Housing manager: sales are run directly by the Urząd Miasta (property/gospodarka nieruchomościami), not a separate ZGM/TBS board — everything is on the one city BIP.

## 3. Format + rendering
- **Server-rendered HTML** — Joomla! (`<meta name="generator" content="Joomla! - Open Source Content Management">`, `© 2026 GovArticle` template). Board pages are plain dated article lists; JSON-LD BreadcrumbList present. **No SPA, no auth, no CAPTCHA** (confirmed via curl; TLS chain is incomplete so the adapter must tolerate an intermediate-cert gap / use `-k`-equivalent, and a **browser UA** — WebFetch 500'd on cert, curl `-k` worked).
- **Full notice body is a born-digital PDF attachment.** Detail pages say *"Pełna treść ogłoszenia dostępna do pobrania w zakładce Załączniki"* and expose one `.pdf` (e.g. `BIP i tablica ogł. - przetarg, lokal mieszkalny nr 31, ul. Chełmińska nr 29.pdf`). cena wywoławcza / powierzchnia użytkowa / wadium / godzina live inside that PDF → use `pdfText` (born-digital, OCR unlikely). The **HTML title itself** already yields address + lokal nr + round (I/II/III/IV) + auction date, so much is parseable pre-PDF.

## 4. Volume + achieved-price stream
- **Volume:** Good for a small town — **6 open flat auctions simultaneously** at spike time, plus land. Flats recur (I and II rounds seen), so expect a steady ~several flats/year, occasionally repeated as II/III/IV przetarg when unsold. Higher live flat count than the Zgorzelec gold-template baseline.
- **Achieved-price stream:** YES — dedicated **"Przetargi zakończone"** board publishes `Informacja o wyniku przetargu` notices (confirmed live example: *"Informacja o wyniku: I ustny przetarg… nr geod. 5661/76, 5661/81, 5661/95, 5661/96, ul. Kołobrzeska"*). Announcement PDFs carry `cena wywoławcza`; result notices carry the outcome (cena osiągnięta / nabywca or wynik negatywny). Both on the same Joomla board family — parseable.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** HTML-list-board + **born-digital-PDF-attachment** flow — clone the **tczew / gniezno** (IDcom-style: HTML list → detail → PDF attachment via `pdfText`) shape, or a WordPress/custom-HTML gmina (**brzeg / nowa-sol**) for the list-parse skeleton. The board/detail/results split maps 1:1 onto existing adapters.
- **CMS family:** Joomla! (GovArticle BIP template) — server-rendered HTML, WordPress/custom-HTML family in ADAPTER-GUIDE §3 terms (plain HTML articles + PDF attachments).
- **Effort:** **MEDIUM.** List "przetargi-aktualne" → per-article: parse HTML title (address, lokal nr, round, date) + fetch the `.pdf` attachment via `pdfText` for cena wywoławcza / powierzchnia / wadium / godzina (parseAddress + regex). Second pass over "przetargi-zakonczone" for `Informacja o wyniku` (cena osiągnięta / nabywca). Filter land/dzierżawa where flats are target (land also in-scope for the wider dataset). Watch-items: incomplete TLS chain (browser UA + tolerant TLS), everything-in-PDF (no inline price), and the archiwumbip legacy host if backfill is wanted.
- **Blockers:** None hard. No rate-limit/auth signals; only the TLS-chain gap and PDF-only bodies add routine handling.

**VERDICT: BUILD (Medium effort)** — Gmina Miejska Wałcz runs recurring OPEN oral flat auctions (6 live at spike) on a clean Joomla server-HTML BIP with a dedicated results board; only wrinkles are PDF-attachment notice bodies (born-digital → pdfText) and an incomplete TLS chain (browser UA). Standard HTML-list + PDF-attachment analog, no hard blockers.
