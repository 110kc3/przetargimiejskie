import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const rozprza = makeSystemDoBipCity({
  id: 'rozprza',
  teryt: '1010084',
  label: 'Rozprza',
  voivodeship: 'lodzkie',
  authority: 'Prezydent Miasta Rozprza',
  host: 'bip.rozprza.pl',
  origin: 'https://bip.rozprza.pl',
  boardId: 361,
});

export default rozprza;
