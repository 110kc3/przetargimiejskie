// Wodzisław Śląski (województwo śląskie, powiat wodzisławski).
// Prezydent Miasta Wodzisławia Śląskiego announces municipal property auctions
// ("ustny przetarg nieograniczony") for flats, houses, commercial units, and land.
// Housing is managed in-house by the Biuro Gospodarki Lokalowej.
//
// Notices and results are hosted via FINN.pl eUrząd (eurzad.finn.pl/gmwodzislawsl),
// embedded as an iframe on bip.wodzislaw-slaski.pl.
// The adapter queries the FINN eUrząd JSON-RPC service directly
// (/rpc/routeRejestryServiceManager*) to enumerate registers:
//   - IAG-Opost: Ogłoszenia o przetargach (announcements)
//   - NWP: Informacje o wynikach przetargów na zbycie nieruchomości (results)
//   - IAG-Wsprz: Wykaz nieruchomości przeznaczonych do sprzedaży (wykaz)
//
// Document texts are extracted from born-digital PDF attachments via pdfText.
// source: 'html' indicates the crawler fetches attachments and provides
// .text directly on result refs.

export const config = {
  id: 'wodzislaw-slaski',
  teryt: '241504_1',
  label: 'Wodzisław Śląski',
  voivodeship: 'slaskie',
  authority: 'Prezydent Miasta Wodzisławia Śląskiego',
  host: 'bip.wodzislaw-slaski.pl',
  source: 'html',
};
