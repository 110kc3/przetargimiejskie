import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const ziebice = makeBiuletynNetCity({
  id: 'ziebice',
  teryt: '0224064',
  name: 'Ziębice',
  label: 'Ziębice',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Ziębice',
  host: 'ziebice.biuletyn.net',
  origin: 'https://ziebice.biuletyn.net',
  defaultCid: 1295,
});

export default ziebice;
