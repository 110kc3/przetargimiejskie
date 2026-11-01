import { makeMadkomCity } from '../../core/madkom-bip.js';

export const pobiedziska = makeMadkomCity({
  id: 'pobiedziska',
  teryt: '3021124',
  label: 'Pobiedziska',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Pobiedziska',
  host: 'bip.pobiedziska.pl',
  origin: 'https://bip.pobiedziska.pl',
  context: 'default',
});

export default pobiedziska;
