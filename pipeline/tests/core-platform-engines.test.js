import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle as isMadkomAnnouncement,
  isResultTitle as isMadkomResult,
  parsePlDate as parseMadkomDate,
  parsePrice as parseMadkomPrice,
  parseMadkomAnnouncement,
  parseMadkomResult,
  makeMadkomCity,
} from '../src/core/madkom-bip.js';

import {
  isAnnouncementTitle as isLogonetAnnouncement,
  isResultTitle as isLogonetResult,
  parsePlDate as parseLogonetDate,
  parsePrice as parseLogonetPrice,
  parseLogonetNotice,
  parseLogonetResult,
  makeLogonetCity,
} from '../src/core/logonet-bip.js';

import {
  isAnnouncementTitle as isBipLubelskieAnnouncement,
  isResultTitle as isBipLubelskieResult,
  parseBipLubelskieNotice,
  parseBipLubelskieResult,
  makeBipLubelskieCity,
} from '../src/core/biplubelskie-bip.js';

import {
  isAnnouncementTitle as isSystemDoBipAnnouncement,
  isResultTitle as isSystemDoBipResult,
  parseSystemDoBipRow,
  parseSystemDoBipResult,
  makeSystemDoBipCity,
} from '../src/core/systemdobip.js';

test('MADKOM eBIP core engine parses announcements and results correctly', () => {
  assert.equal(isMadkomAnnouncement('Ogłoszenie o przetargu ustnym na sprzedaż lokalu'), true);
  assert.equal(isMadkomResult('Wynik przetargu ustnego nieograniczonego'), true);
  assert.equal(parseMadkomDate('18 listopada 2026 r.'), '2026-11-18');
  assert.equal(parseMadkomPrice('165 000,00 zł'), 165000);

  const article = { id: '99123', link: 'a,99123,ogloszenie.html', title: 'Przetarg na lokal' };
  const html = '<p>Przetarg ustny na sprzedaż lokalu mieszkalnego przy ul. Długiej 5 w Miechowie. Data: 18 listopada 2026 r. Cena wywoławcza: 165 000,00 zł. Działka 12/3 o pow. 55,2 m2.</p>';
  const ann = parseMadkomAnnouncement(article, html, { id: 'miechow', label: 'Miechów' });

  assert.equal(ann.id, 'miechow-99123');
  assert.equal(ann.auction_date, '2026-11-18');
  assert.equal(ann.price, 165000);
  assert.equal(ann.parcel, '12/3');
  assert.equal(ann.area, 55.2);
  assert.equal(ann.property_type, 'mieszkalny');

  const resHtml = '<p>Wynik przetargu na lokal. Najwyższa cena osiągnięta w przetargu: 172 000,00 zł. Nabywca nieruchomości został: Jan Kowalski.</p>';
  const res = parseMadkomResult(article, resHtml, { id: 'miechow', label: 'Miechów' });
  assert.equal(res.id, 'miechow-result-99123');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 172000);
  assert.equal(res.buyer, 'Jan Kowalski');

  const city = makeMadkomCity({ id: 'miechow', teryt: '1208054', label: 'Miechów', voivodeship: 'malopolskie', host: 'bip.malopolska.pl' });
  assert.equal(city.id, 'miechow');
  assert.equal(typeof city.crawlActive, 'function');
});

test('Logonet eUrząd core engine parses notices and results correctly', () => {
  assert.equal(isLogonetAnnouncement('działki nr 3039/1, obręb nr 10 Police'), true);
  assert.equal(isLogonetResult('Wynik przetargu ustnego nieograniczonego'), true);
  assert.equal(parseLogonetDate('2026-12-02T10:00:00'), '2026-12-02');
  assert.equal(parseLogonetPrice('720 000,00 zł'), 720000);

  const html = `
    <h1>działka nr 3039/1 obręb Police</h1>
    <table>
      <tr><th scope="row">Rodzaj nieruchomości</th><td>nieruchomość gruntowa</td></tr>
      <tr><th scope="row">Cena wywoławcza</th><td>720 000,00 zł</td></tr>
      <tr><th scope="row">Data przetargu</th><td><time datetime="2026-12-02T10:00:00">02.12.2026</time></td></tr>
    </table>
    <div class="wysiwyg">
      <p>Przetarg ustny na działkę nr 3039/1 przy ul. Bankowej 18 w Policach o pow. 1200 m2.</p>
    </div>
  `;
  const url = 'https://bip.police.pl/przetarg-nieruchomosci/21452/dzialka';
  const notice = parseLogonetNotice(html, url, { id: 'police', label: 'Police' });

  assert.equal(notice.id, 'police-21452');
  assert.equal(notice.auction_date, '2026-12-02');
  assert.equal(notice.price, 720000);
  assert.equal(notice.parcel, '3039/1');
  assert.equal(notice.area, 1200);

  const resHtml = '<p>Wynik przetargu. Najwyższa cena osiągnięta: 750 000,00 zł. Nabywca nieruchomości: Anna Nowak.</p>';
  const res = parseLogonetResult(resHtml, url, { id: 'police' });
  assert.equal(res.id, 'police-result-21452');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 750000);
  assert.equal(res.buyer, 'Anna Nowak');

  const city = makeLogonetCity({ id: 'police', teryt: '3211044', label: 'Police', voivodeship: 'zachodniopomorskie', host: 'bip.police.pl' });
  assert.equal(city.id, 'police');
  assert.equal(typeof city.crawlActive, 'function');
});

test('BIP Lubelskie core engine parses DataTables notices and results correctly', () => {
  assert.equal(isBipLubelskieAnnouncement('Ogłoszenie o przetargu na sprzedaż lokalu mieszkalnego'), true);
  assert.equal(isBipLubelskieResult('Informacja o wyniku przetargu ustnego'), true);

  const title = 'Ogłoszenie o I przetargu na sprzedaż lokalu mieszkalnego ul. Lubelska 10';
  const detailHtml = '<p>Przetarg odbędzie się w dniu 15 listopada 2026 r. Cena wywoławcza: 120 000,00 zł. Działka 44 o pow. 48 m2.</p>';
  const url = 'https://umparczew.bip.lubelskie.pl/index.php?id=9921';

  const ann = parseBipLubelskieNotice(title, detailHtml, url, { id: 'parczew', label: 'Parczew' });
  assert.equal(ann.id, 'parczew-9921');
  assert.equal(ann.auction_date, '2026-11-15');
  assert.equal(ann.price, 120000);
  assert.equal(ann.parcel, '44');
  assert.equal(ann.area, 48);

  const res = parseBipLubelskieResult('Wynik przetargu', '<p>Najwyższa cena osiągnięta: 125 000,00 zł. Nabywca: Jan Nowak.</p>', url, { id: 'parczew' });
  assert.equal(res.id, 'parczew-result-9921');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 125000);

  const city = makeBipLubelskieCity({ id: 'parczew', teryt: '0613044', label: 'Parczew', host: 'umparczew.bip.lubelskie.pl' });
  assert.equal(city.id, 'parczew');
  assert.equal(typeof city.crawlActive, 'function');
});

test('SystemDoBIP core engine parses table rows and results correctly', () => {
  assert.equal(isSystemDoBipAnnouncement('Burmistrz ogłasza przetarg na sprzedaż nieruchomości gruntowej'), true);
  assert.equal(isSystemDoBipResult('Rozstrzygnięcie przetargu'), true);

  const rowHtml = `
    <tr>
      <td class="td-date-1"><div>Data ogłoszenia</div>2026-10-16</td>
      <td class="td-date-2"><div>Data i godzina przetargu</div>2026-11-17 11:00:00</td>
      <td class="td-title-1"><a href="https://bip.swiebodzin.eu/przetargi/361/485/454_/">Przetarg na sprzedaż działki 125/4 o pow. 850 m2, cena 135 000 zł</a></td>
    </tr>
  `;
  const parsed = parseSystemDoBipRow(rowHtml, { id: 'swiebodzin', label: 'Świebodzin' });
  assert.equal(parsed.id, 'swiebodzin-485-454');
  assert.equal(parsed.auction_date, '2026-11-17');
  assert.equal(parsed.price, 135000);
  assert.equal(parsed.parcel, '125/4');
  assert.equal(parsed.area, 850);

  const res = parseSystemDoBipResult('<p>Rozstrzygnięcie. Cena osiągnięta: 140 000 zł. Nabywca: Jan Kowalski.</p>', 'https://bip.swiebodzin.eu/przetargi/361/485/454_/', { id: 'swiebodzin' });
  assert.equal(res.id, 'swiebodzin-result-485-454');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 140000);

  const city = makeSystemDoBipCity({ id: 'swiebodzin', teryt: '0808054', label: 'Świebodzin', host: 'bip.swiebodzin.eu' });
  assert.equal(city.id, 'swiebodzin');
  assert.equal(typeof city.crawlActive, 'function');
});

test('WOKISS core engine parses notices and results correctly', async () => {
  const { isAnnouncementTitle, isResultTitle, parseWokissNotice, parseWokissResult, makeWokissCity } = await import('../src/core/wokiss-bip.js');
  assert.equal(isAnnouncementTitle('Ogłoszenie o przetargu na sprzedaż lokalu'), true);
  assert.equal(isResultTitle('Informacja o wyniku przetargu'), true);

  const html = '<p>Przetarg ustny na sprzedaż lokalu mieszkalnego przy ul. Kościuszki 10 w Wągrowcu. Data przetargu: 15 grudnia 2026 r. Cena wywoławcza: 180 000,00 zł. Działka nr 55/2 o pow. 62 m2.</p>';
  const notice = parseWokissNotice('Przetarg na lokal', html, 'https://bip.wagrowiec.eu/bip/przetargi/1234.html', { id: 'wagrowiec', label: 'Wągrowiec' });
  assert.equal(notice.id, 'wagrowiec-1234');
  assert.equal(notice.auction_date, '2026-12-15');
  assert.equal(notice.price, 180000);
  assert.equal(notice.parcel, '55/2');
  assert.equal(notice.area, 62);

  const resHtml = '<p>Wynik przetargu. Najwyższa cena osiągnięta: 195 000,00 zł. Nabywca: Jan Nowak.</p>';
  const res = parseWokissResult('Wynik', resHtml, 'https://bip.wagrowiec.eu/bip/przetargi/1234.html', { id: 'wagrowiec' });
  assert.equal(res.id, 'wagrowiec-result-1234');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 195000);

  const city = makeWokissCity({ id: 'wagrowiec', teryt: '3028011', label: 'Wągrowiec', host: 'bip.wagrowiec.eu' });
  assert.equal(city.id, 'wagrowiec');
  assert.equal(typeof city.crawlActive, 'function');
});

test('FINN core engine factory initializes valid city adapter', async () => {
  const { makeFinnCity } = await import('../src/core/finn-bip.js');
  const city = makeFinnCity({
    id: 'slupca',
    teryt: '3023011',
    label: 'Słupca',
    voivodeship: 'wielkopolskie',
    host: 'www.bip.umslupca.finn.pl',
  });
  assert.equal(city.id, 'slupca');
  assert.equal(city.teryt, '3023011');
  assert.equal(typeof city.crawlActive, 'function');
});

test('BiuletynNet core engine parses listings and notices correctly', async () => {
  const { parseBiuletynNetListing, parseBiuletynNetNotice, parseBiuletynNetResult, makeBiuletynNetCity } = await import('../src/core/biuletynnet-bip.js');

  const listingHtml = `
    <div class="artykuly">
      <div class="artykul-tlo aktualnosci-tlo">
        <div class="artykul-tresc-tlo">
          <div class="strona-data">Data wytworzenia <span>2026-10-14</span></div>
          <div class="submenu"><a href="?bip=2&amp;cid=141&amp;id=318">Informacja o pierwszym przetargu na działkę 4/87 o pow. 2000 m2</a></div>
          <div class="strona-skrot">Do pobrania: ogloszenie.pdf</div>
        </div>
      </div>
    </div>
    <ul class="submenu-tresc">
      <li><a href="?bip=1&amp;cid=141&amp;bsc=N">2026</a></li>
    </ul>
  `;

  const { notices, subCategoryUrls } = parseBiuletynNetListing(listingHtml, 'morawica.biuletyn.net');
  assert.equal(notices.length, 1);
  assert.equal(notices[0].id, '318');
  assert.equal(notices[0].publishedAt, '2026-10-14');
  assert.equal(notices[0].type, 'notice');
  assert.equal(subCategoryUrls.length, 1);

  const noticeHtml = `
    <h2 class="h1-tytul aktualnosci-tytul">Ogłoszenie o przetargu na sprzedaż nieruchomości gruntowej</h2>
    <div class="aktualnosci-tresc">
      <p>Przetarg ustny nieograniczony na działkę ewidencyjną nr 144/2 o powierzchni 850 m2, cena wywoławcza 95 000 zł. Termin przetargu: 12 grudnia 2026.</p>
      <a href="fls/bip_pliki/ogloszenie.pdf">Pobierz ogłoszenie</a>
    </div>
  `;
  const parsed = parseBiuletynNetNotice(noticeHtml, 'https://morawica.biuletyn.net/?bip=2&cid=141&id=318', 'Morawica');
  assert.equal(parsed.isRealEstate, true);
  assert.equal(parsed.cadastralNumbers.includes('144/2'), true);
  assert.equal(parsed.areaSqMeters, 850);
  assert.equal(parsed.price, 95000);
  assert.equal(parsed.attachments.length, 1);

  const city = makeBiuletynNetCity({ id: 'morawica', terc: '2604123', name: 'Morawica', host: 'morawica.biuletyn.net' });
  assert.equal(city.id, 'morawica');
  assert.equal(typeof city.crawlActive, 'function');
});

test('CONCEPT Intermedia core engine parses listings and notices correctly', async () => {
  const { parseConceptListing, parseConceptNotice, makeConceptCity } = await import('../src/core/conceptintermedia-bip.js');

  const html = `
    <div class="menu">
      <a href="/strona-3571-ogloszenie_o_pierwszych_przetargach.html">Ogłoszenie o pierwszych przetargach ustnych na sprzedaż nieruchomości</a>
    </div>
  `;
  const notices = parseConceptListing(html, 'bip.halinow.pl');
  assert.equal(notices.length, 1);
  assert.equal(notices[0].id, '3571');

  const detailHtml = `
    <h1 class="tytul">Ogłoszenie o przetargu na sprzedaż nieruchomości</h1>
    <p>Przetarg ustny na działkę nr 105/3 o pow. 1200 m2, cena 150 000 zł. Data przetargu: 2026-11-20.</p>
  `;
  const parsed = parseConceptNotice(detailHtml, 'https://bip.halinow.pl/strona-3571.html', 'Halinów');
  assert.equal(parsed.isRealEstate, true);
  assert.equal(parsed.parcel, '105/3');
  assert.equal(parsed.area, 1200);
  assert.equal(parsed.price, 150000);

  const city = makeConceptCity({ id: 'halinow', terc: '1412034', name: 'Halinów', host: 'bip.halinow.pl' });
  assert.equal(city.id, 'halinow');
  assert.equal(typeof city.crawlActive, 'function');
});

test('SmartSite (podlaskie.eu) core engine parses listings and notices correctly', async () => {
  const { parseSmartSiteListing, parseSmartSiteNotice, makeSmartSiteCity } = await import('../src/core/smartsite-bip.js');

  const html = `
    <div>
      <a href="/0ca0d5b3653d84a/przetarg-na-sprzedaz-dzialki.html">Ogłoszenie o ustnym przetargu na sprzedaż nieruchomości działka 207/2</a>
    </div>
  `;
  const notices = parseSmartSiteListing(html, 'bip-umtykocin.podlaskie.eu');
  assert.equal(notices.length, 1);

  const detailHtml = `
    <title>Informacja o przetargu na działkę 207/2 - BIP</title>
    <p>Przetarg ustny nieograniczony na działkę 207/2 o powierzchni 1500 m2, cena wywoławcza 80 000 zł.</p>
    <a href="/resource/119257/Informacja.pdf">Informacja.pdf</a>
  `;
  const parsed = parseSmartSiteNotice(detailHtml, 'https://bip-umtykocin.podlaskie.eu/test.html', 'Tykocin');
  assert.equal(parsed.isRealEstate, true);
  assert.equal(parsed.parcel, '207/2');
  assert.equal(parsed.area, 1500);
  assert.equal(parsed.price, 80000);
  assert.equal(parsed.attachments.length, 1);

  const city = makeSmartSiteCity({ id: 'tykocin', terc: '2002134', name: 'Tykocin', host: 'bip-umtykocin.podlaskie.eu' });
  assert.equal(city.id, 'tykocin');
  assert.equal(typeof city.crawlActive, 'function');
});


