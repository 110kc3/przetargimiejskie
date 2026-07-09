# Spike — Świdwin (Zachodniopomorskie · powiat świdwiński)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (double blocker: land-only auction stream + scanned-image PDFs).

## TL;DR
Gmina Miasto Świdwin (town gmina miejska; Burmistrz Miasta Świdwin) does run **open oral auctions** — `przetarg ustny nieograniczony` — and at healthy cadence (Nr 3–9/2026 already by end of June 2026). BUT every sampled auction is **100% LAND**: unbuilt building plots (działki niezabudowane), largely under the town's **"Działki budowlane dla młodych w Świdwinie"** program (obręb 012, ul. Wisławy Szymborskiej, MN-U). **Zero lokal-mieszkalny auctions** observed. On top of the wrong content, the notices are **scanned-image PDFs** (JPEG 200 ppi, 0 bytes extractable text — OCR-only). There is **no dedicated municipal housing manager** (no ZGM/TBS in the town itself; contrast neighbouring Szczecinek's ZGM TBS); flats move `bezprzetargowo na rzecz najemcy` with bonifikata, not through auction. This matches the existing biuletyn.net land-only analogs (**Łańcut**, **Sanok**). Two independent blockers → NO-BUILD.

## 1. Sells municipal property at auction?
**YES for LAND, NO for flats.** Burmistrz Miasta Świdwin publishes `Ogłoszenie przetargu ustnego nieograniczonego` for `zbycie nieruchomości` on the city BIP. Volume is real — Nr **3/2026 … 9/2026** all live/recent as of 30 June 2026 — but the sampled content is exclusively unbuilt land:
- **Nr 8/2026** (OCR'd): działki nr 216/104–109, obręb 012 Świdwin, ul. Wisławy Szymborskiej — *"nieruchomość gruntowa niezabudowana, nieuzbrojona … grunty orne … zabudowa mieszkaniowa jednorodzinna"*, MPZP 5.21 MN-U. Ceny wywoławcze ~97k–123k zł + 23% VAT. Pure land, I przetarg ustny.
- **Nr 3/2026** (OCR'd): działki nr 214/40–43+, obręb 012 — again `niezabudowana` building plots, explicitly the **"Działki budowlane dla młodych w Świdwinie"** program (Uchwała XXVIII/210/26, bonifikata + 7-year build-out covenant). All land.

No `lokal mieszkalny` / `lokal użytkowy` auction found in the current board. Flats: the `Wykaz nieruchomości przeznaczonych do zbycia/najmu` stream (Wykaz Nr 13–15/2026 etc.) is where residential designations sit, and municipal flats in towns of this size are sold `bezprzetargowo na rzecz najemcy` (sitting-tenant, with bonifikata) — not at open auction. No town ZGM/TBS operating flat auctions.

## 2. Where published? (hosts + boards, URLs)
**Primary — town BIP (biuletyn.net / INTERmedi@ CMS-BIP 3.0):**
- Sprzedaż nieruchomości (list board): `https://swidwin.biuletyn.net/?bip=1&cid=1191&bsc=N`
- Individual notice: `https://swidwin.biuletyn.net/?bip=2&cid=1191&id=<ID>` (e.g. Nr 8 → `id=2308`, Nr 3 → `id=2302`)
- Attachment (scanned PDF): `https://swidwin.biuletyn.net/fls/bip_pliki/2026_06/<BIPF…hash…>/Ogloszenie_nr_N.pdf`
- Zamówienia publiczne (procurement, separate): `?bip=1&cid=1226&bsc=N`; Zapytania ofertowe `cid=1305`
- Town portal mirror (also image-based): `https://www.swidwin.pl/asp/przetargi,10,,1`

No dedicated "wyniki / informacja o wyniku przetargu" board surfaced on the Sprzedaż list — results (achieved price) not evidently a separate parseable stream here.

**Do NOT confuse** with the rural **Gmina Świdwin** (separate JST, ibip.pl CMS): `https://ug.swidwin.ibip.pl/public/?id=151611` (Przetargi) — its auctions are land in Krosino/Rusinowo. And **powiat świdwiński** (Starostwo, State-Treasury property): `https://bip.powiatswidwinski.pl/…/przetargi-na-sprzedaz-i-wynajem-nieruchomosci`. Target here is only the **town Gmina Miasto Świdwin** (`swidwin.biuletyn.net`).

## 3. Format + rendering
- **CMS:** biuletyn.net (INTERmedi@ CMS-BIP 3.0) — server-rendered HTML index/article pages (`?bip=1/2&cid=&id=`), same family as Łańcut, Sanok, Poddębice, Przasnysz spikes.
- **Notice body:** NOT inline text. Each `Ogłoszenie` is a **scanned-image PDF** — `pdfimages -list` shows full-page JPEGs (3307×2338, 200 ppi RGB); `pdftotext` returns **2 bytes**. Historic swidwin.pl notices are likewise embedded JPEG scans. → **OCR mandatory** (tesseract `-l pol` works but is the heavy path; addresses/prices arrive as a scanned table, error-prone).
- No SPA/auth/CAPTCHA, but the OCR requirement is the technical blocker.

## 4. Volume + achieved-price stream
- **Auction volume:** decent for land — ~9 auction announcements in H1 2026 — but **flat volume = 0**. The recurring stream is the "Działki budowlane dla młodych" building-plot program (land), plus occasional other działki.
- **Achieved-price stream:** weak/absent — no dedicated wynik board observed on the town BIP; and even the announcements are OCR-only, so cena wywoławcza (let alone cena osiągnięta) is not cleanly machine-readable.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** the biuletyn.net **land-only NO-BUILDs** — **Łańcut** (`GS1`: all auctions land, flats only bezprzetargowo, manager does najem not sales) and **Sanok** (biuletyn.net, land + leases, zero gmina flat auctions). Świdwin fits this shape exactly.
- **CMS family:** biuletyn.net / INTERmedi@ (ADAPTER-GUIDE §3 "WordPress / custom HTML" server-rendered family) — but content is scanned PDF, pushing it toward the OCR-dispatch path.
- **Effort:** **—** (not worth estimating; would be High if attempted, given OCR of scanned tables for a stream that has no flats).
- **Blockers (two, either alone is disqualifying):**
  1. **Content mismatch** — auction stream is unbuilt land ("działki budowlane dla młodych"); municipal flats go bezprzetargowo na rzecz najemcy; no town ZGM/TBS running flat auctions.
  2. **Scanned-image PDFs** — 0 extractable text; OCR-only, no reliable price/address stream, no results board.

**VERDICT: NO-BUILD** — Świdwin's town auctions are a land / building-plot program on scanned-image PDFs with no flat-auction volume and no clean achieved-price stream; identical to the Łańcut/Sanok biuletyn.net land-only pattern. Revisit only if the town starts auctioning lokale mieszkalne in born-digital form.
