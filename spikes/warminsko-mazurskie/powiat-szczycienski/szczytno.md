# Spike — Szczytno (Warmińsko-Mazurskie · powiat szczycieński)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Miasto Szczytno (town gmina miejska; do NOT confuse with rural Gmina Szczytno) sells municipal property — mostly land działki, but also **lokale mieszkalne** — via *ustny przetarg nieograniczony na zbycie nieruchomości*. Flats DO reach OPEN oral auction (confirmed: ul. Żeromskiego 3/4 "I przetarg ustny nieograniczony na zbycie nieruchomości lokalowej"; ul. Dąbrowskiego 4/4a "wykaz nieruchomości lokalowej ... w drodze przetargu"; historical ul. Odrodzenia 36 flat sold at I przetarg nieograniczony). Everything is published on the city BIP `bip.um.szczytno.pl` — a clean server-rendered vendor CMS (Bootstrap + DataTables + select2 + reCAPTCHA), with `/artykul/<text-slug>` boards, a "Lista artykułów" table of dated child articles, and a "Załączniki do pobrania" list of DOC/PDF attachments per notice. The notice body lives in the attached `.doc`/`.pdf` (e.g. `/pliki/szczytno/zalaczniki/1541/2025-i-przetarg-ul-zeromskiego-3-4.doc`), so per-listing docText/pdfText is needed. Dedicated results stream exists as `informacja o wyniku ... przetargu` articles (nabywca / cena / wynik negatywny). Flat volume is LOW (a minority of a mostly-land board), but flats recur at open auction and land is also in-scope. No blockers; bot-UA needed (host 403s WebFetch / default UA).

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats at OPEN auction.** The Burmistrz Miasta Szczytno (Wydział Gospodarki Nieruchomościami, znak `GPO.6840.*`) runs `przetarg ustny nieograniczony na zbycie nieruchomości`. The current "Ogłoszenia o przetargach" board (36 article rows) is dominated by land (działki: Pomorska 21/2, Śniadeckiego 211/9, Norwida 516/4-5, Jaśminowa 92/26 & 94/15, Sybiraków 92/16, Dąbrowskiego 186/5, Grudziądzka 622/3-4; + zabudowana Pasymska 40), but flats appear:
- ul. **Żeromskiego 3/4** — *Ogłoszenie o I przetargu ustnym nieograniczonym na zbycie nieruchomości lokalowej* (znak GPO.6840.9.2020) — OPEN oral auction for a flat. Confirmed on the przetarg board + matching `wykaz nieruchomości ... lokal przy ul. Żeromskiego 3/4 ... w drodze przetargu`.
- ul. **Dąbrowskiego 4/4a** — *Wykaz nieruchomości lokalowej przeznaczonej do zbycia w drodze przetargu* (znak GPO.6840.30.202x) — a flat designated for auction sale.
- ul. **Odrodzenia 36** — historical *informacja o wyniku I przetargu ustnego nieograniczonego* — flat SOLD (nabywca Łukasz Bałon), i.e. an open flat auction that concluded positive.

Separately, the city ALSO sells flats **bezprzetargowo na rzecz najemcy** (tenant sales, `GPO.7125.*`, e.g. list of lokale to tenants + udział w gruncie) and land bezprzetargowo — those are out of the auction stream. Historical restricted flat auctions also exist (ul. Sikorskiego 2, "II przetarg ustny **ograniczony** na sprzedaż lokalu mieszkalnego"). Net: open flat auctions are real but a minority; land is the bulk. Both natural and legal persons may bid; wadium standard.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (`bip.um.szczytno.pl`, vendor server-rendered CMS):**
- Ogłoszenia o przetargach (announcements): `https://bip.um.szczytno.pl/artykul/ogloszenia-o-przetargach`
- Wykazy nieruchomości (pre-auction designations, incl. flats): `https://bip.um.szczytno.pl/artykul/wykaz-nieruchomosci-2`
- Ogłoszenia i obwieszczenia: `https://bip.um.szczytno.pl/artykul/ogloszenia-i-obwieszczenia`
- Nieruchomości (section root): `https://bip.um.szczytno.pl/artykul/nieruchomosci`
- Results (achieved price): `informacja o wyniku ... przetargu` articles, e.g. `https://bip.um.szczytno.pl/artykul/informacja-o-wyniku-i-przetargu-ustnego-nieograniczonego-na-zbycie-nieruchomosci-przy-ul-odrodz` (flat, ul. Odrodzenia), `.../informacja-o-wyniku-pierwszego-przetragu-ustnego-nieograniczonego-na-zbycie-nieruchomosci-nieza-5` (land). Note vendor typo "przetragu" appears in some slugs.
- Detail article shape: `/artykul/ogloszenie-o-i-przetargu-ustnym-nieograniczonym-na-zbycie-nieruchomosci-lokalowej-przy-ul-zero...`
- Attachments: `/pliki/szczytno/zalaczniki/<id>/<name>.doc|.pdf` (notice body) and `/pliki/szczytno/pliki/<name>.pdf`.
- Legacy/archival hosts (older notices, older CMS `?id=NNNN`): `http://archiwum.bip.um.szczytno.pl/public/?id=...`, `http://bip.um.szczytno.pl/public/?id=55753`. New authoritative source is the `/artykul/` CMS.
- Mirror of some notices on the promo site `miastoszczytno.pl` (out of scope for scraping).

Contact: Wydział Gospodarki Nieruchomościami, Urząd Miejski w Szczytnie, ul. Henryka Sienkiewicza 1.

**Do NOT confuse** with `bip.ug.szczytno.pl` — that is the rural **Gmina Szczytno** (IDcom `/wiadomosci/<cat>/<id>`, separate JST, out of scope) — nor with `bip.szczytna.pl` (Szczytna, a different town in Dolnośląskie). Our target is the town **Gmina Miasto Szczytno** on `bip.um.szczytno.pl`.

## 3. Format + rendering
- **Server-rendered HTML** boards — Bootstrap + jQuery DataTables + select2 + Bootstrap-datepicker; reCAPTCHA present for forms only (not gating reads). Boards render a "Lista artykułów" `<table>` of dated child-article `<tr>` rows (title → `/artykul/<slug>`, publication date) plus a "Załączniki do pobrania" attachment list. Fully parseable from server HTML (confirmed via curl).
- **Notice body is in an attachment, not inline** — each detail article's substance is an attached **`.doc`** (e.g. `2025-i-przetarg-ul-zeromskiego-3-4.doc`, 39.5 KB) or **born-digital PDF** (e.g. Jaśminowa dz.92/26 przetarg PDF). Use `docText` (.doc → catdoc / .docx → unzip) and `pdfText`; OCR unlikely (born-digital).
- **No SPA, no auth, no CAPTCHA gate on reads.** Host **403s the default/WebFetch bot UA and cert/HTTP quirks** — pass a browser User-Agent via `getText(url,{userAgent})` (as with bytom/wejherowo).

## 4. Volume + achieved-price stream
- **Volume:** LOW-to-modest overall; the board runs a steady stream of land działki auctions (often I/II/III rounds as parcels fail to sell). **Flats are a small minority** — ~2 distinct flats visible currently (Żeromskiego 3/4, Dąbrowskiego 4/4a) among ~15+ land items, plus occasional historical flats (Odrodzenia 36, Sikorskiego 2). Expect roughly 1–3 open flat auctions/year; land is the bulk of scrapeable volume.
- **Achieved-price stream:** YES — dedicated `Informacja o wyniku [I/II/III] przetargu ustnego nieograniczonego na zbycie nieruchomości …` articles publish nabywca + cena osiągnięta (sold) or "zakończył się wynikiem negatywnym / brak zainteresowania" (unsold). Confirmed for both flats (Odrodzenia 36 → sold) and land (Wołyńska 68/8 → negative). Announcement carries cena wywoławcza + wadium (inside the DOC/PDF); result article carries the hammer price.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** A server-rendered HTML-board BIP whose notice bodies are DOC/PDF attachments — clone the **IDcom-style board crawl** (list `<tr>` rows → detail slug → attachment) but pair with `docText`/`pdfText` like the SmartSite DOCX-results cities (**kielce**/**augustow**) rather than inline-HTML parsing. Effectively a WordPress/custom-HTML-family board (brzeg/nowa-sol shape) + attachment extraction.
- **CMS family:** bespoke/vendor server-rendered BIP (Bootstrap + DataTables + reCAPTCHA; `/artykul/<slug>` boards, `/pliki/<city>/zalaczniki/` attachments) — plain HTML tables, no JS gate (no `needsRender`).
- **Effort:** **MEDIUM.** List crawl is trivial (Lista artykułów table on `ogloszenia-o-przetargach` + `wykaz-nieruchomosci-2`); the work is per-notice attachment extraction (`.doc` via catdoc / `.docx` via unzip / born-digital PDF via pdftotext) and a second pass over the `informacja-o-wyniku` articles for cena osiągnięta. Classify mieszkalny vs działka/zabudowana vs bezprzetargowo; keep land (in-scope for the wider dataset) but flag flats. Must send a browser UA (host gates the bot UA). Bound pagination for the archive.
- **Blockers:** None hard. Watch-items: (1) notice text is always in an attachment (no inline body) — extraction pipeline mandatory; (2) bot-UA 403 / HTTP-only + cert quirks; (3) low flat frequency — most volume is land; (4) vendor typo slugs ("przetragu") in result URLs; (5) an older `?id=NNNN` archive/legacy host if backfill is wanted.

**VERDICT: BUILD (Medium effort)** — recurring open oral auctions on a clean server-rendered `bip.um.szczytno.pl` BIP, with lokale mieszkalne reaching OPEN przetarg (Żeromskiego 3/4, Dąbrowskiego 4/4a, Odrodzenia 36 result) alongside a larger land stream and a working `informacja o wyniku` achieved-price board; the only real cost is DOC/PDF attachment extraction + browser-UA handling.
