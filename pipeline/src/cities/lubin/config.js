// Lubin — Dolnośląskie, powiat lubiński (a land powiat; Lubin is its seat).
// Municipal flat/land sales are run directly by the Prezydent Miasta Lubina
// (Wydział Gospodarki Gruntami, Urząd Miejski w Lubinie) — there is no
// separate housing-manager intermediary. ("MPGM TBS" turning up in searches
// is an unrelated Ruda Śląska entity — ignore it.) Announcements and result
// notices are published solely on the city BIP (bip.um.lubin.pl) as PDF
// attachments. See spikes/dolnoslaskie/powiat-lubinski/lubin.md — VERDICT:
// BUILD (2026-06-27).
//
// CMS: Logonet eUrząd v5.7.0 (footer "Wersja systemu: 5.7.0", page author meta
// "Logonet Sp. z o.o. w Bydgoszczy") — same VENDOR as jelenia-gora, but a much
// newer install with a DIFFERENT url shape: flat slugs (/artykul/<slug>,
// /artykuly/<board-slug>) instead of jelenia-gora's board-id/article-id path
// segments. jelenia-gora's XML-feed enumeration shortcut
// (/artykuly/xml/<board>/1/1) 404s here (live-verified 2026-07-18) — this
// install's boards are ordinary server-rendered HTML with <article> list
// items + ?page=N pagination, closer to a bytom-style HTML board. See
// crawl.js for the board URLs and the live findings.

export const config = {
  id: 'lubin',
  // gmina miejska Lubin, powiat lubiński (dolnośląskie) — best-effort digit
  // guess (woj 02, powiat lubiński, gmina serial 01 as the powiat seat,
  // rodzaj 1 = miejska); NOT verified against GUS TERYT — confirm on first
  // geoportal/ULDK run (see wolow/lwowek-slaski/zlotoryja for the same
  // "best-effort, confirm on first geoportal run" convention).
  teryt: '021101_1',
  label: 'Lubin',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Lubina',
  host: 'bip.um.lubin.pl',
  source: 'html',
};
