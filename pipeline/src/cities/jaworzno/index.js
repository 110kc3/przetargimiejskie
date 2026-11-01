import { makeMadkomCity } from '../../core/madkom-bip.js';

export const jaworzno = makeMadkomCity({
  id: 'jaworzno',
  teryt: '2468011',
  label: 'Jaworzno',
  voivodeship: 'slaskie',
  authority: 'Burmistrz Miasta Jaworzno',
  host: 'bip.jaworzno.pl',
  origin: 'https://bip.jaworzno.pl',
  context: 'default',
});

export default jaworzno;
