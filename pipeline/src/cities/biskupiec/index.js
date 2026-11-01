import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const biskupiec = makeBiuletynNetCity({
  id: 'biskupiec',
  teryt: '2814024',
  name: 'Biskupiec',
  label: 'Biskupiec',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Prezydent Miasta Biskupiec',
  host: 'biskupiec.biuletyn.net',
  origin: 'https://biskupiec.biuletyn.net',
  defaultCid: 70,
});

export default biskupiec;
