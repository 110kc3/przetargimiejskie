import { makeMadkomCity } from '../../core/madkom-bip.js';

export const goscino = makeMadkomCity({
  id: 'goscino',
  teryt: '3208034',
  label: 'Gościno',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Gościno',
  host: 'bip.goscino.pl',
  origin: 'https://bip.goscino.pl',
  context: 'default',
});

export default goscino;
