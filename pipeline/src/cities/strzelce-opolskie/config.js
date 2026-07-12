// Strzelce Opolskie — gmina miejsko-wiejska, województwo opolskie, powiat
// strzelecki. The seat's municipal property (flats, land, buildings) is sold at
// "ustny przetarg nieograniczony na sprzedaż" by the Burmistrz Strzelec
// Opolskich, ADMINISTERED and PUBLISHED by a dedicated municipal property
// manager — GZMK (Gminny Zarząd Mienia Komunalnego, ul. Zamkowa 2, 47-100
// Strzelce Opolskie) — on its own BIP at `gzmk.pl`.
//
// gzmk.pl is a bespoke server-rendered XHTML CMS ("design by fast4net"):
// parameter-path URLs `<slug>,<boardid>,<articleid>`, one board id 14
// ("Przetargi na sprzedaż nieruchomości") carrying every sale notice as inline
// structured HTML + a mirroring born-digital PDF, with results appended INLINE
// to the concluded notice. No SPA, no auth, no CAPTCHA; the bot UA is NOT gated
// (confirmed live 2026-07-12) — plain getText suffices, `source: 'html'`.
//
// The city BIP (bip.strzelceopolskie.pl) also has a sale board, but the
// operative flat-sale auctions are administered + published by GZMK — build
// against gzmk.pl, not the Urząd Miejski board (see the spike).
// Out of scope: Spółdzielnia Mieszkaniowa w Strzelcach Opolskich (cooperative,
// not gmina property); GZMK boards 15/16/44 (najem/dzierżawa — rentals).
//
// See spikes/opolskie/powiat-strzelecki/strzelce-opolskie.md (VERDICT: BUILD).
// Closest analogs: the single-board custom-HTML family — nowa-sol (single
// server-rendered board, one structured-HTML detail page per notice,
// classifyKind on the body) of the two named analogs, and structurally wolow
// (single MIXED board of flats+land+buildings, body-driven kind, source:'html'
// inline-result crawlResultDocs contract, parcel-keyed grunt via build-land) —
// GZMK matches wolow's shape but with a cleaner structured field block AND real
// inline outcomes (sold "za cenę …" / negative) that wolow lacked.

export const config = {
  id: 'strzelce-opolskie',
  // TERYT gmina miejsko-wiejska Strzelce Opolskie (woj 16 opolskie, powiat 09
  // strzelecki, gmina 05, rodzaj 3 = whole miejsko-wiejska gmina) → 160905_3 in
  // this repo's WWPPGG_R convention (same "_3 whole-gmina" form as trzebnica /
  // wolow). Best-effort — confirm on first geoportal/ULDK run.
  teryt: '160905_3',
  label: 'Strzelce Opolskie',
  voivodeship: 'opolskie',
  authority: 'GZMK (Gminny Zarząd Mienia Komunalnego) — Gmina Strzelce Opolskie',
  host: 'gzmk.pl',
  source: 'html',
};
