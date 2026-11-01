import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const ciechocinek = makeSystemDoBipCity({
  id: 'ciechocinek',
  teryt: '0401021',
  label: 'Ciechocinek',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Burmistrz Miasta Ciechocinek',
  host: 'bip.ciechocinek.pl',
  origin: 'https://bip.ciechocinek.pl',
  boardId: 361,
});

export default ciechocinek;
