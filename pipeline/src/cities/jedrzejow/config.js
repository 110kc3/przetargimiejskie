// Jędrzejów (województwo świętokrzyskie, powiat jędrzejowski) — Gmina
// Jędrzejów (Burmistrz Miasta Jędrzejowa) regularly auctions municipal flats
// (lokale mieszkalne) and land parcels (działki) via ustny przetarg
// nieograniczony on its BIP board at bip.jedrzejow.eu.
//
// Source: bip.jedrzejow.eu (Otwarty BIP / eBiuletyn platform by IDcom.pl).
// Announcements and result notices ('informacja o wyniku') are published in the
// same 'Przetargi' board (category 3: /wiadomosci/3/lista/przetargi).
// Static attachments (scanned PDF documents) are hosted on bip-v1-files.idcom-jst.pl.
//
// Document layer:
//   Announcements: multi-property notices with flats and land parcels; OCR via ocrPdf ({ psm: 1 }).
//   Results: tabular result notices listing final hammer prices or negative outcomes; OCR via ocrPdf ({ psm: 1 }).
//
// See spikes/swietokrzyskie/powiat-jedrzejowski/jedrzejow.md.

export const config = {
  id: 'jedrzejow',
  // TERYT for Gmina Jędrzejów — miasto Jędrzejów (powiat jędrzejowski [26 02], gmina 02, rodzaj 4 = miasto).
  // Confirm on first geoportal run.
  teryt: '260202_4',
  label: 'Jędrzejów',
  voivodeship: 'swietokrzyskie',
  authority: 'Burmistrz Miasta Jędrzejowa',
  host: 'bip.jedrzejow.eu',
  source: 'html',
};
