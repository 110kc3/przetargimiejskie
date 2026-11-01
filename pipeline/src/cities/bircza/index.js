import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const bircza = makeBiuletynNetCity({
  id: 'bircza',
  teryt: '1813014',
  name: 'Bircza',
  label: 'Bircza',
  voivodeship: 'podkarpackie',
  authority: 'Prezydent Miasta Bircza',
  host: 'bircza.biuletyn.net',
  origin: 'https://bircza.biuletyn.net',
  defaultCid: 40,
});

export default bircza;
