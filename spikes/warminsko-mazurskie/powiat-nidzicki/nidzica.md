# Spike — Nidzica (Warmińsko-Mazurskie · powiat nidzicki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low–Medium effort).

## TL;DR
Gmina Nidzica (Urząd Miejski, **Burmistrz Nidzicy**, ref. symbol **GMKR** — Gospodarka Mieniem Komunalnym i Rolnictwo) sells municipal property — **including lokale mieszkalne** — via *przetarg ustny nieograniczony na sprzedaż*. Everything is published on the town's own BIP `bip.nidzica.pl`, which runs the **SystemDoBIP** CMS: clean server-rendered HTML (jQuery/Bootstrap, `/szablon/wcag_3a/…`), no SPA, no auth, no CAPTCHA. Two surfaces: (a) a **structured tender module** at `/przetargi/257/…` with filterable status tabs (Ogłoszone / Rozstrzygnięte / Unieważnione), stable numeric URLs, and per-row fields (nr GMKR, dates, cena wywoławcza, **Wynik** column) and (b) a **dated article board "Ogłoszenia o przetargach"** at `/258/…` carrying full inline-HTML announcements. Flat auctions are **low-volume but recurring** (Dobrzyń 31, Zagrzewo, Brzozowa 8 confirmed; module resolved-list showed 5 lokal mieszkalny + 2 niemieszkalny among 30). Achieved-price stream exists as a **binary Wynik (Pozytywny/Negatywny)** in structured HTML; the actual hammer price/nabywca sits inside attached **.DOC/.DOCX** "informacja o wyniku" files. Closest analog: the bip.info.pl server-HTML gmina (zgorzelec/złotoryja) pattern — dated board + structured status boards — but a **new CMS family (SystemDoBIP)** to add. No blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats, open oral format.** Burmistrz Nidzicy runs `przetarg ustny nieograniczony` for sale of municipal property; flats are an explicit, recurring category. Confirmed lokal-mieszkalny sale auctions:
- **Dobrzyń, budynek nr 31** — II przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowych: lokal nr 4 (27,00 m², cena wyw. 13 000 zł) i lokal nr 5 (28,40 m², 12 300 zł), wadium 2 000 zł. Inline-HTML ogłoszenie. (`/258/5609/…`)
- **Zagrzewo** — dawna świetlica przeznaczona do przebudowy na lokal mieszkalny (88,06 m²), sprzedawana w kolejnych rundach aż do **IV przetargu ustnego nieograniczonego** (`/258/5761/…`, `/258/5574/…`, `/258/5459/…`).
- **Nidzica, ul. Brzozowa 8, lokal nr 2** (24,00 m²) — przetarg ustny nieograniczony, później rokowania (cena 78 000 zł). Widoczny w module: `/przetargi/257/125/GMKR_6840_8_2025_09/`.

Land dominates the board (działki niezabudowane, przetargi ograniczone na rzecz sąsiadów), and some residential disposal is repeat-round / rokowania when unsold — but **open flat auctions are clearly non-zero and recurring**, which clears the BUILD bar.

## 2. Where published? (hosts + boards, URLs)
**Single host — town BIP `bip.nidzica.pl` (SystemDoBIP CMS).**
- **Structured tender module (primary):** `https://bip.nidzica.pl/przetargi/257/status/`
  - Ogłoszone (current): `…/przetargi/257/status/0/`
  - **Rozstrzygnięte (results):** `…/przetargi/257/status/1/`
  - Unieważnione: `…/przetargi/257/status/2/`
  - Detail page pattern: `…/przetargi/257/{seq}/{GMKR_no}/` e.g. `…/257/141/GMKR_6840_26_2022/`, `…/257/125/GMKR_6840_8_2025_09/`
- **Article board "Ogłoszenia o przetargach":** current e.g. `https://bip.nidzica.pl/258/5783/…`; **archive** `https://bip.nidzica.pl/258/1/archiwum/Ogloszenia_o_przetargach/` (paginated, ~13 pages). Article URL pattern `…/258/{id}/{SLUG}/`.
- **"Informacje i komunikaty":** `https://bip.nidzica.pl/259/…` — carries *informacja o ogłoszeniu / o wyniku przetargu* posts.
- **File attachments:** `…/system/pobierz.php?plik={name}&id={hash}` and `…/system/obj/{NNNNN}_{name}.doc` (Word docs), plus `.png`/`.jpg` maps.

No separate housing manager (ZGM/ZBM/TBS) publishes sales — the Gmina disposes directly. Contact: Urząd Miejski w Nidzicy, Plac Wolności 1 (Ratusz), pok. 16. Also mirrored to aggregators (infopublikator.pl, otoprzetargi.pl) but BIP is authoritative.

## 3. Format + rendering
- **Server-rendered HTML** — SystemDoBIP CMS (fingerprint: `systemdobip` in markup, template `/szablon/wcag_3a/mod/layout/…`, jQuery 1.9 + Bootstrap + jQuery-UI). Confirmed via live fetch (43 KB static HTML board). **No SPA, no JSON API, no auth, no CAPTCHA, no JS gate.**
- **Article board (`/258`)**: full ogłoszenie as **inline HTML text** (Dobrzyń notice was pure inline HTML with a PNG site map). Cleanest parse path.
- **Structured module (`/257`)**: per-tender **structured HTML fields** (nr, ogłoszono, termin, cena wywoławcza, Wynik) + the full ogłoszenie attached as a **born-digital `.DOC/.DOCX`** (Word) file, e.g. `I_przet._ograniczony_Dolna_246_4.doc`. **No PDF-OCR anywhere** — but a **DOC/DOCX text extractor** (antiword / LibreOffice --headless / mammoth) is needed for module attachments and result docs.

## 4. Volume + achieved-price stream
- **Volume: LOW but real.** Archive skews to land: roughly ~6 flat announcements vs ~18 land vs ~3 dzierżawa across the paginated archive; the module's Rozstrzygnięte list (30 rows) showed **5 lokal mieszkalny + 2 lokal niemieszkalny + 23 działki**. Flats recur but are few distinct units (Dobrzyń 31, Zagrzewo, Brzozowa 8) carried through **multiple repeat rounds (I–IV przetarg)** at small rural values (~12k–78k zł). Expect a handful of flat auctions/year.
- **Achieved-price stream: PARTIAL/structured-binary.** The module Rozstrzygnięte list carries a **Wynik** column = *Pozytywny / Negatywny* as structured HTML (clean signal for sold vs no-bid). The **actual hammer price + nabywca** are not an inline field on the detail page — they live in an attached `.DOC/.DOCX` *informacja o wyniku przetargu* (or a `/259` komunikat). So: sold/unsold is free; the number needs a Word-doc parse.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** server-HTML gmina BIP with a dated article board + structured status boards — **zgorzelec / złotoryja (bip.info.pl) pattern** in shape and effort, though the CMS itself is a **new family: SystemDoBIP** (add fingerprint `szablon/wcag_3a` + `systemdobip`). Parse strategy mirrors those adapters.
- **CMS family:** SystemDoBIP (server-rendered HTML; classic BIP, no SPA).
- **Effort: LOW–MEDIUM.** Primary path is trivial: crawl module `…/przetargi/257/status/0/` + archive `/258/1/archiwum/Ogloszenia_o_przetargach/`, follow stable numeric detail URLs, regex/DOM-parse address + powierzchnia użytkowa + cena wywoławcza + wadium + termin + round from **inline HTML**; classify lokal mieszkalny vs land/dzierżawa. Second pass over `…/257/status/1/` for the Wynik column. **Bumps to Medium only if hammer prices are required** — that needs `.DOC/.DOCX` extraction of the *informacja o wyniku* attachments.
- **Blockers:** None technical. No rate-limit/auth/CAPTCHA signals. Watch-items: (1) low absolute flat volume + heavy repeat rounds (dedupe by KW/address across I–IV przetarg); (2) two overlapping surfaces (module `/257` vs article board `/258`) — reconcile so the same auction isn't double-counted; (3) Word-doc (not PDF) extraction for achieved prices.

**VERDICT: BUILD (Low–Medium effort)** — recurring OPEN flat auctions (`przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego`) on a clean server-HTML SystemDoBIP BIP with a structured tender module and a binary results board; low volume but non-zero and parse-friendly, no blockers.
