// Drawsko Pomorskie parser tests.
//
// Fixtures are the REAL JSON-LD NewsArticle nodes captured live 2026-07-05 from
// drawsko.pl/aktualnosci-2/33-nieruchomosci/ (verbatim headline + datePublished
// + articleBody). Each is wrapped back into a <script type="application/ld+json">
// page so the test exercises the full path: extractArticleBody -> parse*.
//
//   ANNOUNCEMENT ann  - ul. Ratuszowa 7/2: 47.30 m2, 75 900 zl, I przetarg, 2025-07-10
//   ANNOUNCEMENT ann2 - ul. Gen. Wl. Sikorskiego 21/4: 11.60 m2, 24 400 zl, 2025-07-10
//   RESULT res  - ul. Gen. Wl. Sikorskiego 4/4: II przetarg 2025-01-23, 79 000 -> 79 790 zl, Tomasz Noga
//   RESULT res2 - Borne 1/1 (share 640/100): II przetarg 2021-09-02, 28 700 -> 29 000 zl
//   RESULT res3 - ul. 11 Pulku Piechoty 59/1: III przetarg 2023-11-23, 55 000 -> 77 050 zl

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractArticleBody,
  parseAnnouncement,
  parseResultDoc,
  parseListingLinks,
  parsePLN,
  parseArea,
  roundFromText,
  isFlatSlug,
  isResultSlug,
  isAnnouncementSlug,
} from '../src/cities/drawsko-pomorskie/parse.js';

const LD = JSON.parse(String.raw`{"ann":{"headline":"I przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej, położonej na terenie miasta Drawsko Pomorskie - lokal mieszkalny ul. Ratuszowa 7/2","datePublished":"2025-06-09 10:12:07","articleBody":"O G Ł O S Z E N I E  Na podstawie art. 38 ustawy z&nbsp;dnia 21 sierpnia 1997 roku o&nbsp;gospodarce nieruchomościami (Dz. U. z&nbsp;2024 r. poz. 1145 ze zm.) oraz&nbsp;&sect; 13 rozporządzenia Rady Ministr&oacute;w z&nbsp;dnia 14 września 2004 roku w&nbsp;sprawie sposobu i&nbsp;trybu przeprowadzania przetarg&oacute;w oraz&nbsp;rokowań na&nbsp;zbycie nieruchomości (Dz. U. z&nbsp;2021 r. poz. 2213) - Burmistrz Drawska Pomorskiego ogłasza I przetarg ustny nieograniczony na&nbsp;sprzedaż nieruchomości zabudowanej, położonej na&nbsp;terenie miasta Drawsko Pomorskie.                  Lp.      Adres nieruchomości      Oznaczenie  geodezyjne      Pow.  działki w&nbsp;ha      Nr księgi  Wieczystej      Opis nieruchomości      Cena  wywoławcza      Uwagi          1.      ul. Ratuszowa 7/2  78-500 Drawsko Pomorskie,  powiat drawski,  woj. zachodniopomorskie      działki nr  236/1 i&nbsp;236/2  obręb 0011  miasta  Drawsko Pom.      pow. działek  0,0545 ha  &nbsp;  pow. lokalu  47,30 m2      KO1D/00021722/7      &nbsp;  Lokal mieszkalny położony przy ul. Ratuszowej 7/2 w&nbsp;Drawsku Pomorskim. Lokal składa się z&nbsp;jednego pokoju, kuchni i&nbsp;ubikacji, a&nbsp;jego powierzchnia wynosi 47,30 m2 . Do lokalu przynależy piwnica o&nbsp;pow. 4,20 m2. Lokal znajduje się na&nbsp;parterze w&nbsp;budynku częściowo podpiwniczonym, dwukondygnacyjnym.  W planie zagospodarowania przestrzennego działki posiadają zapis 75 MW,U &ndash; zabudowa mieszkaniowa wielorodzinna, zabudowa usługowa. Nieruchomość zabudowana jest budynkiem mieszkalnym wielorodzinnym.      75.900,00 zł      Przetarg ustny nieograniczony          Przetarg odbędzie się w&nbsp;siedzibie Urzędu Miejskiego w&nbsp;Drawsku Pomorskim przy ul. Sikorskiego 41, dnia 10 lipca 2025r. o&nbsp;godz. 1000 w pokoju nr 304. Warunkiem przystąpienia do przetargu jest wpłacenie wadium w&nbsp;formie pieniężnej w&nbsp;wysokości 15.000,- zł z podaniem numeru działki na&nbsp;dowodzie wpłaty w&nbsp;takim terminie, aby możliwe było stwierdzenie jego zaksięgowania, najp&oacute;źniej 7 lipca 2025 roku. Wpłaty wadium można dokonać przelewem na&nbsp;konto tut. urzędu nr 12 1020 2847 0000 1702 0009 6602 w&nbsp;PKO BP o/ Drawsko Pomorskie. Osobom, kt&oacute;re przetarg przegrały wadium zostanie zwr&oacute;cone niezwłocznie po odwołaniu lub&nbsp;zamknięciu przetargu nie p&oacute;źniej jednak&nbsp;niż przed upływem 3 dni od dnia odwołania, zamknięcia, unieważnienia lub&nbsp;zakończenia wynikiem negatywnym przetargu.   Uczestnicy przetargu muszą okazać komisji przetargowej ważne dowody osobiste, dowody potwierdzające wpłacenie wadium oraz&nbsp;ewentualne pełnomocnictwa do brania udziału w&nbsp;przetargu w&nbsp;imieniu osoby trzeciej.  O wysokości postąpienia decydują uczestnicy przetargu, z&nbsp;tym, że&nbsp;minimalne postąpienie wynosi nie mniej niż 1% ceny wywoławczej. Cena osiągnięta w&nbsp;przetargu płatna jest jednorazowo przed zawarciem aktu notarialnego. W terminie do 21 dni od przetargu, osoba, kt&oacute;ra przetarg wygrała zostanie powiadomiona na&nbsp;piśmie o&nbsp;terminie i&nbsp;miejscu zawarcia aktu notarialnego. W przypadku uchylenia się od zawarcia umowy notarialnej wadium ulega przepadkowi.   Dodatkowe informacje o&nbsp;nieruchomości będącej przedmiotem przetargu, można uzyskać w&nbsp;Urzędzie Miejskim w&nbsp;Drawsku Pomorskim przy ul. Sikorskiego 41 w&nbsp;pokoju nr 111.   Ogłoszenie zostało wywieszone na&nbsp;tablicy ogłoszeń Urzędu Miejskiego w&nbsp;Drawsku Pomorskim w&nbsp;dniu 9 czerwca 2025 r. Ogłoszenie zamieszcza się r&oacute;wnież na&nbsp;stronie internetowej urzędu www.drawsko.pl oraz&nbsp;w dzienniku publikowanym w&nbsp;formie przekazu internetowego pt. www.przetargi-gctrader.pl wpisanym do sądowego rejestru dziennik&oacute;w i&nbsp;czasopism pod pozycją PR 17996.   Ogłoszenie zdjęto z&nbsp;tablicy ogłoszeń ............&hellip;&hellip;......"},"res":{"headline":"Informacja o wyniku przetargu na sprzedaż lokalu mieszkalnego - ul. Sikorskiego 4/4","datePublished":"2025-01-31 09:21:36","articleBody":"INFORMACJA O WYNIKU PRZETARGU  Na podstawie &sect; 12 rozporządzenia Rady Ministr&oacute;w z&nbsp;dnia 14 września 2004 r. w&nbsp;sprawie sposobu i&nbsp;trybu przeprowadzania przetarg&oacute;w oraz&nbsp;rokowań na&nbsp;zbycie nieruchomości (Dz. U. z&nbsp;2021 r. poz. 2213) - Burmistrz Drawska Pomorskiego podaje do publicznej wiadomości informację o&nbsp;wyniku przetargu:  1) W dniu 23 stycznia 2025 roku w&nbsp;Urzędzie Miejskim w&nbsp;Drawsku Pomorskim w&nbsp;pokoju 304 przeprowadzono II przetarg ustny nieograniczony na&nbsp;sprzedaż lokalu mieszkalnego nr 4 w&nbsp;budynku położonym przy ul. Gen. Wł. Sikorskiego 4 w&nbsp;Drawsku Pomorskim.&nbsp;  2) Przedmiot sprzedaży według katastru nieruchomości:&nbsp;a) adres nieruchomości &ndash; ul. Gen. Wł. Sikorskiego 4/4, 78-500 Drawsko Pomorskie&nbsp;b) oznaczenie geodezyjne - działka nr 165 obręb 0011c) nr księgi wieczystej &ndash; KO1D/00012173/7  3) Liczba os&oacute;b dopuszczonych do przetargu: 1  4) Liczba os&oacute;b niedopuszczonych do przetargu: 0  5) Cena wywoławcza: 79.000,00 zł brutto  6) Najwyższa cena osiągnięta w&nbsp;przetargu: 79.790,00 zł brutto  7) Nabywcą nieruchomości została: Tomasz Noga  Informację o&nbsp;wyniku przetargu podaje się do publicznej wiadomości poprzez wywieszenie na&nbsp;tablicy ogłoszeń Urzędu Miejskiego w&nbsp;Drawsku Pomorskim oraz&nbsp;poprzez publikację w&nbsp;Biuletynie Informacji Publicznej i&nbsp;na stronie internetowej urzędu pod adresem www.drawsko.pl na&nbsp;okres minimum 7 dni począwszy od 31 stycznia 2025 r."},"res2":{"headline":"Informacja o wyniku przetargu - lokal mieszkalny Borne 1/1","datePublished":"2021-09-16 05:06:15","articleBody":"INFORMACJA O WYNIKU PRZETARGU   Na podstawie § 12 rozporządzenia Rady Ministrów z&nbsp;dnia 14 września 2004 r. w&nbsp;sprawie sposobu i&nbsp;trybu przeprowadzania przetargów oraz&nbsp;rokowań na&nbsp;zbycie nieruchomości (Dz. U. z&nbsp;2014 r. poz. 1490 ze zm.) - Burmistrz Drawska Pomorskiego podaje do publicznej wiadomości informację o&nbsp;wyniku przetargu:  1) W dniu 2 września 2021 roku w&nbsp;Urzędzie Miejskim w&nbsp;Drawsku Pomorskim w&nbsp;pokoju 304 przeprowadzono II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego Borne 1/1 wraz z&nbsp;udziałem 640/100 w&nbsp;nieruchomości gruntowej na&nbsp;działkach nr 211/9 i&nbsp;211/10 położonej w&nbsp;obrębie Borne.  2) Przedmiot sprzedaży według katastru nieruchomości:   - adres nieruchomości - Borne 1/1, 78-500 Drawsko Pomorskie,  - oznaczenie geodezyjne - działki nr 211/9 i&nbsp;211/10 obręb Borne           - nr księgi wieczystej –KO1D/00025072/3   3) Liczba osób dopuszczonych do przetargu: 1,  Liczba osób niedopuszczonych do przetargu: 0,  4) Cena wywoławcza: 28.700,00 zł.  Najwyższa cena osiągnięta w&nbsp;przetargu: 29.000,00 zł.  5) Nabywcą nieruchomości został: Mariusz Tomczak  Informację o&nbsp;wyniku przetargu podaje się do publicznej wiadomości poprzez wywieszenie na&nbsp;tablicy ogłoszeń Urzędu Miejskiego w&nbsp;Drawsku Pomorskim oraz&nbsp;poprzez publikację w&nbsp;Biuletynie Informacji Publicznej i&nbsp;na stronie internetowej urzędu pod adresem www.drawsko.pl na&nbsp;okres minimum 7 dni począwszy od 10 września 2021 r."},"res3":{"headline":"Informacja o wyniku przetargu na sprzedaż lokalu mieszkalnego ul. 11 Pułk Piechoty 59/1","datePublished":"2023-12-01 06:45:39","articleBody":"INFORMACJA O WYNIKU PRZETARGU  Na podstawie &sect; 12 rozporządzenia Rady Ministr&oacute;w z&nbsp;dnia 14 września 2004 r. w&nbsp;sprawie sposobu i&nbsp;trybu przeprowadzania przetarg&oacute;w oraz&nbsp;rokowań na&nbsp;zbycie nieruchomości (Dz. U. z&nbsp;2021 r. poz. 2213) - Burmistrz Drawska Pomorskiego podaje do publicznej wiadomości informację o&nbsp;wyniku przetargu:  1. W dniu 23 listopada 2023 roku w&nbsp;Urzędzie Miejskim w&nbsp;Drawsku Pomorskim w&nbsp;pokoju 304 przeprowadzono III przetarg ustny nieograniczony na&nbsp;sprzedaż lokalu mieszkalnego nr 1 w&nbsp;budynku położonym przy ul. 11 Pułku Piechoty 59 w&nbsp;Drawsku Pomorskim.&nbsp;  2. Przedmiot sprzedaży według katastru nieruchomości:&nbsp;- adres nieruchomości &ndash; ul. 11 Pułku Piechoty 59/1, 78-500 Drawsko Pomorskie&nbsp;- oznaczenie geodezyjne - działka nr 89 obręb 0011- nr księgi wieczystej &ndash; KO1D/00011641/2  3. Liczba os&oacute;b dopuszczonych do przetargu: 4  4. Liczba os&oacute;b niedopuszczonych do przetargu: 0  5. Cena wywoławcza: 55.000,00 zł brutto  6. Najwyższa cena osiągnięta w&nbsp;przetargu: 77.050,00 zł brutto  7. Nabywcą nieruchomości została: Karolina Bakalarska  Informację o&nbsp;wyniku przetargu podaje się do publicznej wiadomości poprzez wywieszenie na&nbsp;tablicy ogłoszeń Urzędu Miejskiego w&nbsp;Drawsku Pomorskim oraz&nbsp;poprzez publikację w&nbsp;Biuletynie Informacji Publicznej i&nbsp;na stronie internetowej urzędu pod adresem www.drawsko.pl na&nbsp;okres minimum 7 dni począwszy od 1 grudnia 2023 r."},"ann2":{"headline":"I przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej, położonej na terenie miasta Drawsko Pomorskie - lokal mieszkalny UL. sIKORSKIEGO 21/4","datePublished":"2025-06-09 10:27:01","articleBody":"O G Ł O S Z E N I E  Na podstawie art. 38 ustawy z&nbsp;dnia 21 sierpnia 1997 roku o&nbsp;gospodarce nieruchomościami (Dz. U. z&nbsp;2024 r. poz. 1145 ze zm.) oraz&nbsp;&sect; 13 rozporządzenia Rady Ministr&oacute;w z&nbsp;dnia 14 września 2004 roku w&nbsp;sprawie sposobu i&nbsp;trybu przeprowadzania przetarg&oacute;w oraz&nbsp;rokowań na&nbsp;zbycie nieruchomości (Dz. U. z&nbsp;2021 r. poz. 2213) - Burmistrz Drawska Pomorskiego ogłasza I przetarg ustny nieograniczony na&nbsp;sprzedaż nieruchomości zabudowanej, położonej na&nbsp;terenie miasta Drawsko Pomorskie.                  Lp.      Adres nieruchomości      Oznaczenie  geodezyjne      Pow.  działki w&nbsp;ha      Nr księgi  Wieczystej      Opis nieruchomości      Cena  wywoławcza      Uwagi          1.      ul. Gen. Wł. Sikorskiego 21/4  78-500 Drawsko Pomorskie,  powiat drawski,  woj. zachodniopomorskie      działka nr  268/2  obręb 0011  miasta  Drawsko Pom.      pow. działki  0,0342 ha  &nbsp;  pow. lokalu  11,60 m2      KO1D/00022310/3      &nbsp;  Lokal mieszkalny nr 4 w&nbsp;budynku nr 21 położonym przy ul. Gen. Wł. Sikorskiego w&nbsp;Drawsku Pomorskim. Powierzchnia lokalu &ndash; 11,60 m2. Lokal składa się z&nbsp;jednego pokoju. Do lokalu przynależy kuchnia o&nbsp;pow. 7,40 m2 i&nbsp;łazienka o&nbsp;pow. 2,10 m2. Lokal znajduje się na&nbsp;I piętrze w&nbsp;budynku o&nbsp;dw&oacute;ch kondygnacjach nadziemnych z&nbsp;poddaszem użytkowym adaptowanym na&nbsp;cele mieszkalne, częściowo podpiwniczonym.  W planie zagospodarowania przestrzennego działka posiada zapis 39MW,U &ndash; zabudowa mieszkaniowa wielorodzinna, zabudowa usługowa. Nieruchomość zabudowana jest budynkiem mieszkalno-użytkowym.      24.400,00 zł      Przetarg ustny nieograniczony          Przetarg odbędzie się w&nbsp;siedzibie Urzędu Miejskiego w&nbsp;Drawsku Pomorskim przy ul. Sikorskiego 41, dnia 10 lipca 2025r. o&nbsp;godz. 1200 w pokoju nr 304. Warunkiem przystąpienia do przetargu jest wpłacenie wadium w&nbsp;formie pieniężnej w&nbsp;wysokości 4.880,- zł z podaniem numeru działki na&nbsp;dowodzie wpłaty w&nbsp;takim terminie, aby możliwe było stwierdzenie jego zaksięgowania, najp&oacute;źniej 7 lipca 2025 roku. Wpłaty wadium można dokonać przelewem na&nbsp;konto tut. urzędu nr 12 1020 2847 0000 1702 0009 6602 w&nbsp;PKO BP o/ Drawsko Pomorskie. Osobom, kt&oacute;re przetarg przegrały wadium zostanie zwr&oacute;cone niezwłocznie po odwołaniu lub&nbsp;zamknięciu przetargu nie p&oacute;źniej jednak&nbsp;niż przed upływem 3 dni od dnia odwołania, zamknięcia, unieważnienia lub&nbsp;zakończenia wynikiem negatywnym przetargu.   Uczestnicy przetargu muszą okazać komisji przetargowej ważne dowody osobiste, dowody potwierdzające wpłacenie wadium oraz&nbsp;ewentualne pełnomocnictwa do brania udziału w&nbsp;przetargu w&nbsp;imieniu osoby trzeciej.  O wysokości postąpienia decydują uczestnicy przetargu, z&nbsp;tym, że&nbsp;minimalne postąpienie wynosi nie mniej niż 1% ceny wywoławczej. Cena osiągnięta w&nbsp;przetargu płatna jest jednorazowo przed zawarciem aktu notarialnego. W terminie do 21 dni od przetargu, osoba, kt&oacute;ra przetarg wygrała zostanie powiadomiona na&nbsp;piśmie o&nbsp;terminie i&nbsp;miejscu zawarcia aktu notarialnego. W przypadku uchylenia się od zawarcia umowy notarialnej wadium ulega przepadkowi.   Dodatkowe informacje o&nbsp;nieruchomości będącej przedmiotem przetargu, można uzyskać w&nbsp;Urzędzie Miejskim w&nbsp;Drawsku Pomorskim przy ul. Sikorskiego 41 w&nbsp;pokoju nr 111.   Ogłoszenie zostało wywieszone na&nbsp;tablicy ogłoszeń Urzędu Miejskiego w&nbsp;Drawsku Pomorskim w&nbsp;dniu 9 czerwca 2025 r. Ogłoszenie zamieszcza się r&oacute;wnież na&nbsp;stronie internetowej urzędu www.drawsko.pl oraz&nbsp;w dzienniku publikowanym w&nbsp;formie przekazu internetowego pt. www.przetargi-gctrader.pl wpisanym do sądowego rejestru dziennik&oacute;w i&nbsp;czasopism pod pozycją PR 17996.   Ogłoszenie zdjęto z&nbsp;tablicy ogłoszeń ............&hellip;&hellip;......"}}`);

const URL_BASE = 'https://drawsko.pl/aktualnosci-2/33-nieruchomosci/';
function pageOf(key) {
  return `<html><head><script type="application/ld+json">${JSON.stringify(LD[key])}</script></head><body>x</body></html>`;
}
function annOf(key) {
  const art = extractArticleBody(pageOf(key));
  return parseAnnouncement(art.body, art.headline, URL_BASE + key + '.html');
}
function resOf(key) {
  const art = extractArticleBody(pageOf(key));
  const recs = parseResultDoc(art.body, art.datePublished, URL_BASE + key + '.html');
  assert.equal(recs.length, 1, key + ': exactly one result record');
  return recs[0];
}

// ---- scalar helpers -------------------------------------------------------

test('parsePLN: Polish money formats', () => {
  assert.equal(parsePLN('75.900,00'), 75900);
  assert.equal(parsePLN('28 700,00'), 28700);
  assert.equal(parsePLN('24400'), 24400);
});

test('parseArea: comma decimals', () => {
  assert.equal(parseArea('47,30'), 47.3);
  assert.equal(parseArea('11.60'), 11.6);
});

test('roundFromText: roman ordinals', () => {
  assert.equal(roundFromText('II przetarg ustny'), 2);
  assert.equal(roundFromText('III przetarg'), 3);
  assert.equal(roundFromText('I przetarg'), 1);
});

test('slug classifiers', () => {
  assert.equal(isFlatSlug('x-lokal-mieszkalny-ul-ratuszowa-72.html'), true);
  assert.equal(isFlatSlug('informacja-o-wyniku-przetargu-na-sprzedaz-lokalu-niemieszkalnego-x'), false);
  assert.equal(isFlatSlug('i-przetarg-x-nieruchomosci-niezabudowanych-x'), false);
  assert.equal(isResultSlug('informacja-o-wyniku-przetargu-lokal-mieszkalny-borne-11.html'), true);
  assert.equal(isAnnouncementSlug('i-przetarg-ustny-x-lokal-mieszkalny-ul-ratuszowa-72.html'), true);
  assert.equal(isAnnouncementSlug('wykaz-nieruchomosci-x-lokale-mieszkalne-x'), false);
});

test('parseListingLinks: in-section articles only, pagination skipped', () => {
  const html = [
    '<a href="/aktualnosci-2/33-nieruchomosci/i-przetarg-x-lokal-mieszkalny-ul-ratuszowa-72.html">x</a>',
    '<a href="/aktualnosci-2/33-nieruchomosci/strona-2/">2</a>',
    '<a href="/aktualnosci-2/33-nieruchomosci/informacja-o-wyniku-przetargu-lokal-mieszkalny-borne-11.html">y</a>',
  ].join('');
  const links = parseListingLinks(html, 'https://drawsko.pl');
  assert.equal(links.length, 2);
  assert.ok(links.every((l) => l.url.startsWith('https://drawsko.pl/')));
  assert.ok(!links.some((l) => /strona-/.test(l.slug)));
});

// ---- announcements --------------------------------------------------------

test('announcement ann - ul. Ratuszowa 7/2', () => {
  const r = annOf('ann');
  assert.equal(r.address.street_norm, 'ratuszowa');
  assert.equal(r.address.building, '7');
  assert.equal(r.address.apt, '2');
  assert.equal(r.area_m2, 47.3);
  assert.equal(r.starting_price_pln, 75900);
  assert.equal(r.auction_date, '2025-07-10');
  assert.equal(r.round, 1);
  assert.equal(r.kind, 'mieszkalny');
});

test('announcement ann2 - ul. Gen. Wl. Sikorskiego 21/4', () => {
  const r = annOf('ann2');
  assert.equal(r.address.street_norm, 'gen wl sikorskiego');
  assert.equal(r.address.building, '21');
  assert.equal(r.address.apt, '4');
  assert.equal(r.area_m2, 11.6);
  assert.equal(r.starting_price_pln, 24400);
  assert.equal(r.auction_date, '2025-07-10');
});

// ---- results --------------------------------------------------------------

test('result res - ul. Gen. Wl. Sikorskiego 4/4 (sold)', () => {
  const r = resOf('res');
  assert.equal(r.address.street_norm, 'gen wl sikorskiego');
  assert.equal(r.address.building, '4');
  assert.equal(r.address.apt, '4');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2025-01-23');
  assert.equal(r.starting_price_pln, 79000);
  assert.equal(r.final_price_pln, 79790);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.buyer, 'Tomasz Noga');
  assert.deepEqual(r.notes, []);
});

test('result res2 - Borne 1/1 (share)', () => {
  const r = resOf('res2');
  assert.equal(r.address.street_norm, 'borne');
  assert.equal(r.address.building, '1');
  assert.equal(r.address.apt, '1');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2021-09-02');
  assert.equal(r.starting_price_pln, 28700);
  assert.equal(r.final_price_pln, 29000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.share, '640/100');
});

test('result res3 - ul. 11 Pulku Piechoty 59/1', () => {
  const r = resOf('res3');
  assert.equal(r.address.street_norm, '11 pulku piechoty');
  assert.equal(r.address.building, '59');
  assert.equal(r.address.apt, '1');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2023-11-23');
  assert.equal(r.starting_price_pln, 55000);
  assert.equal(r.final_price_pln, 77050);
  assert.equal(r.outcome, 'sold');
});

test('extractArticleBody: headline + datePublished', () => {
  const art = extractArticleBody(pageOf('res'));
  assert.equal(art.datePublished, '2025-01-31');
  assert.match(art.headline, /Sikorskiego 4\/4/);
});
