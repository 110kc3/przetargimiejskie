// Olesno — gmina miejsko-wiejska, województwo opolskie, powiat oleski.
//
// Burmistrz Olesna (Urząd Miejski w Oleśnie, Wydział Gospodarki Nieruchomościami
// i Lokalami) sells municipal property — including lokale mieszkalne — via
// "przetarg ustny nieograniczony na sprzedaż". Announcements AND results are
// both published inline (server HTML) on bip.olesno.pl, which runs skyCMS v4
// (bip_v4 template) — same platform family as Przemyśl (this build's primary
// template/analog).
//
// Board architecture differs from Przemyśl though: instead of one "current
// announcements" host + one "results" host, Olesno runs PER-YEAR archive
// boards ("przetargi na sprzedaż nieruchomości <ROK>") that interleave
// ogłoszenia (announcements) and informacje o wyniku / protokoły (results) for
// ALL property types (flats + land, sale board only — lease is on separate
// "najem lokali" / "dzierżawa gruntów" per-year boards, out of scope). See
// crawl.js for the classification logic that splits one board into both
// streams.
//
// No auth, no bot block, no JS required (server-rendered HTML, confirmed via
// plain curl from this Pi's Polish residential IP).
//
// See spikes/opolskie/powiat-oleski/olesno.md for the full live-verification
// notes (VERDICT: BUILD, Low effort).
//
// NOTE: teryt is a best-effort estimate derived from the same-voivodeship
// siblings already in this repo (nysa=160601_1 → powiat nyski=1606; the seat
// town of a same-named powiat is conventionally gmina 01) — powiat oleski is
// therefore 1607, gmina Olesno (miejsko-wiejska, "miasto" part, matching the
// _4 suffix convention used by olkusz/chrzanow) → 160701_4.
// CONFIRM on first geoportal/ULDK run before trusting this for deep-links.

export const config = {
  id: 'olesno',
  teryt: '160701_4', // gmina miejsko-wiejska Olesno (powiat oleski) — confirm on first geoportal run
  label: 'Olesno',
  voivodeship: 'opolskie',
  authority: 'Urząd Miejski w Oleśnie',
  host: 'bip.olesno.pl',
  source: 'html',
};
