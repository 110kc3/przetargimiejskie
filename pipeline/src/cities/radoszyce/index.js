import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const radoszyce = makeBiuletynNetCity({
  id: 'radoszyce',
  teryt: '2605044',
  name: 'Radoszyce',
  label: 'Radoszyce',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Radoszyce',
  host: 'radoszyce.biuletyn.net',
  origin: 'https://radoszyce.biuletyn.net',
  defaultCid: 1027,
});

export default radoszyce;
