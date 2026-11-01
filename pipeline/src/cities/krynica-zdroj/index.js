import { makeMadkomCity } from '../../core/madkom-bip.js';

export const krynicaZdroj = makeMadkomCity({
  id: 'krynica-zdroj',
  teryt: '1210074',
  label: 'Krynica-Zdrój',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Krynica-Zdrój',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umkrynicazdroj',
});

export default krynicaZdroj;
