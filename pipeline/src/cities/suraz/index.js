import { makeSmartSiteCity } from '../../core/smartsite-bip.js';

export const suraz = makeSmartSiteCity({
  id: 'suraz',
  teryt: '2002104',
  name: 'Suraż',
  label: 'Suraż',
  voivodeship: 'podlaskie',
  authority: 'Prezydent Miasta Suraż',
  host: 'bip-umsuraz.podlaskie.eu',
  origin: 'https://bip-umsuraz.podlaskie.eu',
});

export default suraz;
