import { makeLogonetCity } from '../../core/logonet-bip.js';

export const czestochowa = makeLogonetCity({
  id: 'czestochowa',
  teryt: '2464011',
  label: 'Częstochowa',
  voivodeship: 'slaskie',
  authority: 'Burmistrz Miasta Częstochowa',
  host: 'bip.czestochowa.pl',
  origin: 'https://bip.czestochowa.pl',
  boardUrl: 'https://bip.czestochowa.pl/przetargi-nieruchomosci/376',
});

export default czestochowa;
