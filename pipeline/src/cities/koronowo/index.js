import { makeLogonetCity } from '../../core/logonet-bip.js';

export const koronowo = makeLogonetCity({
  id: 'koronowo',
  teryt: '0403044',
  label: 'Koronowo',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Prezydent Miasta Koronowo',
  host: 'bip.koronowo.pl',
  origin: 'https://bip.koronowo.pl',
  boardUrl: 'https://bip.koronowo.pl/przetargi-nieruchomosci/376',
});

export default koronowo;
