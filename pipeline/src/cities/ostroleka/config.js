// Ostrołęka — miasto na prawach powiatu (mazowieckie). The Urząd Miasta auctions
// municipal flats (lokal mieszkalny, przetarg ustny nieograniczony) directly on
// the city BIP (bip.um.ostroleka.pl, Logonet CMS — the Tarnowskie Góry family),
// and publishes the achieved-price stream as "Informacja o wyniku przetargu"
// PDF attachments on each flat's detail page. See spikes/mazowieckie/ostroleka.
//
// OCR city: both the announcement and the result PDFs are SCANNED images
// (pdftotext returns nothing — verified live 2026-07-05), so text comes from
// core/ocr-pdf.js (tesseract -l pol). `source: 'pdf'` routes the result stream
// through refresh.js's OCR dispatch (it calls ocrPdf(ref.pdf_url) then
// parseResultDoc); the announcement OCR for active listings is done inside
// crawl.js. The result-notice OCR is clean prose and is the authoritative
// per-flat record; the announcement OCR is a scanned table (area/unit are best
// effort there — the address/price/date/kind come from the HTML metadata).

export const config = {
  id: 'ostroleka',
  teryt: '146201_1', // miasto na prawach powiatu Ostrołęka (powiat 1462, gmina-type
  //                    1) — for geoportal parcel deep-links. Confirm on the first
  //                    geoportal/ULDK run (unreachable in-sandbox).
  label: 'Ostrołęka',
  voivodeship: 'mazowieckie',
  authority: 'Miasto Ostrołęka',
  host: 'bip.um.ostroleka.pl',
  source: 'pdf',
};
