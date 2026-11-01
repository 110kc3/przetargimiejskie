import { makeMadkomCity } from '../../core/madkom-bip.js';

export const polkowice = makeMadkomCity({
  id: 'polkowice',
  teryt: '0216044',
  label: 'Polkowice',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Polkowice',
  host: 'bip.polkowice.eu',
  origin: 'https://bip.polkowice.eu',
  context: 'default',
});

export default polkowice;
