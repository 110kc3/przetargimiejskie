import { makeFinnCity } from '../../core/finn-bip.js';

export const strzelin = makeFinnCity({
  id: 'strzelin',
  teryt: '0217044',
  label: 'Strzelin',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Strzelin',
  host: 'bip.gmstrzelin.finn.pl',
  origin: 'https://bip.gmstrzelin.finn.pl',
  boardUrl: 'https://bip.gmstrzelin.finn.pl/bipkod/023',
});

export default strzelin;
