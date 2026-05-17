# OCR spike — findings

## TL;DR

**Local `tesseract -l pol` is sufficient.** Cloud OCR is not needed. The result PDFs have no table layout — every entry is a free-text paragraph in extremely consistent phrasing, so a small regex parser will get us the rest of the way. Recommend proceeding with Option A (Node.js scraper + report) from the plan, no architectural changes.

## What I tried

3 result PDFs spanning the full date range:

- **OLD** — `12.02.2024-r.-wyniki-przetargow.pdf` (oldest available)
- **MID** — `16.06.2025-wyniki-przetargow.pdf` (mid-range)
- **NEW** — `27.04.2026-r.-wyniki-przetargow.pdf` (most recent)

Pipeline used:

```
pdftoppm -r 300 input.pdf out -png       # 300 DPI rasterize
tesseract out-1.png out-1 -l pol --psm 3 # default page segmentation
```

All 6 page outputs saved under [`spike/ocr_samples/`](computer://C:\Users\K\repos\zgm-gliwice/spike/ocr_samples/) so we can reference them when writing the parser.

## What the PDFs actually contain

Each result PDF is consistently structured as **two sections on two pages**:

### Page 1 — "INFORMACJA O WYNIKU POSTĘPOWANIA" (auctions that ran)

One paragraph per property, very consistent template:

> w dniu **27.04.2026 r.** odbył się **III ustny przetarg** nieograniczony na sprzedaż lokalu **mieszkalnego** położonego w Gliwicach przy **ul. Harcerskiej 13/3** wraz ze sprzedażą udziału w działce nr 187 o powierzchni wynoszącej 825 m², obręb Szobiszowice. Komisja przetargowa dopuściła do uczestnictwa w przetargu **1 oferenta**.
> - Cena wywoławcza nieruchomości wynosiła **253.620,00 zł**
> - Cena nieruchomości osiągnięta w przetargu wyniosła **256.160,00 zł**
> Przetarg wygrał Pan Piotr Dyk.

Fields we can extract per paragraph:
- **auction round** — roman numeral I/II/III/IV before "ustny przetarg" (≥II is the strong signal: this property was previously unsold)
- **property type** — `mieszkalnego` / `użytkowego` / garaż
- **address** — `przy ul. <STREET> <NUM>/<APT>` (or `<NUM>` only for garages)
- **starting price** — after "Cena wywoławcza ... wynosiła"
- **final price** — after "Cena ... osiągnięta w przetargu wyniosła"
- **winner** — last sentence ("Przetarg wygrał/wygrała ...")

### Page 2 — "INFORMACJA O WYNIKACH POSTĘPOWAŃ DOTYCZĄCYCH" (auctions that did NOT run)

Header always: `WYZNACZONYCH NA DZIEŃ <DD.MM.YYYY> r.` — gives us the auction date.

Each unsold property is a short block:

> **ul. Zwycięstwa 29/6** - sprzedaż **lokalu mieszkalnego** wraz ze sprzedażą ułamkowej części gruntu (działka nr 121 o powierzchni 530 m², obręb Stare Miasto, KW GL1G/00032683/1).
> Cena wywoławcza nieruchomości wynosiła **358.100,00 zł**

Then a trailing paragraph explaining *why* nothing happened. Three sub-reasons seen across the samples:

| Phrase in PDF | Meaning |
|---|---|
| `nie odnotowano wpłaty wadiów` / `wadium` | nobody put down a deposit — most common case |
| `Oferent odstąpił od licytacji` | one bidder registered but withdrew before bidding |
| `Oferent nie stawił się na licytacji` | one bidder registered but didn't show up |

The trailing reason paragraph can apply to one property OR be a single summary covering several preceding properties — the NEW PDF has an example where three properties share one closing "nie odnotowano wpłaty wadiów" line. The parser will need to bucket items until the next reason-sentence and apply it backwards.

## OCR quality assessment

Quality is **better than expected**. Polish diacritics — ąćęłńóśźż — come through cleanly across all three PDFs. Street names like `Pszczyńskiej`, `Łąki Kłodnickie`, `Białej Bramy`, `Zwycięstwa`, `Plebiscytowa` all parse perfectly. Numbers, units (m²/m³), prices, and the slash-separated address format all survive.

The errors that *do* occur are concentrated in two harmless regions and one annoying one:

**Harmless — header dates** (we get the date from the URL filename, not the OCR header):
> `Gliwice, dnia .....4.....7......` (NEW)
> `Gliwice, dnia.?Ś?.'.Qć'..2025 r.` (MID)

**Harmless — signature blocks at end** ("Mirostaw/Szajc", "Iwoha Nowoczek", "Zas,txę?›a/Dyre ora"). We don't need them.

**Annoying — slashes inside addresses occasionally read as letters**:
- `Skowrońskiego 18/1I` should be `Skowrońskiego 18/1` or `18/11` (the `/1` became `1I` — letter capital-I)
- One price had a colon: `105:400,00 zł` should be `105.400,00 zł`

Mitigations are easy and local:
- Address regex: after `ul. <street> <num>` accept either `/` or `1?[Il]` and a final apt-number lookup against the active-listings table for confirmation when ambiguous.
- Price regex: replace `[:;]` with `.` inside the matched number, then standard `D.DDD,DD` parse.

I didn't see any wholesale-garbled paragraphs. No need to bump DPI above 300 or to try `--psm 6/11`.

## Why a regex parser is enough (no LLM step needed)

Because each section uses **fixed Polish boilerplate** as anchors:
- `w dniu <DATE> r. odbył się <ROMAN> ustny przetarg nieograniczony na sprzedaż lokalu <TYPE> położonego w Gliwicach przy ul. <ADDR>`
- `Cena wywoławcza nieruchomości wynosiła <PRICE> zł`
- `Cena nieruchomości osiągnięta w przetargu wyniosła <PRICE> zł`
- `<ADDR> - sprzedaż <TYPE> wraz ze sprzedażą ułamkowej części gruntu`

Six regexes plus a section splitter (`/INFORMACJA O WYNIK\w+ POST/`) will cover everything we saw. If we ever hit a weird PDF, we can selectively fall back to asking the model — but I don't think we need to plan for that yet.

## Practical implications for the build

1. **No cloud OCR** — saves the API key, the egress, and the per-page cost. Local tesseract is fine.
2. **Cache aggressively** — each PDF is content-addressed by its URL/filename and never changes. Persist `<url-hash>.txt` once and re-use forever.
3. **Confirm garage addresses separately** — they look like `ul. Kurpiowska 16 - sprzedaż garażu nr 1`. The "apt" slot is `garaż nr 1` rather than `/<apt>`. Probably want a `kind = garage` flag with its own matching key.
4. **The "auction round" Roman numeral (I/II/III/IV) is a free upgrade.** A property that sold on its 4th attempt was already signalling low interest in its 1st/2nd/3rd appearances even before we cross-reference. We should store this and use it directly in the report ("sold on IV attempt at -8% vs starting price").
5. **Reasons-for-unsold are worth keeping as a typed enum**, not just a boolean. "Bidder registered but withdrew" is a different signal than "nobody even put down a deposit".

## Green light

I'm happy to move to building the scraper + parser + report whenever you say. The only thing I'd want to do before writing code is decide one small thing: whether to keep the OCR output text alongside the parsed JSON for debugging (recommended — costs basically nothing and saves us hours when a parse looks wrong).

Sample OCR outputs to inspect:

- [`spike/ocr_samples/old_p-1.txt`](computer://C:\Users\K\repos\zgm-gliwice/spike/ocr_samples/old_p-1.txt) — 2024 sold section
- [`spike/ocr_samples/old_p-2.txt`](computer://C:\Users\K\repos\zgm-gliwice/spike/ocr_samples/old_p-2.txt) — 2024 unsold section (single bidder no-deposit case)
- [`spike/ocr_samples/mid_p-1.txt`](computer://C:\Users\K\repos\zgm-gliwice/spike/ocr_samples/mid_p-1.txt) — 2025 sold section
- [`spike/ocr_samples/mid_p-2.txt`](computer://C:\Users\K\repos\zgm-gliwice/spike/ocr_samples/mid_p-2.txt) — 2025 unsold section (garage + grouped reason example)
- [`spike/ocr_samples/new_p-1.txt`](computer://C:\Users\K\repos\zgm-gliwice/spike/ocr_samples/new_p-1.txt) — 2026 sold section
- [`spike/ocr_samples/new_p-2.txt`](computer://C:\Users\K\repos\zgm-gliwice/spike/ocr_samples/new_p-2.txt) — 2026 unsold section (all three sub-reasons present)
