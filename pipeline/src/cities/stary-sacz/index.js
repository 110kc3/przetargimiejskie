import { makeMadkomCity } from '../../core/madkom-bip.js';

export const starySacz = makeMadkomCity({
  id: 'stary-sacz',
  teryt: '1210164',
  label: 'Stary Sącz',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Stary Sącz',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'starysacz',
});

export default starySacz;
