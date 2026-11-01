import { makeNefeniCity } from '../../core/nefeni-bip.js';

export const kowal = makeNefeniCity({
  id: 'kowal',
  teryt: '0418011',
  label: 'Kowal',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Burmistrz Miasta Kowal',
  origin: 'https://kowal.bip.net.pl',
  categories: ['166-2026'],
});

export default kowal;
