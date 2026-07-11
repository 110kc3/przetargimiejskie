# Spike — Głubczyce (Opolskie · powiat głubczycki)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Low effort). **Built + registered 2026-07-11** (14/14 parse test). Corrections: CMS is eSoteka/**FINN** (docs hung as attachments on boards /144+/145, not inline); primary format is legacy **.doc** via catdoc (spike said "text-PDF" — only half right; born-digital .pdf used for land). Analog kedzierzyn-kozle (structure) + finn-bip leaf helpers. teryt 160203_3 best-effort.

## TL;DR
Gmina Głubczyce regularly sells municipal flats (*lokale mieszkalne*) via **ustny przetarg nieograniczony na sprzedaż** on its own BIP. Both an announcement board and a results/achieved-price board are present and URL-stable. Announcements are HTML pages with PDF attachments (text PDF, not scanned). Volume is modest but consistent — roughly 3–6 flat auctions per year. Closest analog: a small-gmina BIP adapter with PDF detail fetch. No auth/bot blocks detected.

## 1. Sells municipal property at auction?

**YES — confirmed.** The Burmistrz Głubczyc issues oral unlimited auctions (*ustny przetarg nieograniczony*) for residential units (*lokale mieszkalne*) on a regular basis:

- Oct 2025: lokal nr 4, ul. Bolesława Chrobrego — I ustny przetarg nieograniczony, cena wywoławcza 86 838,50 zł
- Jan 2026: lokal nr 8, ul. Bolesława Chrobrego 10 — przetarg 17.02.2026
- Feb 2024: lokal nr 1, ul. Niepodległości 6a — przetarg 05.04.2024
- Apr 2024: lokal nr 5, ul. Jana Kochanowskiego 17 — przetarg 09.04.2024
- Historical: lokal nr 2, ul. Plebiscytowa 12 (13,96 m²) — IV ustny przetarg nieograniczony, 2018

Auctions use standard sequential numbering (I, II, III, IV…) indicating repeat auctions on failed first rounds — a reliable pattern. The municipality also uses *rokowania* (negotiations) after failed auctions, but the primary mechanism for flat sales is the open oral auction.

## 2. Where published? (hosts + boards, URLs)

| Board | URL |
|---|---|
| Announcement board (ogłoszenia) | https://bip.glubczyce.pl/144/ogloszenia-burmistrza-glubczyc-o-przetargach-i-rokowaniach-na-sprzedaz-nieruchomosci.html |
| Announcement board (2025 subpage) | https://bip.glubczyce.pl/144/12763/ogloszenia-burmistrza-glubczyc-o-przetargach-i-rokowaniach-na-sprzedaz-nieruchomosci.html |
| Results/achieved-price board | https://bip.glubczyce.pl/145/informacje-o-wynikach-przetargow-na-sprzedaz-i-oddanie-w-dzierzawenajem-nieruchomosci.html |
| Property disposal register | https://bip.glubczyce.pl/146/wykazy-nieruchomosci-przeznaczonych-do-zbycia.html |
| General przetargi hub | https://bip.glubczyce.pl/1649/przetargi.html |

BIP host: **bip.glubczyce.pl** (standard eSoteka/Finn CMS, common across Opolskie gminas). No separate portal or external aggregator needed — all data is on the gmina's own BIP. Annual subpages (e.g. `/przetargi-2025`) also exist and are linked from the hub.

## 3. Format + rendering

- **Index page:** standard BIP HTML table listing — title, date, link per announcement. Static HTML, no SPA, no auth, no JS rendering required.
- **Detail pages:** HTML subpages on the same BIP domain, each containing the full announcement text inline OR a link to a **PDF attachment** (text-PDF, not scanned — confirmed from `.doc`/`.pdf` attachment URLs in results, and the structured property descriptions visible in search snippets).
- **Results board:** HTML table with links to result notices — achieved price and winner description typically in a linked PDF or inline HTML.
- No bot blocks, no CAPTCHA, no login wall detected. Pages load as standard HTML.
- Pagination: BIP year-subpages (`/12763/`, `/12178/` etc.) — the scraper needs to follow year-subpage links or walk the hub index.

## 4. Volume + achieved-price stream

- **Announcement volume:** ~3–6 flat auctions/year (2024 had at least 2 confirmed, 2025–2026 at least 2 confirmed). Small gmina (~12k residents), so stock is limited but auctions are real and recurring.
- **Achieved-price board:** explicitly present at `/145/` — publishes results post-auction with achieved price. This is the key data stream for the aggregator.
- **Repeat auctions:** sequential numbering (I→IV observed) inflates raw count but indicates the gmina is persistent in selling stock rather than withdrawing to *bezprzetargowo* — good signal for an ongoing adapter.
- **Mixed content:** the board also includes land, commercial, and lease results — adapter must filter for *lokal mieszkalny* / *nieruchomość lokalowa* keywords.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Prudnik (also Opolskie, same eSoteka BIP CMS, same board structure) or Kędzierzyn-Koźle BIP. The BIP layout is essentially identical — standard list index + HTML/PDF detail.

**Effort: Low.**
- Scraper: walk `/144/` index HTML → filter rows by keyword (*lokal mieszkalny*) → fetch detail page or PDF → extract address, area, cena wywoławcza, przetarg date, round number.
- Results: walk `/145/` index → extract achieved price per lokal.
- No unusual blockers: no JS SPA, no auth, text PDFs parseable with pdfminer/pypdf.
- Only mild complexity: year-subpage navigation (BIP splits listings by year into child category IDs) — well-understood pattern from other eSoteka instances.

**VERDICT: BUILD** — flat auctions confirmed active, both boards present, format is clean HTML+text-PDF, volume modest but real, no technical blockers.
