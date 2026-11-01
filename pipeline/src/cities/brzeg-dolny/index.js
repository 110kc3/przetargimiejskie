import { makeMadkomCity } from '../../core/madkom-bip.js';

export const brzegDolny = makeMadkomCity({
  id: 'brzeg-dolny',
  teryt: '0222014',
  label: 'Brzeg Dolny',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Brzeg Dolny',
  host: 'bip.brzegdolny.pl',
  origin: 'https://bip.brzegdolny.pl',
  context: 'default',
});

export default brzegDolny;
