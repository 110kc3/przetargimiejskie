# Spike — Strzelce Krajeńskie (Lubuskie · powiat strzelecko-drezdenecki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Strzelce Krajeńskie (miejsko-wiejska, town is the seat) sells municipal property — **including lokale mieszkalne** — via *ustny przetarg nieograniczony na sprzedaż*. Everything is published on the city BIP `bip.strzelce.pl`, which runs **SYSTEMDOBIP.PL** (E-LINE Systemy Internetowe / Tadeusz Kozłowski) — the **identical CMS to Gorzów Wielkopolski**, the same voivodeship's already-built adapter. Same board shape (`/przetargi/29/status/0|1/`), same detail-page URLs (`/przetargi/29/<id>/<SLUG>/`), same PDF-download endpoint (`/system/pobierz.php?plik=…pdf&id=…`). Server-rendered HTML list + structured detail fields; cena wywoławcza / wadium live in a **born-digital PDF attachment**. Flat auctions recur (Gilów 20/1 37,78 m² and Bobrówko ul. Strzelecka 21/3 48,01 m² confirmed in 2026) but volume is modest and rural-heavy, mixed with land + lokale niemieszkalne. Closest analog: **`gorzow-wielkopolski`** — near drop-in (swap origin + board ids). No technical blockers; the only weak spot is the achieved-price stream.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Burmistrz Strzelec Krajeńskich (Wydział GPM — Gospodarki Przestrzennej i Mienia) runs `ustny przetarg nieograniczony` for sale of municipal property, and **lokale mieszkalne** are an explicit, recurring category (open oral auction, not only bezprzetargowo na rzecz najemcy). Confirmed lokal-mieszkalny sale auctions in 2026:
- **Gilów 20/1** — I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego, 37,78 m² + udział 140/1000 w częściach wspólnych + własność działki 25/4 (801 m²). Ogłoszone 2026-04-02.
- **Bobrówko, ul. Strzelecka 21/3** — II ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego, 48,01 m² + udział 214/1000 + działki 132/77–80 (553 m²).

The active board on the day of this spike carried: a lokal **niemieszkalny** (Ogardy 52, 41,92 m², GPM 22/2026, przetarg 2026-07-15), a niezabudowana nieruchomość (Długie dz. 306/17, GPM 25/2026, przetarg 2026-09-02), and rokowania on a nieruchomość zabudowana (Wielisławice, placówka edukacyjna, GPM 24/2026) — i.e. flat auctions cycle in and out; the stream mixes flats + land + lokale użytkowe. No dedicated ZGM/ZBM/TBS housing manager — the gmina (Wydział GPM) publishes directly.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (`bip.strzelce.pl`, SYSTEMDOBIP.PL CMS):**
- Przetargi — aktualne (announcements, active): `https://bip.strzelce.pl/przetargi/29/status/`  (= `.../29/status/0/`)
- Przetargi — rozstrzygnięte (resolved / past): `https://bip.strzelce.pl/przetargi/29/status/1/`
- Detail page pattern: `https://bip.strzelce.pl/przetargi/29/<id>/<SLUG>/` — e.g. `.../29/135/OGLOSZENIE_GPM_22_2F2026/`, `.../29/136/OGLOSZENIE_GPM_25_2F2026/`, `.../29/137/OGLOSZENIE_GPM_24_2F2026/`.
- PDF download endpoint: `https://bip.strzelce.pl/system/pobierz.php?plik=GPM_22_2026.pdf&id=<hash>` (announcement full text) + `Wzor_zgloszenia.pdf` (bid form).
- Pagination (by analogy to Gorzów's identical CMS): page number goes **before** the status segment, `/przetargi/29/<page>/status/1/`.
- General ogłoszenia board (secondary): `https://bip.strzelce.pl/93/Informacje/`.

**Do NOT confuse** with **Strzelce Opolskie** (woj. opolskie) — different town on a different BIP (`bip.strzelceopolskie.pl` + housing manager `gzmk.pl`). Our target is Strzelce **Krajeńskie**, lubuskie.

## 3. Format + rendering
- **Server-rendered HTML** list board — `<tr>` rows with data-ogłoszenia / data-przetargu / title+href / attachments cells (same markup family as Gorzów's `td-date-1 / td-title-1 / td-attachments-1`). Confirmed live via fetch; no JS gate, no SPA, no CAPTCHA.
- **Detail page**: some structured fields inline in HTML (auction type, powierzchnia, plot, adres, data i godzina przetargu, location) but **cena wywoławcza + wadium show "informacja w załączniku"** — the numbers live in the attached PDF.
- **Attachments = born-digital PDFs** via `/system/pobierz.php` (GPM_NN_2026.pdf, ~130 KiB) → extract with `pdfText()`. Watch for occasional EZD-printed scans (Gorzów hits these) → `ocrPdf()` fallback, already wired in the analog.
- **User-agent**: like Gorzów's `bip.um.gorzow.pl`, expect the host may 403/empty on bot UA — pass a browser UA (`core/fetch.js` supports it).

## 4. Volume + achieved-price stream
- **Volume:** Low / modest. A rural-heavy gmina miejsko-wiejska — auctions are spread across small localities (Gilów, Bobrówko, Długie, Ogardy, Wielisławice). Expect ~a handful of property auctions/year, of which **a few are flats**, some as II/III przetarg (repeat when unsold). Lower flat frequency than a big city like Gorzów.
- **Achieved-price stream:** WEAK. The rozstrzygnięte board (`/przetargi/29/status/1/`) exists but the result/wynik column reads **"Brak wyniku"** for entries — achieved prices are not systematically consolidated there. Gorzów publishes a dedicated *Informacje o wynikach przetargów* archive (`/509/…`); Strzelce may post `informacja o wyniku przetargu` PDFs less reliably. Announcement PDFs carry `cena wywoławcza`; hammer price (cena osiągnięta) capture will be best-effort. Not a blocker for BUILD (announcement/wywoławcza stream is solid).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **`gorzow-wielkopolski`** (`pipeline/src/cities/gorzow-wielkopolski/`) — **same voivodeship, same SYSTEMDOBIP.PL CMS**, same `/przetargi/<board>/status/<0|1>/` boards, same `/przetargi/<board>/<id>/<slug>/` details, same `/system/pobierz.php?plik=…&id=…` PDF endpoint, same pagination shape, same born-digital-PDF-first + OCR-fallback handling. Clone it; swap `ORIGIN=https://bip.strzelce.pl`, announcements board `320→29`, and point results at `/przetargi/29/status/1/` (there is no confirmed `/509`-style wynik archive here — verify on first run).
- **CMS family:** SYSTEMDOBIP.PL / E-LINE (server-rendered HTML boards + born-digital PDF attachments) — in ADAPTER-GUIDE §3 terms, the WordPress/custom-HTML + text-PDF path already realized by the Gorzów adapter.
- **Effort:** **LOW.** It is a config/board-id reskin of an existing, tested same-region adapter. Reuse `parseAnnouncement` (flat batch splitter), `pdfText`, `ocrPdf`, `loadKnownSourceUrls`. Main new work: confirm exact list-cell class names on `bip.strzelce.pl` markup, confirm/adjust the results source, filter land/lokale niemieszkalne/dzierżawa if flats-only is desired (though land is in-scope for the wider dataset).
- **Blockers:** None hard. Watch-items: (1) weaker achieved-price stream (Brak wyniku), (2) possible browser-UA gating (handled by analog), (3) low absolute volume — a thin but real flat feed.

**VERDICT: BUILD (Low effort)** — recurring open flat auctions on a clean SYSTEMDOBIP.PL server-HTML BIP, a near drop-in clone of the same-voivodeship `gorzow-wielkopolski` adapter; only caveat is a modest volume and a weak (Brak-wyniku) achieved-price stream.
