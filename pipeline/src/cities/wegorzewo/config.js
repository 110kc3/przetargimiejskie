// Węgorzewo (Warmińsko-Mazurskie, powiat węgorzewski) — Gmina Węgorzewo
// (Burmistrz Węgorzewa) auctions municipal flats (both in town, e.g. ul. Armii
// Krajowej, and in villages, e.g. Węgielsztyn/Kal/Pniewo/Sztynort Mały) and
// undeveloped land via ustny przetarg nieograniczony, published on the city
// BIP (bip.wegorzewo.pl). Platform: IDcom.pl — the exact host shape of the
// already-BUILT gizycko adapter (same voivodeship, neighbouring powiat).
// Volume: low, ~a few flat notices/year (often re-run across several rounds).
// See spikes/warminsko-mazurskie/powiat-wegorzewski/wegorzewo.md.
//
// TLS: bip.wegorzewo.pl ships an INCOMPLETE certificate chain (missing
// intermediate CA — curl needs `-k`, confirmed live 2026-07-10/11: plain
// curl fails with "unable to get local issuer certificate"). The data is
// public/read-only, so verification is relaxed for this host via
// insecureTLS, same class of issue as bip.miastozabrze.pl/bip.zlotoryja.pl
// (see core/fetch.js's header comment).
//
// Second CEM stream (spike-flagged): cem.wegorzewo.pl/nieruchomosci —
// Ciepłownie Miejskie Sp. z o.o., the gmina's housing/property manager — runs
// its own flat auctions. NOT wired into this adapter: "Przetargi aktualne" is
// currently empty and "Przetargi archiwalne" is a 74-page WordPress archive
// dominated by unrelated heating/construction/procurement tenders, with
// property SALE notices as a small, unlabelled minority — enumerating just
// the property auctions there is a distinct scoped effort, not a
// straightforward add-on. The one concrete lead from the spike (ul. Jasna
// 4/5, "Treść całego ogłoszenia" PDF) now 404s (page/attachment reorganized
// since the spike). Left as a documented gap — see crawl.js header.

export const config = {
  id: 'wegorzewo',
  // TERYT for Gmina Węgorzewo (gmina miejsko-wiejska, powiat węgorzewski
  // 2819 — confirmed via GUS-derived registries: gmina Węgorzewo whole-gmina
  // code 2819033, rural part 2819035). "_4" here follows this codebase's own
  // convention (see naklo-nad-notecia/config.js) for "the miasto part" of a
  // miejsko-wiejska gmina — PROVISIONAL, since flats sold by this adapter sit
  // BOTH in the town (Armii Krajowej) AND in villages (Węgielsztyn, Kal,
  // Pniewo, Sztynort Mały), so a single per-city code can't disambiguate.
  // TODO: confirm on first geoportal run.
  teryt: '281903_4',
  label: 'Węgorzewo',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Gmina Węgorzewo',
  host: 'bip.wegorzewo.pl',
  source: 'html',
  insecureTLS: true,
};
