import { makeMadkomCity } from '../../core/madkom-bip.js';

export const makowPodhalanski = makeMadkomCity({
  id: 'makow-podhalanski',
  teryt: '1215064',
  label: 'Maków Podhalański',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Maków Podhalański',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'ummakowpodhalanski',
});

export default makowPodhalanski;
