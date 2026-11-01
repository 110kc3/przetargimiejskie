import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const niemcza = makeSystemDoBipCity({
  id: 'niemcza',
  teryt: '0202074',
  label: 'Niemcza',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Niemcza',
  host: 'bip.um.niemcza.pl',
  origin: 'https://bip.um.niemcza.pl',
  boardId: 361,
});

export default niemcza;
