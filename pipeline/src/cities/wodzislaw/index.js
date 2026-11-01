import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const wodzislaw = makeBiuletynNetCity({
  id: 'wodzislaw',
  teryt: '2602094',
  name: 'Wodzisław',
  label: 'Wodzisław',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Wodzisław',
  host: 'wodzislaw.biuletyn.net',
  origin: 'https://wodzislaw.biuletyn.net',
  defaultCid: 1136,
});

export default wodzislaw;
