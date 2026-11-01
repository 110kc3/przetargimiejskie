import { makeSmartSiteCity } from '../../core/smartsite-bip.js';

export const ciechanowiec = makeSmartSiteCity({
  id: 'ciechanowiec',
  teryt: '2013024',
  name: 'Ciechanowiec',
  label: 'Ciechanowiec',
  voivodeship: 'podlaskie',
  authority: 'Prezydent Miasta Ciechanowiec',
  host: 'bip-umciechanowiec.podlaskie.eu',
  origin: 'https://bip-umciechanowiec.podlaskie.eu',
});

export default ciechanowiec;
