import { makeMadkomCity } from '../../core/madkom-bip.js';

export const olszyna = makeMadkomCity({
  id: 'olszyna',
  teryt: '0210054',
  label: 'Olszyna',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Olszyna',
  host: 'bip.olszyna.pl',
  origin: 'https://bip.olszyna.pl',
  context: 'default',
});

export default olszyna;
