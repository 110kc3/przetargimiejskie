// Świętochłowice — municipal flat *sales* are run by Prezydent Miasta and
// published on the city BIP (www.bip.swietochlowice.pl); the housing manager
// MPGL Świętochłowice handles management/rentals, not sales. See SPIKE-WAVE2.md
// "Świętochłowice — bip.swietochlowice.pl + MPGL".
//
// Platform note: UNLIKE the FINN-BIP cities (Mysłowice), Świętochłowice's BIP is
// a Liferay portal. There is a flats-only category page "Przetargi na lokale
// mieszkalne" (`/bipkod/29287911`) that server-renders each announcement as a
// title + a downloadable Word attachment. The announcement body (price, usable
// area, auction date) is a legacy **.doc** attachment under `/res/serwisy/pliki/
// <id>` — extracted with catdoc via core/doc-text.js, exactly like Bytom/Zabrze
// (a separate .docx "KW" land-registry annex is ignored). The announcement TITLE
// carries the address ("przy ul. … <bldg>/<apt>") and the round ("I/II/III
// przetarg"), so a listing is still produced even if the .doc can't be parsed.
//
// The crawl/parse logic lives in crawl.js + parse.js (which reuse the shared
// finn-bip parsers — the Polish auction vocabulary is identical). Active-listings
// adapter: build-properties classifies past-dated announcements `archived`. No
// sold-price stream wired (the archive's "Informacja o wyniku" result notices are
// a future enhancement). VERIFIED LIVE (June 2026, rendered-DOM spike).

const ORIGIN = 'https://www.bip.swietochlowice.pl';

export const config = {
  id: 'swietochlowice',
  label: 'Świętochłowice',
  authority: 'Urząd Miejski w Świętochłowicach',
  host: 'bip.swietochlowice.pl',
  source: 'html',
  bip: {
    origin: ORIGIN,
    // Flats-only auction category. `?showArchive=true&start=<page>` (0-based)
    // pages the retained archive; the live view (no query) is the current set.
    listPath: '/bipkod/29287911',
    maxArchivePages: 45, // safety cap; crawl stops early on 3 empty pages
  },
};
