// Zakopane parser unit tests.
// Fixtures are condensed-but-faithful copies of real live bip.zakopane.eu bodies:
//   - Flat announcement (Aleja 3-go Maja 5/24, III przetarg)
//   - Flat announcement (Kamieniec 2A/5, I przetarg, Word DOC fixture)
//   - Building announcement (Pod Lipkami 8, III przetarg)
//   - Land announcement (Droga do Olczy, I przetarg)
//   - Flat result UNSOLD (Aleja 3-go Maja 5/24, III przetarg)
//   - Flat result SOLD (Przewodnika Józefa Krzeptowskiego 33/5, VII przetarg)
//   - Building result UNSOLD (Pod Lipkami 8, II przetarg)
//   - Land result SOLD (Na Gubałówkę, I przetarg)
//   - Lease notices (Kuźnice, dworzec Chramcówki 35A) — filtered out

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncement,
  isResult,
  isLease,
  isMovable,
  extractDetail,
  pickAttachment,
  extractPropertyAddress,
  extractArea,
  extractStartingPrice,
  extractFinalPrice,
  extractAuctionDate,
  extractRound,
  extractOutcomeAndBuyer,
  extractParcelAndObreb,
  resolveKindZakopane,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/zakopane/parse.js';

// ---------------------------------------------------------------- title routing

test('title routing: announcements, results, leases, and movables', () => {
  // Flat announcements
  assert.equal(
    isAnnouncement(
      'OGŁOSZENIE O PRZETARGU',
      'Burmistrz Miasta Zakopane ogłasza III ustny przetarg nieograniczony na zbycie nieruchomości lokalowej, mieszkalnej nr 24, znajdującej się w budynku wielomieszkaniowym przy ul. Aleja 3-go Maja 5 w Zakopanem',
    ),
    true,
  );
  assert.equal(
    isAnnouncement(
      'OGŁOSZENIE O PRZETARGU',
      'BURMISTRZ MIASTA ZAKOPANE ogłasza I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 5, stanowiącego własność Gminy Miasto Zakopane, położonego w budynku przy ul. Kamieniec 2A w Zakopanem',
    ),
    true,
  );
  // Building announcement
  assert.equal(
    isAnnouncement(
      'OGŁOSZENIE O PRZETARGU',
      'BURMISTRZ MIASTA ZAKOPANE ogłasza III ustny przetarg nieograniczony na zbycie zabudowanej nieruchomości gruntowej, położonej przy ul. Pod Lipkami 8 w Zakopanem',
    ),
    true,
  );
  // Land announcement
  assert.equal(
    isAnnouncement(
      'OGŁOSZENIE O PRZETARGU',
      'Burmistrz Miasta Zakopane ogłasza: I ustny przetarg nieograniczony na zbycie nieruchomości gruntowej, położonej w rejonie ul. Droga do Olczy w Zakopanem',
    ),
    true,
  );

  // Result notices
  assert.equal(
    isResult(
      'Informacja o wyniku przetargu',
      'przeprowadzonego przez komisję przetargową w siedzibie Urzędu Miasta Zakopane na sprzedaż nieruchomości gminnej.',
    ),
    true,
  );
  assert.equal(
    isResult(
      'OGŁOSZENIE WYNIKU PRZETARGU',
      'Ogłoszenie wyniku III ustnego przetargu nieograniczonego na zbycie nieruchomości lokalowej mieszkalnej nr 24 znajdującej się w budynku wielomieszkaniowym przy ul. Al. 3-go Maja 5 w Zakopanem',
    ),
    true,
  );
  assert.equal(
    isAnnouncement(
      'OGŁOSZENIE WYNIKU PRZETARGU',
      'Ogłoszenie wyniku III ustnego przetargu nieograniczonego na zbycie nieruchomości lokalowej mieszkalnej nr 24 znajdującej się w budynku wielomieszkaniowym przy ul. Al. 3-go Maja 5 w Zakopanem',
    ),
    false,
  );

  // Lease notices (must be skipped)
  assert.equal(
    isLease(
      'OGŁOSZENIE O PRZETARGU',
      'Burmistrz Miasta Zakopane ogłasza: pisemny przetarg nieograniczony na najem pomieszczeń użytkowych o łącznej powierzchni 144,51 m2, zwanych dalej „lokalem”, znajdujących się w budynku stacji przesiadkowej w Kuźnicach w Zakopanem',
    ),
    true,
  );
  assert.equal(
    isAnnouncement(
      'OGŁOSZENIE O PRZETARGU',
      'Burmistrz Miasta Zakopane ogłasza: pisemny przetarg nieograniczony na najem pomieszczeń użytkowych',
    ),
    false,
  );
  assert.equal(
    isLease(
      'Informacja o wyniku przetargu',
      'przeprowadzonego przez komisję przetargową w siedzibie Urzędu Miasta Zakopane na dzierżawę pomieszczeń użytkowych – toalet o łącznej powierzchni użytkowej 114,80 m2 zlokalizowanych w budynku dworca w Zakopanem przy ul. Chramcówki 35A',
    ),
    true,
  );

  // Movables skip
  assert.equal(
    isMovable(
      'Ogłoszenie o przetargu',
      'PRZETARG NIEOGRANICZONY OFERTOWY NA SPRZEDAŻ MIENIA RUCHOMEGO - UŻYWANEGO SAMOCHODU',
    ),
    true,
  );
  assert.equal(
    isAnnouncement(
      'Ogłoszenie o przetargu',
      'PRZETARG NIEOGRANICZONY OFERTOWY NA SPRZEDAŻ MIENIA RUCHOMEGO - UŻYWANEGO SAMOCHODU',
    ),
    false,
  );

  // Wykaz / bezprzetarg skip
  assert.equal(
    isAnnouncement(
      'ZARZĄDZENIE NR 0050.191.2026',
      'Burmistrza Miasta Zakopane w sprawie: ogłoszenia wykazu nieruchomości przeznaczonej do zbycia w trybie bezprzetargowym w formie wkładu niepieniężnego (aportu).',
    ),
    false,
  );
});

// ------------------------------------------------------------- detail & attachment

test('detail extraction and attachment picking', () => {
  const html = `
  <article id="cnt" class="document">
    <header>
      <h2>Ogłoszenie o przetargu</h2>
    </header>
    <article class="lead">
      <p>Burmistrz Miasta Zakopane ogłasza III ustny przetarg nieograniczony na zbycie nieruchomości lokalowej...</p>
    </article>
    <article class="content">
    </article>
    <h3>Pliki do pobrania</h3>
    <ul class="attach_show_list">
      <li>
        <p>
          <a aria-label="Pobierz załącznik: mapa z lokalizacją.pdf w formacie pdf o rozmiarze 296 kB" href="/zalacznik/60260">mapa z lokalizacją.pdf</a>
        </p>
      </li>
      <li>
        <p>
          <a aria-label="Pobierz załącznik: Ogłoszenie o przetargu - lokal mieszkalny nr 24 przy ul. Al. 3 Maja 5 w Zakopanem - III przetarg.pdf w formacie pdf o rozmiarze 194 kB" href="/zalacznik/60261">Ogłoszenie o przetargu...pdf</a>
        </p>
      </li>
      <li>
        <p>
          <a aria-label="Pobierz załącznik: regulamin przetargu.pdf w formacie pdf o rozmiarze 145 kB" href="/zalacznik/60262">regulamin przetargu.pdf</a>
        </p>
      </li>
    </ul>
  </article>
  `;

  const detail = extractDetail(html);
  assert.ok(detail);
  assert.equal(detail.title, 'Ogłoszenie o przetargu');
  assert.ok(detail.lead.includes('Burmistrz Miasta Zakopane ogłasza'));
  assert.equal(detail.attachments.length, 3);
  assert.equal(detail.attachments[1].url, 'https://bip.zakopane.eu/zalacznik/60261');

  const picked = pickAttachment(detail.attachments);
  assert.ok(picked);
  assert.equal(picked.url, 'https://bip.zakopane.eu/zalacznik/60261');
});

// ----------------------------------------------------------------- announcements

test('parse flat announcement (Aleja 3-go Maja 5/24, III przetarg)', () => {
  const text = `
OGŁOSZENIE O PRZETARGU
BURMISTRZ MIASTA ZAKOPANE ogłasza III ustny przetarg
nieograniczony na zbycie nieruchomości lokalowej, mieszkalnej nr 24,
znajdującej się w budynku wielomieszkaniowym przy ul. Aleja 3-go Maja 5
w Zakopanem wraz z udziałem wynoszącym 4598/517000 w częściach
wspólnych budynku i w gruncie, stanowiącym działkę ewidencyjną nr 846/4
obręb 5.
1. Informacja o przeznaczeniu do zbycia: sprzedaż w drodze III ustnego przetargu
nieograniczonego.
2. Termin poprzedniego przetargu: 11.02.2026 r., 19.05.2026 r.
3. Księga wieczysta: lokal mieszkalny nr 24 o pow. 45,98 m² – NS1Z/00076299/3, działka
ewidencyjna nr 846/4 obręb 5 o pow. 0,0865 ha – NS1Z/00013025/3.
4. Położenie nieruchomości: lokal znajduje się w budynku wielomieszkaniowym,
murowanym, położonym przy ul. Aleja 3-go Maja 5 w Zakopanem.
5. Oznaczenie, powierzchnia i opis nieruchomości:
- lokal mieszkalny nr 24 o pow. użytkowej 45,98 m²,
- lokal położony jest na pierwszym piętrze w ww. budynku,
- lokal składa się z następujących pomieszczeń: dwóch pokoi, przedpokoju, łazienki, kuchni,
9. Cena wywoławcza: 750 000,00 zł /słownie: siedemset pięćdziesiąt tysięcy złotych 00/100/.
Do wylicytowanej ceny nieruchomości nie dolicza się podatku VAT w wysokości 23%.
10. Termin i miejsce przetargu: 02.09.2026 r., godz. 09:00, siedziba Urzędu Miasta
Zakopane przy ul. Kościuszki 13, Zakopane, parter, sala nr 1.
  `;

  const rec = parseAnnouncement('Ogłoszenie o przetargu', text, 'https://bip.zakopane.eu/ogloszenie-o-przetargu-421');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'ul. Aleja 3-go Maja 5/24');
  assert.equal(rec.address.street, 'Aleja 3-go Maja');
  assert.equal(rec.address.building, '5');
  assert.equal(rec.address.apt, '24');
  assert.equal(rec.area_m2, 45.98);
  assert.equal(rec.starting_price_pln, 750000);
  assert.equal(rec.auction_date, '2026-09-02');
  assert.equal(rec.round, 3);
  assert.equal(rec.detail_url, 'https://bip.zakopane.eu/ogloszenie-o-przetargu-421');
});

test('parse flat announcement (Kamieniec 2A/5, I przetarg)', () => {
  const text = `
OGŁOSZENIE O PRZETARGU
BURMISTRZ MIASTA ZAKOPANE ogłasza I ustny przetarg nieograniczony na
sprzedaż lokalu mieszkalnego nr 5, stanowiącego własność Gminy
Miasto Zakopane, położonego w budynku przy ul. Kamieniec 2A 
w Zakopanem wraz z udziałem wynoszącym 7236/27621 w częściach
wspólnych budynku wielomieszkaniowego oraz w prawie użytkowania
wieczystego gruntu tj. w działkach ewidencyjnych nr 543/1 i 543/2
obręb 3.
1. Przeznaczenie nieruchomości: sprzedaż w drodze I ustnego przetargu nieograniczonego.
2. Księga wieczysta: NS1Z/00031613/4
3. Położenie nieruchomości: przy ul. Kamieniec 2A w Zakopanem
4. Oznaczenie, powierzchnia i opis nieruchomości: 
- lokal mieszkalny nr 5 o pow. 70,22 m²,
8. Cena wywoławcza: 350 000,00 zł
9. Termin i miejsce przetargu: 12.04.2022 r., godz. 10:00, Urząd Miasta Zakopane przy ul. Kościuszki 13
  `;

  const rec = parseAnnouncement('Ogłoszenie o przetargu', text, 'https://bip.zakopane.eu/kamieniec-2a');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'ul. Kamieniec 2A/5');
  assert.equal(rec.address.street, 'Kamieniec');
  assert.equal(rec.address.building, '2A');
  assert.equal(rec.address.apt, '5');
  assert.equal(rec.area_m2, 70.22);
  assert.equal(rec.starting_price_pln, 350000);
  assert.equal(rec.auction_date, '2022-04-12');
  assert.equal(rec.round, 1);
});

test('parse building announcement (Pod Lipkami 8, III przetarg)', () => {
  const text = `
OGŁOSZENIE O PRZETARGU
BURMISTRZ MIASTA ZAKOPANE ogłasza III ustny przetarg
nieograniczony na zbycie zabudowanej nieruchomości gruntowej, położonej
przy ul. Pod Lipkami 8 w Zakopanem, oznaczonej jako działka ewidencyjna nr
792/2 obręb 8 o powierzchni 0,0432 ha, stanowiącej własność Gminy Miasto
Zakopane.
1. Informacja o przeznaczeniu do zbycia: sprzedaż w drodze III ustnego przetargu nieograniczonego.
3. Oznaczenie nieruchomości, księga wieczysta i powierzchnia: NS1Z/00012397/4, działka
ewidencyjna nr 792/2 obręb 8 o pow. 0,0432 ha, budynek mieszkalny o pow. zabudowy 120
m².
4. Położenie nieruchomości: przy ul. Pod Lipkami 8 w Zakopanem.
5. Opis nieruchomości: działka ewidencyjna nr 792/2 obręb 8 jest zabudowana drewnianym
parterowym domem jednorodzinnym o pow. zabudowy 120 m2.
9. Cena wywoławcza: 1 500 000,00 zł /słownie: jeden milion pięćset tysięcy złotych 00/100/.
10. Termin i miejsce przetargu: 26.11.2026 r., godz. 09:00, siedziba Urzędu Miasta
Zakopane przy ul. Kościuszki 13, Zakopane, sala nr 1 /parter/.
  `;

  const rec = parseAnnouncement('Ogłoszenie o przetargu', text, 'https://bip.zakopane.eu/pod-lipkami-8');
  assert.ok(rec);
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address_raw, 'ul. Pod Lipkami 8');
  assert.equal(rec.address.street, 'Pod Lipkami');
  assert.equal(rec.address.building, '8');
  assert.equal(rec.area_m2, 120);
  assert.equal(rec.starting_price_pln, 1500000);
  assert.equal(rec.auction_date, '2026-11-26');
  assert.equal(rec.round, 3);
});

test('parse land announcement (Droga do Olczy, I przetarg)', () => {
  const text = `
OGŁOSZENIE O PRZETARGU
BURMISTRZ MIASTA ZAKOPANE ogłasza I ustny przetarg
nieograniczony na zbycie nieruchomości gruntowej, położonej w rejonie ul.
Droga do Olczy w Zakopanem, oznaczonej jako działki ewidencyjne nr 87/6,
87/3 i 88/1 obręb 144 o łącznej powierzchni 0,0337 ha, stanowiącej własność
Gminy Miasto Zakopane.
1. Informacja o przeznaczeniu do zbycia: sprzedaż w drodze I ustnego przetargu nieograniczonego.
2. Oznaczenie nieruchomości, księga wieczysta i powierzchnia: NS1Z/00017753/3, działka
ewidencyjna nr 87/6 obręb 144 o pow. 0,0253 ha, działka ewidencyjna nr 87/3 obręb 144
o pow. 0,0080 ha, działka ewidencyjna nr 88/1 obręb 144 o pow. 0,0004 ha.
3. Położenie nieruchomości: w rejonie ul. Droga do Olczy w Zakopanem.
4. Opis nieruchomości: nieruchomość niezabudowana.
8. Cena wywoławcza: 460 000,00 zł netto /słownie: czterysta sześćdziesiąt tysięcy złotych 00/100/.
9. Termin i miejsce przetargu: 26.11.2026 r., godz. 12:00, siedziba Urzędu Miasta
Zakopane przy ul. Kościuszki 13, Zakopane, sala nr 1, /parter/.
  `;

  const rec = parseAnnouncement('Ogłoszenie o przetargu', text, 'https://bip.zakopane.eu/droga-do-olczy');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '87/6, 87/3, 88/1');
  assert.equal(rec.obreb, '144');
  assert.equal(rec.area_m2, 337);
  assert.equal(rec.address_raw, 'ul. Droga do Olczy');
  assert.equal(rec.starting_price_pln, 460000);
  assert.equal(rec.auction_date, '2026-11-26');
  assert.equal(rec.round, 1);
});

// ----------------------------------------------------------------- result notices

test('parse flat result UNSOLD (Aleja 3-go Maja 5/24, III przetarg)', () => {
  const text = `
Zakopane, 02.09.2026 r.

Informacja o wyniku przetargu
Przeprowadzonego przez komisję przetargową w siedzibie Urzędu Miasta Zakopane na
sprzedaż nieruchomości gminnej.
1. Rodzaj przetargu: III ustny przetarg nieograniczony na zbycie nieruchomości lokalowej
mieszkalnej.
2. Data i miejsce przetargu: 02.09.2026 r., godz. 09:00, siedziba Urzędu Miasta Zakopane
przy ul. Kościuszki 13, Zakopane, sala nr 1, /parter/.
3. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
Nieruchomość lokalowa, mieszkalna nr 24 o powierzchni 45,98 m², znajdująca się w budynku
wielomieszkaniowym przy ul. Aleja 3-go Maja 5 w Zakopanem, dla której Sąd Rejonowy
w Zakopanem prowadzi księgę wieczystą nr NS1Z/00076299/3 wraz z udziałem wynoszącym
4598/517000 w częściach wspólnych budynku i w gruncie, stanowiącym działkę ewidencyjną
nr 846/4 obręb 5 o powierzchni 0,0865 ha, dla której Sąd Rejonowy w Zakopanem prowadzi
księgę wieczystą nr NS1Z/00013025/3.
4. Liczba osób dopuszczonych oraz niedopuszczonych do uczestnictwa w przetargu:
Brak osób dopuszczonych i niedopuszczonych do uczestnictwa przetargu.
Na konto Urzędu Miasta Zakopane nie zostało wpłacone wadium.
5. Cena wywoławcza nieruchomości:
750 000,00 zł /słownie: siedemset pięćdziesiąt tysięcy złotych 00/100/. Do wylicytowanej
ceny nieruchomości nie dolicza się podatku VAT w wysokości 23%.
6. Nabywca nieruchomości:
Brak nabywcy.
Przetarg zakończył się wynikiem negatywnym.
  `;

  const recs = parseResultDoc(text, null, 'https://bip.zakopane.eu/ogloszenie-wyniku-przetargu');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Aleja 3-go Maja 5/24');
  assert.equal(r.area_m2, 45.98);
  assert.equal(r.starting_price_pln, 750000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'wynik negatywny');
  assert.equal(r.buyer, null);
  assert.equal(r.auction_date, '2026-09-02');
  assert.equal(r.round, 3);
  assert.equal(r.source_pdf, 'https://bip.zakopane.eu/ogloszenie-wyniku-przetargu');
});

test('parse flat result SOLD (Przewodnika Józefa Krzeptowskiego 33/5, VII przetarg)', () => {
  const text = `
Zakopane, 30.10.2023 r.

Informacja o wyniku przetargu
Przeprowadzonego przez komisję przetargową w siedzibie Urzędu Miasta Zakopane na
zbycie nieruchomości gminnej.
1. Rodzaj przetargu: VII ustny przetarg nieograniczony na zbycie nieruchomości lokalowej
mieszkalnej.
2. Data i miejsce przetargu: 20.10.2023 r., godz. 09:30, siedziba Urzędu Miasta Zakopane
przy ul. Kościuszki 13, Zakopane, sala nr 1, /parter/.
3. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
Nieruchomość lokalowa, mieszkalna nr 5 o powierzchni 48,30 m², znajdująca się w budynku
wielomieszkaniowym przy ul. Przewodnika Józefa Krzeptowskiego 33 w Zakopanem, dla
której Sąd Rejonowy w Zakopanem prowadzi księgę wieczystą nr NS1Z/00026591/5 wraz
z udziałem wynoszącym 4816/104207 w częściach wspólnych budynku i w gruncie,
stanowiącym działkę ewidencyjną nr 162 obręb 153 o powierzchni 0,1546 ha, dla której Sąd
Rejonowy w Zakopanem prowadzi księgę wieczystą nr NS1Z/00000025/9.
4. Liczba osób dopuszczonych oraz niedopuszczonych do uczestnictwa w przetargu:
Liczba osób dopuszczonych do uczestnictwa w przetargu: 1 osoba.
Brak osób niedopuszczonych do uczestnictwa przetargu.
Na konto Urzędu Miasta Zakopane zostało wpłacone jedno wadium.
5. Cena wywoławcza nieruchomości:
399 000,00 zł /słownie: trzysta dziewięćdziesiąt dziewięć tysięcy złotych 00/100/.
6. Najwyższa cena osiągnięta w przetargu:
403 000,00 zł /słownie: czterysta trzy tysiące złotych 00/100/.
6. Nabywca nieruchomości:
PASJA INVEST SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ
  `;

  const recs = parseResultDoc(text, null, 'https://bip.zakopane.eu/informacja-o-wyniku-przetargu-227');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Przewodnika Józefa Krzeptowskiego 33/5');
  assert.equal(r.address.street, 'Przewodnika Józefa Krzeptowskiego');
  assert.equal(r.address.building, '33');
  assert.equal(r.address.apt, '5');
  assert.equal(r.area_m2, 48.30);
  assert.equal(r.starting_price_pln, 399000);
  assert.equal(r.final_price_pln, 403000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.buyer, 'PASJA INVEST SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ');
  assert.equal(r.auction_date, '2023-10-20');
  assert.equal(r.round, 7);
});

test('parse building result UNSOLD (Pod Lipkami 8, II przetarg)', () => {
  const text = `
Zakopane, 11.08.2026 r.

Informacja o wyniku przetargu
Przeprowadzonego przez komisję przetargową w siedzibie Urzędu Miasta Zakopane na
sprzedaż nieruchomości gminnej.
1. Rodzaj przetargu: II ustny przetarg nieograniczony na sprzedaż zabudowanej
nieruchomości gruntowej.
2. Data i miejsce przetargu: 11.08.2026 r., godz. 09:00, siedziba Urzędu Miasta Zakopane
przy ul. Kościuszki 13, Zakopane, sala nr 1 /parter/.
3. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
Zabudowana nieruchomość gruntowa, położona przy ul. Pod Lipkami 8 w Zakopanem,
stanowiąca własność Gminy Miasto Zakopane, oznaczona jako działka ewidencyjna nr 792/2
obręb 8 o powierzchni 0,0432 ha, dla której Sąd Rejonowy w Zakopanem prowadzi księgę
wieczystą nr NS1Z/00012397/4.
4. Liczba osób dopuszczonych oraz niedopuszczonych do uczestnictwa w przetargu:
Brak osób dopuszczonych i niedopuszczonych do uczestnictwa w przetargu.
Na konto Urzędu Miasta Zakopane nie zostało wpłacone wadium.
5. Cena wywoławcza nieruchomości:
1 500 000,00 zł /słownie: jeden milion pięćset tysięcy złotych 00/100/. Do wylicytowanej
ceny nieruchomości nie dolicza się podatku VAT w wysokości 23%.
6. Nabywca nieruchomości:
Brak nabywcy.
Przetarg zakończył się wynikiem negatywnym.
  `;

  const recs = parseResultDoc(text, null, 'https://bip.zakopane.eu/informacja-o-wyniku-przetargu-334');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address_raw, 'ul. Pod Lipkami 8');
  assert.equal(r.starting_price_pln, 1500000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'wynik negatywny');
  assert.equal(r.auction_date, '2026-08-11');
  assert.equal(r.round, 2);
});

test('parse land result SOLD (Na Gubałówkę, I przetarg)', () => {
  const text = `
Zakopane, 29.12.2025 r.

Informacja o wyniku przetargu
Przeprowadzonego przez komisję przetargową w siedzibie Urzędu Miasta Zakopane na
sprzedaż nieruchomości gminnej.
1. Rodzaj przetargu: I ustny przetarg nieograniczony na sprzedaż nieruchomości gruntowej.
2. Data i miejsce przetargu: 16.12.2025 r., godz. 09:00, siedziba Urzędu Miasta Zakopane
przy ul. Kościuszki 13, Zakopane, sala nr 1, /parter/.
3. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
Nieruchomość gruntowa, położona w rejonie ul. Na Gubałówkę w Zakopanem, stanowiąca
własność Gminy Miasto Zakopane, oznaczona jako działka ewidencyjna nr 418/21 obręb 4
o powierzchni 0,0215 ha, dla której Sąd Rejonowy w Zakopanem prowadzi księgę wieczystą
nr NS1Z/00062095/2.
4. Liczba osób dopuszczonych oraz niedopuszczonych do uczestnictwa w przetargu:
Liczba osób dopuszczonych do uczestnictwa w przetargu: 1 osoba.
5. Cena wywoławcza nieruchomości:
600 000,00 zł netto /słownie: sześćset tysięcy złotych 00/100/.
6. Najwyższa cena osiągnięta w przetargu:
606 000,00 zł netto /słownie: sześćset sześć tysięcy złotych 00/100/ + 23% podatku VAT
w kwocie: 139 380,00 zł
Łączna kwota to: 745 380,00 zł
7. Nabywca nieruchomości:
BULAS-BAZAR SPÓŁKA JAWNA BULAS KTYSTYNA, BULAS ROMAN
  `;

  const recs = parseResultDoc(text, null, 'https://bip.zakopane.eu/informacja-o-wyniku-przetargu-301');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '418/21');
  assert.equal(r.obreb, '4');
  assert.equal(r.area_m2, 215);
  assert.equal(r.address_raw, 'ul. Na Gubałówkę');
  assert.equal(r.starting_price_pln, 600000);
  assert.equal(r.final_price_pln, 606000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.buyer, 'BULAS-BAZAR SPÓŁKA JAWNA BULAS KTYSTYNA, BULAS ROMAN');
  assert.equal(r.auction_date, '2025-12-16');
  assert.equal(r.round, 1);
});

test('lease result notices are ignored', () => {
  const text = `
Informacja o wyniku przetargu
przeprowadzonego przez komisję przetargową w siedzibie Urzędu Miasta Zakopane na dzierżawę pomieszczeń użytkowych – toalet o łącznej powierzchni użytkowej 114,80 m2 zlokalizowanych w budynku dworca w Zakopanem przy ul. Chramcówki 35A na okres 3 lat.
1. Rodzaj przetargu: pisemny przetarg nieograniczony na dzierżawę pomieszczeń użytkowych.
  `;
  const recs = parseResultDoc(text, null, 'https://bip.zakopane.eu/dzierzawa');
  assert.deepEqual(recs, []);
});
