import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const lubraniec = makeSystemDoBipCity({
  id: 'lubraniec',
  teryt: '0418124',
  label: 'Lubraniec',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Prezydent Miasta Lubraniec',
  host: 'bip.lubraniec.pl',
  origin: 'https://bip.lubraniec.pl',
  boardId: 361,
});

export default lubraniec;
