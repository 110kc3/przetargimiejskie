import { makeMadkomCity } from '../../core/madkom-bip.js';

export const jordanow = makeMadkomCity({
  id: 'jordanow',
  teryt: '1215011',
  label: 'Jordanów',
  voivodeship: 'malopolskie',
  authority: 'Burmistrz Miasta Jordanów',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umjordanow',
});

export default jordanow;
