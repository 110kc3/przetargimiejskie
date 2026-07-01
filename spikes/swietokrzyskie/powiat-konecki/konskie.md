# Spike — Końskie (Świętokrzyskie · powiat konecki)
> **Status:** spike DESK — 2026-06-30. VERDICT: NEEDS-LIVE-VERIFY (Medium effort).

## TL;DR
Gmina Końskie does sell *lokale mieszkalne* at *ustny przetarg nieograniczony* — confirmed via multiple 2025–2026 announcement slugs on umkonskie.pl and BIP hits. Announcements are PDF attachments on a simple HTML BIP board. Achieved-price results appear to be posted in the same BIP section (5027) but were not directly fetched. Volume is low (single-digit active units, often requiring 2nd/3rd repeat auctions). One atypical cooperative-share auction noted. Effort is Medium: PDF parsing required; achieved-price posting pattern needs live verification.

## 1. Sells municipal property at auction?
**YES** — confirmed flat auctions at *ustny przetarg nieograniczony*:
- Feb 2026: "drugi przetarg ustny nieograniczony na zbycie nieruchomości lokalowej – Końskie ul. Warsztatowa 2B" (lokale mieszkalne, 53 m², cena wywoławcza ~85 000 PLN; "drugi" implies a prior 1st auction that failed)
- May 2026: "pierwszy przetarg ustny nieograniczony na sprzedaż udziału w spółdzielczym własnościowym prawie do lokalu mieszkalnego" (cooperative-share flat — atypical form)
- Earlier BIP hits reference "wyniki przetargu — lokal mieszkalny ul. Piłsudskiego 44H" and "lokal mieszkalny ul. Warsztatowa 2B" (3rd auction round), confirming achieved-price results are published
- *Bezprzetargowa* sales to tenants also occur (PGM Końskie manages communal stock) but do NOT replace the open-auction stream

## 2. Where published? (hosts + boards, URLs)
| Board | URL | Notes |
|---|---|---|
| BIP nieruchomości (announcement + results) | `https://bip.umkonskie.pl/wiadomosci/5027/` | Primary; paginated list `/lista/1/nieruchomosci`, `/lista/2/…` etc. |
| Main city site notices | `https://umkonskie.pl/category/ogloszenia-o-nieruchomosciach/` | Mirror/subset of BIP; single-page category listing |
| BIP archive alt path | `https://bip.umkonskie.pl/struktura/1/1198/dokumenty/5027/lista/19/nieruchomosci` | Same content, alternative nav path |
| Old BIP mirror | `http://umkonskie.bipgmina.pl/wiadomosci/5027/lista/1/nieruchomosci` | Appears to redirect to current BIP |

No dedicated "wyniki nieruchomości" subsection found — achieved-price results appear to be posted as separate entries within section 5027 (same board as announcements). Needs live verification.

## 3. Format + rendering
- **Listing page**: HTML (standard BIP PHP/ASP board), machine-readable, no auth/bot block observed
- **Announcement body**: PDF attachment (e.g. `ogloszenie_gn_6840_20_2025_ig_20260220.pdf`, `ogloszenie udzial lokal mieszka i 20260511.pdf`) — filenames suggest scanned or text-PDF; likely text-PDF given modern BIP generation, but **needs live verification via pdfplumber/OCR probe**
- **Results/achieved price**: PDF attachments (same pattern) posted in section 5027; exact field names (cena wywoławcza, cena osiągnięta, nabywca) not confirmed from page text
- No SPA, no auth wall, no Cloudflare observed on BIP

## 4. Volume + achieved-price stream
- **Volume**: LOW — estimated 2–5 flat auctions per year based on evidence (Warsztatowa 2B went through ≥2 rounds; Piłsudskiego 44H confirmed as separate; cooperative-share auction is a 3rd active item in 2025–2026). Gmina Końskie is a town of ~19 000 residents; communal housing stock is modest.
- **Achieved-price stream**: Results do appear in section 5027 (BIP search snippet references "wyniki przetargu – lokal mieszkalny Piłsudskiego 44H"), but it is **UNCONFIRMED** whether achieved price (cena osiągnięta) is stated in the HTML entry or only inside the PDF. This is the primary blocker for the aggregator.
- **PGM Końskie** (`pgmkonskie.pl/przetargi/`) manages communal stock; their przetargi page may also carry separate flat-sale notices — needs one fetch to rule in/out.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog**: Similar small-BIP + PDF pattern as other Świętokrzyskie gminy (e.g. Skarżysko-Kamienna, Ostrowiec Świętokrzyski wave results).

**Blockers requiring live verification:**
1. Confirm achieved-price field is parseable from PDF (text-PDF vs. scanned-PDF — OCR cost differs)
2. Confirm results are posted in section 5027 as separate titled entries (not buried inside announcement PDF only)
3. Check PGM Końskie przetargi page for any parallel flat-sale stream
4. Confirm pagination depth of section 5027 (how many pages back do results go — volume estimate)

**Effort**: Medium
- BIP HTML listing: straightforward scrape (~1 day)
- PDF parse: text-PDF → pdfplumber (½ day); scanned → Tesseract (+1 day)
- Results detection: needs heuristic to separate "ogłoszenie" vs. "wynik/informacja" entries in same board
- Total estimate: 2–3 days if text-PDF; 4–5 days if scanned

**VERDICT: NEEDS-LIVE-VERIFY** — flat auctions confirmed, but achieved-price parsability and result-post pattern unconfirmed. One focused live session (fetch 2–3 PDF announcements + 1–2 result PDFs) will resolve to BUILD or NO-BUILD.
