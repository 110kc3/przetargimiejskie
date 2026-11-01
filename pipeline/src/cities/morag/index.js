import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const morag = makeSystemDoBipCity({
  id: 'morag',
  teryt: '2815084',
  label: 'Morąg',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Prezydent Miasta Morąg',
  host: 'bip.morag.pl',
  origin: 'https://bip.morag.pl',
  boardId: 361,
});

export default morag;
