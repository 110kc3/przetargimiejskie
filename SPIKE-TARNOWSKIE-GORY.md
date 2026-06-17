# Spike — Tarnowskie Góry (build go/no-go)

> **Status:** spike complete — **VERDICT: BUILD (Low–Medium effort).** Live-verified
> 2026-06-17. Would add a 10th city. Methodology per [EXPANSION.md](./EXPANSION.md)
> and [SPIKE-HOUSES-LAND.md](./SPIKE-HOUSES-LAND.md). The adapter build follows in
> `pipeline/src/cities/tarnowskie-gory/`.

## TL;DR

Gmina Tarnowskie Góry (Urząd Miejski) auctions municipal **flats, buildings AND
land**, and publishes **both active announcements and achieved-sold-price result
notices** on its city BIP (`bip.tarnowskiegory.pl`) as **text PDFs behind a clean
JSON API**. No OCR, no TLS workaround, no JS-render blocker, no auth. Closest
existing analog: **Zabrze** (but easier). This is one of the cleanest source
profiles in the project.

## 1. Does the gmina sell municipal property at auction? — YES (in scope)

Confirmed from live "Burmistrz Miasta Tarnowskie Góry ogłasza … przetarg ustny
nieograniczony na sprzedaż …" notices (the GMINA / Urząd Miejski — in scope; the
`powiat.tarnogorski.pl` county is a separate institution, out of scope, no
duplication). Classes seen: **flats** (lokal mieszkalny — e.g. ul. Pokoju 10 nr 5,
37,70 m²), **buildings** (nieruchomość zabudowana — e.g. the 1886 tenement at
Strzelecka 1, 2 200 000 zł), **land** (działki niezabudowane). Commercial/garages
exist but are low-volume and mostly *najem* (rental, skipped).

## 2. Where is it published?

Host **`bip.tarnowskiegory.pl`**, menu node 3472 "Nieruchomości, w tym przetargi":

| Board | Name | Scope | Active / Archived |
|---|---|---|---|
| **5217** | Przetargi na nieruchomości zabudowane (budynki i lokale) | ✅ flats + buildings | 3 / 291 |
| **5216** | Przetargi na nieruchomości niezabudowane (land) | ✅ land | 2 / 199 |
| **5989** | Wykazy nieruchomości do sprzedaży | ✅ wykazy (sale) | 0 / 216 |
| 5218 / 5990 | Przetargi/wykazy na dzierżawę / najem | ❌ rentals | — |

**Result notices** ("Informacja o wyniku przetargu") are published **inline on
5217/5216** (no separate WYNIKI board — same pattern as Zabrze); the result title
mirrors the announcement (street + flat-no + round), so they join by address+round.

## 3. Format + rendering

React SPA, but a clean **JSON API** makes a browser unnecessary:

- `GET /api/menu/<id>/articles?limit=&offset=&archived=true` → `{ total, articles:[{ id, title, columnFields/aliasFields (publish date) }] }` (pagination via limit/offset).
- `GET /api/articles/<id>` → metadata + `attachments[]` (`extension:"pdf"`, link `/e,pobierz,get.html?id=<attId>`).
- Announcement `content` is just the title; **all detail is in one text PDF per article** — `pdftotext -layout` (not scanned) → fits `core/pdf-text.js`. Server-rendered fallback if ever needed: `/Article/id,N.html`.

## 4. Volume + achieved-price stream

- Board 5217: **~33 sale announcements** (16 flats, 17 buildings, +1 commercial +1 garage) + **44 result notices**; 291 archived. Board 5216 land 2/199. Wykazy 216.
- **Achieved-SOLD-PRICE stream: YES** (like Gliwice/Zabrze, unlike Bytom): result notices give `Cena wywoławcza` / `Cena osiągnięta w przetargu` / `Nabywca: …` (sold), or "zakończony wynikiem negatywnym" (unsold).
- Per-announcement fields (standard ZGM-style phrasing): address (`przy ulicy …`), parcel (`działkę nr 384/202`), area (flats in `m2` usable; land/buildings in `ha`), starting price (`Cena wywoławcza`, spaced thousands), auction date (`Przetarg będzie 11 sierpnia 2026 r.`), round (`pierwszy/drugi/trzeci przetarg`).

## 5. Adapter effort + verdict

- **Parser family:** `core/pdf-text.js` (pdftotext) + a paragraph parser. Reuse the existing hectare + spaced-price + `Nabywca`/`wynikiem negatywnym` grammar; `classify-kind.js` (mieszkalny/zabudowana/uzytkowy/garaz) + `build-land.js` for land.
- **Closest template:** Zabrze (`pipeline/src/cities/zabrze/{config,crawl,index,parse}.js`) — same "city-BIP SPA → JSON list API → per-announcement attachment → inline result-notice stream" shape, minus Zabrze's OCR/TLS pain. Use `source:'html'` so the orchestrator's OCR dispatch is skipped and the adapter extracts attachments itself.
- **Blockers:** none material — TLS clean (plain Node `fetch` → 200), JSON API bypasses the SPA, simple pagination, public.
- **Risks (both small):** (1) the result→announcement **join key** (address + flat-no + round; validate on first real run, as Gliwice/Zabrze needed); (2) the API is an undocumented vendor endpoint — note the `/Article/id,N.html` server-rendered fallback in `config.js`.

**VERDICT: BUILD — Low–Medium.** Delivers flats + buildings + land + a sold-price
history on the cleanest source profile spiked so far.

---

*Generated 2026-06-17 from a live source spike. Doc-only — no version bump.*
