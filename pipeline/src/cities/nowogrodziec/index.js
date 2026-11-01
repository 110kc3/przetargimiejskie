import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const nowogrodziec = makeSystemDoBipCity({
  id: 'nowogrodziec',
  teryt: '0201044',
  label: 'Nowogrodziec',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Nowogrodziec',
  host: 'bip.nowogrodziec.pl',
  origin: 'https://bip.nowogrodziec.pl',
  boardId: 361,
});

export default nowogrodziec;
