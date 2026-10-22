// Wałcz (województwo zachodniopomorskie, powiat wałecki) —
// Gmina Miejska Wałcz (Urząd Miasta Wałcz, Wydział Gospodarki Nieruchomościami).
// Sells municipal property — including residential flats (lokale mieszkalne) —
// via oral open auctions ("ustny przetarg nieograniczony na sprzedaż").
// See spikes/zachodniopomorskie/powiat-walecki/walcz.md — VERDICT: BUILD.
//
// PLATFORM:
//   Joomla! (GovArticle BIP template) on bip.walcz.pl. Server-rendered HTML.
//   Announcement board:
//     https://bip.walcz.pl/nieruchomosci/przetargi-na-sprzedaz-dzierzawe-nieruchomosci/przetargi-aktualne
//   Results board:
//     https://bip.walcz.pl/nieruchomosci/przetargi-na-sprzedaz-dzierzawe-nieruchomosci/przetargi-zakonczone
//   Wykaz board:
//     https://bip.walcz.pl/nieruchomosci/wykaz-nieruchomosci-przeznaczonych-do-sprzedazy
//
// DISAMBIGUATION:
//   Do NOT confuse with rural Gmina Wałcz (bip.gminawalcz.pl, TERYT 3217052),
//   which is a separate rural JST. Target is the town Gmina Miejska Wałcz.
//
// TLS:
//   bip.walcz.pl omits its intermediate CA on the wire; an intermediate cert
//   (certum-dv-tls-g2-r39-ca.pem) is configured in pipeline/src/core/source-tls.js.
//   All HTTP fetches pass `insecureTLS: true` with a browser User-Agent.
//
// SOURCE:
//   `source: 'html'` — crawlResultDocs() directly resolves and extracts
//   attachment/notice text (pdfText with source-tls options), passing it to
//   parseResultDoc via ref.text.

export const config = {
  id: 'walcz',
  teryt: '3217011',
  label: 'Wałcz',
  voivodeship: 'zachodniopomorskie',
  authority: 'Burmistrz Miasta Wałcz',
  host: 'bip.walcz.pl',
  source: 'html',
};
