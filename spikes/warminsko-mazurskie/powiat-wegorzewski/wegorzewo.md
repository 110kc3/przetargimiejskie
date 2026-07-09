# Spike — Węgorzewo (Warmińsko-Mazurskie · powiat węgorzewski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low–Medium effort).

## TL;DR
Gmina Węgorzewo (Urząd Miejski, Burmistrz Węgorzewa) sells municipal property — including **lokale mieszkalne** — via **przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego** (open oral auction). Announcements + results are published on the city BIP `bip.wegorzewo.pl`, which runs the **IDcom** hosted CMS: server-rendered HTML boards at `/wiadomosci/<cat>/lista/...` and individual notices at `/wiadomosci/<cat>/wiadomosc/<id>/...` (also reachable via `/struktura/1/2137/dokumenty/3/lista/1/<year>`). This is the **exact host shape of the already-BUILT gizycko adapter** (same voivodeship, neighbouring powiat). A second municipal stream exists: **Ciepłownie Miejskie Sp. z o.o. (CEM)** — the gmina's property/housing manager (`gospodarowanie zasobami gminnymi`, wspólnoty mieszkaniowe) — also runs flat auctions and publishes them at `cem.wegorzewo.pl/nieruchomosci`. Confirmed OPEN oral flat auctions: Węgielsztyn 37/4, Kal 38/2 (89,20 m²), Pniewo lok. 4, Jasna 4/5 (CEM). Volume is low (~a few flats/yr; gmina ~16k, mixed town + village municipal flats). Closest analog: **gizycko** (IDcom, HTML boards, scanned result PDFs → OCR). No hard blockers; one operational note: the BIP presents an **incomplete TLS chain** ("unable to verify the first certificate").

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Burmistrz Węgorzewa runs `przetarg ustny nieograniczony` for the sale of municipal property; flats are an explicit, recurring category. Confirmed lokal-mieszkalny open oral auctions (via BIP + search index):
- **Węgielsztyn 37, lok. 4** — przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego (gmina Węgorzewo).
- **Kal 38, lok. 2** — pow. użytkowa **89,20 m²**, budynek wielorodzinny; ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego.
- **Pniewo, lok. 4** — Burmistrz Węgorzewa, ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego.
- Land also cycles through the same board (e.g. 2021-02-12 przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej, obręb Ogonki) — the stream mixes flats + land, as expected for a miejsko-wiejska gmina.

**Housing/property manager:** **Ciepłownie Miejskie Sp. z o.o. (CEM)** — despite the "heating" name, CEM manages the gmina's property (`gospodarowanie zasobami gminnymi`, `zarządzanie wspólnotami mieszkaniowymi`) and runs its own flat auctions, e.g. **ul. Jasna 4, lok. 5 — trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego** (`cem.wegorzewo.pl/nieruchomosci`). This is a real, in-scope OPEN oral stream distinct from the UM board.

Out of scope: **Spółdzielnia Mieszkaniowa w Węgorzewie** (`sm-wegorzewo.pl`) — a private housing co-op, not municipal.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (IDcom CMS):**
- Przetargi board (all years): `https://bip.wegorzewo.pl/wiadomosci/3/lista/przetargi`
- Przetargi by year: `https://bip.wegorzewo.pl/wiadomosci/3/lista/1/2025` · `.../1/2021` · `.../1/2019` · `.../1/2017`
- Struktura path (same docs): `https://bip.wegorzewo.pl/struktura/1/2137/dokumenty/3/lista/1/2025`
- Individual notice pattern: `https://bip.wegorzewo.pl/wiadomosci/3/wiadomosc/<ID>/<slug>` (e.g. `.../wiadomosc/188766/20210212_przetarg_ustny_...`)
- Public mirror (identical CMS/content, no `bip.` prefix): `https://wegorzewo.pl/wiadomosci/3/lista/...`

**Second municipal stream — CEM (property manager):**
- Nieruchomości hub: `http://cem.wegorzewo.pl/nieruchomosci/` → sub-boards **Przetargi aktualne** / **Przetargi archiwalne**
- Example notice: `http://cem.wegorzewo.pl/nieruchomosci/ogloszenie-o-przetargu-na-sprzedaz-lokalu-mieszkalnego/` (Jasna 4/5; full terms in linked PDF "Treść całego ogłoszenia").

**Results / achieved price:** `informacja o wyniku przetargu` notices are published **inline in the same przetargi category** (IDcom pattern — announcements and results share the board), same as gizycko.

**TLS note:** `bip.wegorzewo.pl` and `wegorzewo.pl` return "unable to verify the first certificate" (incomplete intermediate chain) to WebFetch; the adapter's fetch layer must tolerate the chain (browser-UA/relaxed-chain handling) — the content itself is plain server HTML.

## 3. Format + rendering
- **Server-rendered HTML** — IDcom hosted BIP. Boards are dated HTML lists; each notice is an HTML article at `/wiadomosci/3/wiadomosc/<id>/...`. No SPA, no auth, no CAPTCHA.
- Full ogłoszenie text is typically inline HTML; auction terms / `wykaz` often also as **PDF attachments**. Per the gizycko analog, some **result notices are scanned PDFs (Xerox)** → born-digital `pdfText` first, **OCR (tesseract -l pol)** fallback for the achieved price.
- CEM notices: HTML teaser + PDF "Treść całego ogłoszenia" (handle the same way).

## 4. Volume + achieved-price stream
- **Volume:** Low. Gmina ~16k (town ~11k); expect **~a few flat auctions/yr** across UM + CEM, mixed with land and occasional lokal użytkowy; repeats appear as II/III przetarg (Jasna 4/5 reached a 3rd round). Comparable to gizycko's ~5 flats/yr, likely a touch lower.
- **Achieved-price stream:** YES — `informacja o wyniku przetargu` posted to the same board carries `cena osiągnięta / nabywca` (or wynik negatywny); announcements carry `cena wywoławcza` + `wadium`. Caveat: as with gizycko, result docs may be **scanned images**, so hammer-price extraction likely needs an OCR pass (announcements parse cleanly from HTML).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **`gizycko`** (BUILT) — same voivodeship, neighbouring powiat, **identical IDcom host shape** (`bip.<city>.pl/wiadomosci/<cat>/wiadomosc/<id>`, HTML boards, scanned result PDFs). Clone directly; `tczew`/`gniezno` are the wider IDcom family.
- **CMS family:** IDcom (server-rendered HTML boards + HTML/PDF attachments).
- **Effort:** **LOW–MEDIUM.** Board list (`/wiadomosci/3/lista/1/<year>` + `struktura/.../3/lista/1/<year>`) → article fetch → parse address/powierzchnia użytkowa/cena wywoławcza/wadium/date/round (regex/DOM, reuse parseAddress). Filter land/dzierżawa where flats are the target. Add the **CEM** board (`cem.wegorzewo.pl/nieruchomosci` przetargi aktualne/archiwalne) as a second source. `parseResultDoc` over the shared board for `cena osiągnięta` — expect OCR for scanned results (gizycko shipped this as a stub; same follow-up applies here). Bumped from LOW because of (a) the second CEM stream and (b) scanned-result OCR.
- **Blockers:** None hard. Watch-items: incomplete **TLS chain** (fetch layer must tolerate it), the dual UM+CEM sources, and scanned result PDFs for hammer prices.

**VERDICT: BUILD (Low–Medium effort)** — recurring municipal open oral flat auctions on a clean IDcom server-HTML BIP (exact gizycko clone) plus a second CEM property-manager stream; inline result notices; only a TLS-chain quirk and scanned-result OCR to handle.
