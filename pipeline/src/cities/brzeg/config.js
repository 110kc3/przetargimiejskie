// Brzeg (Opolskie, powiat brzeski) — municipal flat sales run by Urząd Miasta
// w Brzegu, Wydział Geodezji (geodezja@brzeg.pl, 77 416 04 26).
//
// Two-host model (see spikes/opolskie/powiat-brzeski/brzeg.md):
//   PRIMARY:  brzeg.pl/gminne-nieruchomosci-do-sprzedazy/ — WordPress page,
//             manually updated by UM, lists currently active flat auctions with
//             inline fields (cena wywoławcza, tryb, termin, BIP link).
//   BIP:      bip.brzeg.pl — MegaBIP (SISCO), per-item pages at
//             /przetargi,9_1-YYYY-M_NNN while active (attachments visible),
//             moved to /archiwum,7_5_NNN after close (content hidden).
//             Result PDFs ("Informacja o wyniku…") are attached alongside the
//             announcement PDF on the active /przetargi,9_1-YYYY-M_NNN page.
//
// ZNM Brzeg (znmbrzeg.pl / bip.znmbrzeg.pl) handles najem/dzierżawa only —
// flat SALES go through UM Brzeg directly. Out of scope here.
//
// `source: 'html'` — both hosts are server-rendered; no OCR required.
// crawlResultDocs: polls BIP year+month index for active items that still have
//   their attachment table (announces + "Informacja o wyniku…" PDF).
// Volume: ~10 flat auctions/yr (multi-lot sessions occur).

export const config = {
  id: 'brzeg',
  // TERYT for gmina miejska Brzeg (powiat brzeski, opolskie).
  // Code 161201_1 — confirm on first geoportal run.
  teryt: '161201_1',
  label: 'Brzeg',
  voivodeship: 'opolskie',
  authority: 'Urząd Miasta w Brzegu',
  host: 'brzeg.pl',
  source: 'html',
};
