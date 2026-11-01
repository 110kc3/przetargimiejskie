import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const miasteczkoSlaskie = makeSystemDoBipCity({
  id: 'miasteczko-slaskie',
  teryt: '2413021',
  label: 'Miasteczko Śląskie',
  voivodeship: 'slaskie',
  authority: 'Burmistrz Miasta Miasteczko Śląskie',
  host: 'bip.miasteczko-slaskie.pl',
  origin: 'https://bip.miasteczko-slaskie.pl',
  boardId: 361,
});

export default miasteczkoSlaskie;
