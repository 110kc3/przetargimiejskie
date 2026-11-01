import { makeMadkomCity } from '../../core/madkom-bip.js';

export const wielen = makeMadkomCity({
  id: 'wielen',
  teryt: '3002084',
  label: 'Wieleń',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Wieleń',
  host: 'bip.wielen.pl',
  origin: 'https://bip.wielen.pl',
  context: 'default',
});

export default wielen;
