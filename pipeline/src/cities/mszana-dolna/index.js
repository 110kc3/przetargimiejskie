import { makeMadkomCity } from '../../core/madkom-bip.js';

export const mszanaDolna = makeMadkomCity({
  id: 'mszana-dolna',
  teryt: '1207021',
  label: 'Mszana Dolna',
  voivodeship: 'malopolskie',
  authority: 'Burmistrz Miasta Mszana Dolna',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'ummszanadolna',
});

export default mszanaDolna;
