import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const cieszanow = makeBiuletynNetCity({
  id: 'cieszanow',
  teryt: '1809024',
  name: 'Cieszanów',
  label: 'Cieszanów',
  voivodeship: 'podkarpackie',
  authority: 'Prezydent Miasta Cieszanów',
  host: 'cieszanow.biuletyn.net',
  origin: 'https://cieszanow.biuletyn.net',
  defaultCid: 70,
});

export default cieszanow;
