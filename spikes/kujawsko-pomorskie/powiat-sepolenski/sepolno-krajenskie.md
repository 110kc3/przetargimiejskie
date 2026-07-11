# Spike — Sępólno Krajeńskie (Kujawsko-Pomorskie · powiat sępoleński)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort). **Built + registered 2026-07-11** (17/17 parse test); spike held live (brzeg/nowa-sol analog). Note: incomplete TLS chain → the adapter fetches with `insecureTLS` + browser UA (reused core mechanism, as boleslawiec/zabrze); born-digital ogłoszenie + informacja-o-wyniku PDFs via `pdfText`.

## TL;DR
Gmina Sępólno Krajeńskie (miejsko-wiejska; town is the seat) sells municipal property — **including lokale mieszkalne (flats)** — at *przetarg ustny nieograniczony na sprzedaż*. The Urząd Miejski publishes on the city BIP `bip.gmina-sepolno.pl`, running the modern **extranet "BIP w JST" / gov.pl-BIP CMS** (clean server-rendered HTML, `/<docid>/<board>/<slug>.html` URLs, board `405` = Przetargi, `402` = Wykaz nieruchomości). Each tender page carries a **structured inline metadata block** — `Rodzaj przetargu / Rodzaj nieruchomości / Cena wywoławcza / Data przetargu / Rok` — so the flat-vs-land classification and starting price are parseable straight from HTML with no PDF needed. The full ogłoszenie and the **informacja o wyniku przetargu** (achieved price) are attached as **born-digital PDFs** at `/download/attachment/NNNN/…`. Volume is low but recurring (~1–3 flat auctions/yr; confirmed lokal mieszkalny + lokal użytkowy sales). Closest analog: a WordPress/custom-HTML gmina with born-digital PDF attachments (`brzeg`/`nowa-sol` shape) — but the built-in metadata block makes this easier than most. No blockers (only a self-signed/incomplete TLS chain — fetch with a lenient client or browser UA).

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Burmistrz Sępólna Krajeńskiego runs `przetarg ustny nieograniczony` (open oral, unlimited) for sale of municipal property. Confirmed lokal-mieszkalny / nieruchomość-lokalowa open oral auctions on the Przetargi board:
- **ul. Hallera 9/4 — lokal mieszkalny**, `przetarg ustny nieograniczony`, cena wywoławcza **98 900,00 zł**, data przetargu 11-10-2023 (inline metadata: `Rodzaj nieruchomości: lokal mieszkalny`), with an *informacja o wyniku przetargu* PDF attached. (`/2562/405/…hallera-94…html`)
- **ul. Hallera 10/3 — lokal mieszkalny nr 3**, II publiczny przetarg ustny nieograniczony (per city/press sources).
- **Plac Wolności 14/1 and 14/2 — nieruchomość lokalowa** (14/2 = lokal użytkowy 28,50 m², cena 70 000 zł, I i II przetarg; `/5301/405/…`, `/3642/405/…`).
- **Osiedle Słowackiego** — zabudowana nieruchomość (garaż) + residential unit, przetarg ustny nieograniczony (`/5307/405/…`).

Mixed board: also land/działki (Sadowa, Baczyńskiego, Sienkiewicza, Tartaczna, Wiśniewa) and lease (dzierżawa — parking, `przetarg ustny ograniczony`). Flats are a recurring category, not one-off. Both natural and legal persons bid; 10% wadium. Not a tenant-only (bezprzetargowo na rzecz najemcy) regime — these are genuine open oral auctions.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (extranet "BIP w JST" CMS):** `https://bip.gmina-sepolno.pl`
- Przetargi board: `https://bip.gmina-sepolno.pl/657/405/przetargi.html` (pagination `?Page=2`; ~2 pages, notices 2020→2024)
- Wykaz nieruchomości (designations): `https://bip.gmina-sepolno.pl/807/402/wykaz-nieruchomosci.html`
- Notice URL pattern: `/<docid>/405/<slug>.html` (e.g. `/2562/405/…hallera-94…html`)
- Attachments (born-digital PDF/DOCX): `/download/attachment/<attId>/<name>.pdf` — includes the signed ogłoszenie (`…-ogloszenie-…-podpisane.pdf`) and the result notice (`…-informacja-o-wyniku-przetargu.pdf`).
- Legacy URL form still indexed: `?bip_id=NNNN&cid=334` (older wykaz/notices) — superseded by the `.html` scheme.

**Do NOT confuse** with the powiat BIP `bip.powiat-sepolno.pl` (Starostwo Powiatowe — county property, `przetarg pisemny`), which is a separate JST and out of scope. Our target is the town Gmina Sępólno Krajeńskie (`bip.gmina-sepolno.pl`).

Housing manager: **ZGK Sępólno Krajeńskie** (Zakład Gospodarki Komunalnej) handles operations, but **flat sales are run directly by the Urząd Miejski** (Referat Gospodarki Komunalnej i Mienia) and published on the gmina BIP — no separate ZGM/TBS auction stream to track.

## 3. Format + rendering
- **Server-rendered HTML** — extranet "BIP w JST" (gov.pl/bip powered) CMS. Board list and notice pages are plain server HTML, no JS gate/SPA, no CAPTCHA/auth.
- **Inline structured metadata** on each notice page (huge win): `Rodzaj przetargu: przetarg ustny nieograniczony`, `Rodzaj nieruchomości: lokal mieszkalny | lokal użytkowy | działka …`, `Cena wywoławcza: NN NNN,NN zł`, `Data przetargu: DD-MM-YYYY`, `Rok: YYYY`. Regex/DOM-parseable directly; gives classification + starting price + date without opening a PDF.
- **Born-digital PDF attachments** for the full ogłoszenie (powierzchnia użytkowa, KW, udział w nieruchomości wspólnej, warunki) — `pdftotext -layout` extracts cleanly (verified: 6-page signed ogłoszenie parsed to text). Use `core/pdf-text.js` (`pdfText`); no OCR needed.
- **TLS caveat:** the host presents an incomplete/self-signed cert chain ("unable to verify the first certificate"); WebFetch's HTTPS upgrade fails. Fetch tolerantly (lenient TLS / browser UA). Some notice fetches returned empty on the bot UA — pass a **browser User-Agent** and follow redirects.

## 4. Volume + achieved-price stream
- **Volume:** Low. The Przetargi board holds ~16 property notices spanning 2020–2024; of those, several are flats/lokalowa (Hallera 9/4, Hallera 10/3, Plac Wolności 14/1, 14/2, Osiedle Słowackiego). Roughly **1–3 open flat auctions per year** (often as I + II przetarg when unsold), interleaved with land and lease. Small gmina miejsko-wiejska (~15k) — expect modest but steady flow.
- **Achieved-price stream:** **YES.** Each concluded tender gets an `…-informacja-o-wyniku-przetargu.pdf` attached to the same notice (born-digital → pdfText-parseable) carrying cena osiągnięta / nabywca or wynik negatywny. Cena wywoławcza is already in the inline HTML metadata; the result PDF supplies the hammer price. Both parseable.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** WordPress/custom-HTML gmina with born-digital PDF attachments — **`brzeg` / `nowa-sol`** shape (HTML board → notice page → PDF attachments). Clone that flow; add a small extractor for the inline `Rodzaj nieruchomości / Cena wywoławcza / Data przetargu` metadata block (which makes classification trivial and drops most PDF parsing on the announce side).
- **CMS family:** extranet "BIP w JST" (server-rendered HTML; ADAPTER-GUIDE §3 "WordPress / custom HTML" bucket — plain HTML boards + `/download/attachment/` PDFs).
- **Effort:** **LOW.** Crawl board `657/405` (paginate `?Page=N`) → per-notice fetch → parse inline metadata (type/price/date) + regex address (parseAddress) → fetch `informacja-o-wyniku-przetargu.pdf` via pdfText for cena osiągnięta. Filter out `działka`/land and `dzierżawa` (or keep land for the wider dataset). Optionally read Wykaz board (`807/402`) for upcoming designations.
- **Blockers:** None functional. Watch-items: (1) incomplete TLS chain — use a lenient/browser-UA fetch; (2) mixed flat/land/lease stream — classify via the `Rodzaj nieruchomości` field; (3) I/II przetarg duplicates for the same lokal — dedupe by address/KW.

**VERDICT: BUILD (Low effort)** — recurring open oral flat auctions (lokal mieszkalny + lokalowa) on a clean server-HTML extranet BIP with a built-in `Rodzaj nieruchomości`/`Cena wywoławcza` metadata block and born-digital *informacja o wyniku* PDFs for achieved price; `brzeg`/`nowa-sol` analog, only a lenient-TLS fetch to handle.
