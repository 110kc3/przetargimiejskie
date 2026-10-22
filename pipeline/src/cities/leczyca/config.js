// Łęczyca (Łódzkie, powiat łęczycki) — municipal property auctions run by
// Burmistrz Miasta Łęczyca (Referat Gospodarki Nieruchomościami).
//
// Platform: WordPress 6.5.8 REST API on leczyca.info.pl.
// The WP REST endpoint `/wp-json/wp/v2/posts` provides full-text HTML bodies
// with property auction notices (residential flats, commercial units, built
// properties, land plots).
//
// Authoritative BIP bip.leczyca.info.pl is Nefeni BIPv2 (Next.js SSR) with scanned
// PDF attachments; the news site posts full inline announcements.

export const config = {
  id: 'leczyca',
  // TERYT for gmina miejska Łęczyca (powiat łęczycki, łódzkie).
  // Code 1004011 — confirm on first geoportal run.
  teryt: '1004011',
  label: 'Łęczyca',
  voivodeship: 'lodzkie',
  authority: 'Burmistrz Miasta Łęczyca',
  host: 'leczyca.info.pl',
  source: 'html',
};
