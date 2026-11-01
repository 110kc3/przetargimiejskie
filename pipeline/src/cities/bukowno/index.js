import { makeMadkomCity } from '../../core/madkom-bip.js';

export const bukowno = makeMadkomCity({
  id: 'bukowno',
  teryt: '1212011',
  label: 'Bukowno',
  voivodeship: 'malopolskie',
  authority: 'Burmistrz Miasta Bukowno',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umbukowno',
});

export default bukowno;
