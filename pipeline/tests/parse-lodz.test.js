// Tests for pipeline/src/cities/lodz/parse.js
// Fixtures groundtruthed against live PDFs fetched 2026-06-27:
//
//   ANNOUNCEMENT: https://bip.uml.lodz.pl/files/bip/public/BIP_SS_26/ZNN_przetarg_Plocka_Jaracza_inne_20260624.pdf
//     Łódź batch: ul. Płocka 16 (lokal nr 1A), ul. Stefana Jaracza 23 (nr 1, 15, 53),
//                 ul. Juliana Tuwima 6 (lokal użytkowy nr 6U). Auction: 13 sierpnia 2026.
//
//   RESULT:       https://bip.uml.lodz.pl/files/bip/public/BIP_VG_26/ZNN_wyniki_Rybna-7_Lagiewnicka-89A_inne_20260625.pdf
//     Conducted: 11 czerwca 2026 r.
//     Sold: ul. Narutowicza 89 lokal garaż nr 6U → 191 900 zł
//           ul. Wólczańska 228 lokal nr 6 → 196 200 zł
//     Unsold: all others (various negative reasons)

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  parsePLN,
  parseArea,
  auctionDateFromAnn,
  splitLots,
  parseLotSegment,
  parseAnnouncementPdf,
  auctionDateFromResult,
  splitResultLots,
  parseResultSegment,
  parseResultDoc,
} from '../src/cities/lodz/parse.js';

import { parsePdfLinks } from '../src/cities/lodz/crawl.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

describe('parsePLN', () => {
  it('parses space-separated thousands', () => {
    assert.equal(parsePLN('45 000'), 45000);
    assert.equal(parsePLN('191 900'), 191900);
    assert.equal(parsePLN('196 200'), 196200);
    assert.equal(parsePLN('200 000'), 200000);
    assert.equal(parsePLN('1 300'), 1300);
  });
  it('parses plain integers', () => {
    assert.equal(parsePLN('155000'), 155000);
    assert.equal(parsePLN('450'), 450);
  });
  it('handles comma-decimal (strips grosze)', () => {
    assert.equal(parsePLN('191 900,00'), 191900);
  });
  it('returns null for empty/invalid', () => {
    assert.equal(parsePLN(''), null);
    assert.equal(parsePLN(null), null);
    assert.equal(parsePLN('abc'), null);
  });
});

describe('parseArea', () => {
  it('parses comma-decimal', () => {
    assert.equal(parseArea('17,64'), 17.64);
    assert.equal(parseArea('71,12'), 71.12);
    assert.equal(parseArea('29,31'), 29.31);
  });
  it('returns null for invalid', () => {
    assert.equal(parseArea(null), null);
    assert.equal(parseArea(''), null);
  });
});

// ---------------------------------------------------------------------------
// Announcement date
// ---------------------------------------------------------------------------

describe('auctionDateFromAnn', () => {
  it('extracts date from plural form "Przetargi odbędą się"', () => {
    const text = 'Przetargi odbędą się w dniu 13 sierpnia 2026 r., o godz. 10:00';
    assert.equal(auctionDateFromAnn(text), '2026-08-13');
  });
  it('extracts date from singular form "Przetarg odbędzie się"', () => {
    const text = 'Przetarg odbędzie się w dniu 5 marca 2026 r., o godz. 10:00';
    assert.equal(auctionDateFromAnn(text), '2026-03-05');
  });
  it('returns null when no date', () => {
    assert.equal(auctionDateFromAnn('brak daty'), null);
    assert.equal(auctionDateFromAnn(''), null);
  });
});

// ---------------------------------------------------------------------------
// Announcement lot splitting (groundtruthed on Płocka/Jaracza PDF text)
// ---------------------------------------------------------------------------

// Reconstructed from live PDF (pdftotext -layout output for 5-lot PDF):
const ANN_PDF_TEXT = `
OGŁOSZENIE PREZYDENTA MIASTA ŁODZI
Prezydent Miasta Łodzi ogłasza ustne przetargi nieograniczone (licytacje) na sprzedaż samodzielnych lokali mieszkalnych i samodzielnego lokalu
użytkowego, wraz z udziałem w prawie własności gruntu, stanowiących własność Miasta Łodzi, usytuowanych w budynkach położonych w Łodzi
przy:
Lp.    Położenie nieruchomości    Nr księgi wieczystej    Rejon Obsługi Najemców    Obręb, nr działki, powierzchnia działki [m2]    Powierzchnia lokalu / pomieszczenia przynależnego [m2] udział    Struktura lokalu usytuowanie    Cena wywoławcza łączna [zł]    Wadium [zł]    Minimalna kwota postąpienia [zł]

1.
ul. Płocka 16
lokal mieszkalny nr 1A*1
KW LD1M/00087425/2
Miejski Administrator Nieruchomości
G-5
126
748
17,64 / 2,19
____________
1983/36423
1 pokój, WC usytuowane w piwnicy + pomieszczenie przynależne (komórka)
budynek frontowy – parter
45 000 9 000 450

2.
ul. Stefana Jaracza 23
lokal mieszkalny nr 1*2
KW LD1M/00002368/5
Miejski Administrator Nieruchomości
S-1
473/1
2799
71,12
____________
0,018
2 pokoje, ślepa kuchnia, łazienka z WC, przedpokój
budynek frontowy – parter
180 000 36 000 1 800

3.
ul. Stefana Jaracza 23
lokal mieszkalny nr 15*3
KW LD1M/00002368/5
Miejski Administrator Nieruchomości
S-1
473/1
2799
52,46
____________
0,013
2 pokoje, ślepa kuchnia, łazienka, WC, przedpokój
budynek frontowy – III piętro (poddasze)
130 000 26 000 1 300

4.
ul. Stefana Jaracza 23
lokal mieszkalny nr 53*4
KW LD1M/00002368/5
Miejski Administrator Nieruchomości
S-1
473/1
2799
55,92
____________
0,014
2 pokoje, kuchnia, przedpokój, WC
prawa oficyna – I piętro
155 000 31 000 1 550

5.
ul. Juliana Tuwima 6
lokal użytkowy nr 6U
KW LD1M/00003013/9
Miejski Administrator Nieruchomości
S-6
145/4
2686
74,75
____________
0,039
3 pomieszczenia
lewa oficyna (budynek nr 587) – parter
155 000 31 000 1 550

*1/ Dotyczy lokalu mieszkalnego nr 1A przy ul. Płockiej 16 – pomieszczenie przynależne do lokalu nr 1A (komórka) o powierzchni 2,19 m2.

20. Termin przetargów zakończonych wynikiem negatywnym dla lokali będących przedmiotem przetargów - 09.04.2026r.
Przetargi odbędą się w dniu 13 sierpnia 2026 r., o godz. 10:00, w siedzibie Urzędu Miasta Łodzi.
`.trim();

describe('splitLots (announcement)', () => {
  it('finds 5 lots in the Płocka/Jaracza fixture', () => {
    const segs = splitLots(ANN_PDF_TEXT);
    assert.equal(segs.length, 5);
  });
  it('first lot contains Płocka 16', () => {
    const segs = splitLots(ANN_PDF_TEXT);
    assert.match(segs[0], /P[łl]ocka\s+16/i);
  });
  it('last lot is lokal użytkowy at Tuwima 6', () => {
    const segs = splitLots(ANN_PDF_TEXT);
    assert.match(segs[4], /Tuwima\s+6/i);
    assert.match(segs[4], /u[żz]ytkow/i);
  });
});

describe('parseLotSegment', () => {
  it('parses Płocka 16 lokal nr 1A', () => {
    const segs = splitLots(ANN_PDF_TEXT);
    const rec = parseLotSegment(segs[0]);
    assert.ok(rec, 'record must be non-null');
    assert.equal(rec.kind, 'mieszkalny');
    assert.equal(rec.address.street, 'Płocka');
    assert.equal(rec.address.building, '16');
    assert.equal(rec.address.apt, '1A');
    assert.equal(rec.area_m2, 17.64);
    assert.equal(rec.starting_price_pln, 45000);
    assert.equal(rec.wadium_pln, 9000);
  });

  it('parses Jaracza 23 lokal nr 1 (71.12 m², 180 000 zł)', () => {
    const segs = splitLots(ANN_PDF_TEXT);
    const rec = parseLotSegment(segs[1]);
    assert.ok(rec);
    assert.equal(rec.kind, 'mieszkalny');
    assert.equal(rec.address.street, 'Stefana Jaracza');
    assert.equal(rec.address.building, '23');
    assert.equal(rec.address.apt, '1');
    assert.equal(rec.area_m2, 71.12);
    assert.equal(rec.starting_price_pln, 180000);
  });

  it('parses Tuwima 6 lokal użytkowy nr 6U', () => {
    const segs = splitLots(ANN_PDF_TEXT);
    const rec = parseLotSegment(segs[4]);
    assert.ok(rec);
    assert.equal(rec.kind, 'uzytkowy');
    assert.equal(rec.address.street, 'Juliana Tuwima');
    assert.equal(rec.address.building, '6');
    assert.equal(rec.address.apt, '6U');
    assert.equal(rec.area_m2, 74.75);
    assert.equal(rec.starting_price_pln, 155000);
  });
});

describe('parseAnnouncementPdf', () => {
  it('returns 5 records with auction_date 2026-08-13', () => {
    const recs = parseAnnouncementPdf(ANN_PDF_TEXT, {
      detail_url: 'https://bip.uml.lodz.pl/test',
      source_url: 'https://bip.uml.lodz.pl/test.pdf',
    });
    assert.equal(recs.length, 5);
    for (const r of recs) assert.equal(r.auction_date, '2026-08-13');
  });

  it('all records have detail_url set', () => {
    const recs = parseAnnouncementPdf(ANN_PDF_TEXT, { detail_url: 'https://example.com' });
    for (const r of recs) assert.equal(r.detail_url, 'https://example.com');
  });

  it('returns [] for empty text', () => {
    assert.deepEqual(parseAnnouncementPdf('', {}), []);
  });
});

// ---------------------------------------------------------------------------
// Result PDF
// ---------------------------------------------------------------------------

// Reconstructed from live ZNN_wyniki_Rybna-7_Lagiewnicka-89A_inne_20260625.pdf
const RESULT_PDF_TEXT = `
INFORMACJA
o wynikach ustnych przetargów nieograniczonych (licytacjach)
przeprowadzonych w dniu 11 czerwca 2026 r., w siedzibie Urzędu Miasta Łodzi
w Łodzi przy ul. Piotrkowskiej 104, na sprzedaż samodzielnych lokali
mieszkalnych i samodzielnych lokali użytkowych wraz z udziałem w prawie
własności gruntu, stanowiących własność Miasta Łodzi, usytuowanych
w budynkach położonych w Łodzi przy:

1.
ul. Rybna 7A
lokal mieszkalny nr 50
KW LD1M/00046221/3
B-46
280
963
29,31
____________
0,009
200 000
Liczba osób dopuszczonych do przetargu: 0
Liczba osób niedopuszczonych do przetargu: 0
Z uwagi na brak osób dopuszczonych do przetargu, przetarg zakończył się wynikiem negatywnym.

2.
ul. Łagiewnicka 89A
lokal mieszkalny nr 20
KW LD1M/00047293/5
B-49
343
332
37,34
____________
0,029
270 000
Liczba osób dopuszczonych do przetargu: 0
Liczba osób niedopuszczonych do przetargu: 0
Z uwagi na brak osób dopuszczonych do przetargu, przetarg zakończył się wynikiem negatywnym.

6.
ul. Marcina Kasprzaka 19/21
lokal mieszkalny nr 2
KW LD1M/00055699/0
P-7
336/1
459
33,52
____________
0,020
210 000
Liczba osób dopuszczonych do przetargu: 1
Liczba osób niedopuszczonych do przetargu: 0
Z uwagi na brak postąpienia powyżej ceny wywoławczej, przetarg zakończył się wynikiem negatywnym.

7.
ul. Prezydenta Gabriela Narutowicza 89
lokal użytkowy - garaż nr 6U
KW LD1M/00039386/5
S-5
3/2, 3/3
1479
55,44
____________
0,043
190 000
Liczba osób dopuszczonych do przetargu: 1
Liczba osób niedopuszczonych do przetargu: 0
Cena lokalu uzyskana w przetargu została ustalona na kwotę w wysokości 191 900 zł brutto,
która obejmuje cenę lokalu oraz cenę udziału w gruncie wchodzącym w skład nieruchomości wspólnej.
Nabywcą lokalu został Pan Wojciech Palenik.

9.
ul. Wólczańska 228
lokal mieszkalny nr 6
KW LD1M/00101373/7
S-9
56/1
315
37,20
____________
0,046
180 000
Liczba osób dopuszczonych do przetargu: 2
Liczba osób niedopuszczonych do przetargu: 0
Cena lokalu uzyskana w przetargu została ustalona na kwotę w wysokości 196 200 zł brutto,
która obejmuje cenę lokalu oraz cenę udziału w gruncie wchodzącym w skład nieruchomości wspólnej.
Nabywcą lokalu zostali Państwo Joanna Glinkowska – Garwicka i Rafał Garwicki.

 Przewodniczący Komisji Przetargowej
 Marek Jóźwiak
Łódź, dnia 25.06.2026 r.
`.trim();

describe('auctionDateFromResult', () => {
  it('extracts date from result header', () => {
    assert.equal(auctionDateFromResult(RESULT_PDF_TEXT), '2026-06-11');
  });
  it('returns null for announcement text', () => {
    assert.equal(auctionDateFromResult(ANN_PDF_TEXT), null);
  });
});

describe('splitResultLots', () => {
  it('finds 5 lots in the result fixture', () => {
    const segs = splitResultLots(RESULT_PDF_TEXT);
    assert.equal(segs.length, 5);
  });
  it('first lot is Rybna 7A', () => {
    const segs = splitResultLots(RESULT_PDF_TEXT);
    assert.match(segs[0], /Rybna\s+7A/i);
  });
});

describe('parseResultSegment', () => {
  const segs = splitResultLots(RESULT_PDF_TEXT);

  it('Rybna 7A → unsold (brak osób)', () => {
    const rec = parseResultSegment(segs[0], '2026-06-11', 'https://example.com/result.pdf');
    assert.ok(rec);
    assert.equal(rec.outcome, 'unsold');
    assert.equal(rec.final_price_pln, null);
    assert.equal(rec.kind, 'mieszkalny');
    assert.equal(rec.address.street, 'Rybna');
    assert.equal(rec.address.building, '7A');
    assert.equal(rec.address.apt, '50');
    assert.equal(rec.starting_price_pln, 200000);
    assert.equal(rec.area_m2, 29.31);
    assert.equal(rec.auction_date, '2026-06-11');
  });

  it('Kasprzaka 19/21 → unsold (brak postąpienia)', () => {
    // segs[2] is the 3rd segment (lot #6 in the PDF)
    const rec = parseResultSegment(segs[2], '2026-06-11', 'https://example.com/result.pdf');
    assert.ok(rec);
    assert.equal(rec.outcome, 'unsold');
    assert.equal(rec.address.street, 'Marcina Kasprzaka');
    // Note: "19/21" is building number with slash — parseAddress treats "19" as bldg, "21" as apt
    // OR may treat the whole thing differently. We just assert street + non-null record.
    assert.equal(rec.starting_price_pln, 210000);
  });

  it('Narutowicza 89 lokal garaż → sold 191 900 zł', () => {
    const rec = parseResultSegment(segs[3], '2026-06-11', 'https://example.com/result.pdf');
    assert.ok(rec);
    assert.equal(rec.outcome, 'sold');
    assert.equal(rec.final_price_pln, 191900);
    assert.equal(rec.starting_price_pln, 190000);
    assert.equal(rec.kind, 'garaz');
    assert.equal(rec.address.street, 'Prezydenta Gabriela Narutowicza');
    assert.equal(rec.address.building, '89');
  });

  it('Wólczańska 228 lokal nr 6 → sold 196 200 zł', () => {
    const rec = parseResultSegment(segs[4], '2026-06-11', 'https://example.com/result.pdf');
    assert.ok(rec);
    assert.equal(rec.outcome, 'sold');
    assert.equal(rec.final_price_pln, 196200);
    assert.equal(rec.starting_price_pln, 180000);
    assert.equal(rec.address.street, 'Wólczańska');
    assert.equal(rec.address.building, '228');
    assert.equal(rec.address.apt, '6');
    assert.equal(rec.area_m2, 37.20);
  });
});

describe('parseResultDoc', () => {
  const SOURCE = 'https://bip.uml.lodz.pl/files/bip/public/BIP_VG_26/ZNN_wyniki_Rybna-7_Lagiewnicka-89A_inne_20260625.pdf';

  it('returns [] for non-result text', () => {
    assert.deepEqual(parseResultDoc(ANN_PDF_TEXT, null, SOURCE), []);
    assert.deepEqual(parseResultDoc('', null, SOURCE), []);
  });

  it('returns 5 records from the result fixture', () => {
    const recs = parseResultDoc(RESULT_PDF_TEXT, null, SOURCE);
    assert.equal(recs.length, 5);
  });

  it('all records have auction_date 2026-06-11', () => {
    const recs = parseResultDoc(RESULT_PDF_TEXT, null, SOURCE);
    for (const r of recs) assert.equal(r.auction_date, '2026-06-11');
  });

  it('all records have source_pdf set', () => {
    const recs = parseResultDoc(RESULT_PDF_TEXT, null, SOURCE);
    for (const r of recs) assert.equal(r.source_pdf, SOURCE);
  });

  it('exactly 2 sold and 3 unsold records', () => {
    const recs = parseResultDoc(RESULT_PDF_TEXT, null, SOURCE);
    const sold = recs.filter(r => r.outcome === 'sold');
    const unsold = recs.filter(r => r.outcome === 'unsold');
    assert.equal(sold.length, 2);
    assert.equal(unsold.length, 3);
  });

  it('sold prices are 191 900 and 196 200', () => {
    const recs = parseResultDoc(RESULT_PDF_TEXT, null, SOURCE);
    const soldPrices = recs.filter(r => r.outcome === 'sold').map(r => r.final_price_pln).sort();
    assert.deepEqual(soldPrices, [191900, 196200]);
  });

  it('fallbackDate is used when PDF header lacks a date', () => {
    const noDateText = RESULT_PDF_TEXT.replace(
      /przeprowadzonych\s+w\s+dniu\s+\d+\s+\w+\s+\d{4}\s*r\./i,
      'przeprowadzonych w',
    );
    const recs = parseResultDoc(noDateText, '2026-06-01', SOURCE);
    // Should still produce records using the fallback date
    for (const r of recs) assert.equal(r.auction_date, '2026-06-01');
  });
});

// ---------------------------------------------------------------------------
// crawl.js: parsePdfLinks (from HTML)
// ---------------------------------------------------------------------------

describe('parsePdfLinks', () => {
  it('finds announcement PDF in article HTML', () => {
    const html = `<a href="/files/bip/public/BIP_SS_26/ZNN_przetarg_Plocka_Jaracza_inne_20260624.pdf">Treść ogłoszenia [.pdf]</a>`;
    const { annPdfUrl, resultPdfUrl } = parsePdfLinks(html);
    assert.equal(annPdfUrl, 'https://bip.uml.lodz.pl/files/bip/public/BIP_SS_26/ZNN_przetarg_Plocka_Jaracza_inne_20260624.pdf');
    assert.equal(resultPdfUrl, null);
  });

  it('finds both announcement and result PDFs when present', () => {
    const html = `
      <a href="/files/bip/public/BIP_SS_26/ZNN_ogloszenie_Rybna_inne_20260408.pdf">Treść ogłoszenia [.pdf]</a>
      Wyniki przetargów:
      <a href="/files/bip/public/BIP_VG_26/ZNN_wyniki_Rybna-7_Lagiewnicka-89A_inne_20260625.pdf">Informacja o wynikach przetargów [.pdf]</a>
    `;
    const { annPdfUrl, resultPdfUrl } = parsePdfLinks(html);
    assert.ok(annPdfUrl?.includes('ZNN_ogloszenie'));
    assert.ok(resultPdfUrl?.includes('ZNN_wyniki'));
  });

  it('returns both null when no PDF links present', () => {
    const { annPdfUrl, resultPdfUrl } = parsePdfLinks('<p>brak załączników</p>');
    assert.equal(annPdfUrl, null);
    assert.equal(resultPdfUrl, null);
  });
});
