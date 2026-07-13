// Lębork parse tests — groundtruthed against REAL notices captured live from
// bip.um.lebork.pl on 2026-07-13 (see the REAL fixtures below: their title+body are
// the verbatim board-row title and stripped <article> body the crawler produces).
// Zero-bloat: assert exact parser output; the runner is silenced to failures only.
//
// Coverage: a single-flat round-II announcement (prior-round DATE trap + office
// address trap), a 3-lokal announcement (multi-split incl. an "oficyna" middle
// unit), a NEGATIVE flat result (result prose drops "ul."), and a SOLD tabular
// LAND result (bare area abuts the price). Plus the doc-type gates and helpers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRecordText, parseAnnouncement, parseResultDoc,
  isSaleAuction, isResultDoc, isLandNotice, isLease, isRokowania, isCancelled,
  isNegativeOutcome, roundFromText, auctionDateFromText, startingPriceFromText,
  wadiumFromText, parsePLN, parseNum,
} from '../src/cities/lebork/parse.js';

// Verbatim real captures (title = board-row link text; body = stripped article text).
const REAL = {
  "flatAnn": {
    "url": "https://bip.um.lebork.pl/artykul/burmistrz-miasta-leborka-oglasza-ii-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalne-1",
    "title": "Burmistrz miasta Lęborka ogłasza II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego w budynku wielolokalowym w Lęborku.",
    "date": "2026-07-09",
    "body": "Burmistrz miasta Lęborka ogłasza II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego w budynku wielolokalowym w Lęborku. Przetarg na sprzedaż lokalu mieszkalnego nr 3 o powierzchni 42,25 m2 (lokal mieszkalny składa się z 2 pokoi, kuchni, WC) przy ul. Łokietka 24 wraz ze sprzedażą 152/1000 udziału w nieruchomości stanowiącej działkę nr 345/1 obręb 3 o powierzchni 183 m2, KW SL1L/00024622/3. Nieruchomość jest wolna od obciążeń i nie jest przedmiotem zobowiązań. Lokal posiada świadectwo charakterystyki energetycznej. Zgodnie z planem miejscowym zagospodarowania przestrzennego miasta Lęborka nieruchomość znajduje się na terenie elementarnym 02.05.MC o przeznaczeniu – mieszkalnictwo i usługi. I przetarg ustny nieograniczony został przeprowadzony w dniu 27.05.2026r. Przetarg odbędzie się 12.08.2026r. o godz. 11.30 w sali nr 101 Urzędu Miejskiego w Lęborku przy ul. Armii Krajowej 14. Cena wywoławcza 120.000,00 zł Nabywca zobowiązany jest do zapłaty wylicytowanej w przetargu ceny nieruchomości na którą składają się cena lokalu oraz udział w gruncie. Cena osiągnięta w przetargu podlega zapłacie najpóźniej do dnia zawarcia umowy notarialnej. Warunkiem uczestnictwa w przetargu jest wpłacenie wadium w wysokości 12.000,00 zł. Wadium w pieniądzu (z oznaczeniem dokładnego adresu lokalu) będzie można wpłacać w Banku Pekao SA na konto Gminy Miasto Lębork Nr 21 1240 1268 1111 0010 8729 0508 lub przelewem na powyższe konto nie później niż do dnia 06.08.2026r. W razie wpłat na konto przelewem, wadia powinno być wnoszone z takim wyprzedzeniem, aby środki pieniężne znalazły się na rachunku bankowym najpóźniej w dniu 06.08.2026r. - pod rygorem uznania przez organizatora przetargu, że warunek wpłaty nie został spełniony. Wniesienie wadium przez uczestnika przetargu oznacza, że uczestnik zapoznał się ze stanem nieruchomości oraz warunkami przetargu określonymi w ogłoszeniu. Do przetargów dopuszczone zostaną osoby fizyczne lub prawne, które wpłacą wadium w wyznaczonym terminie, stawią się na przetarg osobiście lub w ich imieniu stawią się ich pełnomocnicy, okazujący się stosownym pełnomocnictwem, sporządzonym w formie aktu notarialnego lub w innej formie z potwierdzeniem zgodności podpisów przez notariusza, a w przypadku osób prawnych dodatkowo dokumentami określonymi przepisami prawa, uprawniającymi do wzięcia udziału w przetargu, przedłożą komisji przetargowej dowód stwierdzający tożsamość. W przypadku małżonków, którzy nabywać będą nieruchomość do majątku wspólnego do dokonywania czynności przetargowych konieczna jest obecność obojga małżonków lub jednego z nich ze stosownym pełnomocnictwem (niekoniecznie w formie aktu notarialnego) drugiego małżonka, zawierającym dodatkowo zgodę na odpłatne nabycie nieruchomości. W przetargach mogą brać udział osoby fizyczne i prawne oraz cudzoziemcy na zasadach określonych w ustawie z dnia 24 marca 1920 r. o nabywaniu nieruchomości przez cudzoziemców (Dz. U. z 2014r. poz. 1380). Uczestnikom przetargu, którzy nie zostali dopuszczeni do przetargu lub nie brali udziału w licytacji, a także nie wygrali przetargu wadium zostanie zwrócone w dniu 13.08.2026r. w godz. 12.00-17.00 w Banku Pekao SA Oddział w Lęborku przy ul. Armii Krajowej 18 lub przelewem do dnia 13.08.2026r. na wskazane konto. Jeżeli osoba ustalona jako nabywca nieruchomości nie przystąpi bez usprawiedliwienia w oznaczonym terminie do umowy notarialnej organizator przetargu może odstąpić od zawarcia umowy, a wpłacone wadium nie podlega zwrotowi. Organizator przetargu, zawiadomi osobę ustaloną jako nabywcę nieruchomości o miejscu i terminie zawarcia umowy sprzedaży, najpóźniej w ciągu 21 dni od dnia rozstrzygnięcia przetargów. Gmina Miasto Lębork jako organizator przetargu obliguje nabywcę do zawarcia umowy notarialnej w Kancelarii Notarialnej na terenie miasta Lęborka. Koszty zawarcia umowy notarialnej oraz koszty wpisów wieczysto-księgowych obciążają nabywcę. Dokumentacja dotycząca przedmiotu przetargu znajduje się w Wydziale Gospodarki Nieruchomościami na I piętrze UM (pokój 119) i jest do wglądu w godz. 7.00-14.00 tel. 059 8637750. Ogłoszenie o przetargu zamieszczone jest na stronie internetowej UM Lębork www.lebork.pl , Biuletynie Informacji Publicznej UM Lębork oraz na tablicy ogłoszeń UM Lębork. Zastrzega się prawo do odwołania przetargów z ważnych powodów. Burmistrz Miasta poda do publicznej wiadomości informację o odwołaniu, z podaniem uzasadnionej przyczyny. www.lebork.pl"
  },
  "multiLokal": {
    "url": "https://bip.um.lebork.pl/artykul/burmistrz-miasta-leborka-oglasza-i-przetargi-ustne-nieograniczone-na-sprzedaz-lokali-mieszkalny-5",
    "title": "Burmistrz miasta Lęborka ogłasza I przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych w budynkach wielolokalowych w Lęborku.",
    "date": "2026-07-09",
    "body": "Burmistrz miasta Lęborka ogłasza I przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych w budynkach wielolokalowych w Lęborku. 1. Sprzedaż lokalu mieszkalnego nr 5 o powierzchni 29,31 m2 (lokal mieszkalny składa się z 2 pokoi, kuchni, łazienki) przy ul. Skłodowskiej 22 wraz ze sprzedażą 634/10000 udziału w nieruchomości stanowiącej działkę nr 13/4 obręb 8 o powierzchni 239 m2,KW SL1L/00023592/6. Nieruchomość jest wolna od obciążeń i nie jest przedmiotem zobowiązań. Lokal posiada świadectwo charakterystyki energetycznej. Zgodnie z planem miejscowym zagospodarowania przestrzennego miasta Lęborka nieruchomość znajduje się na terenie elementarnym 9.MC.16 o przeznaczeniu tereny zabudowy mieszkaniowej i usługowej. Przetarg odbędzie się 12.08.2026r. o godz. 9.00 w sali nr 101 Urzędu Miejskiego w Lęborku przy ul. Armii Krajowej 14. Cena wywoławcza 113.000,00 zł Nabywca zobowiązany jest do zapłaty wylicytowanej w przetargu ceny nieruchomości na którą składają się cena lokalu oraz udział w gruncie. Cena osiągnięta w przetargu podlega zapłacie najpóźniej do dnia zawarcia umowy notarialnej. Warunkiem uczestnictwa w przetargu jest wpłacenie wadium w wysokości 12.000,00 zł. 2. Sprzedaż lokalu mieszkalnego nr 17 oficyna o powierzchni 21,46 m2 (lokal mieszkalny składa się z 1 pokoju, kuchni, WC) przy ul. Skłodowskiej 22 wraz ze sprzedażą 464/10000 udziału w nieruchomości stanowiącej działkę nr 13/4 obręb 8 o powierzchni 239 m2,KW SL1L/00023592/6. Nieruchomość jest wolna od obciążeń i nie jest przedmiotem zobowiązań. Lokal posiada świadectwo charakterystyki energetycznej. Zgodnie z planem miejscowym zagospodarowania przestrzennego miasta Lęborka nieruchomość znajduje się na terenie elementarnym 9.MC.16 o przeznaczeniu tereny zabudowy mieszkaniowej i usługowej. Przetarg odbędzie się 12.08.2026r. o godz. 9.30 w sali nr 101 Urzędu Miejskiego w Lęborku przy ul. Armii Krajowej 14. Cena wywoławcza 72.000,00 zł Nabywca zobowiązany jest do zapłaty wylicytowanej w przetargu ceny nieruchomości na którą składają się cena lokalu oraz udział w gruncie. Cena osiągnięta w przetargu podlega zapłacie najpóźniej do dnia zawarcia umowy notarialnej. Warunkiem uczestnictwa w przetargu jest wpłacenie wadium w wysokości 8.000,00 zł. 3. Sprzedaż lokalu mieszkalnego nr 2 o powierzchni 41,82 m2 (lokal mieszkalny składa się z 2 pokoi, kuchni, łazienki z WC i przedpokoju) przy ul. M. Reja 26 wraz ze sprzedażą 94/1000 udziału w nieruchomości stanowiącej działkę nr 18 obręb 8 o powierzchni 279 m2, KW SL1L/00005470/3. Nieruchomość jest wolna od obciążeń i nie jest przedmiotem zobowiązań. Lokal posiada świadectwo charakterystyki energetycznej. Zgodnie z planem miejscowym zagospodarowania przestrzennego miasta Lęborka nieruchomość znajduje się na terenie elementarnym 9.MC.16 o przeznaczeniu tereny zabudowy mieszkaniowej i usługowej. Przetarg odbędzie się 12.08.2026r. o godz. 10.00 w sali nr 101 Urzędu Miejskiego w Lęborku przy ul. Armii Krajowej 14. Cena wywoławcza 158.000,00 zł Nabywca zobowiązany jest do zapłaty wylicytowanej w przetargu ceny nieruchomości na którą składają się cena lokalu oraz udział w gruncie. Cena osiągnięta w przetargu podlega zapłacie najpóźniej do dnia zawarcia umowy notarialnej. Warunkiem uczestnictwa w przetargu jest wpłacenie wadium w wysokości 16.000,00 zł. Ogólne warunki przetargów: Wadium w pieniądzu (z oznaczeniem dokładnego adresu lokalu) będzie można wpłacać w Banku Pekao SA na konto Gminy Miasto Lębork Nr 21 1240 1268 1111 0010 8729 0508 lub przelewem na powyższe konto nie później niż do dnia 06.08.2026r. W razie wpłat na konto przelewem, wadia powinno być wnoszone z takim wyprzedzeniem, aby środki pieniężne znalazły się na rachunku bankowym najpóźniej w dniu 06.08.2026r. - pod rygorem uznania przez organizatora przetargu, że warunek wpłaty nie został spełniony. Wniesienie wadium przez uczestnika przetargu oznacza, że uczestnik zapoznał się ze stanem nieruchomości oraz warunkami przetargu określonymi w ogłoszeniu. Do przetargów dopuszczone zostaną osoby fizyczne lub prawne, które wpłacą wadium w wyznaczonym terminie, stawią się na przetarg osobiście lub w ich imieniu stawią się ich pełnomocnicy, okazujący się stosownym pełnomocnictwem, sporządzonym w formie aktu notarialnego lub w innej formie z potwierdzeniem zgodności podpisów przez notariusza, a w przypadku osób prawnych dodatkowo dokumentami określonymi przepisami prawa, uprawniającymi do wzięcia udziału w przetargu, przedłożą komisji przetargowej dowód stwierdzający tożsamość. W przypadku małżonków, którzy nabywać będą nieruchomość do majątku wspólnego do dokonywania czynności przetargowych konieczna jest obecność obojga małżonków lub jednego z nich ze stosownym pełnomocnictwem (niekoniecznie w formie aktu notarialnego) drugiego małżonka, zawierającym dodatkowo zgodę na odpłatne nabycie nieruchomości. W przetargach mogą brać udział osoby fizyczne i prawne oraz cudzoziemcy na zasadach określonych w ustawie z dnia 24 marca 1920 r. o nabywaniu nieruchomości przez cudzoziemców (Dz. U. z 2014r. poz. 1380). Uczestnikom przetargu, którzy nie zostali dopuszczeni do przetargu lub nie brali udziału w licytacji, a także nie wygrali przetargu wadium zostanie zwrócone w dniu 13.08.2026r. w godz. 12.00-17.00 w Banku Pekao SA Oddział w Lęborku przy ul. Armii Krajowej 18 lub przelewem do dnia 13.08.2026r. na wskazane konto. Jeżeli osoba ustalona jako nabywca nieruchomości nie przystąpi bez usprawiedliwienia w oznaczonym terminie do umowy notarialnej organizator przetargu może odstąpić od zawarcia umowy, a wpłacone wadium nie podlega zwrotowi. Organizator przetargów, zawiadomi osobę ustaloną jako nabywcę nieruchomości o miejscu i terminie zawarcia umowy sprzedaży, najpóźniej w ciągu 21 dni od dnia rozstrzygnięcia przetargów. Gmina Miasto Lębork jako organizator przetargów obliguje nabywcę do zawarcia umowy notarialnej w Kancelarii Notarialnej na terenie miasta Lęborka. Koszty zawarcia umowy notarialnej oraz koszty wpisów wieczysto-księgowych obciążają nabywcę. Dokumentacja dotycząca przedmiotu przetargu znajduje się w Wydziale Gospodarki Nieruchomościami na I piętrze UM (pokój 119) i jest do wglądu w godz. 7.00-14.00 tel. 059 8637750. Ogłoszenia o przetargach zamieszczone są na stronie internetowej UM Lębork www.lebork.pl , Biuletynie Informacji Publicznej UM Lębork oraz na tablicy ogłoszeń UM Lębork (parter i I piętro). Zastrzega się prawo do odwołania przetargów z ważnych powodów. Burmistrz Miasta poda do publicznej wiadomości informację o odwołaniu, z podaniem uzasadnionej przyczyny. www.lebork.pl"
  },
  "flatRes": {
    "url": "https://bip.um.lebork.pl/artykul/informacja-o-wyniku-i-przetargu-ustnego-nieograniczonego-przeprowadzonego-w-dniu-27-05-2026r-lo",
    "title": "Informacja o wyniku I przetargu ustnego nieograniczonego przeprowadzonego w dniu 27.05.2026r. - Łokietka 24/3",
    "date": "2026-06-05",
    "body": "Informacja o wyniku I przetargu ustnego nieograniczonego przeprowadzonego w dniu 27.05.2026r. - Łokietka 24/3 BURMISTRZ MIASTA LĘBORKA podaję do publicznej wiadomości informację o wyniku I przetargu ustnego nieograniczonego przeprowadzonego w dniu 27.05.2026r. w Urzędzie Miejskim w Lęborku. Przedmiotem przetargu była sprzedaż lokalu mieszkalnego nr 3 o pow. 42,25 m2, usytuowanego w budynku wielolokalowym przy Łokietka 24 wraz ze sprzedażą 152/1000 udziału w nieruchomości stanowiącej działkę nr 345/1 obręb 3, o powierzchni 183 m2, KW SL1L/00024622/3. - cena wywoławcza 140.000,00 zł Przetarg zakończył się wynikiem negatywnym, ponieważ nikt nie przystąpił do przetargu. Nie było osób niedopuszczonych do uczestnictwa w przetargu."
  },
  "landRes": {
    "url": "https://bip.um.lebork.pl/artykul/informacja-o-wyniku-iii-przetargu-ustnego-nieograniczonego-ktory-zostal-przeprowadzony-w-dniu-1-3",
    "title": "Informacja o wyniku III przetargu ustnego nieograniczonego, który został przeprowadzony w dniu 11.03.2026 r.",
    "date": "2026-03-19",
    "body": "Informacja o wyniku III przetargu ustnego nieograniczonego, który został przeprowadzony w dniu 11.03.2026 r. BURMISTRZ MIASTA LĘBORKA podaje do publicznej wiadomości informację o wyniku III przetargu ustnego nieograniczonego, który został przeprowadzony w dniu 11.03.2026 r. o godz. 10.00 w Urzędzie Miejskim w Lęborku (Sala nr 101) w sprawie sprzedaży nieruchomości gruntowej niezabudowanej, położonej w obrębie 4 miasta Lęborka przy ul. Polnej, uregulowanej w księdze wieczystej SL1L/00014921/6. Nr działki Pow. działki (m 2 ) Cena wywoławcza netto do III przetargu Osoby dopuszczone do III przetargu Osoby niedopuszczone do III przetargu Cena nabycia brutto Nabywca 132/5 2392 210.000,00 zł 1 brak 260.883,00 zł Joanna Katarzyna i Damian Zenon małżonkowie Mańscy"
  }
};

const blob = (k) => buildRecordText({ title: REAL[k].title, body: REAL[k].body });

test('flatAnn: single round-II flat — office+prior-round traps avoided', () => {
  const recs = parseAnnouncement(blob('flatAnn'));
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'Łokietka 24/3');            // property, NOT office "Armii Krajowej 14"
  assert.equal(r.address.key, 'lokietka|24|3');
  assert.equal(r.area_m2, 42.25);
  assert.equal(r.starting_price_pln, 120000);
  assert.equal(r.wadium_pln, 12000);
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-08-12');              // future "odbędzie się", NOT prior-round 27.05
});

test('multiLokal: 3 flats split — incl. the "oficyna" middle unit', () => {
  const recs = parseAnnouncement(blob('multiLokal'));
  assert.equal(recs.length, 3);
  assert.deepEqual(recs.map((r) => r.address_raw),
    ['Skłodowskiej 22/5', 'Skłodowskiej 22/17', 'M. Reja 26/2']);
  assert.deepEqual(recs.map((r) => r.area_m2), [29.31, 21.46, 41.82]);
  assert.deepEqual(recs.map((r) => r.starting_price_pln), [113000, 72000, 158000]);
  assert.deepEqual(recs.map((r) => r.wadium_pln), [12000, 8000, 16000]);
  assert.ok(recs.every((r) => r.round === 1 && r.auction_date === '2026-08-12'));
  assert.ok(recs.every((r) => r.kind === 'mieszkalny'));
});

test('flatRes: negative flat result — "ul."-less address still parsed', () => {
  const recs = parseResultDoc(blob('flatRes'), REAL.flatRes.date, REAL.flatRes.url);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'Łokietka 24/3');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 140000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.auction_date, '2026-05-27');
  assert.equal(r.source_url, REAL.flatRes.url);
});

test('landRes: sold tabular land result — bare area does not corrupt price', () => {
  const recs = parseResultDoc(blob('landRes'), REAL.landRes.date, REAL.landRes.url);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '132/5');
  assert.equal(r.area_m2, 2392);
  assert.equal(r.starting_price_pln, 210000);             // NOT "392 210.000,00"
  assert.equal(r.final_price_pln, 260883);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2026-03-11');
});

test('doc-type gates on the real fixtures', () => {
  assert.ok(isSaleAuction(blob('flatAnn')) && !isResultDoc(blob('flatAnn')));
  assert.ok(isSaleAuction(blob('multiLokal')) && !isResultDoc(blob('multiLokal')));
  assert.ok(isResultDoc(blob('flatRes')) && isNegativeOutcome(blob('flatRes')));
  assert.ok(isResultDoc(blob('landRes')) && isLandNotice(blob('landRes')));
  assert.ok(!isLandNotice(blob('flatAnn')) && !isLandNotice(blob('flatRes')));
  // none of the real notices are leases / rokowania / cancellations
  for (const k of ['flatAnn', 'multiLokal', 'flatRes', 'landRes']) {
    assert.ok(!isLease(blob(k)) && !isRokowania(blob(k)) && !isCancelled(blob(k)));
  }
});

test('gates: lease / rokowania / cancellation are recognised (crawler skips them)', () => {
  const lease = buildRecordText({ title: 'Wykaz nieruchomości do oddania w dzierżawę', body: 'przeznaczona do oddania w dzierżawę na czas oznaczony; czynsz dzierżawny 100 zł' });
  assert.ok(isLease(lease));
  const rok = buildRecordText({ title: 'Ogłoszenie o rokowaniach na sprzedaż nieruchomości', body: 'rokowania po drugim przetargu zakończonym wynikiem negatywnym' });
  assert.ok(isRokowania(rok));
  const canc = buildRecordText({ title: 'Odwołanie przetargów', body: 'Burmistrz odwołuje przetarg ustny nieograniczony ogłoszony na dzień 10.05.2026r.' });
  assert.ok(isCancelled(canc));
});

test('helpers: parsePLN / parseNum / round / date / price', () => {
  assert.equal(parsePLN('161.000,00'), 161000);
  assert.equal(parsePLN('1 500 000,00'), 1500000);
  assert.equal(parsePLN(''), null);
  assert.equal(parseNum('33,02'), 33.02);
  assert.equal(parseNum('2392'), 2392);
  // round anchors on the TITLE Roman, never a street Roman ("Mieszka I")
  assert.equal(roundFromText(buildRecordText({ title: 'ogłasza III przetarg ustny', body: 'lokalu przy ul. Mieszka I 14B' })), 3);
  // date prefers the future "odbędzie się" over a prior-round "przeprowadzony w dniu"
  assert.equal(auctionDateFromText('I przetarg został przeprowadzony w dniu 27.05.2026r. Przetarg odbędzie się 12.08.2026r.'), '2026-08-12');
  assert.equal(startingPriceFromText('cena wywoławcza 120.000,00 zł, wadium 12.000,00 zł'), 120000);
  assert.equal(wadiumFromText('wadium w wysokości 8.000,00 zł'), 8000);
});
