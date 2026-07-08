# Spike — Olesno (Opolskie · powiat oleski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Olesno (Urząd Miejski w Oleśnie, Burmistrz Olesna) sells municipal property — **including lokale mieszkalne** — via *przetarg ustny nieograniczony na sprzedaż*. Announcements **and results** are published on the city BIP `bip.olesno.pl`, which runs **skyCMS v4** (`bip_v4` template): clean server-rendered HTML, numeric-id + slug URLs (`/NNNNN/slug.html`), paginated dated article lists, inline notices. The board architecture is unusually clean — **separate per-year boards** for *sprzedaż nieruchomości* (sales), *najem lokali* (flat lease), and *dzierżawa gruntów* (land lease) — so sale auctions are cleanly isolated from lease. Flat volume is LOW and land-skewed, but flats recur across years at open auction with multi-round (I/II/III) repeats, and **achieved (hammer) prices are published inline** as *"Informacja o wyniku przetargu"* in the same sale board. Exact in-repo analog already exists: **Przemyśl** (identical skyCMS v4 platform, parser already written). No technical blockers.

⚠️ Not to be confused with the **other Olesno** (gmina wiejska, powiat dąbrowski, Małopolskie — BIP `bip.malopolska.pl/ugolesno`). Target here is the **Opolskie powiat-oleski seat town**, `bip.olesno.pl`. Confirmed distinct.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** Urząd Miejski w Oleśnie (Wydział Gospodarki Nieruchomościami i Lokalami) runs `przetarg ustny nieograniczony` for sale of municipal property. Confirmed lokal-mieszkalny sale auctions:
- **ul. Małe Przedmieście 1, lokal nr 2, Olesno** — 14,09 m², cena wywoławcza 48 000 zł → **III przetarg ustny nieograniczony na sprzedaż lokalu** (I/II/III rounds ran in 2025). Sold: cena osiągnięta **48 480 zł netto**, 1 uczestnik, nabywca „AD-BAU" Artur Świtała (rozstrzygnięcie 10.10.2025).
- **Świercz, ul. Częstochowska 9, lokal nr 7** — 71,60 m², cena wywoławcza 153 000 zł, wadium 15 300 zł — **II przetarg ustny nieograniczony na sprzedaż mieszkania** (20.01.2020, inline HTML).
- **ul. Małe Przedmieście 3, lokal użytkowy 1c** — 14,40 m² — I przetarg ustny nieograniczony (2024; lokal użytkowy, same pattern/building family).

Sales are directly by the gmina (Wydział GNiL, ul. Pieloka 21, pok. 103). **No dedicated ZGM/ZBM housing manager** — flats in wspólnoty mieszkaniowe are disposed of directly by the urząd. (SIM/Społeczna Inicjatywa Mieszkaniowa exists at ul. Słowackiego 1a but is new-build **rental**, not sale — out of scope.) Powiat also sells flats separately (Starostwo Powiatowe, `bip.powiatoleski.pl` — e.g. lokal mieszkalny Sowczyce) — different JST, out of scope.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (skyCMS v4):** host `bip.olesno.pl`.
- Sale board 2026: `https://bip.olesno.pl/12941/11571/przetargi-na-sprzedaz-nieruchomosci-2026.html`
- Sale board 2025: `https://bip.olesno.pl/12150/przetargi-na-sprzedaz-nieruchomosci-2025.html` (26 entries, ogłoszenia + wyniki interleaved)
- Sale board 2024: `https://bip.olesno.pl/11446/przetargi-na-sprzedaz-nieruchomosci-2024.html`
- Sale board 2023: `https://bip.olesno.pl/10729/przetargi-na-sprzedaz-nieruchomosci-2023.html` (yearly archive chain runs 2015→2026)
- Wydział Gospodarki Nieruchomościami i Lokalami: `https://bip.olesno.pl/6657/wydzial-gospodarki-nieruchomosciami-i-lokalami.html`
- **EXCLUDE (lease boards):** *najem lokali* `…/12153/…` (flat rental) and *dzierżawa gruntów* `…/12152/…` (land lease) — separate per-year boards; not sales.
- Document URL pattern: `bip.olesno.pl/NNNNN/slug.html`; per-year board `NNNNN/MMMMM/slug.html`; attachments `bip.olesno.pl/download/attachment/NNNNN/…pdf`; XML feed variant `bip.olesno.pl/xml/NNNNN/slug.html`.

Contact: Urząd Miejski w Oleśnie, ul. Pieloka 21, 46-300 Olesno, tel. 34 359 78 41–43.

## 3. Format + rendering
- **Server-rendered HTML** — skyCMS v4 (`bip_v4`). `curl` returns full markup incl. all list titles and article text (no JS gate). Cookies `skycms_*` / `cms_public`; assets under `cms/public/style/default/bip_v4/`.
- Article-list markup is the standard skyCMS `<li><h2><a href="/NNNNN/slug.html">TITLE</a></h2></li>`; content in `id="printArea"` / `<article>` wrapper.
- **No SPA, no auth, no CAPTCHA.** Notices are inline HTML text (cena wywoławcza, powierzchnia, wadium, termin, runda). Longer attachments occasionally as **born-digital text PDFs** (`download/attachment/…`) — handle with `pdfText`; OCR unlikely.
- Pagination ~10 items/page (skyCMS default); yearly boards bound the crawl.

## 4. Volume + achieved-price stream
- **Volume: LOW, land-skewed but recurring.** Sale board is dominated by działki (land); flats appear ~1–3/year but recur across multiple years, often as multi-round I/II/III repeats when unsold. Not a high-volume flat city — comparable to Zgorzelec's low-to-modest tier.
- **Achieved-price stream: YES — inline, same board.** Results are posted as *"Informacja o wyniku [N] przetargu … na sprzedaż lokalu/działki"* interleaved with the ogłoszenia on each yearly sale board, carrying **cena osiągnięta / nabywca / liczba uczestników** (confirmed: Małe Przedmieście 1/2 → 48 480 zł netto, nabywca named). Both cena wywoławcza (announcement) and hammer price (result) are parseable from server HTML. No separate results host — one board carries both.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog: Przemyśl — already in repo** (`pipeline/src/cities/przemysl/`). Identical skyCMS v4 platform: same list markup, same `printArea` content extraction, same `NNNNN/slug.html` URLs, same 10/page pagination. `parseListPage` + content-to-text logic port almost verbatim.
- **CMS family:** skyCMS v4 (server-rendered HTML; numeric-ID BIP). Not in the analog map — this spike establishes Olesno = Przemyśl-family.
- **Effort: LOW.** Seed the per-year *sprzedaż nieruchomości* boards (2025/2026 live + a few years back for backfill) → clone przemysl crawl/parse → classify each article: keep `sprzedaż … lokal[u] mieszkaln*` (and land if in-scope for wider dataset), drop najem/dzierżawa; split *ogłoszenie* (cena wywoławcza) vs *informacja o wyniku* (cena osiągnięta) and join by address/round. Filter is easy because lease is already on separate boards.
- **Blockers:** None. No rate-limit/auth/CAPTCHA. Only watch-items: (a) low flat volume means most yearly entries are land — classifier must not treat land noise as flats; (b) confirm we target `bip.olesno.pl` (Opolskie), not the Małopolskie `ugolesno`.

**VERDICT: BUILD (Low effort)** — recurring open flat auctions on a clean skyCMS v4 server-HTML BIP with inline achieved-price results and lease cleanly separated onto other boards; exact in-repo analog (Przemyśl) already exists. Caveat: modest, land-skewed flat volume.
