import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const rychtal = makeSystemDoBipCity({
  id: 'rychtal',
  teryt: '3008064',
  label: 'Rychtal',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Rychtal',
  host: 'bip.rychtal.pl',
  origin: 'https://bip.rychtal.pl',
  boardId: 361,
});

export default rychtal;
