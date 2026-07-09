# Spike — Węgrów (Mazowieckie · powiat węgrowski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low–Medium effort).

## TL;DR
Gmina Miejska Węgrów (Urząd Miejski, Burmistrz Miasta Węgrowa) sells municipal property — including **lokale mieszkalne** — via **przetarg ustny nieograniczony na sprzedaż nieruchomości** (open oral auction). Announcements, wykazy and results all sit on the city BIP `bip.wegrow.com.pl`, which runs the **Logonet eUrząd** hosted CMS (footer: "Wersja systemu: 2.9.0 · CMS i hosting: Logonet Sp. z o.o. w Bydgoszczy") — clean server-rendered HTML with `/artykul/<catid>/<id>/<slug>` article URLs. The property stream is a **dedicated board "Ogłoszenia sprzedaży" (category 345)** that mixes open flat auctions, open land auctions, tenant `bezprzetargowo` wykazy, and `informacja o wyniku przetargu` result notices in one place. Open flat auctions are confirmed and recurring but low-volume (a handful/yr); the achieved-price stream is present. Closest analog: any **Logonet eUrząd** city — `tarnowskie-gory` / `skarzysko-kamienna` / `kedzierzyn-kozle`. No technical blockers; only classification work (drop tenant/land where flats are the target).

## 1. Sells municipal property at auction?
**YES — confirmed, incl. open oral flat auctions.** The Burmistrz Miasta Węgrowa runs `ogłoszenie przetargu ustnego nieograniczonego na sprzedaż nieruchomości`. Confirmed on the "Ogłoszenia sprzedaży" board:
- **Lokal mieszkalny nr 19, ul. Nowa 3** — open `przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej lokal mieszkalny` (announcement `/artykul/345/12148`; result/`informacja o wyniku` `/artykul/345/12233`, 06.05.2026). This is a genuine OPEN oral flat auction, not a tenant sale.
- **Lokal mieszkalny, ul. Nowa 5 nr 19** — open auction (also mirrored on the city site aktualnosc-6279, 2023) — recurring vacant-flat auctions.
- **"Residential units for unlimited auction"** collective notice `/artykul/345/12091` (28.01.2026) + land equivalent `/artykul/345/12090`.
- **Land:** `nieruchomości gruntowe` open oral auctions, ul. Ks. K. Czarkowskiego (`/artykul/345/12186`; result `/artykul/345/12289`).

**Also present (out of scope) — tenant `bezprzetargowo` sales:** several `wykaz` notices for `sprzedaż lokalu na rzecz najemcy` (ul. Piłsudskiego 3, 9, 21 — units #9/#18/#19). These are `bezprzetargowo` designations, not auctions — classify + drop. So the board is mixed: open flat auctions + open land auctions + tenant wykazy + results.

**Housing manager:** No dedicated ZGM/TBS surfaced for this ~11k-pop town; property sales are handled directly by the Urząd Miejski (Referat Gospodarki Nieruchomościami), Rynek Mariacki 16 / 07-100 Węgrów, tel. 25 308 12 00.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Logonet eUrząd CMS):** `https://bip.wegrow.com.pl/`
- **Ogłoszenia sprzedaży (property board — the target):** `https://bip.wegrow.com.pl/artykuly/345/ogloszenia-sprzedazy` — open flat/land auctions, wykazy, AND `informacja o wyniku przetargu` all here.
- Article (notice) URL shape: `https://bip.wegrow.com.pl/artykul/345/<id>/<slug>` (e.g. `/artykul/345/12148`, `/artykul/345/12233`, `/artykul/345/12186`, `/artykul/345/12091`).
- Logonet JSON hook (typical for family): `https://bip.wegrow.com.pl/api/menu/345/articles` (paged article list — use for enumeration).
- **Zarządzenia** (wykazy nieruchomości are often issued as Zarządzenie Burmistrza): `https://bip.wegrow.com.pl/?app=zarzadzenia` / `/zarzadzenie/<id>/<slug>`.
- **Przetargi board `/przetargi/szukaj` (`/przetarg/<id>`) is ZAMÓWIENIA PUBLICZNE** (roboty/usługi/dostawy — construction, services, supplies) — **NOT property**. Do not point the adapter here.
- City site mirror (secondary): `https://www.wegrow.com.pl/` (`aktualnosc-<id>-...html`) — same notices, but BIP is authoritative.

**Do NOT confuse** with the *powiat* BIP `bip.powiatwegrowski.pl` (Starostwo — separate JST, out of scope) or `bip.wegorzewo.pl` (Węgorzewo, warmińsko-mazurskie — different town).

## 3. Format + rendering
- **Server-rendered HTML** — Logonet eUrząd 2.9.0. Article lists and individual notices are plain server HTML; notice bodies are **inline HTML text** (no PDF gate on the sampled notices). Confirmed live via fetch of the board + individual articles.
- **No SPA, no auth, no CAPTCHA** observed. Logonet's `/api/menu/<id>/articles` JSON endpoint gives clean paged enumeration (same as tarnowskie-gory adapter).
- Some longer notices/wykazy may carry **born-digital PDF attachments** (`/attachments/download/<id>`) — handle with `pdfText` if encountered (OCR unlikely on this CMS).

## 4. Volume + achieved-price stream
- **Volume:** Low. The "Ogłoszenia sprzedaży" board runs ~9–12 property articles/year total, of which open flat auctions are a modest slice (~2–4/yr, e.g. Nowa 3/Nowa 5 vacant flats), the rest being land auctions and tenant `bezprzetargowo` wykazy. Open oral auctions recur but are not high-frequency; expect occasional II/III przetarg on repeats.
- **Achieved-price stream:** **YES** — `informacja o wyniku przetargu` notices are published on the SAME board (e.g. Nowa 3 flat result `/artykul/345/12233`; Czarkowskiego land result `/artykul/345/12289`). Announcement carries `cena wywoławcza` + `wadium` + date/round; result notice carries the hammer price / nabywca (or wynik negatywny). Both parseable from server HTML.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **Logonet eUrząd** family — clone **`tarnowskie-gory`** (or `skarzysko-kamienna` / `kedzierzyn-kozle`). Identical CMS: `/artykuly/<catid>/<slug>` boards, `/artykul/<catid>/<id>/<slug>` docs, `/api/menu/<catid>/articles` JSON, "Wersja systemu" Logonet footer.
- **CMS family:** Logonet eUrząd (ADAPTER-GUIDE §3, row 1) — server-rendered HTML; inline article bodies, occasional born-digital PDF attachments.
- **Effort:** **LOW–MEDIUM.** Enumerate category 345 (announcements board) via `/api/menu/345/articles` → fetch each `/artykul/345/<id>` → regex/DOM parse (address via parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round). Second pass over the same board for `informacja o wyniku` → cena osiągnięta. **Classification is the main work:** the board mixes open auctions (in scope), land (in scope for the wider dataset), and tenant `bezprzetargowo` wykazy (drop). Do NOT crawl `/przetargi/` (that's procurement).
- **Blockers:** None. No rate-limit/auth/CAPTCHA signals. Watch-items: (1) single mixed board — must classify auction vs wykaz-na-rzecz-najemcy vs land; (2) wykazy sometimes issued as `Zarządzenie` — optionally cross-check the zarządzenia stream; (3) low absolute flat volume.

**VERDICT: BUILD (Low–Medium effort)** — confirmed recurring open oral municipal flat auctions with an in-band `informacja o wyniku` result stream on a clean Logonet eUrząd server-HTML BIP; standard Logonet analog (tarnowskie-gory), no technical blockers, only mixed-board classification.
