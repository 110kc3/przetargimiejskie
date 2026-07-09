# Spike — Wodzisław Śląski (Śląskie · powiat wodzisławski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Miasto Wodzisław Śląski (~47k, gmina miejska) **does** sell municipal property — including flats — via `ustny przetarg nieograniczony` announced by the Prezydent Miasta (confirmed: I ustny przetarg na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 26/14; historical ul. Waryńskiego 10/18, ul. Staszica). Housing is managed **in-house by the Biuro Gospodarki Lokalowej** — there is **no separate municipal ZGM/ZBM spółka** (SM „ROW" is an independent housing *cooperative* = out of scope). The catch is the delivery layer: the notice stream is served entirely through a **FINN.pl eUrząd JS SPA** (`eurzad.finn.pl/gmwodzislawsl`, hash-routed `#!/rejestry/…`). The city BIP `bip.wodzislaw-slaski.pl` is a **Liferay** shell that just **iframes** that SPA; the city website `wodzislaw-slaski.pl/ogloszenia/nieruchomosci/` list is also JS-loaded (empty in server HTML). So there is no clean server-rendered article list — this is a JS-SPA source. Closest analog: **chrzanow** (`core/render.js` / Playwright), or reverse-engineer the FINN JSON RPC. A dedicated results board exists (achieved-price stream). No auth/CAPTCHA, but not a Low-effort bip.info.pl clone.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats (open oral auctions).** The Prezydent Miasta Wodzisławia Śląskiego runs `ustny przetarg nieograniczony na sprzedaż` for municipal property. Confirmed flat auctions:
- **I ustny przetarg nieograniczony na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 26/14** (Wodzisław Śląski) — current-cycle notice (found via city ogłoszenia + search index).
- ul. **Ludwika Waryńskiego 10/18** — ustanowienie odrębnej własności lokalu mieszkalnego (2 pokoje z kuchnią), przetarg 19.06.2018.
- ul. **Staszica** — municipal flat sale (recurring address in the town's stream).

Distinguish the two disposal tracks: a separate **bezprzetargowo na rzecz najemcy** path exists — the service page **"Sprzedaż na własność lokalu mieszkalnego"** (`/sprzedaz-na-wlasnosc-lokalu-mieszkalnego.html`) is the tenant-purchase procedure (out of scope). The **przetarg** track (in scope) is the open oral auction stream. The board also carries land (działki) and occasional garaże/lokale użytkowe, so the stream is mixed — classify + filter.

Housing manager: **Biuro Gospodarki Lokalowej** (`/633-biuro-gospodarki-lokalowej.html`) inside the Urząd Miasta — no dedicated ZGM/ZBM/TBS company issuing its own auctions. **SM „ROW"** (`sm-row.pl/przetargi/`) is a housing *cooperative* (own stock) — NOT the gmina, exclude.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Liferay shell wrapping a FINN.pl eUrząd SPA):**
- Ogłoszenia o przetargach: `https://bip.wodzislaw-slaski.pl/bipkod/026/003`
- Wykaz nieruchomości przeznaczonych do sprzedaży: `https://bip.wodzislaw-slaski.pl/bipkod/026/001`
- Wykaz do wydzierżawienia/najmu/użyczenia (rentals — skip): `https://bip.wodzislaw-slaski.pl/bipkod/026/002`
- **Wyniki (achieved-price stream):** `https://bip.wodzislaw-slaski.pl/informacje-o-wynikach-przetargow-na-zbycie-nieruchomosci`
- Listy osób zakwalifikowanych (ograniczone): `https://bip.wodzislaw-slaski.pl/listy-osob-zakwalifikowanych-do-przetargow-ograniczonych-na-zbycie-nieruchomosci`
- These pages are Liferay HTML shells; the **actual notice content is inside an iframe**: `https://eurzad.finn.pl/gmwodzislawsl/?color=blue#!/rejestry/IAG-Opost/10/1/default/_` (FINN.pl eUrząd, `main.<hash>.js` SPA, hash routes `#!/rejestry/:rejestr/:liczbaPoz/:strona/:sortowanie/:filtry` and `#!/rejestr/:id`).

**FINN eUrząd backend (JSON, Spring):** origin `https://eurzad.finn.pl/gmwodzislawsl/server/…`. Discoverable download endpoints from the bundle: attachment `server/pobierz_rejestry_zalacznik/<zaa_id>`, act/notice PDF `server/pobierz_rejestry_zipx/<bad_id>/akt.pdf` (+`?podglad=tak`), bundle `…_zipx/<id>` . The register list RPC exists but is not a plain REST path (probes to `server/rejestry*`, `/api/*` return JSON 404) — needs render.js or bundle-level RPC reverse-engineering to enumerate.

**Secondary — city website (also JS-loaded list):** `https://wodzislaw-slaski.pl/ogloszenia/nieruchomosci/` (paginated `…/strona-N/`). Server HTML is only the mega-menu/service links; the notice list itself is rendered client-side (0 dated notice items in raw HTML across strona-1/2/3), so no server-HTML shortcut here.

**Not property:** `umwodzislawslaski.ezamawiajacy.pl` (public-procurement platform) and `zdm.wodzislaw.finn.pl` (Zarząd Dróg Miejskich, separate) — exclude.
**Do NOT confuse** with **Wodzisław** (świętokrzyskie, powiat jędrzejowski) = `wodzislaw.biuletyn.net` / `domaro.bip.gmwodzislawsl.finn.pl`-style *Miasto i Gmina* with villages Piotrkowice/Krężoły/Strzeszkowice — a different JST.

## 3. Format + rendering
- **JS SPA — no server-rendered article list.** Both the BIP board (`/bipkod/026/003`) and the city ogłoszenia list return only chrome; notices come from the FINN.pl eUrząd SPA via AJAX/JSON. Confirmed live: BIP board HTML = 22 KB nav + `<iframe id="embeddedIframe" src="…eurzad.finn.pl/gmwodzislawsl…">`; SPA shell = 1 KB + `main.<hash>.js`; city ogłoszenia pages ~148 KB but 0 notice items in raw HTML.
- **Extraction path:** `core/render.js` (Playwright) to drive the FINN SPA (navigate `#!/rejestry/…`, harvest per-register cards + `#!/rejestr/:id` details), **or** reverse-engineer the FINN JSON RPC (Spring backend, requestId envelopes). Notice bodies/attachments are **born-digital PDFs** via `server/pobierz_rejestry_zalacznik/…` / `…_zipx/<id>/akt.pdf` → `pdfText` (OCR unlikely).
- **No auth, no CAPTCHA.** Host TLS chain is incomplete (WebFetch fails "unable to verify first certificate"; `curl -k` / browser-UA works) — the crawler must not hard-fail on the cert (or pin/ignore as needed).

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest. ~47k Silesian town; municipal flat stock is largely being sold **bezprzetargowo to sitting tenants**, so open flat *auctions* are occasional — expect a **few flats/year**, interleaved with land/garaże/lokale użytkowe on the same board; repeat rounds (II/III ustny przetarg) when unsold.
- **Achieved-price stream: YES.** Dedicated results board **"Informacje o wynikach przetargów na zbycie nieruchomości"** (`/informacje-o-wynikach-przetargow-na-zbycie-nieruchomosci`) publishes `cena osiągnięta` / `nabywca` (or wynik negatywny). Announcements carry `cena wywoławcza`; results carry the hammer price — both inside the FINN SPA / its PDFs.

## 5. Adapter effort + verdict (closest analog; blockers)
- **CMS family:** **JS SPA** (FINN.pl eUrząd, `#!/`-hash-routed, JSON backend) fronted by a **Liferay** BIP shell — ADAPTER-GUIDE §3 "JS SPA (no server HTML)" row.
- **Closest analog:** **chrzanow** (`core/render.js` / Playwright) for the SPA; borrow **PDF handling** (`pdfText`) from any born-digital-PDF city (tarnowskie-gory / kedzierzyn-kozle). Set **`needsRender: true`** in config (CI installs Chromium only for flagged cities).
- **Effort:** **MEDIUM.** Not Low — there's no clean HTML article list to regex (both channels JS-load from FINN). Not High — no OCR, no auth, born-digital PDFs, and the FINN attachment/act-PDF endpoints are deterministic (`server/pobierz_rejestry_zalacznik/<id>`, `server/pobierz_rejestry_zipx/<id>/akt.pdf`). Two viable builds: (a) render.js drives the SPA register list + detail; (b) reverse-engineer the FINN list RPC for a lighter crawler. Filter tenant-purchase (`sprzedaż na własność … na rzecz najemcy`), land, and dzierżawa/najem; split announcement vs the wyniki board.
- **Blockers:** (1) SPA rendering (needs Playwright/render.js). (2) Broken TLS chain — crawler must tolerate it. (3) Mixed land/flat/garaż stream + a parallel bezprzetargowo track — classify carefully. No rate-limit/auth/CAPTCHA seen.

**VERDICT: BUILD (Medium effort)** — genuine open municipal flat auctions from the Prezydent Miasta with a dedicated achieved-price results board, but delivered entirely through a FINN.pl eUrząd JS SPA (BIP iframe + city-site both JS-loaded), so it needs the render.js (chrzanow) analog plus born-digital-PDF extraction — a step above a plain bip.info.pl clone.
