import { makeLogonetCity } from '../../core/logonet-bip.js';

export const lochow = makeLogonetCity({
  id: 'lochow',
  teryt: '1433054',
  label: 'Łochów',
  voivodeship: 'mazowieckie',
  authority: 'Prezydent Miasta Łochów',
  host: 'bip.gminalochow.pl',
  origin: 'https://bip.gminalochow.pl',
  boardUrl: 'https://bip.gminalochow.pl/przetargi-nieruchomosci/376',
});

export default lochow;
