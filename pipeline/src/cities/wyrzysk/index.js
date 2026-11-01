import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const wyrzysk = makeBiuletynNetCity({
  id: 'wyrzysk',
  teryt: '3019084',
  name: 'Wyrzysk',
  label: 'Wyrzysk',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Wyrzysk',
  host: 'wyrzysk.biuletyn.net',
  origin: 'https://wyrzysk.biuletyn.net',
  defaultCid: 1175,
});

export default wyrzysk;
