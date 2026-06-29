// Tests for pipeline/src/cities/skarzysko-kamienna/parse.js + crawl.js
//
// Fixtures groundtruthed 2026-06-29 against live BIP bip.skarzysko.pl:
//
//   ANNOUNCEMENT (flat, round 3):
//     https://bip.skarzysko.pl/przetarg-nieruchomosci/10586/…chalubinskiego-nr-8-lokal-nr-5
//     "ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego
//      nr 5, mieszczącego się w budynku przy ul. Chałubińskiego nr 8"
//     Structured table: Cena wywoławcza 95 800,00 zł, Data przetargu 14.01.2025
//     Body: "skład lokalu: … o łącznej powierzchni 33,60 m²"
//           "CENA WYWOŁAWCZA do przetargu wynosi - 95.800,00 zł"
//           "Przetarg odbędzie się w dniu 14 stycznia 2025 r."
//
//   RESULT flat SOLD (round 1):
//     https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/…staffa-nr-25-lokal-nr-1-informacja-o-wyniku-przetargu
//     "odbył się ustny nieograniczony przetarg … przy ul. Staffa 25 …
//      lokal mieszkalny nr 1 … o powierzchni 14,00 m2"
//     "Cena wywoławcza została ustalona na kwotę 31.600,00 zł."
//     "Najwyższa cena jak została osiągnięta w przetargu wyniosła 31.920,00 zł."
//
//   RESULT flat UNSOLD/wadium (round 3):
//     https://bip.skarzysko.pl/przetarg-nieruchomosci/10876/…chalubinskiego-nr-8-lokal-nr-5-informacja-o-wyniku-trzeciego-przetargu
//     "odbył się trzeci ustny nieograniczony przetarg … przy ul. Chałubińskiego 8/5
//      … o powierzchni 33,60 m2"
//     "Cena wywoławcza została ustalona na kwotę 95.800,00 zł"
//     "Na przedmiotowy lokal nie zostało wpłacone wadium … wynikiem negatywnym."
//
//   RESULT flat UNSOLD/brak oferentów (round 5):
//     https://bip.skarzysko.pl/przetarg-nieruchomosci/8141/…staffa-13-2-informacja-o-wyniku-przetargu
//     "odbył się piąty ustny nieograniczony przetarg … przy ul. Staffa 13/2 …
//      o powierzchni 33,00 m2"
//     "Cena wywoławcza została ustalona na kwotę 62.920,00 zł"
//     "W związku z brakiem oferentów przetarg zakończył się wynikiem negatywnym."

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  parsePLN,
  isResultNotice,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
  roundFromText,
  auctionDateFromText,
  resultDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  addressRawFromText,
  unitAreaFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/skarzysko-kamienna/parse.js';

import {
  parseListingPage,
} from '../src/cities/skarzysko-kamienna/crawl.js';

// ----------------------------------------------------------------- parsePLN

describe('parsePLN', () => {
  it('parses dot-thousands with comma-decimal', () => {
    assert.equal(parsePLN('95.800,00'), 95800);
    assert.equal(parsePLN('31.600,00'), 31600);
    assert.equal(parsePLN('31.920,00'), 31920);
    assert.equal(parsePLN('62.920,00'), 62920);
  });
  it('parses space-separated thousands', () => {
    assert.equal(parsePLN('95 800,00'), 95800);
    assert.equal(parsePLN('31 600,00'), 31600);
  });
  it('returns null for empty / invalid', () => {
    assert.equal(parsePLN(''), null);
    assert.equal(parsePLN(null), null);
    assert.equal(parsePLN('abc'), null);
  });
});

// ----------------------------------------------------------------- isResultNotice

describe('isResultNotice', () => {
  it('detects INFORMACJA O WYNIKU header', () => {
    assert.equal(isResultNotice('INFORMACJA O WYNIKU TRZECIEGO PRZETARGU NA SPRZEDAŻ'), true);
    assert.equal(isResultNotice('INFORMACJA O WYNIKU PRZETARGU'), true);
  });
  it('rejects announcement text', () => {
    assert.equal(isResultNotice('OGŁOSZENIE O PRZETARGU'), false);
    assert.equal(isResultNotice('ogłasza trzeci przetarg ustny nieograniczony'), false);
  });
  it('returns false for null/empty', () => {
    assert.equal(isResultNotice(''), false);
    assert.equal(isResultNotice(null), false);
  });
});

// ----------------------------------------------------------------- title routing

describe('isSkippableTitle', () => {
  it('skips najem', () => assert.equal(isSkippableTitle('najem lokalu', ''), true));
  it('skips dzierżawa', () => assert.equal(isSkippableTitle('dzierżawa gruntu', ''), true));
  it('skips wykaz', () => assert.equal(isSkippableTitle('wykaz nieruchomości', ''), true));
  it('skips odwołanie', () => assert.equal(isSkippableTitle('odwołanie przetargu', ''), true));
  it('does NOT skip flat sale', () => {
    assert.equal(isSkippableTitle('26-110 Skarżysko-Kamienna ul. Chałubińskiego Nr 8, lokal nr 5', '26-110-skarzysko-kamienna-ul-chalubinskiego-nr-8-lokal-nr-5'), false);
  });
  it('does NOT skip result notice', () => {
    assert.equal(isSkippableTitle('informacja o wyniku przetargu', 'informacja-o-wyniku-przetargu'), false);
  });
});

describe('isResultTitle', () => {
  it('detects result slug', () => {
    assert.equal(isResultTitle('', '26-110-skarzysko-kamienna-ul-chalubinskiego-nr-8-lokal-nr-5-informacja-o-wyniku-trzeciego-przetargu'), true);
  });
  it('detects result title', () => {
    assert.equal(isResultTitle('26-110 Skarżysko-Kamienna, ul. Staffa nr 25, lokal nr 1 - informacja o wyniku przetargu', ''), true);
  });
  it('rejects announcement title', () => {
    assert.equal(isResultTitle('26-110 Skarżysko-Kamienna, ul. Chałubińskiego Nr 8, lokal nr 5', ''), false);
  });
});

describe('isAnnouncementTitle', () => {
  it('identifies przetarg + sprzedaż', () => {
    assert.equal(isAnnouncementTitle('ogłasza trzeci przetarg ustny na sprzedaż lokalu', ''), true);
  });
  it('rejects title without przetarg', () => {
    assert.equal(isAnnouncementTitle('Wykaz nieruchomości do zbycia', ''), false);
  });
});

// ----------------------------------------------------------------- roundFromText

describe('roundFromText', () => {
  it('extracts trzeci (3)', () => {
    assert.equal(roundFromText('odbył się trzeci ustny nieograniczony przetarg'), 3);
  });
  it('extracts piąty (5)', () => {
    assert.equal(roundFromText('odbył się piąty ustny nieograniczony przetarg'), 5);
  });
  it('extracts pierwszy (1)', () => {
    assert.equal(roundFromText('ogłasza pierwszy przetarg ustny'), 1);
  });
  it('extracts drugi (2)', () => {
    assert.equal(roundFromText('ogłasza drugi przetarg ustny nieograniczony'), 2);
  });
  it('returns null when no ordinal', () => {
    assert.equal(roundFromText('odbył się ustny nieograniczony przetarg'), null);
    assert.equal(roundFromText(''), null);
    assert.equal(roundFromText(null), null);
  });
});

// ----------------------------------------------------------------- auctionDateFromText

describe('auctionDateFromText', () => {
  it('parses "w dniu 14 stycznia 2025 r."', () => {
    assert.equal(
      auctionDateFromText('Przetarg odbędzie się w dniu 14 stycznia 2025 r. o godz. 9'),
      '2025-01-14',
    );
  });
  it('parses "w dniu 26 lutego 2019 r."', () => {
    assert.equal(
      auctionDateFromText('Przetarg odbędzie się w dniu 26 lutego 2019 r. o godz. 10'),
      '2019-02-26',
    );
  });
  it('parses "w dniu 14 maja 2024 r."', () => {
    assert.equal(
      auctionDateFromText('Przetarg odbędzie się w dniu 14 maja 2024 r.'),
      '2024-05-14',
    );
  });
  it('falls back to structured table date "Data przetargu 14.01.2025"', () => {
    assert.equal(
      auctionDateFromText('Data przetargu 14.01.2025 godz. 09:00'),
      '2025-01-14',
    );
  });
  it('returns null when no date', () => {
    assert.equal(auctionDateFromText('brak daty'), null);
    assert.equal(auctionDateFromText(''), null);
  });
});

// ----------------------------------------------------------------- resultDateFromText

describe('resultDateFromText', () => {
  it('parses "w dniu 14 maja 2024 r. w siedzibie"', () => {
    assert.equal(
      resultDateFromText('w dniu 14 maja 2024 r. w siedzibie Urzędu Miasta w Skarżysku-Kamiennej'),
      '2024-05-14',
    );
  });
  it('parses "w dniu 14 stycznia 2025 r. w siedzibie"', () => {
    assert.equal(
      resultDateFromText('w dniu 14 stycznia 2025 r. w siedzibie Urzędu Miasta'),
      '2025-01-14',
    );
  });
  it('parses "w dniu 21 marca 2023 r. w siedzibie"', () => {
    assert.equal(
      resultDateFromText('w dniu 21 marca 2023 r. w siedzibie Urzędu Miasta'),
      '2023-03-21',
    );
  });
  it('falls back to header stamp "Skarżysko-Kamienna, dn. 22.05.2024"', () => {
    assert.equal(
      resultDateFromText('Skarżysko-Kamienna, dn. 22.05.2024.'),
      '2024-05-22',
    );
  });
  it('returns null when no date', () => {
    assert.equal(resultDateFromText('brak daty'), null);
  });
});

// ----------------------------------------------------------------- startingPriceFromText

describe('startingPriceFromText', () => {
  it('parses "CENA WYWOŁAWCZA do przetargu wynosi - 95.800,00 zł"', () => {
    assert.equal(
      startingPriceFromText('CENA WYWOŁAWCZA do przetargu wynosi - 95.800,00 zł (słownie:'),
      95800,
    );
  });
  it('parses "Cena wywoławcza została ustalona na kwotę 31.600,00 zł"', () => {
    assert.equal(
      startingPriceFromText('Cena wywoławcza została ustalona na kwotę 31.600,00 zł.'),
      31600,
    );
  });
  it('parses "Cena wywoławcza 95 800,00 zł" (table field)', () => {
    assert.equal(
      startingPriceFromText('Cena wywoławcza 95 800,00 zł'),
      95800,
    );
  });
  it('parses "CENA WYWOŁAWCZA do przetargu wynosi - 20.400,00 zł"', () => {
    assert.equal(
      startingPriceFromText('CENA WYWOŁAWCZA do przetargu wynosi - 20.400,00 zł (słownie:'),
      20400,
    );
  });
  it('returns null when missing', () => {
    assert.equal(startingPriceFromText('brak ceny'), null);
    assert.equal(startingPriceFromText(''), null);
    assert.equal(startingPriceFromText(null), null);
  });
});

// ----------------------------------------------------------------- achievedPriceFromText

describe('achievedPriceFromText', () => {
  it('parses "Najwyższa cena jak została osiągnięta … wyniosła 31.920,00 zł"', () => {
    assert.equal(
      achievedPriceFromText('Najwyższa cena jak została osiągnięta w przetargu wyniosła 31.920,00 zł.'),
      31920,
    );
  });
  it('returns null when no achieved price (unsold)', () => {
    assert.equal(
      achievedPriceFromText('Na przedmiotowy lokal nie zostało wpłacone wadium, a w związku z tym przetarg zakończył się wynikiem negatywnym.'),
      null,
    );
  });
  it('returns null for empty', () => {
    assert.equal(achievedPriceFromText(''), null);
    assert.equal(achievedPriceFromText(null), null);
  });
});

// ----------------------------------------------------------------- addressRawFromText

describe('addressRawFromText', () => {
  it('extracts "ul. Chałubińskiego 8/5" from result notice inline form', () => {
    const raw = addressRawFromText(
      'przetarg na sprzedaż lokalu mieszkalnego przy ul. Chałubińskiego 8/5 w Skarżysku-Kamiennej',
    );
    assert.ok(raw, 'must be non-null');
    assert.match(raw, /Cha[łl]ubi/i);
    assert.match(raw, /8\/5/);
  });
  it('extracts "ul. Chałubińskiego 8/5" from announcement "przy ul. Chałubińskiego nr 8 … nr 5"', () => {
    const raw = addressRawFromText(
      'ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5, mieszczącego się w budynku przy ul. Chałubińskiego nr 8 w Skarżysku-Kamiennej',
    );
    assert.ok(raw, 'must be non-null');
    assert.match(raw, /Cha[łl]ubi/i);
    assert.match(raw, /8/);
  });
  it('extracts "ul. Staffa 25/1" from result notice', () => {
    const raw = addressRawFromText(
      'przetarg na sprzedaż lokalu mieszkalnego nr 1 znajdującego się w budynku przy ul. Staffa 25 w Skarżysku-Kamiennej',
    );
    assert.ok(raw, 'must be non-null');
    assert.match(raw, /Staffa/i);
    assert.match(raw, /25/);
  });
  it('extracts "ul. Staffa 13/2" from result inline form', () => {
    const raw = addressRawFromText(
      'przetarg na sprzedaż lokalu mieszkalnego przy ul. Staffa 13/2 w Skarżysku-Kamiennej',
    );
    assert.ok(raw, 'must be non-null');
    assert.match(raw, /Staffa/i);
    assert.match(raw, /13\/2/);
  });
  it('returns null when no address', () => {
    assert.equal(addressRawFromText('brak adresu'), null);
    assert.equal(addressRawFromText(''), null);
    assert.equal(addressRawFromText(null), null);
  });
});

// ----------------------------------------------------------------- unitAreaFromText

describe('unitAreaFromText', () => {
  it('extracts 33.60 from "o łącznej powierzchni 33,60 m²"', () => {
    assert.equal(
      unitAreaFromText('lokal mieszkalny nr 5 … skład lokalu: kuchnia, pokój, przedpokój, łazienka o łącznej powierzchni 33,60 m²'),
      33.6,
    );
  });
  it('extracts 14.00 from "o powierzchni 14,00 m2"', () => {
    assert.equal(
      unitAreaFromText('lokal mieszkalny nr 1 … o powierzchni 14,00 m2'),
      14,
    );
  });
  it('extracts 33.00 from "o powierzchni 33,00 m2"', () => {
    assert.equal(
      unitAreaFromText('lokal mieszkalny … o powierzchni 33,00 m2'),
      33,
    );
  });
  it('returns null when no area', () => {
    assert.equal(unitAreaFromText('brak powierzchni'), null);
    assert.equal(unitAreaFromText(''), null);
  });
});

// ----------------------------------------------------------------- parseAnnouncement

describe('parseAnnouncement', () => {
  // Fixture from https://bip.skarzysko.pl/przetarg-nieruchomosci/10586/…chalubinskiego-nr-8-lokal-nr-5
  const ANN_TEXT = `
Adres nieruchomości 26-110 Skarżysko-Kamienna, ul. Chałubińskiego Nr 8, lokal nr 5
Przetarg na Sprzedaż lokalu mieszkalnego
Cena wywoławcza 95 800,00 zł
Data przetargu 14.01.2025 godz. 09:00

ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5, mieszczącego się w budynku przy ul. Chałubińskiego nr 8 w Skarżysku-Kamiennej wraz ze sprzedażą ułamkowej części gruntu zabudowanego budynkiem.
skład lokalu: kuchnia, pokój, przedpokój, łazienka o łącznej powierzchni 33,60 m²;
CENA WYWOŁAWCZA do przetargu wynosi - 95.800,00 zł (słownie: dziewięćdziesiąt pięć tysięcy osiemset złotych 00/100)
Przetarg odbędzie się w dniu 14 stycznia 2025 r. o godz. 9 w sali konferencyjnej
`;

  it('parses kind=mieszkalny', () => {
    const rec = parseAnnouncement(ANN_TEXT);
    assert.ok(rec, 'must be non-null');
    assert.equal(rec.kind, 'mieszkalny');
  });
  it('parses round=3', () => {
    const rec = parseAnnouncement(ANN_TEXT);
    assert.equal(rec.round, 3);
  });
  it('parses auction_date=2025-01-14', () => {
    const rec = parseAnnouncement(ANN_TEXT);
    assert.equal(rec.auction_date, '2025-01-14');
  });
  it('parses starting_price_pln=95800', () => {
    const rec = parseAnnouncement(ANN_TEXT);
    assert.equal(rec.starting_price_pln, 95800);
  });
  it('parses area_m2=33.6', () => {
    const rec = parseAnnouncement(ANN_TEXT);
    assert.equal(rec.area_m2, 33.6);
  });
  it('parses address with Chałubińskiego', () => {
    const rec = parseAnnouncement(ANN_TEXT);
    assert.ok(rec.address, 'address must be parsed');
    assert.match(rec.address.street_norm, /chalubi/i);
    assert.equal(rec.address.building, '8');
    assert.equal(rec.address.apt, '5');
  });
  it('returns null when no address', () => {
    assert.equal(parseAnnouncement('brak adresu, brak przetargu'), null);
    assert.equal(parseAnnouncement(''), null);
    assert.equal(parseAnnouncement(null), null);
  });
});

// ----------------------------------------------------------------- parseResultDoc

describe('parseResultDoc — result SOLD (Staffa 25/1)', () => {
  // Fixture from https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/…staffa-nr-25-lokal-nr-1-…
  const SOLD_TEXT = `
Adres nieruchomości 26-110 Skarżysko-Kamienna, ul. Staffa nr 25, lokal nr 1 - informacja o wyniku przetargu
Cena wywoławcza 31 600,00 zł
Data przetargu 14.05.2024

INFORMACJA O WYNIKU PRZETARGU
NA SPRZEDAŻ LOKALU MIESZKALNEGO USYTUOWANEGO
W SKARŻYSKU-KAMIENNEJ PRZY ul. Staffa 25/1

Prezydent Miasta Skarżyska-Kamiennej informuje, że w dniu 14 maja 2024 r. w siedzibie Urzędu Miasta w Skarżysku-Kamiennej przy ul. Sikorskiego nr 18 odbył się ustny nieograniczony przetarg na sprzedaż lokalu mieszkalnego nr 1 znajdującego się w budynku przy ul. Staffa 25 w Skarżysku-Kamiennej o powierzchni 14,00 m2, usytuowanego na działce oznaczonej w ewidencji gruntów i budynków numerem 10/1.

Do przetargu dopuszczono 1 osobę.

Cena wywoławcza została ustalona na kwotę 31.600,00 zł.

Przetarg zakończył się wynikiem pozytywnym.

Najwyższa cena jak została osiągnięta w przetargu wyniosła 31.920,00 zł.

Nabywcą nieruchomości został Pan Marcin Warzocha.

Skarżysko-Kamienna, dn. 22.05.2024.
`;

  it('returns exactly 1 record', () => {
    const recs = parseResultDoc(SOLD_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/x');
    assert.equal(recs.length, 1);
  });
  it('outcome=sold', () => {
    const [rec] = parseResultDoc(SOLD_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/x');
    assert.equal(rec.outcome, 'sold');
  });
  it('final_price_pln=31920', () => {
    const [rec] = parseResultDoc(SOLD_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/x');
    assert.equal(rec.final_price_pln, 31920);
  });
  it('starting_price_pln=31600', () => {
    const [rec] = parseResultDoc(SOLD_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/x');
    assert.equal(rec.starting_price_pln, 31600);
  });
  it('auction_date=2024-05-14', () => {
    const [rec] = parseResultDoc(SOLD_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/x');
    assert.equal(rec.auction_date, '2024-05-14');
  });
  it('round=null (no ordinal in text)', () => {
    const [rec] = parseResultDoc(SOLD_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/x');
    assert.equal(rec.round, null);
  });
  it('area_m2=14', () => {
    const [rec] = parseResultDoc(SOLD_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/x');
    assert.equal(rec.area_m2, 14);
  });
  it('address.street_norm contains "staffa"', () => {
    const [rec] = parseResultDoc(SOLD_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/x');
    assert.ok(rec.address, 'address must be parsed');
    assert.match(rec.address.street_norm, /staffa/i);
  });
  it('no critical parse notes', () => {
    const [rec] = parseResultDoc(SOLD_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/x');
    const critical = rec.notes.filter((n) => n.includes('missing starting price') || n.includes('sold but missing'));
    assert.equal(critical.length, 0, `unexpected notes: ${JSON.stringify(rec.notes)}`);
  });
});

describe('parseResultDoc — result UNSOLD/wadium (Chałubińskiego 8/5 round 3)', () => {
  // Fixture from https://bip.skarzysko.pl/przetarg-nieruchomosci/10876/…informacja-o-wyniku-trzeciego-przetargu
  const UNSOLD_WADIUM_TEXT = `
Adres nieruchomości 26-110 Skarżysko-Kamienna, ul. Chałubińskiego Nr 8, lokal nr 5 - Informacja o wyniku trzeciego przetargu
Cena wywoławcza 95.800,00 zł
Data przetargu 14.01.2025 godz. 09:00

INFORMACJA O WYNIKU TRZECIEGO PRZETARGU
NA SPRZEDAŻ LOKALU MIESZKALNEGO USYTUOWANEGO
W SKARŻYSKU-KAMIENNEJ PRZY ul. Chałubińskiego 8/5

Prezydent Miasta Skarżyska-Kamiennej informuje, że w dniu 14 stycznia 2025 r. w siedzibie Urzędu Miasta w Skarżysku-Kamiennej przy ul. Sikorskiego nr 18 odbył się trzeci ustny nieograniczony przetarg na sprzedaż lokalu mieszkalnego przy ul. Chałubińskiego 8/5 w Skarżysku-Kamiennej o powierzchni 33,60 m2.

Cena wywoławcza została ustalona na kwotę 95.800,00 zł (słownie: dziewięćdziesiąt pięć tysięcy osiemset złotych 00/100).

Na przedmiotowy lokal nie zostało wpłacone wadium, a w związku z tym przetarg zakończył się wynikiem negatywnym.

Skarżysko-Kamienna, dn. 16.01.2025.
`;

  it('outcome=unsold', () => {
    const recs = parseResultDoc(UNSOLD_WADIUM_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/10876/x');
    assert.equal(recs.length, 1);
    assert.equal(recs[0].outcome, 'unsold');
  });
  it('final_price_pln=null', () => {
    const [rec] = parseResultDoc(UNSOLD_WADIUM_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/10876/x');
    assert.equal(rec.final_price_pln, null);
  });
  it('starting_price_pln=95800', () => {
    const [rec] = parseResultDoc(UNSOLD_WADIUM_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/10876/x');
    assert.equal(rec.starting_price_pln, 95800);
  });
  it('round=3', () => {
    const [rec] = parseResultDoc(UNSOLD_WADIUM_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/10876/x');
    assert.equal(rec.round, 3);
  });
  it('auction_date=2025-01-14', () => {
    const [rec] = parseResultDoc(UNSOLD_WADIUM_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/10876/x');
    assert.equal(rec.auction_date, '2025-01-14');
  });
  it('no spurious "no explicit negative" note', () => {
    const [rec] = parseResultDoc(UNSOLD_WADIUM_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/10876/x');
    const bad = rec.notes.filter((n) => n.includes('no explicit negative'));
    assert.equal(bad.length, 0, `unexpected note: ${JSON.stringify(rec.notes)}`);
  });
});

describe('parseResultDoc — result UNSOLD/brak oferentów (Staffa 13/2 round 5)', () => {
  // Fixture from https://bip.skarzysko.pl/przetarg-nieruchomosci/8141/…staffa-13-2-informacja-o-wyniku-przetargu
  const UNSOLD_BRAK_TEXT = `
Adres nieruchomości 26-110 Skarzysko-Kamienna ul. Staffa 13/2 - informacja o wyniku przetargu
Cena wywoławcza 62 920,00 zł
Data przetargu 21.03.2023

INFORMACJA O WYNIKU PRZETARGU
NA SPRZEDAŻ LOKALU MIESZKALNEGO USYTUOWANEGO
W SKARŻYSKU-KAMIENNEJ PRZY ul. Staffa 13/2

Prezydent Miasta Skarżyska-Kamiennej informuje, że w dniu 21 marca 2023 r. w siedzibie Urzędu Miasta w Skarżysku-Kamiennej przy ul. Sikorskiego nr 18 odbył się piąty ustny nieograniczony przetarg na sprzedaż lokalu mieszkalnego przy ul. Staffa 13/2 w Skarżysku-Kamiennej o powierzchni 33,00 m2.

Cena wywoławcza została ustalona na kwotę 62.920,00 zł (słownie: sześćdziesiąt dwa tysiące dziewięćset dwadzieścia złotych 00/100).

W związku z brakiem oferentów przetarg zakończył się wynikiem negatywnym.
`;

  it('outcome=unsold', () => {
    const recs = parseResultDoc(UNSOLD_BRAK_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/8141/x');
    assert.equal(recs.length, 1);
    assert.equal(recs[0].outcome, 'unsold');
  });
  it('round=5', () => {
    const [rec] = parseResultDoc(UNSOLD_BRAK_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/8141/x');
    assert.equal(rec.round, 5);
  });
  it('starting_price_pln=62920', () => {
    const [rec] = parseResultDoc(UNSOLD_BRAK_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/8141/x');
    assert.equal(rec.starting_price_pln, 62920);
  });
  it('auction_date=2023-03-21', () => {
    const [rec] = parseResultDoc(UNSOLD_BRAK_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/8141/x');
    assert.equal(rec.auction_date, '2023-03-21');
  });
  it('area_m2=33', () => {
    const [rec] = parseResultDoc(UNSOLD_BRAK_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/8141/x');
    assert.equal(rec.area_m2, 33);
  });
  it('no spurious "no explicit negative" note', () => {
    const [rec] = parseResultDoc(UNSOLD_BRAK_TEXT, null, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/8141/x');
    const bad = rec.notes.filter((n) => n.includes('no explicit negative'));
    assert.equal(bad.length, 0, `unexpected note: ${JSON.stringify(rec.notes)}`);
  });
});

describe('parseResultDoc — rejects non-result text', () => {
  it('returns [] for announcement text', () => {
    assert.deepEqual(
      parseResultDoc('OGŁOSZENIE O PRZETARGU ogłasza pierwszy przetarg', null, 'https://example.com'),
      [],
    );
  });
  it('returns [] for empty', () => {
    assert.deepEqual(parseResultDoc('', null, ''), []);
    assert.deepEqual(parseResultDoc(null, null, ''), []);
  });
});

// ----------------------------------------------------------------- parseListingPage (crawl)

describe('parseListingPage', () => {
  const LISTING_HTML = `
<div id="main-content">
<a href="https://bip.skarzysko.pl/przetarg-nieruchomosci/12394/26-110-skarzysko-kamienna-ul-fabryczna">ul. Fabryczna</a>
<a href="https://bip.skarzysko.pl/przetarg-nieruchomosci/12660/26-110-skarzysko-kamienna-ul-fabryczna-informacja-o-wyniku-przetargu">wynik ul. Fabryczna</a>
<a href="https://bip.skarzysko.pl/przetarg-nieruchomosci/10586/26-110-skarzysko-kamienna-ul-chalubinskiego-nr-8-lokal-nr-5">ul. Chałubińskiego</a>
</div>
`;

  it('finds 3 article links', () => {
    const refs = parseListingPage(LISTING_HTML);
    assert.equal(refs.length, 3);
  });
  it('first ref has correct id and url', () => {
    const refs = parseListingPage(LISTING_HTML);
    assert.equal(refs[0].id, '12394');
    assert.equal(refs[0].url, 'https://bip.skarzysko.pl/przetarg-nieruchomosci/12394/26-110-skarzysko-kamienna-ul-fabryczna');
  });
  it('deduplicates repeated ids', () => {
    const html = `
      <a href="https://bip.skarzysko.pl/przetarg-nieruchomosci/999/test-a">a</a>
      <a href="https://bip.skarzysko.pl/przetarg-nieruchomosci/999/test-a">a-dup</a>
    `;
    const refs = parseListingPage(html);
    assert.equal(refs.length, 1);
  });
  it('returns [] for empty HTML', () => {
    assert.deepEqual(parseListingPage(''), []);
    assert.deepEqual(parseListingPage(null), []);
  });
});
