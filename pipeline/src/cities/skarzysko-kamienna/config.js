// Skarżysko-Kamienna (województwo świętokrzyskie, powiat skarżyski) — the
// Gmina (Urząd Miasta, Wydział Gospodarki Nieruchomościami) auctions municipal
// flats and publishes both announcements and result notices (achieved price or
// negative outcome) on its BIP at bip.skarzysko.pl. See
// spikes/swietokrzyskie/powiat-skarzyski/skarzysko-kamienna.md.
//
// Shape (closest analog: Kędzierzyn-Koźle / Tarnowskie Góry — SAME CMS VENDOR,
// Logonet eUrząd v2.9.0): server-rendered HTML, no SPA, no OCR, no auth.
// Every auction record is a self-contained HTML page with:
//   - a structured detail table (<table class="table table-borderless">): Adres
//     nieruchomości, Przetarg na, Typ przetargu, Rodzaj nieruchomości, Cena
//     wywoławcza, Data przetargu
//   - a plain-text body (<p style="text-align: justify;"> inside the first
//     <div class="author" id="content_legal_autor">) containing the full notice
//
// Both announcements and result notices appear on the SAME paginated listing:
//   LIST:   https://bip.skarzysko.pl/przetargi-nieruchomosci/{page}/10
//   RECORD: https://bip.skarzysko.pl/przetarg-nieruchomosci/{id}/{slug}
//   XML:    https://bip.skarzysko.pl/przetargi-nieruchomosci/xml/{page}/1
//     (100 records/page; 3 pages total as of 2026-06-29)
//
// Result notices carry "Informacja o wyniku" in title/slug. Achieved price or
// negative outcome is in the body text (plain HTML, never a PDF/scan).
// Phrasing:
//   sold:   "Najwyższa cena jak została osiągnięta w przetargu wyniosła 31.920,00 zł."
//   unsold: "Na przedmiotowy lokal nie zostało wpłacone wadium … przetarg zakończył
//            się wynikiem negatywnym."  OR  "W związku z brakiem oferentów …"
//
// Volume: ~2–4 residential flats/year; total ~240 records across all types
// (2017–2026); lokal mieszkalny = minority.
//
// `source: 'html'` — the adapter fetches and parses HTML pages directly;
// crawlResultDocs() returns refs that already carry `.text` (so the refresh
// loop's OCR/pdf-text dispatch is bypassed, exactly like Kędzierzyn-Koźle).

export const config = {
  id: 'skarzysko-kamienna',
  teryt: '126201_1', // gmina miejska Skarżysko-Kamienna (powiat skarżyski 1262,
  //                    gmina-type 1) — confirm on first geoportal run.
  label: 'Skarżysko-Kamienna',
  voivodeship: 'swietokrzyskie',
  authority: 'Gmina Skarżysko-Kamienna',
  host: 'bip.skarzysko.pl',
  source: 'html',
};
