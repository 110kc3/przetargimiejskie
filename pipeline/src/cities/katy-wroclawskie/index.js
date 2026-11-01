import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const katyWroclawskie = makeSystemDoBipCity({
  id: 'katy-wroclawskie',
  teryt: '0223044',
  label: 'Kąty Wrocławskie',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Kąty Wrocławskie',
  host: 'bip.katywroclawskie.pl',
  origin: 'https://bip.katywroclawskie.pl',
  boardId: 361,
});

export default katyWroclawskie;
