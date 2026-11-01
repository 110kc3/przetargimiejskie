import { makeMadkomCity } from '../../core/madkom-bip.js';

export const gniew = makeMadkomCity({
  id: 'gniew',
  teryt: '2214024',
  label: 'Gniew',
  voivodeship: 'pomorskie',
  authority: 'Prezydent Miasta Gniew',
  host: 'bip.gniew.pl',
  origin: 'https://bip.gniew.pl',
  context: 'default',
});

export default gniew;
