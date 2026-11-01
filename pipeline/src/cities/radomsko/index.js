import { makeFinnCity } from '../../core/finn-bip.js';

export const radomsko = makeFinnCity({
  id: 'radomsko',
  teryt: '1012011',
  label: 'Radomsko',
  voivodeship: 'lodzkie',
  authority: 'Burmistrz Miasta Radomsko',
  host: 'bip.radomsko.pl',
  origin: 'https://bip.radomsko.pl',
  boardUrl: 'https://bip.radomsko.pl/bipkod/009/003',
});

export default radomsko;
