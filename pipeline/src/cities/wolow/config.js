// Wołów — gmina miejsko-wiejska, województwo dolnośląskie, powiat wołowski.
//
// Burmistrz Gminy Wołów (Urząd Miejski w Wołowie, Wydział Geodezji i Gospodarki
// Nieruchomościami) sells municipal property — flats, houses and land — via
// "ustny przetarg nieograniczony na sprzedaż". The authoritative machine-
// readable surface is the CITY PORTAL `wolow.pl`, which runs **SkyCMS**
// (netkoncept.com): clean server-rendered HTML, numeric article ids
// (`/idart/[idcat/]slug.html`), fields (cena wywoławcza / wadium / area /
// round) rendered as static prose inside a `sub-page__content` div.
//
// A parallel BIP mirror at `bip.wolow.pl` (m,105,ogloszenia-o-przetargach-na
// -sprzedaz.html) ALSO exists but is a client-rendered React SPA (confirmed:
// its /sitemap.xml and /robots.txt both return the JS app shell, not real
// content) — do not use it; `wolow.pl` carries the same announcements as
// plain server HTML and needs no rendering.
//
// IMPORTANT — the county (powiat) BIP `bip.powiatwolowski.pl/przetargi-
// nieruchomosci` is a DIFFERENT JST (Starostwo Powiatowe w Wołowie, county
// property) and is explicitly OUT OF SCOPE. A live-verification pass for this
// build found a widely-quoted "Prawików, wylicytowano 84 200 zł" result
// actually belongs to that county board (dz. nr 223 AM-1), not to any gmina
// wolow.pl document — see crawl.js's header for the full note on why this
// adapter cannot ship a sold/achieved-price stream.
//
// See spikes/dolnoslaskie/powiat-wolowski/wolow.md for the spike (VERDICT:
// BUILD). Closest analog: the SkyCMS/netkoncept-style "custom HTML" family
// (ADAPTER-GUIDE §3) — cloned from `olesno` (bip_v4 skyCMS) and re-targeted at
// the live `wolow.pl` DOM, which uses different container classes
// (`sub-page__content` / `sub-page__footer` / `pageHeader` / `pageDatetimeCreate`)
// than Olesno's `bip-page__content`.
//
// NOTE: teryt is a best-effort estimate from a live web lookup (wykaz.rky.pl,
// zpp.pl), NOT an eteryt.stat.gov.pl direct query: gmina Wołów (miejsko-wiejska)
// = 0222033 in raw TERYT (woj 02 dolnośląskie, powiat 22 wołowski, gmina 03,
// rodzaj 3 = whole gmina aggregate) → `022203_3` in this repo's WWPPGG_R
// convention (same "_3 whole-gmina" convention already used by trzebnica).
// CONFIRM on first geoportal/ULDK run before trusting this for deep-links.

export const config = {
  id: 'wolow',
  teryt: '022203_3', // gmina miejsko-wiejska Wołów (powiat wołowski) — confirm on first geoportal run
  label: 'Wołów',
  voivodeship: 'dolnoslaskie',
  authority: 'Urząd Miejski w Wołowie (Burmistrz Gminy Wołów)',
  host: 'wolow.pl',
  source: 'html',
};
