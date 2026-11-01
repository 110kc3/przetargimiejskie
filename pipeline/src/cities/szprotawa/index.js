import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const szprotawa = makeSystemDoBipCity({
  id: 'szprotawa',
  teryt: '0810074',
  label: 'Szprotawa',
  voivodeship: 'lubuskie',
  authority: 'Prezydent Miasta Szprotawa',
  host: 'bip.szprotawa.pl',
  origin: 'https://bip.szprotawa.pl',
  boardId: 361,
});

export default szprotawa;
