// Kielce — municipal property sales run by Wydział Gospodarki Nieruchomościami,
// Urząd Miasta Kielce. Published on bipum.kielce.eu (SmartSite CMS, post-2022).
//
// Board: https://bipum.kielce.eu/urzad-miasta-kielce/ogloszenia-obwieszczenia/
//         nieruchomosci/przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci/
// Pagination: ?page=N (10 items/page, currently 8 pages).
// Format: server-rendered HTML — no JS wall; title carries all announcement data.
// Results: DOCX attachments at /resource/<id>/<filename>.docx (or PDF).
// Authority: Dyrektor Barbara Zawadzka, Wydział Gospodarki Nieruchomościami.
// Closest analog: Bytom (SmartSite + DOCX result pattern).
//
// Pre-2022 history lives at http://www.bip.kielce.eu/ (old Liferay instance)
// and is out of scope for v1.

export const config = {
  id: 'kielce',
  // TERYT for Kielce grodzki powiat (miasto na prawach powiatu).
  // Provisional — confirm against ULDK/GUS on first geoportal run.
  teryt: '266101_1',
  label: 'Kielce',
  voivodeship: 'swietokrzyskie',
  authority: 'Urząd Miasta Kielce',
  host: 'bipum.kielce.eu',
  source: 'html',
};
