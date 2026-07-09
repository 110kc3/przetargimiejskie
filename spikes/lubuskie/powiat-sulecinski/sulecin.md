# Spike — Sulęcin (Lubuskie · powiat sulęciński)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Sulęcin (miejsko-wiejska, seat = town Sulęcin, ~16k gmina / ~10k town) sells municipal property — including **lokale mieszkalne** — via *przetarg ustny nieograniczony na sprzedaż*. Announcements live on the city BIP `bip.sulecin.pl`, which runs **SYSTEMDOBIP.PL** (E-LINE SYSTEMY INTERNETOWE) — the **same CMS family as the already-BUILT lubuskie adapter `gorzow-wielkopolski`** (numeric-id path segments `/<board>/<id>/<slug>/`, HTML stub pages with **born-digital PDF attachments**). Confirmed flat auctions: Żubrowo (Feb 2025), Rychlik 16B (I i II przetarg, 2025), plus a 2026-06-17 designation of a lokal mieszkalny to auction. Volume is **very low** (a handful of property auctions/yr; flats sporadic and often repeat rounds; some years land-only). **No dedicated wyniki / achieved-price board found** — the main caveat. Closest analog: clone `gorzow-wielkopolski` (same e-line CMS, PDF-attachment pattern), retarget boards. No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** Burmistrz Sulęcina runs *przetarg ustny nieograniczony na sprzedaż nieruchomości*. The "Sprzedaż i dzierżawa" → "Sprzedaż nieruchomości" section carries year boards; the 2025 board lists (live-fetched) flat auctions among land:
- **Rychlik 16B** — I przetarg ustny nieograniczony na sprzedaż *lokalu mieszkalnego*; later **II przetarg** (repeat round when unsold).
- **Żubrowo** — I przetarg ustny nieograniczony na sprzedaż *lokalu mieszkalnego* (Ogłoszenie "Żubrów 23.1 Luty 2025", PDF 1.39 MB, published 2025-02-04).
- **2026-06-17** — ogłoszenie przeznaczające *lokal mieszkalny* Gminy Sulęcin do sprzedaży w drodze przetargu ustnego nieograniczonego (per BIP + `sulecin.pl` news mirror).

The stream is genuine but sporadic and mixed with land — the **2024 board is land-only** (4 land auctions, no flats). Flats reaching open auction are difficult/vacant stock in outlying localities (Rychlik, Żubrowo are villages in the gmina), consistent with standard flats going *bezprzetargowo na rzecz najemcy*. Both natural/legal persons bid.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (SYSTEMDOBIP.PL / e-line):**
- Sprzedaż i dzierżawa (parent): `https://bip.sulecin.pl/79/SPRZEDAZ_I_DZIERZAWA/`
- Sprzedaż nieruchomości (parent): `https://bip.sulecin.pl/80/Sprzedaz_nieruchomosci/`
- Year boards (announcements):
  - 2025: `https://bip.sulecin.pl/481/Sprzedaz_nieruchomosci_2025/`
  - 2024: `https://bip.sulecin.pl/461/Sprzedaz_nieruchomosci_2024/`
  - 2021: `https://bip.sulecin.pl/379/Sprzedaz_nieruchomosci_2021/` (archives exist per year)
- Sprzedaż mienia: `https://bip.sulecin.pl/348/Sprzedaz_mienia/`
- Individual entry pattern: `https://bip.sulecin.pl/<boardId>/<entryId>/<Title_slug>/` (e.g. under board 481) → HTML stub + PDF attachment link.
- Zamówienia publiczne (procurement, out of scope): `https://bip.sulecin.pl/zamowienia_publiczne/...`

Town news mirror (non-authoritative, re-posts notices): `https://sulecin.pl/wiadomosci/<id>/...`.

**Do NOT confuse** with `bip.powiatsulecinski.pl` (Starostwo Powiatowe — county, separate JST, out of scope). Target is Gmina Sulęcin (`bip.sulecin.pl`).

**Achieved-price / wyniki:** no dedicated "Informacja o wyniku przetargu" board or entries surfaced on the 2024/2025 year boards or via search — see §4. Treat as absent/thin until proven otherwise on a build run.

## 3. Format + rendering
- **Server-rendered HTML stubs + born-digital PDF attachments.** SYSTEMDOBIP.PL CMS: year board is a plain HTML "Lista informacji"; each entry is an HTML page whose body is minimal and the full ogłoszenie (address, powierzchnia, cena wywoławcza, wadium, date) lives in a **PDF attachment** (e.g. "Ogłoszenie o przetargu Żubrów 23.1 Luty 2025 [1.39 MB]"). Handle with `pdfText` (pdftotext); OCR unlikely (born-digital, like gorzow).
- **No SPA, no auth, no CAPTCHA** observed. WebFetch reached all boards cleanly (HTTPS).
- Numeric-id path shape (`/79/`, `/80/`, `/481/`) matches the e-line family — same skeleton as `bip.um.gorzow.pl` (`/150/`, `/509/`, `/system/obj/NNNN_*.pdf`), the built lubuskie analog.

## 4. Volume + achieved-price stream
- **Volume:** **Very low.** A handful of property auctions per year across the mixed board; flats are sporadic — 2025 had ~2 flat lots (Rychlik, Żubrowo), several as II przetarg (repeat when unsold); 2024 land-only. Expect ~1–3 flat auctions/yr, tiny gmina.
- **Housing manager:** no dedicated ZGM/ZBM publishing separate flat-sale przetargi; all sales run through the Urząd (Referat Gospodarki Nieruchomościami) on the city BIP.
- **Achieved-price stream:** **NOT CONFIRMED.** No "Informacja o wyniku przetargu / cena osiągnięta" entries found on the 2024/2025 year boards or via targeted search. Announcements carry `cena wywoławcza` (in-PDF); the hammer price / result notice appears **not to be published** here (or is buried in an archive). This is the main value caveat — likely an announcements-only stream.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **`gorzow-wielkopolski`** (already BUILT, same lubuskie, same e-line SYSTEMDOBIP.PL CMS family: numeric-id boards + HTML stub + born-digital PDF attachments). Clone it and retarget the boards to `bip.sulecin.pl/481,461,…` — minimal delta.
- **CMS family:** SYSTEMDOBIP.PL (E-LINE) — ADAPTER-GUIDE §3 "WordPress/custom HTML" / server-rendered HTML-stub-plus-PDF family.
- **Effort:** **LOW.** Poll year boards → follow entry stub → `pdfText` the attached ogłoszenie PDF → regex/table parse (parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round). Filter land/dzierżawa. Reuse gorzow's PDF-table extractor. Backfill by walking year boards (2021→2026), bounded.
- **Blockers:** None hard. Watch-items: (1) **no confirmed achieved-price stream** — this build captures announcements + cena wywoławcza but likely no cena osiągnięta (low dataset value; land also in-scope); (2) very low flat volume — low priority; (3) mixed land/flat stream needs classification.

**VERDICT: BUILD (Low effort)** — confirmed recurring (if sporadic) municipal flat auctions on `bip.sulecin.pl`, running the same SYSTEMDOBIP.PL/e-line CMS as the already-shipped `gorzow-wielkopolski` adapter, so cloning cost is minimal. Caveat: tiny flat volume and no confirmed wyniki/achieved-price board — treat as a low-priority coverage build (announcements + cena wywoławcza), fold in when clearing the lubuskie e-line cluster.
